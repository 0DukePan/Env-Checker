// Tests for security rules

import { DEFAULT_RULES, getRuleById, getEnabledRules } from "../rules.js"
import { Severity } from "../types.js"

describe("Security Rules", () => {
  describe("DEFAULT_RULES", () => {
    it("should have all required rules", () => {
      const expectedRuleIds = [
        "password-hardcoded",
        "api-key-exposed",
        "database-url-exposed",
        "debug-enabled",
        "private-key-exposed",
        "weak-password",
        "localhost-url",
      ]

      expectedRuleIds.forEach((ruleId) => {
        const rule = DEFAULT_RULES.find((r) => r.id === ruleId)
        expect(rule).toBeDefined()
        expect(rule?.enabled).toBe(true)
      })
    })

    it("should have valid regex patterns", () => {
      DEFAULT_RULES.forEach((rule) => {
        expect(() => new RegExp(rule.pattern)).not.toThrow()

        if (rule.keyPattern) {
          expect(() => new RegExp(rule.keyPattern!)).not.toThrow()
        }

        if (rule.valuePattern) {
          expect(() => new RegExp(rule.valuePattern!)).not.toThrow()
        }
      })
    })

    it("should have valid severity levels", () => {
      const validSeverities = Object.values(Severity)

      DEFAULT_RULES.forEach((rule) => {
        expect(validSeverities).toContain(rule.severity)
      })
    })

    it("should have required fields", () => {
      DEFAULT_RULES.forEach((rule) => {
        expect(rule.id).toBeTruthy()
        expect(rule.name).toBeTruthy()
        expect(rule.description).toBeTruthy()
        expect(rule.pattern).toBeDefined()
        expect(rule.suggestion).toBeTruthy()
        expect(typeof rule.enabled).toBe("boolean")
      })
    })
  })

  describe("rule pattern matching", () => {
    it("should match password patterns correctly", () => {
      const passwordRule = getRuleById("password-hardcoded")
      expect(passwordRule).toBeDefined()

      const testCases = [
        { input: "DB_PASSWORD=secret123", shouldMatch: true },
        { input: "USER_PWD=mypassword", shouldMatch: true },
        { input: "ADMIN_PASS=admin123", shouldMatch: true },
        { input: "DB_HOST=localhost", shouldMatch: false },
        { input: "API_URL=https://api.com", shouldMatch: false },
      ]

      testCases.forEach(({ input, shouldMatch }) => {
        const matches = passwordRule!.pattern.test(input)
        expect(matches).toBe(shouldMatch)
      })
    })

    it("should match API key patterns correctly", () => {
      const apiKeyRule = getRuleById("api-key-exposed")
      expect(apiKeyRule).toBeDefined()

      const testCases = [
        { input: "API_KEY=sk_live_abcdef123456789012345678", shouldMatch: true },
        { input: "SECRET_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", shouldMatch: true },
        { input: "AUTH_SECRET=very_long_secret_key_here", shouldMatch: true },
        { input: "DB_HOST=localhost", shouldMatch: false },
        { input: "DEBUG=true", shouldMatch: false },
      ]

      testCases.forEach(({ input, shouldMatch }) => {
        const matches = apiKeyRule!.pattern.test(input)
        expect(matches).toBe(shouldMatch)
      })
    })

    it("should match debug patterns correctly", () => {
      const debugRule = getRuleById("debug-enabled")
      expect(debugRule).toBeDefined()

      const testCases = [
        { input: "DEBUG=true", shouldMatch: true },
        { input: "DEBUG=1", shouldMatch: true },
        { input: "DEBUG=on", shouldMatch: true },
        { input: "DEBUG=yes", shouldMatch: true },
        { input: "DEBUG=false", shouldMatch: false },
        { input: "DEBUG=0", shouldMatch: false },
        { input: "DEBUG=off", shouldMatch: false },
      ]

      testCases.forEach(({ input, shouldMatch }) => {
        const matches = debugRule!.pattern.test(input)
        expect(matches).toBe(shouldMatch)
      })
    })
  })

  describe("getRuleById", () => {
    it("should return correct rule by ID", () => {
      const rule = getRuleById("password-hardcoded")
      expect(rule).toBeDefined()
      expect(rule?.id).toBe("password-hardcoded")
      expect(rule?.name).toBe("Hardcoded Password")
    })

    it("should return undefined for non-existent rule", () => {
      const rule = getRuleById("non-existent-rule")
      expect(rule).toBeUndefined()
    })
  })

  describe("getEnabledRules", () => {
    it("should return only enabled rules", () => {
      const enabledRules = getEnabledRules()
      expect(enabledRules.length).toBeGreaterThan(0)
      enabledRules.forEach((rule) => {
        expect(rule.enabled).toBe(true)
      })
    })
  })
})
