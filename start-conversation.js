require('dotenv').config();
const readline = require('readline');
const { getFanarChatCompletion } = require('./src/core/fanar_service.js');
const { saveConversation, getConversationById, getAllConversations } = require('./src/core/persistence.js');
const { personaPrompt } = require('./src/prompts/persona.js');
const { CaseConversationManager } = require('./src/core/case_conversation.js');
const { CASE_TYPES } = require('./src/core/case_structure.js');
const { ReportGenerator } = require('./src/core/report_generator.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// New case-based conversation function
async function caseBasedChat() {
    console.log('\n=== Legal Assistant - Case Builder ===\n');
    
    // Let user choose language first
    console.log('Please select your preferred language:');
    console.log('1. English');
    console.log('2. Arabic');
    console.log('3. Exit');
    
    rl.question('\nEnter your choice (1-3): ', async (languageChoice) => {
        let language;
        
        switch (languageChoice) {
            case '1':
                language = 'english';
                break;
            case '2':
                language = 'arabic';
                break;
            case '3':
                console.log('Goodbye!');
                rl.close();
                return;
            default:
                console.log('Invalid choice. Please try again.');
                caseBasedChat();
                return;
        }
        
        // Now let user choose case type
        console.log('\nPlease select a case type:');
        console.log('1. Consumer Complaint');
        console.log('2. Traffic Accident');
        console.log('3. Back to language selection');
        
        rl.question('\nEnter your choice (1-3): ', async (choice) => {
            let caseType;
            
            switch (choice) {
                case '1':
                    caseType = CASE_TYPES.CONSUMER_COMPLAINT;
                    break;
                case '2':
                    caseType = CASE_TYPES.TRAFFIC_ACCIDENT;
                    break;
                case '3':
                    caseBasedChat(); // Go back to language selection
                    return;
                default:
                    console.log('Invalid choice. Please try again.');
                    caseBasedChat();
                    return;
            }
            
            console.log(`\nStarting ${caseType.replace('_', ' ')} case in ${language}...\n`);
            
            const conversationManager = new CaseConversationManager(language);
            const startResponse = await conversationManager.startCase(caseType);
            
            console.log(`Assistant: ${startResponse.message}`);
            if (startResponse.options) {
                console.log('Options:', startResponse.options.join(', '));
            }
            
            // Start the conversation loop
            caseConversationLoop(conversationManager);
        });
    });
}

// Case conversation loop
async function caseConversationLoop(conversationManager) {
    rl.question('\nYou: ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log('Exiting conversation. Goodbye!');
            rl.close();
            return;
        }

        try {
            console.log('Assistant is processing...');
            const response = await conversationManager.processUserResponse(userInput);
            
            console.log(`Assistant: ${response.message}`);
            
            if (response.options) {
                console.log('Options:', response.options.join(', '));
            }
            
            if (response.isComplete) {
                console.log('\n=== Case Complete! ===');
                console.log('Generating report...');
                
                const reportGenerator = new ReportGenerator();
                const report = await reportGenerator.generateReport(response.caseData, conversationManager.language);
                const filename = reportGenerator.generateFilename(response.caseData, conversationManager.language);
                const filepath = await reportGenerator.saveReport(report, filename);
                
                console.log(`\nReport saved as: ${filename}`);
                console.log(`File location: ${filepath}`);
                console.log('\n=== Report Preview ===');
                console.log(report);
                
                // Ask if user wants to generate the other language version
                const otherLanguage = conversationManager.language === 'english' ? 'arabic' : 'english';
                const otherLanguageName = otherLanguage === 'english' ? 'English' : 'Arabic';
                
                rl.question(`\nWould you like to generate a ${otherLanguageName} version? (y/n): `, async (answer) => {
                    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                        const otherReport = await reportGenerator.generateReport(response.caseData, otherLanguage);
                        const otherFilename = reportGenerator.generateFilename(response.caseData, otherLanguage);
                        const otherFilepath = await reportGenerator.saveReport(otherReport, otherFilename);
                        
                        console.log(`\n${otherLanguageName} report saved as: ${otherFilename}`);
                        console.log(`File location: ${otherFilepath}`);
                    }
                    
                    console.log('\nThank you for using the Legal Assistant!');
                    rl.close();
                });
                
                return;
            }
            
            // Continue the conversation
            caseConversationLoop(conversationManager);

        } catch (error) {
            console.error('An error occurred:', error.message);
            caseConversationLoop(conversationManager); // Continue loop even on error
        }
    });
}

// Original chat function (kept for backward compatibility)
async function chat(history, conversationId) {
    rl.question('You: ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log('Exiting conversation. Goodbye!');
            rl.close();
            return;
        }

        try {
            history.push({ role: 'user', content: userInput });

            console.log('Assistant is typing...');
            const assistantReply = await getFanarChatCompletion(history);
            history.push({ role: 'assistant', content: assistantReply });
            console.log(`Assistant: ${assistantReply}`);
            
            const newId = await saveConversation(history, conversationId);
            
            // Continue the loop, passing the updated history and the same ID
            chat(history, newId);

        } catch (error) {
            console.error('An error occurred:', error.message);
            chat(history, conversationId); // Continue loop even on error
        }
    });
}

async function selectAndLoadConversation() {
    const conversations = await getAllConversations();
    if (conversations.length === 0) {
        console.log('No saved conversations found.');
        return null;
    }

    console.log('\nPlease select a conversation to load:');
    conversations.forEach((convo, index) => {
        console.log(`${index + 1}: Conversation from ${new Date(convo.lastUpdated).toLocaleString()}`);
    });

    return new Promise(resolve => {
        rl.question('Enter number: ', async (number) => {
            const index = parseInt(number, 10) - 1;
            if (index >= 0 && index < conversations.length) {
                const selectedId = conversations[index].id;
                const fullConversation = await getConversationById(selectedId);
                console.log(`\n--- Conversation loaded. Last message: ---`);
                console.log(fullConversation.history.slice(-1)[0]);
                console.log(`----------------------------------------\n`);
                resolve(fullConversation);
            } else {
                console.log('Invalid selection.');
                resolve(null);
            }
        });
    });
}

async function main() {
    console.log('=== Legal Assistant ===\n');
    console.log('Choose your conversation mode:');
    console.log('1. Case Builder (Structured legal case creation)');
    console.log('2. Free Chat (Open conversation)');
    console.log('3. Load Previous Conversation');
    console.log('4. Exit');
    
    rl.question('\nEnter your choice (1-4): ', async (choice) => {
        switch (choice) {
            case '1':
                // Start case-based conversation
                caseBasedChat();
                break;
            case '2':
                // Start free chat
                console.log('Starting free conversation. Type "exit" or "quit" to end.');
                const initialHistory = [{ 
                    role: "system", 
                    content: personaPrompt
                }];
                chat(initialHistory, null);
                break;
            case '3':
                // Load previous conversation
                const loadedSession = await selectAndLoadConversation();
                if (loadedSession) {
                    chat(loadedSession.history, loadedSession.id);
                } else {
                    rl.close();
                }
                break;
            case '4':
                console.log('Goodbye!');
                rl.close();
                break;
            default:
                console.log('Invalid choice. Please try again.');
                main();
                break;
        }
    });
}

main();