class StreamingChatService {
    async sendStreamingMessage(message, onToken, onComplete, onError, imageData = null) {
        try {
            const requestBody = { message };
            if (imageData) {
                try {
                    if (imageData.length > 1024 * 1024 * 9) {
                        throw new Error("Image is too large to upload.");
                    }
                    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData; 
                    requestBody.imageData = base64Data;
                } catch(error) {
                    console.error('Error processing image data:', error);
                    onError(`Image error: ${error.message}`);
                    return;
                }
            }

            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            onComplete();
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.type === 'token') {
                                onToken(parsed.content, 'token');
                            } else if (parsed.type === 'formatted_chunk') {
                                onToken(parsed.content, 'formatted', parsed.replaceFrom);
                            } else if (parsed.type === 'metadata') {
                                onComplete(parsed);
                            } else if (parsed.type === 'error') {
                                onError(parsed.message);
                                return;
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', data);
                        }
                    }
                }
            }
        } catch (error) {
            onError(error.message);
        }
    }
}

window.StreamingChatService = StreamingChatService;