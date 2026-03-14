const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetAndSeed() {
  try {
    console.log('1. Wiping entire database schema...');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    
    console.log('2. Re-running schema to create tables...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('✅ Tables created successfully!');

    console.log('3. Inserting 50-row mock data securely...');
    const mockSql = fs.readFileSync(path.join(__dirname, 'mock_data_50_rows.sql'), 'utf-8');
    await pool.query(mockSql);
    console.log('✅ Mock data inserted successfully!');

    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\nVisible Tables in coreinventory database:');
    res.rows.forEach(row => console.log(' - ' + row.table_name));

  } catch (err) {
    console.error('❌ Error during database operations:', err);
  } finally {
    pool.end();
  }
}

resetAndSeed();
