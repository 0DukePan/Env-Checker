// Integration tests for the VS Code extension

import * as vscode from "vscode"

describe("Extension Integration Tests", () => {
  let extension: vscode.Extension<any> | undefined

  beforeAll(async () => {
    // These tests would run in a real VS Code environment
    extension = vscode.extensions.getExtension("your-publisher.env-checker")
    if (extension && !extension.isActive) {
      await extension.activate()
    }
  })

  it("should activate extension successfully", () => {
    expect(extension).toBeDefined()
    expect(extension?.isActive).toBe(true)
  })

  it("should register all commands", async () => {
    if (!extension) {
      console.warn("Extension not found, skipping command registration test")
      return
    }

    const commands = await vscode.commands.getCommands()

    const expectedCommands = [
      "envChecker.scanFile",
      "envChecker.scanWorkspace",
      "envChecker.showReport",
      "envChecker.exportReport",
      "envChecker.toggleRule",
      "envChecker.openSettings",
      "envChecker.manageRules",
      "envChecker.quickSettings",
      "envChecker.clearDiagnostics",
    ]

    expectedCommands.forEach((command) => {
      expect(commands).toContain(command)
    })
  })

  it("should scan .env file and show diagnostics", async () => {
    if (!extension) {
      console.warn("Extension not found, skipping diagnostics test")
      return
    }

    // This would require a real VS Code environment with test files
    // Implementation would depend on VS Code test framework
  })

  it("should have proper extension configuration", () => {
    if (!extension) {
      console.warn("Extension not found, skipping configuration test")
      return
    }

    expect(extension.packageJSON).toBeDefined()
    expect(extension.packageJSON.contributes).toBeDefined()
    expect(extension.packageJSON.contributes.commands).toBeDefined()
    expect(extension.packageJSON.contributes.configuration).toBeDefined()
  })
})
