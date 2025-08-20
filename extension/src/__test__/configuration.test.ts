// Tests for configuration management

import { Severity } from "../../../src/core/types";
import {ConfigurationManager} from "../configuration"
import { jest } from "@jest/globals"
// Mock VS Code workspace configuration
const mockConfig = {
  get: jest.fn(),
  update: jest.fn(),
}

const mockWorkspace = {
  getConfiguration: jest.fn(() => mockConfig),
  onDidChangeConfiguration: jest.fn(),
  workspaceFolders: [{ uri: { fsPath: "/test/workspace" } }],
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
  },
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidCreate: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn(),
  })),
}

jest.mock("vscode", () => ({
  workspace: mockWorkspace,
  ConfigurationTarget: {
    Workspace: 2,
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path })),
  },
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
  },
}))

describe("ConfigurationManager", () => {
  let configManager: ConfigurationManager

  beforeEach(() => {
    jest.clearAllMocks()
    configManager = new ConfigurationManager()
  })

  afterEach(() => {
    configManager.dispose()
  })

  describe("getConfig", () => {
    it("should return default configuration", () => {
      mockConfig.get.mockImplementation((key, defaultValue) => defaultValue)

      const config = configManager.getConfig()

      expect(config.enableRealTimeScanning).toBe(true)
      expect(config.scanOnSave).toBe(true)
      expect(config.showInlineErrors).toBe(true)
      expect(config.enabledSeverities).toEqual(["critical", "warning", "info"])
      expect(config.notificationLevel).toBe("critical")
    })

    it("should return custom configuration values", () => {
      mockConfig.get.mockImplementation((key) => {
        const customValues: Record<string, any> = {
          enableRealTimeScanning: false,
          scanOnSave: false,
          notificationLevel: "warning",
          maxFileSizeKB: 2048,
        }
        return customValues[key as any] ?? (key === "enabledSeverities" ? ["critical"] : undefined)
      })

      const config = configManager.getConfig()

      expect(config.enableRealTimeScanning).toBe(false)
      expect(config.scanOnSave).toBe(false)
      expect(config.notificationLevel).toBe("warning")
      expect(config.maxFileSizeKB).toBe(2048)
      expect(config.enabledSeverities).toEqual(["critical"])
    })
  })

  describe("updateConfig", () => {
    it("should update configuration value", async () => {
      await configManager.updateConfig("enableRealTimeScanning", false)

      expect(mockConfig.update).toHaveBeenCalledWith(
        "enableRealTimeScanning",
        false,
        2, // ConfigurationTarget.Workspace
      )
    })
  })

  describe("shouldShowSeverity", () => {
    it("should return true for enabled severities", () => {
      mockConfig.get.mockImplementation((key) => (key === "enabledSeverities" ? ["critical", "warning"] : undefined))

      expect(configManager.shouldShowSeverity(Severity.CRITICAL)).toBe(true)
      expect(configManager.shouldShowSeverity(Severity.WARNING)).toBe(true)
      expect(configManager.shouldShowSeverity(Severity.INFO)).toBe(false)
    })
  })

  describe("shouldNotify", () => {
    it("should return false when notification level is none", () => {
      mockConfig.get.mockImplementation((key) => (key === "notificationLevel" ? "none" : undefined))

      expect(configManager.shouldNotify(Severity.CRITICAL)).toBe(false)
      expect(configManager.shouldNotify(Severity.WARNING)).toBe(false)
      expect(configManager.shouldNotify(Severity.INFO)).toBe(false)
    })

    it("should respect notification level hierarchy", () => {
      mockConfig.get.mockImplementation((key) => (key === "notificationLevel" ? "warning" : undefined))

      expect(configManager.shouldNotify(Severity.CRITICAL)).toBe(true)
      expect(configManager.shouldNotify(Severity.WARNING)).toBe(true)
      expect(configManager.shouldNotify(Severity.INFO)).toBe(false)
    })
  })

  describe("validateSettings", () => {
    it("should validate correct settings", () => {
      mockConfig.get.mockImplementation((key, defaultValue) => {
        const validSettings: Record<string, any> = {
          enabledSeverities: ["critical", "warning", "info"],
          notificationLevel: "critical",
          maxFileSizeKB: 1024,
          scanTimeout: 5000,
          customRulesPath: "",
        }
        return validSettings[key as any] ?? defaultValue
      })

      const validation = configManager.validateSettings()

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it("should detect invalid severity levels", () => {
      mockConfig.get.mockImplementation((key, defaultValue) => {
        if (key === "enabledSeverities") return ["critical", "invalid"]
        if (key === "notificationLevel") return "invalid"
        return defaultValue
      })

      const validation = configManager.validateSettings()

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain("Invalid severity level: invalid")
      expect(validation.errors).toContain("Invalid notification level: invalid")
    })

    it("should detect invalid file size limits", () => {
      mockConfig.get.mockImplementation((key, defaultValue) => {
        if (key === "maxFileSizeKB") return 0
        return defaultValue
      })

      const validation = configManager.validateSettings()

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain("Max file size must be between 1KB and 10MB")
    })
  })

  describe("resetToDefaults", () => {
    it("should reset all settings to default values", async () => {
      await configManager.resetToDefaults()

      expect(mockConfig.update).toHaveBeenCalledTimes(12) // Number of settings
      expect(mockConfig.update).toHaveBeenCalledWith("enableRealTimeScanning", true, 2)
      expect(mockConfig.update).toHaveBeenCalledWith("scanOnSave", true, 2)
      expect(mockConfig.update).toHaveBeenCalledWith("notificationLevel", "critical", 2)
    })
  })
})
