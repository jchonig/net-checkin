const { test, expect } = require('@playwright/test');
const { setup, dataRows } = require('./helpers');

// XML responses returned by the mock QRZ server

const LOGIN_OK = `<?xml version="1.0"?>
<QRZDatabase>
  <Session><Key>TESTKEY123</Key></Session>
</QRZDatabase>`;

const LOGIN_FAIL = `<?xml version="1.0"?>
<QRZDatabase>
  <Session><Error>Username/password incorrect</Error></Session>
</QRZDatabase>`;

const LOOKUP_W1AW = `<?xml version="1.0"?>
<QRZDatabase>
  <Callsign>
    <call>W1AW</call>
    <fname>Hiram Percy</fname>
    <name>Maxim</name>
    <addr2>Newington</addr2>
    <state>CT</state>
    <country>United States</country>
  </Callsign>
  <Session><Key>TESTKEY123</Key></Session>
</QRZDatabase>`;

const SESSION_EXPIRED = `<?xml version="1.0"?>
<QRZDatabase>
  <Session><Error>Session Key Error</Error></Session>
</QRZDatabase>`;

const NOT_FOUND = `<?xml version="1.0"?>
<QRZDatabase>
  <Session><Error>Not found: XX1XX</Error></Session>
</QRZDatabase>`;

/** Mock all QRZ calls: login returns OK, callsign lookup returns LOOKUP_W1AW. */
async function mockQrz(page, { loginResp = LOGIN_OK, lookupResp = LOOKUP_W1AW } = {}) {
  await page.route('**/xmldata.qrz.com/**', async (route, request) => {
    const url = request.url();
    const resp = url.includes('callsign=') ? lookupResp : loginResp;
    await route.fulfill({ contentType: 'application/xml', body: resp });
  });
}

/** Log in via the mocked QRZ form. */
async function login(page, username = 'W1AW') {
  await page.click('#loginDropdown');
  await page.fill('#username', username);
  await page.fill('#password', 'testpassword');
  await page.click('#loginForm button[type="submit"]');
  await expect(page.locator('#loginDropdown')).toContainText(username.toUpperCase());
}

test.describe('QRZ login', () => {
  test.beforeEach(async ({ page }) => { await setup(page); });

  test('Successful login shows username in button', async ({ page }) => {
    await mockQrz(page);
    await login(page, 'W1AW');
    await expect(page.locator('#loginDropdown')).toContainText('W1AW');
  });

  test('Successful login enables Refresh QRZ button', async ({ page }) => {
    await mockQrz(page);
    await login(page, 'W1AW');
    await expect(page.locator('#refreshButton')).toBeEnabled();
  });

  test('Failed login shows error and leaves button as QRZ Login', async ({ page }) => {
    await mockQrz(page, { loginResp: LOGIN_FAIL });
    await page.click('#loginDropdown');
    await page.fill('#username', 'W1AW');
    await page.fill('#password', 'wrongpass');
    await page.click('#loginForm button[type="submit"]');
    await expect(page.locator('#status')).toContainText('failed');
    await expect(page.locator('#loginDropdown')).toContainText('QRZ Login');
  });

  test('Session is persisted across reload', async ({ page }) => {
    await mockQrz(page);
    await login(page, 'W1AW');
    await page.reload();
    await expect(page.locator('#loginDropdown')).toContainText('W1AW');
  });
});

test.describe('QRZ callsign lookup', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await mockQrz(page);
    await login(page);
  });

  test('Tab key triggers lookup and shows result box', async ({ page }) => {
    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Tab');
    await expect(page.locator('#lookupResult')).toBeVisible();
    await expect(page.locator('#lookupResult')).toContainText('W1AW');
  });

  test('Lookup result shows name from QRZ', async ({ page }) => {
    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Tab');
    await expect(page.locator('#lookupResult')).toContainText('Maxim');
  });

  test('Lookup result shows location from QRZ', async ({ page }) => {
    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Tab');
    await expect(page.locator('#lookupResult')).toContainText('Newington');
  });

  test('Enter after lookup adds row with QRZ data', async ({ page }) => {
    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Tab');
    await page.locator('#callsignInput').press('Enter');
    await expect(dataRows(page)).toHaveCount(1);
    await expect(dataRows(page).first().locator('td').nth(2)).toContainText('Maxim');
  });

  test('Not-found callsign shows error', async ({ page }) => {
    await page.route('**/xmldata.qrz.com/**callsign=**', async route => {
      await route.fulfill({ contentType: 'application/xml', body: NOT_FOUND });
    });
    await page.fill('#callsignInput', 'XX1XX');
    await page.keyboard.press('Tab');
    await expect(page.locator('#status')).toContainText('not found');
  });
});

test.describe('Session expiry', () => {
  test('Expired session during lookup logs user out', async ({ page }) => {
    await setup(page);

    // Login succeeds, but subsequent lookup returns session error
    let callCount = 0;
    await page.route('**/xmldata.qrz.com/**', async (route, request) => {
      callCount++;
      const resp = callCount === 1 ? LOGIN_OK : SESSION_EXPIRED;
      await route.fulfill({ contentType: 'application/xml', body: resp });
    });

    await login(page);

    // Accept the "session expired" alert
    page.once('dialog', d => d.accept());

    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Tab');

    await expect(page.locator('#loginDropdown')).toContainText('QRZ Login');
  });
});

test.describe('Refresh QRZ', () => {
  test('Refresh updates name and location for existing rows', async ({ page }) => {
    await setup(page);

    // Add row without QRZ (name = "—")
    await page.fill('#callsignInput', 'W1AW');
    await page.keyboard.press('Enter');
    await expect(dataRows(page)).toHaveCount(1);
    await expect(dataRows(page).first().locator('td').nth(2)).toHaveText('—');

    // Now mock QRZ and log in
    await mockQrz(page);
    await login(page);

    await page.click('#refreshButton');
    await expect(dataRows(page).first().locator('td').nth(2)).toContainText('Maxim');
  });
});
