const pool = require('../../config/database');

async function findUploadedFileById(fileId) {
  const result = await pool.query(
    `SELECT id, entity_type, entity_id, stored_name, original_name, mime_type, file_size, storage_path, created_at
       FROM uploaded_files
      WHERE id = $1`,
    [fileId]
  );
  return result.rows[0] || null;
}

module.exports = { findUploadedFileById };
