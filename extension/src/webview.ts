// Webview provider for security report panel

import * as vscode from "vscode"
import type { ScanResult } from "../../src/core/index.js"

export class ReportWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "envCheckerReport"

  private _view?: vscode.WebviewView
  private _extensionUri: vscode.Uri
  private _scanResults: ScanResult[] = []

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "applyFix":
          this._applyFix(data.filePath, data.line, data.fixType)
          break
        case "openFile":
          this._openFile(data.filePath, data.line)
          break
        case "exportReport":
          this._exportReport(data.format)
          break
        case "toggleRule":
          this._toggleRule(data.ruleId)
          break
        case "refreshScan":
          vscode.commands.executeCommand("envChecker.scanWorkspace")
          break
        case "bulkFix":
          this._bulkFix(data.fixType, data.findings)
          break
      }
    })

    // Initial render
    this._updateWebview()
  }

  public updateResults(results: ScanResult[]): void {
    this._scanResults = results
    this._updateWebview()
  }

  public getCurrentResults(): ScanResult[] {
    return this._scanResults
  }

  public showReport(): void {
    if (this._view) {
      this._view.show?.(true)
    }
  }

  public exportReport(): void {
    vscode.commands.executeCommand("envChecker.exportReport")
  }

  private _updateWebview(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateResults",
        results: this._scanResults,
      })
    }
  }

  private async _applyFix(filePath: string, line: number, fixType: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
      const editor = await vscode.window.showTextDocument(document)
      const lineObj = document.lineAt(line - 1)

      const edit = new vscode.WorkspaceEdit()

      switch (fixType) {
        case "comment":
          edit.replace(document.uri, lineObj.range, `# ${lineObj.text} # SECURITY: Fixed by Env Checker`)
          break
        case "mask":
          edit.replace(document.uri, lineObj.range, lineObj.text.replace(/=.*$/, "=***MASKED***"))
          break
        case "remove":
          edit.delete(document.uri, lineObj.rangeIncludingLineBreak)
          break
      }

      await vscode.workspace.applyEdit(edit)
      vscode.window.showInformationMessage(`Applied ${fixType} fix to line ${line}`)

      // Re-scan the file
      setTimeout(() => {
        vscode.commands.executeCommand("envChecker.scanFile")
      }, 100)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to apply fix: ${error}`)
    }
  }

  private async _bulkFix(fixType: string, findings: any[]): Promise<void> {
    try {
      const edit = new vscode.WorkspaceEdit()

      for (const finding of findings) {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(finding.filePath))
        const lineObj = document.lineAt(finding.line - 1)

        switch (fixType) {
          case "comment":
            edit.replace(document.uri, lineObj.range, `# ${lineObj.text} # SECURITY: Fixed by Env Checker`)
            break
          case "mask":
            edit.replace(document.uri, lineObj.range, lineObj.text.replace(/=.*$/, "=***MASKED***"))
            break
          case "remove":
            edit.delete(document.uri, lineObj.rangeIncludingLineBreak)
            break
        }
      }

      await vscode.workspace.applyEdit(edit)
      vscode.window.showInformationMessage(`Applied ${fixType} fix to ${findings.length} findings`)

      // Re-scan affected files
      setTimeout(() => {
        vscode.commands.executeCommand("envChecker.scanWorkspace")
      }, 100)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to apply bulk fix: ${error}`)
    }
  }

  private async _openFile(filePath: string, line: number): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
      const editor = await vscode.window.showTextDocument(document)
      const position = new vscode.Position(line - 1, 0)
      editor.selection = new vscode.Selection(position, position)
      editor.revealRange(new vscode.Range(position, position))
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`)
    }
  }

  private async _exportReport(format: string): Promise<void> {
    const options: vscode.SaveDialogOptions = {
      defaultUri: vscode.Uri.file(`env-security-report.${format}`),
      filters: format === "json" ? { "JSON Files": ["json"] } : { "HTML Files": ["html"] },
    }

    const uri = await vscode.window.showSaveDialog(options)
    if (!uri) return

    try {
      const { Reporter } = await import("../../src/core/reporter.js")
      const content =
        format === "json"
          ? Reporter.generateJsonReport(this._scanResults)
          : Reporter.generateHtmlReport(this._scanResults)

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"))
      vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`)
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export report: ${error}`)
    }
  }

  private _toggleRule(ruleId: string): void {
    vscode.commands.executeCommand("envChecker.toggleRule", ruleId)
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"))
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.css"))

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Env Security Report</title>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="header-title">
                <h1><span class="btn-icon">🛡️</span>Environment Security Report</h1>
                <div class="header-subtitle">Real-time security analysis for your environment files</div>
            </div>
            <div class="header-actions">
                <button id="refreshBtn" class="btn btn-primary">
                    <span class="btn-icon">🔄</span>Refresh
                </button>
                <button id="exportBtn" class="btn btn-secondary">
                    <span class="btn-icon">📊</span>Export
                </button>
            </div>
        </header>

        <div class="summary" id="summary">
            <div class="summary-card critical">
                <div class="summary-number" id="criticalCount">0</div>
                <div class="summary-label">Critical Issues</div>
                <div class="trend-indicator" id="criticalTrend"></div>
            </div>
            <div class="summary-card warning">
                <div class="summary-number" id="warningCount">0</div>
                <div class="summary-label">Warnings</div>
                <div class="trend-indicator" id="warningTrend"></div>
            </div>
            <div class="summary-card info">
                <div class="summary-number" id="infoCount">0</div>
                <div class="summary-label">Info Items</div>
                <div class="trend-indicator" id="infoTrend"></div>
            </div>
            <div class="summary-card risk-score">
                <div class="summary-number" id="riskScore">0</div>
                <div class="summary-label">Risk Score</div>
                <div class="risk-indicator" id="riskIndicator"></div>
                <div class="scan-time" id="scanTime"></div>
            </div>
        </div>

        <div class="visualization-section">
            <div class="chart-header">
                <h3>Security Analysis</h3>
                <div class="chart-controls">
                    <button class="chart-btn active" data-chart="overview">Overview</button>
                    <button class="chart-btn" data-chart="trends">Trends</button>
                    <button class="chart-btn" data-chart="files">By Files</button>
                </div>
            </div>
            <div class="chart-content">
                <canvas id="securityChart" width="400" height="200"></canvas>
            </div>
        </div>

        <div class="controls-section">
            <div class="search-section">
                <div class="search-box">
                    <input type="text" id="searchInput" class="search-input" placeholder="Search findings, files, or rules...">
                    <button id="searchClear" class="search-clear" style="display: none;">✕</button>
                </div>
                <div class="search-stats" id="searchStats"></div>
            </div>

            <div class="filters">
                <div class="filter-group">
                    <label>Severity Filters</label>
                    <div class="filter-buttons">
                        <button class="filter-btn critical active" data-severity="critical">Critical</button>
                        <button class="filter-btn warning active" data-severity="warning">Warning</button>
                        <button class="filter-btn info active" data-severity="info">Info</button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label>Sort By</label>
                    <select id="sortBy" class="filter-select">
                        <option value="severity">Severity</option>
                        <option value="file">File Name</option>
                        <option value="line">Line Number</option>
                        <option value="rule">Rule Type</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>View Mode</label>
                    <select id="viewMode" class="filter-select">
                        <option value="grouped">Grouped by File</option>
                        <option value="list">Flat List</option>
                        <option value="compact">Compact View</option>
                    </select>
                </div>

                <div class="filter-actions">
                    <button id="clearFilters" class="btn btn-small">Clear All</button>
                    <button id="bulkActions" class="btn btn-small">Bulk Actions</button>
                </div>
            </div>
        </div>

        <div class="results-header">
            <div class="results-info">
                <span id="resultsCount">0 findings</span>
                <span id="filterInfo"></span>
            </div>
            <div class="view-controls">
                <button id="expandAll" class="btn btn-small">Expand All</button>
                <button id="collapseAll" class="btn btn-small">Collapse All</button>
            </div>
        </div>

        <div class="results" id="results">
            <div class="no-results" id="noResults">
                <div class="no-results-icon">🎉</div>
                <h3>No Security Issues Found</h3>
                <p>Your environment files look secure!</p>
                <button id="scanBtn" class="btn btn-primary">
                    <span class="btn-icon">🔍</span>Scan Workspace
                </button>
            </div>
        </div>
    </div>

    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Analyzing security patterns...</div>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`
  }
}
