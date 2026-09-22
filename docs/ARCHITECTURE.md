# System Architecture & Design Deep Dive

This document details the internal architecture, state transitions, classification algorithms, and data persistence models of the Autonomous QA & Testing Agent platform.

---

## 🏗️ Architectural Topology

The system operates as a decoupled, multi-agent microservice architecture:

```
+-------------------------------------------------------------------------------+
|                               REACT DASHBOARD                                 |
|                     (Vite + React 18 + Recharts + Lucide)                     |
+---------------------------------------+---------------------------------------+
                                        | HTTP REST / JSON Polling
                                        v
+-------------------------------------------------------------------------------+
|                            INGESTION SERVICE (:5000)                          |
|             (Express REST API + Evidence Server + SQLite/Postgres DB)         |
+---------------------------------------+---------------------------------------+
                                        ^
                                        | API Calls & Artifact Persistence
                                        |
+---------------------------------------+---------------------------------------+
|                       MASTER PIPELINE ORCHESTRATOR                            |
+---------+-----------------+-------------------+-------------------+-----------+
          |                 |                   |                   |
          v                 v                   v                   v
   +--------------+  +--------------+    +--------------+    +--------------+
   |  Phase 1     |  |  Phase 2     |    |  Phase 3     |    |  Phase 4     |
   |  Exploration |  |  Test Gen    |    |  Executor    |    |  Bug Analysis|
   |  Crawler     |  |  Agent       |    |  Runner      |    |  Agent       |
   +--------------+  +--------------+    +--------------+    +--------------+
          |                 |                   |                   |
          |                 |                   |                   v
          |                 |                   |            +--------------+
          |                 |                   |            |  Phase 5     |
          |                 |                   |            |  Accessibility|
          |                 |                   |            |  Scanner     |
          |                 |                   |            +--------------+
          v                 v                   v                   v
+-------------------------------------------------------------------------------+
|                             TARGET APPLICATION                                |
|                   (Demo App / Custom Staging App :4000)                        |
+-------------------------------------------------------------------------------+
```

---

## 🤖 Agent Phases & State Machine

### Phase 1: Exploration Agent (`agents/exploration/crawler.ts`)
- **Input**: Target Application URL (`http://localhost:4000`), `max_depth` (3), `max_pages` (25).
- **Execution Flow**:
  1. Initializes a Playwright browser context.
  2. Main BFS queue processes candidate URLs.
  3. Evaluates target DOM tree to isolate interactive nodes (`button`, `a`, `input`, `select`, `textarea`, `[data-testid]`, `[role]`).
  4. Classifies page type using URL path semantics and DOM landmarks (`auth-login`, `auth-register`, `dashboard`, `crud-store`, `validation-form`).
  5. Infers primary navigation user flows linking discovered pages.
- **Output**: Single JSON App Map structure:
  ```json
  {
    "pages": [{ "url": "...", "type": "...", "elements": [...] }],
    "flows": [{ "name": "...", "steps": [...], "linked_pages": [...] }]
  }
  ```

---

### Phase 2: Test Generation Agent (`agents/test-generation/generator.ts`)
- **Input**: JSON App Map structure.
- **Execution Flow**:
  1. Iterates over discovered user flows (`Auth Flow`, `CRUD Items Flow`, `Validation Form Flow`).
  2. Synthesizes standard Playwright TypeScript spec files saved into `generated-tests/`.
  3. Enforces selector priority rules:
     - `1st Priority`: `getByTestId('element-id')`
     - `2nd Priority`: `getByRole('button', { name: 'Submit' })`
     - `Forbidden`: Raw XPath, position-based CSS index selectors.
  4. Includes **Happy Path** (valid data submission & state transition assertion) and **Negative/Validation Case** (empty input error alerts or invalid format handling).
  5. Lints test syntax and persists `TestCase` database records.

---

### Phase 3: Test Executor (`agents/executor/runner.ts`)
- **Input**: Registered `TestCase` records.
- **Execution Flow**:
  1. Spawns headless Playwright test instances.
  2. Enables Playwright Tracing (`tracing.start({ screenshots: true, snapshots: true, sources: true })`).
  3. Monitors network responses to catch HTTP status codes $\ge 400$.
  4. Captures browser console warning/error streams.
  5. **On Failure**: Captures full-page PNG screenshot, stops tracing to export `.zip` trace archive, saves log streams to `/uploads`, and logs `TestRun` and `TestResult` records.

---

### Phase 4: Bug Analysis Agent (`agents/bug-analysis/analyzer.ts`)
- **Input**: Failed `TestResult` records.
- **Execution Flow**:
  1. Inspects failure evidence payload.
  2. **Flakiness Check**: Executes a single isolated rerun of the failing test spec file.
     - *Passes on Rerun* ➔ Updates `TestResult` status to `flaky`.
     - *Fails on Rerun* ➔ Confirms a true `Bug`.
  3. **Root Cause Classification**:
     - `API/backend`: Correlated HTTP 500 status codes, database insertion failure exceptions, or unhandled server responses.
     - `UI/frontend`: Missing DOM element timeouts, broken assertions, or incorrect client validation messages.
  4. Formulates structured step-by-step reproduction steps and saves `Bug` database records.

---

### Phase 5: Accessibility Scanner (`agents/accessibility/scanner.ts`)
- **Input**: Discovered `Page` records.
- **Execution Flow**:
  1. Instantiates `@axe-core/playwright` `AxeBuilder`.
  2. Audits each discovered page against WCAG 2.1 Level A & AA standards.
  3. Categorizes violations by impact (`critical`, `serious`, `moderate`, `minor`).
  4. Isolates target DOM selector chains, maps rule identifiers (e.g. `image-alt`, `color-contrast`, `label`), formats code remediation hints, and stores `AccessibilityIssue` records.

---

## 📂 Persistence Strategy

The system utilizes a dual-database driver strategy:
1. **Zero-Config SQLite Driver (`qa_agent.db`)**: Used automatically during local development for instant, zero-setup execution.
2. **PostgreSQL Driver**: Activated when `DATABASE_URL` environment variable is defined or when starting via `infra/docker-compose.yml`.
