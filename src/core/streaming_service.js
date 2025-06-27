const { getFanarChatCompletion } = require("./fanar_service");
const { generateLegalAnalysis } = require("./legal_analysis");

async function streamFanarChatCompletion(messagesArray, res) {
    try {
        const fullResponse = await getFanarChatCompletion(messagesArray);
        await simulateStreamingWithFormatting(fullResponse, res);
    } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
    }
}

async function streamLegalAnalysis(caseData, caseType, res) {
    try {
        // Add a brief introduction before the analysis
        res.write(`data: ${JSON.stringify({ 
            type: 'token', 
            content: "I've analyzed your case and prepared a comprehensive legal assessment. Here's what I found:\n\n" 
        })}\n\n`);
        
        const analysis = await generateLegalAnalysis(caseData, caseType);
        await simulateStreamingWithFormatting(analysis, res);
    } catch (error) {
        console.error('Legal analysis streaming error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate legal analysis' })}\n\n`);
    }
}

async function simulateStreamingWithFormatting(text, res) {
    const words = text.split(' ');
    let accumulatedText = '';
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        accumulatedText += word;
        
        // Check if we've completed a formatting unit (line, heading, etc.)
        const shouldFormat = checkForFormattingTriggers(word, accumulatedText);
        
        if (shouldFormat.format) {
            // Send formatted chunk
            res.write(`data: ${JSON.stringify({ 
                type: 'formatted_chunk', 
                content: shouldFormat.formattedContent,
                replaceFrom: shouldFormat.replaceFrom 
            })}\n\n`);
        } else {
            // Send regular token
            res.write(`data: ${JSON.stringify({ type: 'token', content: word })}\n\n`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

function checkForFormattingTriggers(word, accumulatedText) {
    // Check for completed headings (### at start of line followed by newline)
    if (word.includes('\n') && accumulatedText.includes('###')) {
        const lines = accumulatedText.split('\n');
        const lastCompleteLine = lines[lines.length - 2]; // Get the line before the newline
        
        if (lastCompleteLine && lastCompleteLine.startsWith('###')) {
            const headingText = lastCompleteLine.replace('###', '').trim();
            return {
                format: true,
                formattedContent: `<h3>${headingText}</h3>`,
                replaceFrom: lastCompleteLine
            };
        }
    }
    
    // Check for completed bold text (**text**)
    const boldMatch = accumulatedText.match(/\*\*(.*?)\*\*/g);
    if (boldMatch && word.includes('**')) {
        const lastBold = boldMatch[boldMatch.length - 1];
        const boldText = lastBold.replace(/\*\*/g, '');
        return {
            format: true,
            formattedContent: `<strong>${boldText}</strong>`,
            replaceFrom: lastBold
        };
    }
    
    // Check for completed list items
    if (word.includes('\n')) {
        const lines = accumulatedText.split('\n');
        const lastCompleteLine = lines[lines.length - 2];
        
        if (lastCompleteLine && /^\s*[\*\-\•]\s+/.test(lastCompleteLine)) {
            const listText = lastCompleteLine.replace(/^\s*[\*\-\•]\s+/, '');
            return {
                format: true,
                formattedContent: `<li>${listText}</li>`,
                replaceFrom: lastCompleteLine
            };
        }
        
        // Check for numbered lists
        if (lastCompleteLine && /^\s*\d+\.\s+/.test(lastCompleteLine)) {
            const listText = lastCompleteLine.replace(/^\s*\d+\.\s+/, '');
            return {
                format: true,
                formattedContent: `<li>${listText}</li>`,
                replaceFrom: lastCompleteLine
            };
        }
    }
    
    return { format: false };
}

module.exports = {
    streamFanarChatCompletion,
    streamLegalAnalysis,
    simulateStreaming: simulateStreamingWithFormatting
};