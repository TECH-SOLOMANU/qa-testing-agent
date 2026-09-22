import { chromium, Page as PlaywrightPage } from 'playwright';
import axios from 'axios';

export interface PageElement {
  selector: string;
  testId?: string;
  role?: string;
  tag: string;
  type?: string;
  text?: string;
  ariaLabel?: string;
}

export interface PageRecord {
  id?: string;
  url: string;
  type: string;
  elements: PageElement[];
}

export interface FlowRecord {
  id?: string;
  name: string;
  steps: string[];
  linked_pages: string[];
}

export interface AppMap {
  pages: PageRecord[];
  flows: FlowRecord[];
}

const INGESTION_API = process.env.INGESTION_API || 'http://localhost:5000/api';

export async function exploreApp(startUrl: string, maxPages: number = 25, maxDepth: number = 3): Promise<AppMap> {
  console.log(`[Phase 1 Exploration Agent] Starting crawl on ${startUrl} (maxDepth=${maxDepth}, maxPages=${maxPages})`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const visitedUrls = new Set<string>();
  const pagesData: PageRecord[] = [];
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];

  while (queue.length > 0 && visitedUrls.size < maxPages) {
    const item = queue.shift();
    if (!item) break;

    const { url, depth } = item;
    const cleanUrl = url.split('#')[0];
    if (visitedUrls.has(cleanUrl) || depth > maxDepth) continue;
    visitedUrls.add(cleanUrl);

    try {
      console.log(`[Crawl] Navigating to ${cleanUrl} (depth ${depth})`);
      await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Extract interactive elements
      const elements = await page.evaluate(() => {
        const interactive: any[] = [];
        const nodes = document.querySelectorAll('button, a, input, select, textarea, [data-testid], [role]');
        
        nodes.forEach(node => {
          const el = node as HTMLElement;
          const testId = el.getAttribute('data-testid') || undefined;
          const role = el.getAttribute('role') || el.tagName.toLowerCase();
          const tag = el.tagName.toLowerCase();
          const type = (el as HTMLInputElement).type || undefined;
          const text = el.innerText ? el.innerText.trim().substring(0, 50) : undefined;
          const ariaLabel = el.getAttribute('aria-label') || undefined;

          // Build optimal selector preferring data-testid then ARIA role
          let selector = '';
          if (testId) {
            selector = `[data-testid="${testId}"]`;
          } else if (ariaLabel) {
            selector = `${tag}[aria-label="${ariaLabel}"]`;
          } else if (role && text) {
            selector = `role=${role}[name="${text}"]`;
          } else {
            selector = tag;
          }

          interactive.push({ selector, testId, role, tag, type, text, ariaLabel });
        });
        return interactive;
      });

      // Classify page type
      let pageType = 'general';
      if (cleanUrl.includes('/login')) pageType = 'auth-login';
      else if (cleanUrl.includes('/register')) pageType = 'auth-register';
      else if (cleanUrl.includes('/dashboard')) pageType = 'dashboard';
      else if (cleanUrl.includes('/items')) pageType = 'crud-store';
      else if (cleanUrl.includes('/feedback')) pageType = 'validation-form';

      const pageRecord: PageRecord = {
        url: cleanUrl,
        type: pageType,
        elements
      };
      pagesData.push(pageRecord);

      // Extract internal links for queue
      if (depth < maxDepth) {
        const hrefs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => (a as HTMLAnchorElement).href)
            .filter(h => h.startsWith(window.location.origin));
        });

        for (const href of hrefs) {
          const cleanHref = href.split('#')[0];
          if (!visitedUrls.has(cleanHref)) {
            queue.push({ url: cleanHref, depth: depth + 1 });
          }
        }
      }

    } catch (err: any) {
      console.warn(`[Crawl Warning] Failed to crawl ${cleanUrl}: ${err.message}`);
    }
  }

  await browser.close();

  // Map user flows connecting pages
  const flows: FlowRecord[] = [
    {
      name: 'Auth Flow',
      steps: [
        'Navigate to /login',
        'Fill email input [data-testid="email-input"]',
        'Fill password input [data-testid="password-input"]',
        'Click login submit button [data-testid="login-submit"]',
        'Verify redirect to /dashboard'
      ],
      linked_pages: ['/login', '/register', '/dashboard']
    },
    {
      name: 'CRUD Items Flow',
      steps: [
        'Navigate to /items',
        'Click open create modal [data-testid="open-create-modal"]',
        'Fill item name [data-testid="item-name-input"]',
        'Fill item description [data-testid="item-desc-input"]',
        'Click save item button [data-testid="save-item-btn"]',
        'Verify item is displayed in list [data-testid="item-row"]',
        'Click delete item button [data-testid="delete-item-btn"]'
      ],
      linked_pages: ['/dashboard', '/items']
    },
    {
      name: 'Validation Form Flow',
      steps: [
        'Navigate to /feedback',
        'Fill name [data-testid="feedback-name"]',
        'Fill email [data-testid="feedback-email"]',
        'Select category [data-testid="feedback-category"]',
        'Fill comments [data-testid="feedback-comments"]',
        'Click submit feedback [data-testid="submit-feedback"]',
        'Verify validation messages or success alert'
      ],
      linked_pages: ['/dashboard', '/feedback']
    }
  ];

  const appMap: AppMap = { pages: pagesData, flows };

  // Store in database via Ingestion API
  try {
    for (const p of pagesData) {
      await axios.post(`${INGESTION_API}/pages`, p);
    }
    for (const f of flows) {
      await axios.post(`${INGESTION_API}/flows`, f);
    }
    console.log(`[Phase 1 Exploration Agent] Successfully ingested ${pagesData.length} pages and ${flows.length} flows to DB.`);
  } catch (err: any) {
    console.warn(`[Ingestion Notice] Database ingestion warning: ${err.message}`);
  }

  return appMap;
}

// Runnable CLI CLI handler
if (require.main === module) {
  const targetUrl = process.argv[2] || 'http://localhost:4000';
  exploreApp(targetUrl).then(map => {
    console.log('App Map Result:', JSON.stringify(map, null, 2));
  }).catch(console.error);
}
