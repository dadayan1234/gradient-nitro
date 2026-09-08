const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.TEMP,'gradient-nitro-browser-check/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),testRoot=path.join(root,'.vscode-test'),output=path.join(testRoot,'theme-studio'),control=path.join(testRoot,'capture.json');
const source=path.join(process.env.LOCALAPPDATA,'Programs/Microsoft VS Code');
const versionDir=fs.readdirSync(source).find(d=>fs.existsSync(path.join(source,d,'resources/app/package.json')));
const appRoot=path.join(source,versionDir,'resources/app');
const version=JSON.parse(fs.readFileSync(path.join(appRoot,'package.json'))).version;
const bundle=fs.readFileSync(path.join(appRoot,'out/vs/workbench/workbench.desktop.main.js'),'utf8');
const tokens=Object.keys(require('../out/palette').workbenchColors({}));
const missing=tokens.filter(token=>!bundle.includes(JSON.stringify(token)));
assert.deepEqual(missing,[],'All mapped colors exist in the installed workbench');
const protectedFiles=['product.json','out/vs/code/electron-browser/workbench/workbench.html','out/vs/workbench/workbench.desktop.main.js'];
const hashes=()=>protectedFiles.map(file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot,file))).digest('hex'));
const before=hashes();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 fs.mkdirSync(output,{recursive:true});const profile=path.join(testRoot,'studio-profile-'+Date.now());fs.mkdirSync(path.join(profile,'User'),{recursive:true});
 fs.writeFileSync(path.join(profile,'User/settings.json'),JSON.stringify({'workbench.colorTheme':'Default Dark Modern','workbench.startupEditor':'none','window.titleBarStyle':'custom','telemetry.telemetryLevel':'off','update.mode':'none','extensions.autoUpdate':false,'security.workspace.trust.enabled':false,'chat.disableAIFeatures':true,'git.enabled':false,'editor.fontFamily':'Consolas','editor.fontSize':14,'editor.lineHeight':24,'workbench.secondarySideBar.defaultVisibility':'hidden'}));
 fs.writeFileSync(control,JSON.stringify({phase:'starting'}));
 const app=await _electron.launch({executablePath:path.join(source,'Code.exe'),args:['--user-data-dir='+profile,'--extensions-dir='+path.join(testRoot,'extensions'),'--extensionDevelopmentPath='+root,'--extensionTestsPath='+path.join(root,'tests/vscode-runner.cjs'),'--skip-welcome','--skip-release-notes','--disable-workspace-trust','--new-window',path.join(root,'examples')],timeout:60000});
 try{
  const page=await app.firstWindow({timeout:60000});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,1000));
  for(let i=0;i<180;i++){
   const state=JSON.parse(fs.readFileSync(control));
   if(state.phase==='failed')throw new Error(state.error);
   if(state.phase==='complete'){assert.deepEqual(hashes(),before,'VS Code installation files unchanged');console.log('VS Code '+version+' integration passed; '+tokens.length+' tokens verified. Installation hashes unchanged. '+output);return;}
   if(state.phase!=='starting'&&!state.done){
    await sleep(600);
    if(state.phase==='studio-webview'){
     const frame=page.frames().find(f=>f.url().includes('vscode-webview')&&f!==page.mainFrame());
     // Webviews can contain a nested active-frame; search all frames by content.
     let studio;
     for(const f of page.frames())if(await f.locator('#workbench').count().catch(()=>0)){studio=f;break;}
     assert.ok(studio,'Live Webview loaded with CSP');
     await studio.locator('#accentHex').fill('#2DD4BF');await sleep(200);
     assert.equal(await studio.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--theme-accent')),'#2DD4BF');
     await studio.locator('#collapseControls').click();
     await studio.locator('[data-tab="config.py"]').click();await sleep(100);
     assert.equal(await studio.locator('[data-tab="config.py"]').getAttribute('aria-selected'),'true');
     await studio.locator('#expandControls').click();
     await studio.locator('#previewWorkbench').click();
     await studio.locator('#actionStatus').filter({hasText:'Temporary workbench preview applied'}).waitFor();
     await studio.locator('#revertPreview').click();
     await studio.locator('#actionStatus').filter({hasText:'Workbench preview reverted'}).waitFor();
    }else{
     const actual=await page.evaluate(()=>{const wb=document.querySelector('.monaco-workbench');const style=getComputedStyle(wb);return {base:style.getPropertyValue('--vscode-editor-background').trim(),active:style.getPropertyValue('--vscode-tab-activeBackground').trim(),header:style.getPropertyValue('--vscode-editorGroupHeader-tabsBackground').trim(),indicator:style.getPropertyValue('--vscode-tab-activeBorderTop').trim(),runtime:!!document.getElementById('gradient-nitro-live')};});
     assert.equal(actual.active,actual.header,'Active tab merges with header');assert.equal(actual.runtime,false,'No injected style element');console.log(state.phase,actual);
    }
    await page.screenshot({path:path.join(output,state.phase+'.png')});fs.writeFileSync(control,JSON.stringify({...state,done:state.phase}));
   }
   await sleep(300);
  }
  throw new Error('VS Code integration timed out');
 }finally{await app.close().catch(()=>{});assert.deepEqual(hashes(),before,'Installation files unchanged');}
})().catch(e=>{console.error(e);process.exitCode=1;});
