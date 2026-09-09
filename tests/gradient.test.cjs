const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const engine = require('../out/palette');
const { harness } = require('./harness.cjs');
const h = harness();
const originalLoad = Module._load;
let workbenchRuntime;
Module._load = function(name, ...args) { return name === 'vscode' ? h.vscode : originalLoad.call(this, name, ...args); };
try {
  workbenchRuntime = require('../out/workbenchRuntime');
} finally {
  Module._load = originalLoad;
}
const { buildEffects } = require('../out/effects');
const { syncWorkbenchRuntime, revertWorkbenchRuntime, RuntimeSession } = workbenchRuntime;

test('palette generation is deterministic and derives gradient roles from BASE + ACCENT', () => {
  const cfg = { ...engine.paletteDefaults, baseColor: '#120D24', accentColor: '#22D3EE' };
  const p1 = engine.derivePalette(cfg);
  const p2 = engine.derivePalette(cfg);
  assert.deepEqual(p1, p2, 'Palette derivation must be 100% deterministic');

  // Verify conceptual gradient roles exist and are valid hex colors
  const gradientRoles = ['gradient-base', 'gradient-accent', 'gradient-accent-muted', 'gradient-softlight', 'gradient-edge'];
  for (const role of gradientRoles) {
    assert.ok(p1[role], `Missing conceptual gradient role: ${role}`);
    assert.match(p1[role], /^#[A-F\d]{6}$/i, `Role ${role} must be a valid hex color`);
  }

  // Softlight must be derived from BASE with increased perceptual lightness + slight ACCENT influence
  const baseLch = engine.toLch(cfg.baseColor);
  const softlightLch = engine.toLch(p1['gradient-softlight']);
  assert.ok(softlightLch[0] > baseLch[0], 'Softlight lightness must be higher than base lightness');
  assert.ok(softlightLch[0] <= 0.40, 'Softlight lightness must remain subtle and dark-appropriate');
});

test('gradient CSS derivation reflects enabled and disabled states', () => {
  const cfgEnabled = { ...engine.paletteDefaults, gradientEnabled: true };
  const pEnabled = engine.derivePalette(cfgEnabled);
  const gEnabled = engine.deriveGradient(cfgEnabled, pEnabled);
  assert.equal(gEnabled.enabled, true);
  assert.ok(gEnabled.editorGradient.includes('radial-gradient'), 'Enabled gradient must include radial editor softlight');
  assert.ok(gEnabled.editorGradient.includes('linear-gradient'), 'Enabled gradient must include ambient linear accent gradient');
  assert.ok(gEnabled.panelGradient.includes('linear-gradient'), 'Enabled panel gradient must include subtle ambient continuation');

  const cfgDisabled = { ...engine.paletteDefaults, gradientEnabled: false };
  const pDisabled = engine.derivePalette(cfgDisabled);
  const gDisabled = engine.deriveGradient(cfgDisabled, pDisabled);
  assert.equal(gDisabled.enabled, false);
  assert.equal(gDisabled.editorGradient, 'none');
  assert.equal(gDisabled.panelGradient, 'none');
});

test('gradient softness controls spatial falloff and stop distribution, not merely opacity', () => {
  const p = engine.derivePalette(engine.paletteDefaults);

  const lowSoftnessCfg = { ...engine.paletteDefaults, gradientSoftness: 0.0 };
  const lowG = engine.deriveGradient(lowSoftnessCfg, p);

  const defSoftnessCfg = { ...engine.paletteDefaults, gradientSoftness: 0.8 };
  const defG = engine.deriveGradient(defSoftnessCfg, p);

  const highSoftnessCfg = { ...engine.paletteDefaults, gradientSoftness: 1.0 };
  const highG = engine.deriveGradient(highSoftnessCfg, p);

  // Extract radial stops percentages from the editorGradient strings (after the 'at ...' coordinates)
  const parseRadialStops = (css) => {
    const radialMatch = css.match(/radial-gradient\([^,]+,\s*(.+?)\)\s*,\s*linear-gradient/);
    assert.ok(radialMatch, 'Must contain radial-gradient');
    const colorStopsPart = radialMatch[1];
    const percentages = [...colorStopsPart.matchAll(/(\d+)%/g)].map(m => parseInt(m[1], 10));
    // percentages will be [0, coreStop, midStop, outerStop]
    return percentages;
  };

  const lowStops = parseRadialStops(lowG.editorGradient);
  const defStops = parseRadialStops(defG.editorGradient);
  const highStops = parseRadialStops(highG.editorGradient);

  // Stop positions must differ between softness settings: higher softness produces wider intermediate stops and larger falloff
  // Index 1 is coreStop, index 2 is midStop, index 3 is outerStop
  assert.ok(lowStops[1] < defStops[1], 'Low softness inner core stop must be tighter than default');
  assert.ok(defStops[1] <= highStops[1], 'Default softness inner core stop must be less than or equal to high');
  assert.ok(lowStops[2] < defStops[2], 'Low softness mid stop must be tighter than default');
  assert.ok(defStops[2] < highStops[2], 'Default softness mid stop must be tighter than high');
  assert.ok(lowStops[3] < highStops[3], 'Low softness outer falloff must terminate sooner than high');
});

test('gradient strength and softlight bounds are clamped safely', () => {
  const minCfg = engine.normalizePalette({ gradientStrength: -5, gradientSoftness: -2, editorSoftlight: -1, softlightSpread: 0 });
  assert.equal(minCfg.gradientStrength, 0);
  assert.equal(minCfg.gradientSoftness, 0);
  assert.equal(minCfg.editorSoftlight, 0);
  assert.equal(minCfg.softlightSpread, 0.2);

  const maxCfg = engine.normalizePalette({ gradientStrength: 5, gradientSoftness: 2, editorSoftlight: 2, softlightSpread: 5 });
  assert.equal(maxCfg.gradientStrength, 1);
  assert.equal(maxCfg.gradientSoftness, 1);
  assert.equal(maxCfg.editorSoftlight, 0.6);
  assert.equal(maxCfg.softlightSpread, 1.5);
});

test('editor text contrast is preserved with gradient enabled (WCAG AA readability)', () => {
  for (const preset of engine.presets) {
    const cfg = { ...engine.paletteDefaults, ...preset, gradientEnabled: true, editorSoftlight: 0.28 };
    const p = engine.derivePalette(cfg);
    // Primary foreground against base-4 (editor background)
    const baseContrast = engine.contrastRatio(p['fg-primary'], p['base-4']);
    assert.ok(baseContrast >= 4.5, `Foreground contrast ${baseContrast} on base-4 must meet WCAG AA (>= 4.5) for preset ${preset.name}`);

    // Primary foreground against gradient-softlight (the brightest illuminated center)
    const softlightContrast = engine.contrastRatio(p['fg-primary'], p['gradient-softlight']);
    assert.ok(softlightContrast >= 4.5, `Foreground contrast ${softlightContrast} on softlight must meet WCAG AA (>= 4.5) for preset ${preset.name}`);
  }
});

test('BASE and ACCENT changes dynamically update gradient derivation', () => {
  const pBase1 = engine.derivePalette({ ...engine.paletteDefaults, baseColor: '#120D24' });
  const pBase2 = engine.derivePalette({ ...engine.paletteDefaults, baseColor: '#1A0B2E' });
  assert.notEqual(pBase1['gradient-base'], pBase2['gradient-base']);
  assert.notEqual(pBase1['gradient-softlight'], pBase2['gradient-softlight']);

  const pAccent1 = engine.derivePalette({ ...engine.paletteDefaults, accentColor: '#22D3EE' });
  const pAccent2 = engine.derivePalette({ ...engine.paletteDefaults, accentColor: '#E879F9' });
  assert.notEqual(pAccent1['gradient-accent'], pAccent2['gradient-accent']);
  assert.notEqual(pAccent1['gradient-accent-muted'], pAccent2['gradient-accent-muted']);
});

test('all 5 presets produce valid harmonious gradients', () => {
  const presetNames = ['Nitro Aqua', 'Mint', 'Electric Violet', 'Nitro Pink', 'Electric Blue'];
  for (const name of presetNames) {
    const preset = engine.presets.find(pr => pr.name === name);
    assert.ok(preset, `Preset ${name} must exist`);
    const cfg = { ...engine.paletteDefaults, ...preset, gradientEnabled: true };
    const p = engine.derivePalette(cfg);
    const g = engine.deriveGradient(cfg, p);

    assert.equal(g.enabled, true);
    assert.ok(g.editorGradient.startsWith('radial-gradient'));
    assert.ok(g.panelGradient.startsWith('linear-gradient'));
    assert.equal(g.colors['gradient-base'], p['gradient-base']);
    assert.equal(g.colors['gradient-accent'], p['gradient-accent']);
  }
});

test('theme configuration normalization and serialization preserves gradient state', () => {
  const h = harness();
  const rawInput = {
    gradientEnabled: true,
    gradientStrength: 0.42,
    gradientSoftness: 0.85,
    editorSoftlight: 0.30,
    softlightSpread: 0.75,
    gradientAngle: 150
  };
  const normalized = h.extension.normalizeConfig(rawInput);
  assert.equal(normalized.gradientEnabled, true);
  assert.equal(normalized.gradientStrength, 0.42);
  assert.equal(normalized.gradientSoftness, 0.85);
  assert.equal(normalized.editorSoftlight, 0.30);
  assert.equal(normalized.softlightSpread, 0.75);
  assert.equal(normalized.gradientAngle, 150);

  const generated = h.extension.generateTheme(normalized);
  assert.ok(generated.colors);
  assert.equal(generated.colors['editorGroupHeader.tabsBackground'], h.extension.buildColors(normalized)['editorGroupHeader.tabsBackground']);
});

test('workbench effects builder generates correct CSS with continuous global atmosphere and separate editor softlight', () => {
  const cfg = { ...engine.paletteDefaults, gradientEnabled: true, gradientSoftness: 0.8, editorSoftlight: 0.28, glassEnabled: true, motionEnabled: true, neonEnabled: true };
  const css = buildEffects(cfg);

  // Global workbench gradient selector exists and uses shared fixed coordinate system
  assert.ok(css.includes('.monaco-workbench[data-gradient-nitro="active"]'), 'Global workbench gradient selector must exist');
  assert.ok(css.includes('fixed !important'), 'Global gradient must use fixed viewport coordinate system');
  assert.ok(css.includes('linear-gradient'), 'Workbench must contain multi-stop ambient linear gradient');

  // Gradient is not exclusively attached to .part.editor
  assert.ok(css.includes('::before'), 'Workbench backdrop pseudo-element must exist');
  assert.ok(css.includes('--gn-gradient-background:'), 'Root variable must expose workbench gradient');

  // Editor softlight remains separate as a local radial overlay
  assert.ok(css.includes('.part.editor'), 'CSS must target .part.editor');
  assert.ok(css.includes('radial-gradient'), 'Editor must have radial softlight');

  // Major chrome surfaces participate in atmosphere with translucent glass and blur
  assert.ok(css.includes('.part.titlebar'), 'Title bar must participate in atmosphere');
  assert.ok(css.includes('.part.activitybar'), 'Activity bar must participate in atmosphere');
  assert.ok(css.includes('.part.sidebar'), 'Sidebar must participate in atmosphere');
  assert.ok(css.includes('.part.panel'), 'Panel must participate in atmosphere');
  assert.ok(css.includes('.part.statusbar'), 'Status bar must participate in atmosphere');
  assert.ok(css.includes('backdrop-filter: blur('), 'Glass surfaces must have backdrop blur');

  // No large accent-colored structural border is generated on surfaces
  assert.ok(css.includes('outline: none !important'), 'Surfaces must have outline: none');

  // Bubble Motion CSS remains present
  assert.ok(css.includes('cubic-bezier'), 'Motion spring bezier must be present');
  assert.ok(css.includes('scale: var(--gn-motion-hover)'), 'Independent scale must preserve existing native transforms');

  // Neon CSS remains present
  assert.ok(css.includes('.tab.active'), 'Active tab must receive neon style');
  assert.ok(css.includes('drop-shadow(') || css.includes('box-shadow:'), 'Neon glow filter/shadow must be present');
});

test('one CSS paint owner uses the global field and editor consumes radial light only', () => {
  const css = buildEffects(engine.paletteDefaults), g = engine.deriveGradient(engine.paletteDefaults);
  assert.equal((css.match(/background: var\(--gn-gradient-background\)/g) || []).length, 1);
  assert.match(css, /::before \{[^}]*position: fixed[^}]*inset: 0[^}]*pointer-events: none[^}]*z-index: -1/s);
  assert.ok(css.includes('--gn-gradient-background: ' + g.workbenchGradient));
  assert.ok(css.includes('--gn-softlight-background: ' + g.softlightGradient));
  assert.match(css, /\.part\.editor \{[^}]*background-image: var\(--gn-softlight-background\)/s);
  assert.doesNotMatch(g.softlightGradient, /linear-gradient/);
  assert.ok(!css.includes('background: ' + g.editorGradient));
});

