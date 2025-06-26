/**
 * Case structure definitions for the application
 */

// Define case types
const CASE_TYPES = {
    PHISHING_SMS: 'phishing_sms_case'
};

// Define case question flow structure
const CASE_STRUCTURES = {
    [CASE_TYPES.PHISHING_SMS]: {
        title: "Phishing SMS Case",
        description: "Handle cases related to phishing SMS attacks",
        questions: [
            {
                id: "incident_date",
                question: "When did you receive the phishing SMS?",
                type: "date",
                required: true
            },
            {
                id: "sms_content",
                question: "What was the content of the SMS? If possible, please copy and paste it.",
                type: "text",
                required: true
            },
            {
                id: "action_taken",
                question: "Did you click on any links in the SMS or provide any information?",
                type: "select",
                options: ["Yes, I clicked on a link", "Yes, I provided information", "Yes, both", "No, I did not interact with it"],
                required: true
            },
            {
                id: "financial_loss",
                question: "Did you suffer any financial loss as a result?",
                type: "select",
                options: ["Yes", "No"],
                required: true
            },
            {
                id: "loss_amount",
                question: "How much money did you lose? (in QAR)",
                type: "number",
                required: false,
                conditionalOn: {
                    questionId: "financial_loss",
                    value: "Yes"
                }
            },
            {
                id: "reported",
                question: "Have you reported this incident to the police or your bank?",
                type: "select",
                options: ["Yes, to the police", "Yes, to my bank", "Yes, to both", "No, I haven't reported it yet"],
                required: true
            }
        ]
    }
};

module.exports = {
    CASE_TYPES,
    CASE_STRUCTURES
};
