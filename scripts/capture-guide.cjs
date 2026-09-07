// Capture real VS Code UI with temporary annotation overlays; no product code is changed.
const fs = require('fs');
const path = require('path');
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'gradient-nitro-browser-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const testRoot = path.join(root, '.vscode-test');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
module.exports = (async () => {
  const clone = path.join(testRoot, 'code');
  const version = fs.readdirSync(clone).find(name => fs.existsSync(path.join(clone, name, 'resources/app/product.json')));
  await require('../out/runtime').installRuntime(path.join(clone, version, 'resources/app'), root, path.join(testRoot, 'runtime-backups'), true);
  const profile = path.join(testRoot, 'guide-profile-' + Date.now());
  fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
  fs.writeFileSync(path.join(profile, 'User/settings.json'), JSON.stringify({
    'workbench.startupEditor': 'none', 'workbench.colorTheme': 'Default Dark Modern',
    'telemetry.telemetryLevel': 'off', 'update.mode': 'none', 'extensions.autoUpdate': false,
    'security.workspace.trust.enabled': false, 'chat.disableAIFeatures': true,
    'git.enabled': false, 'workbench.secondarySideBar.defaultVisibility': 'hidden'
  }));
  const signal = path.join(testRoot, 'guide-ready'); fs.writeFileSync(signal, 'starting');
  const app = await _electron.launch({ executablePath: path.join(clone, 'Code.exe'), args: [
    '--user-data-dir=' + profile, '--extensions-dir=' + path.join(testRoot, 'extensions'),
    '--extensionDevelopmentPath=' + root, '--extensionTestsPath=' + path.join(root, 'tests/guide-runner.cjs'),
    '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--new-window', path.join(root, 'examples')
  ], timeout: 60000 });
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 1000));
    for (let i = 0; fs.readFileSync(signal, 'utf8') !== 'ready'; i++) { if (i > 100) throw new Error('Extension startup timed out'); await sleep(500); }
    await sleep(1200);
    const clear = () => page.evaluate(() => document.querySelectorAll('[data-guide]').forEach(el => el.remove()));
    async function annotate(items, caption) {
      const boxes = [];
      for (const [locator, label] of items) { const box = await locator.boundingBox(); if (!box) throw new Error('Missing guide target: ' + label); boxes.push({ ...box, label }); }
      await page.evaluate(({ boxes, caption }) => {
        const add = (style, text) => { const el = document.createElement('div'); el.dataset.guide = 'true'; el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;font:600 16px Segoe UI,sans-serif;' + style; el.textContent = text; document.body.append(el); };
        for (const box of boxes) {
          add(`left:${box.x-4}px;top:${box.y-4}px;width:${box.width+8}px;height:${box.height+8}px;border:3px solid #facc15;border-radius:8px;box-sizing:border-box;`, '');
          const beside = box.x + box.width + 350 < innerWidth;
          const y = beside ? box.y : box.y + box.height + 10 < innerHeight - 110 ? box.y + box.height + 10 : box.y - 40;
          const x = beside ? box.x + box.width + 16 : Math.max(12,Math.min(box.x,innerWidth-450));
          add(`left:${x}px;top:${y}px;padding:7px 12px;border-radius:6px;background:#facc15;color:#171020;`, box.label);
        }
        add('left:60px;bottom:50px;padding:14px 16px;border:1px solid #a78bfa;border-radius:10px;background:#171020;color:#fff;max-width:245px;line-height:25px;', caption);
      }, { boxes, caption });
    }
    const save = name => page.screenshot({ path: path.join(root, 'docs/images', name + '.png') });
    await page.keyboard.press('F1');
    const input = page.locator('.quick-input-widget input').first();
    await input.fill('>Gradient Nitro');
    const command = page.locator('.quick-input-list .monaco-list-row').filter({ hasText: 'Open Theme Customizer' }).first();
    await command.waitFor({ state: 'visible' }); await sleep(500);
    await annotate([[input, '1  Type Gradient Nitro'], [command, '2  Select Open Theme Customizer']], 'OPEN COMMAND PALETTE  |  Ctrl+Shift+P (Windows/Linux)  |  Cmd+Shift+P (macOS)  |  F1');
    await save('guide-open-customizer'); await clear();
    await command.click();
    let studio;
    for (let i = 0; i < 50 && !studio; i++) { for (const frame of page.frames()) if (await frame.locator('#gradientBar').count()) { studio = frame; break; } if (!studio) await sleep(300); }
    if (!studio) throw new Error('Customizer not opened');
    await studio.locator('#gradientBar').scrollIntoViewIfNeeded(); await sleep(700);
    await annotate([[studio.locator('#gradientBar'), '3  Customize your gradient']], 'CUSTOMIZER IS OPEN  |  Scroll for fonts, borders, glass effects and language colors.');
    await save('guide-customize'); await clear();
    const apply = studio.getByRole('button', { name: 'Apply Real-time Changes' });
    await apply.scrollIntoViewIfNeeded(); await sleep(400);
    await annotate([[apply, '4  Save and apply your changes']], 'APPLY  |  Click Apply Real-time Changes. On first use of live effects, reload when prompted.');
    await save('guide-apply'); await clear();
    fs.writeFileSync(signal, 'done');
    console.log('Saved three annotated screenshots for the customizer guide.');
  } finally { await app.close().catch(() => {}); }
})();
