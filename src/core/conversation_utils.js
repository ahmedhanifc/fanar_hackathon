const greetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'greetings', 'salaam', 'as-salamu alaykum', 'السلام عليكم'
];
// Only trigger in 'conversation' mode
function isGreeting(msg, mode = 'conversation') {
    if (mode !== 'conversation') return false;
    const lower = msg.trim().toLowerCase();
    return greetings.some(greet => lower.startsWith(greet) || lower === greet);
}

const helpPhrases = [
    'i need help', 'help me', 'i have a case', 'i need assistance', 'can you help', 'need help', 'support', 'assistance', 'i want to report', 'i want to file a case'
];
// Only trigger in 'conversation' mode
function isHelpRequest(msg, mode = 'conversation') {
    if (mode !== 'conversation') return false;
    const lower = msg.trim().toLowerCase();
    return helpPhrases.some(phrase => lower.includes(phrase));
}

const emotionalPhrases = [
    'i feel', 'i got scammed', 'i was scammed', 'i am upset', 'i am worried', 'i am scared', 'i am angry',
    'i lost', 'i was tricked', 'i am sad', 'i am frustrated', 'i am anxious', 'i am stressed', 'i am confused',
    'i received a scam', 'i got a scam', 'i was a victim', 'i am a victim', 'i was targeted', 'i am targeted',
    'my account', 'my card', 'my credit card', 'my bank', 'my information', 'my data', 'my details', 'my password',
    'fraud', 'phishing', 'stolen', 'compromised', 'breach', 'hacked', 'hack', 'scam', 'tricked', 'victim'
];
// Only trigger in 'conversation' mode
function isEmotionalOrStory(msg, mode = 'conversation') {
    if (mode !== 'conversation') return false;
    const lower = msg.trim().toLowerCase();
    return emotionalPhrases.some(phrase => lower.includes(phrase));
}

const consentPhrases = [
    'yes', "let's start", 'please help', 'start', 'go ahead', 'proceed', 'continue', 'file a report', 'help me file', 'ready', 'ok', 'okay', 'yalla', 'begin'
];
// Only trigger in 'checklist' mode
function isConsent(msg, mode = 'checklist') {
    if (mode !== 'checklist') return false;
    const lower = msg.trim().toLowerCase();
    return consentPhrases.some(phrase => lower.includes(phrase));
}

module.exports = {
    isGreeting,
    isHelpRequest,
    isEmotionalOrStory,
    isConsent
}; 