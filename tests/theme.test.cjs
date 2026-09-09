const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
// Recovery tests must never touch the developer's actual VS Code profile.
process.env.APPDATA = fs.mkdtempSync(path.join(os.tmpdir(), 'nitro-test-'));
const { harness } = require('./harness.cjs');
const { contrast } = require('../out/colors.js');

test('apply isolates colors and applies typography with recoverable ownership', async () => {
  const h = harness();
  h.global['workbench.colorCustomizations'] = { 'editor.foreground': '#abcdef', '[Other Theme]': { 'panel.background': '#123456' } };
  h.workspace['workbench.colorCustomizations'] = { 'editorCursor.foreground': '#fedcba' };
  h.global['editor.fontFamily'] = 'Consolas';
  await h.extension.applyCustomTheme(h.extension.getDefaultConfig());
  assert.equal(h.global['workbench.colorCustomizations']['editor.foreground'], '#abcdef');
  assert.equal(h.global['workbench.colorCustomizations']['editorCursor.foreground'], undefined);
  assert.equal(h.global['editor.fontFamily'], h.extension.getDefaultConfig().fontFamily);
  assert.ok(h.global['workbench.colorCustomizations']['[Gradient Nitro Glass]']);
  h.global['workbench.colorTheme'] = 'Default Dark Modern';
  await h.extension.deactivate();
  assert.equal(h.global['editor.fontFamily'], 'Consolas');
});

test('repeated typography apply restores originals and preserves later edits and workspace overrides', async () => {
  const h = harness();
  h.global['editor.fontSize'] = 15;
  h.workspace['editor.lineHeight'] = 30;
  await h.extension.applyCustomTheme({ ...h.extension.getDefaultConfig(), fontSize: 18, fontFamily: 'Consolas' });
  await h.extension.applyCustomTheme({ ...h.extension.getDefaultConfig(), fontSize: 20, fontFamily: 'Consolas' });
  assert.equal(h.global['editor.fontSize'], 20);
  assert.equal(h.global['editor.lineHeight'], undefined);
  h.global['editor.fontFamily'] = 'User font';
  await h.commands['gradientNitro.resetDefaults']();
  assert.equal(h.global['editor.fontSize'], 15);
  assert.equal(h.global['editor.fontFamily'], 'User font');
});

test('reset restores replaced scope values and preserves edits made after Apply', async () => {
  const h = harness(), scope = '[Gradient Nitro Glass]';
  h.global['workbench.colorCustomizations'] = { [scope]: { 'editor.background': '#123456', 'testing.iconPassed': '#ffffff' }, 'editorCursor.foreground': '#abcdef' };
  await h.extension.applyCustomTheme(h.extension.getDefaultConfig());
  await h.extension.applyCustomTheme({ ...h.extension.getDefaultConfig(), accentColor: '#ffffff' });
  h.global['workbench.colorCustomizations'][scope]['button.foreground'] = '#112233';
  await h.commands['gradientNitro.resetDefaults']();
  assert.deepEqual(h.global['workbench.colorCustomizations'], { [scope]: { 'editor.background': '#123456', 'testing.iconPassed': '#ffffff', 'button.foreground': '#112233' }, 'editorCursor.foreground': '#abcdef' });
  assert.equal(h.global['workbench.colorTheme'], 'Default Dark Modern');
  assert.ok(!Object.keys(h.global).some(k => k.startsWith('gradientNitro.')));
  await h.commands['gradientNitro.cleanSettings']();
  assert.equal(h.global['workbench.colorCustomizations'][scope]['editor.background'], '#123456');
});

test('both modes use opaque editor/minimap surfaces and readable extreme accents', () => {
  const { extension: e } = harness();
  for (const themeMode of ['light', 'dark']) for (const accentColor of ['#000000', '#ffffff', '#ffff00', '#0000ff', '#00ff00']) for (const gradientIntensity of [0, 0.6]) {
    const c = e.buildColors({ ...e.getDefaultConfig(), themeMode, accentColor, gradientIntensity, colorStops: [{ color: accentColor, offset: 0 }, { color: accentColor, offset: 100 }] });
    for (const key of ['editor.background', 'minimap.background', 'terminal.background', 'editorHoverWidget.background']) assert.match(c[key], /^#[a-f0-9]{6}$/i);
    for (const [fg, bg] of [['editor.foreground', 'editor.background'], ['button.foreground', 'button.background'], ['activityBarBadge.foreground', 'activityBarBadge.background'], ['editorSuggestWidget.highlightForeground', 'editor.background'], ['list.activeSelectionForeground', 'list.activeSelectionBackground'], ['editorLineNumber.foreground', 'editor.background']]) assert.ok(contrast(c[fg], c[bg]) >= 4.5, `${themeMode} ${accentColor} ${fg}`);
  }
});

test('normalization rejects injected colors, bounds numbers and preserves zero', () => {
  const { extension: e } = harness();
  const c = e.normalizeConfig({ accentColor: '</script>', fontFamily: '</style>', gradientIntensity: 0, borderWidth: 0, colorStops: [null, {color:'#ffffff',offset:500}], blurStrength: NaN });
  assert.equal(c.gradientIntensity, 0); assert.equal(c.borderWidth, 0);
  assert.equal(c.accentColor, e.getDefaultConfig().accentColor);
  assert.equal(c.colorStops[1].offset, 100);
  assert.equal(c.blurStrength, 24);
});

test('customizer script parses and uses SVG instead of emoji', () => {
  const h = harness(); h.commands['gradientNitro.openCustomizer']();
  const html = h.getPanel().webview.html;
  new vm.Script(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);
  assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}]/u);
  assert.match(html, /<svg/); assert.match(html, /Theme Studio/);
  assert.match(html, /Content-Security-Policy/);
});

