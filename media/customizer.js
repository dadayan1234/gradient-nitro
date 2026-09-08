'use strict';
const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
// Configuration and simulated workbench state live together. The palette is always derived.
let state = { ...clone(initialConfig), ...engine.normalizePalette(initialConfig), activeActivityItem: 'explorer', activeEditorTab: 'main.py', activePanel: 'Terminal', selectedExplorerItem: 'main.py', editorFocused: true, controlsCollapsed: false, syntaxLanguage: 'python' };
const history = [], future = [];
let pendingHistory, historyTimer, frame, sentConfig, busy = false, previewActive = false;
const config = () => Object.fromEntries(Object.keys(defaultConfig).map(key => [key, clone(state[key])]));
function commitHistory() {
    clearTimeout(historyTimer);
    if (pendingHistory && JSON.stringify(pendingHistory) !== JSON.stringify(config())) {
        history.push(pendingHistory); if (history.length > 60) history.shift(); future.length = 0;
    }
    pendingHistory = undefined; updateHistoryButtons();
}
function modify(patch, continuous = false) {
    if (!continuous) commitHistory();
    if (!pendingHistory) pendingHistory = config();
    Object.assign(state, patch);
    if (continuous) historyTimer = (clearTimeout(historyTimer), setTimeout(commitHistory, 400)); else commitHistory();
    draftStatus();
    schedule();
}
function draftStatus() { $('actionStatus').textContent = previewActive ? 'Canvas changed. Apply workbench preview again to update it.' : 'Unsaved canvas changes.'; }
function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = undefined; render(); }); }
function updateHistoryButtons() { $('undo').disabled = !history.length && !pendingHistory; $('redo').disabled = !future.length; }
function setValue(id, value) { const element = $(id); if (document.activeElement !== element) element.value = value; }
const paletteRoles = ['base-0','base-1','base-2','base-3','base-4','base-5','fg-primary','fg-secondary','fg-muted','accent','accent-bright','accent-muted','accent-subtle','accent-hover','accent-border','border-subtle','border-normal'];
const swatches = new Map();
for (const role of paletteRoles) {
    const row = document.createElement('div'); row.className = 'swatch';
    const color = document.createElement('i'), label = document.createElement('span'), hex = document.createElement('code');
    label.textContent = role; label.append(hex); row.append(color,label); $('paletteInspector').append(row); swatches.set(role,{ color,hex });
}
engine.presets.forEach((preset,index) => {
    const button = document.createElement('button'); button.className = 'preset'; button.dataset.preset = index; button.setAttribute('aria-pressed','false');
    const dots = document.createElement('span'); dots.className = 'preset-dots';
    for (const color of [preset.baseColor,preset.accentColor]) { const dot = document.createElement('i'); dot.style.backgroundColor = color; dots.append(dot); }
    const title = document.createElement('strong'), description = document.createElement('small'); title.textContent = preset.name; description.textContent = preset.character;
    button.append(dots,title,description); button.addEventListener('click',() => modify({ baseColor: preset.baseColor, accentColor: preset.accentColor, themeMode: 'dark' })); $('presets').append(button);
});
const files = [['app',0,true],['api',1,true],['core',1,true],['config.py',2],['database.py',2],['logging_config.py',2],['security.py',2],['modules',1,true],['services',1,true],['views',1,true],['main.py',2],['assets',0,true],['docs',0,true],['tests',0,true],['README.md',0],['pyproject.toml',0]];
files.forEach(([name,indent,folder]) => {
    const row = document.createElement('button'); row.className = 'tree-row'; row.dataset.file = name; row.style.setProperty('--indent',indent); row.setAttribute('aria-pressed','false');
    const icon = document.createElementNS('http://www.w3.org/2000/svg','svg'); icon.classList.add('icon'); icon.setAttribute('aria-hidden','true');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use'); use.setAttribute('href',folder ? '#folder' : '#code'); icon.append(use);
    row.append(icon,document.createTextNode(name)); row.addEventListener('click',() => { state.selectedExplorerItem = name; state.editorFocused = false; schedule(); }); $('projectTree').append(row);
});
const mainSample = [
    [['comment','# Application entry point · sesa-pilot']],
    [['keyword','from '],['text','fastapi '],['keyword','import '],['type','FastAPI']],
    [['keyword','from '],['text','app.core.config '],['keyword','import '],['variable','settings']],
    [['keyword','from '],['text','app.modules.identity '],['keyword','import '],['variable','api '],['keyword','as '],['variable','identity_api']],
    [['keyword','from '],['text','app.modules.device '],['keyword','import '],['variable','api '],['keyword','as '],['variable','device_api']],
    [], [['variable','app '],['operator','= '],['type','FastAPI'],['text','(']],
    [['text','    '],['property','title'],['operator','='],['variable','settings'],['text','.'],['constant','APP_NAME'],['text',',']],
    [['text','    '],['property','version'],['operator','='],['variable','settings'],['text','.'],['constant','VERSION'],['text',',']],
    [['text',')']], [],
    [['variable','app'],['text','.'],['function','include_router'],['text','('],['variable','identity_api'],['text','.router)']],
    [['variable','app'],['text','.'],['function','include_router'],['text','('],['variable','device_api'],['text','.router)']], [],
    [['function','@app.get'],['text','('],['string','"/health"'],['text',')']],
    [['keyword','async def '],['function','health_check'],['text','():']],
    [['text','    '],['keyword','return '],['text','{'],['string','"status"'],['text',': '],['string','"ready"'],['text',', '],['string','"version"'],['text',': '],['variable','settings'],['text','.'],['constant','VERSION'],['text','}']], []
];
const configSample = [
    [['keyword','from '],['text','pydantic_settings '],['keyword','import '],['type','BaseSettings']], [],
    [['keyword','class '],['type','Settings'],['text','('],['type','BaseSettings'],['text','):']],
    [['text','    '],['constant','APP_NAME'],['text',': '],['type','str '],['operator','= '],['string','"sesa-pilot"']],
    [['text','    '],['constant','VERSION'],['text',': '],['type','str '],['operator','= '],['string','"1.0.0"']],
    [['text','    '],['constant','DEBUG'],['text',': '],['type','bool '],['operator','= '],['constant','False']], [],
    [['variable','settings '],['operator','= '],['type','Settings'],['text','()']]
];
function splitSample(sample) {
    const lines = [[]];
    for (const [role,text] of sample) text.split('\n').forEach((part,i) => { if (i) lines.push([]); if (part) lines.at(-1).push([role,part]); });
    return lines;
}
let codeSignature;
function renderCode() {
    const signature = [state.activeEditorTab,state.syntaxLanguage].join('|');
    if (signature === codeSignature) return; codeSignature = signature;
    const lines = state.syntaxLanguage !== 'python' ? splitSample(syntaxData.samples[state.syntaxLanguage] || syntaxData.samples.typescript) : state.activeEditorTab === 'config.py' ? configSample : state.activeEditorTab === 'README.md' ? splitSample(syntaxData.samples.markdown) : mainSample;
    $('codeLines').replaceChildren(); $('minimap').replaceChildren();
    lines.forEach((tokens,i) => {
        const line = document.createElement('div'); line.className = 'code-line';
        const number = document.createElement('span'); number.className = 'line-number'; number.textContent = i+1;
        const source = document.createElement('span'); source.className = 'line-source';
        tokens.forEach(([role,text],j) => { const span = document.createElement('span'); span.style.color = 'var(--syntax-'+role+')'; span.textContent = text; if (j === 0 && text.startsWith('    ')) span.classList.add('indent-guide'); if (i === 11) span.classList.add('code-selection'); source.append(span); });
        if (i === lines.length-1) { const cursor = document.createElement('span'); cursor.className = 'cursor'; source.append(cursor); }
        line.append(number,source); $('codeLines').append(line);
        const mini = document.createElement('div'); mini.className = 'mini-line'; mini.style.width = Math.max(4,Math.min(60,tokens.reduce((n,t) => n+t[1].length,0)))+'px'; $('minimap').append(mini);
    });
}
function currentSyntax() {
    const language = state.activeEditorTab === 'README.md' && state.syntaxLanguage === 'python' ? 'markdown' : state.syntaxLanguage;
    return syntaxEngine.syntaxPalette(state.themeMode,language,state.syntaxOverrides);
}
Object.keys(syntaxData.palettes.dark).filter(key => key !== 'all').forEach(language => { const option = document.createElement('option'); option.value = language; option.textContent = language; $('syntaxLanguage').append(option); });
syntaxData.roles.forEach(role => {
    const label = document.createElement('label'); label.textContent = role;
    const input = document.createElement('input'); input.type = 'color'; input.id = 'syntax-'+role; input.setAttribute('aria-label',role+' syntax color');
    input.addEventListener('input',() => modify({ syntaxOverrides: { ...state.syntaxOverrides, [state.syntaxLanguage]: { ...state.syntaxOverrides[state.syntaxLanguage], [role]: input.value } } },true)); input.addEventListener('change',commitHistory); label.append(input); $('syntaxControls').append(label);
});
function render() {
    const palette = engine.derivePalette(state), tokens = engine.workbenchColors(state,palette), root = document.documentElement;
    for (const [role,color] of Object.entries(palette)) root.style.setProperty('--theme-'+role,color);
    for (const [token,color] of Object.entries(tokens)) root.style.setProperty('--wb-'+token.replaceAll('.','-'),color);
    root.style.setProperty('--control-surface',palette['base-2']+'EE'); root.style.setProperty('--control-shadow',palette['base-0']+'B0');
    root.style.colorScheme = state.themeMode;
    root.style.setProperty('--font-family',state.fontFamily); root.style.setProperty('--font-size',state.fontSize+'px'); root.style.setProperty('--line-height',(state.lineHeight || Math.round(state.fontSize*1.6))+'px'); root.style.setProperty('--font-weight',state.fontWeight);
    $('codeLines').style.fontVariantLigatures = state.fontLigatures ? 'normal' : 'none';
    const syntax = currentSyntax();
    for (const [role,color] of Object.entries(syntax)) { root.style.setProperty('--syntax-'+role,color); if ($('syntax-'+role)) setValue('syntax-'+role,color); }
    for (const key of ['baseColor','accentColor']) { setValue(key,state[key]); setValue(key === 'baseColor' ? 'baseHex' : 'accentHex',state[key]); }
    for (const id of ['baseHex','accentHex']) if (/^#[a-f\d]{6}$/i.test($(id).value)) $(id).removeAttribute('aria-invalid');
    $('colorError').hidden = !['baseHex','accentHex'].some(id => $(id).getAttribute('aria-invalid') === 'true');
    for (const key of ['surfaceDepth','contrast','accentIntensity','inactiveFade','borderVisibility']) {
        setValue(key,state[key]);
        $(key+'Value').textContent = key === 'surfaceDepth' ? state[key] < .65 ? 'Low' : state[key] > 1.35 ? 'High' : 'Medium' : key === 'contrast' ? state[key] < .9 ? 'Soft' : state[key] > 1.1 ? 'High' : 'Balanced' : Math.round(state[key]*100)+'%';
    }
    for (const key of ['fontFamily','fontSize','lineHeight','fontWeight','activeTabIndicator','syntaxLanguage']) setValue(key,state[key]);
    $('fontLigatures').checked = state.fontLigatures; $('editorFocused').checked = state.editorFocused;
    $('roundedCorners').checked = state.roundedCorners;
    $('fileColors').checked = state.fileColors;
    $('editorGroup').classList.toggle('unfocused',!state.editorFocused); $('editorGroup').dataset.indicator = state.activeTabIndicator;
    $('indicatorNote').hidden = state.activeTabIndicator !== 'side';
    $('controls').hidden = state.controlsCollapsed; $('expandControls').hidden = !state.controlsCollapsed;
    document.querySelectorAll('[data-mode]').forEach(el => { const active = el.dataset.mode === state.themeMode; el.classList.toggle('active',active); el.setAttribute('aria-pressed',active); });
    document.querySelectorAll('[data-preset]').forEach(el => { const preset = engine.presets[el.dataset.preset], active = preset.baseColor === state.baseColor.toUpperCase() && preset.accentColor === state.accentColor.toUpperCase(); el.classList.toggle('active',active); el.setAttribute('aria-pressed',active); });
    for (const [selector,key,data,aria] of [['[data-activity]','activeActivityItem','activity','aria-pressed'],['[data-tab]','activeEditorTab','tab','aria-selected'],['[data-panel]','activePanel','panel','aria-selected'],['[data-file]','selectedExplorerItem','file','aria-pressed']]) document.querySelectorAll(selector).forEach(el => { const active = el.dataset[data] === state[key]; el.classList.toggle(data === 'file' ? 'selected' : 'active',active); el.setAttribute(aria,active); });
    $('sidebarTitle').textContent = { explorer: 'EXPLORER', search: 'SEARCH', source: 'SOURCE CONTROL', run: 'RUN AND DEBUG', extensions: 'EXTENSIONS' }[state.activeActivityItem];
    $('breadcrumbs').textContent = (state.activeEditorTab === 'main.py' ? 'app　›　views　›　' : state.activeEditorTab === 'config.py' ? 'app　›　core　›　' : 'sesa-pilot　›　')+state.activeEditorTab;
    $('languageStatus').textContent = state.activeEditorTab === 'README.md' ? 'Markdown' : state.syntaxLanguage === 'python' ? 'Python' : state.syntaxLanguage;
    renderCode();
    const panelText = { Terminal: '(.venv) sesa-pilot ❯ uvicorn app.views.main:app --reload\nINFO:     Application startup complete.\nINFO:     Uvicorn running on http://127.0.0.1:8000\n❯ ', Problems: 'No problems have been detected in the workspace.', Output: '[Python] Environment selected: .venv\n[Python] Language server initialized.', 'Debug Console': 'Debugger attached.\nApplication ready. Listening for requests.', Ports: 'Port    Process                 Forwarded address\n8000    uvicorn                 localhost:8000' };
    if ($('panelContent').textContent !== panelText[state.activePanel]) $('panelContent').textContent = panelText[state.activePanel];
    for (const [role,{ color,hex }] of swatches) { color.style.backgroundColor = palette[role]; hex.textContent = palette[role]; }
    $('diagnostics').replaceChildren();
    for (const item of engine.diagnostics(palette)) { const row = document.createElement('div'); row.className = 'diagnostic'+(item.warning ? ' warning' : ''); const label = document.createElement('span'), value = document.createElement('span'); label.textContent = item.label; value.textContent = item.value; row.append(label,value); $('diagnostics').append(row); }
    updateHistoryButtons();
}
for (const [picker,hex,key] of [['baseColor','baseHex','baseColor'],['accentColor','accentHex','accentColor']]) {
    $(picker).addEventListener('input',() => { $(hex).value = $(picker).value.toUpperCase(); $(hex).removeAttribute('aria-invalid'); $('colorError').hidden = true; modify({ [key]: $(picker).value.toUpperCase() },true); });
    $(hex).addEventListener('input',() => { const valid = /^#[a-f\d]{6}$/i.test($(hex).value); $(hex).setAttribute('aria-invalid',!valid); $('colorError').hidden = valid; if (valid) modify({ [key]: $(hex).value.toUpperCase() },true); });
    $(picker).addEventListener('change',commitHistory); $(hex).addEventListener('change',commitHistory);
}
document.querySelectorAll('[data-number]').forEach(input => { input.addEventListener('input',() => modify({ [input.id]: Number(input.value), ...(input.id === 'borderVisibility' ? { borderEnabled: true, borderWidth: 1 } : {}) },true)); input.addEventListener('change',commitHistory); });
$('activeTabIndicator').addEventListener('change',event => modify({ activeTabIndicator: event.target.value }));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',() => modify({ themeMode: button.dataset.mode, baseColor: button.dataset.mode === 'light' ? '#FAF7FF' : engine.paletteDefaults.baseColor })));
document.querySelectorAll('[data-activity]').forEach(button => button.addEventListener('click',() => { state.activeActivityItem = button.dataset.activity; state.editorFocused = false; schedule(); }));
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click',() => { state.activeEditorTab = button.dataset.tab; state.editorFocused = true; schedule(); }));
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click',() => { state.activePanel = button.dataset.panel; state.editorFocused = false; schedule(); }));
document.querySelectorAll('[role=tablist]').forEach(list => list.addEventListener('keydown',event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; const buttons = [...list.querySelectorAll('[role=tab]')]; const index = buttons.indexOf(document.activeElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : (index+(event.key === 'ArrowRight' ? 1 : -1)+buttons.length)%buttons.length; event.preventDefault(); buttons[next].focus(); buttons[next].click(); }));
$('editor').addEventListener('focus',() => { state.editorFocused = true; schedule(); });
$('editorFocused').addEventListener('change',event => { state.editorFocused = event.target.checked; schedule(); });
function collapse(value) { state.controlsCollapsed = value; render(); (value ? $('expandControls') : $('collapseControls')).focus(); }
$('collapseControls').addEventListener('click',() => collapse(true)); $('expandControls').addEventListener('click',() => collapse(false)); $('openControls').addEventListener('click',() => collapse(false));
document.addEventListener('keydown',event => { if (event.key === 'Escape' && !state.controlsCollapsed) collapse(true); });
for (const key of ['fontFamily','fontSize','lineHeight','fontWeight']) $(key).addEventListener('input',event => {
    const value = event.target.value;
    if (key === 'fontFamily' && !/^[\w\s,'".\-]+$/.test(value)) return;
    if (['fontSize','lineHeight'].includes(key) && (!event.target.checkValidity() || value === '')) return;
    modify({ [key]: ['fontSize','lineHeight'].includes(key) ? Number(value) : value },true);
});
$('fontLigatures').addEventListener('change',event => modify({ fontLigatures: event.target.checked }));
$('roundedCorners').addEventListener('change',event => modify({ roundedCorners: event.target.checked }));
$('fileColors').addEventListener('change',event => modify({ fileColors: event.target.checked }));
$('syntaxLanguage').addEventListener('change',event => { state.syntaxLanguage = event.target.value; schedule(); });
$('resetSyntax').addEventListener('click',() => { const overrides = clone(state.syntaxOverrides); delete overrides[state.syntaxLanguage]; modify({ syntaxOverrides: overrides }); });
$('undo').addEventListener('click',() => { commitHistory(); if (history.length) { future.push(config()); Object.assign(state,history.pop()); draftStatus(); render(); } });
$('redo').addEventListener('click',() => { commitHistory(); if (future.length) { history.push(config()); Object.assign(state,future.pop()); draftStatus(); render(); } });
$('reset').addEventListener('click',() => modify(clone(defaultConfig)));
function hostAction(command) { if (busy) return; commitHistory(); busy = true; document.querySelectorAll('[data-host-action]').forEach(button => { button.disabled = true; }); $('actionStatus').textContent = 'Working…'; const submitted = config(); sentConfig = JSON.stringify(submitted); vscode.postMessage({ command, config: submitted }); }
$('save').addEventListener('click',() => hostAction('applyTheme')); $('export').addEventListener('click',() => hostAction('exportTheme')); $('previewWorkbench').addEventListener('click',() => hostAction('previewWorkbench')); $('revertPreview').addEventListener('click',() => hostAction('revertPreview'));
window.addEventListener('message',event => {
    const message = event.data;
    if (message.command === 'actionResult') { busy = false; if (typeof message.previewActive === 'boolean') previewActive = message.previewActive; document.querySelectorAll('[data-host-action]').forEach(button => { button.disabled = button.id === 'revertPreview' && !previewActive; }); $('actionStatus').textContent = message.ok && message.action === 'applyTheme' && sentConfig !== JSON.stringify(config()) ? 'Submitted theme saved. The current canvas has unsaved changes.' : message.text; }
    if (message.command === 'syncConfig') { Object.assign(state,message.config,engine.normalizePalette(message.config)); pendingHistory = undefined; history.length = future.length = 0; render(); }
});
render();
