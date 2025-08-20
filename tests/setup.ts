import { jest } from "@jest/globals"

// Mock VS Code API
jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn(),
    createFileSystemWatcher: jest.fn(),
    findFiles: jest.fn(),
    openTextDocument: jest.fn(),
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      stat: jest.fn(),
    },
    workspaceFolders: [],
  },
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    createWebviewPanel: jest.fn(),
    showQuickPick: jest.fn(),
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn(),
    activeTextEditor: null,
    visibleTextEditors: [],
  },
  languages: {
    createDiagnosticCollection: jest.fn(),
    registerCodeActionsProvider: jest.fn(),
    getDiagnostics: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path, path })),
    joinPath: jest.fn(),
  },
  Range: jest.fn(),
  Position: jest.fn(),
  Diagnostic: jest.fn(),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  CodeActionKind: {
    QuickFix: "quickfix",
    Refactor: "refactor",
    RefactorRewrite: "refactor.rewrite",
    Source: "source",
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}))

// Global test utilities
global.createMockTextDocument = (content: string, fileName = ".env") => ({
  getText: () => content,
  fileName,
  uri: { fsPath: fileName, path: fileName },
  lineAt: (line: number) => ({
    text: content.split("\n")[line] || "",
    lineNumber: line,
    range: { start: { line, character: 0 }, end: { line, character: 100 } },
    rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line: line + 1, character: 0 } },
  }),
  lineCount: content.split("\n").length,
})

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}
