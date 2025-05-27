const axios = require('axios');
require('dotenv').config();

// Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY; // Set this in your .env file
const YOUR_SITE_URL = process.env.YOUR_SITE_URL || 'http://localhost:3000';
const YOUR_APP_NAME = process.env.YOUR_APP_NAME || 'OpenRouter Test App';

// Debug function to check API key and configuration
function debugConfiguration() {
    console.log('🔍 Debugging Configuration:');
    console.log('===========================');
    
    // Check if .env file exists
    const fs = require('fs');
    const envExists = fs.existsSync('.env');
    console.log(`📁 .env file exists: ${envExists ? '✅ Yes' : '❌ No'}`);
    
    // Check API key
    console.log(`🔑 API Key status: ${API_KEY ? '✅ Found' : '❌ Not found'}`);
    if (API_KEY) {
        console.log(`🔑 API Key length: ${API_KEY.length} characters`);
        console.log(`🔑 API Key starts with: ${API_KEY.substring(0, 8)}...`);
        console.log(`🔑 API Key format check: ${API_KEY.startsWith('sk-or-') ? '✅ Correct format' : '⚠️  Unexpected format'}`);
    }
    
    // Check other environment variables
    console.log(`🌐 Site URL: ${YOUR_SITE_URL}`);
    console.log(`📱 App Name: ${YOUR_APP_NAME}`);
    
    // Check if running in correct directory
    console.log(`📂 Current directory: ${process.cwd()}`);
    
    console.log('\n');
}

