const { test, expect } = require('@playwright/test');
const { setup, addRow, dataRows } = require('./helpers');

// Helper: get text of a specific column for all data rows
async function columnValues(page, cellIndex) {
  return page.evaluate((idx) =>
    Array.from(
      document.querySelectorAll('#callTable tbody tr:not(.log-entry-row)')
    ).map(r => r.cells[idx].textContent.trim()),
    cellIndex
  );
}

test.describe('Table sorting', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    // Add rows that will sort differently by callsign
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ZZZ');
    await addRow(page, 'N2ABC');
  });

  test('Clicking Call Sign header sorts ascending', async ({ page }) => {
    await page.locator('#callTable th[data-key="callsign"]').click();
    const values = await columnValues(page, 1);
    const sorted = [...values].sort();
    expect(values).toEqual(sorted);
  });

  test('Clicking Call Sign header twice sorts descending', async ({ page }) => {
    await page.locator('#callTable th[data-key="callsign"]').click();
    await page.locator('#callTable th[data-key="callsign"]').click();
    const values = await columnValues(page, 1);
    const sorted = [...values].sort().reverse();
    expect(values).toEqual(sorted);
  });

  test('Sort indicator ▲ appears on ascending sort', async ({ page }) => {
    await page.locator('#callTable th[data-key="callsign"]').click();
    await expect(page.locator('#callTable th[data-key="callsign"]')).toContainText('▲');
  });

  test('Sort indicator ▼ appears on descending sort', async ({ page }) => {
    await page.locator('#callTable th[data-key="callsign"]').click();
    await page.locator('#callTable th[data-key="callsign"]').click();
    await expect(page.locator('#callTable th[data-key="callsign"]')).toContainText('▼');
  });

  test('Clicking a different column clears the previous indicator', async ({ page }) => {
    await page.locator('#callTable th[data-key="callsign"]').click();
    await page.locator('#callTable th[data-key="name"]').click();
    await expect(page.locator('#callTable th[data-key="callsign"]')).not.toContainText('▲');
    await expect(page.locator('#callTable th[data-key="callsign"]')).not.toContainText('▼');
  });

  test('Traffic sort puts pending (*) before no-traffic (-)', async ({ page }) => {
    // Set first row to pending traffic
    await dataRows(page).nth(0).locator('.traffic-cell').click();
    await page.locator('#callTable th[data-key="traffic"]').click();
    // After ascending sort: - comes before *
    // After descending sort: * comes first
    await page.locator('#callTable th[data-key="traffic"]').click(); // descending
    const first = await dataRows(page).nth(0).locator('.traffic-cell i').getAttribute('class');
    expect(first).toContain('bi-exclamation-diamond-fill');
  });
});
