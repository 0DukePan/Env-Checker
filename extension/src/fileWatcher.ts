import * as vscode from "vscode"
import * as path from "path"
import EnvScanner, { ScanResult } from "../../src/core"
import { DiagnosticsProvider } from "./diagnostics"
import { ConfigurationManager } from "./configuration"

export class FileWatcherManager {
    private watchers : vscode.FileSystemWatcher[] = []
    private scanner : EnvScanner
    private diagnosticsProvider : DiagnosticsProvider
    private configManager : ConfigurationManager
    private scanResults : Map<string , ScanResult> = new Map()

    constructor(scanner: EnvScanner, diagnosticsProvider: DiagnosticsProvider, configManager: ConfigurationManager) {
        this.scanner = scanner
        this.diagnosticsProvider = diagnosticsProvider
        this.configManager = configManager
    }

    //initisalize file watchers for environment files

    public initialize(context  :vscode.ExtensionContext) : void {
        
    }

    //setup file system watchers for .env files 
    private setupEnvironmentFileWatchers(context: vscode.ExtensionContext): void {
        const patterns = ["**/.env", "**/.env.*", "**/.environment", "**/env.*"]
    
        patterns.forEach((pattern) => {
          const watcher = vscode.workspace.createFileSystemWatcher(pattern)
    
          // File created
          watcher.onDidCreate(async (uri) => {
            await this.handleFileChange(uri, "created")
          })
    
          // File changed
          watcher.onDidChange(async (uri) => {
            await this.handleFileChange(uri, "changed")
          })
    
          // File deleted
          watcher.onDidDelete((uri) => {
            this.handleFileDelete(uri)
          })
    
          this.watchers.push(watcher)
          context.subscriptions.push(watcher)
        })
    }
    
    //setup document event listeners
    private setupDoumentEventListeners(context : vscode.ExtensionContext) : void {
        //docuement opened
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(async (document) => {
              if (this.isEnvironmentFile(document.uri.fsPath)) {
                await this.scanDocument(document)
              }
            }),
        )
        // Document saved
        context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
          if (this.isEnvironmentFile(document.uri.fsPath) && this.configManager.getConfig().scanOnSave) {
            await this.scanDocument(document)
          }
        }),
        )
        //document changed (for realtime scanning)
        let changeTimeout: NodeJS.Timeout | undefined
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (!this.isEnvironmentFile(event.document.uri.fsPath)) return
                if (!this.configManager.getConfig().enableRealTimeScanning) return

                // Debounce changes to avoid excessive scanning
                if (changeTimeout) {
                clearTimeout(changeTimeout)
                }

                changeTimeout = setTimeout(async () => {
                await this.scanDocument(event.document)
                }, 500) // 500ms debounce
            }),
        )
        // Active editor changed
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && this.isEnvironmentFile(editor.document.uri.fsPath)) {
                if (this.configManager.getConfig().enableRealTimeScanning) {
                await this.scanDocument(editor.document)
                }
            }
            }),
        )
    } 

    private setupConfigurationWatcher(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
          this.configManager.onConfigurationChanged(async () => {
            // Re-scan all open environment files when configuration changes
            const visibleEditors = vscode.window.visibleTextEditors
            for (const editor of visibleEditors) {
              if (this.isEnvironmentFile(editor.document.uri.fsPath)) {
                await this.scanDocument(editor.document)
              }
            }
          }),
        )
    }

    private async handleFileChange(uri: vscode.Uri, changeType: "created" | "changed"): Promise<void> {
        if (!this.configManager.getConfig().enableRealTimeScanning) return
    
        try {
          const document = await vscode.workspace.openTextDocument(uri)
          await this.scanDocument(document)
    
          if (changeType === "created") {
            vscode.window
              .showInformationMessage(`New environment file detected: ${path.basename(uri.fsPath)}`, "Scan Now")
              .then((selection) => {
                if (selection === "Scan Now") {
                  vscode.commands.executeCommand("envChecker.scanFile")
                }
              })
          }
        } catch (error) {
          console.error(`Error handling file ${changeType}:`, error)
        }
    }
    private handleFileDelete(uri: vscode.Uri): void {
        this.diagnosticsProvider.clearDocument(uri)
        this.scanResults.delete(uri.fsPath)
    
        vscode.window.showInformationMessage(`Environment file deleted: ${path.basename(uri.fsPath)}`)
    }

    private async scanDocument(document: vscode.TextDocument): Promise<void> {
        try {
          const result = this.scanner.scanContent(document.getText(), document.uri.fsPath)
          this.scanResults.set(document.uri.fsPath, result)
          await this.diagnosticsProvider.updateDiagnostics(document, result)
        } catch (error) {
          console.error("Error scanning document:", error)
          vscode.window.showErrorMessage(`Failed to scan ${path.basename(document.uri.fsPath)}: ${error}`)
        }
    }

    //check is a  file is an env file 
    private isEnvironmentFile(filePath: string): boolean {
        const fileName = path.basename(filePath)
        const envPatterns = [/^\.env$/, /^\.env\..+$/, /^\.environment$/, /^env\..+$/, /^environment\..+$/]
    
        return envPatterns.some((pattern) => pattern.test(fileName))
    }

    //get all current scan resutls 
    public getAllScanResults(): ScanResult[] {
        return Array.from(this.scanResults.values())
    }

    //get scan result for a specific file
    public getScanResult(filePath: string): ScanResult | undefined {
        return this.scanResults.get(filePath)
    }
    
    //force scan all env files in workspace
    public async scanAllFiles(): Promise<ScanResult[]> {
        const config = this.configManager.getConfig()
        const excludePatterns = config.excludePatterns.map((pattern) => `{${pattern}}`)
    
        const envFiles = await vscode.workspace.findFiles(
          "**/.env*",
          excludePatterns.length > 0 ? `{${excludePatterns.join(",")}}` : undefined,
        )
    
        const results: ScanResult[] = []
    
        for (const file of envFiles) {
          try {
            const document = await vscode.workspace.openTextDocument(file)
            const result = this.scanner.scanContent(document.getText(), file.fsPath)
            this.scanResults.set(file.fsPath, result)
            await this.diagnosticsProvider.updateDiagnostics(document, result)
            results.push(result)
          } catch (error) {
            console.error(`Error scanning ${file.fsPath}:`, error)
          }
        }
    
        return results
    }

    //dispose all watchers
    public dispose(): void {
        this.watchers.forEach((watcher) => watcher.dispose())
        this.watchers = []
        this.scanResults.clear()
    }
}