const fs = require('fs').promises;
const path = require('path');

// Law firm database - in a real implementation, this would come from a database
const LAW_FIRMS = [
    {
        id: 'al_sulaiti',
        name: 'Al Sulaiti Law Firm',
        email: 'info@alsulaitilaw.com',
        phone: '+974 4444 1234',
        specialties: ['cybercrime', 'digital_fraud', 'privacy'],
        languages: ['english', 'arabic'],
        description: 'Specialized in cybercrime and digital fraud cases'
    },
    {
        id: 'qatar_legal',
        name: 'Qatar Legal Services',
        email: 'contact@qatarlegal.qa',
        phone: '+974 4444 5678',
        specialties: ['general', 'cybercrime', 'commercial'],
        languages: ['english', 'arabic'],
        description: 'Comprehensive legal services with expertise in various areas'
    },
    {
        id: 'digital_rights',
        name: 'Digital Rights Advocates',
        email: 'help@digitalrights.qa',
        phone: '+974 4444 9012',
        specialties: ['cybercrime', 'privacy', 'digital_rights'],
        languages: ['english', 'arabic'],
        description: 'Specialized in digital rights and privacy protection'
    }
];

// Legal authorities in Qatar
const LEGAL_AUTHORITIES = [
    {
        name: 'Qatar Cyber Security Center',
        contact: '+974 4493 3333',
        website: 'https://www.qcsc.gov.qa',
        description: 'Handles cybercrime reports and investigations'
    },
    {
        name: 'Ministry of Interior - Cybercrime Unit',
        contact: '+974 234 2000',
        website: 'https://www.moi.gov.qa',
        description: 'Official cybercrime reporting and investigation unit'
    },
    {
        name: 'Qatar Financial Centre Regulatory Authority',
        contact: '+974 4496 7777',
        website: 'https://www.qfcra.com',
        description: 'Regulates financial services and handles financial fraud cases'
    }
];

class LegalSourcesService {
    constructor() {
        this.legalReferences = {};
        this.loadLegalReferences();
    }

    async loadLegalReferences() {
        try {
            const legalDir = path.join(__dirname, '../../legal_references');
            const files = await fs.readdir(legalDir);
            
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const content = await fs.readFile(path.join(legalDir, file), 'utf8');
                    const lawName = file.replace('.txt', '').replace(/_/g, ' ');
                    this.legalReferences[lawName] = content;
                }
            }
        } catch (error) {
            console.error('Error loading legal references:', error);
        }
    }

    getLegalReferences(caseType) {
        const references = [];
        
        // Map case types to relevant laws
        const lawMapping = {
            'phishing_sms_case': [
                'law_14_2014_cybercrimes',
                'law_16_2010_electronic_transactions',
                'law_13_2016_pdppl'
            ],
            'cybercrime': [
                'law_14_2014_cybercrimes',
                'law_16_2010_electronic_transactions'
            ],
            'privacy': [
                'law_13_2016_pdppl',
                'law_14_2014_cybercrimes'
            ]
        };

        const relevantLaws = lawMapping[caseType] || lawMapping['cybercrime'];
        
        for (const law of relevantLaws) {
            const lawName = law.replace(/_/g, ' ');
            if (this.legalReferences[lawName]) {
                references.push({
                    name: lawName,
                    content: this.legalReferences[lawName]
                });
            }
        }

        return references;
    }

    getLawFirms(caseType, language = 'english') {
        return LAW_FIRMS.filter(firm => {
            // Check if firm specializes in this case type or handles general cases
            return firm.specialties.includes(caseType) || 
                   firm.specialties.includes('general') ||
                   firm.languages.includes(language);
        });
    }

    getLegalAuthorities(caseType) {
        // Return all authorities for now, could be filtered based on case type
        return LEGAL_AUTHORITIES;
    }

    async generateLegalAdvice(caseData, caseType, language = 'english') {
        const references = this.getLegalReferences(caseType);
        const lawFirms = this.getLawFirms(caseType, language);
        const authorities = this.getLegalAuthorities(caseType);

        let advice = `Based on your case, here's what you can do in Qatar:\n\n`;

        // Add immediate actions
        advice += `**Immediate Actions:**\n`;
        advice += `• Contact Qatar Cyber Security Center: +974 4493 3333\n`;
        advice += `• Report to Ministry of Interior Cybercrime Unit: +974 234 2000\n`;
        advice += `• Document all evidence (screenshots, messages)\n\n`;

        // Add relevant legal references
        if (references.length > 0) {
            advice += `**Relevant Qatari Laws:**\n`;
            for (const ref of references) {
                advice += `• ${ref.name}\n`;
            }
            advice += `\n`;
        }

        // Add law firm recommendations
        if (lawFirms.length > 0) {
            advice += `**Legal Representation:**\n`;
            advice += `Consider consulting with a specialized law firm in Qatar.\n\n`;
        }

        advice += `Would you like me to help you create a formal legal report or contact a law firm on your behalf?`;

        return advice;
    }

    async generateLawFirmEmail(caseData, lawFirmId, language = 'english') {
        const firm = LAW_FIRMS.find(f => f.id === lawFirmId);
        if (!firm) {
            throw new Error('Law firm not found');
        }

        const subject = `Legal Assistance Request - ${caseData.caseType.replace('_', ' ')} Case`;
        
        const emailBody = `
Dear ${firm.name} Team,

I hope this email finds you well. I am writing on behalf of a client who has experienced a ${caseData.caseType.replace('_', ' ')} incident and is seeking legal assistance.

**Case Summary:**
${this.formatCaseSummary(caseData)}

**Client's Request:**
The client is seeking legal representation and guidance on the appropriate course of action for this case.

**Available Evidence:**
${caseData.evidence || 'Evidence to be provided upon request'}

**Contact Information:**
${caseData.victimName ? `Name: ${caseData.victimName}` : ''}
${caseData.victimContact ? `Contact: ${caseData.victimContact}` : ''}

Please let us know if you would be able to assist with this case and what the next steps would be.

Thank you for your time and consideration.

Best regards,
خطوة بخطوة (Step by Step)
Legal Assistant Platform
        `.trim();

        return {
            to: firm.email,
            subject: subject,
            body: emailBody,
            firm: firm
        };
    }

    formatCaseSummary(caseData) {
        let summary = '';
        
        if (caseData.dateOfIncident) {
            summary += `- Incident Date: ${caseData.dateOfIncident}\n`;
        }
        if (caseData.description) {
            summary += `- Description: ${caseData.description}\n`;
        }
        if (caseData.smsContent) {
            summary += `- SMS Content: ${caseData.smsContent}\n`;
        }
        if (caseData.senderNumber) {
            summary += `- Sender Number: ${caseData.senderNumber}\n`;
        }
        if (caseData.moneyLost && caseData.amountLost) {
            summary += `- Financial Loss: ${caseData.amountLost}\n`;
        }

        return summary || 'Case details to be provided upon request';
    }
}

module.exports = { LegalSourcesService, LAW_FIRMS, LEGAL_AUTHORITIES }; 