import * as vscode from "vscode"

import EnvScanner from "../../src/core"
import { CodeActionProvider } from "./codeAction"
import { ConfigurationManager } from "./configuration"
import { DiagnosticsProvider } from "./diagnostics"
import { FileWatcherManager } from "./fileWatcher"
import { ReportWebviewProvider } from "./webview"
import { CommandManager } from "./commands"

let scanner: EnvScanner
let configManager: ConfigurationManager
let diagnosticsProvider: DiagnosticsProvider
let codeActionProvider: CodeActionProvider
let reportWebviewProvider: ReportWebviewProvider
let fileWatcherManager: FileWatcherManager

export function activate(context : vscode.ExtensionContext){
    console.log('Env Checker is now active!');
    try {
        //initialize core components
        scanner = new EnvScanner()
        configManager = new ConfigurationManager()
        diagnosticsProvider = new DiagnosticsProvider(scanner, configManager)
        codeActionProvider = new CodeActionProvider(scanner)
        reportWebviewProvider = new ReportWebviewProvider(context.extensionUri)
        fileWatcherManager = new FileWatcherManager(scanner, diagnosticsProvider, configManager)

        //initialize file watching system
        fileWatcherManager.initialize(context)

        //register providers 
        context.subscriptions.push(
            vscode.languages.registerCodeActionsProvider({ scheme: "file", pattern: "**/.env*" }, codeActionProvider, {
                providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds,
            }),
        )
            // Register webview provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(ReportWebviewProvider.viewType, reportWebviewProvider),
        )

        // Register all commands
        CommandManager.registerCommands(context)
        context.subscriptions.push(
            vscode.commands.registerCommand("envChecker.scanFile", async () => {
              try {
                const activeEditor = vscode.window.activeTextEditor
                if (!activeEditor) {
                  vscode.window.showWarningMessage("No active file to scan")
                  return
                }
      
                const document = activeEditor.document
                const content = document.getText()
                const result = scanner.scanContent(content, document.uri.fsPath)
      
                diagnosticsProvider.updateDiagnostics(document, result)
                reportWebviewProvider.updateResults([result])
      
                vscode.window.showInformationMessage(`Scan complete: ${result.findings.length} issues found`)
              } catch (error) {
                vscode.window.showErrorMessage(`Scan failed: ${error}`)
              }
        }),
        vscode.commands.registerCommand('envChecker.scanWorkspace' ,async() => {
            try {
                const workspaceFolders = vscode.workspace.workspaceFolders
                if(!workspaceFolders){
                    vscode.window.showErrorMessage('No workspace folder open')
                    return
                }
                vscode.window.withProgress({
                    location : vscode.ProgressLocation.Notification,
                    title : 'Scanning workspace for environment files...',
                    cancellable : false
                },
                async(progress) => {
                    const envFiles = await vscode.workspace.findFiles("**/.env*", "**/node_modules/**")
                    const results = []
                    for(let i = 0 ; i < envFiles.length ; i++){
                        const file = envFiles[i]
                        progress.report({
                            increment : 100 / envFiles.length,
                            message : `Scanning ${file.fsPath}...`
                        })
                        try {
                            const document = await vscode.workspace.openTextDocument(file)
                            const content = document.getText()
                            const result = scanner.scanContent(content, file.fsPath)
                            results.push(result)
                            diagnosticsProvider.updateDiagnostics(document , result)
                        } catch (error) {
                            console.error(`Error scanning ${file.fsPath}:`, error)
                        }
                    }
                    reportWebviewProvider.updateResults(results)
                    const totalFindings = results.reduce((sum , r) => sum + r.findings.length , 0)
                    vscode.window.showInformationMessage(
                        `Workspace scan complete: ${totalFindings} issues found in ${results.length} files`,
                    )
                } 
            )
            } catch (error) {
                vscode.window.showErrorMessage(`Workspace scan failed: ${error}`)
            }
        }),
      vscode.commands.registerCommand("envChecker.showReport", () => {
        reportWebviewProvider.showReport()
      }),

      vscode.commands.registerCommand("envChecker.exportReport", () => {
        reportWebviewProvider.exportReport()
      }),
      vscode.commands.registerCommand("envChecker.toggleRule", (ruleId: string) => {
        try {
          const rules = scanner.getRules()
          const rule = rules.find((r) => r.id === ruleId)
          if (rule) {
            scanner.toggleRule(ruleId, !rule.enabled)
            vscode.window.showInformationMessage(`Rule ${ruleId} ${rule.enabled ? "disabled" : "enabled"}`)
          } else {
            vscode.window.showWarningMessage(`Rule ${ruleId} not found`)
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to toggle rule: ${error}`)
        }
      }),
      vscode.commands.registerCommand("envChecker.clearDiagnostics", () => {
        diagnosticsProvider.clearAll()
        vscode.window.showInformationMessage("All diagnostics cleared")
      }),

      vscode.commands.registerCommand("envChecker.openSettings", () => {
        vscode.commands.executeCommand("workbench.action.openSettings", "envChecker")
      }),
    )
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get("envChecker.hasShownWelcome", false)
    if (!hasShownWelcome) {
      vscode.window
        .showInformationMessage(
          "Env Checker is now active! Your environment files will be automatically scanned for security issues.",
          "Open Settings",
          "Show Report",
        )
        .then((selection) => {
          if (selection === "Open Settings") {
            vscode.commands.executeCommand("envChecker.openSettings")
          } else if (selection === "Show Report") {
            vscode.commands.executeCommand("envChecker.showReport")
          }
        })

      context.globalState.update("envChecker.hasShownWelcome", true)
    }
    console.log("Env Checker extension activated successfully")

    } catch (error) {
        console.error("Failed to activate Env Checker extension:", error)
        vscode.window.showErrorMessage(`Env Checker activation failed: ${error}`)
    }
}
//exstension deactivation called when the exstension is disactivated or vscode is closing
export function deactivate() {
    console.log("Env Checker extension is being deactivated")
  
    try {
      // Clean up file watchers
      if (fileWatcherManager) {
        fileWatcherManager.dispose()
      }
  
      // Clear all diagnostics
      if (diagnosticsProvider) {
        diagnosticsProvider.clearAll()
      }
  
      console.log("Env Checker extension deactivated successfully")
    } catch (error) {
      console.error("Error during Env Checker deactivation:", error)
    }
  }
  