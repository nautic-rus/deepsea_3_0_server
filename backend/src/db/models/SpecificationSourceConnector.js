const pool = require('../connection');

class SpecificationSourceConnector {
  static async listAll() {
    const q = `
      SELECT
        id,
        code,
        url,
        COALESCE(
          url_source,
          CASE lower(code)
            WHEN 'block_oid' THEN '/api/oracle/{project_code}/blocks'
            WHEN 'as_oid' THEN '/api/oracle/{project_code}/astructure'
            WHEN 'system_oid' THEN '/api/oracle/{schemaName}/parts-by-system-oid?system_oid={oid}'
            WHEN 'equip_by_system_oid' THEN '/api/oracle/{schemaName}/equipment-by-system-oid?system_oid={oid}&filter={eq_type}&mechanical={eq_mech}'
            WHEN 'equip_by_zone_oid' THEN '/api/oracle/{schemaName}/equipment-by-zone-oid?zone_oid={oid}&filter={eq_type}&mechanical={eq_mech}'
            WHEN 'tray_by_system_oid' THEN '/api/oracle/{schemaName}/tray-by-system-oid?system_oid={oid}'
            WHEN 'tray_by_zone_oid' THEN '/api/oracle/{schemaName}/tray-by-zone-oid?zone_oid={oid}'
            ELSE NULL
          END
        ) AS url_source,
        name,
        created_at
      FROM specifications_source_connector
      ORDER BY id ASC
    `;
    const res = await pool.query(q);
    return res.rows || [];
  }
}

module.exports = SpecificationSourceConnector;
