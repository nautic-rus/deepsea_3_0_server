const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const pool = require('../../db/connection');
const Specification = require('../../db/models/Specification');
const SpecificationVersion = require('../../db/models/SpecificationVersion');
const SpecificationPart = require('../../db/models/SpecificationPart');
const { getEnvironmentSetting } = require('../../config/environmentSettings');
const { hasPermission } = require('./permissionChecker');

const PDF_LAUNCH_TIMEOUT_MS = Number(process.env.PDF_PUPPETEER_LAUNCH_TIMEOUT_MS || 60000);
const PDF_PROTOCOL_TIMEOUT_MS = Number(process.env.PDF_PUPPETEER_PROTOCOL_TIMEOUT_MS || 180000);
const PDF_PAGE_TIMEOUT_MS = Number(process.env.PDF_PUPPETEER_PAGE_TIMEOUT_MS || 120000);
const PDF_MAX_CONCURRENCY = Math.max(1, Number(process.env.PDF_PUPPETEER_MAX_CONCURRENCY || 10));

class SpecificationPdfService {
  static _browserInstance = null;
  static _browserLaunchPromise = null;
  static _activeJobs = 0;
  static _waitQueue = [];
  static _inFlightGenerations = new Map();
  static _fontCssCache = null;

  static _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static _toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  static _formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getUTCFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  static _chunk(rows, size) {
    const safeSize = Number(size) > 0 ? Number(size) : 1;
    const chunks = [];
    for (let i = 0; i < rows.length; i += safeSize) {
      chunks.push(rows.slice(i, i + safeSize));
    }
    return chunks;
  }

