const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {harness}=require('./harness.cjs');
const config=require('../out/config'),palette=require('../out/palette'),preset=require('../out/preset');
const distinctive={...config.getDefaultConfig(),gradientMode:'custom',gradientStops:[{id:'red',color:'#FF0000',position:0,opacity:.8,softness:.12},{id:'green',color:'#00FF00',position:48,opacity:.4,softness:.63},{id:'blue',color:'#0000FF',position:100,opacity:.9,softness:.95}],gradientAngle:90,glassBlur:33,glassOpacity:.61,roundedCorners:true,borderRadius:17,neonRadius:19,motionStrength:.73,motionSpring:.81};
test('every normalized field survives canonical Save/read and full export/import',async()=>{
 const h=harness(),expected=h.extension.normalizeConfig(distinctive);
 await h.extension.applyCustomTheme(expected);
 assert.deepEqual(h.global['gradientNitro.visualConfig'],expected);
 assert.deepEqual(h.extension.getCurrentConfig(),expected);
 const full=preset.exportPreset(expected,h.extension.generateTheme(expected));
 assert.deepEqual(preset.importPreset(JSON.parse(JSON.stringify(full))),expected);
 assert.equal(full.visual.glassOpacity,.61);assert.equal(full.visual.borderRadius,17);
 assert.ok(!('visual' in full.theme));
});
test('canonical snapshot wins over stale legacy mirrors and preserves opacity below 0.5',async()=>{
 const h=harness();await h.extension.applyCustomTheme({...distinctive,glassOpacity:.23});
 h.global['gradientNitro.glassBlur']=1;
 assert.equal(h.extension.getCurrentConfig().glassBlur,33);assert.equal(h.extension.getCurrentConfig().glassOpacity,.23);
});
test('legacy settings migrate without losing radii or native layout preference',()=>{
 const migrated=config.normalizeConfig({roundedCorners:true,borderRadius:17,glassBlur:33});
 assert.equal(migrated.visualConfigVersion,2);assert.equal(migrated.nativeModernUI,true);assert.equal(migrated.borderRadius,17);
 assert.equal(config.normalizeConfig({...config.getDefaultConfig(),roundedCorners:true}).nativeModernUI,false);
});
test('an empty configuration default does not hide legacy saved controls',()=>{
 const h=harness();h.global['gradientNitro.visualConfig']={};h.global['gradientNitro.glassBlur']=33;
 assert.equal(h.extension.getCurrentConfig().glassBlur,33);
});
test('invalid or future full presets do not masquerade as native themes',()=>{
 assert.throws(()=>preset.importPreset({colors:{}}),/Full Gradient Nitro/);
 assert.throws(()=>preset.importPreset({format:'gradient-nitro',formatVersion:1,visual:{visualConfigVersion:99}}),/newer/);
});
test('radius roles and popup glass derive from master controls',()=>{
 const c=palette.deriveComposition(distinctive);assert.deepEqual(c.radius,{small:6,medium:11,large:17,popup:17});
 assert.ok(Object.values(c.floating).slice(0,3).every(color=>color.length===9&&color.slice(-2)!=='ff'));
 assert.equal(c.gradient.glassFilter,'blur(33px) saturate(105%)');
 assert.equal(palette.deriveComposition({...distinctive,roundedCorners:false}).radius.popup,0);
});
test('motion amplitudes and spring duration/easing differ at 0, 50 and 100 percent',()=>{
 assert.deepEqual([0,.5,1].map(motionStrength=>palette.deriveMotion({motionStrength}).hoverScale),[1,1.0175,1.035]);
 assert.deepEqual([0,.5,1].map(motionStrength=>palette.deriveMotion({motionStrength}).pressScale),[1,.9825,.965]);
 const springs=[0,.5,1].map(motionSpring=>palette.deriveMotion({motionSpring}));
 assert.deepEqual(springs.map(s=>s.duration),[160,250,340]);assert.equal(new Set(springs.map(s=>s.easing)).size,3);
});
test('global/per-stop softness and full neon radius have no hidden threshold plateau',()=>{
 const gradients=[.5,.8,1].map(gradientSoftness=>palette.deriveGradient({...distinctive,gradientSoftness}).workbenchGradient);
 assert.equal(new Set(gradients).size,3);
 assert.notEqual(palette.deriveComposition({...distinctive,neonRadius:19}).neonFilter,palette.deriveComposition({...distinctive,neonRadius:33}).neonFilter);
 assert.equal(palette.deriveGradient({...distinctive,gradientEnabled:false}).workbenchGradient,'none');
 assert.ok(palette.deriveGradient({...distinctive,gradientEnabled:false}).softlightGradient.includes('radial-gradient'));
});
test('native Activity Bar contribution uses the existing open command',()=>{
 const p=JSON.parse(fs.readFileSync('package.json'));
 assert.ok(p.contributes.viewsContainers.activitybar.some(v=>v.id==='gradientNitro'));
 assert.ok(p.contributes.views.gradientNitro.some(v=>v.id==='gradientNitro.studioView'));
 assert.ok(fs.existsSync(p.contributes.viewsContainers.activitybar.find(v=>v.id==='gradientNitro').icon));
});
module.exports={distinctive};
test('hover and selection labels keep text contrast for dark, light and custom bases',()=>{
 for(const baseColor of ['#120D24','#413D52','#FAF7FF','#777777'])for(const accentColor of ['#000000','#FFFFFF','#22D3EE','#E879F9']){
  const p=palette.derivePalette({baseColor,accentColor,contrast:.7});
  for(const bg of [p.hover,p.selection])assert.ok(palette.contrastRatio(p['interaction-foreground'],bg)>=4.5,JSON.stringify({baseColor,accentColor,bg}));
 }
});
test('terminal transparency is scoped to runtime configuration and native exports stay opaque',()=>{
 const h=harness(),cfg={...distinctive,workbenchEffects:true};
 assert.equal(h.extension.buildColors(cfg)['terminal.background'],'#00000000');
 assert.notEqual(h.extension.generateTheme(cfg).colors['terminal.background'],'#00000000');
 assert.notEqual(h.extension.buildColors({...cfg,workbenchEffects:false})['terminal.background'],'#00000000');
});
test('border color and width survive Save, preset round trip and native export',async()=>{
 const h=harness(),cfg=h.extension.normalizeConfig({...distinctive,borderColor:'#E879F9',borderWidth:3,borderVisibility:1});
 await h.extension.applyCustomTheme(cfg);
 assert.equal(h.extension.getCurrentConfig().borderWidth,3);
 assert.equal(preset.importPreset(preset.exportPreset(cfg,h.extension.generateTheme(cfg))).borderColor,'#E879F9');
 assert.equal(h.extension.generateTheme(cfg).colors['panel.border'],'#E879F9');
 assert.equal(h.extension.generateTheme({...cfg,borderEnabled:false}).colors['panel.border'],'#00000000');
});
