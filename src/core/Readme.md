
# Env-Checker Core Engine 🔍

Welcome to the **core of Env-Checker** – your friendly watchdog for `.env` files.  
Think of it as that extra pair of eyes making sure your API keys, secrets, and credentials don’t accidentally slip into GitHub (we’ve all been there).

---

## 🚀 What’s This All About?

Accidentally pushing secrets to a repo can be devastating.  
This core engine acts as your **safety net** – scanning `.env` files for sensitive values before they become a security incident.

✅ Works everywhere – CLI tools, VS Code extensions, web apps.  
✅ Fast, reliable, and customizable.  
✅ Designed by developers, for developers.

---

## 📂 Project Structure

```
src/core/
├── types.ts      # Interfaces, enums, type definitions
├── rules.ts      # Security rules & regex patterns
├── scanner.ts    # The main engine that scans env files
├── reporter.ts   # Generates human-friendly reports
└── index.ts      # One-stop entry point
```

---

## 🛠 Meet the `EnvScanner`

This is the hero of Env-Checker. It scans your env files and reports any suspicious values.

```ts
import { EnvScanner } from 'env-checker-core';

const scanner = new EnvScanner();
const result = await scanner.scanFile('.env');

if (result.findings.length > 0) {
  console.log('⚠️ Found some issues!');
}
```

---

## 🔍 What Can It Do?

### Scan a File
```ts
const result = await scanner.scanFile('.env.production');
console.log(`Found ${result.findings.length} issues`);
```

### Scan Raw Content
```ts
const envContent = 'API_KEY=super-secret
DB_PASSWORD=123456';
const result = scanner.scanContent(envContent, '.env');
```

### Scan a Whole Directory
```ts
const results = await scanner.scanDirectory('./config');
results.forEach(r => {
  if (r.findings.length > 0) {
    console.log(`${r.filePath} has issues!`);
  }
});
```

---

## 🎯 Custom Rules

Tweak the scanner to fit your project.

```ts
import { SecurityRules, Severity } from 'env-checker-core';

const rules = new SecurityRules();

rules.addRule({
  id: 'internal-pattern',
  name: 'Internal Secrets Check',
  pattern: /INTERNAL_.*=.+/,
  severity: Severity.WARNING,
  message: 'Possible internal secret found',
  suggestion: 'Consider moving to a vault or safer config'
});

rules.removeRule('default-rule-id');
```

---

## 📝 Findings Format

When something is caught, you’ll get a structured finding:

```ts
interface EnvFinding {
  ruleId: string;
  severity: Severity;
  message: string;
  line: number;
  column: number;
  value: string;
  suggestion?: string;
  context: string;
}
```

---

## 📊 Reporting Made Easy

Readable reports for different contexts:

```ts
import { ReportGenerator } from 'env-checker-core';

const reporter = new ReportGenerator();

console.log(reporter.generateConsole(results));   // Pretty CLI output
const html = reporter.generateHTML(results);      // For teams
const json = reporter.generateJSON(results);      // For CI/CD
```

---

## 🛡 What It Detects

- **Obvious risks** → plain-text passwords, API keys, DB credentials  
- **Sneaky mistakes** → weak passwords, debug flags, default creds  
- **Critical issues** → private keys, JWT secrets, AWS access keys  

---

## 🧑‍💻 Real-World Examples

### CLI Tool

```ts
#!/usr/bin/env node
import { EnvScanner, ReportGenerator } from 'env-checker-core';

async function checkProject() {
  const scanner = new EnvScanner();
  const reporter = new ReportGenerator();

  console.log('🔍 Scanning project...');
  const results = await scanner.scanDirectory(process.cwd());

  console.log(reporter.generateConsole(results));

  const hasCritical = results.some(r =>
    r.findings.some(f => f.severity === 'CRITICAL')
  );

  if (hasCritical) {
    console.error('❌ Critical issues found! Fix before deploy.');
    process.exit(1);
  } else {
    console.log('✅ No critical issues found.');
  }
}

checkProject().catch(console.error);
```

### Web App Integration

```ts
class SecurityService {
  private scanner = new EnvScanner();

  async checkUploaded(fileContent: string) {
    const result = this.scanner.scanContent(fileContent);

    const riskScore = result.findings.reduce((score, f) => {
      switch (f.severity) {
        case 'CRITICAL': return score + 10;
        case 'WARNING': return score + 5;
        case 'INFO': return score + 1;
        default: return score;
      }
    }, 0);

    return {
      riskScore,
      issues: result.findings,
      recommendation: riskScore > 20
        ? '⚠️ Serious security risks detected!'
        : '✅ Looks good, only minor issues.'
    };
  }
}
```

---

## ⚡ Performance Tips

- Skip large files → set a `maxFileSize`  
- Ignore junk → use `excludePatterns` (e.g. `node_modules`, `dist`)  
- Tight regex = fewer false positives  
- Cache results for unchanged files  

---

## ⚙️ Configuration

```ts
const config = {
  enabledSeverities: ['CRITICAL', 'WARNING'],
  excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
  includePatterns: ['.env*', '*.config.js'],
  maxFileSize: 1024 * 1024,
  timeout: 5000
};

const scanner = new EnvScanner(config);
```

---

## 🤝 Contributing

We’d love your help! 🎉  
- Suggest new rules  
- Optimize regex  
- Improve performance  
- Add docs & tests  

Check out the **[Contributing Guide](../CONTRIBUTING.md)** to get started.

---

*Built with ❤️ by developers who’ve leaked way too many secrets, so you don’t have to.*