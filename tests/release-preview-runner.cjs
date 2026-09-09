const fs=require('node:fs'),path=require('node:path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async(vscode,api,root,output,capture)=>{
 const {releasePreview}=require(path.join(root,'scripts/release-preview.cjs'));
 const workspace=path.join(output,'workspace');
 fs.writeFileSync(path.join(workspace,'main.ts'),`import { createApplication } from './config';

// A calm workspace, ready for your next idea.
const settings = {
    name: 'Midnight Studio',
    port: 8000,
    environment: 'development',
};

const app = createApplication(settings.name, settings.port);

async function bootstrap() {
    await app.start();
    console.log('Application ready', settings.name);
}

bootstrap();
`);
 fs.writeFileSync(path.join(workspace,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',strict:true}}));
 fs.writeFileSync(path.join(workspace,'README.md'),'# Midnight Studio\n\nA focused space for thoughtful work.\n');
 const write=new vscode.EventEmitter();
 const terminal=vscode.window.createTerminal({name:'Development',pty:{onDidWrite:write.event,open(){write.fire('\x1b[2J\x1b[H> npm run dev\r\n\r\n  Midnight Studio\r\n  Local: http://localhost:8000\r\n\r\n  Ready in 240ms.\r\n');},close(){write.dispose();}}});
 await vscode.commands.executeCommand('workbench.action.closeAllEditors');
 const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(workspace,'main.ts')));
 await vscode.window.showTextDocument(doc,{preview:false});
 for(const [phase,mode,modern] of [['release-workbench-dark','dark',true],['release-workbench-classic','dark',false],['release-workbench-light','light',true]]){
  const cfg={...releasePreview(mode),nativeModernUI:modern};await api.applyCustomTheme(cfg);
  await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  await vscode.commands.executeCommand('workbench.view.explorer');terminal.show(true);
  await vscode.commands.executeCommand('notifications.clearAll');await sleep(1800);await capture(phase,{expected:cfg});
 }
 const cfg=releasePreview();await api.applyCustomTheme(cfg);
 await vscode.commands.executeCommand('workbench.view.extension.gradientNitro');
 await vscode.commands.executeCommand('gradientNitro.openCustomizer');await sleep(1200);
 await capture('release-side-menu',{expected:cfg});
 fs.writeFileSync(path.join(output,'control.json'),JSON.stringify({phase:'complete'}));
};
