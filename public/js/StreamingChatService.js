class StreamingChatService {
    // Update the method to accept imageData parameter
    async sendStreamingMessage(message, onToken, onComplete, onError, imageData = null) {
        try {
            // Create request body object including optional image data
            const requestBody = { message };
            if (imageData) {
                try{

                    if (imageData.length > 1024 * 1024 * 9) { // 9MB limit
                        throw new Error("Image is too large to upload.");
                    }
                    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData; 
                    requestBody.imageData = base64Data;

                    const sizeInMB = (base64Data.length * 0.75) / (1024 * 1024);
                    console.log(`Image size: ~${sizeInMB.toFixed(2)}MB`);
                }
                catch(error){
                    console.error('Error processing image data:', error);
                    onError(`Image error: ${error.message}`);
                    return;
                }
            }

            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send the image data along with the message if present
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // The rest of your existing stream processing code stays the same
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

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
                                onToken(parsed.content);
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

// Make it globally available
window.StreamingChatService = StreamingChatService;