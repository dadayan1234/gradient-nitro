// Real workbench screenshots and integration checks, with an isolated user profile.
const fs = require('fs');
const path = require('path');
const { _electron } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP, 'gradient-nitro-browser-check/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const testRoot = path.join(root, '.vscode-test');
const output = path.join(root, 'docs', 'images');
const control = path.join(testRoot, 'capture.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const profile = path.join(testRoot, 'profile-' + Date.now());
  fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(profile, 'User/settings.json'), JSON.stringify({
    'workbench.colorTheme': 'Default Dark Modern', 'workbench.startupEditor': 'none',
    'workbench.experimental.modernUI': false, 'window.zoomLevel': 0,
    'editor.fontFamily': 'Consolas', 'editor.fontSize': 15, 'editor.lineHeight': 25,
    'editor.minimap.enabled': true, 'window.titleBarStyle': 'custom',
    'terminal.integrated.defaultProfile.windows': 'Command Prompt',
    'telemetry.telemetryLevel': 'off', 'update.mode': 'none', 'extensions.autoUpdate': false,
    'security.workspace.trust.enabled': false, 'workbench.secondarySideBar.defaultVisibility': 'hidden',
    'git.enabled': false, 'chat.disableAIFeatures': true
  }));
  fs.writeFileSync(control, JSON.stringify({ phase: 'starting' }));
  const source = path.join(process.env.LOCALAPPDATA, 'Programs/Microsoft VS Code');
  const clone = path.join(testRoot, 'code');
  if (!fs.existsSync(path.join(clone, 'Code.exe'))) fs.cpSync(source, clone, { recursive: true });
  const version = fs.readdirSync(clone).find(name => fs.existsSync(path.join(clone, name, 'resources/app/product.json')));
  await require('../out/runtime.js').installRuntime(path.join(clone, version, 'resources/app'), root, path.join(testRoot, 'runtime-backups'), true);
  const executablePath = path.join(clone, 'Code.exe');
  const app = await _electron.launch({ executablePath, args: [
    '--user-data-dir=' + profile, '--extensions-dir=' + path.join(testRoot, 'extensions'),
    '--extensionDevelopmentPath=' + root, '--extensionTestsPath=' + path.join(root, 'tests/vscode-runner.cjs'),
    '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--new-window',
    path.join(root, 'examples')
  ], timeout: 60000 });
  try {
    const page = await app.firstWindow({ timeout: 60000 });
    page.on('console', message => { if (/gradient-nitro|WebSocket|Content Security/i.test(message.text())) console.log('renderer:', message.text()); });
    page.on('pageerror', error => console.log('renderer error:', error.message));
    await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.setSize(1440, 1000); });
    for (let i = 0; i < 240; i++) {
      const state = JSON.parse(fs.readFileSync(control, 'utf8'));
      if (state.phase === 'failed') throw new Error(state.error);
      if (state.phase === 'complete') { console.log('VS Code integration passed; screenshots saved to docs/images.'); return; }
      if (state.phase !== 'starting' && !state.done) {
        await sleep(700);
        if (state.phase === 'customizer') {
          let studio;
          for (const frame of page.frames()) if (await frame.locator('#syntaxLanguage').count()) { studio = frame; break; }
          if (!studio) throw new Error('Customizer webview did not load');
          await studio.locator('#syntaxLanguage').selectOption('python');
          await studio.locator('#syntax-variable').fill('#000000');
          await studio.locator('#syntax-variable').dispatchEvent('input');
          const text = await studio.locator('#mockCode').innerText();
          if (!text.includes('dataclass')) throw new Error('Language preview did not update');
          await studio.getByRole('button', { name: 'Reset this language palette' }).click();
          await studio.locator('#syntaxLanguage').selectOption('typescript');
          await studio.locator('#syntaxStudio').screenshot({ path: path.join(output, 'syntax-studio.png') });
          await studio.locator('#mockup').screenshot({ path: path.join(output, 'effects-preview.png') });
          await studio.locator('#syntaxStudio').scrollIntoViewIfNeeded();
        }
        if (state.phase === 'file-formats' || state.phase === 'plain-text') {
          const tokenColors = await page.locator('.view-lines .view-line span[class^="mtk"]').evaluateAll(spans => [...new Set(spans.filter(el => el.textContent.trim()).map(el => getComputedStyle(el).color))]);
          if (tokenColors.length < 4) throw new Error(state.phase + ': expected colorful grammar tokens, got ' + tokenColors.length);
          console.log(state.phase + ' token colors: ' + tokenColors.length);
        }
        const metrics = await page.evaluate(() => {
          const read = selector => { const el = document.querySelector(selector); if (!el) return null; const c = getComputedStyle(el); return { radius: c.borderRadius, shadow: c.boxShadow, background: c.backgroundColor, gradient: c.backgroundImage, outline: c.outlineWidth, color: c.color, blur: c.backdropFilter, font: c.fontFamily, size: c.fontSize }; };
          return { modern: !!document.querySelector('.modern-ui'), editor: read('.part.editor'), sidebar: read('.part.sidebar'), tab: read('.tab.active'), header: read('.editor-group-container > .title'), code: read('.view-lines'), tooltip: read('.monaco-hover') };
        });
        console.log(state.phase, JSON.stringify(metrics));
        if (state.phase === 'glass-low' || state.phase === 'glass-high') {
          const low = state.phase === 'glass-low';
          if (!metrics.tooltip || metrics.tooltip.blur !== (low ? 'blur(8px)' : 'blur(36px)')) throw new Error('Glass blur did not apply');
          if (!metrics.tooltip.background.includes(low ? '0.5' : '0.95')) throw new Error('Glass opacity did not apply');
          if (low ? metrics.tooltip.shadow !== 'none' : !metrics.tooltip.shadow.includes('52px')) throw new Error('Shadow controls did not apply');
          if (metrics.code.size !== (low ? '19px' : '17px') || !metrics.code.font.includes('Consolas')) throw new Error('Editor font did not apply');
        }
        if (state.phase.startsWith('workbench-') && (metrics.tab.background === metrics.header.background || metrics.tab.shadow === 'none')) throw new Error('Active tab highlight missing');
        if (state.phase.startsWith('workbench-')) {
          const fill = await page.locator('.tab.active > .tab-fill').first().evaluate(el => getComputedStyle(el).backgroundColor);
          if (fill !== metrics.tab.background) throw new Error('Modern UI tab fill covers the highlight');
        }
        if (state.phase === 'changed-geometry' && (metrics.editor.radius !== '6px' || metrics.sidebar.outline !== '3px' || metrics.tab.radius !== '6px')) throw new Error('Live geometry update failed');
        if (state.phase === 'borderless' && metrics.editor.outline !== '0px') throw new Error('Borderless failed');
        if (state.phase === 'theme-switched' && await page.locator('#gradient-nitro-live').count()) throw new Error('Styles stuck after switching themes');
        if (state.phase.startsWith('workbench-')) {
          if (!metrics.editor.gradient.includes('linear-gradient')) {
            console.log(await page.evaluate(() => ({ bridge: window.__gradientNitroBridge, marker: getComputedStyle(document.querySelector('.monaco-workbench')).getPropertyValue('--vscode-gradientNitro-runtime'), classes: document.querySelector('.monaco-workbench').className, scripts: [...document.scripts].map(s => s.src) })));
            throw new Error('Editor gradient not applied');
          }
          if (metrics.editor.radius !== '13px') throw new Error('Editor radius not applied');
          if (metrics.editor.outline !== '1px') throw new Error('Editor border not applied');
        }
        await page.screenshot({ path: path.join(output, state.phase + '.png') });
        fs.writeFileSync(control, JSON.stringify({ phase: state.phase, done: state.phase }));
      }
      await sleep(500);
    }
    throw new Error('VS Code integration timed out');
  } finally { await app.close().catch(() => {}); }
})().catch(error => { console.error(error); process.exitCode = 1; });
