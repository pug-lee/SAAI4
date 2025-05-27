require('dotenv').config();

console.log('=== Environment Variables Check ===\n');

// Check if .env file exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
console.log('Looking for .env file at:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log('.env file size:', fs.statSync(envPath).size, 'bytes');
}

console.log('\n=== OpenRouter API Key ===');
console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);

if (process.env.OPENROUTER_API_KEY) {
  const key = process.env.OPENROUTER_API_KEY;
  console.log('Key:', key);
  console.log('Key length:', key.length);
  console.log('Key prefix:', key.substring(0, 10) + '...');
  console.log('Key starts with "sk-":', key.startsWith('sk-'));
  console.log('Key contains spaces:', key.includes(' '));
  console.log('Key contains quotes:', key.includes('"') || key.includes("'"));
} else {
  console.log('❌ OPENROUTER_API_KEY is not set!');
  console.log('\nMake sure your .env file contains:');
  console.log('OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here');
}

console.log('\n=== Other Environment Variables ===');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
console.log('APP_TITLE:', process.env.APP_TITLE || 'Not set');
console.log('SITE_URL:', process.env.SITE_URL || 'Not set');

console.log('\n=== Testing API Key Format ===');
if (process.env.OPENROUTER_API_KEY) {
  // Test making a simple request
  const axios = require('axios');
  
  async function testAPIKey() {
    try {
      console.log('\nMaking test API call to OpenRouter...');
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      });
      console.log('✅ API Key is valid! Found', response.data.data.length, 'models');
    } catch (error) {
      console.log('❌ API Key test failed!');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        console.log('\nPossible issues:');
        console.log('1. API key is invalid or expired');
        console.log('2. API key has extra characters (spaces, quotes)');
        console.log('3. API key is not activated on OpenRouter');
      }
    }
  }
  
  testAPIKey();
} else {
  console.log('Cannot test API key - it is not set');
}