test('shared composition supplies translucent glass even when blur is disabled', () => {
  for (const glassEnabled of [true, false]) {
    const cfg = {...engine.paletteDefaults, glassEnabled, glassBlur: 0};
    const c = engine.deriveComposition(cfg), css = buildEffects(cfg);
    for (const [region, color] of Object.entries(c.surfaces)) {
      assert.match(color, /^#[a-f\d]{8}$/i, region);
      assert.ok(parseInt(color.slice(-2),16) < 255, region);
      assert.ok(css.includes(color), region);
    }
    assert.equal(c.gradient.glassFilter, glassEnabled ? 'blur(0px) saturate(105%)' : 'none');
  }
});

test('structural surfaces have neutral borders while neon stays on small signals', () => {
  const p=engine.derivePalette({}),css=buildEffects(engine.paletteDefaults);
  assert.ok(css.includes('--gn-border-color: '+p['border-subtle']));
  assert.ok(css.includes('--vscode-panel-border: var(--gn-border-color)'));
  assert.ok(css.includes('--vscode-editorGroup-border: var(--gn-border-color)'));
  assert.ok(css.includes('--vscode-sash-hoverBorder: '+p['border-normal']));
  assert.match(css,/\.centered-layout-margin/);
  assert.doesNotMatch(css,/--vscode-shadow-(sm|md|lg|xl):/);
  assert.match(css,/\.tab > \.tab-fill\)*/);
  assert.match(css,/box-shadow: none/);
  assert.ok(!css.includes('inset 0 -3px'));
});

