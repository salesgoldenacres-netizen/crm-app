---
name: check-app
description: Run codebase validation checks, lint checks, theme audit checks, and verify compilation status.
---

# Check App Skill

Use this skill when the developer requests to "check the app", "run audit", "verify builds", or "check linting".

## Workflow

### 1. Run Linter
Navigate to the `telecaller-app` directory and run:
```bash
npm run lint
```
Inspect for any ESLint syntax errors, hook dependencies, or React purity rules violations.

### 2. Run Theme Audit
Run the theme mismatch audit script from the root directory:
```bash
python execution/find_theme_mismatches.py
```
This updates `theme_audit_results.txt`. Review the mismatch count and highlight any newly introduced background classes that lack `dark:` modifiers.

### 3. Verify Production Compilation
Validate that Vite compiles successfully by running:
```bash
npm run build
```
Verify the build completes without errors and note the build time.
