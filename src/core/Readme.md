# Env-Checker Core Engine 🔍

Hey there! Welcome to the heart of our environment file security scanner. Think of this as your trusty sidekick that catches all those "oops, did I just commit my API key?" moments before they become expensive mistakes.

## What's This All About?

You know that sinking feeling when you realize you've pushed sensitive credentials to GitHub? Yeah, we've all been there. This core engine is designed to be your safety net - it scans your `.env` files and catches security issues before they bite you.

The best part? It's framework-agnostic, so whether you're building a VS Code extension, a CLI tool, or integrating it into your web app, this engine has got your back.

## How It's Organized

\`\`\`
src/core/
├── types.ts      # All the TypeScript magic (interfaces, enums, etc.)
├── rules.ts      # The security patterns that catch the bad stuff
├── scanner.ts    # The main engine that does the heavy lifting
├── reporter.ts   # Makes pretty reports from ugly security issues
└── index.ts      # Your one-stop shop for imports
\`\`\`

## Getting Started (The Fun Part!)

### Meet Your New Best Friend: EnvScanner

This is where the magic happens. The `EnvScanner` class is like having a security expert looking over your shoulder, but less annoying.

\`\`\`typescript
import { EnvScanner } from 'env-checker-core';

// Create your scanner (it's that easy!)
const scanner = new EnvScanner();

// Scan a file - it'll tell you what's wrong
const result = await scanner.scanFile('.env');
if (result.findings.length > 0) {
  console.log('Uh oh, found some issues!');
}
\`\`\`

### What Can It Do?

**Scan Individual Files**
\`\`\`typescript
// Point it at a file and let it work
const result = await scanner.scanFile('.env.production');
console.log(`Found ${result.findings.length} potential issues`);
\`\`\`

**Scan Content Directly**
\`\`\`typescript
// Got some env content as a string? No problem!
const envContent = 'API_KEY=super-secret-key\nDB_PASSWORD=admin123';
const result = scanner.scanContent(envContent, '.env');
\`\`\`

**Scan Entire Directories**
\`\`\`typescript
// Go wild - scan everything!
const results = await scanner.scanDirectory('./config');
results.forEach(result => {
  if (result.findings.length > 0) {
    console.log(`${result.filePath} has some issues we should talk about...`);
  }
});
\`\`\`

## Customizing Your Security Rules

Don't like our rules? Think we're being too strict? No worries - you're the boss!

\`\`\`typescript
import { SecurityRules, Severity } from 'env-checker-core';

const rules = new SecurityRules();

// Add your own rule (because you know your codebase best)
rules.addRule({
  id: 'my-custom-pattern',
  name: 'My Super Important Security Check',
  pattern: /INTERNAL_.*=.+/,
  severity: Severity.WARNING,
  message: 'Hey, this looks like internal stuff that maybe shouldn\'t be here',
  suggestion: 'Consider moving this to a secure vault or using environment-specific configs'
});

// Don't like a rule? Kick it out!
rules.removeRule('that-annoying-rule-id');
\`\`\`

## Making Sense of the Results

When the scanner finds issues, it doesn't just say "something's wrong" and leave you hanging. It gives you the full story:

\`\`\`typescript
interface EnvFinding {
  ruleId: string;        // Which rule caught this
  severity: Severity;    // How worried should you be?
  message: string;       // What's actually wrong
  line: number;          // Exactly where to look
  column: number;        // Even more precise!
  value: string;         // The problematic value
  suggestion?: string;   // How to fix it (we're helpful like that)
  context: string;       // What's around it for context
}
\`\`\`

## Pretty Reports That Actually Help

Nobody likes staring at raw JSON when there's a security issue. Our reporter makes things readable:

\`\`\`typescript
import { ReportGenerator } from 'env-checker-core';

const reporter = new ReportGenerator();

// For your terminal
const consoleReport = reporter.generateConsole(scanResults);
console.log(consoleReport); // Nice, colorful output

// For sharing with the team
const htmlReport = reporter.generateHTML(scanResults);

// For your CI/CD pipeline
const jsonReport = reporter.generateJSON(scanResults);
\`\`\`

## What We're Looking For (The Security Stuff)

Our scanner is pretty smart about catching common mistakes:

**The Obvious Ones**
- Plain text passwords (seriously, don't do this)
- API keys just sitting there in the open
- Database connection strings with credentials

**The Sneaky Ones**
- Weak password patterns
- Default credentials that everyone knows
- Debug flags left on in production (we've all done it)

**The Really Bad Ones**
- Private keys (RSA, SSH, you name it)
- JWT signing secrets
- AWS access keys

## Real-World Examples

### Building a CLI Tool
\`\`\`typescript
#!/usr/bin/env node
import { EnvScanner, ReportGenerator } from 'env-checker-core';

async function checkMyProject() {
  const scanner = new EnvScanner();
  const reporter = new ReportGenerator();
  
  console.log('🔍 Scanning your project for security issues...');
  
  const results = await scanner.scanDirectory(process.cwd());
  const report = reporter.generateConsole(results);
  
  console.log(report);
  
  // Exit with error if we found critical issues
  const hasCriticalIssues = results.some(r => 
    r.findings.some(f => f.severity === 'CRITICAL')
  );
  
  if (hasCriticalIssues) {
    console.log('❌ Found critical security issues - please fix before deploying!');
    process.exit(1);
  } else {
    console.log('✅ All good! No critical security issues found.');
  }
}

checkMyProject().catch(console.error);
\`\`\`

### Web App Integration
\`\`\`typescript
class SecurityService {
  private scanner = new EnvScanner();
  
  async checkUploadedConfig(fileContent: string) {
    const result = this.scanner.scanContent(fileContent);
    
    // Calculate a simple risk score
    const riskScore = result.findings.reduce((score, finding) => {
      switch (finding.severity) {
        case 'CRITICAL': return score + 10;
        case 'WARNING': return score + 5;
        case 'INFO': return score + 1;
        default: return score;
      }
    }, 0);
    
    return {
      riskScore,
      issues: result.findings,
      recommendation: riskScore > 20 ? 
        'This file has serious security concerns!' : 
        'Looks pretty good, just a few minor things to clean up.'
    };
  }
}
\`\`\`

## Performance Tips (Because Speed Matters)

- **Don't scan huge files**: Set a reasonable `maxFileSize` limit
- **Skip the junk**: Use `excludePatterns` to avoid `node_modules` and other irrelevant directories
- **Be specific with patterns**: Tight regex patterns = fewer false positives = happier developers
- **Cache when possible**: If a file hasn't changed, don't scan it again

## Configuration That Makes Sense

\`\`\`typescript
const myConfig = {
  enabledSeverities: ['CRITICAL', 'WARNING'], // Skip the nitpicky stuff
  excludePatterns: ['node_modules/**', '.git/**', 'dist/**'],
  includePatterns: ['.env*', '*.config.js'],
  maxFileSize: 1024 * 1024, // 1MB should be plenty for config files
  timeout: 5000 // Don't wait forever
};

const scanner = new EnvScanner(myConfig);
\`\`\`

## Contributing (We'd Love Your Help!)

Found a security pattern we missed? Have an idea for a better way to detect issues? We're all ears! Check out our [Contributing Guide](../CONTRIBUTING.md) to get started.

A few things we especially care about:
- **Test your regex patterns** - nothing worse than false positives
- **Keep performance in mind** - developers hate slow tools
- **Document your changes** - future you (and us) will thank you

---

*Built with ❤️ by developers who've made way too many security mistakes and want to help you avoid them.*
