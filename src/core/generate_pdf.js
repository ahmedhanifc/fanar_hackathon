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
# شكوى رسمية - حادثة تصيّد احتيالي

## معلومات شخصية

**الاسم الكامل:** ${responses.full_name || 'غير محدد'}
**الجنسية:** ${responses.nationality || 'غير محدد'}
**الهوية القطرية:** ${responses.qatar_id || 'غير محدد'}
**البريد الإلكتروني:** ${responses.email || 'غير محدد'}
**رقم الهاتف:** ${responses.phone_number || 'غير محدد'}

## تفاصيل الحادثة

**تاريخ الحادثة:** ${responses.incident_date || 'غير محدد'}
**نوع الحساب المستهدف:** ${responses.targeted_account || 'غير محدد'}
**الكيان/الموقع الإلكتروني المشتبه به:** ${responses.suspect_entity || 'غير محدد'}

## وصف الحادثة

${responses.incident_description || 'غير مُقدم'}

## الإجراءات المتخذة

- تم النقر على رابط مريب: ${responses.clicked_link === 'نعم' ? '☑ نعم' : '☐ لا'}
- تم إدخال المعلومات الشخصية: ${responses.entered_info === 'نعم' ? '☑ نعم' : '☐ لا'}
- تم استلام جهة اتصال رسمية: ${responses.official_contact === 'نعم' ? '☑ نعم' : '☐ لا'}
- تم ملاحظة نشاط غير مصرح به: ${responses.unauthorized_activity === 'نعم' ? '☑ نعم': '☐ لا'}

- تم الإبلاغ عنه للسلطات: ${responses.reported_to_authorities === 'نعم' ? '☑ نعم' : '☐ لا'}

## الإجراءات المطلوبة

أطلب رسميًا اتخاذ الإجراءات التالية:

1. التحقيق في محاولة التصيد الاحتيالي وتحديد هوية الجناة
2. منع أي أنشطة احتيالية أخرى باستخدام أساليب مماثلة
3. تعويض أي خسائر مالية متكبدة (إن وجدت)
4. اتخاذ إجراءات قانونية ضد الأطراف المسؤولة

## إقرار

أُقر بأن المعلومات الواردة في هذه الشكوى صحيحة ودقيقة على حد علمي.

---

**توقيع المُشتكي:** _________________________

**التاريخ:** ${currentDate}

---

*تم إنشاء هذه الشكوى باستخدام مساعد الفنار القانوني*
`;
}



module.exports = {
    generateComplaintPDF
};