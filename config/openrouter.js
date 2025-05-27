module.exports = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  models: {
    deepseek: 'deepseek/deepseek-chat-v3-0324:free',
    nvidia: 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
    llama: 'meta-llama/llama-4-maverick:free'
  },
  headers: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
    'X-Title': process.env.APP_TITLE || 'AI Comparison Platform'
  }
};