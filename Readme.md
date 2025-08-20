# Env-Checker VS Code Extension

A comprehensive security scanner for environment files that provides real-time detection of sensitive data, security vulnerabilities, and configuration issues in your `.env` files.

## 🚀 Features

### Real-Time Security Scanning
- **Instant Detection**: Scans `.env` files as you type
- **Smart Pattern Recognition**: Detects passwords, API keys, database URLs, and more
- **Configurable Rules**: Customize security patterns and severity levels
- **Multi-File Support**: Scans all environment file variants (`.env`, `.env.local`, `.env.production`, etc.)

### Intelligent Quick Fixes
- **Auto-Masking**: Automatically mask sensitive values
- **Smart Comments**: Add security warnings to problematic lines
- **Template Generation**: Create `.env.example` files automatically
- **Bulk Operations**: Fix multiple issues with one click

### Interactive Security Dashboard
- **Visual Reports**: Comprehensive security overview in side panel
- **Filtering & Sorting**: Advanced filtering by severity, file, or rule type
- **Export Capabilities**: Generate reports in JSON, HTML, or console formats
- **Real-Time Statistics**: Track security improvements over time

### Advanced Configuration
- **Custom Rules**: Define your own security patterns
- **Workspace Settings**: Per-project configuration support
- **Rule Profiles**: Switch between different security rule sets
- **Notification Control**: Customize alert levels and frequency

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Env-Checker"
4. Click Install

### From VSIX Package
```bash
code --install-extension env-checker-1.0.0.vsix
```

## 🛠️ Quick Start

1. **Install the extension**
2. **Open a project** with `.env` files
3. **Start coding** - security issues will be highlighted automatically
4. **Use quick fixes** - hover over issues and apply suggested fixes
5. **View dashboard** - open the Env-Checker panel for detailed reports

## ⚙️ Configuration

### Basic Settings
```json
{
  "envChecker.enabledSeverities": ["critical", "warning", "info"],
  "envChecker.notificationLevel": "warning",
  "envChecker.autoScan": true,
  "envChecker.scanOnSave": true
}
```

### Custom Rules
```json
{
  "envChecker.customRules": [
    {
      "id": "custom-api-key",
      "name": "Custom API Key Pattern",
      "pattern": "CUSTOM_API_.*=.+",
      "severity": "critical",
      "message": "Custom API key detected"
    }
  ]
}
```

## 🔧 Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Env-Checker: Scan Current File` | Manually scan the active file | `Ctrl+Shift+E` |
| `Env-Checker: Scan Workspace` | Scan all environment files | `Ctrl+Shift+W` |
| `Env-Checker: Open Dashboard` | Show security dashboard | `Ctrl+Shift+D` |
| `Env-Checker: Generate Report` | Export security report | - |
| `Env-Checker: Settings` | Open extension settings | - |

## 🛡️ Security Rules

### Built-in Detection Patterns

#### Critical Issues
- **Passwords**: Plain text passwords in environment variables
- **Private Keys**: RSA, SSH, and other private key formats
- **Database URLs**: Connection strings with embedded credentials
- **JWT Secrets**: JSON Web Token signing keys

#### Warning Issues
- **API Keys**: Third-party service API keys
- **Tokens**: Authentication and access tokens
- **Debug Mode**: Production debug flags enabled
- **Weak Secrets**: Short or predictable secret values

#### Info Issues
- **Missing Variables**: Referenced but undefined variables
- **Deprecated Patterns**: Outdated configuration formats
- **Best Practices**: Recommendations for better security

## 📊 Dashboard Features

### Security Overview
- **Risk Score**: Overall security assessment
- **Issue Distribution**: Breakdown by severity level
- **File Coverage**: Scanned files and their status
- **Trend Analysis**: Security improvements over time

### Advanced Filtering
- **By Severity**: Filter critical, warning, or info issues
- **By File**: Focus on specific environment files
- **By Rule Type**: Filter by security pattern categories
- **By Status**: Show resolved or pending issues

### Export Options
- **JSON Report**: Machine-readable security data
- **HTML Report**: Formatted report for sharing
- **CSV Export**: Spreadsheet-compatible format
- **Console Output**: Developer-friendly text format

## 🔌 API Usage

The core scanning engine can be used independently:

```typescript
import { EnvScanner, SecurityRules } from 'env-checker-core';

const scanner = new EnvScanner();
const results = await scanner.scanFile('.env');

console.log(`Found ${results.findings.length} security issues`);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/your-org/env-checker
cd env-checker
npm install
npm run compile
```

### Running Tests
```bash
npm test                    # Run all tests
npm run test:core          # Test core engine only
npm run test:extension     # Test VS Code extension
npm run test:coverage      # Generate coverage report
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/your-org/env-checker/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/your-org/env-checker/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/env-checker/wiki)

## 🏆 Acknowledgments

- VS Code Extension API documentation
- Security research from OWASP
- Community feedback and contributions