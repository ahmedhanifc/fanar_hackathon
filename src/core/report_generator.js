function generatePhishingReport(caseData) {
    const responses = caseData.responses;
    
    return `
# إدارة الجرائم الإلكترونية

## نموذج شكوى – حالة تصيد إلكتروني (Phishing)

### البيانات الأولية:

**الاسم الكامل:** ${responses.full_name || 'غير محدد'}

**الجنسية:** ${responses.nationality || 'غير محدد'}

**الرقم الشخصي:** ${responses.qatar_id || 'غير محدد'}

**البريد الإلكتروني المستخدم:** ${responses.email || 'غير محدد'}

**رقم الهاتف:** ${responses.phone_number || 'غير محدد'}

**تاريخ الحادثة:** ${responses.incident_date || 'غير محدد'}

**نوع الحساب المستهدف:** ${responses.targeted_account || 'غير محدد'}

---

### أسئلة تمهيدية:

**هل قمت بالضغط على رابط مشبوه أرسل إليك؟**
${responses.clicked_link === 'Yes' ? '☑ نعم' : '☑ لا'}

**هل قمت بإدخال معلوماتك الشخصية أو البنكية بعد الضغط على الرابط؟**
${responses.entered_info === 'Yes' ? '☑ نعم' : '☑ لا'}

**هل تلقيت مكالمة أو رسالة تدّعي أنها من جهة رسمية (بنك، وزارة، شركة) قبل أو بعد الرسالة المشبوهة؟**
${responses.official_contact === 'Yes' ? '☑ نعم' : '☑ لا'}

**هل لاحظت أي عمليات غير مصرح بها بعد الحادثة (تحويلات مالية، سحب، تغيّر في الحساب)؟**
${responses.unauthorized_activity === 'Yes' ? '☑ نعم' : '☑ لا'}

**هل قمت بإبلاغ الجهة الرسمية المعنية (البنك/الشركة/الجهة الحكومية)؟**
${responses.reported_to_authorities === 'Yes' ? '☑ نعم' : '☑ لا'}

**هل سبق وأن وقعت ضحية لمحاولة تصيد إلكتروني أخرى في الماضي؟**
${responses.previous_phishing === 'Yes' ? '☑ نعم' : '☑ لا'}

**هل لديك مستندات أو صور تدعم شكواك؟**
${responses.evidence_available === 'Yes' ? '☑ نعم' : '☑ لا'}

---

### تفاصيل الشكوى:

**الجهة المحتملة أو عنوان الموقع/الحساب المتسبب:**
${responses.suspect_entity || 'غير محدد'}

**وصف الحادثة:**
${responses.incident_description || 'غير محدد'}

---

### طلبات مقدم الشكوى:
- إيقاف أي نشاط غير مشروع على حسابي
- التحقيق في الجهة المسؤولة عن التصيد واتخاذ الإجراءات القانونية
- استرداد المبالغ المسروقة (إن وجدت) أو المساعدة في ذلك

---

### مقدم الشكوى:

**التوقيع:** ________________________

**التاريخ:** ${new Date().toLocaleDateString('ar-QA')}

---

*تم إنشاء هذا التقرير بواسطة مساعد فنار القانوني*
`;
}

function generateGeneralReport(caseData) {
    const responses = caseData.responses;
    
    return `
# تقرير قانوني عام

## تفاصيل القضية

**وصف القضية:** ${responses.case_description || 'غير محدد'}

**تاريخ الحادثة:** ${responses.incident_date || 'غير محدد'}

**الأطراف المتورطة:** ${responses.parties_involved || 'غير محدد'}

**التأثير المالي:** ${responses.financial_impact || 'غير محدد'}

${responses.loss_amount ? `**المبلغ المتضرر:** ${responses.loss_amount} ريال قطري` : ''}

**الأدلة المتاحة:** ${responses.evidence_available || 'غير محدد'}

**الإجراءات السابقة:** ${responses.previous_action || 'لا توجد'}

---

**التاريخ:** ${new Date().toLocaleDateString('ar-QA')}

*تم إنشاء هذا التقرير بواسطة مساعد فنار القانوني*
`;
}

module.exports = {
    generatePhishingReport,
    generateGeneralReport
};