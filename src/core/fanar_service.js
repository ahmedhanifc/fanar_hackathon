const { OpenAI } = require("openai");

// Validate API key on startup
if (!process.env.FANAR_API_KEY) {
    throw new Error('FANAR_API_KEY environment variable is required');
}

const client = new OpenAI({
    baseURL: "https://api.fanar.qa/v1",
    apiKey: process.env.FANAR_API_KEY,
    timeout: 30000, // 30 second timeout
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to validate messages array
function validateMessagesArray(messagesArray) {
    if (!Array.isArray(messagesArray)) {
        throw new Error('messagesArray must be an array');
    }
    
    if (messagesArray.length === 0) {
        throw new Error('messagesArray cannot be empty');
    }
    
    for (let i = 0; i < messagesArray.length; i++) {
        const message = messagesArray[i];
        if (!message || typeof message !== 'object') {
            throw new Error(`Invalid message at index ${i}: must be an object`);
        }
        if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
            throw new Error(`Invalid message role at index ${i}: must be 'system', 'user', or 'assistant'`);
        }
        if (!message.content || typeof message.content !== 'string') {
            throw new Error(`Invalid message content at index ${i}: must be a non-empty string`);
        }
    }
}

async function getFanarChatCompletion(messagesArray, retryCount = 0) {
    console.log('Sending request to Fanar API...');
    
    try {
        // Validate input
        validateMessagesArray(messagesArray);
        
        const response = await client.chat.completions.create({
            model: "Fanar-S-1-7B",
            messages: messagesArray,
            max_tokens: 1000, // Add reasonable token limit
            temperature: 0.7, // Add temperature for consistent responses
        });

        console.log('Received response from Fanar API.');
        
        // Validate response structure
        if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
            throw new Error('Invalid response structure from Fanar API');
        }
        
        const choice = response.choices[0];
        if (!choice.message || !choice.message.content) {
            throw new Error('Invalid message content in Fanar API response');
        }
        
        return choice.message.content;

    } catch (error) {
        console.error("Error calling Fanar API:", error);
        
        // Handle specific error types
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error('Request timeout: Fanar API took too long to respond');
        }
        
        if (error.status === 401) {
            throw new Error('Authentication failed: Please check your FANAR_API_KEY');
        }
        
        if (error.status === 429) {
            throw new Error('Rate limit exceeded: Please wait before making another request');
        }
        
        if (error.status >= 500) {
            // Server error - retry if we haven't exceeded max retries
            if (retryCount < MAX_RETRIES) {
                console.log(`Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                await delay(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
                return getFanarChatCompletion(messagesArray, retryCount + 1);
            }
            throw new Error('Fanar API server error: Please try again later');
        }
        
        if (error.status >= 400) {
            throw new Error(`Fanar API client error (${error.status}): ${error.message || 'Bad request'}`);
        }
        
        // Generic error
        throw new Error(`Failed to get a response from Fanar API: ${error.message}`);
    }
}

// Export the function so it can be used in other parts of your app
module.exports = { getFanarChatCompletion };