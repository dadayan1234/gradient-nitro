const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.TEMP,'gradient-nitro-browser-check/node_modules/playwright'));
const {harness}=require('../tests/harness.cjs');
(async()=>{
 const h=harness();h.commands['gradientNitro.openCustomizer']();
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const output=path.resolve(__dirname,'../.vscode-test/theme-studio');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.messages=[];window.acquireVsCodeApi=()=>({postMessage:m=>window.messages.push(m)});});
  const file=path.join(output,'customizer.html');fs.writeFileSync(file,h.getPanel().webview.html);
  await page.goto('file:///'+file.replace(/\\/g,'/'));
  const token=key=>page.evaluate(key=>getComputedStyle(document.documentElement).getPropertyValue('--wb-'+key.replaceAll('.','-')),key);
  const settled=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await settled();assert.equal(await token('tab.activeBackground'),await token('editorGroupHeader.tabsBackground'));
  assert.equal(await page.locator('#save').textContent(),'Save and Apply Configuration');
  await page.screenshot({path:path.join(output,'studio-dark.png')});
  await page.locator('#accentHex').fill('#E879F9');await page.locator('#baseHex').fill('#130B22');await page.locator('#baseHex').blur();
  for(const [id,value] of Object.entries({surfaceDepth:'1.5',inactiveFade:'0.6',borderVisibility:'0.3',accentIntensity:'0.85',contrast:'1.1'}))await page.locator('#'+id).fill(value);
  await page.locator('#paletteDetails').evaluate(el=>el.open=true);
  await page.locator('[data-preset="1"]').click();await settled();assert.equal(await page.locator('#baseHex').inputValue(),'#110E24');
  const last=await token('editor.background');await page.locator('#undo').click();await settled();assert.equal(await page.locator('#baseHex').inputValue(),'#130B22');
  await page.locator('#redo').click();await settled();assert.equal(await token('editor.background'),last);assert.equal(await page.locator('.swatch').count(),17);
  await page.locator('#activeTabIndicator').selectOption('bottom');await settled();assert.equal(await token('tab.activeBorderTop'),'#00000000');
  await page.locator('#activeTabIndicator').selectOption('side');await settled();assert.ok(await page.locator('#indicatorNote').isVisible());
  await page.locator('#collapseControls').click();await page.locator('[data-tab="config.py"]').click();await settled();
  assert.equal(await page.locator('[data-tab="config.py"]').getAttribute('aria-selected'),'true');assert.match(await page.locator('#codeLines').innerText(),/BaseSettings/);
  await page.locator('[data-activity="search"]').click();await page.locator('[data-file="database.py"]').click();await page.locator('[data-panel="Problems"]').click();await settled();
  assert.equal(await page.locator('[data-activity="search"]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#panelContent').innerText(),/No problems/);
  await page.locator('[data-panel="Terminal"]').click();await page.locator('[data-tab="main.py"]').click();await page.locator('[data-tab="README.md"]').hover();
  await page.locator('#expandControls').click();await page.locator('#editorFocused').uncheck();await settled();assert.ok(await page.locator('#editorGroup').evaluate(el=>el.classList.contains('unfocused')));
  await page.locator('#reset').click();await settled();assert.equal(await page.locator('#baseHex').inputValue(),'#120D24');
  assert.ok(await page.locator('#extensionLogo').isVisible(), 'Logo must be visible in Theme Studio header');
  assert.ok(await page.locator('#extensionLogo').getAttribute('src'), 'Logo must have a valid src');
  const panel=page.locator('#controls'),handle=page.locator('#controlsDragHandle');
  const originalBox=await panel.boundingBox();assert.equal(originalBox.width,420);
  const headerBox=await handle.boundingBox();
  await page.mouse.move(headerBox.x+70,headerBox.y+25);await page.mouse.down();
  await page.mouse.move(-100,-100,{steps:8});await page.mouse.up();
  let box=await panel.boundingBox();assert.ok(box.x>=12&&box.y>=12,'Drag stays on screen');
  await page.setViewportSize({width:950,height:844});await settled();box=await panel.boundingBox();
  assert.ok(box.x+box.width<=950&&box.y+box.height<=844,'Resize clamps panel');
  await page.setViewportSize({width:1440,height:1000});await handle.dblclick({position:{x:70,y:25}});
  box=await panel.boundingBox();assert.equal(box.x,originalBox.x,'Double-click restores position');
  const beforeInput=box.x;await page.locator('#glassBlur').fill('33');await settled();
  assert.equal((await panel.boundingBox()).x,beforeInput,'Inputs do not drag the panel');
  const imported={...h.extension.getDefaultConfig(),baseColor:'#110E24',glassBlur:33,glassOpacity:.61,roundedCorners:true,borderRadius:17,motionStrength:.73,motionSpring:.81};
  await page.evaluate(config=>window.dispatchEvent(new MessageEvent('message',{data:{command:'importConfig',config}})),imported);await settled();
  assert.equal(await page.locator('#glassOpacity').inputValue(),'0.61');assert.equal(await page.locator('#borderRadius').inputValue(),'17');
  await page.locator('#undo').click();await settled();assert.equal(await page.locator('#baseHex').inputValue(),'#120D24','Import is undoable');
  await page.locator('#reset').click();await settled();
  assert.ok(await page.locator('#gradientEnabled').isChecked(),'Gradient enabled by default');
  const initialGrad=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--editor-gradient'));
  assert.ok(initialGrad.includes('radial-gradient'),'Editor gradient active');
  await page.locator('#gradientSoftness').fill('0.95');await page.locator('#editorSoftlight').fill('0.4');await settled();
  assert.equal(await page.locator('#gradientSoftnessValue').innerText(),'Very Soft');assert.equal(await page.locator('#editorSoftlightValue').innerText(),'Subtle');
  await page.locator('#gradientEnabled').uncheck();await settled();
  assert.equal((await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--editor-gradient'))).trim(),'none');
  await page.locator('#gradientEnabled').check();await settled();
  assert.ok((await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--editor-gradient'))).includes('radial-gradient'));

  // Test directional angle preset
  await page.locator('[data-angle="225"]').click();await settled();
  assert.equal(await page.locator('#gradientAngle').inputValue(), '225');

  // Test color stop adding and removing
  const initialStopCount = await page.locator('.stop-row').count();
  assert.ok(initialStopCount >= 2, 'Must have at least 2 default stops');
  await page.locator('#btnAddStop').click();await settled();
  assert.equal(await page.locator('.stop-row').count(), initialStopCount + 1, 'Stop count must increment on add');
  await page.locator('.stop-delete-btn').last().click();await settled();
  assert.equal(await page.locator('.stop-row').count(), initialStopCount, 'Stop count must decrement on delete');

  // Test glass controls
  assert.ok(await page.locator('#glassEnabled').isChecked(), 'Glass enabled by default');
  await page.locator('#glassBlur').fill('24');await settled();
  assert.equal(await page.locator('#glassBlurValue').innerText(), '24px');

  // Test lighting/neon controls
  assert.ok(await page.locator('#neonEnabled').isChecked(), 'Neon enabled by default');
  await page.locator('#neonStrength').fill('0.6');await settled();
  assert.equal(await page.locator('#neonStrengthValue').innerText(), '60%');

  // Test motion controls
  assert.ok(await page.locator('#motionEnabled').isChecked(), 'Motion enabled by default');
  await page.locator('#motionStrength').fill('0.5');await settled();
  assert.equal(await page.locator('#motionStrengthValue').innerText(), '50%');

  // Capture the same saved default composition used by the real IDE fixture.
  await page.locator('#reset').click();await settled();await page.waitForTimeout(200);
  await page.locator('[data-activity="explorer"]').click();await page.locator('[data-file="main.py"]').click();
  await page.locator('[data-tab="main.py"]').click();await settled();
  await page.locator('#gradientSection').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(output,'studio-dark.png')});
  await page.locator('#glassSection').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(output,'studio-effects.png')});

  assert.deepEqual(await page.evaluate(()=>window.messages),[],'Local edits send no host messages');
  await page.locator('#baseHex').fill('<svg>');await page.locator('#baseHex').blur();assert.equal(await page.locator('#baseHex').getAttribute('aria-invalid'),'true');
  assert.equal(await token('editor.background'),h.extension.buildColors(h.extension.getDefaultConfig())['editor.background']);
  await page.locator('#borderHex').fill('#E879F9');await page.locator('#borderWidth').fill('3');await page.locator('#borderVisibility').fill('1');await settled();
  assert.equal(await page.locator('#borderWidth').inputValue(),'3','Visibility preserves chosen thickness');
  assert.equal(await token('panel.border'),'#E879F9');
  assert.match(await page.locator('.workbench > .sidebar').evaluate(el=>getComputedStyle(el).boxShadow),/3px/);
  await page.locator('#borderEnabled').uncheck();await settled();
  assert.equal(await token('panel.border'),'#00000000');
  await page.locator('#borderEnabled').check();
  await page.locator('#baseHex').fill('#120D24');await page.locator('#save').click();
  let message=await page.evaluate(()=>window.messages.at(-1));assert.equal(message.command,'applyTheme');
  assert.equal(message.config.borderWidth,3);assert.equal(message.config.borderColor,'#E879F9');
  for(const [key,color]of Object.entries(require('../out/palette').workbenchColors(message.config)))assert.equal(await token(key),color,key);
  await h.getPanel().receive(message);assert.deepEqual(h.global['workbench.colorCustomizations']['[Gradient Nitro Glass]'],h.extension.buildColors(message.config));
  const ack=previewActive=>page.evaluate(previewActive=>window.dispatchEvent(new MessageEvent('message',{data:{command:'actionResult',ok:true,text:'Done.',previewActive}})),previewActive);
  await ack(false);await page.locator('#btnModeLight').click();await settled();assert.equal(await page.locator('#baseHex').inputValue(),'#FAF7FF');
  await page.screenshot({path:path.join(output,'studio-light.png')});
  await page.locator('#export').click();assert.equal(await page.evaluate(()=>window.messages.at(-1).command),'exportTheme');await ack(false);
  await page.locator('#exportPreset').click();assert.equal(await page.evaluate(()=>window.messages.at(-1).command),'exportPreset');await ack(false);
  await page.locator('#importPreset').click();assert.equal(await page.evaluate(()=>window.messages.at(-1).command),'importPreset');await ack(false);
  await page.locator('#btnModeDark').click();await page.locator('#previewWorkbench').click();assert.equal(await page.evaluate(()=>window.messages.at(-1).command),'previewWorkbench');await ack(true);
  await page.locator('#revertPreview').click();assert.equal(await page.evaluate(()=>window.messages.at(-1).command),'revertPreview');await ack(false);
  for(const width of [950,700,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow at '+width);assert.ok(await page.locator('#save').isVisible());if(width===390)assert.ok((await page.locator('#controls').boundingBox()).height<422);await page.screenshot({path:path.join(output,'studio-'+width+'.png')});}
  await page.locator('#collapseControls').click();await page.screenshot({path:path.join(output,'studio-collapsed.png')});
  const timing=await page.evaluate(()=>{const start=performance.now();for(let i=0;i<100;i++)engine.workbenchColors({...state,accentIntensity:.2+i*.01});return(performance.now()-start)/100;});
  assert.ok(timing<16);assert.deepEqual(errors,[]);console.log('Browser interactions passed. Palette + tokens: '+timing.toFixed(2)+'ms. Screenshots: '+output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
