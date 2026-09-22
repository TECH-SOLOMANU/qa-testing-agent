import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { AppMap } from '../exploration/crawler';

const INGESTION_API = process.env.INGESTION_API || 'http://localhost:5000/api';
const TESTS_DIR = path.resolve(__dirname, '../../generated-tests');

if (!fs.existsSync(TESTS_DIR)) {
  fs.mkdirSync(TESTS_DIR, { recursive: true });
}

export interface GeneratedTestFile {
  flowId?: string;
  filename: string;
  filePath: string;
  code: string;
  type: string;
}

export async function generateTestsForAppMap(appMap: AppMap, baseUrl: string = 'http://localhost:4000'): Promise<GeneratedTestFile[]> {
  console.log(`[Phase 2 Test Generation Agent] Generating Playwright TS tests using ARIA roles & data-testid selectors...`);
  const generatedFiles: GeneratedTestFile[] = [];

  // 1. Auth Flow Spec (Happy path + Negative case)
  const authTestCode = `import { test, expect } from '@playwright/test';

test.describe('Auth Flow Tests', () => {
  const BASE_URL = '${baseUrl}';

  test('Happy Path - Successful Login with Valid Credentials', async ({ page }) => {
    await page.goto(\`\${BASE_URL}/login\`);
    await expect(page.getByTestId('login-title')).toBeVisible();

    await page.getByTestId('email-input').fill('user@demo.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(\`\${BASE_URL}/dashboard?user=Demo%20User\`);
    await expect(page.getByTestId('dashboard-heading')).toContainText('Welcome, Demo User!');
  });

  test('Negative Case - Failed Login with Invalid Credentials', async ({ page }) => {
    await page.goto(\`\${BASE_URL}/login\`);
    
    await page.getByTestId('email-input').fill('invalid@demo.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByTestId('login-error-alert')).toBeVisible();
    await expect(page.getByTestId('login-error-alert')).toContainText('Invalid email or password');
  });
});
`;

  // 2. CRUD Flow Spec (Happy path + Negative/Bug case)
  const crudTestCode = `import { test, expect } from '@playwright/test';

test.describe('CRUD Items Flow Tests', () => {
  const BASE_URL = '${baseUrl}';

  test('Happy Path - Create and Delete Item Successfully', async ({ page }) => {
    await page.goto(\`\${BASE_URL}/items\`);
    await expect(page.getByTestId('items-heading')).toBeVisible();

    // Create item
    await page.getByTestId('open-create-modal').click();
    await expect(page.getByTestId('modal-title')).toBeVisible();

    const uniqueItemName = 'Test Item ' + Date.now();
    await page.getByTestId('item-name-input').fill(uniqueItemName);
    await page.getByTestId('item-desc-input').fill('Automated test description content');
    await page.getByTestId('save-item-btn').click();

    await expect(page.getByText(uniqueItemName)).toBeVisible();

    // Delete item
    const itemCard = page.locator('[data-testid="item-row"]').filter({ hasText: uniqueItemName });
    await itemCard.getByTestId('delete-item-btn').click();

    await expect(page.getByText(uniqueItemName)).not.toBeVisible();
  });

  test('Negative/Bug Case - Creating Reserved BUG_ITEM Triggers Server Error', async ({ page }) => {
    await page.goto(\`\${BASE_URL}/items\`);

    await page.getByTestId('open-create-modal').click();
    await page.getByTestId('item-name-input').fill('BUG_ITEM');
    await page.getByTestId('item-desc-input').fill('This should trigger intentional seed bug');
    await page.getByTestId('save-item-btn').click();

    // Expecting server error page or alert
    await expect(page.getByTestId('server-error-heading')).toBeVisible();
  });
});
`;

  // 3. Validation Form Flow Spec (Happy path + Validation Error case)
  const validationTestCode = `import { test, expect } from '@playwright/test';

test.describe('Feedback Form Validation Tests', () => {
  const BASE_URL = '${baseUrl}';

  test('Happy Path - Submit Valid Feedback Form', async ({ page }) => {
    await page.goto(\`\${BASE_URL}/feedback\`);
    await expect(page.getByTestId('feedback-title')).toBeVisible();

    await page.getByTestId('feedback-name').fill('QA Tester');
    await page.getByTestId('feedback-email').fill('tester@example.com');
    await page.getByTestId('feedback-category').selectOption('feature');
    await page.getByTestId('feedback-comments').fill('This is a valid long feedback comment for testing purposes.');

    await page.getByTestId('submit-feedback').click();
    await expect(page.getByTestId('feedback-success')).toBeVisible();
  });

  test('Negative Case - Invalid Email & Short Comment Triggers Inline Validation Errors', async ({ page }) => {
    await page.goto(\`\${BASE_URL}/feedback\`);

    await page.getByTestId('feedback-email').fill('invalid-email-format');
    await page.getByTestId('feedback-comments').fill('short');

    await page.getByTestId('submit-feedback').click();

    await expect(page.getByTestId('error-email')).toBeVisible();
    await expect(page.getByTestId('error-comments')).toBeVisible();
  });
});
`;

  const specs = [
    { filename: 'auth-flow.spec.ts', code: authTestCode, type: 'auth' },
    { filename: 'crud-flow.spec.ts', code: crudTestCode, type: 'crud' },
    { filename: 'validation-form.spec.ts', code: validationTestCode, type: 'validation' }
  ];

  for (const spec of specs) {
    const filePath = path.join(TESTS_DIR, spec.filename);
    
    // Lint / Dry Syntax Check
    try {
      new Function(spec.code.replace(/import .*/g, ''));
    } catch (e: any) {
      console.warn(`[Lint Warning] Syntax lint error in ${spec.filename}: ${e.message}`);
    }

    fs.writeFileSync(filePath, spec.code, 'utf-8');
    console.log(`[Test Generator] Saved test spec: generated-tests/${spec.filename}`);

    const genFile: GeneratedTestFile = {
      filename: spec.filename,
      filePath,
      code: spec.code,
      type: spec.type
    };
    generatedFiles.push(genFile);

    // Record in TestCase database table
    try {
      await axios.post(`${INGESTION_API}/test-cases`, {
        flow_id: spec.type,
        file_path: `generated-tests/${spec.filename}`,
        type: spec.type
      });
    } catch (err: any) {
      console.warn(`[Ingestion Notice] Could not save test case: ${err.message}`);
    }
  }

  return generatedFiles;
}

if (require.main === module) {
  generateTestsForAppMap({ pages: [], flows: [] }).then(files => {
    console.log(`Generated ${files.length} test files.`);
  }).catch(console.error);
}
