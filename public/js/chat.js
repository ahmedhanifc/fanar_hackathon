// Initialize streaming service
const streamingService = new StreamingChatService();

// Modified sendMessage function to support streaming
async function sendMessage() {
    console.log("Sending Message...");
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    const imageInput = document.getElementById('imageInput');
    const hasImage = imageInput.files && imageInput.files[0];
    
    if (!message && !hasImage) return;
    
    // Clear input
    messageInput.value = '';
    
    // Add user message to chat if there is text
    if (message) {
        addMessageToChat(message, 'user');
    }
    
    // Handle the image if present
    let imageData = null;
    if (hasImage) {
        const imageFile = imageInput.files[0];
        
        // Add the image to the chat
        const imageUrl = URL.createObjectURL(imageFile);
        addImageToChat(imageUrl, 'user');
        
        // Remove the preview
        removeImagePreview();
        
        imageData = await compressImage(imageFile);
        console.log(`Compressed image size: ~${Math.round(imageData.length/1024)}KB`);

        if (imageData.length > 1024 * 1024 * 9) { // 9MB max after compression
                throw new Error("Image too large even after compression");
        }
    }
    
    try {
        // Create empty bot message for streaming
        const botMessageElement = addStreamingMessageToChat();
        
        // Use streaming service with image support
        await streamingService.sendStreamingMessage(
            message,
            // onToken - called for each word/token
            (token) => {
                appendToStreamingMessage(botMessageElement, token);
            },
            // onComplete - called when streaming is done
            (metadata) => {
                hideTypingIndicator();
                try {
                    finalizeStreamingMessage(botMessageElement);
                    console.log('Streaming complete', metadata);
                } catch (finalizeError) {
                    console.error('Error finalizing message:', finalizeError);
                    if (botMessageElement) {
                        botMessageElement.classList.remove('streaming');
                        const cursor = botMessageElement.querySelector('.streaming-cursor');
                        if (cursor) cursor.remove();
                    }
                }
            },
            // onError - called if there's an error
            (error) => {
                console.error('Streaming error:', error);
                hideTypingIndicator();
                if (botMessageElement && botMessageElement.parentNode) {
                    botMessageElement.remove();
                }
                addMessageToChat('Sorry, I\'m having trouble connecting right now. Please try again.', 'bot');
            },
            // New parameter for image data
            imageData
        );
        
        // Clear the file input
        imageInput.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessageToChat('Sorry, I\'m having trouble connecting right now. Please try again.', 'bot');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    const chatForm = document.getElementById('chat-form');
    const imageInput = document.getElementById('imageInput');
    const voiceButton = document.getElementById('voice-button');
    let selectedImage = null;
    let isRecording = false;
    let recognition = null;
    
    // 1. Handle form submission (main chat functionality)
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
    });
    
    // 2. Handle Enter key press (no shift for newlines)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 3. Auto-resize textarea as user types
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Reset to minimum height if empty
        if (!this.value.trim()) {
            this.style.height = '44px';
        }
    });
    
    // 4. Handle image upload
    imageInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            selectedImage = this.files[0];
            addImagePreview(selectedImage);
        }
    });
    
    // 5. Voice recognition setup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Set language
        
        recognition.onstart = function() {
            isRecording = true;
            voiceButton.classList.add('recording');
        };
        
        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update message input with transcript
            messageInput.value = finalTranscript || interimTranscript;
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            stopRecording();
        };
        
        recognition.onend = function() {
            stopRecording();
        };
        
        voiceButton.addEventListener('click', function() {
            if (isRecording) {
                recognition.stop();
            } else {
                messageInput.value = '';
                recognition.start();
            }
        });
        
        function stopRecording() {
            isRecording = false;
            voiceButton.classList.remove('recording');
        }
    } else {
        voiceButton.style.display = 'none';
        console.log("Speech recognition not supported");
    }
    
    // 6. Text-to-speech functionality for bot messages
    function speakText(text) {
        if ('speechSynthesis' in window) {
            const speech = new SpeechSynthesisUtterance();
            speech.text = text;
            speech.volume = 1;
            speech.rate = 1;
            speech.pitch = 1;
            window.speechSynthesis.speak(speech);
        }
    }
    
    // Optional helper: Add a speak button to messages
    function addSpeakButton(messageElement, text) {
        if ('speechSynthesis' in window) {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'speak-button';
            speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakBtn.title = 'Listen to this response';
            speakBtn.onclick = function() {
                speakText(text);
            };
            messageElement.appendChild(speakBtn);
        }
    }
});

