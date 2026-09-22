# Autonomous QA & Testing Agent Platform 🚀

> **An autonomous end-to-end QA intelligence agent in TypeScript.** Given only a web application URL, it explores reachable pages, generates real Playwright TypeScript tests (using ARIA roles & `data-testid` selectors), runs tests headlessly, detects bugs with correlated signals and root cause hints, executes WCAG accessibility audits via `@axe-core/playwright`, and presents failure evidence through an interactive React + Recharts dashboard.

---

## 🌟 Key Features

- **🌐 Autonomous App Mapping (Phase 1)**: Crawls target web apps up to depth 3 (max 25 pages), classifies page types (`auth-login`, `crud-store`, `validation-form`), extracts interactive elements, and maps user navigation flows into a structured JSON App Map.
- **⚡ Playwright TS Test Generator (Phase 2)**: Automatically generates clean Playwright TypeScript spec files for happy paths and negative/validation cases using strictly `getByTestId()` and `getByRole()` selectors—**never brittle CSS/XPath**.
- **🤖 Headless Executor & Evidence Capture (Phase 3)**: Runs tests headlessly, capturing screenshots, console logs, network request/response waterfalls, and Playwright `.zip` traces on failure.
- **🔍 Bug Analysis & Flakiness Verification (Phase 4)**: Re-runs failed tests once to differentiate flaky tests from true bugs, correlates error logs, and classifies root causes (`API/backend`, `UI/frontend`, `needs investigation`).
- **♿ WCAG Accessibility Audit (Phase 5)**: Audits all discovered pages using `@axe-core/playwright`, logging violation rules, impact levels, target DOM selectors, and code fix suggestions.
- **📊 Real-time QA Command Center Dashboard (Phase 6)**: Built with React, Vite, Recharts, and Lucide Icons. Displays live metric cards, bug distribution charts, chronological activity streams, Playwright code inspectors, and evidence preview modals.
- **🐳 Infrastructure & Zero-Config Fallback**: Features a `docker-compose.yml` for Postgres & MinIO object storage, along with an instant zero-config SQLite driver for immediate out-of-the-box local execution.

---

## 📂 Project Structure

```
qa-testing-agent/
├── agents/                  # Autonomous QA Agent Suite
│   ├── exploration/         # Phase 1: Crawler & App Map Generator
│   ├── test-generation/     # Phase 2: Playwright TS Test Generator
│   ├── executor/            # Phase 3: Headless Playwright Test Runner
│   ├── bug-analysis/        # Phase 4: Flakiness & Root-Cause Analyzer
│   ├── accessibility/       # Phase 5: @axe-core/playwright WCAG Scanner
│   └── pipeline.ts          # Master Pipeline Orchestrator
├── generated-tests/         # Auto-generated Playwright TypeScript Specs
│   ├── auth-flow.spec.ts
│   ├── crud-flow.spec.ts
│   └── validation-form.spec.ts
├── ingestion/               # REST API & Database Service (:5000)
│   ├── src/db.ts            # SQLite / Postgres Database Abstraction
│   └── src/server.ts        # Express REST API & Evidence File Server
├── dashboard/               # React + Recharts Command Center UI (:3000)
│   ├── src/App.tsx          # Stat Cards, Charts, Timeline, Code Inspector, Evidence Modal
│   └── src/index.css        # Dark Glassmorphism Design System
├── demo-app/                # Seeded Target Web Application (:4000)
│   └── src/server.ts        # Auth, CRUD, Form Validation & Seeded Testable Bugs
├── infra/
│   └── docker-compose.yml   # Postgres (5432) + MinIO S3 Storage (9000/9001)
└── docs/                    # Detailed Architecture & API Documentation
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    └── AGENT_GUIDE.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- (Optional) **Docker Desktop**: For running Postgres & MinIO containers via Docker Compose.

### 1. Installation

Clone the repository and install root and dashboard dependencies:

```bash
# Clone the repository
git clone https://github.com/TECH-SOLOMANU/qa-testing-agent.git
cd qa-testing-agent

# Install root project dependencies
npm install

# Install Playwright browser binaries
npx playwright install chromium

# Install dashboard frontend dependencies
cd dashboard && npm install && cd ..
```

---

### 2. Running Services

Start the target Demo App, Ingestion DB API, and React Dashboard in separate terminal windows (or background jobs):

```bash
# Terminal 1: Launch Target Demo Web App (Port 4000)
npm run start:demo

# Terminal 2: Launch Ingestion Service & DB API (Port 5000)
npm run start:ingestion

