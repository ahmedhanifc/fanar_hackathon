const { getFanarChatCompletion } = require("./fanar_service");
const { generateLegalAnalysis } = require("./legal_analysis");

async function streamFanarChatCompletion(messagesArray, res) {
    try {
        // If your AI service supports streaming, use it directly
        // Otherwise, get the full response and simulate streaming
        const fullResponse = await getFanarChatCompletion(messagesArray);
        await simulateStreaming(fullResponse, res);
    } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
    }
}

async function streamLegalAnalysis(caseData, caseType, res) {
    try {
        const analysis = await generateLegalAnalysis(caseData, caseType);
        await simulateStreaming(analysis, res);
    } catch (error) {
        console.error('Legal analysis streaming error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate legal analysis' })}\n\n`);
    }
}

async function simulateStreaming(text, res) {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ type: 'token', content: word })}\n\n`);
        // Adjust delay as needed (50ms feels natural)
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

module.exports = {
    streamFanarChatCompletion,
    streamLegalAnalysis,
    simulateStreaming
};