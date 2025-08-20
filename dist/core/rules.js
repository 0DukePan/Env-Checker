// Built-in security rules for env-checker
import { Severity } from "./types.js";
export const DEFAULT_RULES = [
    // Password detection
    {
        id: "password-hardcoded",
        name: "Hardcoded Password",
        description: "Detects hardcoded passwords in environment variables",
        severity: Severity.CRITICAL,
        pattern: /^(.*password.*|.*pwd.*|.*pass.*)=.+$/i,
        keyPattern: /(password|pwd|pass)/i,
        valuePattern: /^(?!.*(\$\{|%\{|<|>)).{1,}$/,
        suggestion: "Remove hardcoded password and use secure environment variable injection",
        enabled: true,
    },
    // API Keys
    {
        id: "api-key-exposed",
        name: "Exposed API Key",
        description: "Detects potentially exposed API keys",
        severity: Severity.CRITICAL,
        pattern: /^(.*api.*key.*|.*secret.*|.*token.*)=.+$/i,
        keyPattern: /(api.*key|secret|token)/i,
        valuePattern: /^[a-zA-Z0-9_-]{20,}$/,
        suggestion: "Use environment variable injection or secure key management",
        enabled: true,
    },
    // Database URLs
    {
        id: "database-url-exposed",
        name: "Database URL with Credentials",
        description: "Detects database URLs containing credentials",
        severity: Severity.CRITICAL,
        pattern: /^.*_url.*=.*:\/\/.*:.*@.*$/i,
        keyPattern: /.*url.*/i,
        valuePattern: /:\/\/[^:]+:[^@]+@/,
        suggestion: "Remove credentials from URL and use separate environment variables",
        enabled: true,
    },
    // Debug mode
    {
        id: "debug-enabled",
        name: "Debug Mode Enabled",
        description: "Debug mode should not be enabled in production",
        severity: Severity.WARNING,
        pattern: /^debug\s*=\s*(true|1|on|yes)$/i,
        keyPattern: /^debug$/i,
        valuePattern: /^(true|1|on|yes)$/i,
        suggestion: "Set DEBUG=false or remove for production environments",
        enabled: true,
    },
    // Private keys
    {
        id: "private-key-exposed",
        name: "Private Key Exposed",
        description: "Detects private keys or certificates in plain text",
        severity: Severity.CRITICAL,
        pattern: /^.*private.*key.*=.*BEGIN.*PRIVATE.*KEY.*$/i,
        keyPattern: /private.*key/i,
        valuePattern: /BEGIN.*PRIVATE.*KEY/,
        suggestion: "Store private keys in secure key management system",
        enabled: true,
    },
    // Weak passwords
    {
        id: "weak-password",
        name: "Weak Password",
        description: "Detects commonly used weak passwords",
        severity: Severity.WARNING,
        pattern: /^.*password.*=\s*(123456|password|admin|root|test|demo)$/i,
        keyPattern: /password/i,
        valuePattern: /^(123456|password|admin|root|test|demo)$/i,
        suggestion: "Use a strong, unique password",
        enabled: true,
    },
    // Development URLs in production
    {
        id: "localhost-url",
        name: "Localhost URL",
        description: "Localhost URLs should not be used in production",
        severity: Severity.INFO,
        pattern: /^.*url.*=.*localhost.*$/i,
        keyPattern: /url/i,
        valuePattern: /localhost/i,
        suggestion: "Replace with production URL or use environment-specific configuration",
        enabled: true,
    },
];
export function getRuleById(ruleId) {
    return DEFAULT_RULES.find((rule) => rule.id === ruleId);
}
export function getEnabledRules() {
    return DEFAULT_RULES.filter((rule) => rule.enabled);
}
//# sourceMappingURL=rules.js.map