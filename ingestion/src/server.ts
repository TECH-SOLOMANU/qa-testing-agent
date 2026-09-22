import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, runSql, queryAll, queryOne } from './db';
import { runFullQAPipeline } from '../../agents/pipeline';
import { executeTestFile } from '../../agents/executor/runner';

const app = express();
const PORT = process.env.INGESTION_PORT || 5000;

app.use(cors());
app.use(express.json());

// Uploads static directory for evidence storage
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Pipeline running status state
let pipelineStatus = {
  running: false,
  progress: 0,
  currentPhase: '',
  logs: [] as string[],
  lastRunTime: null as string | null
};

// Clear Database Endpoint
app.post('/api/database/reset', async (req, res) => {
  try {
    await runSql(`DELETE FROM Bug`);
    await runSql(`DELETE FROM TestResult`);
    await runSql(`DELETE FROM TestRun`);
    await runSql(`DELETE FROM TestCase`);
    await runSql(`DELETE FROM Flow`);
    await runSql(`DELETE FROM Page`);
    await runSql(`DELETE FROM AccessibilityIssue`);
    res.json({ success: true, message: 'Database reset successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Pipeline Trigger Endpoint ---
app.post('/api/pipeline/run', async (req, res) => {
  const { targetUrl = 'http://localhost:4000' } = req.body;
  if (pipelineStatus.running) {
    return res.status(400).json({ error: 'Pipeline is already running.' });
  }

  // Clear previous runs so new target URL stats are 100% clean and isolated
  try {
    await runSql(`DELETE FROM Bug`);
    await runSql(`DELETE FROM TestResult`);
    await runSql(`DELETE FROM TestRun`);
    await runSql(`DELETE FROM TestCase`);
    await runSql(`DELETE FROM Flow`);
    await runSql(`DELETE FROM Page`);
    await runSql(`DELETE FROM AccessibilityIssue`);
  } catch (e) {}

  pipelineStatus = {
    running: true,
    progress: 10,
    currentPhase: 'Phase 1 — Exploration Agent crawling app pages...',
    logs: [`[${new Date().toLocaleTimeString()}] Pipeline started targeting ${targetUrl}`],
    lastRunTime: new Date().toISOString()
  };

  res.json({ success: true, message: 'Pipeline started successfully' });

  // Run asynchronously
  (async () => {
    try {
      pipelineStatus.progress = 25;
      pipelineStatus.currentPhase = 'Phase 1 & 2 — Exploring app and generating Playwright TS tests...';
      pipelineStatus.logs.push(`[${new Date().toLocaleTimeString()}] Crawling ${targetUrl} & mapping user flows`);

      await runFullQAPipeline(targetUrl);

      pipelineStatus.progress = 100;
      pipelineStatus.currentPhase = 'Pipeline Execution Completed!';
      pipelineStatus.logs.push(`[${new Date().toLocaleTimeString()}] Pipeline completed all 5 phases successfully.`);
    } catch (err: any) {
      pipelineStatus.currentPhase = `Pipeline Error: ${err.message}`;
      pipelineStatus.logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${err.message}`);
    } finally {
      pipelineStatus.running = false;
    }
  })();
});

app.get('/api/pipeline/status', (req, res) => {
  res.json(pipelineStatus);
});

// --- 1. Environment Routes ---
app.post('/api/environments', async (req, res) => {
  try {
    const { id, url, auth_config, label } = req.body;
    const envId = id || `env_${Date.now()}`;
    await runSql(
      `INSERT INTO Environment (id, url, auth_config, label) VALUES (?, ?, ?, ?)`,
      [envId, url, JSON.stringify(auth_config || {}), label || 'Primary Environment']
    );
    res.json({ success: true, id: envId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/environments', async (req, res) => {
  try {
    const envs = await queryAll(`SELECT * FROM Environment ORDER BY created_at DESC`);
    res.json(envs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. Page Routes ---
app.post('/api/pages', async (req, res) => {
  try {
    const { id, environment_id, url, type, elements } = req.body;
    const pageId = id || `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(
      `INSERT INTO Page (id, environment_id, url, type, elements) VALUES (?, ?, ?, ?, ?)`,
      [pageId, environment_id || 'default', url, type, JSON.stringify(elements || [])]
    );
    res.json({ success: true, id: pageId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pages', async (req, res) => {
  try {
    const pages = await queryAll(`SELECT * FROM Page ORDER BY created_at DESC`);
    const parsed = pages.map((p: any) => ({
      ...p,
      elements: p.elements ? JSON.parse(p.elements) : []
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. Flow Routes ---
app.post('/api/flows', async (req, res) => {
  try {
    const { id, environment_id, name, steps, linked_pages } = req.body;
    const flowId = id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(
      `INSERT INTO Flow (id, environment_id, name, steps, linked_pages) VALUES (?, ?, ?, ?, ?)`,
      [flowId, environment_id || 'default', name, JSON.stringify(steps || []), JSON.stringify(linked_pages || [])]
    );
    res.json({ success: true, id: flowId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/flows', async (req, res) => {
  try {
    const flows = await queryAll(`SELECT * FROM Flow ORDER BY created_at DESC`);
    const parsed = flows.map((f: any) => ({
      ...f,
      steps: f.steps ? JSON.parse(f.steps) : [],
      linked_pages: f.linked_pages ? JSON.parse(f.linked_pages) : []
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. TestCase Routes & Code Content ---
app.post('/api/test-cases', async (req, res) => {
  try {
    const { id, flow_id, file_path, type } = req.body;
    const tcId = id || `tc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(
      `INSERT INTO TestCase (id, flow_id, file_path, type) VALUES (?, ?, ?, ?)`,
      [tcId, flow_id, file_path, type]
    );
    res.json({ success: true, id: tcId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-cases', async (req, res) => {
  try {
    const cases = await queryAll(`SELECT * FROM TestCase ORDER BY created_at DESC`);
    const enhanced = cases.map((tc: any) => {
      let code = '';
      try {
        const fullPath = path.resolve(__dirname, '../../', tc.file_path);
        if (fs.existsSync(fullPath)) {
          code = fs.readFileSync(fullPath, 'utf-8');
        }
      } catch (e) {}
      return { ...tc, code };
    });
    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-cases/rerun', async (req, res) => {
  try {
    const { testCaseId, filePath } = req.body;
    const fullPath = path.resolve(__dirname, '../../', filePath || 'generated-tests/crud-flow.spec.ts');
    const runId = `manual_rerun_${Date.now()}`;
    const results = await executeTestFile(fullPath, testCaseId || 'tc_manual', runId);
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 5. TestRun & TestResult Routes ---
app.post('/api/test-runs', async (req, res) => {
  try {
    const { id, status, duration } = req.body;
    const runId = id || `run_${Date.now()}`;
    await runSql(
      `INSERT INTO TestRun (id, status, duration) VALUES (?, ?, ?)`,
      [runId, status || 'completed', duration || 0]
    );
    res.json({ success: true, id: runId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-runs', async (req, res) => {
  try {
    const runs = await queryAll(`SELECT * FROM TestRun ORDER BY created_at DESC`);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-results', async (req, res) => {
  try {
    const { id, test_run_id, test_case_id, status, evidence_refs } = req.body;
    const resId = id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(
      `INSERT INTO TestResult (id, test_run_id, test_case_id, status, evidence_refs) VALUES (?, ?, ?, ?, ?)`,
      [resId, test_run_id, test_case_id, status, JSON.stringify(evidence_refs || {})]
    );
    res.json({ success: true, id: resId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-results', async (req, res) => {
  try {
    const results = await queryAll(`
      SELECT tr.*, tc.file_path, tc.type as case_type
      FROM TestResult tr
      LEFT JOIN TestCase tc ON tr.test_case_id = tc.id
      ORDER BY tr.created_at DESC
    `);
    const parsed = results.map((r: any) => ({
      ...r,
      evidence_refs: r.evidence_refs ? JSON.parse(r.evidence_refs) : {}
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 6. Bug Routes ---
app.post('/api/bugs', async (req, res) => {
  try {
    const { id, test_result_id, steps_to_reproduce, expected, actual, root_cause, severity } = req.body;
    const bugId = id || `bug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(
      `INSERT INTO Bug (id, test_result_id, steps_to_reproduce, expected, actual, root_cause, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bugId, test_result_id, JSON.stringify(steps_to_reproduce || []), expected, actual, root_cause, severity]
    );
    res.json({ success: true, id: bugId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bugs', async (req, res) => {
  try {
    const bugs = await queryAll(`
      SELECT b.*, tr.evidence_refs, tc.file_path
      FROM Bug b
      LEFT JOIN TestResult tr ON b.test_result_id = tr.id
      LEFT JOIN TestCase tc ON tr.test_case_id = tc.id
      ORDER BY b.created_at DESC
    `);
    const parsed = bugs.map((b: any) => ({
      ...b,
      steps_to_reproduce: b.steps_to_reproduce ? JSON.parse(b.steps_to_reproduce) : [],
      evidence_refs: b.evidence_refs ? JSON.parse(b.evidence_refs) : {}
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 7. Accessibility Routes ---
app.post('/api/accessibility-issues', async (req, res) => {
  try {
    const { id, page_id, element, wcag_rule, severity, fix_suggestion } = req.body;
    const issueId = id || `a11y_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runSql(
      `INSERT INTO AccessibilityIssue (id, page_id, element, wcag_rule, severity, fix_suggestion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [issueId, page_id, element, wcag_rule, severity, fix_suggestion]
    );
    res.json({ success: true, id: issueId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accessibility-issues', async (req, res) => {
  try {
    const issues = await queryAll(`
      SELECT a.*, p.url as page_url, p.type as page_type
      FROM AccessibilityIssue a
      LEFT JOIN Page p ON a.page_id = p.id
      ORDER BY a.created_at DESC
    `);
    res.json(issues);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 8. Dashboard Aggregate Stats Endpoint ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const pagesCount = (await queryOne(`SELECT COUNT(*) as count FROM Page`))?.count || 0;
    const flowsCount = (await queryOne(`SELECT COUNT(*) as count FROM Flow`))?.count || 0;
    const testCasesCount = (await queryOne(`SELECT COUNT(*) as count FROM TestCase`))?.count || 0;

    const testResults = await queryAll(`SELECT status FROM TestResult`);
    const passes = testResults.filter((r: any) => r.status === 'pass').length;
    const fails = testResults.filter((r: any) => r.status === 'fail').length;
    const flakies = testResults.filter((r: any) => r.status === 'flaky').length;

    const bugs = await queryAll(`SELECT root_cause, severity FROM Bug`);
    const bugsBySeverity = {
      critical: bugs.filter((b: any) => b.severity === 'critical').length,
      high: bugs.filter((b: any) => b.severity === 'high').length,
      medium: bugs.filter((b: any) => b.severity === 'medium').length,
      low: bugs.filter((b: any) => b.severity === 'low').length,
    };
    const bugsByRootCause = {
      frontend: bugs.filter((b: any) => b.root_cause === 'UI/frontend').length,
      backend: bugs.filter((b: any) => b.root_cause === 'API/backend').length,
      investigate: bugs.filter((b: any) => b.root_cause === 'needs investigation').length,
    };

    const a11yIssues = await queryAll(`SELECT severity FROM AccessibilityIssue`);
    const a11yBySeverity = {
      critical: a11yIssues.filter((i: any) => i.severity === 'critical').length,
      serious: a11yIssues.filter((i: any) => i.severity === 'serious').length,
      moderate: a11yIssues.filter((i: any) => i.severity === 'moderate').length,
      minor: a11yIssues.filter((i: any) => i.severity === 'minor').length,
    };

    res.json({
      pagesDiscovered: pagesCount,
      flowsMapped: flowsCount,
      totalTestCases: testCasesCount,
      testResults: { total: testResults.length, pass: passes, fail: fails, flaky: flakies },
      bugs: { total: bugs.length, bySeverity: bugsBySeverity, byRootCause: bugsByRootCause },
      accessibility: { total: a11yIssues.length, bySeverity: a11yBySeverity }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 9. Activity Timeline Endpoint ---
app.get('/api/dashboard/timeline', async (req, res) => {
  try {
    const timeline: any[] = [];

    const pages = await queryAll(`SELECT created_at, url FROM Page ORDER BY created_at ASC`);
    if (pages.length > 0) {
      timeline.push({
        id: 'evt_crawl',
        title: 'App Crawl & Exploration Complete',
        description: `Discovered ${pages.length} reachable pages and mapped user flows`,
        timestamp: pages[0].created_at,
        type: 'exploration',
        status: 'success'
      });
    }

    const testCases = await queryAll(`SELECT created_at, file_path FROM TestCase ORDER BY created_at ASC`);
    if (testCases.length > 0) {
      timeline.push({
        id: 'evt_gen',
        title: 'Playwright Test Specs Generated',
        description: `Generated ${testCases.length} tests using ARIA roles & data-testid selectors`,
        timestamp: testCases[0].created_at,
        type: 'generation',
        status: 'success'
      });
    }

    const testRuns = await queryAll(`SELECT created_at, status, duration FROM TestRun ORDER BY created_at ASC`);
    if (testRuns.length > 0) {
      timeline.push({
        id: 'evt_exec',
        title: 'Headless Playwright Suite Executed',
        description: `Ran test suite in ${testRuns[0].duration}s with evidence capture`,
        timestamp: testRuns[0].created_at,
        type: 'execution',
        status: testRuns[0].status === 'completed' ? 'success' : 'warning'
      });
    }

    const bugs = await queryAll(`SELECT created_at, severity, root_cause, actual FROM Bug ORDER BY created_at ASC`);
    bugs.forEach((b: any, idx: number) => {
      timeline.push({
        id: `evt_bug_${idx}`,
        title: `Bug Detected (${b.severity.toUpperCase()})`,
        description: `${b.actual} [Root Cause: ${b.root_cause}]`,
        timestamp: b.created_at,
        type: 'bug',
        status: 'error'
      });
    });

    const a11y = await queryAll(`SELECT created_at FROM AccessibilityIssue ORDER BY created_at ASC`);
    if (a11y.length > 0) {
      timeline.push({
        id: 'evt_a11y',
        title: 'Accessibility Scan Completed',
        description: `Audited pages with @axe-core/playwright, found ${a11y.length} WCAG items`,
        timestamp: a11y[0].created_at,
        type: 'accessibility',
        status: 'info'
      });
    }

    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[Ingestion DB Service] Running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize SQLite Database:', err);
});
