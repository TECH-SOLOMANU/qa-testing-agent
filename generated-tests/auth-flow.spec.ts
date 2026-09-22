import { test, expect } from '@playwright/test';

test.describe('Auth Flow Tests', () => {
  const BASE_URL = 'https://the-internet.herokuapp.com';

  test('Happy Path - Successful Login with Valid Credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByTestId('login-title')).toBeVisible();

    await page.getByTestId('email-input').fill('user@demo.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(`${BASE_URL}/dashboard?user=Demo%20User`);
    await expect(page.getByTestId('dashboard-heading')).toContainText('Welcome, Demo User!');
  });

  test('Negative Case - Failed Login with Invalid Credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.getByTestId('email-input').fill('invalid@demo.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByTestId('login-error-alert')).toBeVisible();
    await expect(page.getByTestId('login-error-alert')).toContainText('Invalid email or password');
  });
});
