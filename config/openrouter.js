module.exports = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  models: {
    gemini: 'google/gemini-2.0-flash-exp:free',
    llama: 'meta-llama/llama-4-maverick:free',
    deepseek: 'deepseek/deepseek-chat-v3-0324:free'
  }
};