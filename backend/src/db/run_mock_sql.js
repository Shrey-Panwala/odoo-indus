const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runSQL() {
  const sql = fs.readFileSync(path.join(__dirname, 'mock_data_50_rows.sql'), 'utf-8');
  console.log('Running mock data SQL script injection...');
  try {
    await pool.query(sql);
    console.log('✅ Mock data successfully inserted!');
  } catch (err) {
    console.error('❌ Insertion failed:', err.message);
  } finally {
    pool.end();
  }
}

runSQL();
