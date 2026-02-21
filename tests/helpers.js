/**
 * Shared test helpers.
 * Every test that modifies state should call setup() first to get a clean slate.
 */

const NET_NAME = 'Test Net';
const NET_DATE = '2026-02-21T19:00';

/** Navigate to the page and clear localStorage so each test starts fresh. */
async function setup(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Fill the net name and date/time fields. */
async function fillNetInfo(page, { name = NET_NAME, date = NET_DATE } = {}) {
  await page.fill('#netName', name);
  await page.fill('#netDateTime', date);
}

/**
 * Type a frequency and blur the field (which triggers mode auto-detection
 * and frequency validation).
 */
async function setFrequency(page, freq) {
  await page.fill('#frequencyInput', freq);
  await page.locator('#frequencyInput').blur();
}

/**
 * Add a callsign row without QRZ (no session key needed).
 * Waits until the row actually appears in the table.
 */
async function addRow(page, callsign, { shift = false } = {}) {
  await page.fill('#callsignInput', callsign);
  if (shift) {
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');
  } else {
    await page.keyboard.press('Enter');
  }
  // Wait for the row to appear
  await page.waitForFunction(
    (cs) => Array.from(
      document.querySelectorAll('#callTable tbody tr:not(.log-entry-row) td:nth-child(2)')
    ).some(td => td.textContent.includes(cs)),
    callsign.toUpperCase()
  );
}

/** Returns a locator for all data rows (excludes log-entry sub-rows). */
function dataRows(page) {
  return page.locator('#callTable tbody tr:not(.log-entry-row)');
}

module.exports = { setup, fillNetInfo, setFrequency, addRow, dataRows, NET_NAME, NET_DATE };
