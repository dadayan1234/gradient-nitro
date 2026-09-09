const vscode=require('vscode'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),control=path.join(root,'.vscode-test/capture.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function capture(phase){fs.writeFileSync(control,JSON.stringify({phase}));for(let i=0;i<120;i++){await sleep(300);if(JSON.parse(fs.readFileSync(control)).done===phase)return;}throw new Error('Capture timeout: '+phase);}
exports.run=async()=>{
 try{
  assert.equal(vscode.version,'1.136.1');await vscode.extensions.getExtension('dadayan1234.gradient-nitro-glass').activate();
  const engine=require('../out/extension'),defaults=engine.getDefaultConfig();await sleep(500);
  await engine.applyCustomTheme({...defaults,roundedCorners:false});
  assert.equal(vscode.workspace.getConfiguration('gradientNitro').get('baseColor'),'#120D24');
  const cfg=vscode.workspace.getConfiguration('workbench'),colors=cfg.get('colorCustomizations')['[Gradient Nitro Glass]'];
  assert.equal(colors['tab.activeBackground'],colors['editorGroupHeader.tabsBackground']);assert.equal(colors['activityBar.activeBackground'],'#00000000');
  assert.equal(vscode.workspace.getConfiguration('editor').inspect('tokenColorCustomizations').globalValue,undefined,'No syntax rewrite on workbench Save');
  for(const name of ['README.md','notes.txt','theme.ts'])await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root,'examples',name))),{preview:false});
  await vscode.commands.executeCommand('workbench.actions.view.problems');await capture('native-dark');
  await engine.applyCustomTheme({...defaults,workbenchEffects:true,roundedCorners:false});
  await sleep(2000);await vscode.commands.executeCommand('notifications.clearAll');await capture('workbench-preview');
  await vscode.commands.executeCommand('workbench.action.togglePanel');await capture('workbench-sidebar-only');
  await vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');await capture('workbench-editor-only');
  await vscode.commands.executeCommand('workbench.action.togglePanel');await capture('workbench-panel-only');
  await vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
  await vscode.commands.executeCommand('workbench.action.splitEditorRight');await capture('workbench-two-groups');
  await vscode.commands.executeCommand('workbench.action.joinAllGroups');
  await vscode.commands.executeCommand('workbench.action.toggleAuxiliaryBar');await capture('workbench-secondary');
  await vscode.commands.executeCommand('workbench.action.toggleAuxiliaryBar');
  await vscode.commands.executeCommand('workbench.action.toggleZenMode');await capture('workbench-zen');
  await vscode.commands.executeCommand('workbench.action.toggleZenMode');
  await capture('workbench-resize');await capture('workbench-panel-resize');
  await engine.applyCustomTheme({...defaults,themeMode:'light',baseColor:'#FAF7FF',roundedCorners:false});await capture('native-light');
  await engine.applyCustomTheme({...defaults,roundedCorners:true});await capture('native-modern');
  await engine.applyCustomTheme({...defaults,workbenchEffects:true,roundedCorners:false});
  await vscode.commands.executeCommand('notifications.clearAll');
  await vscode.commands.executeCommand('gradientNitro.openCustomizer');await capture('studio-webview');
  // Workbench preview API uses only configuration, and preserves later user edits.
  const memory={},state={get:key=>memory[key],update:async(key,value)=>{memory[key]=value;}};
  const {WorkbenchPreview}=require('../out/workbenchPreview');const preview=new WorkbenchPreview(state),before=vscode.workspace.getConfiguration('workbench').inspect('colorCustomizations').globalValue;
  await preview.apply(engine.buildColors({...defaults,accentColor:'#E879F9'}));await preview.revert();assert.deepEqual(vscode.workspace.getConfiguration('workbench').inspect('colorCustomizations').globalValue,before);
  await vscode.commands.executeCommand('gradientNitro.resetDefaults');assert.equal(vscode.workspace.getConfiguration('workbench').get('colorTheme'),'Default Dark Modern');
  fs.writeFileSync(control,JSON.stringify({phase:'complete'}));await sleep(1000);
 }catch(e){fs.writeFileSync(control,JSON.stringify({phase:'failed',error:e.stack}));throw e;}
};
