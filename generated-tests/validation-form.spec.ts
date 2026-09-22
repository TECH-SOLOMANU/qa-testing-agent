import { test, expect } from '@playwright/test';

test.describe('Feedback Form Validation Tests', () => {
  const BASE_URL = 'https://the-internet.herokuapp.com';

  test('Happy Path - Submit Valid Feedback Form', async ({ page }) => {
    await page.goto(`${BASE_URL}/feedback`);
    await expect(page.getByTestId('feedback-title')).toBeVisible();

    await page.getByTestId('feedback-name').fill('QA Tester');
    await page.getByTestId('feedback-email').fill('tester@example.com');
    await page.getByTestId('feedback-category').selectOption('feature');
    await page.getByTestId('feedback-comments').fill('This is a valid long feedback comment for testing purposes.');

    await page.getByTestId('submit-feedback').click();
    await expect(page.getByTestId('feedback-success')).toBeVisible();
  });

  test('Negative Case - Invalid Email & Short Comment Triggers Inline Validation Errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/feedback`);

    await page.getByTestId('feedback-email').fill('invalid-email-format');
    await page.getByTestId('feedback-comments').fill('short');

    await page.getByTestId('submit-feedback').click();

    await expect(page.getByTestId('error-email')).toBeVisible();
    await expect(page.getByTestId('error-comments')).toBeVisible();
  });
});
