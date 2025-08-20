// Tests for VS Code diagnostics provider

import { DiagnosticsProvider } from "../diagnostics"
import type { EnvScanner } from "../../../src/core/scanner"
import type { ConfigurationManager } from "../configuration"
import { Severity } from "../../../src/core/types.js"
import { jest } from "@jest/globals"

// Mock VS Code API
const mockDiagnosticCollection = {
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  get: jest.fn(() => []),
}

jest.mock("vscode", () => ({
  languages: {
    createDiagnosticCollection: jest.fn(() => mockDiagnosticCollection),
  },
  Diagnostic: jest.fn(),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  Range: jest.fn(),
  DiagnosticRelatedInformation: jest.fn(),
  Location: jest.fn(),
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
}))

describe("DiagnosticsProvider", () => {
  let diagnosticsProvider: DiagnosticsProvider
  let mockScanner: jest.Mocked<EnvScanner>
  let mockConfigManager: jest.Mocked<ConfigurationManager>
  let mockDocument: any

  beforeEach(() => {
    mockScanner = {
      scanContent: jest.fn(),
      getRules: jest.fn(),
      toggleRule: jest.fn(),
      addRule: jest.fn(),
    } as any

    mockConfigManager = {
      getConfig: jest.fn(() => ({
        showInlineErrors: true,
        enabledSeverities: ["critical", "warning", "info"],
        notificationLevel: "critical",
      })),
      shouldShowSeverity: jest.fn(() => true),
      shouldNotify: jest.fn(() => true),
      onConfigurationChanged: jest.fn(),
    } as any

    mockDocument = global.createMockTextDocument("DB_PASSWORD=123456", ".env")

    diagnosticsProvider = new DiagnosticsProvider(mockScanner, mockConfigManager)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("updateDiagnostics", () => {
    it("should create diagnostics for scan results", async () => {
      const mockScanResult = {
        filePath: ".env",
        findings: [
          {
            line: 1,
            column: 1,
            key: "DB_PASSWORD",
            value: "123456",
            severity: Severity.CRITICAL,
            ruleId: "password-hardcoded",
            message: "Hardcoded password detected",
            suggestion: "Use environment variable injection",
          },
        ],
        scannedAt: new Date(),
        totalLines: 1,
        criticalCount: 1,
        warningCount: 0,
        infoCount: 0,
      }

      await diagnosticsProvider.updateDiagnostics(mockDocument, mockScanResult)

      expect(mockDiagnosticCollection.set).toHaveBeenCalledWith(mockDocument.uri, expect.any(Array))
    })

    it("should clear diagnostics when showInlineErrors is false", async () => {
      mockConfigManager.getConfig.mockReturnValue({
        showInlineErrors: false,
        enabledSeverities: ["critical", "warning", "info"],
        notificationLevel: "critical",
      } as any)

      const mockScanResult = {
        filePath: ".env",
        findings: [],
        scannedAt: new Date(),
        totalLines: 1,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
      }

      await diagnosticsProvider.updateDiagnostics(mockDocument, mockScanResult)

      expect(mockDiagnosticCollection.delete).toHaveBeenCalledWith(mockDocument.uri)
    })

    it("should filter findings by enabled severities", async () => {
      mockConfigManager.shouldShowSeverity.mockImplementation((severity) => severity === Severity.CRITICAL)

      const mockScanResult = {
        filePath: ".env",
        findings: [
          {
            line: 1,
            column: 1,
            key: "DB_PASSWORD",
            value: "123456",
            severity: Severity.CRITICAL,
            ruleId: "password-hardcoded",
            message: "Critical issue",
            suggestion: "Fix this",
          },
          {
            line: 2,
            column: 1,
            key: "DEBUG",
            value: "true",
            severity: Severity.WARNING,
            ruleId: "debug-enabled",
            message: "Warning issue",
            suggestion: "Fix this too",
          },
        ],
        scannedAt: new Date(),
        totalLines: 2,
        criticalCount: 1,
        warningCount: 1,
        infoCount: 0,
      }

      await diagnosticsProvider.updateDiagnostics(mockDocument, mockScanResult)

      // Should only process critical findings
      expect(mockConfigManager.shouldShowSeverity).toHaveBeenCalledWith(Severity.CRITICAL)
      expect(mockConfigManager.shouldShowSeverity).toHaveBeenCalledWith(Severity.WARNING)
    })
  })

  describe("clearAll", () => {
    it("should clear all diagnostics", () => {
      diagnosticsProvider.clearAll()
      expect(mockDiagnosticCollection.clear).toHaveBeenCalled()
    })
  })

  describe("dispose", () => {
    it("should dispose diagnostic collection", () => {
      diagnosticsProvider.dispose()
      expect(mockDiagnosticCollection.dispose).toHaveBeenCalled()
    })
  })
})
