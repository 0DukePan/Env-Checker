// JavaScript for the webview panel with advanced visualization features

;(() => {
    const vscode = window.acquireVsCodeApi()
    let currentResults = []
    let filteredResults = []
    let searchTerm = ""
    let activeFilters = { critical: true, warning: true, info: true }
    let currentChart = "overview"
    const securityChart = null
  
    // DOM elements
    const elements = {
      criticalCount: document.getElementById("criticalCount"),
      warningCount: document.getElementById("warningCount"),
      infoCount: document.getElementById("infoCount"),
      riskScore: document.getElementById("riskScore"),
      riskIndicator: document.getElementById("riskIndicator"),
      scanTime: document.getElementById("scanTime"),
      results: document.getElementById("results"),
      noResults: document.getElementById("noResults"),
      searchInput: document.getElementById("searchInput"),
      searchClear: document.getElementById("searchClear"),
      searchStats: document.getElementById("searchStats"),
      sortBy: document.getElementById("sortBy"),
      viewMode: document.getElementById("viewMode"),
      resultsCount: document.getElementById("resultsCount"),
      filterInfo: document.getElementById("filterInfo"),
      refreshBtn: document.getElementById("refreshBtn"),
      exportBtn: document.getElementById("exportBtn"),
      scanBtn: document.getElementById("scanBtn"),
      clearFilters: document.getElementById("clearFilters"),
      bulkActions: document.getElementById("bulkActions"),
      expandAll: document.getElementById("expandAll"),
      collapseAll: document.getElementById("collapseAll"),
      loadingOverlay: document.getElementById("loadingOverlay"),
      securityChart: document.getElementById("securityChart"),
    }
  
    elements.refreshBtn.addEventListener("click", () => {
      showLoading("Refreshing scan results...")
      vscode.postMessage({ type: "refreshScan" })
    })
  
    elements.exportBtn.addEventListener("click", () => {
      showExportDialog()
    })
  
    elements.scanBtn.addEventListener("click", () => {
      showLoading("Scanning workspace...")
      vscode.postMessage({ type: "refreshScan" })
    })
  
    elements.searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase()
      elements.searchClear.style.display = searchTerm ? "block" : "none"
      applyFiltersAndRender()
    })
  
    elements.searchClear.addEventListener("click", () => {
      elements.searchInput.value = ""
      searchTerm = ""
      elements.searchClear.style.display = "none"
      applyFiltersAndRender()
    })
  
    elements.sortBy.addEventListener("change", () => {
      applyFiltersAndRender()
    })
  
    elements.viewMode.addEventListener("change", () => {
      applyFiltersAndRender()
    })
  
    elements.clearFilters.addEventListener("click", () => {
      clearAllFilters()
    })
  
    elements.bulkActions.addEventListener("click", () => {
      showBulkActionsDialog()
    })
  
    elements.expandAll.addEventListener("click", () => {
      toggleAllFileGroups(false)
    })
  
    elements.collapseAll.addEventListener("click", () => {
      toggleAllFileGroups(true)
    })
  
    // Severity filter buttons
    document.querySelectorAll(".filter-btn[data-severity]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const severity = btn.dataset.severity
        activeFilters[severity] = !activeFilters[severity]
        btn.classList.toggle("active", activeFilters[severity])
        applyFiltersAndRender()
      })
    })
  
    // Chart control buttons
    document.querySelectorAll(".chart-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chart-btn").forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        currentChart = btn.dataset.chart
        renderChart()
      })
    })
  
    // Listen for messages from the extension
    window.addEventListener("message", (event) => {
      const message = event.data
      switch (message.type) {
        case "updateResults":
          currentResults = message.results || []
          hideLoading()
          updateSummary()
          applyFiltersAndRender()
          renderChart()
          break
      }
    })
  
    function updateSummary() {
      const stats = calculateAdvancedStats(currentResults)
  
      elements.criticalCount.textContent = stats.critical
      elements.warningCount.textContent = stats.warning
      elements.infoCount.textContent = stats.info
      elements.riskScore.textContent = stats.riskScore
      elements.scanTime.textContent = `Last scan: ${new Date().toLocaleTimeString()}`
  
      // Update risk indicator
      const riskPercentage = Math.min(100, (stats.riskScore / 100) * 100)
      elements.riskIndicator.style.setProperty("--risk-width", `${riskPercentage}%`)
  
      // Update trend indicators (mock data for demo)
      updateTrendIndicators(stats)
    }
  
    function calculateAdvancedStats(results) {
      const stats = results.reduce(
        (acc, result) => {
          result.findings?.forEach((finding) => {
            switch (finding.severity) {
              case "critical":
                acc.critical++
                acc.riskScore += 10
                break
              case "warning":
                acc.warning++
                acc.riskScore += 5
                break
              case "info":
                acc.info++
                acc.riskScore += 1
                break
            }
          })
          acc.files++
          return acc
        },
        { critical: 0, warning: 0, info: 0, files: 0, riskScore: 0 },
      )
  
      return stats
    }
  
    function updateTrendIndicators(stats) {
      // Mock trend data - in real implementation, this would compare with previous scans
      const trends = {
        critical: Math.random() > 0.5 ? "↓ -2" : "↑ +1",
        warning: Math.random() > 0.5 ? "↓ -5" : "↑ +3",
        info: Math.random() > 0.5 ? "↓ -1" : "↑ +2",
      }
  
      document.getElementById("criticalTrend").textContent = trends.critical
      document.getElementById("warningTrend").textContent = trends.warning
      document.getElementById("infoTrend").textContent = trends.info
    }
  
    function applyFiltersAndRender() {
      filteredResults = filterResults(currentResults)
      updateSearchStats()
      renderResults()
    }
  
    function filterResults(results) {
      const filtered = results.map((result) => ({
        ...result,
        findings:
          result.findings?.filter((finding) => {
            // Severity filter
            if (!activeFilters[finding.severity]) return false
  
            // Search filter
            if (searchTerm) {
              const searchableText = [finding.message, finding.key, finding.value, finding.suggestion, result.filePath]
                .join(" ")
                .toLowerCase()
  
              if (!searchableText.includes(searchTerm)) return false
            }
  
            return true
          }) || [],
      }))
  
      return filtered.filter((result) => result.findings.length > 0)
    }
  
    function updateSearchStats() {
      const totalFindings = filteredResults.reduce((sum, result) => sum + result.findings.length, 0)
      const totalFiles = filteredResults.length
  
      let statsText = `${totalFindings} findings in ${totalFiles} files`
  
      if (searchTerm) {
        statsText += ` matching "${searchTerm}"`
      }
  
      const activeFilterCount = Object.values(activeFilters).filter(Boolean).length
      if (activeFilterCount < 3) {
        const activeTypes = Object.entries(activeFilters)
          .filter(([_, active]) => active)
          .map(([type, _]) => type)
          .join(", ")
        statsText += ` (${activeTypes} only)`
      }
  
      elements.searchStats.textContent = statsText
      elements.resultsCount.textContent = `${totalFindings} findings`
      elements.filterInfo.textContent = totalFiles > 0 ? `across ${totalFiles} files` : ""
    }
  
    function renderResults() {
      const viewMode = elements.viewMode.value
      const sortBy = elements.sortBy.value
  
      if (filteredResults.length === 0 || filteredResults.every((r) => r.findings.length === 0)) {
        elements.results.innerHTML = elements.noResults.outerHTML
        return
      }
  
      let html = ""
      switch (viewMode) {
        case "grouped":
          html = renderGroupedView(filteredResults, sortBy)
          break
        case "list":
          html = renderListView(filteredResults, sortBy)
          break
        case "compact":
          html = renderCompactView(filteredResults, sortBy)
          break
      }
  
      elements.results.innerHTML = html
      elements.results.classList.add("fade-in")
  
      // Add event listeners
      addActionListeners()
      highlightSearchTerms()
    }
  
    function renderGroupedView(results, sortBy) {
      const sortedResults = sortResultsByFile(results, sortBy)
      return sortedResults.map((result) => renderFileGroup(result)).join("")
    }
  
    function renderListView(results, sortBy) {
      const allFindings = results.flatMap((result) =>
        result.findings.map((finding) => ({ ...finding, filePath: result.filePath })),
      )
      const sortedFindings = sortFindings(allFindings, sortBy)
  
      return `
        <div class="file-group">
          <div class="file-header">
            <div class="file-header-left">
              <span class="file-path">All Findings</span>
            </div>
            <div class="file-stats">${allFindings.length} total findings</div>
          </div>
          <div class="file-findings">
            ${sortedFindings.map((finding) => renderFinding(finding, finding.filePath)).join("")}
          </div>
        </div>
      `
    }
  
    function renderCompactView(results, sortBy) {
      const allFindings = results.flatMap((result) =>
        result.findings.map((finding) => ({ ...finding, filePath: result.filePath })),
      )
      const sortedFindings = sortFindings(allFindings, sortBy)
  
      return sortedFindings
        .map(
          (finding) => `
        <div class="finding compact">
          <div class="finding-header">
            <div class="finding-title">
              <span class="severity-badge ${finding.severity}">${finding.severity}</span>
              <span class="finding-message">${finding.message}</span>
              <span class="finding-file">${finding.filePath.split("/").pop()}:${finding.line}</span>
            </div>
            <div class="finding-actions">
              <button class="btn btn-small" onclick="openFile('${finding.filePath}', ${finding.line})">Open</button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
    }
  
    function sortResultsByFile(results, sortBy) {
      return results.map((result) => ({
        ...result,
        findings: sortFindings(result.findings, sortBy),
      }))
    }
  
    function sortFindings(findings, sortBy) {
      const sortedFindings = [...findings]
  
      switch (sortBy) {
        case "severity":
          const severityOrder = { critical: 0, warning: 1, info: 2 }
          sortedFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
          break
        case "line":
          sortedFindings.sort((a, b) => a.line - b.line)
          break
        case "rule":
          sortedFindings.sort((a, b) => (a.ruleId || "").localeCompare(b.ruleId || ""))
          break
        case "file":
          sortedFindings.sort((a, b) => (a.filePath || "").localeCompare(b.filePath || ""))
          break
      }
  
      return sortedFindings
    }
  
    function renderFileGroup(result) {
      if (result.findings.length === 0) return ""
  
      const fileName = result.filePath.split("/").pop() || result.filePath
      const stats = calculateFileStats(result.findings)
  
      return `
        <div class="file-group slide-in">
          <div class="file-header" onclick="window.toggleFileGroup(this)">
            <div class="file-header-left">
              <span class="file-toggle">▼</span>
              <span class="file-path" title="${result.filePath}">${fileName}</span>
            </div>
            <div class="file-stats">
              <span>${stats.critical} critical</span>
              <span>${stats.warning} warnings</span>
              <span>${stats.info} info</span>
            </div>
          </div>
          <div class="file-findings">
            ${result.findings.map((finding) => renderFinding(finding, result.filePath)).join("")}
          </div>
        </div>
      `
    }
  
    function calculateFileStats(findings) {
      return findings.reduce(
        (stats, finding) => {
          stats[finding.severity]++
          return stats
        },
        { critical: 0, warning: 0, info: 0 },
      )
    }
  
    function renderFinding(finding, filePath) {
      return `
        <div class="finding" data-finding-id="${finding.ruleId}-${finding.line}">
          <div class="finding-header">
            <div class="finding-title">
              <span class="severity-badge ${finding.severity}">${finding.severity}</span>
              <span class="finding-message">${finding.message}</span>
            </div>
            <div class="finding-actions">
              <button class="btn btn-small" onclick="openFile('${filePath}', ${finding.line})">
                <span class="btn-icon">📂</span>Open
              </button>
              <button class="btn btn-small" onclick="applyFix('${filePath}', ${finding.line}, 'comment')">
                <span class="btn-icon">💬</span>Comment
              </button>
              <button class="btn btn-small" onclick="applyFix('${filePath}', ${finding.line}, 'mask')">
                <span class="btn-icon">🎭</span>Mask
              </button>
            </div>
          </div>
          <div class="finding-details">
            <div class="finding-line">Line ${finding.line}: ${finding.key || "N/A"}</div>
            <div class="finding-code">${finding.key || ""}=${finding.value || ""}</div>
            ${finding.suggestion ? `<div class="finding-suggestion">${finding.suggestion}</div>` : ""}
          </div>
        </div>
      `
    }
  
    function renderChart() {
      const canvas = elements.securityChart
      const ctx = canvas.getContext("2d")
  
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
  
      switch (currentChart) {
        case "overview":
          renderOverviewChart(ctx, canvas)
          break
        case "trends":
          renderTrendsChart(ctx, canvas)
          break
        case "files":
          renderFileChart(ctx, canvas)
          break
      }
    }
  
    function renderOverviewChart(ctx, canvas) {
      const stats = calculateAdvancedStats(currentResults)
      const data = [
        { label: "Critical", value: stats.critical, color: "#f44336" },
        { label: "Warning", value: stats.warning, color: "#ff9800" },
        { label: "Info", value: stats.info, color: "#2196f3" },
      ]
  
      const total = data.reduce((sum, item) => sum + item.value, 0)
      if (total === 0) {
        renderEmptyChart(ctx, canvas, "No issues found")
        return
      }
  
      // Draw donut chart
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.min(centerX, centerY) - 20
      const innerRadius = radius * 0.6
  
      let currentAngle = -Math.PI / 2
  
      data.forEach((item) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI
  
        // Draw slice
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true)
        ctx.closePath()
        ctx.fillStyle = item.color
        ctx.fill()
  
        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2
        const labelX = centerX + Math.cos(labelAngle) * (radius + 15)
        const labelY = centerY + Math.sin(labelAngle) * (radius + 15)
  
        ctx.fillStyle = "#ffffff"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`${item.label}: ${item.value}`, labelX, labelY)
  
        currentAngle += sliceAngle
      })
  
      // Draw center text
      ctx.fillStyle = "#ffffff"
      ctx.font = "16px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(`${total}`, centerX, centerY - 5)
      ctx.font = "12px sans-serif"
      ctx.fillText("Total Issues", centerX, centerY + 10)
    }
  
    function renderTrendsChart(ctx, canvas) {
      // Mock trend data - in real implementation, this would use historical data
      const trendData = [
        { week: "Week 1", critical: 15, warning: 25, info: 10 },
        { week: "Week 2", critical: 12, warning: 20, info: 8 },
        { week: "Week 3", critical: 8, warning: 15, info: 12 },
        { week: "Week 4", critical: 5, warning: 10, info: 6 },
      ]
  
      const maxValue = Math.max(...trendData.flatMap((d) => [d.critical, d.warning, d.info]))
      const chartHeight = canvas.height - 60
      const chartWidth = canvas.width - 80
      const barWidth = chartWidth / trendData.length / 3 - 5
  
      trendData.forEach((data, index) => {
        const x = 40 + index * (chartWidth / trendData.length)
  
        // Draw bars
        const criticalHeight = (data.critical / maxValue) * chartHeight
        const warningHeight = (data.warning / maxValue) * chartHeight
        const infoHeight = (data.info / maxValue) * chartHeight
  
        ctx.fillStyle = "#f44336"
        ctx.fillRect(x, canvas.height - 30 - criticalHeight, barWidth, criticalHeight)
  
        ctx.fillStyle = "#ff9800"
        ctx.fillRect(x + barWidth + 2, canvas.height - 30 - warningHeight, barWidth, warningHeight)
  
        ctx.fillStyle = "#2196f3"
        ctx.fillRect(x + (barWidth + 2) * 2, canvas.height - 30 - infoHeight, barWidth, infoHeight)
  
        // Draw week label
        ctx.fillStyle = "#ffffff"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(data.week, x + barWidth, canvas.height - 10)
      })
    }
  
    function renderFileChart(ctx, canvas) {
      const fileStats = currentResults.map((result) => ({
        name: result.filePath.split("/").pop() || result.filePath,
        issues: result.findings?.length || 0,
      }))
  
      if (fileStats.length === 0) {
        renderEmptyChart(ctx, canvas, "No files scanned")
        return
      }
  
      const maxIssues = Math.max(...fileStats.map((f) => f.issues))
      const barHeight = (canvas.height - 40) / fileStats.length - 5
  
      fileStats.forEach((file, index) => {
        const y = 20 + index * (barHeight + 5)
        const barWidth = (file.issues / maxIssues) * (canvas.width - 100)
  
        // Draw bar
        ctx.fillStyle = file.issues > 10 ? "#f44336" : file.issues > 5 ? "#ff9800" : "#2196f3"
        ctx.fillRect(80, y, barWidth, barHeight)
  
        // Draw file name
        ctx.fillStyle = "#ffffff"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "right"
        ctx.fillText(file.name, 75, y + barHeight / 2 + 3)
  
        // Draw issue count
        ctx.textAlign = "left"
        ctx.fillText(file.issues.toString(), 85 + barWidth, y + barHeight / 2 + 3)
      })
    }
  
    function renderEmptyChart(ctx, canvas, message) {
      ctx.fillStyle = "#666666"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(message, canvas.width / 2, canvas.height / 2)
    }
  
    function highlightSearchTerms() {
      if (!searchTerm) return
  
      document.querySelectorAll(".finding").forEach((finding) => {
        const textElements = finding.querySelectorAll(".finding-message, .finding-code, .finding-suggestion")
        textElements.forEach((element) => {
          const text = element.textContent
          const highlightedText = text.replace(
            new RegExp(`(${searchTerm})`, "gi"),
            '<mark style="background: var(--vscode-editor-findMatchHighlightBackground);">$1</mark>',
          )
          if (highlightedText !== text) {
            element.innerHTML = highlightedText
            finding.classList.add("highlighted")
          }
        })
      })
    }
  
    function clearAllFilters() {
      // Reset search
      elements.searchInput.value = ""
      searchTerm = ""
      elements.searchClear.style.display = "none"
  
      // Reset severity filters
      activeFilters = { critical: true, warning: true, info: true }
      document.querySelectorAll(".filter-btn[data-severity]").forEach((btn) => {
        btn.classList.add("active")
      })
  
      // Reset sort and view
      elements.sortBy.value = "severity"
      elements.viewMode.value = "grouped"
  
      applyFiltersAndRender()
    }
  
    function toggleAllFileGroups(collapse) {
      document.querySelectorAll(".file-group").forEach((group) => {
        if (collapse) {
          group.classList.add("collapsed")
        } else {
          group.classList.remove("collapsed")
        }
      })
    }
  
    function showLoading(message = "Loading...") {
      elements.loadingOverlay.querySelector(".loading-text").textContent = message
      elements.loadingOverlay.classList.add("show")
    }
  
    function hideLoading() {
      elements.loadingOverlay.classList.remove("show")
    }
  
    function addActionListeners() {
      // File group toggle listeners
      document.querySelectorAll(".file-header").forEach((header) => {
        header.addEventListener("click", () => window.toggleFileGroup(header))
      })
    }
  
    function showExportDialog() {
      const html = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
          <div style="background: var(--vscode-editor-background); padding: 20px; border-radius: 8px; border: 1px solid var(--vscode-panel-border); min-width: 300px;">
            <h3>Export Security Report</h3>
            <p>Choose export format and options:</p>
            <div style="margin: 15px 0;">
              <label style="display: block; margin-bottom: 10px;">
                <input type="checkbox" id="includeResolved" checked> Include resolved issues
              </label>
              <label style="display: block; margin-bottom: 10px;">
                <input type="checkbox" id="includeCharts" checked> Include visualizations
              </label>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button class="btn btn-primary" onclick="exportReport('html')">
                <span class="btn-icon">📄</span>HTML Report
              </button>
              <button class="btn btn-primary" onclick="exportReport('json')">
                <span class="btn-icon">📊</span>JSON Data
              </button>
              <button class="btn btn-secondary" onclick="window.closeDialog()">Cancel</button>
            </div>
          </div>
        </div>
      `
  
      document.body.insertAdjacentHTML("beforeend", html)
    }
  
    function showBulkActionsDialog() {
      const selectedFindings = getSelectedFindings()
      const html = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
          <div style="background: var(--vscode-editor-background); padding: 20px; border-radius: 8px; border: 1px solid var(--vscode-panel-border); min-width: 300px;">
            <h3>Bulk Actions</h3>
            <p>Apply fixes to ${selectedFindings.length} selected findings:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
              <button class="btn btn-primary" onclick="bulkFix('comment')">
                <span class="btn-icon">💬</span>Comment All
              </button>
              <button class="btn btn-primary" onclick="bulkFix('mask')">
                <span class="btn-icon">🎭</span>Mask All
              </button>
              <button class="btn btn-primary" onclick="bulkFix('remove')">
                <span class="btn-icon">🗑️</span>Remove All
              </button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button class="btn btn-secondary" onclick="window.closeDialog()">Cancel</button>
            </div>
          </div>
        </div>
      `
  
      document.body.insertAdjacentHTML("beforeend", html)
    }
  
    function getSelectedFindings() {
      // For demo purposes, return all visible findings
      // In real implementation, this would return actually selected findings
      return filteredResults.flatMap((result) =>
        result.findings.map((finding) => ({ ...finding, filePath: result.filePath })),
      )
    }
  
    // Global functions for onclick handlers
    window.openFile = (filePath, line) => {
      vscode.postMessage({
        type: "openFile",
        filePath: filePath,
        line: line,
      })
    }
  
    window.applyFix = (filePath, line, fixType) => {
      showLoading(`Applying ${fixType} fix...`)
      vscode.postMessage({
        type: "applyFix",
        filePath: filePath,
        line: line,
        fixType: fixType,
      })
    }
  
    window.bulkFix = (fixType) => {
      const findings = getSelectedFindings()
      showLoading(`Applying ${fixType} fix to ${findings.length} findings...`)
      vscode.postMessage({
        type: "bulkFix",
        fixType: fixType,
        findings: findings,
      })
      window.closeDialog()
    }
  
    window.exportReport = (format) => {
      showLoading("Generating report...")
      vscode.postMessage({
        type: "exportReport",
        format: format,
      })
      window.closeDialog()
    }
  
    window.closeDialog = () => {
      const dialog = document.querySelector('[style*="position: fixed"]')
      if (dialog) {
        dialog.remove()
      }
    }
  
    window.toggleFileGroup = (header) => {
      const fileGroup = header.closest(".file-group")
      fileGroup.classList.toggle("collapsed")
    }
  
    // Initialize
    updateSummary()
    applyFiltersAndRender()
    renderChart()
  })()
  