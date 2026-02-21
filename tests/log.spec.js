const { test, expect } = require('@playwright/test');
const { setup, addRow, dataRows } = require('./helpers');

test.describe('Log panel', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await addRow(page, 'W1AW');
  });

  test('Log button opens the panel', async ({ page }) => {
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await expect(page.locator('.log-entry-row')).toBeVisible();
  });

  test('Log panel shows the callsign', async ({ page }) => {
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await expect(page.locator('.log-entry-row')).toContainText('W1AW');
  });

  test('Clicking Log again closes the panel', async ({ page }) => {
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await expect(page.locator('.log-entry-row')).toHaveCount(0);
  });

  test('Cancel closes the panel without advancing', async ({ page }) => {
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await page.locator('.log-entry-row textarea').fill('Some notes');
    await page.locator('.log-entry-row button:has-text("Cancel")').click();
    await expect(page.locator('.log-entry-row')).toHaveCount(0);
    // Called should remain unchecked
    await expect(dataRows(page).first().locator('.called-cell i')).toHaveClass(/bi-circle/);
  });

  test('Done sets Called to checked and closes the panel', async ({ page }) => {
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await page.locator('.log-entry-row button:has-text("Done")').click();
    await expect(page.locator('.log-entry-row')).toHaveCount(0);
    await expect(dataRows(page).first().locator('.called-cell i')).toHaveClass(/bi-check-circle-fill/);
  });

  test('Done converts pending traffic to covered', async ({ page }) => {
    // Set to pending traffic first
    await dataRows(page).first().locator('.traffic-cell').click();
    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-exclamation-diamond-fill/);

    await dataRows(page).first().locator('button:has-text("Log")').click();
    await page.locator('.log-entry-row button:has-text("Done")').click();

    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-check-circle/);
  });

  test('Draft text is preserved when closing via Log button and reopening', async ({ page }) => {
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await page.locator('.log-entry-row textarea').fill('My draft note');
    // Close by clicking Log again
    await dataRows(page).first().locator('button:has-text("Log")').click();
    // Reopen
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await expect(page.locator('.log-entry-row textarea')).toHaveValue('My draft note');
  });

  test('Only one log panel open at a time', async ({ page }) => {
    await addRow(page, 'K9ABC');
    await dataRows(page).nth(0).locator('button:has-text("Log")').click();
    await dataRows(page).nth(1).locator('button:has-text("Log")').click();
    await expect(page.locator('.log-entry-row')).toHaveCount(1);
  });
});

test.describe('Process Next', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('Shows "all processed" when no pending stations', async ({ page }) => {
    // Empty table — nothing to process
    await page.click('#processNextBtn');
    await expect(page.locator('#status')).toContainText('All stations have been processed');
  });

  test('Opens log panel for station with pending traffic', async ({ page }) => {
    await addRow(page, 'W1AW');
    // Set pending traffic
    await dataRows(page).first().locator('.traffic-cell').click();

    await page.click('#processNextBtn');
    await expect(page.locator('.log-entry-row')).toBeVisible();
    await expect(page.locator('.log-entry-row')).toContainText('W1AW');
  });

  test('Done advances to next pending station', async ({ page }) => {
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');
    // Give both pending traffic
    await dataRows(page).nth(0).locator('.traffic-cell').click();
    await dataRows(page).nth(1).locator('.traffic-cell').click();

    await page.click('#processNextBtn');
    // First station's log opens
    await expect(page.locator('.log-entry-row')).toContainText('W1AW');

    // Done should advance to second station
    await page.locator('.log-entry-row button:has-text("Done")').click();
    await expect(page.locator('.log-entry-row')).toContainText('K9ABC');
  });
});
