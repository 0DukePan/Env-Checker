// Main scanning engine for env-checker
import { Severity } from "./types.js";
import { DEFAULT_RULES } from "./rules.js";
export class EnvScanner {
    rules;
    constructor(customRules) {
        this.rules = customRules || DEFAULT_RULES;
    }
    /**
     * Scan a .env file content for security issues
     */
    scanContent(content, filePath = ".env") {
        const lines = content.split("\n");
        const findings = [];
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith("#")) {
                return;
            }
            // Parse key=value pairs
            const match = trimmedLine.match(/^([^=]+)=(.*)$/);
            if (!match) {
                return;
            }
            const [, key, value] = match;
            const cleanKey = key.trim();
            const cleanValue = value.trim();
            // Apply each rule
            this.rules.forEach((rule) => {
                if (!rule.enabled)
                    return;
                const finding = this.applyRule(rule, cleanKey, cleanValue, lineNumber, trimmedLine);
                if (finding) {
                    findings.push(finding);
                }
            });
        });
        return this.createScanResult(filePath, findings, lines.length);
    }
    /**
     * Apply a single rule to a key-value pair
     */
    applyRule(rule, key, value, lineNumber, fullLine) {
        let matches = false;
        // Check if the full line matches the pattern
        if (rule.pattern && rule.pattern.test(fullLine)) {
            matches = true;
        }
        // Check key pattern if specified
        if (rule.keyPattern && !rule.keyPattern.test(key)) {
            matches = false;
        }
        // Check value pattern if specified
        if (rule.valuePattern && !rule.valuePattern.test(value)) {
            matches = false;
        }
        if (!matches) {
            return null;
        }
        return {
            line: lineNumber,
            column: 1,
            key,
            value,
            severity: rule.severity,
            ruleId: rule.id,
            message: `${rule.name}: ${rule.description}`,
            suggestion: rule.suggestion,
            quickFix: this.generateQuickFix(rule, key, value, fullLine),
        };
    }
    /**
     * Generate quick fix suggestions
     */
    generateQuickFix(rule, key, value, fullLine) {
        switch (rule.severity) {
            case Severity.CRITICAL:
                return {
                    type: "comment",
                    replacement: `# ${fullLine} # SECURITY: ${rule.suggestion}`,
                };
            case Severity.WARNING:
                return {
                    type: "mask",
                    replacement: `${key}=***MASKED***`,
                };
            default:
                return {
                    type: "comment",
                    replacement: `# ${fullLine} # INFO: ${rule.suggestion}`,
                };
        }
    }
    /**
     * Create scan result with statistics
     */
    createScanResult(filePath, findings, totalLines) {
        const criticalCount = findings.filter((f) => f.severity === Severity.CRITICAL).length;
        const warningCount = findings.filter((f) => f.severity === Severity.WARNING).length;
        const infoCount = findings.filter((f) => f.severity === Severity.INFO).length;
        return {
            filePath,
            findings,
            scannedAt: new Date(),
            totalLines,
            criticalCount,
            warningCount,
            infoCount,
        };
    }
    /**
     * Add custom rule
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Get all rules
     */
    getRules() {
        return [...this.rules];
    }
    /**
     * Enable/disable a rule
     */
    toggleRule(ruleId, enabled) {
        const rule = this.rules.find((r) => r.id === ruleId);
        if (rule) {
            rule.enabled = enabled;
        }
    }
}
//# sourceMappingURL=scanner.js.map