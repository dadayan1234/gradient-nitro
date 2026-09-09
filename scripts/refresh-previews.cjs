// Copy only the verified release-palette captures, never diagnostic test colors.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'.vscode-test/latest-release-preview.txt'),'utf8').trim();
const result=JSON.parse(fs.readFileSync(path.join(source,'results.json')));
assert.equal(JSON.parse(fs.readFileSync(path.join(source,'control.json'))).phase,'complete');
assert.deepEqual(result.failures,[]);
const images={
 'release-workbench-dark.png':['workbench-preview.png','workbench-explorer-terminal.png','workbench-modern.png'],
 'release-workbench-classic.png':['workbench-dark.png'],
 'release-workbench-light.png':['workbench-light.png'],
 'release-side-menu.png':['theme-studio-side-menu.png','theme-studio-vscode.png']
};
for(const [from,targets] of Object.entries(images))for(const target of targets)fs.copyFileSync(path.join(source,from),path.join(root,'docs/images',target));
console.log('Updated verified native release previews from '+source);
