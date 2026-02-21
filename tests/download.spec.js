const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { setup, fillNetInfo, setFrequency, addRow, dataRows } = require('./helpers');

/** Open the Download dropdown (button must already be enabled). */
async function openDownloadMenu(page) {
  await page.locator('#downloadDropdown').click();
  await expect(page.locator('#downloadADIF')).toBeVisible();
}

test.describe('Download dropdown', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Dropdown opens when button is enabled', async ({ page }) => {
    await fillNetInfo(page);
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);
    await expect(page.locator('#downloadADIF')).toBeVisible();
    await expect(page.locator('#printLog')).toBeVisible();
  });
});

test.describe('ADIF export', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Downloaded file has .adi extension', async ({ page }) => {
    await fillNetInfo(page, { name: 'Test Net', date: '2026-02-21T19:00' });
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.adi$/);
  });

  test('Filename contains net name and date', async ({ page }) => {
    await fillNetInfo(page, { name: 'Test Net', date: '2026-02-21T19:00' });
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    expect(download.suggestedFilename()).toContain('TestNet');
    expect(download.suggestedFilename()).toContain('2026-02-21');
  });

  test('ADIF file contains valid header', async ({ page }) => {
    await fillNetInfo(page);
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const filePath = await download.path();
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('<ADIF_VER:5>3.1.4');
    expect(content).toContain('<EOH>');
    expect(content).toContain('<EOR>');
  });

  test('ADIF record contains correct CALL field', async ({ page }) => {
    await fillNetInfo(page);
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content).toContain('<CALL:4>W1AW');
  });

  test('ADIF record contains QSO_DATE from net date field', async ({ page }) => {
    await fillNetInfo(page, { date: '2026-02-21T19:00' });
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content).toContain('<QSO_DATE:8>20260221');
  });

  test('ADIF record contains FREQ and correct BAND', async ({ page }) => {
    await fillNetInfo(page);
    await setFrequency(page, '146.520');
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content).toContain('<FREQ:7>146.520');
    expect(content).toContain('<BAND:2>2m');
  });

  test('ADIF record contains auto-detected MODE', async ({ page }) => {
    await fillNetInfo(page);
    await setFrequency(page, '146.520');
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content).toContain('<MODE:2>FM');
  });

  test('ADIF record uses manually selected MODE over auto-detect', async ({ page }) => {
    await fillNetInfo(page);
    await setFrequency(page, '146.520');
    await page.selectOption('#modeInput', 'C4FM');
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content).toContain('<MODE:4>C4FM');
  });

  test('ADIF contains one record per check-in', async ({ page }) => {
    await fillNetInfo(page);
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');
    await addRow(page, 'N2XYZ');
    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    const eorCount = (content.match(/<EOR>/g) || []).length;
    expect(eorCount).toBe(3);
  });

  test('ADIF includes COMMENT when log text is present', async ({ page }) => {
    await fillNetInfo(page);
    await addRow(page, 'W1AW');

    // Open log panel, enter a note, and close via Done
    await dataRows(page).first().locator('button:has-text("Log")').click();
    await page.locator('.log-entry-row textarea').fill('Passed traffic to N2XYZ');
    await page.locator('.log-entry-row button:has-text("Done")').click();

    await openDownloadMenu(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#downloadADIF').click(),
    ]);

    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content).toContain('Passed traffic to N2XYZ');
  });
});

test.describe('Print / Save as PDF', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Opens a new window', async ({ page }) => {
    await fillNetInfo(page, { name: 'Test Net' });
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#printLog').click(),
    ]);

    expect(popup).toBeTruthy();
  });

  test('Print window contains net name', async ({ page }) => {
    await fillNetInfo(page, { name: 'Evening Net' });
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#printLog').click(),
    ]);

    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('h1')).toContainText('Evening Net');
  });

  test('Print window contains all check-in rows', async ({ page }) => {
    await fillNetInfo(page);
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');
    await openDownloadMenu(page);

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#printLog').click(),
    ]);

    await popup.waitForLoadState('domcontentloaded');
    const rows = popup.locator('table tbody tr');
    await expect(rows).toHaveCount(2);
  });

  test('Print window shows frequency and mode in header', async ({ page }) => {
    await fillNetInfo(page);
    await setFrequency(page, '146.520');
    await addRow(page, 'W1AW');
    await openDownloadMenu(page);

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('#printLog').click(),
    ]);

    await popup.waitForLoadState('domcontentloaded');
    const body = await popup.locator('body').textContent();
    expect(body).toContain('146.520');
    expect(body).toContain('FM');
  });
});
