import { type ScanResult, type ScanRule } from "./types.js";
export declare class EnvScanner {
    private rules;
    constructor(customRules?: ScanRule[]);
    /**
     * Scan a .env file content for security issues
     */
    scanContent(content: string, filePath?: string): ScanResult;
    /**
     * Apply a single rule to a key-value pair
     */
    private applyRule;
    /**
     * Generate quick fix suggestions
     */
    private generateQuickFix;
    /**
     * Create scan result with statistics
     */
    private createScanResult;
    /**
     * Add custom rule
     */
    addRule(rule: ScanRule): void;
    /**
     * Get all rules
     */
    getRules(): ScanRule[];
    /**
     * Enable/disable a rule
     */
    toggleRule(ruleId: string, enabled: boolean): void;
}
//# sourceMappingURL=scanner.d.ts.map