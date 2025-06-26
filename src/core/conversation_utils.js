const greetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'greetings', 'salaam', 'as-salamu alaykum', 'السلام عليكم'
];

// Detect greetings in any mode
function isGreeting(msg) {
    const lower = msg.trim().toLowerCase();
    return greetings.some(greet => lower.startsWith(greet) || lower === greet);
}

const helpPhrases = [
    'i need help', 'help me', 'i have a case', 'i need assistance', 'can you help', 'need help', 'support', 'assistance', 
    'i want to report', 'i want to file a case', 'i need legal help', 'i need legal advice', 'i need guidance',
    'help me with', 'can you assist', 'i need support', 'i need a lawyer', 'i need legal assistance'
];

// Detect help requests in any mode
function isHelpRequest(msg) {
    const lower = msg.trim().toLowerCase();
    return helpPhrases.some(phrase => lower.includes(phrase));
}

const emotionalPhrases = [
    'i feel', 'i got scammed', 'i was scammed', 'i am upset', 'i am worried', 'i am scared', 'i am angry',
    'i lost', 'i was tricked', 'i am sad', 'i am frustrated', 'i am anxious', 'i am stressed', 'i am confused',
    'i received a scam', 'i got a scam', 'i was a victim', 'i am a victim', 'i was targeted', 'i am targeted',
    'my account', 'my card', 'my credit card', 'my bank', 'my information', 'my data', 'my details', 'my password',
    'fraud', 'phishing', 'stolen', 'compromised', 'breach', 'hacked', 'hack', 'scam', 'tricked', 'victim',
    'i am concerned', 'i am worried about', 'i am afraid', 'i am nervous', 'i am scared about', 'i am upset about',
    'this is stressful', 'this is worrying', 'this is concerning', 'i don\'t know what to do', 'i need help with this'
];

// Detect emotional content in any mode
function isEmotionalOrStory(msg) {
    const lower = msg.trim().toLowerCase();
    return emotionalPhrases.some(phrase => lower.includes(phrase));
}

const consentPhrases = [
    'yes', "let's start", 'please help', 'start', 'go ahead', 'proceed', 'continue', 'file a report', 'help me file', 
    'ready', 'ok', 'okay', 'yalla', 'begin', 'sure', 'absolutely', 'definitely', 'of course', 'please do',
    'i want to proceed', 'i want to continue', 'let\'s do it', 'go ahead', 'please proceed', 'i agree',
    'i want legal help', 'i want legal guidance', 'i want a report', 'i need a report', 'help me create a report',
    'i want to file a case', 'i want to report this', 'i need to report this', 'i want to take legal action'
];

// Detect consent in any mode
function isConsent(msg) {
    const lower = msg.trim().toLowerCase();
    return consentPhrases.some(phrase => lower.includes(phrase));
}

// New utility functions for the case conversation system

const optionSelectionPatterns = {
    '1': ['1', 'one', 'first', 'option 1', 'choice 1', 'legal guidance', 'guidance', 'advice'],
    '2': ['2', 'two', 'second', 'option 2', 'choice 2', 'report', 'structured report', 'formal report'],
    '3': ['3', 'three', 'third', 'option 3', 'choice 3', 'contact', 'law firm', 'lawyer', 'attorney'],
    '4': ['4', 'four', 'fourth', 'option 4', 'choice 4', 'just report', 'only report', 'no guidance']
};

// Detect option selection
function detectOptionSelection(msg) {
    const lower = msg.trim().toLowerCase();
    for (const [option, patterns] of Object.entries(optionSelectionPatterns)) {
        if (patterns.some(pattern => lower.includes(pattern))) {
            return option;
        }
    }
    return null;
}

const skipPhrases = [
    'skip', 'skip this', 'i don\'t know', 'i don\'t remember', 'i can\'t remember', 'not sure', 'unsure',
    'i don\'t have this information', 'i don\'t have this', 'i don\'t know this', 'i can\'t provide this',
    'i don\'t want to answer', 'i prefer not to answer', 'i\'d rather not say', 'i\'d rather skip',
    'pass', 'pass on this', 'move on', 'next question', 'continue without this'
];

// Detect if user wants to skip a question
function wantsToSkip(msg) {
    const lower = msg.trim().toLowerCase();
    return skipPhrases.some(phrase => lower.includes(phrase));
}

const negativePhrases = [
    'no', 'nope', 'not really', 'i don\'t think so', 'probably not', 'i don\'t want to', 'i don\'t need',
    'i don\'t want', 'i don\'t need this', 'i don\'t want this', 'no thanks', 'no thank you', 'i\'ll pass',
    'i\'d rather not', 'i prefer not to', 'i don\'t want to proceed', 'i don\'t want to continue'
];

// Detect negative responses
function isNegativeResponse(msg) {
    const lower = msg.trim().toLowerCase();
    return negativePhrases.some(phrase => lower.includes(phrase));
}

const positivePhrases = [
    'yes', 'yeah', 'yep', 'sure', 'absolutely', 'definitely', 'of course', 'certainly', 'indeed',
    'i do', 'i have', 'i did', 'i was', 'i am', 'i will', 'i want to', 'i need to', 'i would like to'
];

// Detect positive responses
function isPositiveResponse(msg) {
    const lower = msg.trim().toLowerCase();
    return positivePhrases.some(phrase => lower.includes(phrase));
}

// Detect if message contains case-related keywords
const caseKeywords = [
    'case', 'incident', 'problem', 'issue', 'situation', 'matter', 'concern', 'complaint',
    'report', 'file', 'document', 'evidence', 'witness', 'victim', 'suspect', 'accused',
    'legal', 'law', 'lawyer', 'attorney', 'court', 'police', 'authority', 'government'
];

function containsCaseKeywords(msg) {
    const lower = msg.trim().toLowerCase();
    return caseKeywords.some(keyword => lower.includes(keyword));
}

// Detect if message is a brief description (short and contains case keywords)
function isBriefDescription(msg) {
    const words = msg.trim().split(/\s+/).length;
    return words <= 20 && (containsCaseKeywords(msg) || isEmotionalOrStory(msg));
}

module.exports = {
    isGreeting,
    isHelpRequest,
    isEmotionalOrStory,
    isConsent,
    detectOptionSelection,
    wantsToSkip,
    isNegativeResponse,
    isPositiveResponse,
    containsCaseKeywords,
    isBriefDescription
}; 