const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
    async generateReport(caseData, language = 'english') {
        const caseType = caseData.caseType;
        const template = await this.loadTemplate(caseType, language);
        return this.fillTemplate(template, caseData);
    }

    async loadTemplate(caseType, language) {
        const templatePath = path.join(__dirname, '../../templates/reports', `${caseType}.${language}.txt`);
        try {
            return await fs.readFile(templatePath, 'utf8');
        } catch (err) {
            throw new Error(`Template not found for case type: ${caseType}, language: ${language}`);
        }
    }

    fillTemplate(template, data) {
        let report = template;
        const replacements = this.extractReplacements(data);
        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(`\\{\\{${placeholder}\\}\}`, 'g');
            report = report.replace(regex, value || 'N/A');
        }
        return report;
    }

    extractReplacements(data) {
        const replacements = {};
        function flatten(obj, prefix = '') {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    flatten(value, `${prefix}${key}_`);
                } else {
                    replacements[`${prefix}${key}`] = value;
                }
            }
        }
        flatten(data);
        return replacements;
    }

    async saveReport(report, filename) {
        const reportsDir = path.join(__dirname, '../../reports');
        try {
            await fs.mkdir(reportsDir, { recursive: true });
        } catch (error) {}
        const filepath = path.join(reportsDir, filename);
        await fs.writeFile(filepath, report, 'utf8');
        return filepath;
    }

    generateFilename(caseData, language) {
        const timestamp = new Date().toISOString().split('T')[0];
        const caseType = caseData.caseType.replace('_', '-');
        const name = caseData.contactInfo?.name?.replace(/\s+/g, '-') || 'unknown';
        return `${caseType}-${name}-${timestamp}-${language}.txt`;
    }
}

module.exports = { ReportGenerator }; 