# Terminal 3: Launch React Command Center Dashboard (Port 3000)
npm run start:dashboard
```

Once launched:
- **React Dashboard**: Open [`http://localhost:3000`](http://localhost:3000)
- **Target Demo App**: View [`http://localhost:4000`](http://localhost:4000)
- **Ingestion REST API**: View [`http://localhost:5000/api/dashboard/stats`](http://localhost:5000/api/dashboard/stats)

---

### 3. Running the Autonomous Agent Pipeline

You can trigger the pipeline in two ways:

#### Option A: Via Terminal CLI
```bash
npx ts-node agents/pipeline.ts http://localhost:4000
```

#### Option B: Directly from the Dashboard UI
1. Open [`http://localhost:3000`](http://localhost:3000).
2. Enter your target app URL (default: `http://localhost:4000`) in the left sidebar.
3. Click **`▶ Run Agent Pipeline`**.
4. Watch the progress bar, live execution logs, metric cards, bug distribution charts, and timeline update in real time!

---

## ⚙️ How the 5-Phase Agent Pipeline Works

```mermaid
flowchart LR
    P1[Phase 1: Explore] -->|JSON App Map| P2[Phase 2: Generate Tests]
    P2 -->|Playwright Specs| P3[Phase 3: Execute Headlessly]
    P3 -->|Failures & Evidence| P4[Phase 4: Analyze Bugs]
    P1 -->|Discovered Pages| P5[Phase 5: Accessibility Scan]
    P4 & P5 -->|Persist Records| DB[(Ingestion DB)]
    DB --> Dashboard[React Dashboard]
```

1. **Phase 1 (Exploration Agent)**: Uses Playwright to crawl pages (depth limit = 3, max pages = 25). Classifies page types (`auth-login`, `crud-store`, `validation-form`), extracts interactive elements with ARIA/`data-testid` attributes, and constructs user navigation flows.
2. **Phase 2 (Test Generation Agent)**: Synthesizes Playwright TypeScript specs covering happy path and negative validation test cases. Uses strictly ARIA role and `data-testid` selectors. Lints test syntax and registers `TestCase` entries in the DB.
3. **Phase 3 (Test Executor)**: Executes generated test files headlessly. Listens to browser events, captures console logs, HTTP request/response details, failure screenshots, and `.zip` Playwright traces.
4. **Phase 4 (Bug Analysis Agent)**: Evaluates test failures. Automatically re-runs failed specs once to verify flakiness. Correlates failure signals (e.g. HTTP 500 server crashes) to determine root cause (`API/backend`, `UI/frontend`, `needs investigation`), severity, and step-by-step reproduction guides.
5. **Phase 5 (Accessibility Scanner)**: Audits every page using `@axe-core/playwright`. Logs WCAG rule violations, impact levels, element selectors, and recommended code fix suggestions.
6. **Phase 6 (QA Command Center)**: Serves real-time data through an Express REST API to a React + Recharts frontend.

---

## 🗄️ Database Schema & Ingestion API

The ingestion service exposes REST API endpoints operating on the following database entities:

| Table | Key Fields | Description |
| :--- | :--- | :--- |
| `Environment` | `id, url, auth_config, label` | Target application environments |
| `Page` | `id, environment_id, url, type, elements` | Discovered pages & interactive DOM elements |
| `Flow` | `id, environment_id, name, steps, linked_pages` | Mapped multi-step user navigation flows |
| `TestCase` | `id, flow_id, file_path, type` | Auto-generated Playwright TypeScript spec files |
| `TestRun` | `id, timestamp, status, duration` | Execution suite run metadata |
| `TestResult` | `id, test_run_id, test_case_id, status, evidence_refs` | Individual test status (`pass`, `fail`, `flaky`) & evidence URLs |
| `Bug` | `id, test_result_id, steps_to_reproduce, expected, actual, root_cause, severity` | Confirmed bugs with correlated root cause hints |
| `AccessibilityIssue` | `id, page_id, element, wcag_rule, severity, fix_suggestion` | WCAG accessibility audit findings |

---

## 🐳 Infrastructure & Container Setup

To run using containerized Postgres and MinIO S3-compatible storage:

```bash
# Start Postgres (port 5432) and MinIO (ports 9000/9001)
docker-compose -f infra/docker-compose.yml up -d
```

- **Postgres Database**: `postgresql://qa_user:qa_password@localhost:5432/qa_testing_db`
- **MinIO S3 Storage Console**: `http://localhost:9001` (Credentials: `minioadmin` / `minioadminpassword`)

---

## 📚 Additional Documentation

- [Architecture Design & Data Models](docs/ARCHITECTURE.md)
- [Ingestion REST API Reference](docs/API_REFERENCE.md)
- [Agent Customization & Rule Configuration Guide](docs/AGENT_GUIDE.md)

---

## 📄 License

This project is licensed under the MIT License.
