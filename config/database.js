require('dotenv').config();

module.exports = {
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/ai_comparison',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};