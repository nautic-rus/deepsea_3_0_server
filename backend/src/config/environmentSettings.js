const EnvironmentSetting = require('../db/models/EnvironmentSetting');
const {
  listDefinitions,
  getDefinition,
  serializeValue,
  deserializeValue
} = require('./environmentSettingsRegistry');

function isMissingTableError(error) {
  return !!(error && (error.code === '42P01' || error.code === '42S02'));
}

function applySettingToProcessEnv(key, value) {
  if (value === undefined || value === null) {
    delete process.env[key];
    return;
  }
  process.env[key] = String(value);
}

function applyRowsToProcessEnv(rows) {
  const rowsByKey = new Map((rows || []).map((row) => [row.key, row]));
  for (const definition of listDefinitions()) {
    const row = rowsByKey.get(definition.key);
    if (row && row.value !== undefined && row.value !== null) {
      applySettingToProcessEnv(definition.key, row.value);
      continue;
    }

    if (process.env[definition.key] === undefined && definition.defaultValue !== undefined) {
      applySettingToProcessEnv(definition.key, serializeValue(definition.key, definition.defaultValue));
    }
  }
}

function buildStoredSetting(definition, rawValue) {
  return {
    key: definition.key,
    value: serializeValue(definition.key, rawValue),
    value_type: definition.valueType,
    description: definition.description,
    is_secret: definition.isSecret,
    requires_restart: definition.requiresRestart
  };
}

function toPublicRow(row, options = {}) {
  const includeSecrets = !!options.includeSecrets;
  const definition = getDefinition(row.key);
  const isSecret = !!row.is_secret;
  return {
    key: row.key,
    value_type: row.value_type,
    description: row.description || (definition ? definition.description : null),
    is_secret: isSecret,
    requires_restart: !!row.requires_restart,
    has_value: row.value !== null && row.value !== undefined && row.value !== '',
    value: isSecret && !includeSecrets ? null : deserializeValue(row.key, row.value),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function initializeEnvironmentSettings() {
  let existingRows;
  try {
    existingRows = await EnvironmentSetting.list(listDefinitions().map((definition) => definition.key));
  } catch (error) {
    if (isMissingTableError(error)) {
      applyRowsToProcessEnv([]);
      return { usingDatabase: false, seeded: 0, count: 0 };
    }
    throw error;
  }

  const existingByKey = new Map(existingRows.map((row) => [row.key, row]));
  const missingSettings = [];

  for (const definition of listDefinitions()) {
    if (existingByKey.has(definition.key)) continue;

    const sourceValue = process.env[definition.key] !== undefined
      ? process.env[definition.key]
      : definition.defaultValue;

    if (sourceValue === undefined) continue;
    missingSettings.push(buildStoredSetting(definition, sourceValue));
  }

  if (missingSettings.length > 0) {
    await EnvironmentSetting.upsertMany(missingSettings);
    existingRows = await EnvironmentSetting.list(listDefinitions().map((definition) => definition.key));
  }

  applyRowsToProcessEnv(existingRows);

  return {
    usingDatabase: true,
    seeded: missingSettings.length,
    count: existingRows.length
  };
}

async function listEnvironmentSettings(options = {}) {
  let rows;
  try {
    rows = await EnvironmentSetting.list(listDefinitions().map((definition) => definition.key));
  } catch (error) {
    if (isMissingTableError(error)) {
      const err = new Error('Environment settings table is missing. Apply migration first.');
      err.statusCode = 500;
      throw err;
    }
    throw error;
  }

  return rows.map((row) => toPublicRow(row, options));
}

async function getEnvironmentSetting(key, options = {}) {
  const definition = getDefinition(key);
  if (!definition) {
    const err = new Error(`Unsupported environment setting key: ${key}`);
    err.statusCode = 400;
    throw err;
  }

  let row;
  try {
    row = await EnvironmentSetting.findByKey(definition.key);
  } catch (error) {
    if (isMissingTableError(error)) {
      const err = new Error('Environment settings table is missing. Apply migration first.');
      err.statusCode = 500;
      throw err;
    }
    throw error;
  }

  if (!row) {
    const err = new Error('Environment setting not found');
    err.statusCode = 404;
    throw err;
  }

  return toPublicRow(row, options);
}

async function updateEnvironmentSettings(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    const err = new Error('settings array is required');
    err.statusCode = 400;
    throw err;
  }

  const rowsToUpsert = entries.map((entry) => {
    const definition = getDefinition(entry.key);
    if (!definition) {
      const err = new Error(`Unsupported environment setting key: ${entry.key}`);
      err.statusCode = 400;
      throw err;
    }

    return buildStoredSetting(definition, entry.value);
  });

  let rows;
  try {
    rows = await EnvironmentSetting.upsertMany(rowsToUpsert);
  } catch (error) {
    if (isMissingTableError(error)) {
      const err = new Error('Environment settings table is missing. Apply migration first.');
      err.statusCode = 500;
      throw err;
    }
    throw error;
  }

  applyRowsToProcessEnv(rows);

  return {
    rows: rows.map((row) => toPublicRow(row)),
    requiresRestart: rows.some((row) => !!row.requires_restart)
  };
}

module.exports = {
  initializeEnvironmentSettings,
  listEnvironmentSettings,
  getEnvironmentSetting,
  updateEnvironmentSettings
};