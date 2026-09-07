const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { installRuntime, RuntimeSession } = require('../out/runtime');
const { harness } = require('./harness.cjs');
test('runtime installation is reversible and preserves unrelated HTML', async () => {
  const dir = await fs.mkdtemp(path.join(require('node:os').tmpdir(), 'nitro-runtime-'));
  const app = path.join(dir, 'app');
  const html = path.join(app, 'out/vs/code/electron-browser/workbench/workbench.html');
  await fs.mkdir(path.dirname(html), { recursive: true });
  const original = '<html><body>Unrelated content</body></html>';
  await fs.writeFile(html, original);
  await fs.writeFile(path.join(app, 'product.json'), '{}');
  assert.equal(await installRuntime(app, path.resolve(__dirname, '..'), path.join(dir, 'backup'), true), true);
  assert.equal(await installRuntime(app, path.resolve(__dirname, '..'), path.join(dir, 'backup'), true), false);
  assert.match(await fs.readFile(html, 'utf8'), /Unrelated content/);
  await installRuntime(app, path.resolve(__dirname, '..'), path.join(dir, 'backup'), false);
  assert.equal(await fs.readFile(html, 'utf8'), original);
});
test('local renderer session opens an ephemeral port and stops cleanly', async () => {
  const session = new RuntimeSession();
  await session.start();
  assert.ok(session.port > 0);
  assert.match(session.marker, /^#01[0-9a-f]{4}$/);
  session.update('body {}', false);
  await session.stop();
  assert.equal(session.port, 0);
});
test('independent intensities preserve contrast across all gradient stops', async () => {
  const { extension } = harness();
  const { gradientSurfaces } = require('../out/effects');
  const { buildSyntax } = require('../out/syntax');
  const { contrast } = require('../out/colors');
  for (const themeMode of ['dark', 'light']) {
    const cfg = { ...extension.getDefaultConfig(), themeMode, darkIntensity: 1, lightIntensity: 1 };
    const stops = gradientSurfaces(cfg).map(stop => stop.color);
    const syntax = buildSyntax(themeMode, {}, stops);
    for (const rule of syntax.tokenColors) for (const background of stops) assert.ok(contrast(rule.settings.foreground, background) >= 4.5, 'Token contrast across gradient');
    const zero = gradientSurfaces({ ...cfg, darkIntensity: 0, lightIntensity: 0 });
    assert.equal(new Set(zero.map(stop => stop.color)).size, 1, 'Zero intensity has a neutral canvas');
    const other = gradientSurfaces({ ...cfg, [themeMode === 'dark' ? 'lightIntensity' : 'darkIntensity']: 0 });
    assert.deepEqual(other.map(stop => stop.color), stops, 'Other mode intensity is independent');
  }
  await extension.deactivate();
});
