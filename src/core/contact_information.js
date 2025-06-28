function getContactInformation(caseType) {
    const contacts = {
        PHISHING_SMS: {
            title: "Contact Information for Phishing/Fraud Cases",
            departments: [
                {
                    name: "Ministry of Interior - Cybercrime Department",
                    phone: "+974 4439 8888",
                    email: "cybercrime@moi.gov.qa",
                    website: "https://portal.moi.gov.qa",
                    services: "Report cybercrimes, phishing attempts, online fraud"
                },
                {
                    name: "Qatar Central Bank - Banking Fraud",
                    phone: "+974 4456 7777",
                    email: "complaints@qcb.gov.qa",
                    website: "https://www.qcb.gov.qa",
                    services: "Banking fraud, unauthorized transactions"
                },
                {
                    name: "Communications Regulatory Authority",
                    phone: "+974 4446 6666",
                    email: "info@cra.gov.qa",
                    website: "https://www.cra.gov.qa",
                    services: "SMS fraud, telecom-related fraud"
                }
            ]
        },
        GENERAL: {
            title: "General Legal Assistance Contacts",
            departments: [
                {
                    name: "Ministry of Justice",
                    phone: "+974 4433 5555",
                    email: "info@moj.gov.qa",
                    website: "https://www.moj.gov.qa",
                    services: "General legal matters, court procedures"
                },
                {
                    name: "Qatar Legal Aid",
                    phone: "+974 4444 4444",
                    email: "help@legalaid.qa",
                    website: "https://www.legalaid.qa",
                    services: "Free legal consultation, legal representation"
                }
            ]
        }
    };
    
    return contacts[caseType] || contacts.GENERAL;
}

function formatContactInformation(contactInfo) {
    let formatted = `# ${contactInfo.title}\n\n`;
    
    contactInfo.departments.forEach((dept, index) => {
        formatted += `## ${index + 1}. ${dept.name}\n\n`;
        formatted += `**Phone:** ${dept.phone}\n\n`;
        formatted += `**Email:** ${dept.email}\n\n`;
        formatted += `**Website:** ${dept.website}\n\n`;
        formatted += `**Services:** ${dept.services}\n\n`;
        formatted += `---\n\n`;
    });
    
    return formatted;
}

module.exports = {
    getContactInformation,
    formatContactInformation
};