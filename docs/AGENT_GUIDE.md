# Agent Customization & Rule Configuration Guide

This guide describes how to configure, extend, and customize the behavior of each agent phase in the platform.

---

## 🛠️ Configuration Files

Each agent phase reads default parameters from JSON configuration files located in its respective directory:

### 1. Exploration Agent Config (`agents/exploration/config.json`)
```json
{
  "name": "Exploration Agent",
  "max_depth": 3,
  "max_pages": 25,
  "classify_types": ["auth-login", "auth-register", "dashboard", "crud-store", "validation-form"],
  "element_selectors": ["data-testid", "role", "aria-label", "button", "a", "input", "select", "textarea"]
}
```
- **`max_depth`**: Maximum link depth from the seed URL.
- **`max_pages`**: Page limit ceiling for crawl execution.
- **`element_selectors`**: Target attribute types extracted during DOM evaluation.

---

### 2. Test Generation Agent Config (`agents/test-generation/config.json`)
```json
{
  "name": "Test Generation Agent",
  "target_framework": "playwright",
  "language": "typescript",
  "allowed_selectors": ["data-testid", "aria-role", "aria-label"],
  "forbidden_selectors": ["xpath", "brittle-css"],
  "generate_cases": ["happy-path", "negative-validation"]
}
```
- **`allowed_selectors`**: Prioritized selector query patterns.
- **`forbidden_selectors`**: Selectors rejected during code synthesis to prevent brittle tests.

---

### 3. Bug Analysis Agent Config (`agents/bug-analysis/config.json`)
```json
{
  "name": "Bug Analysis Agent",
  "rerun_attempts": 1,
  "flakiness_threshold": 1,
  "classification_rules": {
    "API/backend": ["500 Internal Server Error", "database error", "API crash"],
    "UI/frontend": ["element timeout", "selector missing", "assertion error"]
  }
}
```
- **`rerun_attempts`**: Number of isolated reruns performed before confirming a failure as a true bug.
- **`classification_rules`**: Error string keywords mapped to root cause categories (`API/backend` vs `UI/frontend`).

---

## 👩‍💻 Extending Agent Behaviors

### Customizing Playwright Selector Logic
To add custom test selectors (such as custom web components or shadow DOM attributes), edit `agents/test-generation/generator.ts` and add selector formatters to the spec template engine.

### Adding Custom Accessibility Rules
To restrict or expand Axe WCAG rule tags (e.g., WCAG 2.1 AA vs Section 508), edit `agents/accessibility/scanner.ts`:

```typescript
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'])
  .analyze();
```
