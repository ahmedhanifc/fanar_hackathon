class StreamingChatService {
    constructor() {
        this.isLegalAnalysis = false;
        this.isImageAnalysis = false;
        this.progressElement = null;
        this.imageProgressElement = null;
    }

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
                            } else if (parsed.type === 'progress') {
                                // Handle legal analysis progress
                                if (!this.isLegalAnalysis) {
                                    this.progressElement = addLegalAnalysisProgress();
                                    this.isLegalAnalysis = true;
                                }
                                updateLegalAnalysisProgress(parsed.progress, parsed.message);
                            } else if (parsed.type === 'image_progress') {
                                // Handle image analysis progress
                                if (!this.isImageAnalysis) {
                                    this.imageProgressElement = addImageAnalysisProgress();
                                    this.isImageAnalysis = true;
                                }
                                updateImageAnalysisProgress(parsed.progress, parsed.message);
                            } else if (parsed.type === 'complete_image_analysis') {
                                // Handle complete image analysis - display instantly
                                showImageAnalysisResult(parsed.content);
                                // Reset the image analysis state
                                this.isImageAnalysis = false;
                                this.imageProgressElement = null;
                                return;
                            }
                            
                            else if (parsed.type === 'complete_analysis') {
                                // Handle complete legal analysis
                                showLegalAnalysisResult(parsed.content);
                                onComplete && onComplete();
                                this.isLegalAnalysis = false;
                                this.progressElement = null;
                                return;
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

function addImageAnalysisProgress() {
    const chatMessages = document.getElementById('chat-messages');
    const progressDiv = document.createElement('div');
    progressDiv.className = 'message bot image-analysis-progress';
    progressDiv.id = 'image-analysis-progress';
    
    progressDiv.innerHTML = `
        <div class="message-content">
            <div class="analysis-progress">
                <div class="progress-header">
                    <i class="fas fa-image"></i>
                    <span>Analyzing Image</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="image-analysis-progress-bar"></div>
                </div>
                <div class="progress-message" id="image-analysis-progress-message">
                    Initializing analysis...
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(progressDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return progressDiv;
}

function updateImageAnalysisProgress(progress, message) {
    const progressBar = document.getElementById('image-analysis-progress-bar');
    const progressMessage = document.getElementById('image-analysis-progress-message');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    if (progressMessage) {
        progressMessage.textContent = message;
    }
}

function addLegalAnalysisProgress() {
    const chatMessages = document.getElementById('chat-messages');
    const progressDiv = document.createElement('div');
    progressDiv.className = 'message bot legal-analysis-progress';
    progressDiv.id = 'legal-analysis-progress';
    
    progressDiv.innerHTML = `
        <div class="message-content">
            <div class="analysis-progress">
                <div class="progress-header">
                    <i class="fas fa-balance-scale"></i>
                    <span>Preparing Legal Analysis</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="analysis-progress-bar"></div>
                </div>
                <div class="progress-message" id="analysis-progress-message">
                    Initializing analysis...
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(progressDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return progressDiv;
}

function updateLegalAnalysisProgress(progress, message) {
    const progressBar = document.getElementById('analysis-progress-bar');
    const progressMessage = document.getElementById('analysis-progress-message');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    if (progressMessage) {
        progressMessage.textContent = message;
    }
}

// Remove progress bar and show final analysis
function showLegalAnalysisResult(content) {
    const progressDiv = document.getElementById('legal-analysis-progress');
    if (progressDiv) {
        progressDiv.remove();
    }
    
    // Add the formatted legal analysis
    addMessageToChat(content, 'bot');
}

function showImageAnalysisResult(content) {
    // Remove the progress bar
    const progressDiv = document.getElementById('image-analysis-progress');
    if (progressDiv) {
        progressDiv.remove();
    }
    
    // Add the formatted image analysis instantly
    addMessageToChat(content, 'bot');
    
    // Scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

window.StreamingChatService = StreamingChatService;