// Code actions provider for quick fixes

import * as vscode from "vscode"
import { type EnvScanner, type EnvFinding, Severity } from "../../src/core/index.js"

export class CodeActionProvider implements vscode.CodeActionProvider {
  private scanner: EnvScanner

  constructor(scanner: EnvScanner) {
    this.scanner = scanner
  }

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
    vscode.CodeActionKind.RefactorRewrite,
  ]

  /**
   * Provide code actions for the given document and range
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = []

    // Get diagnostics for the current range
    const diagnostics = context.diagnostics.filter((diagnostic) => diagnostic.source === "env-checker")

    for (const diagnostic of diagnostics) {
      const line = document.lineAt(diagnostic.range.start.line)
      const finding = this.parseDiagnosticToFinding(diagnostic, line)

      if (finding) {
        actions.push(...this.createQuickFixes(document, diagnostic, finding))
        actions.push(...this.createRefactorActions(document, diagnostic, finding))
      }
    }

    // Add general actions if no specific diagnostics
    if (diagnostics.length === 0 && this.isEnvironmentFile(document.fileName)) {
      actions.push(...this.createGeneralActions(document, range))
    }

    return actions
  }

  /**
   * Create quick fix actions for a specific finding
   */
  private createQuickFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []

    switch (finding.severity) {
      case Severity.CRITICAL:
        actions.push(
          this.createCommentOutAction(document, diagnostic, finding),
          this.createMaskValueAction(document, diagnostic, finding),
          this.createRemoveLineAction(document, diagnostic, finding),
        )
        break

      case Severity.WARNING:
        actions.push(
          this.createMaskValueAction(document, diagnostic, finding),
          this.createCommentOutAction(document, diagnostic, finding),
        )
        const warningFixAction = this.createFixValueAction(document, diagnostic, finding)
        if (warningFixAction) {
          actions.push(warningFixAction)
        }
        break

      case Severity.INFO:
        const infoFixAction = this.createFixValueAction(document, diagnostic, finding)
        if (infoFixAction) {
          actions.push(infoFixAction)
        }
        actions.push(this.createAddCommentAction(document, diagnostic, finding))
        break
    }

    return actions
  }

  /**
   * Create refactor actions for improving security
   */
  private createRefactorActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []

    // Convert to environment variable reference
    if (finding.ruleId.includes("hardcoded") || finding.ruleId.includes("exposed")) {
      actions.push(this.createEnvReferenceAction(document, diagnostic, finding))
    }

    // Add security comment
    actions.push(this.createSecurityCommentAction(document, diagnostic, finding))

    // Create .env.example entry
    if (finding.severity === Severity.CRITICAL) {
      actions.push(this.createExampleEntryAction(document, diagnostic, finding))
    }

    return actions.filter((action) => action !== null) as vscode.CodeAction[]
  }

  /**
   * Create general actions for environment files
   */
  private createGeneralActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = []

    // Scan entire file action
    const scanAction = new vscode.CodeAction("Scan entire file for security issues", vscode.CodeActionKind.Source)
    scanAction.command = {
      command: "envChecker.scanFile",
      title: "Scan File",
    }
    actions.push(scanAction)

    // Add security header action
    if (document.lineCount === 0 || !document.lineAt(0).text.includes("SECURITY")) {
      actions.push(this.createAddSecurityHeaderAction(document))
    }

    return actions
  }

  /**
   * Comment out the problematic line
   */
  private createCommentOutAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Comment out line", vscode.CodeActionKind.QuickFix)
    action.edit = new vscode.WorkspaceEdit()

    const line = document.lineAt(diagnostic.range.start.line)
    const newText = `# ${line.text} # SECURITY: ${finding.suggestion}`

    action.edit.replace(document.uri, line.range, newText)
    action.diagnostics = [diagnostic]
    action.isPreferred = finding.severity === Severity.CRITICAL

    return action
  }

  /**
   * Mask the sensitive value
   */
  private createMaskValueAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Mask sensitive value", vscode.CodeActionKind.QuickFix)
    action.edit = new vscode.WorkspaceEdit()

    const line = document.lineAt(diagnostic.range.start.line)
    const newText = line.text.replace(/=.*$/, "=***MASKED***")

    action.edit.replace(document.uri, line.range, newText)
    action.diagnostics = [diagnostic]

    return action
  }

  /**
   * Remove the entire line
   */
  private createRemoveLineAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Remove line", vscode.CodeActionKind.QuickFix)
    action.edit = new vscode.WorkspaceEdit()

    const line = document.lineAt(diagnostic.range.start.line)
    const range = line.rangeIncludingLineBreak

    action.edit.delete(document.uri, range)
    action.diagnostics = [diagnostic]

    return action
  }

  /**
   * Fix the value based on the rule
   */
  private createFixValueAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction | null {
    const line = document.lineAt(diagnostic.range.start.line)
    let newText: string | null = null

    // Specific fixes based on rule ID
    switch (finding.ruleId) {
      case "debug-enabled":
        newText = line.text.replace(/=\s*(true|1|on|yes)/i, "=false")
        break

      case "localhost-url":
        newText = line.text.replace(/localhost/g, "your-domain.com")
        break

      case "weak-password":
        newText = line.text.replace(/=.*$/, "=${SECURE_PASSWORD}")
        break

      default:
        return null
    }

    if (!newText) return null

    const action = new vscode.CodeAction("Fix value", vscode.CodeActionKind.QuickFix)
    action.edit = new vscode.WorkspaceEdit()
    action.edit.replace(document.uri, line.range, newText)
    action.diagnostics = [diagnostic]

    return action
  }

  /**
   * Add a security comment
   */
  private createAddCommentAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Add security comment", vscode.CodeActionKind.QuickFix)
    action.edit = new vscode.WorkspaceEdit()

    const line = document.lineAt(diagnostic.range.start.line)
    const commentText = `# SECURITY: ${finding.suggestion}\n`
    const insertPosition = new vscode.Position(line.lineNumber, 0)

    action.edit.insert(document.uri, insertPosition, commentText)
    action.diagnostics = [diagnostic]

    return action
  }

  /**
   * Convert to environment variable reference
   */
  private createEnvReferenceAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Convert to environment reference", vscode.CodeActionKind.RefactorRewrite)
    action.edit = new vscode.WorkspaceEdit()

    const line = document.lineAt(diagnostic.range.start.line)
    const envVarName = finding.key.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
    const newText = `${finding.key}=\${${envVarName}}`

    action.edit.replace(document.uri, line.range, newText)
    action.diagnostics = [diagnostic]

    return action
  }

  /**
   * Add security comment above the line
   */
  private createSecurityCommentAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Add security warning", vscode.CodeActionKind.Refactor)
    action.edit = new vscode.WorkspaceEdit()

    const line = document.lineAt(diagnostic.range.start.line)
    const commentText = `# WARNING: ${finding.message}\n# SUGGESTION: ${finding.suggestion}\n`
    const insertPosition = new vscode.Position(line.lineNumber, 0)

    action.edit.insert(document.uri, insertPosition, commentText)
    action.diagnostics = [diagnostic]

    return action
  }

  /**
   * Create .env.example entry
   */
  private createExampleEntryAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    finding: EnvFinding,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction("Create .env.example entry", vscode.CodeActionKind.Refactor)

    action.command = {
      command: "envChecker.createExampleEntry",
      title: "Create Example Entry",
      arguments: [finding.key, finding.suggestion],
    }

    action.diagnostics = [diagnostic]
    return action
  }

  /**
   * Add security header to file
   */
  private createAddSecurityHeaderAction(document: vscode.TextDocument): vscode.CodeAction {
    const action = new vscode.CodeAction("Add security header", vscode.CodeActionKind.Source)
    action.edit = new vscode.WorkspaceEdit()

    const headerText = `# SECURITY NOTICE: This file contains sensitive information
# - Never commit this file to version control
# - Use .env.example for sharing configuration templates
# - Rotate secrets regularly
# - Use strong, unique values for all credentials

`

    action.edit.insert(document.uri, new vscode.Position(0, 0), headerText)
    return action
  }

  /**
   * Parse diagnostic back to finding (simplified)
   */
  private parseDiagnosticToFinding(diagnostic: vscode.Diagnostic, line: vscode.TextLine): EnvFinding | null {
    const match = line.text.match(/^([^=]+)=(.*)$/)
    if (!match) return null

    const [, key, value] = match
    const severity = this.diagnosticSeverityToSeverity(diagnostic.severity)

    return {
      line: line.lineNumber + 1,
      column: 1,
      key: key.trim(),
      value: value.trim(),
      severity,
      ruleId: diagnostic.code as string,
      message: diagnostic.message,
      suggestion: "Apply security best practices",
    }
  }

  /**
   * Convert VS Code diagnostic severity to our severity
   */
  private diagnosticSeverityToSeverity(severity: vscode.DiagnosticSeverity): Severity {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return Severity.CRITICAL
      case vscode.DiagnosticSeverity.Warning:
        return Severity.WARNING
      case vscode.DiagnosticSeverity.Information:
        return Severity.INFO
      default:
        return Severity.INFO
    }
  }

  /**
   * Check if file is an environment file
   */
  private isEnvironmentFile(fileName: string): boolean {
    return /\.env(\.|$)/.test(fileName) || fileName.endsWith(".env")
  }
}
