require('dotenv').config();

const config = {
  //apiKey: process.env.OPENROUTER_API_KEY,
  proKey: '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',
  apiKey: {
    1: "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",
    2: "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",
    3: "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",
    4: "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",
    5: "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",
    6: "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",
    7: "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",
    8: "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",
    9: "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",
    10: "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",
    11: "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",
    12: "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",
    13: "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",
    14: "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",
    15: "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",
    16: "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",
    17: "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",
    18: "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",
    19: "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",
    20: "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",
  },
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
  models: {
    gemini: 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
    llama: 'meta-llama/llama-4-maverick:free',
    deepseek: 'deepseek/deepseek-chat-v3-0324:free',
    gemma: 'google/gemma-3n-e4b-it:free'
  },
  headers: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
    'X-Title': process.env.APP_TITLE || 'Something About AI'
  }
};

// Debug logging
//console.log('OpenRouter Config loaded:', {
//  hasApiKey: !!config.apiKey,
//  apiKeyLength: config.apiKey?.length,
//  apiKeyPrefix: config.apiKey?.substring(0, 10) + '...',
//  baseURL: config.baseURL
//});

module.exports = config;