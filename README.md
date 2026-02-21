# net-checkin

A browser-based check-in logger for amateur radio nets. All data is stored
locally in the browser — nothing is sent to a server. An optional
[QRZ](https://www.qrz.com) XML subscription enables automatic callsign
lookups to fill in operator name and location.

## Features

- Enter net name, date/time, frequency, and mode in the header bar
- Add check-ins by callsign; Tab performs a QRZ lookup without adding the
  station, Enter adds immediately
- Track traffic status per station (none / pending / covered) and whether
  each station has been called
- Log panel for recording notes per station; Process Next cycles through
  pending traffic and uncalled stations automatically
- Download the log as an **ADIF** file (`.adi`) for import into logging
  software, or **Print / Save as PDF** via the browser print dialog
- All data persists across page reloads via `localStorage`

## Hosting

`net_checkin.html` is a single self-contained file. It requires no build
step and can be served by any static web server.

### Jekyll / GitHub Pages

Add `net_checkin.html` to your Jekyll `docs/` directory. The file includes
Jekyll front matter and a `{% include footer.html %}` tag that will be
processed normally during the site build.

### Standalone (any static host)

Strip the Jekyll front matter and Liquid tags before deploying. The
`serve.js` script in this repo does this automatically for local use:

```
node serve.js
```

Then open `http://localhost:3000` in a browser. Bootstrap assets are loaded
from the jsDelivr CDN; no local copies are needed.

### Nginx / Apache / S3 / etc.

Pre-process the file (remove front matter, replace `{{ page.title }}`, and
remove `{% include ... %}` tags), then deploy the resulting HTML file as you
would any other static asset.

## Development & Testing

Tests are written with [Playwright](https://playwright.dev) and run inside a
Docker container so nothing needs to be installed on the host system.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Make](https://www.gnu.org/software/make/)

### Build the test image

```
make build
```

This builds a Docker image containing Node.js, the Playwright npm package,
and the Chromium browser. The browser download is cached in Docker layers and
only re-runs when `package.json` or `package-lock.json` changes.

### Run the tests

```
make test
```

Tests run inside the container. When they finish (pass or fail) the path to
the HTML report is printed:

```
Report: file:///path/to/net-checkin/playwright-report/index.html
```

Open that file in a browser to see the full results with failure details and
screenshots.

### Test suite layout

| File | What it covers |
|---|---|
| `tests/navbar.spec.js` | Mode auto-detection, field persistence, reset, download button state |
| `tests/checkin.spec.js` | Adding rows, duplicates, delete, traffic/called cycling, persistence |
| `tests/sort.spec.js` | Column sorting ascending/descending, sort indicators |
| `tests/log.spec.js` | Log panel open/close, Cancel/Done, Process Next flow |
| `tests/download.spec.js` | ADIF content validation, print window, download button gating |
| `tests/qrz.spec.js` | Mocked QRZ login, lookup, session expiry, Refresh QRZ |

### Continuous integration

A GitHub Actions workflow (`.github/workflows/test.yml`) builds the Docker
image and runs the full suite on every push and pull request to `main`. The
HTML report is uploaded as a build artifact and retained for 14 days.

## Attribution

Developed by [Jeffrey Honig (N2VLV)](https://n2vlv.net) with assistance from
[Claude.ai](https://claude.ai).
