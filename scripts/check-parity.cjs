// Tests the installed VSIX in a normal VS Code window, without Development Host flags.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),cp=require('child_process'),crypto=require('crypto');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.TEMP,'gradient-nitro-browser-check/node_modules/playwright'));
const {PNG}=require(path.join(process.env.TEMP,'gradient-nitro-browser-check/node_modules/playwright-core/lib/utilsBundle.js'));
const root=path.resolve(__dirname,'..'),testRoot=path.join(root,'.vscode-test');
const packageVersion=require('../package.json').version;
const output=path.join(testRoot,'parity-'+Date.now()),control=path.join(output,'control.json');
const clone=path.join(testRoot,'code'),versionDir=fs.readdirSync(clone).find(d=>fs.existsSync(path.join(clone,d,'resources/app/package.json'))),appRoot=path.join(clone,versionDir,'resources/app');
const personalRoot=path.join(process.env.LOCALAPPDATA,'Programs/Microsoft VS Code');
const personalVersion=fs.readdirSync(personalRoot).find(d=>fs.existsSync(path.join(personalRoot,d,'resources/app/product.json')));
const installedRoot=path.join(personalRoot,personalVersion,'resources/app');
const hashes=()=>['product.json','out/vs/code/electron-browser/workbench/workbench.html','out/vs/workbench/workbench.desktop.main.js'].map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(installedRoot,f))).digest('hex'));
const before=hashes(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const surfaces={quick:'.quick-input-widget',menu:'.monaco-menu','activity-hover':'.monaco-hover','toolbar-hover':'.monaco-hover',hover:'.monaco-hover',suggest:'.suggest-widget',parameter:'.parameter-hints-widget',find:'.find-widget',peek:'.peekview-widget',notification:'.notification-toast',center:'.notifications-center',dialog:'.monaco-dialog-box'};
(async()=>{
 fs.mkdirSync(path.join(output,'profile/User'),{recursive:true});fs.mkdirSync(path.join(output,'workspace'),{recursive:true});
 fs.writeFileSync(path.join(output,'workspace/main.ts'),`import { createApplication } from './config';\n\n// Gradient Nitro â€” runtime parity fixture\nconst settings = { port: 8000, debug: false };\nconst app = createApplication("sesa-pilot", settings.port);\n\napp.\napp.start();\n\nconsole.log("Application ready", settings);\n`);
 fs.writeFileSync(path.join(output,'workspace/config.ts'),`/** Create a service with its own lifecycle. */\nexport function createApplication(name: string, port: number) {\n    return { name, port, start() { return Promise.resolve(); } };\n}\n`);
 const profile=path.join(output,'profile'),extensions=path.join(output,'extensions');
 fs.writeFileSync(path.join(profile,'User/settings.json'),JSON.stringify({'window.titleBarStyle':'custom','window.dialogStyle':'custom','window.menuBarVisibility':'classic','workbench.startupEditor':'none','workbench.colorTheme':'Default Dark Modern','security.workspace.trust.enabled':false,'telemetry.telemetryLevel':'off','update.mode':'none','extensions.autoUpdate':false,'chat.disableAIFeatures':true,'editor.hover.delay':150,'workbench.hover.delay':150,'editor.quickSuggestions':false,'editor.fontSize':14,'editor.lineHeight':25,'editor.minimap.enabled':true,'git.enabled':false}));
 const cli=cp.spawnSync(path.join(clone,'Code.exe'),[path.join(appRoot,'out/cli.js'),'--user-data-dir='+profile,'--extensions-dir='+extensions,'--install-extension',path.join(root,'gradient-nitro-glass-'+packageVersion+'.vsix'),'--force'],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',windowsHide:true,timeout:60000});
 assert.equal(cli.status,0,cli.stderr||cli.stdout);
 const target=path.join(extensions,'dadayan1234.gradient-nitro-glass-'+packageVersion);assert.ok(fs.existsSync(path.join(target,'out/config.js')),'Latest packaged canonical configuration present');
 await require('../out/runtime').installRuntime(appRoot,target,path.join(output,'backups'),true);
 const qa=path.join(extensions,'local.nitro-parity-1.0.0');fs.mkdirSync(qa,{recursive:true});
 fs.writeFileSync(path.join(qa,'package.json'),JSON.stringify({name:'nitro-parity',publisher:'local',version:'1.0.0',engines:{vscode:'^1.136.0'},main:'index.js',activationEvents:['onStartupFinished']}));
 fs.writeFileSync(path.join(qa,'index.js'),`exports.activate=()=>{setTimeout(()=>require(${JSON.stringify(path.join(root,'tests/parity-runner.cjs'))}).run(require('vscode'),${JSON.stringify(root)},${JSON.stringify(output)}, {surfacesOnly: ${process.argv.includes('--surfaces-only')}, releasePreview: ${process.argv.includes('--release-preview')}}),1800);};`);
 const extensionIndex=path.join(extensions,'extensions.json'),entries=JSON.parse(fs.readFileSync(extensionIndex));
 entries.push({identifier:{id:'local.nitro-parity'},version:'1.0.0',location:{$mid:1,scheme:'file',path:'/'+qa.replaceAll('\\','/')},relativeLocation:path.basename(qa)});
 fs.writeFileSync(extensionIndex,JSON.stringify(entries));
 fs.writeFileSync(control,JSON.stringify({phase:'starting'}));
 fs.writeFileSync(path.join(testRoot,'latest-parity.txt'),output);
 if(process.argv.includes('--release-preview'))fs.writeFileSync(path.join(testRoot,'latest-release-preview.txt'),output);
 const app=await _electron.launch({executablePath:path.join(clone,'Code.exe'),args:['--user-data-dir='+profile,'--extensions-dir='+extensions,'--skip-welcome','--skip-release-notes','--disable-workspace-trust','--new-window',path.join(output,'workspace')],timeout:60000});
 const results={version:'1.136.1',installedVSIX:true,surfaces:{},phases:[],failures:[]};
 try{
  const page=await app.firstWindow({timeout:90000});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,1000));
  for(let i=0;i<2400;i++){
   let state;try{state=JSON.parse(fs.readFileSync(control));}catch{await sleep(50);continue;}if(state.phase==='failed')throw Error(state.error);
   if(state.phase==='complete'){fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));assert.deepEqual(results.failures,[]);console.log('Packaged VSIX parity passed:',results.phases.length,'phases;',Object.keys(results.surfaces).length,'surface captures.',output);return;}
   if(state.phase==='starting'||state.done){await sleep(250);continue;}
   await sleep(400);const phase=state.phase;
   if(phase==='before-reload'){fs.writeFileSync(control,JSON.stringify({...state,done:phase}));await sleep(1500);continue;}
   await page.waitForFunction(()=>!!window.__gradientNitroVisualConfig,{},{timeout:20000});
   if(state.expected){
    await page.waitForFunction(expected=>JSON.stringify(window.__gradientNitroVisualConfig)===JSON.stringify(expected),state.expected,{timeout:20000});
    assert.deepEqual(await page.evaluate(()=>window.__gradientNitroVisualConfig),state.expected,'Bridge configuration equality '+phase);
   }
   if(phase.startsWith('release-')){
    assert.equal(state.expected.gradientStops.length,2,'Release previews use exactly two stops');
    if(phase==='release-side-menu'){
     for(const f of page.frames())if(await f.locator('#workbench').count().catch(()=>0)){await f.locator('.softlight-block').scrollIntoViewIfNeeded();break;}
    }
   }
   if(phase==='studio-save'||state.surface==='studio'){
    let frame;for(const f of page.frames())if(await f.locator('#workbench').count().catch(()=>0)){frame=f;break;}
    assert.ok(frame,'Installed Webview opened');
    assert.equal(await frame.locator('#glassBlur').inputValue(),String(state.expected.glassBlur));
    assert.equal(await frame.locator('#glassOpacity').inputValue(),String(state.expected.glassOpacity));
    assert.equal(await frame.locator('#borderRadius').inputValue(),String(state.expected.borderRadius));
    if(phase==='studio-save'){
     await frame.locator('#previewWorkbench').click();await frame.locator('#actionStatus').filter({hasText:'Temporary workbench preview applied'}).waitFor();
     await frame.locator('#save').click();await frame.locator('#actionStatus').filter({hasText:'saved and applied'}).waitFor();
     await sleep(7000);
     assert.deepEqual(await page.evaluate(()=>window.__gradientNitroVisualConfig),state.expected,'Preview then Save retains the renderer configuration');
     assert.match(await page.locator('.monaco-workbench').evaluate(el=>getComputedStyle(el,'::before').backgroundImage),/linear-gradient/,'Saved gradient remains painted');
    }else{
     const panel=frame.locator('#controls'),old=await panel.boundingBox();assert.equal(old.width,420);
     const handle=await frame.locator('#controlsDragHandle').boundingBox();
     await page.mouse.move(handle.x+80,handle.y+30);await page.mouse.down();await page.mouse.move(handle.x-140,handle.y+75,{steps:10});await page.mouse.up();
     const moved=await panel.boundingBox();assert.ok(moved.x<old.x-100,'Panel drags inside editor');
     await frame.locator('#controlsDragHandle').dblclick({position:{x:80,y:30}});
     await frame.locator('#glassSection').evaluate(el=>el.scrollIntoView({block:'start'}));
    }
   }
   if(phase==='activity-view'){
    assert.ok(await page.getByText('Save and Apply Configuration',{exact:true}).count(),'Side menu exposes Save and Apply');
    await page.getByText('Open Theme Studio',{exact:true}).last().click();await sleep(1400);
   }
   if(phase==='save-draft'){
    let studio;for(const f of page.frames())if(await f.locator('#workbench').count().catch(()=>0)){studio=f;break;}
    assert.ok(studio);await studio.locator('#accentHex').fill('#F472B6');await studio.locator('#borderWidth').fill('3');
   }
   if(phase==='modern-save'){
    const grid=await page.locator('.monaco-workbench > .monaco-grid-view').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(grid,'rgba(0, 0, 0, 0)','Modern UI grid must not cover the saved gradient');
   }
   if(phase.startsWith('layers-')){
    const metrics=await page.evaluate(()=>{
     const chain=el=>{const result=[];for(let p=el;p&&!p.classList.contains('monaco-workbench');p=p.parentElement){const s=getComputedStyle(p);result.push({node:p.className,background:s.backgroundColor,image:s.backgroundImage});}return result;};
     return {explorer:chain(document.querySelector('.part.sidebar .monaco-list-rows')),terminal:chain(document.querySelector('.xterm-screen')),canvases:[...document.querySelectorAll('.xterm-screen canvas')].map(c=>({width:c.width,height:c.height})),terminalBackground:getComputedStyle(document.querySelector('.monaco-workbench')).getPropertyValue('--vscode-terminal-background')};
    });
    fs.writeFileSync(path.join(output,phase+'.json'),JSON.stringify(metrics,null,2));
    assert.ok(metrics.explorer.length&&metrics.terminal.length,'Explorer and terminal are mounted');
    for(const chain of [metrics.explorer,metrics.terminal])assert.ok(chain.every(s=>s.background.startsWith('rgba(')),'No opaque layer: '+JSON.stringify(chain.filter(s=>!s.background.startsWith('rgba('))));
    const screen=await page.locator('.xterm-screen').filter({visible:true}).first().boundingBox();
    const clip={x:Math.floor(screen.x+screen.width*.6),y:Math.floor(screen.y+screen.height*.75),width:1,height:1};
    const painted=PNG.sync.read(await page.screenshot({clip})).data;
    await page.locator('.xterm-screen canvas').evaluateAll(nodes=>nodes.forEach(el=>el.style.visibility='hidden'));
    const behind=PNG.sync.read(await page.screenshot({clip})).data;
    await page.locator('.xterm-screen canvas').evaluateAll(nodes=>nodes.forEach(el=>el.style.removeProperty('visibility')));
    assert.ok([...painted].every((v,i)=>Math.abs(v-behind[i])<=2),'Terminal canvas must reveal the same backdrop as its transparent container: '+JSON.stringify({painted:[...painted],behind:[...behind]}));
    const contrast=async locator=>{
     const pair=await locator.evaluate(el=>{const s=getComputedStyle(el);const label=el.querySelector('.label-name')||el;return {background:s.backgroundColor,foreground:getComputedStyle(label).color};});
     const hex=value=>'#'+value.match(/[\d.]+/g).slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join('');
     assert.ok(require('../out/palette').contrastRatio(hex(pair.foreground),hex(pair.background))>=4.5,JSON.stringify(pair));return pair;
    };
    const explorer=page.locator('.part.sidebar .monaco-list-row').filter({hasText:'config.ts'}).first();await explorer.hover();await sleep(250);
    metrics.hover=await contrast(explorer);await explorer.click();await sleep(300);metrics.selected=await contrast(explorer);
    metrics.tab=await contrast(page.locator('.part.editor .tab.active').first());
    fs.writeFileSync(path.join(output,phase+'.json'),JSON.stringify(metrics,null,2));
    results.surfaces[phase]={hover:metrics.hover,selected:metrics.selected,tab:metrics.tab,terminalTransparent:true};
   }
   if(state.surface==='menu')await page.locator('.part.editor .view-lines').first().click({button:'right',position:{x:250,y:100}});
   if(state.surface==='activity-hover')await page.locator('.part.activitybar .action-item').first().hover();
   if(state.surface==='toolbar-hover')await page.locator('.editor-group-container .title .monaco-toolbar .action-item').first().hover();
   const selector=surfaces[state.surface];
   if(selector){
    const popup=page.locator(selector).filter({visible:true}).last();await popup.waitFor({state:'visible',timeout:12000});await sleep(350);
    const metrics=await popup.evaluate(el=>{const s=getComputedStyle(el),ancestors=[];for(let p=el;p;p=p.parentElement)ancestors.push({node:p.className,bg:getComputedStyle(p).backgroundColor});return{selector:el.className,ancestors,radius:s.borderTopLeftRadius,background:s.backgroundColor,blur:s.backdropFilter,shadow:s.boxShadow,bounds:el.getBoundingClientRect().toJSON(),text:el.textContent.slice(0,100)};});
    fs.writeFileSync(path.join(output,phase+'-dom.html'),await popup.evaluate(el=>el.outerHTML));
    try{
    assert.equal(metrics.radius,state.expected.borderRadius+'px','Popup radius '+phase);
    assert.equal(await popup.evaluate(el=>getComputedStyle(el).borderTopWidth),(state.expected.borderEnabled ? state.expected.borderWidth : 0)+'px','Popup border thickness '+phase);
    if(phase.startsWith('border-')&&state.expected.borderEnabled&&state.expected.borderWidth)assert.equal(await popup.evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(232, 121, 249)');
    assert.ok(metrics.blur.includes('blur('+state.expected.glassBlur+'px)'),JSON.stringify(metrics));
    assert.match(metrics.background,/rgba\(/,'Translucent '+phase);assert.notEqual(metrics.shadow,'none');
    }catch(error){results.failures.push({phase,error:error.message});}
    results.surfaces[phase]=metrics;
   }
   if(phase.startsWith('motion-')||phase.startsWith('spring-')){
    const item=page.locator('.part.activitybar .action-item').first();await item.hover();await sleep(500);
    const actual=await item.evaluate(el=>{const s=getComputedStyle(el);return{scale:s.scale,duration:s.transitionDuration,easing:s.transitionTimingFunction};});
    const motion=require('../out/palette').deriveMotion(state.expected);
    assert.ok(Math.abs(parseFloat(actual.scale)-motion.hoverScale)<.0002,JSON.stringify(actual));
    assert.ok(actual.duration.includes((motion.duration/1000)+'s'),JSON.stringify(actual));
    const box=await item.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await sleep(500);
    let press;
    for(let attempt=0;attempt<30;attempt++){
     press=await item.evaluate(el=>getComputedStyle(el).scale);
     if(Math.abs(parseFloat(press)-motion.pressScale)<.0002)break;
     await sleep(100);
    }
    assert.ok(Math.abs(parseFloat(press)-motion.pressScale)<.0002,JSON.stringify({phase,press,expected:motion.pressScale}));await page.mouse.up();
    results.surfaces[phase]={...actual,press};
   }
   if(phase.startsWith('neon-'))results.surfaces[phase]=await page.locator('.part.activitybar .action-item.checked .action-label').first().evaluate(el=>({filter:getComputedStyle(el).filter}));
   if(phase.startsWith('softlight-'))results.surfaces[phase]=await page.locator('.part.editor').evaluate(el=>({image:getComputedStyle(el).backgroundImage}));
   await page.screenshot({path:path.join(output,phase+'.png')});results.phases.push(phase);
   fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
   if(selector)await page.keyboard.press('Escape');
   fs.writeFileSync(control,JSON.stringify({...state,done:phase}));await sleep(150);
  }
  throw Error('Packaged parity timed out');
 }finally{await app.close().catch(()=>{});assert.deepEqual(hashes(),before,'Personal VS Code files unchanged');}
})().catch(e=>{console.error(e);process.exitCode=1;});

