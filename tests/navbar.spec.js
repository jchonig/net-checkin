const { test, expect } = require('@playwright/test');
const { setup, fillNetInfo, setFrequency, addRow } = require('./helpers');

test.describe('Mode auto-detection', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('VHF/UHF frequency sets mode to FM', async ({ page }) => {
    await setFrequency(page, '146.520');
    await expect(page.locator('#modeInput')).toHaveValue('FM');
  });

  test('40m frequency sets mode to LSB', async ({ page }) => {
    await setFrequency(page, '7.250');
    await expect(page.locator('#modeInput')).toHaveValue('LSB');
  });

  test('20m frequency sets mode to USB', async ({ page }) => {
    await setFrequency(page, '14.225');
    await expect(page.locator('#modeInput')).toHaveValue('USB');
  });

  test('6m boundary sets mode to FM', async ({ page }) => {
    await setFrequency(page, '52.525');
    await expect(page.locator('#modeInput')).toHaveValue('FM');
  });

  test('Mode not overwritten when already set', async ({ page }) => {
    await page.selectOption('#modeInput', 'CW');
    await setFrequency(page, '146.520');
    await expect(page.locator('#modeInput')).toHaveValue('CW');
  });

  test('Invalid frequency shows error message', async ({ page }) => {
    await setFrequency(page, '999.999');
    await expect(page.locator('#status')).toContainText('Invalid frequency');
  });
});

test.describe('Persistence across reload', () => {
  test('Net name, date, frequency, and mode survive a reload', async ({ page }) => {
    await setup(page);
    await fillNetInfo(page, { name: 'Evening Net' });
    await setFrequency(page, '146.520');
    await expect(page.locator('#modeInput')).toHaveValue('FM');

    await page.reload();

    await expect(page.locator('#netName')).toHaveValue('Evening Net');
    await expect(page.locator('#frequencyInput')).toHaveValue('146.520');
    await expect(page.locator('#modeInput')).toHaveValue('FM');
  });

  test('Manually chosen mode persists across reload', async ({ page }) => {
    await setup(page);
    await page.selectOption('#modeInput', 'DMR');
    // Trigger a save by filling net name (which fires input event)
    await fillNetInfo(page);

    await page.reload();
    await expect(page.locator('#modeInput')).toHaveValue('DMR');
  });
});

test.describe('Reset form', () => {
  test('Reset clears name, frequency, and mode', async ({ page }) => {
    await setup(page);
    await fillNetInfo(page, { name: 'Evening Net' });
    await setFrequency(page, '146.520');

    page.once('dialog', d => d.accept());
    await page.click('#resetButton');

    await expect(page.locator('#netName')).toHaveValue('');
    await expect(page.locator('#frequencyInput')).toHaveValue('');
    await expect(page.locator('#modeInput')).toHaveValue('');
  });

  test('Reset removes all check-in rows', async ({ page }) => {
    await setup(page);
    await addRow(page, 'W1AW');
    await addRow(page, 'K9ABC');

    page.once('dialog', d => d.accept());
    await page.click('#resetButton');

    await expect(page.locator('#callTable tbody tr')).toHaveCount(0);
  });

  test('Reset cancelled leaves data intact', async ({ page }) => {
    await setup(page);
    await fillNetInfo(page, { name: 'Evening Net' });

    page.once('dialog', d => d.dismiss());
    await page.click('#resetButton');

    await expect(page.locator('#netName')).toHaveValue('Evening Net');
  });
});

test.describe('Download button availability', () => {
  test('Disabled with no name, date, or rows', async ({ page }) => {
    await setup(page);
    await expect(page.locator('#downloadDropdown')).toBeDisabled();
  });

  test('Disabled with name and date but no rows', async ({ page }) => {
    await setup(page);
    await fillNetInfo(page);
    await expect(page.locator('#downloadDropdown')).toBeDisabled();
  });

  test('Enabled once name, date, and at least one row are present', async ({ page }) => {
    await setup(page);
    await fillNetInfo(page);
    await addRow(page, 'W1AW');
    await expect(page.locator('#downloadDropdown')).toBeEnabled();
  });
});
