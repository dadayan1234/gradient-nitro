// Record actual Studio interactions, then encode a small looping README GIF.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(process.env.TEMP,'gradient-nitro-browser-check/node_modules/playwright'));
const {harness}=require('../tests/harness.cjs');
const {releasePreview}=require('./release-preview.cjs');
const gifName='theme-studio-motion-'+require('../package.json').version+'.gif';
(async()=>{
 const output=path.resolve('.vscode-test/demo');fs.mkdirSync(output,{recursive:true});
 const h=harness();h.global['gradientNitro.visualConfig']=releasePreview();h.commands['gradientNitro.openCustomizer']();
 const file=path.join(output,'studio.html');fs.writeFileSync(file,h.getPanel().webview.html);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1120,height:800}});
  await page.addInitScript(()=>window.acquireVsCodeApi=()=>({postMessage(){}}));
  await page.goto('file:///'+file.replaceAll('\\','/'));
  await page.locator('#workbench').waitFor();await page.waitForTimeout(300);
  await page.locator('#gradientSection').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.resolve('docs/images/theme-studio.png')});
  await page.locator('.softlight-block').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.resolve('docs/images/theme-studio-softlight.png')});
  await page.locator('#collapseControls').click();await page.waitForTimeout(250);
  await page.screenshot({path:path.resolve('docs/images/theme-studio-motion-poster.png')});
  const capture=await page.context().newCDPSession(page),frames=[];
  capture.on('Page.screencastFrame',event=>{
   const name='frame-'+String(frames.length).padStart(5,'0')+'.png';
   fs.writeFileSync(path.join(output,name),Buffer.from(event.data,'base64'));
   frames.push({name,time:event.metadata.timestamp});
   void capture.send('Page.screencastFrameAck',{sessionId:event.sessionId});
  });
  await capture.send('Page.startScreencast',{format:'png',maxWidth:1120,maxHeight:800});await page.waitForTimeout(800);
  await page.locator('#expandControls').click();
  await page.locator('#editorSoftlight').fill('0.18');await page.waitForTimeout(600);
  await page.locator('#editorSoftlight').fill('0.32');await page.waitForTimeout(900);
  await page.locator('#collapseControls').click();await page.waitForTimeout(600);
  for(const selector of ['[data-activity="search"]','[data-file="config.py"]','[data-file="database.py"]','[data-panel="Problems"]','[data-panel="Terminal"]','[data-tab="config.py"]']){
   const el=page.locator(selector).first(),box=await el.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:12});await page.waitForTimeout(450);
   await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();await page.waitForTimeout(450);
  }
  await page.locator('#expandControls').click();await page.locator('#borderSection').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
  await page.screenshot({path:path.resolve('docs/images/theme-studio-borders.png')});
  await capture.send('Page.stopScreencast');
  await page.locator('#glassSection').scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve('docs/images/theme-studio-effects.png')});
  await page.evaluate(config=>window.dispatchEvent(new MessageEvent('message',{data:{command:'syncConfig',config}})),releasePreview('light'));await page.waitForTimeout(250);
  await page.locator('.softlight-block').scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve('docs/images/theme-studio-light.png')});
  await page.evaluate(config=>window.dispatchEvent(new MessageEvent('message',{data:{command:'syncConfig',config}})),releasePreview());
  for(const [width,name] of [[950,'medium'],[390,'narrow']]){await page.setViewportSize({width,height:844});await page.waitForTimeout(200);await page.screenshot({path:path.resolve('docs/images/theme-studio-'+name+'.png')});}
  await page.locator('#collapseControls').click();await page.screenshot({path:path.resolve('docs/images/theme-studio-collapsed.png')});
  await page.close();
  if(frames.length<10)throw Error('Too few frames for an animation');
  const manifest=path.join(output,'frames.txt');
  fs.writeFileSync(manifest,frames.map((f,i)=>`file '${f.name}'\nduration ${frames[i+1]?Math.max(.01,frames[i+1].time-f.time):1}\n`).join('')+`file '${frames.at(-1).name}'\n`);
  cp.execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',manifest,'-vf','fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.resolve('docs/images',gifName)],{windowsHide:true});
  console.log('Recorded docs/images/'+gifName+' and release Studio screenshots');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
