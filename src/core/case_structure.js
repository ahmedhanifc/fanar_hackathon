/**
 * Case structure definitions for the application
 */

const { options } = require("../api/chat.routes");

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
                id: "full_name",
                question: "Can you tell me your full name?",
                type: "text",
                required: true
            },
            {
                id: "nationality",
                question: "What is your nationality?",
                type: "text",
                required: true
            },
            {
                id: "qatar_id",
                question: "What is your Qatar ID number?",
                type: "number",
                required: true
            },
            {
                id: "targeted_account",
                question: "What account was targeted in this phishing SMS? (e.g., bank account, social media account)",
                type: "text",
                required: true
            },
            {
                id: "loss_amount",
                question: "Did you click on a suspicious link that was sent to you?",
                type: "select",
                options: ["Yes", "No"],
                required: true,
            },
            {
                id: "personal_info",
                question: "Did you enter any personal or banking information after clicking the link?",
                type: "select",
                options: ["Yes", "No"],
                required: true,
            },
            {
                id: "suspicious_message",
                question: "Did you receive a call or message claiming to be from an official entity (bank, ministry, company) before or after the suspicious message?",
                type: "select",
                options: ["Yes", "No"],
                required: true,
            },
            {
                id: "reported_to_authorities",
                question: "Did you report this incident to the police or your bank?",
                type: "select",
                options: ["Yes", "No"],
                required: true,
            },
            {
                id: "phishing_attempt",
                question: "Have you ever been targeted by a phishing attempt before?",
                type: "select",
                options: ["Yes", "No"],
                required: true,
            },
            {
                id: "phishing_attempt",
                question: "Do you have any documents or screenshots to support your complaint? (e.g., screenshot of the message, link, account details, previous report, proof of withdrawal)",
                type: "select",
                options: ["Yes", "No"],
                required: true,
            },
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
