// MVP Dummy Case Structure for Demo Purposes
// You can add more complex, tree-based cases later by following this structure.

const CASE_TYPES = {
    CAT_CASE: 'cat_case'
};

// Simple fields for the dummy case
const CAT_CASE_FIELDS = {
    catName: { required: true, type: 'string' },
    catAge: { required: false, type: 'number' },
    favoriteFood: { required: false, type: 'string' },
    isIndoor: { required: false, type: 'boolean' },
    description: { required: false, type: 'text' }
};

// Simple linear question flow for the dummy case
const CAT_CASE_QUESTIONS = [
    {
        field: 'catName',
        question: 'What is your cat\'s name?',
        allowSkip: false
    },
    {
        field: 'catAge',
        question: 'How old is your cat?',
        allowSkip: true
    },
    {
        field: 'favoriteFood',
        question: 'What is your cat\'s favorite food?',
        allowSkip: true
    },
    {
        field: 'isIndoor',
        question: 'Is your cat an indoor cat?',
        allowSkip: true
    },
    {
        field: 'description',
        question: 'Tell me something interesting about your cat.',
        allowSkip: true
    }
];

// Helper function to get case structure based on type
function getCaseStructure(caseType) {
    switch (caseType) {
        case CASE_TYPES.CAT_CASE:
            return {
                fields: CAT_CASE_FIELDS,
                questions: CAT_CASE_QUESTIONS
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
    CAT_CASE_FIELDS,
    CAT_CASE_QUESTIONS
};
