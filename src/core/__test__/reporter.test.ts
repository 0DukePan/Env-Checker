// Tests for report generation

import { Reporter } from "../reporter.js"
import { Severity } from "../types.js"
import type { ScanResult } from "../types.js"

describe("Reporter", () => {
  const mockScanResults: ScanResult[] = [
    {
      filePath: ".env",
      findings: [
        {
          line: 1,
          column: 1,
          key: "DB_PASSWORD",
          value: "123456",
          severity: Severity.CRITICAL,
          ruleId: "password-hardcoded",
          message: "Hardcoded Password: Detects hardcoded passwords in environment variables",
          suggestion: "Remove hardcoded password and use secure environment variable injection",
        },
        {
          line: 2,
          column: 1,
          key: "DEBUG",
          value: "true",
          severity: Severity.WARNING,
          ruleId: "debug-enabled",
          message: "Debug Mode Enabled: Debug mode should not be enabled in production",
          suggestion: "Set DEBUG=false or remove for production environments",
        },
      ],
      scannedAt: new Date("2024-01-01T00:00:00Z"),
      totalLines: 2,
      criticalCount: 1,
      warningCount: 1,
      infoCount: 0,
    },
  ]

  describe("generateJsonReport", () => {
    it("should generate valid JSON report", () => {
      const jsonReport = Reporter.generateJsonReport(mockScanResults)

      expect(() => JSON.parse(jsonReport)).not.toThrow()

      const parsed = JSON.parse(jsonReport)
      expect(parsed.timestamp).toBeDefined()
      expect(parsed.summary).toBeDefined()
      expect(parsed.results).toEqual(mockScanResults)
    })

    it("should include correct summary statistics", () => {
      const jsonReport = Reporter.generateJsonReport(mockScanResults)
      const parsed = JSON.parse(jsonReport)

      expect(parsed.summary.filesScanned).toBe(1)
      expect(parsed.summary.totalFindings).toBe(2)
      expect(parsed.summary.critical).toBe(1)
      expect(parsed.summary.warnings).toBe(1)
      expect(parsed.summary.info).toBe(0)
    })

    it("should handle empty results", () => {
      const jsonReport = Reporter.generateJsonReport([])
      const parsed = JSON.parse(jsonReport)

      expect(parsed.summary.filesScanned).toBe(0)
      expect(parsed.summary.totalFindings).toBe(0)
      expect(parsed.results).toEqual([])
    })
  })

  describe("generateHtmlReport", () => {
    it("should generate valid HTML report", () => {
      const htmlReport = Reporter.generateHtmlReport(mockScanResults)

      expect(htmlReport).toContain("<!DOCTYPE html>")
      expect(htmlReport).toContain("<html>")
      expect(htmlReport).toContain("</html>")
      expect(htmlReport).toContain("Environment Security Report")
    })

    it("should include findings in HTML", () => {
      const htmlReport = Reporter.generateHtmlReport(mockScanResults)

      expect(htmlReport).toContain("DB_PASSWORD")
      expect(htmlReport).toContain("Hardcoded Password")
      expect(htmlReport).toContain("critical")
      expect(htmlReport).toContain("warning")
    })

    it("should include summary statistics in HTML", () => {
      const htmlReport = Reporter.generateHtmlReport(mockScanResults)

      expect(htmlReport).toContain("Files scanned: 1")
      expect(htmlReport).toContain("Total findings: 2")
      expect(htmlReport).toContain("Critical: 1")
      expect(htmlReport).toContain("Warnings: 1")
    })
  })

  describe("generateConsoleReport", () => {
    it("should generate console-friendly report", () => {
      const consoleReport = Reporter.generateConsoleReport(mockScanResults)

      expect(consoleReport).toContain("ENV-CHECKER SECURITY REPORT")
      expect(consoleReport).toContain("Files scanned: 1")
      expect(consoleReport).toContain("Total findings: 2")
      expect(consoleReport).toContain(".env")
    })

    it("should include severity icons", () => {
      const consoleReport = Reporter.generateConsoleReport(mockScanResults)

      expect(consoleReport).toContain("🚨") // Critical icon
      expect(consoleReport).toContain("⚠️") // Warning icon
    })

    it("should handle empty results gracefully", () => {
      const consoleReport = Reporter.generateConsoleReport([])

      expect(consoleReport).toContain("Files scanned: 0")
      expect(consoleReport).toContain("Total findings: 0")
    })
  })
})
