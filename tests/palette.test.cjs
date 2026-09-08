const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { harness } = require('./harness.cjs');
const engine = require('../out/palette');
test('OKLCH round trips preserve seeds and gamut mapping remains finite', () => {
  for (const color of ['#120D24','#22D3EE','#000000','#FFFFFF','#FF0000','#0000FF','#00FF00']) assert.equal(engine.fromLch(engine.toLch(color)),color);
  for (let h = -3; h <= 3; h += .2) assert.match(engine.fromLch([.7,.8,h]),/^#[A-F\d]{6}$/);
});
test('presets maintain surface and foreground hierarchy with subtle selection', () => {
  for (const preset of engine.presets) {
    const cfg = {...engine.paletteDefaults,...preset}, p = engine.derivePalette(cfg), t = engine.workbenchColors(cfg);
    assert.equal(t['tab.activeBackground'],t['editorGroupHeader.tabsBackground']);
    assert.equal(t['tab.activeBackground'],t['tab.inactiveBackground']);
    assert.equal(t['tab.activeBorderTop'],p.accent); assert.equal(t['tab.activeBorder'],'#00000000');
    assert.equal(t['activityBar.foreground'],p.accent); assert.equal(t['activityBar.activeBackground'],'#00000000');
    assert.equal(t['activityBar.inactiveForeground'],p['fg-muted']); assert.ok(engine.toLch(p['fg-muted'])[1] < .025);
    assert.ok(engine.contrastRatio(p.selection,p['base-2']) < 1.3);
    for (let i=0;i<=5;i++) assert.ok(Math.abs(engine.toLch(p['base-'+i])[2]-engine.toLch(preset.baseColor)[2]) < .07);
    assert.equal(engine.diagnostics(p).some(x=>x.warning),false);
  }
});
test('extreme controls remain valid; side indicator has an explicit native fallback', () => {
  const n=engine.normalizePalette({baseColor:'</script>',accentIntensity:NaN,surfaceDepth:0,borderVisibility:0,inactiveFade:100});
  assert.equal(n.baseColor,'#120D24'); assert.equal(n.surfaceDepth,0); assert.equal(n.inactiveFade,1);
  for (const baseColor of ['#000000','#FFFFFF','#808080','#FF0000']) for (const accentColor of ['#000000','#FFFFFF','#0000FF']) {
    const cfg={baseColor,accentColor,surfaceDepth:2};
    assert.deepEqual(engine.derivePalette(cfg),engine.derivePalette(cfg));
    Object.values(engine.derivePalette(cfg)).forEach(c=>assert.match(c,/^#[A-F\d]{6}$/));
  }
  const bottom=engine.workbenchColors({activeTabIndicator:'bottom'}),side=engine.workbenchColors({activeTabIndicator:'side'});
  assert.equal(bottom['tab.activeBorderTop'],'#00000000');assert.notEqual(bottom['tab.activeBorder'],'#00000000');
  assert.notEqual(side['tab.activeBorderTop'],'#00000000');assert.equal(side['tab.activeBorder'],'#00000000');
  assert.ok(engine.diagnostics(engine.derivePalette({baseColor:'#808080'})).some(x=>x.warning));
});
test('browser and host share identical palette and token mapping, including legacy borderless settings', () => {
  const context=vm.createContext({exports:{}});vm.runInContext(fs.readFileSync(require.resolve('../out/palette'),'utf8'),context);
  const h=harness();
  for (const preset of engine.presets) for (const borderWidth of [0,1]) {
    const cfg={...h.extension.getDefaultConfig(),...preset,borderWidth};
    const browser=JSON.parse(JSON.stringify(context.exports.workbenchColors(cfg))),host=h.extension.buildColors(cfg);
    for (const [token,color] of Object.entries(browser)) assert.equal(host[token],color,token);
  }
});
test('workbench Save and Export preserve syntax across accent changes', async () => {
  const h=harness(),cfg=h.extension.getDefaultConfig(); await h.extension.applyCustomTheme(cfg);
  assert.ok(!h.writes.includes('editor.tokenColorCustomizations'));assert.ok(!h.writes.includes('editor.semanticTokenColorCustomizations'));
  const original=JSON.parse(fs.readFileSync('themes/gradient-nitro-theme.json'));
  for (const accentColor of ['#E879F9','#60A5FA']) {
    const exported=h.extension.generateTheme({...cfg,accentColor});
    assert.deepEqual(exported.tokenColors,original.tokenColors);assert.deepEqual(exported.semanticTokenColors,original.semanticTokenColors);
    assert.deepEqual(exported.colors,{...original.colors,...h.extension.buildColors({...cfg,accentColor})});
  }
});
test('repeated temporary preview and restart recovery preserve subsequent user edits', async () => {
  const h=harness();await h.extension.deactivate();const {WorkbenchPreview}=require('../out/workbenchPreview');
  const state={get:key=>h.state[key],update:async(key,value)=>{h.state[key]=value;}};
  const preview=new WorkbenchPreview(state),scope='[Default Dark Modern]';
  h.global['workbench.colorCustomizations']={[scope]:{'editor.background':'#ABCDEF','button.background':'#FFFFFF'},'editor.foreground':'#123456'};
  await preview.apply({'editor.background':'#120D24','tab.activeBorderTop':'#22D3EE'});
  await preview.apply({'editor.background':'#110E24','tab.activeBorderTop':'#2DD4BF'});
  h.global['workbench.colorCustomizations'][scope]['tab.activeBorderTop']='#A78BFA';
  await new WorkbenchPreview(state).revert();
  assert.deepEqual(h.global['workbench.colorCustomizations'],{[scope]:{'editor.background':'#ABCDEF','button.background':'#FFFFFF','tab.activeBorderTop':'#A78BFA'},'editor.foreground':'#123456'});
  assert.equal(h.state.workbenchPreview,undefined);assert.ok(!h.writes.includes('workbench.colorTheme'));
});
test('failed preview write retains a recovery journal for retry', async () => {
  const h=harness();await h.extension.deactivate();const {WorkbenchPreview}=require('../out/workbenchPreview');
  const state={get:key=>h.state[key],update:async(key,value)=>{h.state[key]=value;}};
  const original=h.vscode.workspace.getConfiguration;
  h.vscode.workspace.getConfiguration=section=>({...original(section),update:async()=>{throw new Error('read-only');}});
  await assert.rejects(new WorkbenchPreview(state).apply({'editor.background':'#120D24'}));assert.ok(h.state.workbenchPreview);
  h.vscode.workspace.getConfiguration=original;await new WorkbenchPreview(state).revert();assert.equal(h.state.workbenchPreview,undefined);
});
test('active extension never imports installation patches or runtime injection', () => {
  assert.doesNotMatch(fs.readFileSync('src/extension.ts','utf8'),/installRuntime|RuntimeSession|removeLegacyWorkbenchStyles|buildEffects|custom\.css/);
  assert.equal(harness().extension.normalizeConfig({workbenchEffects:true}).workbenchEffects,false);
});