async function compressImage(file, maxSizeMB = 1) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate scaling factor to get desired file size
                // Start with 0.7 quality which works well in most cases
                let scaleFactor = 1;
                if (Math.max(width, height) > 1600) {
                    scaleFactor = 1600 / Math.max(width, height);
                }
                
                canvas.width = width * scaleFactor;
                canvas.height = height * scaleFactor;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Start with a reasonable quality setting
                let quality = 0.7;
                
                // Get the compressed data URL
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
    });
}
// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Function to add messages to chat (existing - keep as is)
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Format the message if it's from the bot
    const formattedMessage = sender === 'bot' ? formatMessage(message) : message;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${formattedMessage}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// New function to create streaming message container
function addStreamingMessageToChat() {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot streaming';
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <span class="streaming-text"></span><span class="streaming-cursor">|</span>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// Function to append tokens to streaming message
function appendToStreamingMessage(messageElement, token) {
    if (!messageElement) return;
    
    const textSpan = messageElement.querySelector('.streaming-text');
    if (!textSpan) return;
    
    textSpan.textContent += token;
    
    // Scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Function to finalize streaming message
function finalizeStreamingMessage(messageElement) {
    // Add safety checks for all DOM elements
    if (!messageElement) {
        console.warn('Message element not found during finalization');
        return;
    }

    const textSpan = messageElement.querySelector('.streaming-text');
    const cursor = messageElement.querySelector('.streaming-cursor');
    
    // Check if textSpan exists before accessing its textContent
    if (!textSpan) {
        console.warn('Streaming text element not found');
        return;
    }
    
    // Remove cursor if it exists
    if (cursor) {
        cursor.remove();
    }
    
    // Remove streaming class
    messageElement.classList.remove('streaming');
    
    // Apply formatting to the final text
    const finalText = formatMessage(textSpan.textContent);
    const messageContent = messageElement.querySelector('.message-content');
    
    if (messageContent) {
        messageContent.innerHTML = finalText;
    }
}

// Function to show typing indicator 

function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to hide typing indicator (existing - keep as is)
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}


// formatMessage function (existing - keep as is)
function formatMessage(message) {
    if (!message) return '';
    
    let formatted = message;

    // Remove all types of quotes at the beginning and end (including smart quotes)
    formatted = formatted.replace(/^["'`""'']+|["'`""'']+$/g, '');
    
    // Remove escaped quotes throughout the text
    formatted = formatted.replace(/\\"/g, '"');
    formatted = formatted.replace(/\\'/g, "'");
    
    // Remove any remaining leading/trailing whitespace after quote removal
    formatted = formatted.trim();

    // Remove escaped quotes at the beginning and end
    formatted = formatted.replace(/^["']|["']$/g, '');

    // Remove escaped quotes throughout the text
    formatted = formatted.replace(/\\"/g, '"');
    formatted = formatted.replace(/\\'/g, "'");
    
    // Convert bullet points (*, -, •) to HTML lists
    formatted = formatted.replace(/^\s*[\*\-\•]\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ul> tags
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert headings (## Heading) to <h3>
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    
    // Convert section separators (---) to <hr>
    formatted = formatted.replace(/^---$/gm, '<hr>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Handle numbered lists (1. 2. 3.)
    formatted = formatted.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<ol><li>$2</li></ol>');
    
    // Merge consecutive <ol> tags
    formatted = formatted.replace(/<\/ol>\s*<ol>/g, '');
    
    // Clean up any double <ul> tags
    formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');

    return formatted;
}

// Function to add image preview to chat
function addImagePreview(imageFile) {
    const chatMessages = document.getElementById('chat-messages');
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview-container';
    previewDiv.id = 'image-preview';
    
    // Create a read URL for the image
    const imageUrl = URL.createObjectURL(imageFile);
    
    previewDiv.innerHTML = `
        <div class="image-preview">
            <img src="${imageUrl}" alt="Preview" class="preview-image">
            <div class="preview-info">
                <span>${imageFile.name}</span>
                <button type="button" class="remove-preview">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(previewDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add listener to remove button
    const removeButton = previewDiv.querySelector('.remove-preview');
    removeButton.addEventListener('click', function() {
        removeImagePreview();
        // Clear the file input
        const imageInput = document.getElementById('imageInput');
        imageInput.value = '';
        selectedImage = null;
    });
}

// Function to remove image preview
function removeImagePreview() {
    const previewDiv = document.getElementById('image-preview');
    if (previewDiv) {
        previewDiv.remove();
    }
}

// Function to add image to chat
function addImageToChat(imageUrl, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <img src="${imageUrl}" alt="Uploaded image" class="message-image">
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}