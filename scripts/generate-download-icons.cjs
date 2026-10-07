const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Laptop, Monitor, Terminal, Download } = require('lucide-react');

const output = path.resolve(__dirname, '../apps/web/public/download-assets');
fs.mkdirSync(output, { recursive: true });
for (const [name, icon] of Object.entries({ laptop: Laptop, monitor: Monitor, terminal: Terminal, download: Download })) {
  fs.writeFileSync(path.join(output, `${name}.svg`), renderToStaticMarkup(React.createElement(icon, { color: '#1d1d1f', strokeWidth: 1.6 })));
}
console.log('Download icons generated from lucide-react');
