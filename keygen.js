const axios = require('axios');

// Replace this with your actual provisioning key
const PROVISIONING_KEY = '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';

// 1. Generate a new API key using the provisioning key
async function generateApiKey() {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/auth/key',
      {
        // Optional: include metadata or scopes
        metadata: {
          purpose: 'ChatGPT integration'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PROVISIONING_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('New key:', response.data.key);
    return response.data.key;
  } catch (error) {
    console.error('Error generating API key:', error.response?.data || error.message);
    throw error;
  }
}

// 2. Use the generated API key to make a query to OpenRouter AI
async function makeQueryWithApiKey(apiKey) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // or any available model
        messages: [
          { role: 'user', content: 'Hello, who won the world cup in 2022?' }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost', // required by OpenRouter
          'X-Title': 'Dynamic API Key Example' // optional metadata
        }
      }
    );

    console.log('Response from OpenRouter:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error querying OpenRouter:', error.response?.data || error.message);
  }
}

// Run the full flow
(async () => {
  try {
    const apiKey = await generateApiKey();
    console.log('Generated API key:', apiKey);

    await makeQueryWithApiKey(apiKey);
  } catch (err) {
    console.error('Failed full flow:', err.message);
  }
})();
