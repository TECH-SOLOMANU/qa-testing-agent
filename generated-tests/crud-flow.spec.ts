import { test, expect } from '@playwright/test';

test.describe('CRUD Items Flow Tests', () => {
  const BASE_URL = 'https://the-internet.herokuapp.com';

  test('Happy Path - Create and Delete Item Successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/items`);
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
    await page.goto(`${BASE_URL}/items`);

    await page.getByTestId('open-create-modal').click();
    await page.getByTestId('item-name-input').fill('BUG_ITEM');
    await page.getByTestId('item-desc-input').fill('This should trigger intentional seed bug');
    await page.getByTestId('save-item-btn').click();

    // Expecting server error page or alert
    await expect(page.getByTestId('server-error-heading')).toBeVisible();
  });
});
