const puppeteer = require('puppeteer');
const MarkdownIt = require('markdown-it');
const fs = require('fs');
const path = require('path');

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
});

async function generateComplaintPDF(caseData, caseType) {
    let browser;
    
    try {
        console.log("Generating PDF with case data:", JSON.stringify(caseData, null, 2));
        
        // Check if case data is valid
        if (!caseData) {
            throw new Error("No case data provided");
        }
        
        // Ensure responses object exists
        if (!caseData.responses) {
            console.log("No responses found in case data, creating empty responses");
            caseData.responses = {}; // Create empty responses to avoid undefined errors
        }
        
        // Generate the complaint content based on case type
        let complaintContent;
        
        if (caseType === 'PHISHING_SMS') {
            complaintContent = generatePhishingComplaint(caseData);
        } else {
            complaintContent = generateGeneralComplaint(caseData);
        }
        
        // Convert markdown to HTML
        const htmlContent = md.render(complaintContent);
        
        // Create styled HTML document
        const styledHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Formal Complaint</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1, h2, h3 {
                    color: #2c5282;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 10px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #2c5282;
                    padding-bottom: 20px;
                }
                .section {
                    margin-bottom: 25px;
                }
                .signature-section {
                    margin-top: 50px;
                    border-top: 1px solid #ccc;
                    padding-top: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                td, th {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
                .checkbox {
                    margin-right: 10px;
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
        `;
        
        // Launch puppeteer
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(styledHTML, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });
        
        return pdfBuffer;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function generatePhishingComplaint(caseData) {
    const responses = caseData.responses || {};
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    return `
# FORMAL COMPLAINT - PHISHING INCIDENT

## Personal Information

**Full Name:** ${responses.full_name || 'Not specified'}
**Nationality:** ${responses.nationality || 'Not specified'}
**Qatar ID:** ${responses.qatar_id || 'Not specified'}
**Email:** ${responses.email || 'Not specified'}
**Phone Number:** ${responses.phone_number || 'Not specified'}

## Incident Details

**Date of Incident:** ${responses.incident_date || 'Not specified'}
**Type of Account Targeted:** ${responses.targeted_account || 'Not specified'}
**Suspected Entity/Website:** ${responses.suspect_entity || 'Not specified'}

## Incident Description

${responses.incident_description || 'Not provided'}

## Actions Taken

- Clicked suspicious link: ${responses.clicked_link === 'Yes' ? '☑ Yes' : '☐ No'}
- Entered personal information: ${responses.entered_info === 'Yes' ? '☑ Yes' : '☐ No'}
- Received official contact: ${responses.official_contact === 'Yes' ? '☑ Yes' : '☐ No'}
- Noticed unauthorized activity: ${responses.unauthorized_activity === 'Yes' ? '☑ Yes' : '☐ No'}
- Reported to authorities: ${responses.reported_to_authorities === 'Yes' ? '☑ Yes' : '☐ No'}

## Requested Actions

I hereby formally request the following actions:

1. Investigation into the phishing attempt and identification of perpetrators
2. Prevention of further fraudulent activities using similar methods
3. Recovery of any financial losses incurred (if applicable)
4. Legal action against the responsible parties

## Declaration

I declare that the information provided in this complaint is true and accurate to the best of my knowledge.

---

**Complainant Signature:** _________________________

**Date:** ${currentDate}

---

*This complaint was generated using Fanar Legal Assistant*
`;
}

function generateGeneralComplaint(caseData) {
    const responses = caseData.responses || {};
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    return `
# FORMAL COMPLAINT

## Complainant Information

**Case Description:** ${responses.case_description || 'Not specified'}
**Date of Incident:** ${responses.incident_date || 'Not specified'}
**Parties Involved:** ${responses.parties_involved || 'Not specified'}

## Financial Impact

**Financial Impact:** ${responses.financial_impact || 'Not specified'}
${responses.loss_amount ? `**Amount Lost:** ${responses.loss_amount} QAR` : ''}

## Evidence Available

**Evidence:** ${responses.evidence_available || 'Not specified'}

## Previous Actions

**Previous Actions Taken:** ${responses.previous_action || 'None'}

## Requested Relief

I hereby formally request appropriate legal action and remedy for the above-mentioned incident.

## Declaration

I declare that the information provided in this complaint is true and accurate to the best of my knowledge.

---

**Complainant Signature:** _________________________

**Date:** ${currentDate}

---

*This complaint was generated using Fanar Legal Assistant*
`;
}

module.exports = {
    generateComplaintPDF
};