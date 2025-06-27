// Initialize streaming service
const streamingService = new StreamingChatService();

// Modified sendMessage function to support streaming
async function sendMessage() {
    console.log("Sending Message...")
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    try {
        // Show typing indicator
        // showTypingIndicator();
        
        // Create empty bot message for streaming
        const botMessageElement = addStreamingMessageToChat();
        
        // Use streaming service
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
                    // Fallback: just remove streaming class and cursor if finalization fails
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
                // Check if botMessageElement exists before removing
                if (botMessageElement && botMessageElement.parentNode) {
                    botMessageElement.remove();
                }
                addMessageToChat('Sorry, I\'m having trouble connecting right now. Please try again.', 'bot');
            }
        );
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessageToChat('Sorry, I\'m having trouble connecting right now. Please try again.', 'bot');
    }
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

// Event listeners (existing - keep as is)
document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission
    document.getElementById('chat-form').addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
    });
    
    // Handle Enter key press
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
});

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