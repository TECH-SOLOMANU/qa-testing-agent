import { exploreApp } from './exploration/crawler';
import { generateTestsForAppMap } from './test-generation/generator';
import { runAllGeneratedTests } from './executor/runner';
import { analyzeFailedTestResults } from './bug-analysis/analyzer';
import { runAccessibilityScan } from './accessibility/scanner';

export async function runFullQAPipeline(targetUrl: string = 'http://localhost:4000') {
  console.log('================================================================');
  console.log('  STARTING AUTONOMOUS QA & TESTING AGENT PIPELINE');
  console.log(`  Target Web Application: ${targetUrl}`);
  console.log('================================================================\n');

  // PHASE 1 — EXPLORATION AGENT
  console.log('>>> PHASE 1: EXPLORATION AGENT');
  const appMap = await exploreApp(targetUrl);
  if (!appMap || appMap.pages.length === 0) {
    throw new Error('Phase 1 Failed: Exploration Agent did not discover any pages.');
  }
  console.log(`Phase 1 Validation Passed: Discovered ${appMap.pages.length} pages and ${appMap.flows.length} flows.\n`);

  // PHASE 2 — TEST GENERATION AGENT
  console.log('>>> PHASE 2: TEST GENERATION AGENT');
  const testFiles = await generateTestsForAppMap(appMap, targetUrl);
  if (!testFiles || testFiles.length === 0) {
    throw new Error('Phase 2 Failed: Test Generation Agent did not produce any test files.');
  }
  console.log(`Phase 2 Validation Passed: Generated ${testFiles.length} Playwright TS test files.\n`);

  // PHASE 3 — TEST EXECUTOR
  console.log('>>> PHASE 3: TEST EXECUTOR');
  const testResults = await runAllGeneratedTests(targetUrl);
  if (!testResults || testResults.length === 0) {
    throw new Error('Phase 3 Failed: Test Executor did not run tests.');
  }
  console.log(`Phase 3 Validation Passed: Executed ${testResults.length} tests with evidence capture.\n`);

  // PHASE 4 — BUG ANALYSIS AGENT
  console.log('>>> PHASE 4: BUG ANALYSIS AGENT');
  const confirmedBugs = await analyzeFailedTestResults(targetUrl);
  console.log(`Phase 4 Validation Passed: Analyzed failed tests and confirmed ${confirmedBugs.length} bug(s).\n`);

  // PHASE 5 — ACCESSIBILITY SCANNER
  console.log('>>> PHASE 5: ACCESSIBILITY SCANNER');
  const a11yIssues = await runAccessibilityScan(targetUrl);
  console.log(`Phase 5 Validation Passed: Completed accessibility audit, identified ${a11yIssues.length} WCAG issues.\n`);

  console.log('================================================================');
  console.log('  AUTONOMOUS QA & TESTING PIPELINE COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

if (require.main === module) {
  const targetUrl = process.argv[2] || 'http://localhost:4000';
  runFullQAPipeline(targetUrl).catch(err => {
    console.error('Pipeline Execution Error:', err);
    process.exit(1);
  });
}
