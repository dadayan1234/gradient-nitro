// Executed inside an isolated VS Code Extension Development Host.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const control = path.join(root, '.vscode-test', 'capture.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function capture(name) {
  fs.writeFileSync(control, JSON.stringify({ phase: name }));
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    if (JSON.parse(fs.readFileSync(control, 'utf8')).done === name) return;
  }
  throw new Error('Screenshot timed out: ' + name);
}
exports.run = async () => {
  try {
    const extension = vscode.extensions.getExtension('dadayan1234.gradient-nitro-glass');
    assert.ok(extension, 'Development extension loaded');
    await extension.activate();
    const engine = require('../out/extension.js');
    const saved = JSON.parse(fs.readFileSync(path.join(root, 'docs/preview-theme.json'), 'utf8'));
    const palette = Object.fromEntries(Object.entries(saved).filter(([key]) => key.startsWith('gradientNitro.')).map(([key,value]) => [key.slice(14),value]));
    for (const key of ['fontFamily','fontSize','lineHeight','fontWeight','fontLigatures']) if (saved['editor.'+key] !== undefined) palette[key] = saved['editor.'+key];
    const purple = () => ({ ...engine.getDefaultConfig(), ...palette });
    const workbench = vscode.workspace.getConfiguration('workbench');
    await sleep(1200);
    await engine.applyCustomTheme(purple());
    assert.equal(vscode.workspace.getConfiguration('workbench').get('experimental.modernUI'), true, 'Modern UI enabled natively');
    const fixture = name => vscode.Uri.file(path.join(root, 'examples', name));
    for (const name of ['README.md', '.env.example', 'theme.ts']) {
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fixture(name)), { preview: false });
    }
    const terminalOutput = new vscode.EventEmitter();
    const terminal = vscode.window.createTerminal({ name: 'Theme preview', pty: {
      onDidWrite: terminalOutput.event,
      open() { terminalOutput.fire('\u001b[36mGradient Nitro 1.3.1\u001b[0m\r\n\r\n  Native rounded workspace\r\n  Colorful, language-aware tokens\r\n  Dark and light palettes\r\n\r\nReady to make it yours.\r\n'); },
      close() { terminalOutput.dispose(); }
    } });
    terminal.show(true);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await sleep(1800);
    await capture('workbench-dark');
    // A real TypeScript hover demonstrates the native tooltip shadow and radius.
    const editor = vscode.window.activeTextEditor;
    editor.selection = new vscode.Selection(2, 18, 2, 18);
    await vscode.commands.executeCommand('editor.action.showHover');
    await sleep(1400);
    await capture('tooltip-dark');
    await engine.applyCustomTheme({ ...purple(), fontFamily: 'Consolas', fontSize: 19, glassOpacity: .5, blurStrength: 8, neonGlowSpread: 12, neonGlowIntensity: 0 });
    await vscode.commands.executeCommand('editor.action.showHover');
    await sleep(900);
    await capture('glass-low');
    await engine.applyCustomTheme({ ...purple(), fontFamily: 'Consolas', fontSize: 17, glassOpacity: .95, blurStrength: 36, neonGlowSpread: 52, neonGlowIntensity: .35 });
    await vscode.commands.executeCommand('editor.action.showHover');
    await sleep(900);
    await capture('glass-high');
    await engine.applyCustomTheme(purple());
    await vscode.commands.executeCommand('editor.action.hideHover');
    await engine.applyCustomTheme({ ...purple(), themeMode: 'light' });
    await sleep(1600);
    await capture('workbench-light');
    await vscode.commands.executeCommand('editor.action.hideHover');
    await vscode.commands.executeCommand('workbench.action.closePanel');
    await engine.applyCustomTheme(purple());
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fixture('.env.example')), { preview: false, viewColumn: vscode.ViewColumn.One });
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fixture('README.md')), { preview: false, viewColumn: vscode.ViewColumn.Two });
    await sleep(900);
    await capture('file-formats');
    await vscode.commands.executeCommand('workbench.action.joinAllGroups');
    for (const [filename, expected] of [['.env.example', 'dotenv'], ['notes.txt', 'plaintext']]) {
      const doc = await vscode.workspace.openTextDocument(fixture(filename));
      assert.equal(doc.languageId, expected);
      await vscode.window.showTextDocument(doc, { preview: false });
    }
    await sleep(700);
    await capture('plain-text');
    await engine.applyCustomTheme(purple());
    await vscode.commands.executeCommand('workbench.action.closePanel');
    await vscode.commands.executeCommand('gradientNitro.openCustomizer');
    await sleep(1400);
    await capture('customizer');
    await engine.applyCustomTheme({ ...purple(), borderRadius: 6, borderWidth: 3, borderColor: '#ff8080' });
    await sleep(800);
    await capture('changed-geometry');
    await engine.applyCustomTheme({ ...purple(), borderEnabled: false });
    await sleep(800);
    await capture('borderless');
    await workbench.update('colorTheme', 'Default Dark Modern', vscode.ConfigurationTarget.Global);
    await sleep(1000);
    await capture('theme-switched');
    assert.notEqual(vscode.workspace.getConfiguration('workbench').get('experimental.modernUI'), true, 'Previous native layout restored on theme switch');
    assert.equal(vscode.workspace.getConfiguration('editor').get('fontSize'), 15, 'Original editor font restored on theme switch');
    await vscode.commands.executeCommand('gradientNitro.resetDefaults');
    assert.equal(vscode.workspace.getConfiguration('editor').inspect('semanticTokenColorCustomizations').globalValue, undefined, 'Reset cleaned scoped semantic tokens');
    fs.writeFileSync(control, JSON.stringify({ phase: 'complete', result: 'passed' }));
  } catch (error) {
    fs.writeFileSync(control, JSON.stringify({ phase: 'failed', error: String(error.stack || error) }));
    throw error;
  }
};