test('motion disabled returns identity scales and custom neon follows its own controls', () => {
  const c=engine.deriveComposition({...engine.paletteDefaults,motionEnabled:false,neonColorMode:'custom',neonCustomColor:'#EE3399'});
  assert.equal(c.hoverScale,1);assert.equal(c.pressScale,1);assert.ok(c.neonFilter.includes('#EE3399'));
  assert.equal(engine.deriveComposition({neonEnabled:false}).neonFilter,'none');
});

test('fully transparent custom stops do not leave accent atmosphere behind', () => {
  const g=engine.deriveGradient({...engine.paletteDefaults,gradientMode:'custom',gradientStops:engine.paletteDefaults.gradientStops.map(s=>({...s,opacity:0}))});
  const colors=g.workbenchGradient.match(/#[a-f\d]{8}/gi);
  assert.ok(colors.length>4);assert.ok(colors.every(color=>color.endsWith('00')));
});

test('workbench runtime session tracks state and recovers safely', async () => {
  const state = {};
  const mockContext = {
    extensionUri: { fsPath: path.resolve(__dirname, '..') },
    globalStorageUri: { fsPath: path.resolve(__dirname, '../.vscode-test') },
    globalState: {
      get: (k) => state[k],
      update: async (k, v) => { state[k] = v; }
    }
  };

  const cfg = h.extension.getDefaultConfig();
  // Safe sync
  await syncWorkbenchRuntime(mockContext, { ...cfg, workbenchEffects: true });
  assert.ok(state.workbenchRuntimeJournal !== undefined, 'Journal must be created on sync');

  // Safe revert
  await revertWorkbenchRuntime(mockContext);
  assert.equal(state.workbenchRuntimeJournal, undefined, 'Journal must be cleared on revert');
});

test('multi-color gradient normalization, stop addition, removal, reordering, and position clamping', () => {
  // Test stop position sorting and clamping
  const unsortedStops = [
    { id: 'stop-c', color: '#A008B9', position: 120, opacity: 1.5, softness: 1.2 },
    { id: 'stop-a', color: '#161026', position: -10, opacity: -0.5, softness: -0.2 },
    { id: 'stop-b', color: '#22D3EE', position: 45, opacity: 0.8, softness: 0.7 }
  ];
  const normalized = engine.normalizePalette({
    gradientMode: 'custom',
    gradientStops: unsortedStops
  });

  assert.equal(normalized.gradientStops.length, 3);
  // Must be sorted by position ascending
  assert.equal(normalized.gradientStops[0].id, 'stop-a');
  assert.equal(normalized.gradientStops[0].position, 0, 'Clamped from -10 to 0');
  assert.equal(normalized.gradientStops[0].opacity, 0, 'Clamped from -0.5 to 0');
  assert.equal(normalized.gradientStops[0].softness, 0, 'Clamped from -0.2 to 0');

  assert.equal(normalized.gradientStops[1].id, 'stop-b');
  assert.equal(normalized.gradientStops[1].position, 45);

  assert.equal(normalized.gradientStops[2].id, 'stop-c');
  assert.equal(normalized.gradientStops[2].position, 100, 'Clamped from 120 to 100');
  assert.equal(normalized.gradientStops[2].opacity, 1, 'Clamped from 1.5 to 1');
  assert.equal(normalized.gradientStops[2].softness, 1, 'Clamped from 1.2 to 1');

  // Test maximum 8 stops enforcement
  const tenStops = Array.from({ length: 10 }, (_, i) => ({
    id: `stop-${i}`,
    color: '#22D3EE',
    position: i * 10,
    opacity: 1,
    softness: 0.8
  }));
  const capped = engine.normalizePalette({ gradientStops: tenStops });
  assert.equal(capped.gradientStops.length, 8, 'Must clamp to maximum 8 stops');

  // Auto harmony derivation creates valid multi-stop gradient
  const autoStops = engine.deriveDefaultStops('#120D24', '#22D3EE');
  assert.ok(autoStops.length >= 3, 'Auto harmony should derive at least 3 harmonic stops');
  assert.equal(autoStops[0].position, 0);
  assert.equal(autoStops[autoStops.length - 1].position, 100);
});

test('gradient angle and per-color softness generate expected CSS declarations', () => {
  const p = engine.derivePalette(engine.paletteDefaults);

  // Test custom angle
  const angleCfg = {
    ...engine.paletteDefaults,
    gradientAngle: 225,
    gradientMode: 'custom',
    gradientStops: [
      { id: '1', color: '#120D24', position: 0, opacity: 1, softness: 0.9 },
      { id: '2', color: '#22D3EE', position: 50, opacity: 0.6, softness: 0.95 },
      { id: '3', color: '#8B5CF6', position: 100, opacity: 0.8, softness: 0.7 }
    ]
  };
  const g = engine.deriveGradient(angleCfg, p);
  assert.ok(g.editorGradient.includes('225deg'), 'Gradient must contain configured 225deg angle');
  assert.ok(g.panelGradient.includes('225deg'), 'Panel gradient must contain configured 225deg angle');
  assert.ok(g.editorGradient.includes('#8B5CF6') || g.editorGradient.includes('8b5cf6') || g.editorGradient.includes('rgba'), 'Editor gradient must reflect custom stops');
});

test('editor softlight modes (auto, accent, custom) and spread/softness work correctly', () => {
  const p = engine.derivePalette(engine.paletteDefaults);

  // Auto mode
  const autoCfg = { ...engine.paletteDefaults, softlightMode: 'auto' };
  const autoG = engine.deriveGradient(autoCfg, p);
  assert.ok(autoG.editorGradient.includes('radial-gradient'));

  // Accent mode
  const accentCfg = { ...engine.paletteDefaults, softlightMode: 'accent' };
  const accentG = engine.deriveGradient(accentCfg, p);
  assert.ok(accentG.editorGradient.includes('radial-gradient'));

  // Custom mode
  const customCfg = { ...engine.paletteDefaults, softlightMode: 'custom', softlightColor: '#FF5500' };
  const customG = engine.deriveGradient(customCfg, p);
  assert.ok(customG.editorGradient.includes('radial-gradient'));

  // Softlight disabled
  const disabledSoftlight = { ...engine.paletteDefaults, softlightEnabled: false };
  const disabledG = engine.deriveGradient(disabledSoftlight, p);
  assert.ok(!disabledG.editorGradient.includes('radial-gradient'), 'Radial gradient must be absent when softlight disabled');
  assert.ok(disabledG.editorGradient.includes('linear-gradient'), 'Linear gradient remains when softlight is disabled');
});

test('glass effect produces Gaussian blur and surface opacity styles in buildEffects', () => {
  // Enabled glass
  const glassCfg = {
    ...engine.paletteDefaults,
    glassEnabled: true,
    glassBlur: 20,
    glassOpacity: 0.75,
    glassSaturation: 1.2
  };
  const css = buildEffects(glassCfg);
  assert.ok(css.includes('backdrop-filter: blur(20px) saturate(120%)'), 'CSS must include backdrop blur and saturation');
  assert.ok(css.includes('.part.sidebar'), 'CSS must style sidebar with glass');
  assert.ok(css.includes('.part.activitybar'), 'CSS must style activity bar with glass');
  assert.ok(css.includes('.part.panel'), 'CSS must style panel with glass');

  // Disabled glass
  const noGlassCfg = { ...engine.paletteDefaults, glassEnabled: false };
  const noGlassCss = buildEffects(noGlassCfg);
  assert.ok(!noGlassCss.includes('backdrop-filter: blur('), 'CSS must not have backdrop blur when glass disabled');
});

test('neon lighting produces layered glow shadows on active targets', () => {
  // Enabled neon
  const neonCfg = {
    ...engine.paletteDefaults,
    neonEnabled: true,
    neonStrength: 0.5,
    neonRadius: 16,
    neonOpacity: 0.4
  };
  const css = buildEffects(neonCfg);
  assert.ok(css.includes('.tab.active'), 'CSS must target active tab');
  assert.ok(css.includes('.part.activitybar .action-item.checked'), 'CSS must target checked activity bar icon');
  assert.ok(css.includes('box-shadow:') || css.includes('drop-shadow('), 'CSS must include glow shadows');

  // Disabled neon
  const noNeonCfg = { ...engine.paletteDefaults, neonEnabled: false };
  const noNeonCss = buildEffects(noNeonCfg);
  assert.ok(!noNeonCss.includes('0 0 16px'), 'Disabled neon must not have active glow shadows');
});

test('bubble motion produces spring curves and responsive scale transitions', () => {
  // Enabled motion
  const motionCfg = {
    ...engine.paletteDefaults,
    motionEnabled: true,
    motionStrength: 0.4,
    motionSpring: 0.8
  };
  const css = buildEffects(motionCfg);
  assert.ok(css.includes('cubic-bezier'), 'CSS must include spring easing curve');
  assert.ok(css.includes('scale: var(--gn-motion-hover)'), 'CSS must include the configured independent scale');
  assert.ok(css.includes('prefers-reduced-motion'), 'CSS must respect prefers-reduced-motion');

  // Disabled motion
  const noMotionCfg = { ...engine.paletteDefaults, motionEnabled: false };
  const noMotionCss = buildEffects(noMotionCfg);
  assert.ok(!noMotionCss.includes('scale('), 'CSS must not include hover scale transforms when motion is disabled');
});

test('backward compatibility preserves older theme configurations with sane defaults', () => {
  // Minimal legacy config from earlier versions
  const legacyConfig = {
    baseColor: '#100C22',
    accentColor: '#00F0FF'
  };
  const normalized = engine.normalizePalette(legacyConfig);

  // Sane defaults must be populated without crashing
  assert.equal(normalized.baseColor, '#100C22');
  assert.equal(normalized.accentColor, '#00F0FF');
  assert.equal(normalized.gradientEnabled, true);
  assert.equal(normalized.gradientMode, 'auto');
  assert.ok(Array.isArray(normalized.gradientStops) && normalized.gradientStops.length >= 2);
  assert.equal(normalized.glassEnabled, true);
  assert.equal(typeof normalized.glassBlur, 'number');
  assert.equal(typeof normalized.glassOpacity, 'number');
  assert.equal(normalized.neonEnabled, true);
  assert.equal(typeof normalized.neonStrength, 'number');
  assert.equal(normalized.motionEnabled, true);
  assert.equal(typeof normalized.motionStrength, 'number');
});
