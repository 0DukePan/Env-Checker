# Env-Checker Core Engine

The core scanning engine for environment file security analysis. This package provides framework-agnostic security scanning capabilities that can be integrated into various tools and platforms.

## 🏗️ Architecture

\`\`\`
src/core/
├── types.ts      # TypeScript interfaces and enums
├── rules.ts      # Security rule definitions and patterns
├── scanner.ts    # Main scanning engine
├── reporter.ts   # Report generation and formatting
└── index.ts      # Public API exports
\`\`\`

## 📚 API Reference

### EnvScanner Class

The main scanning engine that processes environment files and detects security issues.

\`\`\`typescript
import { EnvScanner } from 'env-checker-core';

const scanner = new EnvScanner(config);
\`\`\`

#### Methods

##### `scanFile(filePath: string): Promise<ScanResult>`
Scans a single environment file for security issues.

\`\`\`typescript
const result = await scanner.scanFile('.env');
console.log(result.findings); // Array of security findings
\`\`\`

##### `scanContent(content: string, filePath?: string): ScanResult`
Scans environment file content directly.

\`\`\`typescript
const content = 'API_KEY=secret123\nDB_PASSWORD=admin';
const result = scanner.scanContent(content, '.env');
\`\`\`

##### `scanDirectory(dirPath: string): Promise<ScanResult[]>`
Recursively scans a directory for environment files.

\`\`\`typescript
const results = await scanner.scanDirectory('./src');
\`\`\`

### SecurityRules Class

Manages security rule definitions and pattern matching.

\`\`\`typescript
import { SecurityRules } from 'env-checker-core';

const rules = new SecurityRules();
\`\`\`

#### Methods

##### `addRule(rule: SecurityRule): void`
Adds a custom security rule.

\`\`\`typescript
rules.addRule({
  id: 'custom-pattern',
  name: 'Custom Security Pattern',
  pattern: /CUSTOM_.*=.+/,
  severity: Severity.WARNING,
  message: 'Custom pattern detected',
  suggestion: 'Consider using environment-specific values'
});
\`\`\`

##### `removeRule(ruleId: string): boolean`
Removes a security rule by ID.

\`\`\`typescript
const removed = rules.removeRule('weak-password');
\`\`\`

##### `getRules(severity?: Severity): SecurityRule[]`
Gets all rules or filters by severity.

\`\`\`typescript
const criticalRules = rules.getRules(Severity.CRITICAL);
\`\`\`

### ReportGenerator Class

Generates formatted reports from scan results.

\`\`\`typescript
import { ReportGenerator } from 'env-checker-core';

const reporter = new ReportGenerator();
\`\`\`

#### Methods

##### `generateJSON(results: ScanResult[]): string`
Generates a JSON report.

\`\`\`typescript
const jsonReport = reporter.generateJSON(scanResults);
\`\`\`

##### `generateHTML(results: ScanResult[]): string`
Generates an HTML report with styling.

\`\`\`typescript
const htmlReport = reporter.generateHTML(scanResults);
\`\`\`

##### `generateConsole(results: ScanResult[]): string`
Generates a console-friendly text report.

\`\`\`typescript
const consoleReport = reporter.generateConsole(scanResults);
console.log(consoleReport);
\`\`\`

## 🔧 Configuration

### ScannerConfig Interface

\`\`\`typescript
interface ScannerConfig {
  enabledSeverities: Severity[];
  customRules: SecurityRule[];
  excludePatterns: string[];
  includePatterns: string[];
  maxFileSize: number;
  timeout: number;
}
\`\`\`

### Default Configuration

\`\`\`typescript
const defaultConfig: ScannerConfig = {
  enabledSeverities: [Severity.CRITICAL, Severity.WARNING, Severity.INFO],
  customRules: [],
  excludePatterns: ['node_modules/**', '.git/**'],
  includePatterns: ['.env*'],
  maxFileSize: 1024 * 1024, // 1MB
  timeout: 5000 // 5 seconds
};
\`\`\`

## 🛡️ Security Rules

### Built-in Rule Categories

#### Password Detection
- Plain text passwords
- Weak password patterns
- Default credentials

#### API Key Detection
- AWS access keys
- Google API keys
- GitHub tokens
- Generic API key patterns

#### Database Security
- Connection strings with credentials
- Database passwords
- MongoDB URIs

#### Cryptographic Keys
- Private keys (RSA, SSH, etc.)
- JWT signing secrets
- Encryption keys

### Custom Rule Definition

\`\`\`typescript
interface SecurityRule {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  pattern: RegExp;               // Detection pattern
  severity: Severity;            // Issue severity level
  message: string;               // Description of the issue
  suggestion?: string;           // Recommended fix
  category?: string;             // Rule category
  enabled?: boolean;             // Rule enabled state
  tags?: string[];              // Searchable tags
}
\`\`\`

## 📊 Scan Results

### ScanResult Interface

\`\`\`typescript
interface ScanResult {
  filePath: string;              // Scanned file path
  findings: EnvFinding[];        // Security issues found
  scanTime: number;              // Scan duration (ms)
  fileSize: number;              // File size in bytes
  linesScanned: number;          // Total lines processed
  metadata: ScanMetadata;        // Additional scan info
}
\`\`\`

### EnvFinding Interface

\`\`\`typescript
interface EnvFinding {
  ruleId: string;                // Matching rule ID
  severity: Severity;            // Issue severity
  message: string;               // Issue description
  line: number;                  // Line number (1-based)
  column: number;                // Column number (1-based)
  length: number;                // Match length
  value: string;                 // Matched value
  suggestion?: string;           // Fix suggestion
  context: string;               // Surrounding context
}
\`\`\`

## 🧪 Testing

### Unit Tests

\`\`\`bash
npm run test:core              # Run core engine tests
npm run test:rules             # Test security rules
npm run test:scanner           # Test scanning logic
npm run test:reporter          # Test report generation
\`\`\`

### Integration Tests

\`\`\`bash
npm run test:integration       # Full integration tests
\`\`\`

### Performance Tests

\`\`\`bash
npm run test:performance       # Benchmark scanning speed
\`\`\`

## 🔌 Integration Examples

### CLI Tool Integration

\`\`\`typescript
#!/usr/bin/env node
import { EnvScanner, ReportGenerator } from 'env-checker-core';

const scanner = new EnvScanner();
const reporter = new ReportGenerator();

async function main() {
  const results = await scanner.scanDirectory(process.cwd());
  const report = reporter.generateConsole(results);
  console.log(report);
  
  const hasIssues = results.some(r => r.findings.length > 0);
  process.exit(hasIssues ? 1 : 0);
}

main().catch(console.error);
\`\`\`

### Web Application Integration

\`\`\`typescript
import { EnvScanner } from 'env-checker-core';

class SecurityService {
  private scanner = new EnvScanner();
  
  async analyzeUploadedFile(fileContent: string): Promise<SecurityReport> {
    const result = this.scanner.scanContent(fileContent);
    
    return {
      riskScore: this.calculateRiskScore(result.findings),
      issues: result.findings,
      recommendations: this.generateRecommendations(result.findings)
    };
  }
}
\`\`\`

### CI/CD Pipeline Integration

\`\`\`typescript
// GitHub Actions / Jenkins integration
import { EnvScanner } from 'env-checker-core';

const scanner = new EnvScanner({
  enabledSeverities: [Severity.CRITICAL, Severity.WARNING]
});

const results = await scanner.scanDirectory('./');
const criticalIssues = results.flatMap(r => 
  r.findings.filter(f => f.severity === Severity.CRITICAL)
);

if (criticalIssues.length > 0) {
  console.error(`Found ${criticalIssues.length} critical security issues`);
  process.exit(1);
}
\`\`\`

## 📈 Performance Considerations

### Optimization Tips

1. **File Size Limits**: Configure `maxFileSize` to avoid scanning large files
2. **Pattern Efficiency**: Use specific regex patterns to reduce false positives
3. **Exclude Patterns**: Skip unnecessary directories like `node_modules`
4. **Batch Processing**: Process multiple files concurrently
5. **Caching**: Cache scan results for unchanged files

### Benchmarks

- **Small files** (< 1KB): ~1ms per file
- **Medium files** (1-10KB): ~5ms per file  
- **Large files** (10-100KB): ~20ms per file
- **Memory usage**: ~10MB for 1000 files

## 🤝 Contributing

See the main [Contributing Guide](../CONTRIBUTING.md) for development setup and guidelines.

### Core Engine Specific Guidelines

1. **Rule Development**: Add tests for new security patterns
2. **Performance**: Benchmark regex patterns before adding
3. **Documentation**: Update API docs for new features
4. **Backward Compatibility**: Maintain API stability

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.
