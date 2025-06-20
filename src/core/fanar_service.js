const axios = require('axios');

async function getFanarChatCompletion(userMessage, systemPrompt) {
    
    // Securely get the API key from environment variables
    const apiKey = process.env.FANAR_API_KEY;
    
    // The official endpoint for Fanar chat completions
    const endpoint = 'https://api.fanar.ai/v1/chat/completions';

    // The data payload for the API request
    const payload = {
        model: 'fanar-7b-chat-v1', // Use the specific model you intend to test
        messages: [
            {
                role: 'system',
                content: systemPrompt // The persona prompt from your Research lead
            },
            {
                role: 'user',
                content: userMessage // The actual message from the user
            }
        ]
        // Add other parameters like 'stream: false', 'temperature', etc. if needed
    };

    // The headers, including the crucial Authorization token
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    console.log('Sending request to Fanar API...');

    try {
        // Make the POST request using axios
        const response = await axios.post(endpoint, payload, { headers });

        // Extract the chatbot's reply from the response data structure
        // This path might need adjustment based on Fanar's exact JSON response
        const botReply = response.data.choices[0].message.content;
        
        console.log('Received response from Fanar API.');
        return botReply;

    } catch (error) {
        // Log detailed error information for debugging
        console.error('Error calling Fanar API:', error.response ? error.response.data : error.message);
        
        // Return a user-friendly error message
        throw new Error('Failed to get a response from the AI service.');
    }
}

// Export the function so it can be used in other parts of your app
module.exports = { getFanarChatCompletion };