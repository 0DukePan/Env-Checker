import * as vscode from 'vscode'
import * as path from 'path'
import { Severity, ScanRule } from "../../src/core/types"
import { DEFAULT_RULES } from '../../src/core'
import { error } from 'console'

export interface ExtensionConfig {
    enableRealTimeScanning: boolean
    scanOnSave: boolean
    showInlineErrors: boolean
    enabledSeverities: Severity[]
    customRulesPath: string
    excludePatterns: string[]
    notificationLevel: Severity | "none"
    autoFixOnSave: boolean
    maxFileSizeKB: number
    scanTimeout: number
    enableTelemetry: boolean
    ruleProfiles: string
    workspaceSpecificRules: boolean
  }

export class ConfigurationManager {
    private static readonly SECTION = 'envChecker'
    private customRules : ScanRule[] = []
    private configWatchers : vscode.FileSystemWatcher[] = []

    constructor(){
        this.loadCustomRules()
        this.setupConfigWatchers()
    }

   public getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.SECTION)

    return {
      enableRealTimeScanning: config.get("enableRealTimeScanning", true),
      scanOnSave: config.get("scanOnSave", true),
      showInlineErrors: config.get("showInlineErrors", true),
      enabledSeverities: this.convertToSeverityArray(config.get("enabledSeverities", ["critical", "warning", "info"])),
      customRulesPath: config.get("customRulesPath", ""),
      excludePatterns: config.get("excludePatterns", ["node_modules/**", "dist/**", "build/**"]),
      notificationLevel: this.convertToSeverity(config.get("notificationLevel", "critical")),
      autoFixOnSave: config.get("autoFixOnSave", false),
      maxFileSizeKB: config.get("maxFileSizeKB", 1024),
      scanTimeout: config.get("scanTimeout", 5000),
      enableTelemetry: config.get("enableTelemetry", true),
      ruleProfiles: config.get("ruleProfiles", "default"),
      workspaceSpecificRules: config.get("workspaceSpecificRules", true),
    }
  }


    public async updateConfig(key : keyof ExtensionConfig , value : any) : Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.SECTION)
        await config.update(key , value , vscode.ConfigurationTarget.WorkspaceFolder)
    }

    public onConfigurationChanged(callback : ()=> void) : vscode.Disposable{
        return vscode.workspace.onDidChangeConfiguration((event)=>{
            if(event.affectsConfiguration(ConfigurationManager.SECTION)){
                callback()
            }
        })

    }

    public shouldShowSeverity(severity : Severity) : boolean{
        const config = this.getConfig()
        return config.enabledSeverities.includes(severity)
    }

    public shouldNotify (severity : Severity) : boolean{
        const config = this.getConfig()
        if(config.notificationLevel === 'none') return false

        const severityLevels = ['info' , 'warning' , 'critical']
        const notificationIndex = severityLevels.indexOf(config.notificationLevel)
        const currentIndex = severityLevels.indexOf(severity)

        return currentIndex >= notificationIndex
    }

    public async loadCustomRules() : Promise<void>{
        const config = this.getConfig()

        if(!config.customRulesPath) return

        try {
            const rulePath = this.resolveRulesPath(config.customRulesPath)
            if(await this.fileExists(rulePath)){
                const rulesContent = await vscode.workspace.fs.readFile(vscode.Uri.file(rulePath))
                const rulesData = JSON.parse(Buffer.from(rulesContent).toString('utf8'))
                
                if(this.validateCustomRules(rulesData)){
                    this.customRules = rulesData.rules || []
                    console.log(`Loaded ${this.customRules.length} custom rules from ${rulePath}`)
                }

            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load custom rules: ${error}`)
        }
    }
    private setupConfigWatchers() : void {
        //wacth for changes to custom rueles files
        const config = this.getConfig()
        if(config.customRulesPath){
            const rulesPath = this.resolveRulesPath(config.customRulesPath)
            const watcher = vscode.workspace.createFileSystemWatcher(rulesPath)

            watcher.onDidChange(() => this.loadCustomRules())
            watcher.onDidCreate(() => this.loadCustomRules())
            watcher.onDidDelete(() => {
                this.customRules = []
                vscode.window.showWarningMessage(`Custom rules file deleted`)
            })
            this.configWatchers.push(watcher)
        }

        //watch for workspace-specific rules 
        if(config.workspaceSpecificRules){
            const workspaceWatcher = vscode.workspace.createFileSystemWatcher("**/.env-checker.json")
            workspaceWatcher.onDidChange(() => this.loadCustomRules())
            workspaceWatcher.onDidCreate(() => this.loadCustomRules())
            this.configWatchers.push(workspaceWatcher)
        }
    }

    private async loadWorkspaceRules() : Promise<void>{
        const workspaceFolders = vscode.workspace.workspaceFolders
        if(!workspaceFolders) return
        for (const folder of workspaceFolders){
            const configPath = path.join(folder.uri.fsPath , '.env-checker.json')
            try {
                if(await this.fileExists(configPath)){
                    const configContent = await vscode.workspace.fs.readFile(vscode.Uri.file(configPath))
                    const workspaceConfig = JSON.parse(Buffer.from(configContent).toString('utf8'))
                    if(workspaceConfig.rules && this.validateCustomRules(workspaceConfig)){{
                        this.customRules = [...this.customRules , ...workspaceConfig.rules]
                    }
                        
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load workspace-specific rules: ${error}`)                
            }
        }
    }

    private validateCustomRules(rulesData : any) : boolean{
        if(!rulesData || !Array.isArray(rulesData.rules)){
            vscode.window.showErrorMessage('Invalid custom rules format: rules must be an array')
            return false
        }

        for(const rule of rulesData.rules){
            if(!this.validateRule(rule)){
                vscode.window.showErrorMessage(`Invalid rule: ${rule.id || "unknown"}`)
                return false
            }
        }
        return true
    }

    private validateRule(rule : any) : boolean{
        const requiredFields = ["id", "name", "description", "severity", "pattern", "suggestion"]
        for(const field of requiredFields){
            if(!rule[field]){
                return false
            }
        }

        if(!['critical' , 'warning' , 'info'].includes(rule.severity)){
            return false
        }
        try {
            new RegExp(rule.pattern)
        } catch (error) {
            return false
        }
        return true
    }
    private async fileExists(filePath : string) : Promise<boolean>{
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(filePath))
            return true
        } catch (error) {
            return false
        }
    }
    private resolveRulesPath(rulesPath : string) : string{
        if(path.isAbsolute(rulesPath)){
            return rulesPath
        }
        const workspaceFoldres = vscode.workspace.workspaceFolders
        if(workspaceFoldres && workspaceFoldres.length > 0){
            return path.join(workspaceFoldres[0].uri.fsPath , rulesPath)

        }
        return rulesPath
    }

    public async loadRuleProfile(profileName : string) : Promise<ScanRule[]>{
        const profilePath = this.getProfilePath(profileName)
        try {
            if(await this.fileExists(profilePath)){
                const profileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(profilePath))
                const profileData = JSON.parse(Buffer.from(profileContent).toString('utf8'))
                if(this.validateCustomRules(profileData)){
                    return profileData.rules || []
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load rule profile '${profileName}' : ${error}`)
        }

        return DEFAULT_RULES
    }
    public async saveRuleProfile(profileName : string  , rules : ScanRule[]) : Promise<void>{
        const profilePath = this.getProfilePath(profileName)
        try {
            const profileData = {
                name : profileName,
                description : `Custom rule profile : ${profileName}`,
                version : '1.0.0',
                rules : rules
            }

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(profilePath),
                Buffer.from(JSON.stringify(profileData , null , 2) , 'utf8')
            )
            vscode.window.showInformationMessage(`Rule to save rule profile : ${error}`)
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save rule profile : ${error}`)
        }
    }

    public validateSettings() : {isValid : boolean , errors : string[]}{
        const config = this.getConfig()
        const errors : string[] = []
        //validate severity levels 
        const validSeverities = ['crtical' , 'warning' , 'info']
        for (const severity of config.enabledSeverities){
            if(!validSeverities.includes(severity)){
                errors.push(`Invalid severity level : ${severity}`)
            }
        }

        //validate notification level
        if(config.notificationLevel !== 'none' && !validSeverities.includes(config.notificationLevel)){
            errors.push(`Invalid notification level: ${config.notificationLevel}`)
        }

        //validate file size limit 

        if(config.maxFileSizeKB < 1 || config.maxFileSizeKB > 10240){
            errors.push("Max file size must be between 1KB and 10MB")
        }

        //validate scan timeout
        if(config.scanTimeout < 1000 || config.scanTimeout > 30000){
            errors.push("Scan timeout must be between 1s and 30s")
        }

        ///validate custom rule path 
        if(config.customRulesPath && !path.isAbsolute(config.customRulesPath)){
            const resolved = this.resolveRulesPath(config.customRulesPath)
            if(!resolved){
                errors.push(`Custom rules path must be absolute or relative to workspace`)
            }
        }

        return {
            isValid : errors.length === 0,
            errors
        }
    }

    public async resetToDefaults () : Promise<void>{
        const  config = vscode.workspace.getConfiguration(ConfigurationManager.SECTION)
        const defaultSettings = {
            enableRealTimeScanning: true,
            scanOnSave: true,
            showInlineErrors: true,
            enabledSeverities: ["critical", "warning", "info"],
            customRulesPath: "",
            excludePatterns: ["node_modules/**", "dist/**", "build/**"],
            notificationLevel: "critical",
            autoFixOnSave: false,
            maxFileSizeKB: 1024,
            scanTimeout: 5000,
            enableTelemetry: true,
            ruleProfiles: "default",
            workspaceSpecificRules: true,
        }

        for (const [key , value] of Object.entries(defaultSettings)){
            await config.update(key , value , vscode.ConfigurationTarget.Workspace)
        }

        vscode.window.showInformationMessage("Settings reset to defaults")
    }


    private getProfilePath(profileName : string) : string {
        const workspaceFolders = vscode.workspace.workspaceFolders
        if(workspaceFolders && workspaceFolders.length > 0){
            return path.join(workspaceFolders[0].uri.fsPath , '.vscode' , `env-checker-${profileName}.json`)
        }
        return path.join(process.cwd() , `env-checker-${profileName}.json`)
    }

    public getCustomRules(): ScanRule[] {
    return this.customRules
    }
    public getAllRules(): ScanRule[] {
    return [...DEFAULT_RULES, ...this.customRules]
    }

    public dispose(): void {
        this.configWatchers.forEach((watcher) => watcher.dispose())
        this.configWatchers = []
    }

    //helper method to convert string array to Severity array
    private convertToSeverityArray(severities : string[]) : Severity[]{
        return severities.map((s) => this.convertToSeverity(s)).filter((s) => s!=='none') as Severity[]
    }

    private convertToSeverity(severity: string): Severity | "none" {
        switch (severity) {
          case "critical":
            return Severity.CRITICAL
          case "warning":
            return Severity.WARNING
          case "info":
            return Severity.INFO
          case "none":
            return "none"
          default:
            return Severity.CRITICAL
        }
    }

}