// MVP Dummy Case Structure for Demo Purposes
// You can add more complex, tree-based cases later by following this structure.

const CASE_TYPES = {
    PHISHING_SMS_CASE: 'phishing_sms_case'
};

// Fields for phishing SMS attack case
const PHISHING_SMS_CASE_FIELDS = {
    victimName: { required: false, type: 'string' },
    victimContact: { required: false, type: 'string' },
    dateOfIncident: { required: true, type: 'string' },
    senderNumber: { required: true, type: 'string' },
    smsContent: { required: true, type: 'text' },
    linkClicked: { required: false, type: 'boolean' },
    infoProvided: { required: false, type: 'string' },
    moneyLost: { required: false, type: 'boolean' },
    amountLost: { required: false, type: 'number' },
    reportedToAuthorities: { required: false, type: 'boolean' },
    authorityReported: { required: false, type: 'string' },
    description: { required: false, type: 'text' },
    evidence: { required: false, type: 'text' },
    status: { required: false, type: 'string' }
};

const PHISHING_SMS_CASE_QUESTIONS = [
    {
        field: 'victimName',
        question: "Could you please tell me your name?",
        allowSkip: false
    },
    {
        field: 'victimContact',
        question: "Can you please tell me your contact information (phone or email)?",
        allowSkip: false
    },
    {
        field: 'dateOfIncident',
        question: "When did you receive the phishing SMS?",
        allowSkip: false
    },
    {
        field: 'senderNumber',
        question: "Would you mind sharing the phone number that sent the SMS?",
        allowSkip: false
    },
    {
        field: 'smsContent',
        question: "Could you share what the SMS said? (You can copy/paste or summarize)",
        allowSkip: false
    },
    {
        field: 'linkClicked',
        question: "Did you click any link in the SMS? (yes/no)",
        allowSkip: true
    },
    {
        field: 'infoProvided',
        question: "Did you provide any personal or sensitive information? If yes, what?",
        allowSkip: true
    },
    {
        field: 'moneyLost',
        question: "Did you lose any money as a result? (yes/no)",
        allowSkip: true
    },
    {
        field: 'amountLost',
        question: "If money was lost, could you let me know how much? (in your currency)",
        allowSkip: true
    },
    {
        field: 'reportedToAuthorities',
        question: "Did you report the incident to any authority? (yes/no)",
        allowSkip: true
    },
    {
        field: 'authorityReported',
        question: "If yes, which authority did you report to?",
        allowSkip: true
    },
    {
        field: 'description',
        question: "Please describe what happened in your own words.",
        allowSkip: true
    },
    {
        field: 'evidence',
        question: "Do you have any evidence (e.g., screenshot, file, etc.) you could share?",
        allowSkip: true
    },
    {
        field: 'status',
        question: "What is the current status of your case? (open/closed/other)",
        allowSkip: true
    }
];

function getCaseStructure(caseType) {
    switch (caseType) {
        case CASE_TYPES.PHISHING_SMS_CASE:
            return {
                fields: PHISHING_SMS_CASE_FIELDS,
                questions: PHISHING_SMS_CASE_QUESTIONS
            };
        default:
            throw new Error(`Unknown case type: ${caseType}`);
    }
}

// Helper function to get next question based on current case data
function getNextQuestion(caseType, currentData) {
    const structure = getCaseStructure(caseType);
    const questions = structure.questions;
    
    for (let question of questions) {
        const fieldPath = question.field.split('.');
        let currentValue = currentData;
        
        // Navigate to the nested field
        for (let path of fieldPath) {
            if (currentValue && currentValue[path] !== undefined) {
                currentValue = currentValue[path];
            } else {
                currentValue = undefined;
                break;
            }
        }
        
        // If field is empty or undefined, this is the next question
        if (currentValue === undefined || currentValue === null || currentValue === '') {
            return question;
        }
    }
    
    return null; // All questions answered
}

// Helper function to validate case completeness
function validateCase(caseType, caseData) {
    const structure = getCaseStructure(caseType);
    const requiredFields = [];
    
    // Extract all required fields
    function extractRequiredFields(fields, prefix = '') {
        for (let [key, config] of Object.entries(fields)) {
            if (config.required && config.type !== 'object') {
                requiredFields.push(prefix + key);
            } else if (config.type === 'object' && config.required) {
                extractRequiredFields(config, prefix + key + '.');
            }
        }
    }
    
    extractRequiredFields(structure.fields);
    
    const missingFields = [];
    
    for (let field of requiredFields) {
        const fieldPath = field.split('.');
        let value = caseData;
        
        for (let path of fieldPath) {
            if (value && value[path] !== undefined) {
                value = value[path];
            } else {
                value = undefined;
                break;
            }
        }
        
        if (value === undefined || value === null || value === '') {
            missingFields.push(field);
        }
    }
    
    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields
    };
}

module.exports = {
    CASE_TYPES,
    getCaseStructure,
    getNextQuestion,
    validateCase,
    PHISHING_SMS_CASE_FIELDS,
    PHISHING_SMS_CASE_QUESTIONS
};