test('legacy recovery removes only Nitro blocks, backs up and updates matching checksum', async () => {
  const { removeLegacyWorkbenchStyles } = require('../out/legacy.js');
  const crypto = require('crypto');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nitro-legacy-'));
  const relative = 'vs/code/electron-browser/workbench/workbench.html';
  const file = path.join(root, 'out', relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '<html><!-- !! GRADIENT-NITRO-CSS-START !! --><style>bad</style><!-- !! GRADIENT-NITRO-CSS-END !! --><style id="other">keep</style></html>');
  fs.writeFileSync(path.join(root, 'product.json'), JSON.stringify({ checksums: { [relative]: 'old', other: 'keep' } }));
  assert.equal(await removeLegacyWorkbenchStyles(root, path.join(root, 'backups')), true);
  const cleaned = fs.readFileSync(file, 'utf8');
  assert.equal(cleaned, '<html><style id="other">keep</style></html>');
  assert.equal(fs.readdirSync(path.join(root, 'backups')).length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'product.json'))).checksums[relative], crypto.createHash('sha256').update(cleaned).digest('base64').replace(/=+$/, ''));
  assert.equal(await removeLegacyWorkbenchStyles(root, path.join(root, 'backups')), false);
});

test('native rounded layout restores user preference on deactivation and respects workspace settings', async () => {
  const h = harness();
  await h.extension.applyCustomTheme({ ...h.extension.getDefaultConfig(), nativeModernUI: true });
  assert.equal(h.global['workbench.experimental.modernUI'], true);
  await h.extension.deactivate();
  assert.equal(h.global['workbench.experimental.modernUI'], undefined);
  h.workspace['workbench.experimental.modernUI'] = false;
  await h.extension.applyCustomTheme({ ...h.extension.getDefaultConfig(), nativeModernUI: true });
  assert.equal(h.global['workbench.experimental.modernUI'], undefined);
});

test('syntax overrides remain theme scoped and reset preserves later user rules', async () => {
  const h = harness();
  h.global['editor.tokenColorCustomizations'] = { comments: '#123456' };
  const scope = '[Gradient Nitro Glass]';
  await h.extension.applyCustomTheme({ ...h.extension.getDefaultConfig(), syntaxOverrides: { python: { variable: '#ffffff' } } });
  const rules = h.global['editor.tokenColorCustomizations'][scope].textMateRules;
  const custom = { name: 'User rule', scope: 'source.custom', settings: { foreground: '#abcdef' } };
  rules.push(custom);
  assert.equal(h.global['editor.semanticTokenColorCustomizations'][scope].rules['variable:python'], '#ffffff');
  await h.commands['gradientNitro.resetDefaults']();
  assert.deepEqual(h.global['editor.tokenColorCustomizations'], { comments: '#123456', [scope]: { textMateRules: [custom] } });
  assert.equal(h.global['editor.semanticTokenColorCustomizations'], undefined);
});

test('language palettes preserve distinct token roles and contrast in both modes', () => {
  const { buildSyntax, languageScopes, normalizeSyntaxOverrides } = require('../out/syntax.js');
  assert.deepEqual(normalizeSyntaxOverrides({ python: { variable: '</script>', keyword: '#abcdef' }, invalid: { variable: '#ffffff' } }), { python: { keyword: '#abcdef' } });
  for (const mode of ['dark', 'light']) {
    const background = mode === 'dark' ? '#11151d' : '#f8fafc';
    const syntax = buildSyntax(mode, {}, background);
    assert.ok(syntax.semanticHighlighting);
    assert.notEqual(syntax.semanticTokenColors['variable:typescript'], syntax.semanticTokenColors['keyword:typescript']);
    assert.notEqual(syntax.semanticTokenColors['keyword:javascript'], syntax.semanticTokenColors['keyword:python']);
    for (const rule of syntax.tokenColors) assert.ok(contrast(rule.settings.foreground, background) >= 4.5, rule.name);
    for (const language of Object.keys(languageScopes)) assert.ok(syntax.tokenColors.some(rule => rule.name === 'Nitro ' + language + ': variable'));
  }
});

test('zero glow eliminates widget shadows; light shadow is gentler than dark', () => {
  const h = harness(), cfg = h.extension.getDefaultConfig();
  assert.equal(h.extension.buildColors({ ...cfg, neonGlowIntensity: 0 })['widget.shadow'], cfg.accentColor + '00');
  assert.ok(parseInt(h.extension.buildColors({ ...cfg, themeMode: 'light' })['widget.shadow'].slice(-2), 16) < parseInt(h.extension.buildColors(cfg)['widget.shadow'].slice(-2), 16));
});
