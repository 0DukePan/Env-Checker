// Core types for the env-checker scanning engine

export interface EnvFinding {
    line: number
    column: number
    key: string
    value: string
    severity: Severity
    ruleId: string
    message: string
    suggestion: string
    quickFix?: QuickFix
  }
  
  export interface QuickFix {
    type: "mask" | "remove" | "comment"
    replacement: string
  }
  
  export enum Severity {
    CRITICAL = "critical",
    WARNING = "warning",
    INFO = "info",
  }
  
  export interface ScanRule {
    id: string
    name: string
    description: string
    severity: Severity
    pattern: RegExp
    keyPattern?: RegExp
    valuePattern?: RegExp
    suggestion: string
    enabled: boolean
  }
  
  export interface ScanResult {
    filePath: string
    findings: EnvFinding[]
    scannedAt: Date
    totalLines: number
    criticalCount: number
    warningCount: number
    infoCount: number
  }
  
  export interface ScannerConfig {
    rules: ScanRule[]
    enabledSeverities: Severity[]
    customRulesPath?: string
    excludePatterns?: string[]
  }
  