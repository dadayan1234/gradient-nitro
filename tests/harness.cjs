const Module = require('module');
const path = require('path');
function harness() {
  const global = {}, workspace = {}, state = {}, commands = {}, writes = [];
  const defaults = { 'workbench.experimental.modernUI': false, 'workbench.shadows': true };
  const listeners = [];
  let panel;
  const vscode = {
    EventEmitter: class { event = () => ({ dispose() {} }); fire() {} dispose() {} },
    ThemeColor: class { constructor(id) { this.id = id; } },
    FileType: { Directory: 2 },
    ConfigurationTarget: { Global: 1 }, ViewColumn: { One: 1 },
    workspace: { fs: { async stat() { return { type: 1 }; } }, onDidChangeConfiguration(fn) { listeners.push(fn); return { dispose() {} }; }, getConfiguration(section) { return {
      get(key, fallback) { return workspace[section + '.' + key] ?? global[section + '.' + key] ?? defaults[section + '.' + key] ?? fallback; },
      inspect(key) { return { defaultValue: defaults[section + '.' + key], globalValue: global[section + '.' + key], workspaceValue: workspace[section + '.' + key] }; },
      async update(key, value) { writes.push(section + '.' + key); if (value === undefined) delete global[section + '.' + key]; else global[section + '.' + key] = value; }
    }; } },
    window: {
      registerFileDecorationProvider() { return { dispose() {} }; },
      showInformationMessage() {}, showErrorMessage() {},
      createWebviewPanel() { panel = { webview: { html: '', onDidReceiveMessage(fn) { panel.receive = fn; }, postMessage() {} }, onDidDispose() {}, dispose() {}, reveal() {} }; return panel; }
    },
    commands: { registerCommand(name, fn) { commands[name] = fn; return { dispose() {} }; } }
  };
  const file = path.resolve(__dirname, '../out/extension.js');
  for (const cached of Object.keys(require.cache)) if (cached.startsWith(path.dirname(file) + path.sep)) delete require.cache[cached];
  const original = Module._load;
  Module._load = function(name, ...args) { return name === 'vscode' ? vscode : original.call(this, name, ...args); };
  let extension;
  try { extension = require(file); } finally { Module._load = original; }
  extension.activate({ subscriptions: [], extensionUri: {}, globalState: { get(key) { return state[key]; }, async update(key, value) { state[key] = value; } } });
  return { extension, global, workspace, state, defaults, commands, writes, vscode, getPanel: () => panel, fireConfiguration(key) { listeners.forEach(fn => fn({ affectsConfiguration: name => name === key })); } };
}
module.exports = { harness };
