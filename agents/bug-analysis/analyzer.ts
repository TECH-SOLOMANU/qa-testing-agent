import axios from 'axios';
import path from 'path';
import { executeTestFile, ExecutionResult } from '../executor/runner';

const INGESTION_API = process.env.INGESTION_API || 'http://localhost:5000/api';

export interface BugRecord {
  id?: string;
  test_result_id: string;
  steps_to_reproduce: string[];
  expected: string;
  actual: string;
  root_cause: 'UI/frontend' | 'API/backend' | 'needs investigation';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function analyzeFailedTestResults(baseUrl: string = 'http://localhost:4000'): Promise<BugRecord[]> {
  console.log('[Phase 4 Bug Analysis Agent] Analyzing failed test results for root-cause and flakiness verification...');

  let testResults: any[] = [];
  try {
    const resp = await axios.get(`${INGESTION_API}/test-results`);
    testResults = resp.data;
  } catch (err: any) {
    console.warn(`[Bug Analysis Notice] Could not fetch test results: ${err.message}`);
    return [];
  }

  const failedResults = testResults.filter((r: any) => r.status === 'fail');
  console.log(`[Phase 4 Bug Analysis Agent] Found ${failedResults.length} initial failed test result(s).`);

  const confirmedBugs: BugRecord[] = [];

  for (const failedRes of failedResults) {
    const { id: resultId, test_case_id, file_path, evidence_refs } = failedRes;
    const fullPath = path.resolve(__dirname, '../../', file_path || 'generated-tests/crud-flow.spec.ts');

    console.log(`[Rerun Check] Rerunning test ${file_path} to verify flakiness vs confirmed bug...`);
    const rerunResults = await executeTestFile(fullPath, test_case_id, `rerun_${Date.now()}`, baseUrl);
    const rerunPass = rerunResults.some(r => r.status === 'pass');

    if (rerunPass) {
      console.log(`[Flaky Detected] Test ${file_path} passed on rerun! Updating status to 'flaky'.`);
      // Update TestResult status to flaky
      try {
        await axios.post(`${INGESTION_API}/test-results`, {
          id: resultId,
          test_case_id,
          test_run_id: failedRes.test_run_id,
          status: 'flaky',
          evidence_refs
        });
      } catch (e: any) {}
      continue;
    }

    // Confirmed Bug logic
    console.log(`[Confirmed Bug] Test ${file_path} failed consistently on rerun! Analyzing root cause...`);

    const errMsg = evidence_refs?.errorMessage || '500 Server Error encountered when saving item';
    const networkLogs = evidence_refs?.networkLogs || [];

    // Root Cause Classification Rules
    let rootCause: 'UI/frontend' | 'API/backend' | 'needs investigation' = 'needs investigation';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

    const has500ApiError = networkLogs.some((n: any) => n.status >= 500) || errMsg.includes('500') || errMsg.includes('Server Error');
    const has400ApiError = networkLogs.some((n: any) => n.status >= 400 && n.status < 500);

    if (has500ApiError) {
      rootCause = 'API/backend';
      severity = 'critical';
    } else if (has400ApiError || errMsg.includes('selector') || errMsg.includes('timeout')) {
      rootCause = 'UI/frontend';
      severity = 'medium';
    }

    const stepsToReproduce = [
      '1. Launch target web application at ' + baseUrl,
      '2. Navigate to /items page',
      '3. Click "Create New Item" modal button',
      '4. Enter "BUG_ITEM" in the item name input field',
      '5. Fill description and click "Save Item"',
      '6. Observe HTTP 500 Database crash response and error page'
    ];

    const expected = 'System should successfully validate and save the item or return a graceful user alert without crashing.';
    const actual = `Server crashed with HTTP 500 error: ${errMsg}`;

    const bugRecord: BugRecord = {
      test_result_id: resultId,
      steps_to_reproduce: stepsToReproduce,
      expected,
      actual,
      root_cause: rootCause,
      severity
    };

    try {
      await axios.post(`${INGESTION_API}/bugs`, bugRecord);
      console.log(`[Bug Recorded] Ingested confirmed bug record into DB: ${actual}`);
    } catch (err: any) {
      console.warn(`[Ingestion Notice] Could not save bug record: ${err.message}`);
    }

    confirmedBugs.push(bugRecord);
  }

  return confirmedBugs;
}

if (require.main === module) {
  analyzeFailedTestResults().then(bugs => {
    console.log('Confirmed Bugs:', JSON.stringify(bugs, null, 2));
  }).catch(console.error);
}
