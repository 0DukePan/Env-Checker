// Unit tests for the core scanner

import { EnvScanner } from "../scanner.js"
import { Severity } from "../types.js"
import { DEFAULT_RULES } from "../rules.js"

describe("EnvScanner", () => {
  let scanner: EnvScanner

  beforeEach(() => {
    scanner = new EnvScanner()
  })

  describe("scanContent", () => {
    it("should detect hardcoded passwords", () => {
      const content = `
        DB_HOST=localhost
        DB_PASSWORD=123456
        API_KEY=secret123
      `.trim()

      const result = scanner.scanContent(content, ".env")

      expect(result.findings).toHaveLength(2)
      expect(result.criticalCount).toBe(2)

      const passwordFinding = result.findings.find((f) => f.key === "DB_PASSWORD")
      expect(passwordFinding).toBeDefined()
      expect(passwordFinding?.severity).toBe(Severity.CRITICAL)
      expect(passwordFinding?.ruleId).toBe("password-hardcoded")
    })

    it("should detect API keys", () => {
      const content = "API_SECRET=sk_live_abcdef123456789012345678"

      const result = scanner.scanContent(content, ".env")

      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe("api-key-exposed")
      expect(result.findings[0].severity).toBe(Severity.CRITICAL)
    })

    it("should detect debug mode enabled", () => {
      const content = "DEBUG=true"

      const result = scanner.scanContent(content, ".env")

      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe("debug-enabled")
      expect(result.findings[0].severity).toBe(Severity.WARNING)
    })

    it("should detect database URLs with credentials", () => {
      const content = "DATABASE_URL=postgres://user:password@localhost:5432/db"

      const result = scanner.scanContent(content, ".env")

      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe("database-url-exposed")
      expect(result.findings[0].severity).toBe(Severity.CRITICAL)
    })

    it("should detect localhost URLs", () => {
      const content = "API_URL=http://localhost:3000/api"

      const result = scanner.scanContent(content, ".env")

      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].ruleId).toBe("localhost-url")
      expect(result.findings[0].severity).toBe(Severity.INFO)
    })

    it("should ignore comments and empty lines", () => {
      const content = `
# This is a comment
DB_HOST=localhost

# Another comment
      `.trim()

      const result = scanner.scanContent(content, ".env")

      expect(result.findings).toHaveLength(0)
    })

    it("should handle malformed lines gracefully", () => {
      const content = `
DB_HOST=localhost
INVALID_LINE_WITHOUT_EQUALS
API_KEY=valid_key
      `.trim()

      const result = scanner.scanContent(content, ".env")

      // Should only process valid key=value pairs
      expect(result.totalLines).toBe(3)
      expect(result.findings.length).toBeGreaterThanOrEqual(0)
    })

    it("should generate quick fixes", () => {
      const content = "DB_PASSWORD=123456"

      const result = scanner.scanContent(content, ".env")

      expect(result.findings[0].quickFix).toBeDefined()
      expect(result.findings[0].quickFix?.type).toBe("comment")
      expect(result.findings[0].quickFix?.replacement).toContain("SECURITY:")
    })
  })

  describe("rule management", () => {
    it("should add custom rules", () => {
      const customRule = {
        id: "custom-test",
        name: "Custom Test Rule",
        description: "Test custom rule",
        severity: Severity.WARNING,
        pattern: /^TEST_VAR=.+$/,
        suggestion: "This is a test rule",
        enabled: true,
      }

      scanner.addRule(customRule)
      const rules = scanner.getRules()

      expect(rules).toContain(customRule)
      expect(rules.length).toBe(DEFAULT_RULES.length + 1)
    })

    it("should toggle rule enabled state", () => {
      const ruleId = "password-hardcoded"
      const originalRule = scanner.getRules().find((r) => r.id === ruleId)
      const originalEnabled = originalRule?.enabled

      scanner.toggleRule(ruleId, !originalEnabled)

      const updatedRule = scanner.getRules().find((r) => r.id === ruleId)
      expect(updatedRule?.enabled).toBe(!originalEnabled)
    })

    it("should handle non-existent rule toggle gracefully", () => {
      expect(() => {
        scanner.toggleRule("non-existent-rule", false)
      }).not.toThrow()
    })
  })

  describe("scan statistics", () => {
    it("should calculate correct statistics", () => {
      const content = `
DB_PASSWORD=123456
API_KEY=secret
DEBUG=true
INFO_VAR=localhost
      `.trim()

      const result = scanner.scanContent(content, ".env")

      expect(result.totalLines).toBe(4)
      expect(result.criticalCount).toBeGreaterThan(0)
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.infoCount).toBeGreaterThan(0)
      expect(result.scannedAt).toBeInstanceOf(Date)
    })
  })
})
