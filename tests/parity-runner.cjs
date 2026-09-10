const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async(vscode,root,output,options={})=>{
 const control=path.join(output,'control.json'),stage=path.join(output,'stage.json');
 const capture=async(phase,extra={})=>{fs.writeFileSync(control,JSON.stringify({phase,...extra}));for(let i=0;i<180;i++){await sleep(250);try{if(JSON.parse(fs.readFileSync(control)).done===phase)return;}catch{}}throw Error('Capture timeout '+phase);};
 try{
  assert.ok(['1.136.1','1.107.0'].includes(vscode.version), 'Supported isolated test fixture');
  const extension=vscode.extensions.getExtension('dadayan1234.gradient-nitro-glass');await extension.activate();
  const modulePath=path.join(extension.extensionPath,'out/extension.js').toLowerCase();
  const cached=Object.keys(require.cache).find(key=>key.toLowerCase()===modulePath);
  assert.ok(cached,'Use the activated installed extension instance');
  const api=require.cache[cached].exports;
  if(options.releasePreview){await require('./release-preview-runner.cjs').run(vscode,api,root,output,capture);return;}
  const defaults=api.getDefaultConfig();
  const distinctive=api.normalizeConfig({...defaults,workbenchEffects:true,roundedCorners:true,borderRadius:17,glassBlur:33,glassOpacity:.61,neonRadius:19,motionStrength:.73,motionSpring:.81,gradientMode:'custom',gradientAngle:0,gradientStrength:.6,gradientStops:[{id:'red',color:'#FF0000',position:0,opacity:.8,softness:.1},{id:'green',color:'#00FF00',position:50,opacity:.65,softness:.5},{id:'blue',color:'#0000FF',position:100,opacity:.85,softness:.9}]});
  const main=vscode.Uri.file(path.join(output,'workspace/main.ts')),definition=vscode.Uri.file(path.join(output,'workspace/config.ts'));
  const doc=await vscode.workspace.openTextDocument(main);await vscode.window.showTextDocument(doc,{preview:false});
  const choose=(line,character)=>{const editor=vscode.window.activeTextEditor;editor.selection=new vscode.Selection(line,character,line,character);};
  vscode.languages.registerCompletionItemProvider('typescript',{provideCompletionItems(){const item=new vscode.CompletionItem('start',vscode.CompletionItemKind.Method);item.detail='start(): Promise<void>';item.documentation=new vscode.MarkdownString('Start the application with the configured port.\n\n```ts\nawait app.start();\n```');return[item,new vscode.CompletionItem('status'),new vscode.CompletionItem('stop')];}},'.');
  vscode.languages.registerHoverProvider('typescript',{provideHover(){return new vscode.Hover(new vscode.MarkdownString('**createApplication**\n\nCreates a configured service.\n\n```ts\ncreateApplication(name: string, port: number): Application\n```'));}});
  vscode.languages.registerSignatureHelpProvider('typescript',{provideSignatureHelp(){const help=new vscode.SignatureHelp();help.signatures=[new vscode.SignatureInformation('createApplication(name: string, port: number)','Create the application instance.')];help.signatures[0].parameters=[new vscode.ParameterInformation('name','Service name'),new vscode.ParameterInformation('port','Listening port')];help.activeSignature=0;help.activeParameter=0;return help;}},'(',',');
  vscode.languages.registerDefinitionProvider('typescript',{provideDefinition(){return new vscode.Location(definition,new vscode.Position(1,16));}});
  const diagnostic=new vscode.Diagnostic(new vscode.Range(7,0,7,10),'Example diagnostic: application readiness should be checked.',vscode.DiagnosticSeverity.Warning);
  const diagnostics=vscode.languages.createDiagnosticCollection('nitro-qa');diagnostics.set(main,[diagnostic]);
  vscode.languages.registerCodeActionsProvider('typescript',{provideCodeActions(){const action=new vscode.CodeAction('Inspect application readiness',vscode.CodeActionKind.QuickFix);action.command={command:'editor.action.showHover',title:'Inspect readiness'};return[action];}});
  const legacyMenuCheck=options.surfacesOnly && vscode.version==='1.107.0';
  if(legacyMenuCheck)await api.applyCustomTheme(distinctive);
  if(!fs.existsSync(stage) && !legacyMenuCheck){
   await api.applyCustomTheme(distinctive);await sleep(1600);
   await vscode.commands.executeCommand('notifications.clearAll');
   await vscode.commands.executeCommand('gradientNitro.openCustomizer');await capture('studio-save',{expected:distinctive});
   assert.deepEqual(api.getCurrentConfig(),distinctive);
   fs.writeFileSync(stage,JSON.stringify({reloaded:true,expected:distinctive}));
   await capture('before-reload');void vscode.commands.executeCommand('workbench.action.reloadWindow').then(undefined,()=>{});return;
  }
  assert.deepEqual(api.getCurrentConfig(),distinctive,'Installed VSIX reload preserves every field');
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');await vscode.window.showTextDocument(doc,{preview:false});
  await sleep(1800);await vscode.commands.executeCommand('notifications.clearAll');
  await capture('parity-reloaded',{expected:distinctive});
  const terminalOutput=new vscode.EventEmitter();
  const terminal=vscode.window.createTerminal({name:'Nitro Preview',pty:{onDidWrite:terminalOutput.event,open(){terminalOutput.fire('\x1b[2J\x1b[HGradient Nitro workspace\r\n\x1b[32mReady\x1b[0m - terminal output stays readable\r\n> ');},close(){terminalOutput.dispose();}}});
  for(const themeMode of ['dark','light'])for(const nativeModernUI of [false,true]){
   const cfg=api.normalizeConfig({...distinctive,themeMode,nativeModernUI,baseColor:themeMode==='light'?'#FAF7FF':'#120D24',gradientStrength:.35});
   await api.applyCustomTheme(cfg);await vscode.commands.executeCommand('workbench.view.explorer');terminal.show();await sleep(1500);
   await capture('layers-'+themeMode+'-'+(nativeModernUI?'modern':'classic'),{expected:cfg});
  }
  terminal.dispose();await api.applyCustomTheme(distinctive);
  if(options.surfacesOnly){fs.writeFileSync(control,JSON.stringify({phase:'complete'}));return;}
  const preview=async(phase,patch={},surface)=>{const cfg=api.normalizeConfig({...distinctive,...patch});await api.applyWorkbenchPreview(cfg);await sleep(160);if(surface==='quick')void vscode.commands.executeCommand('workbench.action.showCommands');await capture(phase,{expected:cfg,surface});};
  await preview('diagnostic-0');await preview('diagnostic-90',{gradientAngle:90});
  await preview('softness-low',{gradientSoftness:0});await preview('softness-high',{gradientSoftness:1});
  for(const blur of [0,16,24,40])await preview('blur-'+blur,{glassBlur:blur},'quick');
  for(const strength of [0,.5,1])await preview('motion-'+strength,{motionStrength:strength});
  for(const spring of [0,.5,1])await preview('spring-'+spring,{motionSpring:spring});
  for(const [name,patch]of Object.entries({off:{softlightEnabled:false},low:{editorSoftlight:.05},high:{editorSoftlight:.6},narrow:{softlightSpread:.2},wide:{softlightSpread:1.5},sharp:{softlightSoftness:0},soft:{softlightSoftness:1},custom:{softlightMode:'custom',softlightColor:'#FF99EE'},independent:{gradientEnabled:false,softlightEnabled:true}}))await preview('softlight-'+name,patch);
  for(const [name,patch]of Object.entries({off:{neonEnabled:false},strength:{neonStrength:1},radius:{neonRadius:33},opacity:{neonOpacity:.9},custom:{neonColorMode:'custom',neonCustomColor:'#FF66DD'}}))await preview('neon-'+name,patch);
  await api.revertWorkbenchPreview();assert.deepEqual(api.getCurrentConfig(),distinctive);
  const modern=api.normalizeConfig({...distinctive,nativeModernUI:true});
  await api.applyWorkbenchPreview(modern);await capture('modern-preview',{expected:modern});
  await api.applyCustomTheme(modern);await capture('modern-save',{expected:modern});
  for(const borderWidth of [0,1,3,4])await preview('border-'+borderWidth,{borderWidth,borderColor:'#E879F9',borderVisibility:1},'quick');
  await preview('border-disabled',{borderEnabled:false,borderWidth:3},'quick');
  const showcase=api.normalizeConfig({...defaults,workbenchEffects:true,roundedCorners:true,borderRadius:17,glassBlur:33,glassOpacity:.61,neonRadius:19,motionStrength:.73,motionSpring:.81});
  await api.applyCustomTheme(showcase);await vscode.commands.executeCommand('workbench.actions.view.problems');await vscode.commands.executeCommand('notifications.clearAll');await capture('workbench-preview',{expected:showcase});
  void vscode.commands.executeCommand('workbench.action.showCommands');await capture('command-palette-glass',{surface:'quick',expected:showcase});
  await capture('context-menu-glass',{surface:'menu',expected:showcase});
  await capture('activity-tooltip-glass',{surface:'activity-hover',expected:showcase});
  await capture('toolbar-tooltip-glass',{surface:'toolbar-hover',expected:showcase});
  await vscode.window.showTextDocument(doc);choose(4,15);void vscode.commands.executeCommand('editor.action.showHover');await capture('editor-hover-glass',{surface:'hover',expected:showcase});
  choose(7,4);void vscode.commands.executeCommand('editor.action.showHover');await capture('diagnostic-hover-glass',{surface:'hover',expected:showcase});
  choose(6,4);void vscode.commands.executeCommand('editor.action.triggerSuggest');await capture('suggest-glass',{surface:'suggest',expected:showcase});
  choose(4,32);void vscode.commands.executeCommand('editor.action.triggerParameterHints');await capture('parameter-hints-glass',{surface:'parameter',expected:showcase});
  void vscode.commands.executeCommand('actions.find');await capture('find-glass',{surface:'find',expected:showcase});
  choose(4,15);void vscode.commands.executeCommand('editor.action.peekDefinition');await capture('peek-glass',{surface:'peek',expected:showcase});
  void vscode.window.showInformationMessage('Gradient Nitro: saved visual configuration is active.','Open Theme Studio');await capture('notification-glass',{surface:'notification',expected:showcase});
  void vscode.commands.executeCommand('notifications.showList');await capture('notification-center-glass',{surface:'center',expected:showcase});
  void vscode.window.showInformationMessage('Keep this Gradient Nitro configuration?',{modal:true,detail:'Rounded glass dialog rendered by VS Code.'},'Keep Theme');await capture('dialog-glass',{surface:'dialog',expected:showcase});
  await vscode.commands.executeCommand('workbench.view.extension.gradientNitro');await capture('activity-view',{expected:showcase});
  await capture('theme-studio',{surface:'studio',expected:showcase});
  await capture('save-draft',{expected:showcase});
  await vscode.commands.executeCommand('gradientNitro.saveAndApply');
  const edited=api.normalizeConfig({...showcase,accentColor:'#F472B6',gradientStops:require(path.join(extension.extensionPath,'out/palette.js')).deriveDefaultStops(showcase.baseColor,'#F472B6'),borderWidth:3});
  for(let i=0;i<150&&JSON.stringify(api.getCurrentConfig())!==JSON.stringify(edited);i++)await sleep(100);
  assert.deepEqual(api.getCurrentConfig(),edited,'Side menu Save applies the open Studio draft');
  await capture('side-save-applied',{expected:edited});
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');await vscode.commands.executeCommand('gradientNitro.saveAndApply');
  assert.deepEqual(api.getCurrentConfig(),edited,'Side menu Save reapplies saved configuration when Studio is closed');
  await capture('side-save-reapply',{expected:edited});
  fs.writeFileSync(control,JSON.stringify({phase:'complete',installedPath:extension.extensionPath}));
 }catch(e){fs.writeFileSync(control,JSON.stringify({phase:'failed',error:e.stack}));}
};
