// test-db-connection.js (separate file for testing database connection)
require('dotenv').config();
const { Pool } = require('pg');

// Render PostgreSQL connection string format
// postgres://username:password@hostname:port/database

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  // Parse the connection string to show non-sensitive parts
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL.replace('postgres://', 'postgresql://'));
    console.log('Host:', url.hostname);
    console.log('Port:', url.port);
    console.log('Database:', url.pathname.slice(1));
  }

  const poolConfig = {
    connectionString: process.env.DATABASE_URL
  };

  // Render requires SSL
  if (process.env.DATABASE_URL) {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }

  const pool = new Pool(poolConfig);

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test query
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    console.log('Version:', result.rows[0].version.split(',')[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Connection test completed successfully!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    if (err.code === 'ECONNREFUSED') {
      console.error('→ The database server is not reachable. Check your connection string.');
    } else if (err.code === 'ENOTFOUND') {
      console.error('→ The hostname in your connection string cannot be resolved.');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('→ Connection timed out. The database might be overloaded or network issues.');
    } else if (err.message.includes('SSL')) {
      console.error('→ SSL/TLS error. Make sure SSL is properly configured.');
    } else if (err.message.includes('password authentication failed')) {
      console.error('→ Authentication failed. Check your username and password.');
    }
  }
}

testConnection();

// Alternative connection method for debugging
async function testConnectionAlternative() {
  console.log('\n--- Testing with manual configuration ---');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in environment variables');
    return;
  }

  // Parse the connection URL manually
  const connectionString = process.env.DATABASE_URL;
  const url = new URL(connectionString.replace('postgres://', 'postgresql://'));
  
  const config = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: false,
      require: true
    }
  };

  console.log('Connecting with config:', {
    user: config.user,
    host: config.host,
    port: config.port,
    database: config.database,
    ssl: 'enabled'
  });

  const pool = new Pool(config);

  try {
    const client = await pool.connect();
    console.log('✅ Alternative connection method successful!');
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Alternative connection failed:', err.message);
  }
}

// Run alternative test after a delay
setTimeout(() => {
  testConnectionAlternative();
}, 2000);

