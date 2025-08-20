import * as vscode from "vscode"
import EnvScanner, { EnvFinding, ScanResult, Severity } from "../../src/core"
import { ConfigurationManager } from "./configuration"

export class DiagnosticsProvider {

    private diagnosticCollection : vscode.DiagnosticCollection
    private scanner : EnvScanner
    private configManager : ConfigurationManager

    constructor(scanner : EnvScanner , configManager : ConfigurationManager){
        this.scanner = scanner 
        this.configManager = configManager
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('envchecker')
    }

    //update diagnostics for a document based on scan results 

    public async updateDiagnostics(document : vscode.TextDocument , scanResult : ScanResult) : Promise<void>{
        const config = this.configManager.getConfig()
        if(!config.showInlineErrors){
            this.diagnosticCollection.delete(document.uri)
            return
        }

        const diagnostics : vscode.Diagnostic[]  = []

        for(const finding of scanResult.findings){
            //skip if severity is not enabled
            if(!config.enabledSeverities.includes(finding.severity)){
                continue 
            }

            const diagnostic = this.createDiagnostic(document , finding)
            if(diagnostic){
                diagnostics.push(diagnostic)
            }
        }

        this.diagnosticCollection.set(document.uri , diagnostics)

        //show notification fro critical issues if enabled
        this.showNotifications(scanResult , config.notificationLevel)
    }

    public createDiagnostic(document : vscode.TextDocument , finding : EnvFinding) : vscode.Diagnostic | null{
        try {
            const line = document.lineAt(finding.line -1)
            const range = this.getRange(line , finding)

            const diagnostic = new vscode.Diagnostic(range , finding.message , this.getSeverityLevel(finding.severity))
            diagnostic.source = 'env-checkker'
            diagnostic.code=  finding.ruleId
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(new vscode.Location(document.uri , range) , `💡 ${finding.suggestion}`)
            ]

            //add tags for different types of issues
            diagnostic.tags = this.getDiagnosticsTags(finding)

            return diagnostic
        } catch (error) {
            console.error("Error creating diagnostic:", error)
            return null
        }
    }

    //get range for highlighting the issue

    private getRange(line: vscode.TextLine, finding: EnvFinding): vscode.Range {
        const text = line.text
        const keyIndex = text.indexOf(finding.key)
    
        if (keyIndex !== -1) {
          // Highlight the entire key=value pair
          const valueIndex = text.indexOf("=", keyIndex)
          if (valueIndex !== -1) {
            return new vscode.Range(line.lineNumber, keyIndex, line.lineNumber, text.length)
          }
    
          // Fallback highlight just the key
          return new vscode.Range(line.lineNumber, keyIndex, line.lineNumber, keyIndex + finding.key.length)
        }
    
        // Fallback highlight the entire line
        return new vscode.Range(line.lineNumber, 0, line.lineNumber, text.length)
      }

    private getSeverityLevel(severity : Severity) : vscode.DiagnosticSeverity{
        switch(severity){
            case Severity.CRITICAL:
                return vscode.DiagnosticSeverity.Error
            case Severity.WARNING:
                return vscode.DiagnosticSeverity.Warning
            case Severity.INFO:
                return vscode.DiagnosticSeverity.Information
            default:
                return vscode.DiagnosticSeverity.Hint
        }
    }

    //get diagnostics tags for different types of issues

    private getDiagnosticsTags(finding : EnvFinding) : vscode.DiagnosticTag[]{
        const tags : vscode.DiagnosticTag[] = []

        //mark deprecated paterns 
        if(finding.ruleId.includes('deprecated') || finding.ruleId.includes('legacy')){
            tags.push(vscode.DiagnosticTag.Deprecated)
        }

        //mark unnecessary items 
        if(finding.severity === Severity.INFO && finding.ruleId.includes('unused')){
            tags.push(vscode.DiagnosticTag.Unnecessary)
        }
        return tags
    }


    private showNotifications(scanResult : ScanResult , notificationLevel : string) : void {
        if(notificationLevel === 'none') return
        const {criticalCount , warningCount , infoCount} = scanResult

        if(notificationLevel === 'critical' && criticalCount > 0){
            const message = `Found ${criticalCount} critical security issue${criticalCount > 1 ? "s" : ""} in ${scanResult.filePath}` 
            vscode.window.showErrorMessage(message , 'Show Details' , 'Dismiss').then((selection) => {
                if(selection === 'Show Details'){
                    vscode.commands.executeCommand('envChecker.showReport')
                }
            })
        }else if (notificationLevel === 'warning' && (criticalCount > 0 || warningCount > 0)) {
            const totalIssues = criticalCount + warningCount
            const message = `Found ${totalIssues} security issue${totalIssues > 1 ? "s" : ""} in ${scanResult.filePath}`
            vscode.window.showWarningMessage(message , 'Show Details' , 'Dismiss').then((selection) => {
                vscode.commands.executeCommand('envChecker.showReport')
            })            
        }else if (notificationLevel === 'info' && (criticalCount > 0 || warningCount > 0 || infoCount > 0 )){
            const totalIssues = criticalCount + warningCount + infoCount
            const message = `Found ${totalIssues} issue${totalIssues > 1 ? "s" : ""} in ${scanResult.filePath}`
            vscode.window.showInformationMessage(message)
        }
    }

    //clear all diagnostics 
    public clearAll() : void {
        this.diagnosticCollection.clear()
    }

    //clear diagnostics for a specific document
    public clearDocument(uri : vscode.Uri) : void {
        this.diagnosticCollection.delete(uri)
    }

    //get current diagnostics for a document 
    public getDiagnostics(uri : vscode.Uri) : readonly vscode.Diagnostic[]{
        return this.diagnosticCollection.get(uri) || []
    }

    //dispose of the diagnostic collection
    public dispose() : void {
        this.diagnosticCollection.dispose()
    }
}