import * as vscode from "vscode" 
import * as path from 'path'

export class CommandManager {
    // register all exstension commands 
    public static registerCommands(context: vscode.ExtensionContext) : void {
        //create .env.example entry command 
        context.subscriptions.push(
            vscode.commands.registerCommand("envChecker.createExampleEntry", (key: string, suggestion: string) =>
              this.createExampleEntry(key, suggestion),
            ),
        )

        //generate security report command 
        context.subscriptions.push(
            vscode.commands.registerCommand("envChecker.generateSecurityReport", () => this.generateSecurityReport()),
          )
        //fix all issues command
        context.subscriptions.push(vscode.commands.registerCommand('envChecker.fixAllIssues' , () => this.fixAllIssues()))

        //create .gitignore entries command
        context.subscriptions.push(
            vscode.commands.registerCommand('envChecker.createGitIgnoreEntries' , () => this.addGitignoreEntries())
        )
    }


    //create or update .env.example file 
    private static async createExampleEntry(key : string , suggestion : string) : Promise<void>{
        const workspaceFolders = vscode.workspace.workspaceFolders
        if(!workspaceFolders){
            vscode.window.showErrorMessage('No workspace folder open')
            return
        }

        const examplePath = path.join(workspaceFolders[0].uri.fsPath , '.env.example')
        const exampleUri = vscode.Uri.file(examplePath)

        try {
            let content = ''
            try {
                const existingContent = await vscode.workspace.fs.readFile(exampleUri)
                content = Buffer.from(existingContent).toString('utf-8')
            } catch (error) {
                 // File doesn't exist, start with empty content
                content = "# Environment Configuration Example\n# Copy this file to .env and fill in your values\n\n"
            }

            //check if the key alredy exists 
            if(!content.includes(`${key}=`)){
                    const exampleValue = this.generateExampleValue(key , suggestion)
                    content += `# ${suggestion}\n${key}=${exampleValue}\n\n`
                    
                    await vscode.workspace.fs.writeFile(exampleUri , Buffer.from(content , 'utf-8'))
                    vscode.window.showInformationMessage(`Added ${key} to .env.example`)

                    //open the file 
                    const document = await vscode.workspace.openTextDocument(exampleUri)
                    await vscode.window.showTextDocument(document)
            
                }else {
                    vscode.window.showErrorMessage(`Key ${key} already exists in .env.example`)
                }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create .env.example entry: ${error}`)

        }
    }

    //generate example value based on key name 
    private static generateExampleValue(key : string , suggestion : string) : string {
        const loweKey = key.toLowerCase()
        if(loweKey.includes('passwod') || loweKey.includes('secret')){
            return 'your_secure_password_here'
        }
        if(loweKey.includes('api') && loweKey.includes('key')){
            return 'your_api_key_here'
        }
        if(loweKey.includes('token')){
            return 'your_token_here'
        }
        if(loweKey.includes('url') || loweKey.includes('endpoint')){
            return 'https://your-domain.com'
        }
        if(loweKey.includes('port')){
            return '3000'
        }
        if(loweKey.includes('debug')){
            return 'false'
        }
        if(loweKey.includes('email')){
            return 'your_email_here@gmail.com'
        }
        return  'your_value_here'
    }

    //generate comprehension security report
    private static async generateSecurityReport() : Promise<void>{
        vscode.window.showInformationMessage("Generating comprehensive security report...")

        //this would integrate with the scanner to create a detailed report 

        const reportContent = `
                # Environment Security Report
                Generated: ${new Date().toISOString()}

                ## Security Recommendations
                1. Never commit .env files to version control
                2. Use strong, unique passwords and API keys
                3. Rotate secrets regularly
                4. Use environment-specific configuration files
                5. Implement proper access controls

                ## Next Steps
                - Review all flagged issues
                - Update weak credentials
                - Add .env files to .gitignore
                - Create .env.example templates
        `
        const reportUri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders![0].uri.fsPath , 'SECURITY_REPORT.md'))
        await vscode.workspace.fs.writeFile(reportUri , Buffer.from(reportContent , 'utf-8'))

        const document = await vscode.workspace.openTextDocument(reportUri)
        await vscode.window.showTextDocument(document)
    }

    //apply automatic fixd to all issues
    private static async fixAllIssues() : Promise<void>{
        const result = await vscode.window.showWarningMessage("This will automatically apply fixes to all detected security issues. Continue?",
                { modal: true },
                "Yes, Fix All",
                "Cancel",
        )
        if(result !== 'Yes, Fix All') return 

        vscode.window.showInformationMessage('Auto-fixing security issues...')

        //get all open .env files and apply fixes
        const visibleEditors = vscode.window.visibleTextEditors.filter((editor) => 
            this.isEnvironmentFile(editor.document.fileName)
        )

        let fixedCount = 0

        for(const editor of visibleEditors){
            const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)
            const envDiagnostics = diagnostics.filter((d) => d.source == 'env-checkker')

            for(const diagnostic of envDiagnostics){
                //apply the most appropiate fix based on severity 
                if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                    //coomment out critical issues
                    const line = editor.document.lineAt(diagnostic.range.start.line)
                    const edit = new vscode.WorkspaceEdit()
                    edit.replace(editor.document.uri , line.range , `# ${line.text} # SECURITY: Auto-fixed`)
                    await vscode.workspace.applyEdit(edit)
                    fixedCount++

                }
            }
        }
        vscode.window.showInformationMessage(`Auto-fixed ${fixedCount} security issues`)

    } 

    //add environment files to .gitignore 
    private static async addGitignoreEntries(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders
        if (!workspaceFolders) return
    
        const gitignorePath = path.join(workspaceFolders[0].uri.fsPath, ".gitignore")
        const gitignoreUri = vscode.Uri.file(gitignorePath)
    
        try {
          let content = ""
          try {
            const existingContent = await vscode.workspace.fs.readFile(gitignoreUri)
            content = Buffer.from(existingContent).toString("utf8")
          } catch {
            // File doesn't exist
          }
    
          const entriesToAdd = [".env", ".env.local", ".env.*.local", "*.env"]
          const newEntries = entriesToAdd.filter((entry) => !content.includes(entry))
    
          if (newEntries.length > 0) {
            content += "\n# Environment files\n" + newEntries.join("\n") + "\n"
            await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(content, "utf8"))
              vscode.window.showInformationMessage(`Added ${newEntries.length} entries to .gitignore`)
          } else {
            vscode.window.showInformationMessage("Environment files already in .gitignore")
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to update .gitignore: ${error}`)
        }
      }

      private static isEnvironmentFile(fileName: string): boolean {
        return /\.env(\.|$)/.test(fileName) || fileName.endsWith(".env")
      }
}