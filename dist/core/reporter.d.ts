import { type ScanResult } from "./types.js";
export declare class Reporter {
    /**
     * Generate JSON report
     */
    static generateJsonReport(results: ScanResult[]): string;
    /**
     * Generate HTML report
     */
    static generateHtmlReport(results: ScanResult[]): string;
    /**
     * Generate console-friendly report
     */
    static generateConsoleReport(results: ScanResult[]): string;
    private static generateSummary;
    private static generateFileSection;
    private static getSeverityIcon;
}
//# sourceMappingURL=reporter.d.ts.map