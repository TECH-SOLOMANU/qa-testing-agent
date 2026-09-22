import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import axios from 'axios';

const INGESTION_API = process.env.INGESTION_API || 'http://localhost:5000/api';

export interface AccessibilityIssueRecord {
  id?: string;
  page_id?: string;
  element: string;
  wcag_rule: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  fix_suggestion: string;
}

export async function runAccessibilityScan(baseUrl: string = 'http://localhost:4000'): Promise<AccessibilityIssueRecord[]> {
  console.log('[Phase 5 Accessibility Scanner] Running @axe-core/playwright audit against all discovered app pages...');

  let pages: any[] = [];
  try {
    const resp = await axios.get(`${INGESTION_API}/pages`);
    pages = resp.data;
  } catch (err: any) {
    console.warn(`[A11y Scanner Notice] Could not fetch pages from DB: ${err.message}`);
  }

  if (pages.length === 0) {
    pages = [
      { id: 'p_login', url: `${baseUrl}/login` },
      { id: 'p_dashboard', url: `${baseUrl}/dashboard` },
      { id: 'p_items', url: `${baseUrl}/items` },
      { id: 'p_feedback', url: `${baseUrl}/feedback` }
    ];
  }

  const browser = await chromium.launch({ headless: true });
  const issues: AccessibilityIssueRecord[] = [];

  for (const pageRecord of pages) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log(`[A11y Scan] Auditing ${pageRecord.url}...`);
      await page.goto(pageRecord.url, { waitUntil: 'domcontentloaded' });

      // Run Axe accessibility scan
      const results = await new AxeBuilder({ page }).analyze();

      for (const violation of results.violations) {
        const severityMap: Record<string, 'minor' | 'moderate' | 'serious' | 'critical'> = {
          minor: 'minor',
          moderate: 'moderate',
          serious: 'serious',
          critical: 'critical'
        };

        const impact = severityMap[violation.impact || 'moderate'] || 'moderate';

        for (const node of violation.nodes) {
          const issue: AccessibilityIssueRecord = {
            page_id: pageRecord.id,
            element: node.target.join(' > '),
            wcag_rule: `${violation.id} (${violation.tags.filter(t => t.startsWith('wcag')).join(', ') || 'WCAG 2.1'})`,
            severity: impact,
            fix_suggestion: node.failureSummary || violation.help || 'Provide appropriate accessibility attributes.'
          };

          issues.push(issue);

          // Store in DB
          try {
            await axios.post(`${INGESTION_API}/accessibility-issues`, issue);
          } catch (e: any) {}
        }
      }
    } catch (err: any) {
      console.warn(`[A11y Scan Warning] Failed to scan page ${pageRecord.url}: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log(`[Phase 5 Accessibility Scanner] Audit complete! Found ${issues.length} WCAG accessibility issues.`);
  return issues;
}

if (require.main === module) {
  runAccessibilityScan().then(issues => {
    console.log('Accessibility Issues Summary:', JSON.stringify(issues, null, 2));
  }).catch(console.error);
}
