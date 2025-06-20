const { OpenAI } = require("openai");

const client = new OpenAI({
    baseURL: "https://api.fanar.qa/v1",
    apiKey: process.env.FANAR_API_KEY, // The library knows to create the 'Authorization' header
});

async function getFanarChatCompletion(messagesArray) {
    console.log('Sending request to Fanar API...');
    try {
        const response = await client.chat.completions.create({
            model: "Fanar-S-1-7B",
            messages: messagesArray
        });

        console.log('Received response from Fanar API.');
        return response.choices[0].message.content;

    } catch (error) {
        console.error("Error calling Fanar API:", error);
        throw new Error('Failed to get a response from the AI service.');
    }
}

// Export the function so it can be used in other parts of your app
module.exports = { getFanarChatCompletion };