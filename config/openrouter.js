require('dotenv').config();

const config = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  models: {
    gemini: 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
    llama: 'meta-llama/llama-4-maverick:free',
    deepseek: 'deepseek/deepseek-chat-v3-0324:free',
    gemma: 'google/gemma-3n-e4b-it:free'
  },
  headers: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
    'X-Title': process.env.APP_TITLE || 'AI Comparison Platform'
  }
};

// Debug logging
console.log('OpenRouter Config loaded:', {
  hasApiKey: !!config.apiKey,
  apiKeyLength: config.apiKey?.length,
  apiKeyPrefix: config.apiKey?.substring(0, 10) + '...',
  baseURL: config.baseURL
});

module.exports = config;