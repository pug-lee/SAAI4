const axios = require('axios');

// Your OpenRouter Provisioning Key
const PROVISIONING_KEY = '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';

async function generateApiKey() {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/keys',
            {
                name: `auto-key-${Date.now()}`,
                limit: 0.0 // $1 credit limit
            },
            {
                headers: {
                    'Authorization': `Bearer ${PROVISIONING_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Generated API Key:', response.data.data);
        console.log('New new key:', response.data.key);
        return response.data;
        
    } catch (error) {
        console.error('Error generating API key:', error.response?.data || error.message);
        return null;
    }
}

// Usage
generateApiKey().then(apiKey => {
    if (apiKey) {
        console.log('Use this key for your OpenRouter requests:', apiKey);
        console.log('Use this key string:', apiKey.key);
    }
});