// Test function to send a query to OpenRouter
async function testOpenRouterAPI() {
    // Debug configuration first
    debugConfiguration();
    
    // Check if API key is provided
    if (!API_KEY) {
        console.error('❌ Error: OPENROUTER_API_KEY not found in environment variables');
        console.log('\n🛠️  Troubleshooting Steps:');
        console.log('1. Create a .env file in your project root directory');
        console.log('2. Add your OpenRouter API key: OPENROUTER_API_KEY=sk-or-your_key_here');
        console.log('3. Make sure the .env file is in the same directory as this script');
        console.log('4. Your API key should start with "sk-or-"');
        console.log('5. Get your API key from: https://openrouter.ai/keys');
        return;
    }
    
    // Validate API key format
    if (!API_KEY.startsWith('sk-or-')) {
        console.error('⚠️  Warning: API key should start with "sk-or-"');
        console.log('Please check your API key format at https://openrouter.ai/keys');
    }

    const testQuery = "What is the capital of France? Please provide a brief answer.";
    
    console.log('🚀 Testing OpenRouter API...');
    console.log(`📝 Query: ${testQuery}`);
    console.log('⏳ Sending request...');
    console.log(`🔗 URL: ${OPENROUTER_API_URL}`);
    console.log(`🤖 Model: meta-llama/llama-4-maverick:free\n`);

    try {
        const requestData = {
            model: "meta-llama/llama-4-maverick:free", // Using the free Llama 4 Maverick model
            messages: [
                {
                    role: "user",
                    content: testQuery
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        };

        const requestHeaders = {
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': YOUR_SITE_URL,
            'X-Title': YOUR_APP_NAME,
            'Content-Type': 'application/json'
        };

        console.log('📤 Request Headers (sanitized):');
        console.log(`   Authorization: Bearer ${API_KEY.substring(0, 10)}...`);
        console.log(`   HTTP-Referer: ${requestHeaders['HTTP-Referer']}`);
        console.log(`   X-Title: ${requestHeaders['X-Title']}`);
        console.log(`   Content-Type: ${requestHeaders['Content-Type']}\n`);

        const response = await axios.post(
            OPENROUTER_API_URL,
            requestData,
            {
                headers: requestHeaders,
                timeout: 30000 // 30 second timeout
            }
        );

        // Success response
        console.log('✅ API Request Successful!');
        console.log('📊 Response Details:');
        console.log(`   Model: ${response.data.model}`);
        console.log(`   Usage: ${JSON.stringify(response.data.usage, null, 2)}`);
        console.log('\n💬 AI Response:');
        console.log(response.data.choices[0].message.content);
        
        return response.data;

    } catch (error) {
        console.error('❌ API Request Failed:');
        
        if (error.response) {
            // Server responded with error status
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Status Text: ${error.response.statusText}`);
            console.error(`   Error Data:`, JSON.stringify(error.response.data, null, 2));
            
            // Specific handling for 401 errors
            if (error.response.status === 401) {
                console.log('\n🚨 401 Unauthorized Error - Troubleshooting:');
                console.log('================================');
                console.log('1. ✅ Check API Key Format:');
                console.log(`   - Your key starts with: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT FOUND'}`);
                console.log('   - Should start with: sk-or-');
                console.log('   - Get valid key from: https://openrouter.ai/keys');
                
                console.log('\n2. ✅ Check API Key Status:');
                console.log('   - Log into OpenRouter.ai dashboard');
                console.log('   - Verify your API key is active');
                console.log('   - Check if you have any usage limits');
                
                console.log('\n3. ✅ Check Environment Setup:');
                console.log('   - Ensure .env file is in correct location');
                console.log('   - Restart your application after changing .env');
                console.log('   - No spaces around = in .env file');
                
                console.log('\n4. ✅ Test API Key Manually:');
                console.log('   Run this curl command to test:');
                console.log(`   curl -X POST "${OPENROUTER_API_URL}" \\`);
                console.log(`     -H "Authorization: Bearer ${API_KEY ? API_KEY.substring(0, 15) + '...' : 'YOUR_KEY'}" \\`);
                console.log(`     -H "Content-Type: application/json" \\`);
                console.log(`     -d '{"model":"meta-llama/llama-4-maverick:free","messages":[{"role":"user","content":"Hello"}]}'`);
            }
            
        } else if (error.request) {
            // Request was made but no response received
            console.error('   No response received from server');
            console.error('   This might be a network connectivity issue');
            console.error('   Check your internet connection and try again');
        } else {
            // Something else went wrong
            console.error(`   Error: ${error.message}`);
        }
        
        throw error;
    }
}

// Test function with the Llama 4 Maverick model
async function testLlama4Maverick() {
    const testQueries = [
        "What is artificial intelligence?",
        "Explain quantum computing in simple terms.",
        "Write a short poem about technology."
    ];

    console.log('🔄 Testing Llama 4 Maverick with multiple queries...\n');

    for (let i = 0; i < testQueries.length; i++) {
        try {
            console.log(`Query ${i + 1}: ${testQueries[i]}`);
            
            const response = await axios.post(
                OPENROUTER_API_URL,
                {
                    model: "meta-llama/llama-4-maverick:free",
                    messages: [
                        {
                            role: "user",
                            content: testQueries[i]
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'HTTP-Referer': YOUR_SITE_URL,
                        'X-Title': YOUR_APP_NAME,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`✅ Response: ${response.data.choices[0].message.content}\n`);
            console.log(`📊 Tokens used: ${JSON.stringify(response.data.usage)}\n`);

        } catch (error) {
            console.error(`❌ Query ${i + 1} failed: ${error.response?.data?.error?.message || error.message}\n`);
        }
    }
}

// Simple API key validation function
async function validateApiKey() {
    console.log('🔐 Validating API Key...');
    
    if (!API_KEY) {
        console.error('❌ No API key found');
        return false;
    }
    
    try {
        const response = await axios.get('https://openrouter.ai/api/v1/auth/key', {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': YOUR_SITE_URL,
                'X-Title': YOUR_APP_NAME
            },
            timeout: 10000
        });
        
        console.log('✅ API Key is valid!');
        console.log(`   Key ID: ${response.data.data.id || 'N/A'}`);
        console.log(`   Usage: ${JSON.stringify(response.data.data.usage || {}, null, 2)}`);
        return true;
        
    } catch (error) {
        console.error('❌ API Key validation failed:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Error:`, error.response.data);
        } else {
            console.error(`   Error: ${error.message}`);
        }
        return false;
    }
}
async function getAvailableModels() {
    try {
        console.log('📋 Fetching available models...');
        
        const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': YOUR_SITE_URL,
                'X-Title': YOUR_APP_NAME
            }
        });

        console.log('✅ Available models:');
        response.data.data.forEach(model => {
            console.log(`   ${model.id} - $${model.pricing.prompt}/1K tokens`);
        });

        return response.data;

    } catch (error) {
        console.error('❌ Failed to fetch models:', error.response?.data || error.message);
        throw error;
    }
}

// Main execution
async function main() {
    console.log('🤖 OpenRouter AI API Test Script');
    console.log('================================\n');

    try {
        // First validate the API key
        const isKeyValid = await validateApiKey();
        if (!isKeyValid) {
            console.log('\n❌ Stopping execution due to invalid API key');
            return;
        }
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Test basic API functionality
        await testOpenRouterAPI();
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Uncomment the following lines to test additional features:
        
        // Test multiple queries with Llama 4 Maverick
        // await testLlama4Maverick();
        
        // Get available models
        // await getAvailableModels();

    } catch (error) {
        console.error('\n💥 Test script failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    testOpenRouterAPI,
    testLlama4Maverick,
    getAvailableModels,
    validateApiKey,
    debugConfiguration
};