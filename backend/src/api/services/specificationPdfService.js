const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
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

  static _mmToPx(mm) {
    const numericMm = Number(mm);
    if (!Number.isFinite(numericMm)) {
      return 0;
    }
    return numericMm * 96 / 25.4;
  }

  static _buildPdfExtraStyles() {
    return `
    .group-separator td {
      height: 4mm;
      padding: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      border-bottom: 0;
      background: transparent;
    }
    .pdf-measure-root {
      position: absolute;
      left: -10000mm;
      top: 0;
      width: 297mm;
      visibility: hidden;
      pointer-events: none;
    }
    .pdf-measure-table {
      border-collapse: collapse;
      table-layout: fixed;
      width: calc(100% - 10mm);
      position: relative;
      left: 5mm;
      box-sizing: border-box;
    }
    .pdf-measure-table th,
    .pdf-measure-table td {
      border: 0.35mm solid #000;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      font-size: 2.7mm;
      line-height: 1;
      font-family: "SpecSans", "DejaVu Sans", "Liberation Sans", Arial, sans-serif;
    }
    .pdf-measure-table th {
      height: 5.3mm;
      overflow: hidden;
      font-weight: 700;
    }
    .pdf-measure-table td {
      height: auto;
      overflow: visible;
      padding: 0.8mm 1.6mm;
    }
    .pdf-measure-table .left {
      text-align: left !important;
      padding-left: 2mm !important;
    }
    .pdf-measure-table .wrap {
      white-space: normal !important;
      word-break: break-word;
      line-height: 1.05;
      overflow: visible;
    }`;
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

  static _resolveFontconfigMatch(query) {
    try {
      const output = execFileSync('fc-match', ['-f', '%{file}\n', query], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
      if (!output) {
        return null;
      }
      return fs.existsSync(output) ? output : null;
    } catch (err) {
      return null;
    }
  }

  static _buildEmbeddedFontCss() {
    if (SpecificationPdfService._fontCssCache !== null) {
      return SpecificationPdfService._fontCssCache;
    }

    const fontQueries = {
      sansRegular: [
        'Arial:style=Regular',
        'Arial',
        'Liberation Sans:style=Regular',
        'DejaVu Sans:style=Regular',
      ],
      sansBold: [
        'Arial:style=Bold',
        'Arial Bold',
        'Liberation Sans:style=Bold',
        'DejaVu Sans:style=Bold',
      ],
      monoRegular: [
        'Courier New:style=Regular',
        'Courier New',
        'Liberation Mono:style=Regular',
        'DejaVu Sans Mono:style=Regular',
      ],
      monoBold: [
        'Courier New:style=Bold',
        'Courier New Bold',
        'Liberation Mono:style=Bold',
        'DejaVu Sans Mono:style=Bold',
      ],
    };

    const rules = [];
    for (const [weightName, queries] of Object.entries(fontQueries)) {
      const fontPath = queries
        .map((query) => SpecificationPdfService._resolveFontconfigMatch(query))
        .find(Boolean);
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

  static _buildPdfSortKey(row) {
    const label = String(SpecificationPdfService._resolveLabel(row) ?? '').trim();
    return label;
  }

  static _comparePdfSortRows(a, b) {
    const aLabel = SpecificationPdfService._buildPdfSortKey(a);
    const bLabel = SpecificationPdfService._buildPdfSortKey(b);
    const aBlank = aLabel === '';
    const bBlank = bLabel === '';

    if (aBlank && bBlank) {
      return 0;
    }

    if (aBlank) {
      return 1;
    }

    if (bBlank) {
      return -1;
    }

    return aLabel.localeCompare(bLabel, 'ru', { numeric: true, sensitivity: 'base' });
  }

  static _sortRowsForPdf(rows) {
    return [...(rows || [])].sort((a, b) => {
      const byLabel = SpecificationPdfService._comparePdfSortRows(a, b);
      if (byLabel !== 0) {
        return byLabel;
      }

      const aId = SpecificationPdfService._toNumberOrNull(a && a.id);
      const bId = SpecificationPdfService._toNumberOrNull(b && b.id);
      if (aId !== null && bId !== null && aId !== bId) {
        return aId - bId;
      }

      return 0;
    });
  }

  static _buildPdfTitleSortKey(row) {
    return String(SpecificationPdfService._resolveMaterialTitle(row) ?? '').trim();
  }

  static _comparePdfTitleRows(a, b) {
    const aTitle = SpecificationPdfService._buildPdfTitleSortKey(a);
    const bTitle = SpecificationPdfService._buildPdfTitleSortKey(b);
    const aBlank = aTitle === '';
    const bBlank = bTitle === '';

    if (aBlank && bBlank) {
      return 0;
    }

    if (aBlank) {
      return 1;
    }

    if (bBlank) {
      return -1;
    }

    const byTitle = aTitle.localeCompare(bTitle, 'ru', { numeric: true, sensitivity: 'base' });
    if (byTitle !== 0) {
      return byTitle;
    }

    return SpecificationPdfService._comparePdfSortRows(a, b);
  }

  static _sortRowsByTitleForPdf(rows) {
    return [...(rows || [])].sort((a, b) => {
      const byTitle = SpecificationPdfService._comparePdfTitleRows(a, b);
      if (byTitle !== 0) {
        return byTitle;
      }

      const aId = SpecificationPdfService._toNumberOrNull(a && a.id);
      const bId = SpecificationPdfService._toNumberOrNull(b && b.id);
      if (aId !== null && bId !== null && aId !== bId) {
        return aId - bId;
      }

      return 0;
    });
  }

  static _sortRowsWithParentsForPdf(rows) {
    const items = Array.isArray(rows) ? rows : [];
    if (items.length <= 1) {
      return [...items];
    }

    const nodesById = new Map();
    const roots = [];

    for (const row of items) {
      const id = SpecificationPdfService._toNumberOrNull(row && row.id);
      nodesById.set(id !== null ? id : Symbol('spec-row'), {
        row,
        children: [],
      });
    }

    const nodeEntries = [...nodesById.entries()];
    for (const [key, node] of nodeEntries) {
      const row = node.row;
      const parentId = SpecificationPdfService._toNumberOrNull(row && row.parent_id);
      const parentNode = parentId !== null ? nodesById.get(parentId) : null;

      if (parentNode && parentNode !== node) {
        parentNode.children.push(node);
        continue;
      }

      roots.push(node);
    }

    const sortedRoots = roots.sort((a, b) => SpecificationPdfService._comparePdfSortRows(a.row, b.row));
    const flattened = [];
    const visited = new Set();

    const walk = (node) => {
      if (!node || visited.has(node)) {
        return;
      }

      visited.add(node);
      flattened.push(node.row);
      node.children.sort((a, b) => SpecificationPdfService._comparePdfSortRows(a.row, b.row));
      for (const child of node.children) {
        walk(child);
      }
    };

    for (const root of sortedRoots) {
      walk(root);
    }

    for (const node of nodesById.values()) {
      if (!visited.has(node)) {
        walk(node);
      }
    }

    return flattened;
  }

  static _isPdfSeparatorRow(row) {
    return !!(row && row.__pdfGroupSeparator === true);
  }

  static _resolvePdfGroupRootId(row, rowsById, seen = new Set()) {
    const rowId = SpecificationPdfService._toNumberOrNull(row && row.id);
    if (rowId === null || !rowsById || !rowsById.has(rowId) || seen.has(rowId)) {
      return rowId;
    }

    seen.add(rowId);
    const parentId = SpecificationPdfService._toNumberOrNull(row && row.parent_id);
    if (parentId === null || !rowsById.has(parentId)) {
      return rowId;
    }

    const parentRow = rowsById.get(parentId);
    return SpecificationPdfService._resolvePdfGroupRootId(parentRow, rowsById, seen);
  }

  static _insertPdfGroupSeparators(rows) {
    const items = Array.isArray(rows) ? rows : [];
    if (items.length <= 1) {
      return [...items];
    }

    const rowsById = new Map();
    for (const row of items) {
      const id = SpecificationPdfService._toNumberOrNull(row && row.id);
      if (id !== null && !rowsById.has(id)) {
        rowsById.set(id, row);
      }
    }

    const output = [];
    let previousGroupRootId = null;
    let hasPreviousGroup = false;

    for (const row of items) {
      if (SpecificationPdfService._isPdfSeparatorRow(row)) {
        continue;
      }

      const groupRootId = SpecificationPdfService._resolvePdfGroupRootId(row, rowsById);
      if (hasPreviousGroup && groupRootId !== null && previousGroupRootId !== null && groupRootId !== previousGroupRootId) {
        output.push({ __pdfGroupSeparator: true });
      } else if (hasPreviousGroup && groupRootId !== null && previousGroupRootId === null) {
        output.push({ __pdfGroupSeparator: true });
      }

      output.push(row);
      previousGroupRootId = groupRootId;
      hasPreviousGroup = true;
    }

    return output;
  }

  static _assignSequentialDisplayNumbers(rows, fieldName = 'display_number') {
    const items = Array.isArray(rows) ? rows : [];
    const output = [];
    let counter = 1;

    for (const row of items) {
      if (SpecificationPdfService._isPdfSeparatorRow(row)) {
        output.push(row);
        continue;
      }

      output.push({
        ...row,
        [fieldName]: counter,
      });
      counter += 1;
    }

    return output;
  }

  static _preparePdfRows(rows, groupByPartCode = false, insertBlankRowBetweenGroups = false) {
    const sortedRows = SpecificationPdfService._sortRowsWithParentsForPdf(rows);
    const partRowsBase = groupByPartCode
      ? SpecificationPdfService._sortRowsForPdf(SpecificationPdfService._groupRowsForPdf(sortedRows, true))
      : sortedRows;
    const summaryRowsBase = groupByPartCode
      ? SpecificationPdfService._sortRowsByTitleForPdf(SpecificationPdfService._groupRowsForPdf(sortedRows, true))
      : SpecificationPdfService._sortRowsByTitleForPdf(SpecificationPdfService._buildSummaryEntries(sortedRows));
    const summaryRowsWithNumbers = SpecificationPdfService._assignSequentialDisplayNumbers(
      insertBlankRowBetweenGroups
        ? SpecificationPdfService._insertPdfGroupSeparators(summaryRowsBase)
        : summaryRowsBase
    );

    return {
      partRows: insertBlankRowBetweenGroups
        ? SpecificationPdfService._insertPdfGroupSeparators(partRowsBase)
        : partRowsBase,
      summaryRows: summaryRowsWithNumbers,
    };
  }

  static _paginateRowsByHeights(rows, heights, maxHeightPx) {
    const items = Array.isArray(rows) ? rows : [];
    const chunks = [];
    let current = [];
    let currentHeight = 0;
    const limit = Number(maxHeightPx);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : Infinity;

    for (let index = 0; index < items.length; index += 1) {
      const row = items[index];
      const rowHeight = Number(heights && heights[index]);
      const safeRowHeight = Number.isFinite(rowHeight) && rowHeight > 0 ? rowHeight : 0;
      const isSeparator = SpecificationPdfService._isPdfSeparatorRow(row);

      if (isSeparator && current.length === 0) {
        continue;
      }

      if (current.length > 0 && currentHeight + safeRowHeight > safeLimit) {
        chunks.push(current);
        current = [];
        currentHeight = 0;

        if (isSeparator) {
          continue;
        }
      }

      current.push(row);
      currentHeight += safeRowHeight;
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }

  static _buildMeasurementHtml({ styles, partRows, summaryRows, grouped = false }) {
    const extraStyles = SpecificationPdfService._buildPdfExtraStyles();
    return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>pdf-measurement</title>
  <style>${styles}${extraStyles}</style>
</head>
<body>
  <div class="pdf-measure-root">
    <table class="pdf-measure-table measure-part">
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
        ${SpecificationPdfService._buildPartRows(partRows, 1, grouped)}
      </tbody>
    </table>
    <table class="pdf-measure-table measure-summary">
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
        ${SpecificationPdfService._buildSummaryRows(summaryRows, 1, grouped)}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  static _buildPdfGroupingKey(row, groupByPartCode) {
    const materialId = SpecificationPdfService._toNumberOrNull(row && row.material_id);
    const materialKey = materialId && materialId > 0 ? String(materialId) : `row:${row && row.id ? row.id : 'unknown'}`;
    if (!groupByPartCode) {
      return materialKey;
    }

    const partCode = String(row && row.part_code !== undefined && row.part_code !== null ? row.part_code : '').trim();
    return `${materialKey}|${partCode}`;
  }

  static _pushUniqueDisplayValue(values, rawValue) {
    const value = String(rawValue ?? '').trim();
    if (!value) {
      return;
    }

    if (!values.includes(value)) {
      values.push(value);
    }
  }

  static _mergeGroupedPdfRow(existing, row) {
    const quantity = SpecificationPdfService._toNumberOrNull(row && row.quantity) ?? 1;
    existing.quantity = (SpecificationPdfService._toNumberOrNull(existing.quantity) ?? 0) + quantity;
    SpecificationPdfService._pushUniqueDisplayValue(existing.room_values, row && row.zone);
    SpecificationPdfService._pushUniqueDisplayValue(existing.place_values, row && row.drawing_address);
  }

  static _groupRowsForPdf(rows, groupByPartCode = false) {
    const grouped = new Map();

    for (const row of rows || []) {
      const key = SpecificationPdfService._buildPdfGroupingKey(row, groupByPartCode);
      const existing = grouped.get(key);
      const quantity = SpecificationPdfService._toNumberOrNull(row && row.quantity) ?? 1;
      const roomValue = String((row && row.zone) ?? '').trim();
      const placeValue = String((row && row.drawing_address) ?? '').trim();

      if (!existing) {
        grouped.set(key, {
          ...row,
          quantity,
          room_values: roomValue ? [roomValue] : [],
          place_values: placeValue ? [placeValue] : [],
        });
        continue;
      }

      SpecificationPdfService._mergeGroupedPdfRow(existing, row);
    }

    return Array.from(grouped.values());
  }

  static _resolveMaterialDescr(part) {
    const descriptions = String(part && part.descriptions !== undefined && part.descriptions !== null
      ? part.descriptions
      : '').trim();
    const material = part.material || null;
    const materialDescription = String(material && material.description ? material.description : '').trim();

    if (descriptions && materialDescription) {
      return `${descriptions}, ${materialDescription}`;
    }

    if (descriptions) return descriptions;
    if (materialDescription) return materialDescription;
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
    if (Array.isArray(part.room_values) && part.room_values.length > 0) {
      return part.room_values.join(', ');
    }
    return part.zone || '';
  }

  static _resolvePlace(part) {
    if (Array.isArray(part.place_values) && part.place_values.length > 0) {
      return part.place_values.join(', ');
    }
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

  static _formatPartQuantity(value, grouped = false) {
    const n = SpecificationPdfService._toNumberOrNull(value);
    if (n === null) {
      return grouped ? '0.00' : '0';
    }
    if (grouped) {
      return n.toFixed(2);
    }
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
  }

  static _buildPartRows(rows, startIndex = 1, grouped = false) {
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

    let label = startIndex;
    return rows.map((part) => {
      if (SpecificationPdfService._isPdfSeparatorRow(part)) {
        return `
      <tr class="group-separator">
        <td colspan="10">&nbsp;</td>
      </tr>`;
      }

      const currentLabel = label;
      label += 1;
      return `
      <tr>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveLabel(part) || currentLabel)}</td>
        <td class="left wrap">${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialTitle(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialDescr(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialUnit(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._formatPartQuantity(part.quantity, grouped))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialWeight(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveTotalWeight(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveRoom(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolvePlace(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMatCode(part))}</td>
      </tr>`;
    }).join('');
  }

  static _buildSummaryRows(rows, startIndex = 1, grouped = false) {
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

    let label = startIndex;
    return rows.map((part) => {
      if (SpecificationPdfService._isPdfSeparatorRow(part)) {
        return `
      <tr class="group-separator">
        <td colspan="8">&nbsp;</td>
      </tr>`;
      }

      const currentLabel = label;
      label += 1;
      return `
      <tr>
        <td>${SpecificationPdfService._escapeHtml(part.display_number ?? currentLabel)}</td>
        <td class="left wrap">${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialTitle(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialDescr(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMaterialUnit(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(grouped ? SpecificationPdfService._formatPartQuantity(part.quantity, true) : SpecificationPdfService._formatSummaryQuantity(part.quantity ?? 1))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveTotalWeight(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveStatementCode(part))}</td>
        <td>${SpecificationPdfService._escapeHtml(SpecificationPdfService._resolveMatCode(part))}</td>
      </tr>`;
    }).join('');
  }

  static _buildPartPage({ pageNo, docName, docNumber, date, rev, logoUrl, rows, startIndex, grouped = false }) {
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
      ${SpecificationPdfService._buildPartRows(rows, startIndex, grouped)}
      </tbody>
    </table>
  </section>`;
  }

  static _buildSummaryPage({ pageNo, docName, docNumber, date, rev, logoUrl, rows, startIndex, grouped = false }) {
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
      ${SpecificationPdfService._buildSummaryRows(rows, startIndex, grouped)}
      </tbody>
    </table>
  </section>`;
  }

  static _buildHtml({
    spec,
    version,
    rows,
    logoUrl,
    groupByPartCode = false,
    insertBlankRowBetweenGroups = false,
    partChunks = null,
    summaryChunks = null
  }) {
    const styles = SpecificationPdfService._readTemplateStyles();
    const docName = spec.name || 'Specification';
    const docNumber = spec.code || `SP-${spec.id}`;
    const rev = version.version ?? version.id ?? '';
    const date = SpecificationPdfService._formatDate(version.updated_at || version.created_at || new Date());
    const preparedRows = SpecificationPdfService._preparePdfRows(rows, groupByPartCode, insertBlankRowBetweenGroups);
    const partRows = partChunks || SpecificationPdfService._chunk(preparedRows.partRows, 24);
    const summaryRows = summaryChunks || SpecificationPdfService._chunk(preparedRows.summaryRows, 24);

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
    for (const chunk of partRows.length ? partRows : [[]]) {
      pageNo += 1;
      pages.push(SpecificationPdfService._buildPartPage({
        pageNo,
        docName,
        docNumber,
        date,
        rev,
        logoUrl,
        rows: chunk,
        startIndex,
        grouped: groupByPartCode
      }));
      startIndex += chunk.length;
    }

    startIndex = 1;
    for (const chunk of summaryRows.length ? summaryRows : [[]]) {
      pageNo += 1;
      pages.push(SpecificationPdfService._buildSummaryPage({
        pageNo,
        docName,
        docNumber,
        date,
        rev,
        logoUrl,
        rows: chunk,
        startIndex,
        grouped: groupByPartCode
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
    .group-separator td {
      height: 4mm;
      padding: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      border-bottom: 0;
      background: transparent;
    }
  </style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
  }

  static async generateBySpecificationVersionId(versionId, actor, options = {}) {
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

    const groupByPartCode = options && options.groupByPartCode === true;
    const insertBlankRowBetweenGroups = options && options.insertBlankRowBetweenGroups === true;

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

    const inFlightKey = `${parsedVersionId}:${groupByPartCode ? 'group' : 'default'}:${insertBlankRowBetweenGroups ? 'blank' : 'noblank'}`;
    const existingPromise = SpecificationPdfService._inFlightGenerations.get(inFlightKey);
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
      const executablePath = SpecificationPdfService._resolveChromiumExecutablePath();
      if (!executablePath) {
        const err = new Error('Chromium executable not found');
        err.statusCode = 500;
        throw err;
      }

      return SpecificationPdfService._renderPdf({
        executablePath,
        spec,
        version,
        rows: enrichedRows,
        logoUrl,
        groupByPartCode,
        insertBlankRowBetweenGroups
      });
    })();

    SpecificationPdfService._inFlightGenerations.set(inFlightKey, generationPromise);

    try {
      return await generationPromise;
    } finally {
      const current = SpecificationPdfService._inFlightGenerations.get(inFlightKey);
      if (current === generationPromise) {
        SpecificationPdfService._inFlightGenerations.delete(inFlightKey);
      }
    }
  }

  static async _renderPdf({ executablePath, spec, version, rows, logoUrl, groupByPartCode = false, insertBlankRowBetweenGroups = false }) {
    await SpecificationPdfService._acquireSlot();

    try {
      const browser = await SpecificationPdfService._getBrowser(executablePath);
      const context = await browser.createBrowserContext();

      try {
        const page = await SpecificationPdfService._newPageWithRetry(context);
        page.setDefaultTimeout(PDF_PAGE_TIMEOUT_MS);
        page.setDefaultNavigationTimeout(PDF_PAGE_TIMEOUT_MS);

        const styles = SpecificationPdfService._readTemplateStyles();
        const preparedRows = SpecificationPdfService._preparePdfRows(rows, groupByPartCode, insertBlankRowBetweenGroups);
        const measurementHtml = SpecificationPdfService._buildMeasurementHtml({
          styles,
          partRows: preparedRows.partRows,
          summaryRows: preparedRows.summaryRows,
          grouped: groupByPartCode
        });

        await page.setContent(measurementHtml, {
          waitUntil: 'domcontentloaded',
          timeout: PDF_PAGE_TIMEOUT_MS,
        });
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
        }).catch(() => {});

        const layout = await page.evaluate(() => {
          const measureHeights = (selector) => Array.from(document.querySelectorAll(selector))
            .map((row) => {
              const rect = row.getBoundingClientRect();
              return rect ? rect.height : 0;
            });

          const measureHeaderHeight = (selector) => {
            const header = document.querySelector(selector);
            if (!header) {
              return 0;
            }
            const rect = header.getBoundingClientRect();
            return rect ? rect.height : 0;
          };

          return {
            partRowHeights: measureHeights('.measure-part tbody tr'),
            summaryRowHeights: measureHeights('.measure-summary tbody tr'),
            partHeaderHeight: measureHeaderHeight('.measure-part thead'),
            summaryHeaderHeight: measureHeaderHeight('.measure-summary thead')
          };
        });

        const availableTableAreaPx = SpecificationPdfService._mmToPx(270);
        const partMaxBodyHeightPx = Math.max(0, availableTableAreaPx - Number(layout.partHeaderHeight || 0));
        const summaryMaxBodyHeightPx = Math.max(0, availableTableAreaPx - Number(layout.summaryHeaderHeight || 0));
        const partChunks = SpecificationPdfService._paginateRowsByHeights(
          preparedRows.partRows,
          layout.partRowHeights || [],
          partMaxBodyHeightPx
        );
        const summaryChunks = SpecificationPdfService._paginateRowsByHeights(
          preparedRows.summaryRows,
          layout.summaryRowHeights || [],
          summaryMaxBodyHeightPx
        );

        const html = SpecificationPdfService._buildHtml({
          spec,
          version,
          rows,
          logoUrl,
          groupByPartCode,
          insertBlankRowBetweenGroups,
          partChunks,
          summaryChunks
        });

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
