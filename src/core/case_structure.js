/**
 * Case structure definitions for the application
 */

// Define case types
const CASE_TYPES = {
    PHISHING_SMS: 'PHISHING_SMS',
    GENERAL: 'GENERAL',
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
    },

    [CASE_TYPES.GENERAL]: {
        title: "General Legal Case",
        description: "Handle general legal inquiries and cases",
        questions: [
            {
                id: "case_description",
                question: "Please provide a detailed description of your legal issue or what happened.",
                type: "text",
                required: true
            },
            {
                id: "incident_date",
                question: "When did this incident occur?",
                type: "date",
                required: true
            },
            {
                id: "parties_involved",
                question: "Who are the other parties involved in this matter?",
                type: "text",
                required: false
            },
            {
                id: "financial_impact",
                question: "Is there any financial impact or loss involved?",
                type: "select",
                options: ["Yes", "No", "Unsure"],
                required: true
            },
            {
                id: "loss_amount",
                question: "What is the approximate amount involved? (in QAR)",
                type: "number",
                required: false,
                conditionalOn: {
                    questionId: "financial_impact",
                    value: "Yes"
                }
            },
            {
                id: "evidence_available",
                question: "Do you have any documents, photos, or other evidence related to this case?",
                type: "select",
                options: ["Yes, I have documents", "Yes, I have photos", "Yes, I have both", "No, I don't have evidence"],
                required: true
            },
            {
                id: "previous_action",
                question: "Have you taken any previous action regarding this matter?",
                type: "text",
                required: false
            }
        ]
    }

};

module.exports = {
    CASE_TYPES,
    CASE_STRUCTURES
};
