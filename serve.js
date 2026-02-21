/**
 * Development / test server for net_checkin.html.
 * Strips Jekyll front matter and Liquid tags, substitutes CDN asset URLs,
 * so the file can be served standalone without a Jekyll build.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT  = process.env.PORT || 3000;
const TITLE = 'N2VLV Net Check-Ins';

const CDN = {
  css: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  icons: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css',
  js: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
};

function processHtml() {
  let html = fs.readFileSync(path.join(__dirname, 'net_checkin.html'), 'utf8');

  // Strip Jekyll front matter (--- ... ---)
  html = html.replace(/^---[\s\S]*?---\n/, '');

  // Replace Liquid variables
  html = html.replace(/\{\{\s*page\.title\s*\}\}/g, TITLE);

  // Remove Liquid tags ({% ... %})
  html = html.replace(/\{%[^%]*%\}/g, '');

  // Replace local asset paths with CDN equivalents
  html = html.replace(
    '<link href="css/bootstrap.min.css" rel="stylesheet">',
    `<link href="${CDN.css}" rel="stylesheet">`
  );
  html = html.replace(
    '<link href="fonts/bootstrap-icons.min.css" rel="stylesheet">',
    `<link href="${CDN.icons}" rel="stylesheet">`
  );
  html = html.replace(
    '<script src="js/bootstrap.bundle.min.js"></script>',
    `<script src="${CDN.js}"></script>`
  );

  return html;
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/net_checkin.html') {
    try {
      const html = processHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500);
      res.end(`Error processing HTML: ${err.message}`);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Serving net_checkin.html on http://localhost:${PORT}`);
});
