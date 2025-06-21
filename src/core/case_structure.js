// Case Structure for Legal Assistant MVP
// Focus on Consumer Complaints and Traffic Accidents

const CASE_TYPES = {
    CONSUMER_COMPLAINT: 'consumer_complaint',
    TRAFFIC_ACCIDENT: 'traffic_accident'
};

// Base case structure that applies to all cases
const BASE_CASE_FIELDS = {
    caseType: { required: true, type: 'string' },
    dateOfIncident: { required: true, type: 'date' },
    location: { required: true, type: 'string' },
    description: { required: true, type: 'text' },
    evidence: { required: false, type: 'array' }, // Array of file paths/URLs
    contactInfo: {
        name: { required: true, type: 'string' },
        phone: { required: true, type: 'string' },
        email: { required: false, type: 'string' },
        address: { required: false, type: 'string' }
    },
    status: { required: true, type: 'string', default: 'draft' },
    createdAt: { required: true, type: 'date' },
    updatedAt: { required: true, type: 'date' }
};

// Consumer Complaint specific fields
const CONSUMER_COMPLAINT_FIELDS = {
    ...BASE_CASE_FIELDS,
    merchantName: { required: true, type: 'string' },
    merchantContact: { required: false, type: 'string' },
    productService: { required: true, type: 'string' },
    purchaseDate: { required: true, type: 'date' },
    purchaseAmount: { required: true, type: 'number' },
    complaintType: { 
        required: true, 
        type: 'enum', 
        options: [
            'defective_product',
            'poor_service',
            'false_advertising',
            'refund_denied',
            'warranty_issues',
            'price_dispute',
            'other'
        ]
    },
    previousCommunication: { required: false, type: 'text' },
    desiredOutcome: { required: true, type: 'text' }
};

// Traffic Accident specific fields
const TRAFFIC_ACCIDENT_FIELDS = {
    ...BASE_CASE_FIELDS,
    accidentType: { 
        required: true, 
        type: 'enum', 
        options: [
            'collision_with_vehicle',
            'collision_with_pedestrian',
            'collision_with_object',
            'rollover',
            'other'
        ]
    },
    vehiclesInvolved: {
        myVehicle: {
            make: { required: true, type: 'string' },
            model: { required: true, type: 'string' },
            year: { required: true, type: 'number' },
            plateNumber: { required: true, type: 'string' },
            insurance: { required: true, type: 'string' }
        },
        otherVehicles: { required: false, type: 'array' } // Array of vehicle objects
    },
    partiesInvolved: {
        driver: { required: true, type: 'string' },
        passengers: { required: false, type: 'array' },
        witnesses: { required: false, type: 'array' }
    },
    injuries: {
        myInjuries: { required: false, type: 'text' },
        otherInjuries: { required: false, type: 'text' },
        medicalAttention: { required: false, type: 'boolean' }
    },
    policeInvolved: { required: true, type: 'boolean' },
    policeReport: { required: false, type: 'string' },
    insuranceClaim: { required: false, type: 'boolean' },
    insuranceCompany: { required: false, type: 'string' }
};

// Question flow for Consumer Complaints
const CONSUMER_COMPLAINT_QUESTIONS = [
    {
        field: 'merchantName',
        question: 'What is the name of the business or merchant you are complaining about?',
        followUp: 'Do you have their contact information?'
    },
    {
        field: 'productService',
        question: 'What product or service are you complaining about?',
        followUp: 'Can you describe it in detail?'
    },
    {
        field: 'purchaseDate',
        question: 'When did you purchase this product or service?',
        followUp: 'Do you have a receipt or proof of purchase?'
    },
    {
        field: 'purchaseAmount',
        question: 'How much did you pay for this product or service?',
        followUp: 'Was this paid in cash, card, or another method?'
    },
    {
        field: 'complaintType',
        question: 'What type of complaint do you have?',
        options: [
            'Defective or damaged product',
            'Poor service quality',
            'False advertising',
            'Refund denied',
            'Warranty issues',
            'Price dispute',
            'Other'
        ]
    },
    {
        field: 'description',
        question: 'Please describe what happened in detail.',
        followUp: 'What specifically went wrong?'
    },
    {
        field: 'previousCommunication',
        question: 'Have you already contacted the merchant about this issue?',
        followUp: 'What was their response?'
    },
    {
        field: 'desiredOutcome',
        question: 'What would you like to achieve? (e.g., refund, replacement, apology)',
        followUp: 'Is there a specific amount or resolution you are seeking?'
    }
];

// Question flow for Traffic Accidents
const TRAFFIC_ACCIDENT_QUESTIONS = [
    {
        field: 'dateOfIncident',
        question: 'When did the accident occur?',
        followUp: 'What time of day was it?'
    },
    {
        field: 'location',
        question: 'Where did the accident happen?',
        followUp: 'Can you provide the street name or intersection?'
    },
    {
        field: 'accidentType',
        question: 'What type of accident was it?',
        options: [
            'Collision with another vehicle',
            'Collision with a pedestrian',
            'Collision with an object (wall, pole, etc.)',
            'Vehicle rollover',
            'Other'
        ]
    },
    {
        field: 'vehiclesInvolved.myVehicle.make',
        question: 'What is the make of your vehicle?',
        followUp: 'What is the model and year?'
    },
    {
        field: 'vehiclesInvolved.myVehicle.plateNumber',
        question: 'What is your vehicle\'s plate number?',
        followUp: 'Do you have your vehicle registration?'
    },
    {
        field: 'vehiclesInvolved.myVehicle.insurance',
        question: 'Do you have car insurance?',
        followUp: 'What is your insurance company name?'
    },
    {
        field: 'partiesInvolved.driver',
        question: 'Were you the driver?',
        followUp: 'If not, who was driving your vehicle?'
    },
    {
        field: 'partiesInvolved.passengers',
        question: 'Were there any passengers in your vehicle?',
        followUp: 'How many passengers and were they injured?'
    },
    {
        field: 'injuries.myInjuries',
        question: 'Were you injured in the accident?',
        followUp: 'What type of injuries did you sustain?'
    },
    {
        field: 'injuries.medicalAttention',
        question: 'Did you seek medical attention?',
        followUp: 'Where did you go for treatment?'
    },
    {
        field: 'policeInvolved',
        question: 'Were the police called to the scene?',
        followUp: 'Did they file a police report?'
    },
    {
        field: 'policeReport',
        question: 'Do you have a copy of the police report?',
        followUp: 'What is the report number?'
    },
    {
        field: 'description',
        question: 'Please describe how the accident happened.',
        followUp: 'What were the circumstances leading to the accident?'
    }
];

// Helper function to get case structure based on type
function getCaseStructure(caseType) {
    switch (caseType) {
        case CASE_TYPES.CONSUMER_COMPLAINT:
            return {
                fields: CONSUMER_COMPLAINT_FIELDS,
                questions: CONSUMER_COMPLAINT_QUESTIONS
            };
        case CASE_TYPES.TRAFFIC_ACCIDENT:
            return {
                fields: TRAFFIC_ACCIDENT_FIELDS,
                questions: TRAFFIC_ACCIDENT_QUESTIONS
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
    CONSUMER_COMPLAINT_FIELDS,
    TRAFFIC_ACCIDENT_FIELDS,
    CONSUMER_COMPLAINT_QUESTIONS,
    TRAFFIC_ACCIDENT_QUESTIONS
}; 