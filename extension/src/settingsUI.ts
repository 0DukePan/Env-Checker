import * as vscode from 'vscode'
import { ConfigurationManager } from './configuration'
import { ScanRule } from '../../src/core'

export class SettingUIManager {
    private configManager : ConfigurationManager

    constructor(configManager : ConfigurationManager){
        this.configManager = configManager
    }

    //show setting configuration panel

    public async showSettingsPanel() : Promise<void>{
        const panel = vscode.window.createWebviewPanel(
            'envCheckerSettings',
            'Env Checker Settings',
            vscode.ViewColumn.One,
            {
                enableScripts : true,
                retainContextWhenHidden : true
            }
        )
        panel.webview.html = this.getRuleManagementHTML()

        //handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch(message.type){
                case 'updateSetting':
                    await this.updateSetting(message.key , message.value)
                    break
                case 'resetSettings':
                    await this.configManager.resetToDefaults()
                    break
                case "validationSettings":
                    const validation = this.configManager.validateSettings()
                    panel.webview.postMessage({
                        type : 'validationResult',
                        result : validation
                    })
                case 'exportSettings':
                    await this.exportSettings()
                    break
                case 'importSettings':
                    await this.importSettings()
                    break
            }
        })

        //send current settings to webview
        const currentConfig = this.configManager.getConfig()
        panel.webview.postMessage({
            type : 'currentSettings',
            settings : currentConfig
        })
    }

    //show rule management panel 
    public async showRuleManagementPanel() : Promise<void>{
        const panel = vscode.window.createWebviewPanel('envCheckerRules' , 'Enc Checker Rules' , vscode.ViewColumn.One , {
            enableScripts : true,
            retainContextWhenHidden : true
        })
        panel.webview.html = this.getRuleManagementHTML()

        panel.webview.onDidReceiveMessage(async (message) => {
            switch(message.type){
                case 'loadRules' :
                    const rules = this.configManager.getAllRules()
                    panel.webview.postMessage({
                        type : 'rulesLoaded',
                        rules : rules
                    })
                    break
                case 'toggleRule':
                    await this.toggleRule(message.ruleId)
                    break
                case 'createRule':
                    await this.createCustomRule(message.rule)
                    break
                case 'deleteRule':
                    await this.deleteCustomRule(message.ruleId)
                    break
                case 'saveProfile':
                    await this.configManager.saveRuleProfile(message.profileName, message.rules)
                    break
                case 'loadProfile':
                    const profileRules = await this.configManager.loadRuleProfile(message.profileName)
                    panel.webview.postMessage({
                        type : 'rulesLoaded',
                        rules : profileRules
                    })
                    break
            }
        })
    }

    public async showQuickSettings(): Promise<void> {
        const items: vscode.QuickPickItem[] = [
          {
            label: "$(settings-gear) Open Settings Panel",
            description: "Configure all extension settings",
            detail: "Full settings interface",
          },
          {
            label: "$(law) Manage Rules",
            description: "Create and manage security rules",
            detail: "Rule management interface",
          },
          {
            label: "$(shield) Toggle Real-time Scanning",
            description: "Enable/disable automatic scanning",
            detail: this.configManager.getConfig().enableRealTimeScanning ? "Currently enabled" : "Currently disabled",
          },
          {
            label: "$(bell) Change Notification Level",
            description: "Set minimum severity for notifications",
            detail: `Current: ${this.configManager.getConfig().notificationLevel}`,
          },
          {
            label: "$(export) Export Settings",
            description: "Export current configuration",
            detail: "Save settings to file",
          },
          {
            label: "$(import) Import Settings",
            description: "Import configuration from file",
            detail: "Load settings from file",
          },
          {
            label: "$(refresh) Reset to Defaults",
            description: "Reset all settings to default values",
            detail: "This will overwrite current settings",
          },
        ]
    
        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: "Choose a setting to configure",
        })
    
        if (!selected) return
    
        switch (selected.label) {
          case "$(settings-gear) Open Settings Panel":
            await this.showSettingsPanel()
            break
          case "$(law) Manage Rules":
            await this.showRuleManagementPanel()
            break
          case "$(shield) Toggle Real-time Scanning":
            await this.toggleRealtimeScanning()
            break
          case "$(bell) Change Notification Level":
            await this.changeNotificationLevel()
            break
          case "$(export) Export Settings":
            await this.exportSettings()
            break
          case "$(import) Import Settings":
            await this.importSettings()
            break
          case "$(refresh) Reset to Defaults":
            await this.confirmResetSettings()
            break
        }
    }

    private async updateSetting(key : string , value : any) : Promise<void> {
        await this.configManager.updateConfig(key as any , value)
        vscode.window.showInformationMessage(`Setting ${key} updated`)
    }
    private async toggleRealtimeScanning() : Promise<void> {
        const cucrrent = this.configManager.getConfig().enableRealTimeScanning
        await this.configManager.updateConfig('enableRealTimeScanning' , !cucrrent)
        vscode.window.showInformationMessage(`Real-time scanning ${cucrrent ? 'disabled' : 'enabled'}`)
    }

    private async changeNotificationLevel() : Promise<void> {
        const levels = ['none' , 'critical' , 'warning' , 'info']
        const selected  = await vscode.window.showQuickPick(levels , {
            placeHolder  : "Select notification level"
        })
        if(selected){
            await this.configManager.updateConfig('notificationLevel' , selected)
            vscode.window.showInformationMessage(`Notification level changed to ${selected}`)
        }
    }
    private async exportSettings() : Promise<void>{
        const config = this.configManager.getConfig()
        const exportData = {
            version : '1.0.0',
            timestamp : new Date().toISOString(),
            settings  : config,
            rules : this.configManager.getAllRules()
        }
        const uri = await vscode.window.showSaveDialog({
            defaultUri : vscode.Uri.file('env-checker-settings.json'),
            filters :{
                'JSON Files' : ['json']
            }
        })

        if(uri){
            await vscode.workspace.fs.writeFile(uri , Buffer.from(JSON.stringify(exportData , null , 2) , 'utf8'))
            vscode.window.showInformationMessage(`Settings exported to ${uri.fsPath}`)
        }
     }

     private async importSettings() : Promise<void>{
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles : true,
            canSelectMany: false,
            filters : {'JSON Files' : ['json']}
        })
        if(uris && uris.length > 0){
            try {
                const content = await vscode.workspace.fs.readFile(uris[0])
                const importData = JSON.parse(Buffer.from(content).toString('utf8'))
                
                if(importData.settings){
                    const config = vscode.workspace.getConfiguration('envChecker')
                    for(const [key , value] of Object.entries(importData.settings)){
                        await config.update(key , value , vscode.ConfigurationTarget.Workspace)
                    }
                    vscode.window.showInformationMessage(`Settings imported from ${uris[0].fsPath}`)
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to import settings: ${error}`)
            }
        }
     }
     private async confirmResetSettings(): Promise<void> {
        const result = await vscode.window.showWarningMessage(
          "This will reset all settings to their default values. Continue?",
          { modal: true },
          "Reset Settings",
          "Cancel",
        )
    
        if (result === "Reset Settings") {
          await this.configManager.resetToDefaults()
        }
      }
    
      private async toggleRule(ruleId: string): Promise<void> {
        // Implementation would depend on how rules are stored and managed
        vscode.window.showInformationMessage(`Toggled rule: ${ruleId}`)
      }
    
      private async createCustomRule(rule: ScanRule): Promise<void> {
        // Implementation for creating custom rules
        vscode.window.showInformationMessage(`Created custom rule: ${rule.name}`)
      }
    
      private async deleteCustomRule(ruleId: string): Promise<void> {
        // Implementation for deleting custom rules
        vscode.window.showInformationMessage(`Deleted rule: ${ruleId}`)
      }
    

    private getSettingsHTML(): string {
        return `<!DOCTYPE html>
    <html>
    <head>
        <title>Env Checker Settings</title>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            .setting-group { margin-bottom: 20px; }
            .setting-label { font-weight: bold; margin-bottom: 5px; }
            .setting-description { font-size: 12px; opacity: 0.8; margin-bottom: 10px; }
            input, select { width: 100%; padding: 5px; margin-bottom: 10px; }
            button { padding: 8px 16px; margin-right: 10px; }
        </style>
    </head>
    <body>
        <h1>Env Checker Settings</h1>
        <div id="settings-form">
            <!-- Settings form will be populated by JavaScript -->
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            // Settings UI JavaScript would go here
        </script>
    </body>
    </html>`
      }
    
      private getRuleManagementHTML(): string {
        return `<!DOCTYPE html>
    <html>
    <head>
        <title>Env Checker Rules</title>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            .rule-item { border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; }
            .rule-header { display: flex; justify-content: space-between; align-items: center; }
            .severity-badge { padding: 2px 8px; border-radius: 3px; font-size: 11px; }
            .critical { background: #f44336; color: white; }
            .warning { background: #ff9800; color: white; }
            .info { background: #2196f3; color: white; }
        </style>
    </head>
    <body>
        <h1>Security Rules Management</h1>
        <div id="rules-container">
            <!-- Rules will be populated by JavaScript -->
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            // Rules management JavaScript would go here
        </script>
    </body>
    </html>`
    }
}