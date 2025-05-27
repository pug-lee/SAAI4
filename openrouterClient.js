// openrouterClient.js

require("dotenv").config();
const axios = require("axios");
const modelConfig = require("./config/modelConfig");

// OpenRouter API endpoint
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Sends a prompt to the OpenRouter API.
 * @param {string} prompt - The user input prompt.
 * @param {string} model - The model to use (optional).
 * @returns {Promise<string>} - The response from the model.
 */

console.log(process.env.OPENROUTER_API_KEY);

async function queryOpenRouter(prompt, model = modelConfig.defaultModel) {
  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("OpenRouter API Error:", error.response?.data || error.message);
    throw error;
  }
}

// Example usage:
(async () => {
  const prompt = "Tell me a joke about JavaScript.";
  const model = modelConfig.defaultModel;

  try {
    const response = await queryOpenRouter(prompt, model);
    console.log("Response:", response);
  } catch (err) {
    console.error("Failed to get response:", err.message);
  }
})();

module.exports = { queryOpenRouter };
