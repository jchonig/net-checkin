const { test, expect } = require('@playwright/test');
const { setup, addRow, dataRows } = require('./helpers');

test.describe('Adding check-ins', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Add a callsign row', async ({ page }) => {
    await addRow(page, 'W1AW');
    await expect(dataRows(page)).toHaveCount(1);
    await expect(dataRows(page).first().locator('td').nth(1)).toContainText('W1AW');
  });

  test('Callsign is stored as uppercase', async ({ page }) => {
    await addRow(page, 'w1aw');
    await expect(dataRows(page).first().locator('td').nth(1)).toContainText('W1AW');
  });

  test('Callsign without QRZ shows dashes for name and location', async ({ page }) => {
    await addRow(page, 'W1AW');
    await expect(dataRows(page).first().locator('td').nth(2)).toHaveText('—');
    await expect(dataRows(page).first().locator('td').nth(3)).toHaveText('—');
  });

  test('Duplicate callsign is blocked and shows error', async ({ page }) => {
    await addRow(page, 'W1AW');
    // Attempt to add same callsign again
    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Enter');
    await expect(dataRows(page)).toHaveCount(1);
    await expect(page.locator('#status')).toContainText('Duplicate');
  });

  test('Check-in time is recorded in the row', async ({ page }) => {
    await addRow(page, 'W1AW');
    const timeText = await dataRows(page).first().locator('td').nth(4).textContent();
    // Should be HH:MM:SS format
    expect(timeText.trim()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test('Callsign links to QRZ', async ({ page }) => {
    await addRow(page, 'W1AW');
    const href = await dataRows(page).first().locator('td').nth(1).locator('a').getAttribute('href');
    expect(href).toContain('qrz.com/db/W1AW');
  });
});

test.describe('Multiple rows', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Multiple callsigns can be added', async ({ page }) => {
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');
    await addRow(page, 'N2XYZ');
    await expect(dataRows(page)).toHaveCount(3);
  });

  test('Check-in count in title updates', async ({ page }) => {
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');
    await expect(page.locator('#checkedInTitle')).toContainText('2 total');
  });
});

test.describe('Deleting check-ins', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Delete button removes the row', async ({ page }) => {
    await addRow(page, 'W1AW');
    await dataRows(page).first().locator('button:has-text("Delete")').click();
    await expect(dataRows(page)).toHaveCount(0);
  });

  test('Deleting one of several rows leaves the rest', async ({ page }) => {
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');
    await dataRows(page).first().locator('button:has-text("Delete")').click();
    await expect(dataRows(page)).toHaveCount(1);
  });
});

test.describe('Traffic cell', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await addRow(page, 'W1AW');
  });

  test('Starts with no-traffic icon', async ({ page }) => {
    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-circle/);
  });

  test('First click sets pending traffic', async ({ page }) => {
    await dataRows(page).first().locator('.traffic-cell').click();
    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-exclamation-diamond-fill/);
  });

  test('Second click sets traffic covered', async ({ page }) => {
    await dataRows(page).first().locator('.traffic-cell').click();
    await dataRows(page).first().locator('.traffic-cell').click();
    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-check-circle/);
  });

  test('Third click cycles back to no-traffic', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await dataRows(page).first().locator('.traffic-cell').click();
    }
    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-circle/);
  });

  test('Pending traffic reflected in title count', async ({ page }) => {
    await dataRows(page).first().locator('.traffic-cell').click();
    await expect(page.locator('#checkedInTitle')).toContainText('1 with traffic');
  });
});

test.describe('Called cell', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await addRow(page, 'W1AW');
  });

  test('Starts with not-called icon', async ({ page }) => {
    await expect(dataRows(page).first().locator('.called-cell i')).toHaveClass(/bi-circle/);
  });

  test('First click sets called', async ({ page }) => {
    await dataRows(page).first().locator('.called-cell').click();
    await expect(dataRows(page).first().locator('.called-cell i')).toHaveClass(/bi-check-circle-fill/);
  });

  test('Second click cycles back to not-called', async ({ page }) => {
    await dataRows(page).first().locator('.called-cell').click();
    await dataRows(page).first().locator('.called-cell').click();
    await expect(dataRows(page).first().locator('.called-cell i')).toHaveClass(/bi-circle/);
  });
});

test.describe('Persistence of rows', () => {
  test('Rows, traffic, and called state survive a reload', async ({ page }) => {
    await setup(page);
    await addRow(page, 'W1AW');
    await dataRows(page).first().locator('.traffic-cell').click(); // pending
    await dataRows(page).first().locator('.called-cell').click();  // called

    await page.reload();

    await expect(dataRows(page)).toHaveCount(1);
    await expect(dataRows(page).first().locator('.traffic-cell i')).toHaveClass(/bi-exclamation-diamond-fill/);
    await expect(dataRows(page).first().locator('.called-cell i')).toHaveClass(/bi-check-circle-fill/);
  });
});