  static _resolveChromiumExecutablePath() {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      process.env.CHROMIUM_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  static _fontToDataUrl(fontPath) {
    const ext = path.extname(fontPath).toLowerCase();
    const mimeType = ext === '.otf'
      ? 'font/otf'
      : ext === '.ttc'
        ? 'font/collection'
        : 'font/ttf';
    const buffer = fs.readFileSync(fontPath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  static _resolveFirstExistingPath(candidates) {
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  static _buildEmbeddedFontCss() {
    if (SpecificationPdfService._fontCssCache !== null) {
      return SpecificationPdfService._fontCssCache;
    }

    const fontCandidates = {
      sansRegular: [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
        '/usr/share/fonts/liberation/LiberationSans-Regular.ttf',
        '/Library/Fonts/Arial.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
      ],
      sansBold: [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
        '/usr/share/fonts/liberation/LiberationSans-Bold.ttf',
        '/Library/Fonts/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
      ],
      monoRegular: [
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
        '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf',
        '/usr/share/fonts/liberation/LiberationMono-Regular.ttf',
        '/System/Library/Fonts/Supplemental/Courier New.ttf',
      ],
      monoBold: [
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
        '/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationMono-Bold.ttf',
        '/usr/share/fonts/liberation/LiberationMono-Bold.ttf',
        '/System/Library/Fonts/Supplemental/Courier New Bold.ttf',
      ],
    };

    const rules = [];
    for (const [weightName, candidates] of Object.entries(fontCandidates)) {
      const fontPath = SpecificationPdfService._resolveFirstExistingPath(candidates);
      if (!fontPath) {
        continue;
      }

      const family = weightName.startsWith('mono') ? 'SpecMono' : 'SpecSans';
      const weight = weightName.endsWith('Bold') ? '700' : '400';
      rules.push(`
    @font-face {
      font-family: "${family}";
      src: url("${SpecificationPdfService._fontToDataUrl(fontPath)}") format("truetype");
      font-weight: ${weight};
      font-style: normal;
      font-display: swap;
    }`);
    }

    SpecificationPdfService._fontCssCache = rules.join('\n');
    return SpecificationPdfService._fontCssCache;
  }

  static _isTransientBrowserError(err) {
    const message = String(err && err.message ? err.message : err || '');
    return message.includes('Network.enable timed out')
      || message.includes('Target closed')
      || message.includes('Session closed')
      || message.includes('Browser disconnected');
  }

  static async _newPageWithRetry(browser) {
    let lastErr = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await browser.newPage();
      } catch (err) {
        lastErr = err;
        if (attempt === 2 || !SpecificationPdfService._isTransientBrowserError(err)) {
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    throw lastErr;
  }

  static async _acquireSlot() {
    if (SpecificationPdfService._activeJobs < PDF_MAX_CONCURRENCY) {
      SpecificationPdfService._activeJobs += 1;
      return;
    }

    await new Promise((resolve) => {
      SpecificationPdfService._waitQueue.push(resolve);
    });
    SpecificationPdfService._activeJobs += 1;
  }

  static _releaseSlot() {
    SpecificationPdfService._activeJobs = Math.max(0, SpecificationPdfService._activeJobs - 1);
    const next = SpecificationPdfService._waitQueue.shift();
    if (next) {
      next();
    }
  }

  static async _getBrowser(executablePath) {
    if (
      SpecificationPdfService._browserInstance &&
      typeof SpecificationPdfService._browserInstance.isConnected === 'function' &&
      SpecificationPdfService._browserInstance.isConnected()
    ) {
      return SpecificationPdfService._browserInstance;
    }

    if (!SpecificationPdfService._browserLaunchPromise) {
      SpecificationPdfService._browserLaunchPromise = puppeteer.launch(
        SpecificationPdfService._getBrowserLaunchOptions(executablePath)
      ).then((browser) => {
        SpecificationPdfService._browserInstance = browser;
        browser.on('disconnected', () => {
          if (SpecificationPdfService._browserInstance === browser) {
            SpecificationPdfService._browserInstance = null;
          }
        });
        return browser;
      }).finally(() => {
        SpecificationPdfService._browserLaunchPromise = null;
      });
    }

    return SpecificationPdfService._browserLaunchPromise;
  }

  static _getBrowserLaunchOptions(executablePath) {
    return {
      executablePath,
      headless: true,
      protocolTimeout: PDF_PROTOCOL_TIMEOUT_MS,
      timeout: PDF_LAUNCH_TIMEOUT_MS,
      waitForInitialPage: false,
      networkEnabled: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    };
  }

  static _readTemplateStyles() {
    const templatePath = path.join(__dirname, '..', 'templates', 'drawings', 'spec-A4-nautic.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    const match = template.match(/<style>([\s\S]*?)<\/style>/i);
    if (!match) {
      throw new Error('Specification template styles not found');
    }
    return `${SpecificationPdfService._buildEmbeddedFontCss()}\n${match[1]}`;
  }

  static _logoDataUrl() {
    const logoPath = path.join(__dirname, '..', 'templates', 'notifications', 'deepsea.svg');
    const svg = fs.readFileSync(logoPath, 'utf8');
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  }

  static async _fetchImageAsDataUrl(url, timeoutMs = 5000) {
    if (typeof fetch !== 'function') {
      return null;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => {
      if (controller) controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  static async _resolveCompanyLogoAsset() {
    try {
      const setting = await getEnvironmentSetting('COMPANY_LOGO_URL_SPEC');
      const value = setting && setting.value !== undefined && setting.value !== null
        ? String(setting.value).trim()
        : '';
      if (!value) {
        return SpecificationPdfService._logoDataUrl();
      }

      if (value.startsWith('data:')) {
        return value;
      }

      if (/^https?:\/\//i.test(value)) {
        const fetched = await SpecificationPdfService._fetchImageAsDataUrl(value);
        return fetched || SpecificationPdfService._logoDataUrl();
      }

      return value;
    } catch (err) {
      // Ignore DB lookup errors here and fall back to the bundled logo asset.
    }

    return SpecificationPdfService._logoDataUrl();
  }

  static _buildStampPage({ pageNo, docName, docNumber, date, rev, logoUrl }) {
    const logoMarkup = logoUrl
      ? `<img class="stamp-logo" src="${SpecificationPdfService._escapeHtml(logoUrl)}" alt="logo">`
      : '';
    return `
  <section class="page">
    <div class="border"></div>
    <div class="stamp-frame">
      <table class="stamp-table">
        <colgroup>
          <col><col><col><col>
        </colgroup>
        <tbody>
        <tr>
          <td rowspan="3" class="stamp-cell stamp-logo-cell">
            ${logoMarkup}
          </td>
          <td colspan="3" class="stamp-cell stamp-doc-name-cell">
            <div class="stamp-doc-name-value">${SpecificationPdfService._escapeHtml(docName)}</div>
          </td>
        </tr>
        <tr>
          <td rowspan="2" class="stamp-cell stamp-drawing-cell">
            <div class="stamp-label">DRAWING NUMBER / НОМЕР ЧЕРТЕЖА</div>
            <div class="stamp-doc-number-value">${SpecificationPdfService._escapeHtml(docNumber)}</div>
          </td>
          <td colspan="2" class="stamp-cell stamp-meta-cell">
            <div class="stamp-label">DATE / ДАТА</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(date)}</div>
          </td>
        </tr>
        <tr>
          <td class="stamp-cell stamp-meta-cell">
            <div class="stamp-label">REV. / РЕВ.</div>
            <div class="stamp-value stamp-value-center">${SpecificationPdfService._escapeHtml(rev)}</div>
          </td>
          <td class="stamp-cell stamp-meta-cell stamp-page-cell">
            <div class="stamp-label">PAGE / ЛИСТ</div>
            <div class="stamp-value stamp-value-center">${SpecificationPdfService._escapeHtml(pageNo)}</div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </section>`;
  }

  static _resolveMaterialTitle(part) {
    const material = part.material || null;
    if (material && material.name) return material.name;
    if (part.descriptions) return part.descriptions;
    return '';
  }

  static _resolveLabel(part) {
    if (part.part_code) return part.part_code;
    return '';
  }

  static _resolveMaterialDescr(part) {
    const material = part.material || null;
    if (material && material.description) return material.description;
    return '';
  }

  static _resolveMaterialUnit(part) {
    const material = part.material || null;
    if (material && material.unit) {
      const symbol = String(material.unit.symbol || '').trim();
      const kei = String(material.unit.kei || '').trim();
      if (symbol && kei) return `${symbol} (${kei})`;
      if (symbol) return symbol;
      if (kei) return kei;
    }
    return part.unit || '-';
  }

  static _resolveStatementCode(part) {
    return part.statement_code || '';
  }

  static _formatWeightValue(value) {
    const weight = SpecificationPdfService._toNumberOrNull(value);
    if (weight === null) return '-';
    return weight.toFixed(2);
  }

  static _resolveMaterialWeight(part) {
    const material = part.material || null;
    const weight = material ? SpecificationPdfService._toNumberOrNull(material.weight) : null;
    return SpecificationPdfService._formatWeightValue(weight);
  }

  static _resolveTotalWeight(part) {
    const quantity = SpecificationPdfService._toNumberOrNull(part.quantity) ?? 1;
    const material = part.material || null;
    const unitId = material && material.unit ? SpecificationPdfService._toNumberOrNull(material.unit.id) : null;
    const weight = material ? SpecificationPdfService._toNumberOrNull(material.weight) : null;

    if (unitId === 2) {
      return SpecificationPdfService._formatWeightValue(quantity);
    }

    if (weight !== null) {
      return SpecificationPdfService._formatWeightValue(quantity * weight);
    }

    return '-';
  }

  static _resolveRoom(part) {
    return part.zone || '';
  }

  static _resolvePlace(part) {
    return '';
  }

  static _resolveMatCode(part) {
    const material = part.material || null;
    if (material && material.stock_code) return material.stock_code;
    return part.part_code || '';
  }

  static _buildSummaryEntries(rows) {
    const grouped = new Map();

    for (const row of rows || []) {
      const materialId = SpecificationPdfService._toNumberOrNull(row && row.material_id);
      const key = materialId && materialId > 0 ? `material:${materialId}` : `row:${row && row.id ? row.id : grouped.size}`;
      const existing = grouped.get(key);
      const quantity = SpecificationPdfService._toNumberOrNull(row && row.quantity) ?? 1;

      if (!existing) {
        grouped.set(key, {
          ...row,
          quantity,
        });
        continue;
      }

      existing.quantity = (SpecificationPdfService._toNumberOrNull(existing.quantity) ?? 0) + quantity;
    }

    return Array.from(grouped.values());
  }

  static _formatSummaryQuantity(value) {
    const n = SpecificationPdfService._toNumberOrNull(value);
    if (n === null) return '0';
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
  }

  static _buildPartRows(rows, startIndex = 1) {
    if (!rows.length) {
      return `
      <tr>
        <td>${SpecificationPdfService._escapeHtml(startIndex)}</td>
        <td class="left wrap">-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>`;
    }

    return rows.map((part, index) => {
      const label = startIndex + index;
      return `
      <tr>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveLabel(part) || label)}</td>
        <td class="left wrap">${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialTitle(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialDescr(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialUnit(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._toNumberOrNull(part.quantity) ?? 1)}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialWeight(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveTotalWeight(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveRoom(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolvePlace(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMatCode(part))}</td>
      </tr>`;
    }).join('');
  }

  static _buildSummaryRows(rows, startIndex = 1) {
    if (!rows.length) {
      return `
      <tr>
        <td>${SpecificationPdfService._escapeHtml(startIndex)}</td>
        <td class="left wrap">-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>`;
    }

    return rows.map((part, index) => {
      const label = startIndex + index;
      return `
      <tr>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveLabel(part) || label)}</td>
        <td class="left wrap">${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialTitle(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialDescr(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialUnit(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._formatSummaryQuantity(part.quantity ?? 1))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveTotalWeight(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveStatementCode(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMatCode(part))}</td>
      </tr>`;
    }).join('');
  }

  static _buildPartPage({ pageNo, docName, docNumber, date, rev, logoUrl, rows, startIndex }) {
    const logoMarkup = logoUrl
      ? `<img class="stamp-logo" src="${SpecificationPdfService._escapeHtml(logoUrl)}" alt="logo">`
      : '';
    return `
  <section class="page">
    <div class="border"></div>
    <div class="stamp-frame">
      <table class="stamp-table">
        <colgroup>
          <col><col><col><col>
        </colgroup>
        <tbody>
        <tr>
          <td rowspan="3" class="stamp-cell stamp-logo-cell">
            ${logoMarkup}
          </td>
          <td colspan="3" class="stamp-cell stamp-doc-name-cell">
            <div class="stamp-doc-name-value">${SpecificationPdfService._escapeHtml(docName)}</div>
          </td>
        </tr>
        <tr>
          <td rowspan="2" class="stamp-cell stamp-drawing-cell">
            <div class="stamp-label">DRAWING NUMBER / НОМЕР ЧЕРТЕЖА</div>
            <div class="stamp-doc-number-value">${SpecificationPdfService._escapeHtml(docNumber)}</div>
          </td>
          <td colspan="2" class="stamp-cell stamp-meta-cell">
            <div class="stamp-label">DATE / ДАТА</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(date)}</div>
          </td>
        </tr>
        <tr>
          <td class="stamp-cell stamp-meta-cell">
            <div class="stamp-label">REV. / РЕВ.</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(rev)}</div>
          </td>
          <td class="stamp-cell stamp-meta-cell stamp-page-cell">
            <div class="stamp-label">PAGE / ЛИСТ</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(pageNo)}</div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="page-title">PART LIST | СПЕЦИФИКАЦИЯ</div>
    <table class="part-table" style="top:13.2mm;">
      <colgroup>
        <col><col><col><col><col><col><col><col><col><col>
      </colgroup>
      <thead>
      <tr>
        <th>№</th>
        <th>TITLE / НАИМЕНОВАНИЕ</th>
        <th>DESCRIPTION / ОБОЗНАЧЕНИЕ</th>
        <th>UNITS / КЕИ</th>
        <th>QTY / К-ВО</th>
        <th>WGT / ВЕС</th>
        <th>T.WGT / О.ВЕС</th>
        <th>ROOM / ПОМ.</th>
        <th>PLACE / АДРЕС</th>
        <th>MAT.CODE / КОД МАТ.</th>
      </tr>
      </thead>
      <tbody>
      ${SpecificationPdfService._buildPartRows(rows, startIndex)}
      </tbody>
    </table>
  </section>`;
  }

  static _buildSummaryPage({ pageNo, docName, docNumber, date, rev, logoUrl, rows, startIndex }) {
    const logoMarkup = logoUrl
      ? `<img class="stamp-logo" src="${SpecificationPdfService._escapeHtml(logoUrl)}" alt="logo">`
      : '';
    return `
  <section class="page">
    <div class="border"></div>
    <div class="stamp-frame">
      <table class="stamp-table">
        <colgroup>
          <col><col><col><col>
        </colgroup>
        <tbody>
        <tr>
          <td rowspan="3" class="stamp-cell stamp-logo-cell">
            ${logoMarkup}
          </td>
          <td colspan="3" class="stamp-cell stamp-doc-name-cell">
            <div class="stamp-doc-name-value">${SpecificationPdfService._escapeHtml(docName)}</div>
          </td>
        </tr>
        <tr>
          <td rowspan="2" class="stamp-cell stamp-drawing-cell">
            <div class="stamp-label">DRAWING NUMBER / НОМЕР ЧЕРТЕЖА</div>
            <div class="stamp-doc-number-value">${SpecificationPdfService._escapeHtml(docNumber)}</div>
          </td>
          <td colspan="2" class="stamp-cell stamp-meta-cell">
            <div class="stamp-label">DATE / ДАТА</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(date)}</div>
          </td>
        </tr>
        <tr>
          <td class="stamp-cell stamp-meta-cell">
            <div class="stamp-label">REV. / РЕВ.</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(rev)}</div>
          </td>
          <td class="stamp-cell stamp-meta-cell stamp-page-cell">
            <div class="stamp-label">PAGE / ЛИСТ</div>
            <div class="stamp-value">${SpecificationPdfService._escapeHtml(pageNo)}</div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-title">BILLING OF MATERIALS | ЗАКАЗ МАТЕРИАЛОВ</div>
    <table class="summary-table" style="top:13.2mm;">
      <colgroup>
        <col><col><col><col><col><col><col><col>
      </colgroup>
      <thead>
      <tr>
        <th>№</th>
        <th>TITLE / НАИМЕНОВАНИЕ</th>
        <th>DESCRIPTION / ОБОЗНАЧЕНИЕ</th>
        <th>UNITS / ЕД.</th>
        <th>QTY / К-ВО</th>
        <th>WGT / ВЕС</th>
        <th>ST.CODE / К.ВЕД.</th>
        <th>MAT.CODE / КОД МАТ.</th>
      </tr>
      </thead>
      <tbody>
      ${SpecificationPdfService._buildSummaryRows(rows, startIndex)}
      </tbody>
    </table>
  </section>`;
  }

  static _buildHtml({ spec, version, rows, logoUrl }) {
    const styles = SpecificationPdfService._readTemplateStyles();
    const docName = spec.name || 'Specification';
    const docNumber = spec.code || `SP-${spec.id}`;
    const rev = version.version ?? version.id ?? '';
    const date = SpecificationPdfService._formatDate(version.updated_at || version.created_at || new Date());

    const partChunkSize = 24;
    const summaryChunkSize = 24;
    const partChunks = SpecificationPdfService._chunk(rows, partChunkSize);
    const summaryRows = SpecificationPdfService._buildSummaryEntries(rows);
    const summaryChunks = SpecificationPdfService._chunk(summaryRows, summaryChunkSize);

    const pages = [];
    let pageNo = 1;
    pages.push(SpecificationPdfService._buildStampPage({
      pageNo,
      docName,
      docNumber,
      date,
      rev,
      logoUrl
    }));

    let startIndex = 1;
    for (const chunk of partChunks.length ? partChunks : [[]]) {
      pageNo += 1;
      pages.push(SpecificationPdfService._buildPartPage({
        pageNo,
        docName,
        docNumber,
        date,
        rev,
        logoUrl,
        rows: chunk,
        startIndex
      }));
      startIndex += chunk.length;
    }

    startIndex = 1;
    for (const chunk of summaryChunks.length ? summaryChunks : [[]]) {
      pageNo += 1;
      pages.push(SpecificationPdfService._buildSummaryPage({
        pageNo,
        docName,
        docNumber,
        date,
        rev,
        logoUrl,
        rows: chunk,
        startIndex
      }));
      startIndex += chunk.length;
    }

    return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${SpecificationPdfService._escapeHtml(docName)}</title>
  <style>${styles}
    .stamp-value-center {
      text-align: center;
      width: 100%;
    }
  </style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
  }

  static async generateBySpecificationVersionId(versionId, actor) {
    if (!actor || !actor.id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const allowed = await hasPermission(actor, 'specifications.view');
    if (!allowed) {
      const err = new Error('Forbidden: missing permission specifications.view');
      err.statusCode = 403;
      throw err;
    }

    const parsedVersionId = Number(versionId);
    if (!parsedVersionId || Number.isNaN(parsedVersionId)) {
      const err = new Error('Invalid id');
      err.statusCode = 400;
      throw err;
    }

    const version = await SpecificationVersion.findById(parsedVersionId);
    if (!version) {
      const err = new Error('Specification version not found');
      err.statusCode = 404;
      throw err;
    }

    const spec = await Specification.findById(Number(version.specification_id));
    if (!spec) {
      const err = new Error('Specification not found');
      err.statusCode = 404;
      throw err;
    }

    const existingPromise = SpecificationPdfService._inFlightGenerations.get(parsedVersionId);
    if (existingPromise) {
      return existingPromise;
    }

    const generationPromise = (async () => {
      const rows = await SpecificationPart.list({ specification_version_id: parsedVersionId });
      const materialIds = [...new Set((rows || [])
        .map((row) => Number(row && row.material_id))
        .filter((value) => !Number.isNaN(value) && value > 0))];
      const statementMap = await SpecificationPdfService._loadStatementCodesByMaterialIds(materialIds);
      const enrichedRows = (rows || []).map((row) => ({
        ...row,
        statement_code: statementMap.get(Number(row.material_id)) || '',
      }));
      const logoUrl = await SpecificationPdfService._resolveCompanyLogoAsset();
      const html = SpecificationPdfService._buildHtml({ spec, version, rows: enrichedRows, logoUrl });
      const executablePath = SpecificationPdfService._resolveChromiumExecutablePath();
      if (!executablePath) {
        const err = new Error('Chromium executable not found');
        err.statusCode = 500;
        throw err;
      }

      return SpecificationPdfService._renderPdf({ executablePath, html, spec, version });
    })();

    SpecificationPdfService._inFlightGenerations.set(parsedVersionId, generationPromise);

    try {
      return await generationPromise;
    } finally {
      const current = SpecificationPdfService._inFlightGenerations.get(parsedVersionId);
      if (current === generationPromise) {
        SpecificationPdfService._inFlightGenerations.delete(parsedVersionId);
      }
    }
  }

  static async _renderPdf({ executablePath, html, spec, version }) {
    await SpecificationPdfService._acquireSlot();

    try {
      const browser = await SpecificationPdfService._getBrowser(executablePath);
      const context = await browser.createBrowserContext();

      try {
        const page = await SpecificationPdfService._newPageWithRetry(context);
        page.setDefaultTimeout(PDF_PAGE_TIMEOUT_MS);
        page.setDefaultNavigationTimeout(PDF_PAGE_TIMEOUT_MS);

        await page.setContent(html, {
          waitUntil: 'domcontentloaded',
          timeout: PDF_PAGE_TIMEOUT_MS,
        });
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
        }).catch(() => {});
        await page.emulateMediaType('screen');
        const buffer = await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        return {
          buffer: Buffer.from(buffer),
          filename: `${docNumberSafe(spec.code)} ${docNumberSafe(spec.name)}.pdf`,
          spec,
          version
        };
      } finally {
        await context.close().catch(() => {});
      }
    } finally {
      SpecificationPdfService._releaseSlot();
    }
  }

  static async _loadStatementCodesByMaterialIds(materialIds = []) {
    const uniqueIds = [...new Set((materialIds || [])
      .map((id) => Number(id))
      .filter((value) => !Number.isNaN(value) && value > 0))];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const res = await pool.query(
      `
      SELECT DISTINCT ON (p.equipment_material_id)
        p.equipment_material_id,
        s.code AS statement_code
      FROM equipment_materials_projects p
      JOIN statements s ON s.id = p.statement_id
      WHERE p.equipment_material_id = ANY($1::int[])
        AND p.statement_id IS NOT NULL
      ORDER BY p.equipment_material_id, p.id DESC
      `,
      [uniqueIds]
    );

    return new Map((res.rows || []).map((row) => [Number(row.equipment_material_id), row.statement_code || '']));
  }
}

function docNumberSafe(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\/\\?%*:|"<>[\]\u0000-\u001F]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim() || 'document';
}

module.exports = SpecificationPdfService;
