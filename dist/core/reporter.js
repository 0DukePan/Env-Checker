// Report generation for scan results
import { Severity } from "./types.js";
export class Reporter {
    /**
     * Generate JSON report
     */
    static generateJsonReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(results),
            results,
        };
        return JSON.stringify(report, null, 2);
    }
    /**
     * Generate HTML report
     */
    static generateHtmlReport(results) {
        const summary = this.generateSummary(results);
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Env-Checker Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .critical { color: #d32f2f; font-weight: bold; }
        .warning { color: #f57c00; font-weight: bold; }
        .info { color: #1976d2; }
        .finding { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .finding.critical { border-left-color: #d32f2f; }
        .finding.warning { border-left-color: #f57c00; }
        .finding.info { border-left-color: #1976d2; }
        .suggestion { font-style: italic; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>Environment Security Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Files scanned: ${summary.filesScanned}</p>
        <p>Total findings: ${summary.totalFindings}</p>
        <p class="critical">Critical: ${summary.critical}</p>
        <p class="warning">Warnings: ${summary.warnings}</p>
        <p class="info">Info: ${summary.info}</p>
    </div>
    
    ${results.map((result) => this.generateFileSection(result)).join("")}
</body>
</html>`;
    }
    /**
     * Generate console-friendly report
     */
    static generateConsoleReport(results) {
        const summary = this.generateSummary(results);
        let output = "\n=== ENV-CHECKER SECURITY REPORT ===\n\n";
        output += `Files scanned: ${summary.filesScanned}\n`;
        output += `Total findings: ${summary.totalFindings}\n`;
        output += `Critical: ${summary.critical} | Warnings: ${summary.warnings} | Info: ${summary.info}\n\n`;
        results.forEach((result) => {
            if (result.findings.length === 0)
                return;
            output += `📄 ${result.filePath}\n`;
            output += `${"=".repeat(result.filePath.length + 2)}\n`;
            result.findings.forEach((finding) => {
                const icon = this.getSeverityIcon(finding.severity);
                output += `${icon} Line ${finding.line}: ${finding.message}\n`;
                output += `   Key: ${finding.key}\n`;
                output += `   💡 ${finding.suggestion}\n\n`;
            });
        });
        return output;
    }
    static generateSummary(results) {
        const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);
        const critical = results.reduce((sum, r) => sum + r.criticalCount, 0);
        const warnings = results.reduce((sum, r) => sum + r.warningCount, 0);
        const info = results.reduce((sum, r) => sum + r.infoCount, 0);
        return {
            filesScanned: results.length,
            totalFindings,
            critical,
            warnings,
            info,
        };
    }
    static generateFileSection(result) {
        if (result.findings.length === 0)
            return "";
        return `
    <h2>${result.filePath}</h2>
    ${result.findings
            .map((finding) => `
        <div class="finding ${finding.severity}">
            <strong>Line ${finding.line}:</strong> ${finding.message}<br>
            <strong>Key:</strong> ${finding.key}<br>
            <div class="suggestion">💡 ${finding.suggestion}</div>
        </div>
    `)
            .join("")}`;
    }
    static getSeverityIcon(severity) {
        switch (severity) {
            case Severity.CRITICAL:
                return "🚨";
            case Severity.WARNING:
                return "⚠️";
            case Severity.INFO:
                return "ℹ️";
            default:
                return "•";
        }
    }
}
//# sourceMappingURL=reporter.js.map