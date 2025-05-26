require('dotenv').config();

module.exports = {
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/ai_comparison',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// config/openrouter.js
module.exports = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  models: {
    gemini: 'google/gemini-2.0-flash-exp:free',
    llama: 'meta-llama/llama-4-maverick:free',
    deepseek: 'deepseek/deepseek-chat-v3-0324:free'
  }
};