const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
exports.run = async () => {
  const root = path.resolve(__dirname, '..');
  const extension = vscode.extensions.getExtension('dadayan1234.gradient-nitro-glass');
  await extension.activate();
  const engine = require('../out/extension');
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'docs/preview-theme.json'), 'utf8'));
  const config = engine.getDefaultConfig();
  for (const [key, value] of Object.entries(saved)) {
    if (key.startsWith('gradientNitro.')) config[key.slice(14)] = value;
    else if (key.startsWith('editor.')) config[key.slice(7)] = value;
  }
  await new Promise(resolve => setTimeout(resolve, 1200));
  await engine.applyCustomTheme(config);
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(path.join(root, 'examples/theme.ts')));
  const signal = path.join(root, '.vscode-test/guide-ready');
  fs.writeFileSync(signal, 'ready');
  for (let i = 0; i < 180; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (fs.readFileSync(signal, 'utf8') === 'done') return;
  }
  throw new Error('Guide capture timed out');
};
