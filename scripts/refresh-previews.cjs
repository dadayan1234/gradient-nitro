// Publish screenshots only after the browser and native checks have succeeded.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, '.vscode-test', 'theme-studio');
const destination = path.join(root, 'docs', 'images');
const images = {
  'studio-dark.png': 'theme-studio.png',
  'studio-light.png': 'theme-studio-light.png',
  'studio-webview.png': 'theme-studio-vscode.png',
  'studio-950.png': 'theme-studio-medium.png',
  'studio-390.png': 'theme-studio-narrow.png',
  'studio-collapsed.png': 'theme-studio-collapsed.png',
  'native-dark.png': 'workbench-dark.png',
  'native-light.png': 'workbench-light.png',
  'native-modern.png': 'workbench-modern.png'
};
for (const name of Object.keys(images)) {
  if (!fs.existsSync(path.join(source, name))) throw new Error('Missing preview ' + name + '. Run npm run previews:refresh.');
}
fs.mkdirSync(destination, { recursive: true });
for (const [from, to] of Object.entries(images)) fs.copyFileSync(path.join(source, from), path.join(destination, to));
console.log('Updated ' + Object.keys(images).length + ' documentation previews.');
