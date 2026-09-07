
export async function clearCustomCssFile() {
    try {
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
        const profileRoot = extensionContext?.globalStorageUri?.scheme === 'file'
            ? path.dirname(path.dirname(extensionContext.globalStorageUri.fsPath))
            : path.join(appData, 'Code', 'User');
        const customCssPath = path.join(profileRoot, 'custom.css');
        if (fs.existsSync(customCssPath) && /GRADIENT NITRO|Gradient Nitro/.test(await fs.promises.readFile(customCssPath, 'utf8'))) {
            const current = await fs.promises.readFile(customCssPath, 'utf8');
            if (current.trim() === '/* Gradient Nitro - Inactive */') return;
            await fs.promises.copyFile(customCssPath, customCssPath + '.nitro-backup-' + Date.now());
            await fs.promises.writeFile(customCssPath, '/* Gradient Nitro - Inactive */\n', 'utf-8');
        }
    } catch (err) {
        console.error('Failed to clear custom.css:', err);
        throw err;
    }
}

export async function cleanupLegacyRootCustomizations() {
    try {
        const workbenchConfig = vscode.workspace.getConfiguration('workbench');
        const cc = { ...(workbenchConfig.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
        const nitro = vscode.workspace.getConfiguration('gradientNitro');
        const left = nitro.get<string>('leftColor');
        const right = nitro.get<string>('rightColor');
        if (!left || !right || cc['focusBorder'] !== left + 'a0' || cc['widget.shadow'] !== right + '60' || cc['editor.background'] !== '#00000000') return;
        const keysToRemove = [
            "focusBorder", "widget.shadow", "selection.background", "activityBar.background",
            "activityBar.foreground", "activityBar.inactiveForeground", "activityBar.activeBorder",
            "activityBar.border", "activityBarBadge.background", "activityBarBadge.foreground",
            "sideBar.background", "sideBar.border", "sideBarTitle.foreground", "sideBarSectionHeader.foreground",
            "editor.background", "editorGutter.background", "editorGroup.emptyBackground",
            "editorGroupHeader.tabsBackground", "editorGroupHeader.noTabsBackground", "editorGroupHeader.tabsBorder",
            "tab.activeBackground", "tab.unfocusedActiveBackground", "tab.inactiveBackground",
            "tab.unfocusedInactiveBackground", "tab.hoverBackground", "tab.unfocusedHoverBackground",
            "tab.activeForeground", "tab.inactiveForeground", "tab.unfocusedActiveForeground",
            "tab.unfocusedInactiveForeground", "tab.hoverForeground", "tab.border", "tab.activeBorder",
            "tab.activeBorderTop", "breadcrumb.background", "breadcrumb.foreground", "breadcrumb.focusForeground",
            "breadcrumb.activeSelectionForeground", "editorLineNumber.foreground", "editorLineNumber.activeForeground",
            "editorCursor.foreground", "editorHoverWidget.border", "editorWidget.border", "editorWidget.resizeBorder",
            "editorSuggestWidget.border", "editorSuggestWidget.highlightForeground", "editorSuggestWidget.selectedBackground",
            "quickInput.border", "pickerGroup.border", "pickerGroup.foreground", "notifications.border",
            "notificationToast.border", "peekView.border", "badge.background", "badge.foreground",
            "button.background", "button.hoverBackground", "button.foreground", "progressBar.background",
            "inputOption.activeBorder", "list.activeSelectionBackground", "list.highlightForeground",
            "panel.background", "panel.border", "panelTitle.activeBorder", "panelTitle.activeForeground",
            "panelTitle.inactiveForeground", "terminal.background", "terminalCursor.foreground",
            "terminal.ansiGreen", "terminal.ansiMagenta", "statusBar.background", "statusBar.foreground",
            "statusBar.border", "statusBar.debuggingBackground", "statusBar.noFolderBackground",
            "statusBarItem.hoverBackground", "statusBarItem.remoteBackground", "titleBar.activeBackground",
            "titleBar.activeForeground", "titleBar.inactiveForeground", "titleBar.border",
            "gitDecoration.untrackedResourceForeground", "gitDecoration.stageModifiedResourceForeground"
        ];
        let hasChanges = false;
        for (const k of keysToRemove) {
            if (k in cc) {
                delete cc[k];
                hasChanges = true;
            }
        }
        if (hasChanges) {
            if (extensionContext) await extensionContext.globalState.update('legacyColorBackup', workbenchConfig.inspect('colorCustomizations')?.globalValue);
            await workbenchConfig.update('colorCustomizations', cc, vscode.ConfigurationTarget.Global);
        }
    } catch (e) { console.error('Nitro legacy recovery failed', e); throw e; }
}

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { blend, readable, readableAcross, onColor } from './colors';
import { buildEffects, gradientSurfaces } from './effects';
import { RuntimeSession, installRuntime } from './runtime';
import { removeLegacyWorkbenchStyles } from './legacy';
import { NativeLayout } from './layout';
import { Typography, fontKeys } from './typography';
import { TokenSettings } from './tokenSettings';
import { FileColors, fileFamilies } from './files';
import { LanguageOverrides, normalizeSyntaxOverrides, syntaxRoles, languageScopes, syntaxPalette } from './syntax';
import { syntaxSamples } from './samples';

let extensionContext: vscode.ExtensionContext;
let nativeLayout: NativeLayout;
let typography: Typography;
let tokenSettings: TokenSettings;
let fileColors: FileColors;
const runtime = new RuntimeSession();
async function syncEffects(cfg?: ThemeConfig) {
    if (!vscode.env?.appRoot || !extensionContext.globalStorageUri) return;
    if (!cfg?.workbenchEffects) {
        await runtime.stop();
        if (cfg) await installRuntime(vscode.env.appRoot, extensionContext.extensionUri.fsPath, path.join(extensionContext.globalStorageUri.fsPath, 'runtime-backups'), false);
        return;
    }
    const changed = await installRuntime(vscode.env.appRoot, extensionContext.extensionUri.fsPath, path.join(extensionContext.globalStorageUri.fsPath, 'runtime-backups'), true);
    await runtime.start();
    runtime.update(buildEffects(cfg), cfg.themeMode === 'light');
    const wb = vscode.workspace.getConfiguration('workbench');
    const colors = { ...(wb.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
    const scope = cfg.themeMode === 'light' ? '[Gradient Nitro Glass Light]' : '[Gradient Nitro Glass]';
    colors[scope] = { ...colors[scope], 'gradientNitro.runtime': runtime.marker };
    const owned = JSON.parse(JSON.stringify(extensionContext.globalState.get<Record<string, OwnedScope>>('ownedColors') || {}));
    for (const key of ['terminal.background', 'minimap.background']) {
        if (owned[scope]) owned[scope].applied[key] = '#00000000';
        colors[scope][key] = '#00000000';
    }
    await extensionContext.globalState.update('ownedColors', owned);
    await wb.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
    if (changed) void vscode.window.showInformationMessage('Workbench effects installed. Reload Window once to enable live gradients, borders and radius.', 'Reload Window').then(choice => { if (choice === 'Reload Window') void vscode.commands.executeCommand('workbench.action.reloadWindow'); });
}
let pending: Promise<unknown> = Promise.resolve();
function enqueue(action: () => Promise<void>): Promise<void> {
    const next = pending.then(action);
    pending = next.catch(error => { vscode.window.showErrorMessage('Gradient Nitro: ' + String(error)); });
    return next;
}
export function activate(context: vscode.ExtensionContext) {
    extensionContext = context;
    nativeLayout = new NativeLayout(context.globalState);
    typography = new Typography(context.globalState);
    tokenSettings = new TokenSettings(context.globalState);
    fileColors = new FileColors();
    context.subscriptions.push(
        fileColors,
        vscode.window.registerFileDecorationProvider(fileColors),
        vscode.commands.registerCommand('gradientNitro.openCustomizer', () => ThemeCustomizerPanel.render(context.extensionUri)),
        vscode.commands.registerCommand('gradientNitro.resetDefaults', () => enqueue(resetToDefaultSettings)),
        vscode.commands.registerCommand('gradientNitro.cleanSettings', () => enqueue(resetToDefaultSettings)),
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('workbench.colorTheme')) void enqueue(syncNativeLayout).catch(() => {});
            if (event.affectsConfiguration('workbench.colorTheme') || event.affectsConfiguration('gradientNitro.fileColors')) fileColors.refresh();
        })
    );
    if (vscode.env?.appRoot && !context.globalState.get('legacyRecovered110')) {
        void enqueue(async () => {
            const changed = await removeLegacyWorkbenchStyles(vscode.env.appRoot, path.join(context.globalStorageUri.fsPath, 'legacy-backups'));
            await clearCustomCssFile();
            await cleanupLegacyRootCustomizations();
            await context.globalState.update('legacyRecovered110', true);
            if (changed) vscode.window.showInformationMessage('Removed legacy Nitro styles. Reload Window once to clear the previously loaded CSS.');
        }).catch(() => {});
    }
    void enqueue(syncNativeLayout).catch(() => {});
}
async function syncNativeLayout() {
    const theme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
    if (theme === 'Gradient Nitro Glass' || theme === 'Gradient Nitro Glass Light') {
        const cfg = getCurrentConfig();
        await nativeLayout.apply(cfg.roundedCorners, cfg.neonGlowIntensity > 0);
        if (vscode.workspace.getConfiguration('gradientNitro').inspect('fontFamily')?.globalValue !== undefined) await typography.apply(normalizeConfig(cfg));
        await syncEffects(normalizeConfig(cfg));
    } else { await runtime.stop(); await typography.restore(); await nativeLayout.restore(); }
}
export async function deactivate() { await pending; await runtime.stop(); await typography?.restore(); await nativeLayout?.restore(); }

export interface ColorStop {
    color: string;
    offset: number; // 0 to 100
}

export interface ThemeConfig {
    themeMode: 'dark' | 'light';
    accentColor: string;
    borderColor: string;
    borderWidth: number;
    borderEnabled: boolean;
    workbenchEffects: boolean;
    darkIntensity: number;
    lightIntensity: number;
    neonGlowIntensity: number;
    syntaxOverrides: LanguageOverrides;
    fileColors: boolean;
    colorStops: ColorStop[];
    leftColor: string;
    rightColor: string;
    roundedCorners: boolean;
    borderRadius: number;
    blurStrength: number;
    neonGlowSpread: number;
    glassOpacity: number;
    gradientAngle: number;
    gradientIntensity: number;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontLigatures: boolean;
    fontWeight: string;
}

class ThemeCustomizerPanel {
    public static currentPanel: ThemeCustomizerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(extensionUri: vscode.Uri) {
        if (ThemeCustomizerPanel.currentPanel) {
            ThemeCustomizerPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'gradientNitroCustomizer',
                'Gradient Nitro: Theme & Font Preview',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );
            ThemeCustomizerPanel.currentPanel = new ThemeCustomizerPanel(panel, extensionUri);
        }
    }

    public dispose() {
        ThemeCustomizerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                switch (message.command) {
                    case 'applyTheme':
                        try {
                            await enqueue(() => applyCustomTheme(message.config));
                            vscode.window.showInformationMessage('Gradient Nitro colors applied.');
                        } catch { /* Reported by the command queue. */ }
                        break;
                    case 'resetDefaults':
                        try {
                            await enqueue(resetToDefaultSettings);
                            webview.postMessage({ command: 'syncConfig', config: getDefaultConfig() });
                            vscode.window.showInformationMessage('Restored Default Dark Modern.');
                        } catch { /* Reported by the command queue. */ }
                        break;
                    case 'getConfig':
                        webview.postMessage({ command: 'syncConfig', config: getCurrentConfig() });
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const rawConfig = normalizeConfig(getCurrentConfig());
        const jsonConfig = JSON.stringify(rawConfig).replace(/</g, '\\u003c');
        const syntaxData = JSON.stringify({ roles: syntaxRoles, samples: syntaxSamples, palettes: Object.fromEntries(['dark', 'light'].map(mode => [mode, Object.fromEntries(['all', ...Object.keys(languageScopes)].map(language => [language, syntaxPalette(mode as 'dark' | 'light', language)]))])) }).replace(/</g, '\\u003c');
        const config = { ...rawConfig, fontFamily: rawConfig.fontFamily.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gradient Nitro Theme & Layout Studio</title>
    <style>
        .ui-icon { width: 18px; height: 18px; vertical-align: middle; flex-shrink: 0; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--vscode-focusBorder, #60a5fa); outline-offset: 3px; }
        .mock-code, .mock-code * { font-family: var(--font-fam); }
        .mock-code { color: #e2e8f0; overflow: auto; }
        .light-mode .mock-code { color: #172033; background: #f8fafc; }
        .light-mode .mock-code span { background: transparent !important; }
        @media (max-width: 640px) { .header, .form-row, .actions { flex-wrap: wrap; gap: 12px; } .slider-wrapper { width: 100%; } .mock-sidebar { display: none; } body { padding: 12px; } }

        :root {
            --blur: ${config.blurStrength}px;
            --spread: ${config.neonGlowSpread}px;
            --opacity: ${config.glassOpacity};
            --angle: ${config.gradientAngle}deg;
            --intensity: ${config.gradientIntensity};
            --radius: ${config.roundedCorners ? config.borderRadius : 0}px;
            --font-fam: ${rawConfig.fontFamily};
            --font-size: ${config.fontSize}px;
            --line-height: ${config.lineHeight}px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body {
            background: #0f1117;
            color: #d1d7e0;
            padding: 24px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 820px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .header {
            background: linear-gradient(135deg, rgba(40, 161, 47, 0.25), rgba(0, 210, 255, 0.2), rgba(160, 8, 185, 0.3));
            border: 1px solid rgba(160, 8, 185, 0.4);
            border-radius: 14px;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 6px 18px -8px rgba(0,0,0,0.20);
        }
        .title h1 { font-size: 22px; font-weight: 700; color: #ffffff; }
        .title p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
        
        /* Mode Switcher */
        .mode-toggle-group {
            display: flex;
            background: #1e2430;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 4px;
            gap: 4px;
        }
        .mode-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .mode-btn.active {
            background: linear-gradient(135deg, #10b981, #8b5cf6);
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .card {
            background: #161922;
            border: 1px solid #28303e;
            border-radius: 12px;
            padding: 20px;
        }
        .card h2 { font-size: 14px; font-weight: 600; color: #f1f5f9; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* Presets */
        .preset-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 10px;
        }
        .preset-btn {
            background: #20242e;
            border: 1px solid #333d4e;
            color: #e2e8f0;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }
        .preset-btn:hover { border-color: #00d2ff; transform: translateY(-2px); }
        .preset-swatch { width: 100%; height: 16px; border-radius: 4px; }
        
        /* Multi-Stop Gradient Bar Editor */
        .gradient-bar-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
        }
        .gradient-preview-bar {
            height: 38px;
            border-radius: 8px;
            border: 2px solid rgba(255,255,255,0.15);
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2);
            cursor: crosshair;
            position: relative;
        }
        .stops-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .stop-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1a1e28;
            border: 1px solid #2d3648;
            padding: 8px 12px;
            border-radius: 8px;
            gap: 12px;
        }
        .stop-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stop-badge {
            font-size: 11px;
            font-weight: 700;
            background: #283244;
            color: #94a3b8;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .stop-slider-wrap {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn-del-stop {
            background: #371b26;
            color: #f87171;
            border: 1px solid #542232;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-del-stop:hover:not(:disabled) { background: #e11d48; color: #fff; }
        .btn-del-stop:disabled { opacity: 0.3; cursor: not-allowed; }
        .btn-add-stop {
            background: #1e2838;
            border: 1px dashed #3b82f6;
            color: #60a5fa;
            padding: 9px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-top: 4px;
            transition: all 0.2s ease;
        }
        .btn-add-stop:hover { background: #253348; border-color: #60a5fa; }
        
        /* Direction selector */
        .direction-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
        }
        .dir-btn {
            background: #20242e;
            border: 1px solid #333d4e;
            color: #cbd5e1;
            padding: 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            transition: all 0.15s ease;
        }
        .dir-btn:hover, .dir-btn.active {
            border-color: #00d2ff;
            background: rgba(0, 210, 255, 0.15);
            color: #ffffff;
        }
        
        .form-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #222731;
        }
        .form-row:last-child { border-bottom: none; }
        .form-label { font-size: 14px; font-weight: 500; color: #cbd5e1; }
        .form-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
        .color-picker-wrapper { display: flex; align-items: center; gap: 8px; }
        input[type="color"] {
            -webkit-appearance: none;
            border: none;
            width: 34px;
            height: 34px;
            border-radius: 6px;
            cursor: pointer;
            background: transparent;
        }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: 2px solid rgba(255,255,255,0.25); border-radius: 6px; }
        .hex-input, .text-input, select {
            background: #111317;
            border: 1px solid #333d4e;
            color: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 13px;
        }
        .hex-input { width: 85px; font-family: monospace; }
        .text-input { width: 220px; font-family: monospace; }
        select { width: 180px; cursor: pointer; }
        
        .slider-wrapper { display: flex; align-items: center; gap: 12px; width: 240px; }
        input[type="range"] {
            flex: 1;
            accent-color: #00d2ff;
            cursor: pointer;
        }
        .slider-val { font-size: 13px; color: #cbd5e1; font-family: monospace; width: 50px; text-align: right; }
        
        /* Live Whole-Page Simulation Mockup */
        .page-mockup {
            background: linear-gradient(var(--angle), rgba(40, 161, 47, var(--intensity)) 0%, rgba(0, 210, 255, var(--intensity)) 40%, rgba(160, 8, 185, var(--intensity)) 100%);
            border: 1px solid #2d3748;
            border-radius: 12px;
            display: flex;
            height: 200px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transition: all 0.3s ease;
            padding: 8px;
            gap: 8px;
        }
        .page-mockup.light-mode {
            background: linear-gradient(var(--angle), rgba(40, 161, 47, calc(var(--intensity) * 1.5)) 0%, rgba(0, 210, 255, calc(var(--intensity) * 1.3)) 40%, rgba(160, 8, 185, calc(var(--intensity) * 1.5)) 100%);
            background-color: #f2faf6;
            border-color: #a7f3d0;
        }
        .mock-activity {
            width: 40px;
            background: rgba(15, 28, 19, 0.75);
            border-radius: var(--radius);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 10px;
            gap: 12px;
        }
        .light-mode .mock-activity { background: rgba(220, 252, 231, 0.85); }
        .mock-icon { width: 18px; height: 18px; background: #10b981; border-radius: 4px; opacity: 0.85; }
        .mock-sidebar {
            width: 130px;
            background: rgba(19, 32, 24, 0.65);
            border-radius: var(--radius);
            padding: 12px;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .light-mode .mock-sidebar { background: rgba(236, 253, 245, 0.70); border-color: rgba(255,255,255,0.6); }
        .mock-file { height: 9px; background: #334155; border-radius: 3px; margin-bottom: 8px; }
        .light-mode .mock-file { background: #94a3b8; }
        .mock-editor {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(24, 27, 34, 0.45);
            border-radius: var(--radius);
            border: 1px solid rgba(255,255,255,0.08);
            position: relative;
            overflow: hidden;
        }
        .light-mode .mock-editor { background: rgba(255, 255, 255, 0.35); color: #0f172a; border-color: rgba(255,255,255,0.7); }
        .mock-tabs {
            height: 28px;
            background: rgba(21, 27, 30, 0.5);
            display: flex;
            align-items: center;
            padding-left: 6px;
            gap: 4px;
        }
        .light-mode .mock-tabs { background: rgba(236, 253, 245, 0.4); }
        .mock-tab-item {
            background: rgba(30, 36, 48, 0.75);
            border-top: 2px solid #10b981;
            padding: 4px 10px;
            font-size: 11px;
            color: #f8fafc;
            border-radius: 4px 4px 0 0;
        }
        .light-mode .mock-tab-item { background: rgba(255, 255, 255, 0.85); color: #064e3b; border-top-color: #10b981; }
        .mock-code {
            padding: 12px;
            font-family: var(--font-fam);
            font-size: var(--font-size);
            line-height: var(--line-height);
        }
        .mock-tooltip {
            position: absolute;
            right: 12px;
            bottom: 12px;
            background: rgba(24, 22, 34, var(--opacity));
            backdrop-filter: blur(var(--blur)) saturate(180%);
            -webkit-backdrop-filter: blur(var(--blur)) saturate(180%);
            border: 1px solid #a855f7;
            border-radius: var(--radius);
            padding: 6px 10px;
            box-shadow: 0 10px var(--spread) 4px rgba(168, 85, 247, 0.45);
            font-size: 11px;
        }
        .light-mode .mock-tooltip {
            background: rgba(255, 255, 255, var(--opacity));
            color: #0f172a;
            border-color: #a855f7;
        }
        
        .actions {
            display: flex;
            gap: 12px;
            margin-top: 8px;
        }
        .btn {
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .btn-primary {
            flex: 2;
            background: linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6, #ec4899);
            color: #ffffff;
            box-shadow: 0 4px 12px -4px rgba(0, 130, 180, 0.18);
        }
        .btn-primary:hover { opacity: 0.92; transform: translateY(-2px); }
        .btn-secondary {
            flex: 1;
            background: #232833;
            color: #cbd5e1;
            border: 1px solid #3b4455;
        }
        .btn-secondary:hover { background: #2c3342; }
        .btn-primary { background: #0369a1; color: #ffffff; }
        .mode-btn.active { background: #075985; color: #ffffff; }
        .form-desc { color: #94a3b8; }
        .mock-editor { min-width: 0; }
        .mock-code { overflow: auto; }
        .mock-code * { font-family: inherit; }
        .syntax-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; margin-top: 16px; }
        .syntax-control { display: flex; gap: 10px; align-items: center; padding: 10px; background: #1a1e28; border: 1px solid #2d3648; border-radius: 8px; }
        .syntax-control label { font-size: 12px; text-transform: capitalize; }
        .studio-light .syntax-control { background: #f8fafc; border-color: #cbd5e1; }
        .page-mockup { height: 430px; box-shadow: none; padding: 10px; }
        .mock-sidebar { width: 160px; }
        .mock-file-label { display: block; padding: 6px 8px; font-size: 11px; border-radius: 5px; color: #a9b8cd; cursor: pointer; background: transparent; border: 0; width: 100%; text-align: left; }
        .mock-file-label.active { background: #22374b; color: #8bd5ff; }
        .light-mode .mock-file-label { color: #475569; }
        .light-mode .mock-file-label.active { color: #075f9c; background: #dcebf5; }
        .mock-section-title { font-size: 10px; letter-spacing: 1.4px; color: #96a6bb; margin: 4px 8px 12px; }
        .mock-code { flex: 1; margin: 0; white-space: pre; font-size: 12px; line-height: 1.7; background: #11151d; color: #d8e2ef; }
        .light-mode .mock-code { background: #f8fafc; color: #25364b; }
        .mock-tabs { height: 36px; flex-shrink: 0; padding: 5px; }
        .mock-tab-item { border-top-width: 1px; border-radius: 5px; }
        .mock-bottom { border-top: 1px solid #334155; padding: 10px 12px; min-height: 74px; font-size: 10px; color: #96a6bb; border-radius: 0 0 var(--radius) var(--radius); }
        .mock-bottom-nav { display: flex; gap: 12px; margin-bottom: 9px; }
        .mock-bottom-nav .selected { color: #8bd5ff; }
        .light-mode .mock-bottom-nav .selected { color: #075f9c; }
        .mock-tooltip { right: 16px; bottom: 88px; max-width: 170px; background: #19202c; box-shadow: 0 6px 16px -6px #00000070; }
        .light-mode .mock-tooltip { background: #ffffff; }
        .mock-activity .mock-icon { border-radius: 5px; }
        body.studio-light { background: #f1f5f9; color: #172033; }
        .studio-light .card, .studio-light .header { background: #ffffff; border-color: #cbd5e1; box-shadow: none; }
        .studio-light .card h2, .studio-light .title h1, .studio-light .form-label { color: #172033; }
        .studio-light .form-desc, .studio-light .title p, .studio-light .slider-val { color: #475569; }
        .studio-light .stop-row, .studio-light .preset-btn, .studio-light .dir-btn, .studio-light .mode-toggle-group,
        .studio-light .text-input, .studio-light .hex-input, .studio-light select, .studio-light .btn-secondary { background: #f8fafc; color: #172033; border-color: #cbd5e1; }
        .studio-light .mode-btn { color: #334155; }
        .studio-light .mode-btn.active { color: #ffffff; }
        @media (max-width: 640px) {
            .header, .form-row, .actions, .stop-row { flex-wrap: wrap; gap: 12px; }
            .container, .card { min-width: 0; }
            .slider-wrapper { width: 100%; }
            .form-row > div { max-width: 100%; flex-wrap: wrap; }
            .text-input, select { max-width: 100%; }
            .stop-slider-wrap { flex-basis: 100%; order: 3; min-width: 0; }
            .stop-slider-wrap input { min-width: 0; }
            .direction-grid { grid-template-columns: repeat(2, 1fr); }
            .mock-sidebar { display: none; }
            body { padding: 12px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">
                <h1>Gradient Nitro Glass</h1>
                <p>Color Studio &amp; Effects Preview</p>
            </div>
            <div class="mode-toggle-group">
                <button id="btnModeDark" class="mode-btn ${config.themeMode === 'dark' ? 'active' : ''}" onclick="setThemeMode('dark')"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/></svg> Dark Mode</button>
                <button id="btnModeLight" class="mode-btn ${config.themeMode === 'light' ? 'active' : ''}" onclick="setThemeMode('light')"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0"/></svg> Light Mode</button>
            </div>
        </div>

        <p class="form-desc">Apply updates colors and syntax. Enable live workbench effects for editor gradients, exact corner radius, border thickness and popup glow. First use requires one window reload.</p>
        <!-- Multi-Stop Gradient Palette Bar -->
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Multi-Stop Gradient Palette Bar</h2>
            <div class="gradient-bar-wrapper">
                <div class="gradient-preview-bar" id="gradientBar" onclick="onGradientBarClick(event)" title="Click anywhere on the bar to add a new color point!"></div>
                <div class="stops-container" id="stopsContainer"></div>
                <button class="btn-add-stop" onclick="addColorStop()"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 4v16M4 12h16"/></svg> Add Color Point</button>
            </div>
        </div>

        <!-- Presets -->
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Multi-Point Gradient Presets</h2>
            <div class="preset-grid">
                <button class="preset-btn" onclick="applyPresetStops([{color:'#28A12F',offset:0},{color:'#00D2FF',offset:35},{color:'#7C3AED',offset:70},{color:'#A008B9',offset:100}], 90, 0.28, 24, 35, 0.70, true, 12)">
                    <div class="preset-swatch" style="background: linear-gradient(90deg, #28A12F, #00D2FF, #7C3AED, #A008B9);"></div>
                    Spotify x Nitro (4-Point)
                </button>
                <button class="preset-btn" onclick="applyPresetStops([{color:'#00F0FF',offset:0},{color:'#3B82F6',offset:30},{color:'#A855F7',offset:65},{color:'#FF007F',offset:100}], 135, 0.30, 28, 40, 0.65, true, 14)">
                    <div class="preset-swatch" style="background: linear-gradient(135deg, #00F0FF, #3B82F6, #A855F7, #FF007F);"></div>
                    Cyberpunk Wave (4-Point)
                </button>
                <button class="preset-btn" onclick="applyPresetStops([{color:'#F59E0B',offset:0},{color:'#EF4444',offset:35},{color:'#EC4899',offset:70},{color:'#8B5CF6',offset:100}], 45, 0.28, 20, 30, 0.75, true, 12)">
                    <div class="preset-swatch" style="background: linear-gradient(45deg, #F59E0B, #EF4444, #EC4899, #8B5CF6);"></div>
                    Solar Sunset (4-Point)
                </button>
                <button class="preset-btn" onclick="applyPresetStops([{color:'#10B981',offset:0},{color:'#06B6D4',offset:50},{color:'#3B82F6',offset:100}], 135, 0.28, 24, 35, 0.70, true, 12)">
                    <div class="preset-swatch" style="background: linear-gradient(135deg, #10B981, #06B6D4, #3B82F6);"></div>
                    Emerald Ocean (3-Point)
                </button>
                <button class="preset-btn" onclick="applyPresetStops([{color:'#38BDF8',offset:0},{color:'#818CF8',offset:50},{color:'#C084FC',offset:100}], 180, 0.28, 24, 35, 0.68, true, 12)">
                    <div class="preset-swatch" style="background: linear-gradient(180deg, #38BDF8, #818CF8, #C084FC);"></div>
                    Glacier Aurora (3-Point)
                </button>
                <button class="preset-btn" onclick="applyPresetStops([{color:'#FB7185',offset:0},{color:'#EC4899',offset:50},{color:'#A855F7',offset:100}], 135, 0.28, 26, 38, 0.70, true, 12)">
                    <div class="preset-swatch" style="background: linear-gradient(135deg, #FB7185, #EC4899, #A855F7);"></div>
                    Sakura Dream (3-Point)
                </button>
            </div>
        </div>

        <!-- Rounded Corners & Modern Acrylic Layout -->
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Rounded Windows & Modern Floating Cards</h2>
            <div class="form-row">
                <div>
                    <div class="form-label">Rounded Window Sections</div>
                    <div class="form-desc">Floating acrylic cards with modern rounded corners</div>
                </div>
                <div>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#f1f5f9;cursor:pointer;">
                        <input type="checkbox" id="roundedCorners" ${config.roundedCorners ? 'checked' : ''} onchange="updateRadius()" style="accent-color:#00d2ff;width:18px;height:18px;"> Enable Rounded Cards
                    </label>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <div class="form-label">Preview Corner Radius</div>
                    <div class="form-desc">Corner radius for panels, tabs and controls with live effects enabled</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="borderRadius" min="0" max="24" value="${config.borderRadius}" oninput="updateRadius()">
                    <span id="radiusVal" class="slider-val">${config.borderRadius}px</span>
                </div>
            </div>
        </div>

        <!-- Gradient Direction & Intensity -->
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Palette Intensity &amp; Gradient Preview</h2>
            <div class="direction-grid">
                <button class="dir-btn" onclick="setAngle(90)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(0 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Left to Right (90°)</button>
                <button class="dir-btn" onclick="setAngle(135)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(45 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Diagonal Down (135°)</button>
                <button class="dir-btn" onclick="setAngle(180)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(90 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Top to Bottom (180°)</button>
                <button class="dir-btn" onclick="setAngle(45)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(-45 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Diagonal Up (45°)</button>
                <button class="dir-btn" onclick="setAngle(270)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(180 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Right to Left (270°)</button>
                <button class="dir-btn" onclick="setAngle(225)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(135 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Down-Left (225°)</button>
                <button class="dir-btn" onclick="setAngle(0)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(-90 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Bottom to Top (0°)</button>
                <button class="dir-btn" onclick="setAngle(315)"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path transform="rotate(225 12 12)" d="M4 12h16m-6-6 6 6-6 6"/></svg> Up-Left (315°)</button>
            </div>

            <div class="form-row">
                <div>
                    <div class="form-label">Custom Gradient Angle</div>
                    <div class="form-desc">Full 360-degree rotation across the window</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="gradientAngle" min="0" max="360" value="${config.gradientAngle}" oninput="updateAngle()">
                    <span id="angleVal" class="slider-val">${config.gradientAngle}°</span>
                </div>
            </div>

            <div class="form-row">
                <div>
                    <div class="form-label">Preset intensity (legacy)</div>
                    <div class="form-desc">Color tint strength across native editor and panel surfaces</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="gradientIntensity" min="0" max="60" value="${Math.round(config.gradientIntensity * 100)}" oninput="updateIntensity()">
                    <span id="intensityVal" class="slider-val">${Math.round(config.gradientIntensity * 100)}%</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Workbench effects</h2>
            <p>Live gradients, radius and borders across the editor and panels. First use installs a small workbench helper and requires Reload Window. Switching themes or stopping the extension removes the live styles.</p>
            <label><input type="checkbox" id="workbenchEffects" ${config.workbenchEffects ? 'checked' : ''}> Enable live workbench effects</label>
            <div class="form-row"><label for="darkIntensity">Dark color intensity</label><input type="range" id="darkIntensity" min="0" max="100" value="${config.darkIntensity * 100}" oninput="renderMockup()"><output id="darkIntensityVal"></output></div>
            <div class="form-row"><label for="lightIntensity">Light color intensity</label><input type="range" id="lightIntensity" min="0" max="100" value="${config.lightIntensity * 100}" oninput="renderMockup()"><output id="lightIntensityVal"></output></div>
            <label><input type="checkbox" id="borderEnabled" ${config.borderEnabled ? 'checked' : ''} onchange="renderMockup()"> Show borders (uncheck for borderless)</label>
        </div>
        <!-- Typography Studio -->
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Editor Typography</h2>
            <div class="form-row">
                <div>
                    <div class="form-label">Font Family</div>
                    <div class="form-desc">Choose from high-legibility coding fonts or enter custom</div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <select id="fontSelect" onchange="onFontSelectChange()">
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                        <option value="'Cascadia Code', Consolas, monospace">Cascadia Code</option>
                        <option value="'Geist Mono', monospace">Geist Mono</option>
                        <option value="'Hack', monospace">Hack</option>
                        <option value="'Victor Mono', monospace">Victor Mono</option>
                        <option value="custom">Custom Font...</option>
                    </select>
                    <input type="text" id="fontCustomInput" class="text-input" value="${config.fontFamily}" oninput="updateFont()">
                </div>
            </div>

            <div class="form-row">
                <div>
                    <div class="form-label">Font Size</div>
                    <div class="form-desc">Editor text size in pixels</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="fontSize" min="11" max="22" value="${config.fontSize}" oninput="updateFont()">
                    <span id="fontSizeVal" class="slider-val">${config.fontSize}px</span>
                </div>
            </div>

            <div class="form-row">
                <div>
                    <div class="form-label">Line Height</div>
                    <div class="form-desc">Vertical spacing between code lines</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="lineHeight" min="18" max="34" value="${config.lineHeight}" oninput="updateFont()">
                    <span id="lineHeightVal" class="slider-val">${config.lineHeight}px</span>
                </div>
            </div>

            <div class="form-row">
                <div>
                    <div class="form-label">Font Weight & Ligatures</div>
                    <div class="form-desc">Weight stroke and symbol ligatures (e.g. !=, =>, ===)</div>
                </div>
                <div style="display:flex;gap:14px;align-items:center;">
                    <select id="fontWeight" onchange="updateFont()" style="width:120px;">
                        <option value="300" ${config.fontWeight === '300' ? 'selected' : ''}>300 Light</option>
                        <option value="400" ${config.fontWeight === '400' ? 'selected' : ''}>400 Regular</option>
                        <option value="500" ${config.fontWeight === '500' ? 'selected' : ''}>500 Medium</option>
                        <option value="600" ${config.fontWeight === '600' ? 'selected' : ''}>600 SemiBold</option>
                    </select>
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#cbd5e1;cursor:pointer;">
                        <input type="checkbox" id="fontLigatures" ${config.fontLigatures ? 'checked' : ''} onchange="updateFont()" style="accent-color:#00d2ff;"> Enable Ligatures
                    </label>
                </div>
            </div>
        </div>

        <!-- Frozen Glass Controls -->
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Shadows &amp; Glass</h2>
            <div class="form-row"><label class="form-label" for="neonGlowIntensity">Shadow intensity</label><div class="slider-wrapper"><input type="range" id="neonGlowIntensity" min="0" max="40" value="${Math.round(config.neonGlowIntensity * 100)}" oninput="renderMockup()"><output id="glowIntensityVal" class="slider-val"></output></div></div>
            <div class="form-row">
                <div>
                    <div class="form-label">Glass Blur</div>
                    <div class="form-desc">Background glass blur intensity</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="blurStrength" min="8" max="40" value="${config.blurStrength}" oninput="updateSliders()">
                    <span id="blurVal" class="slider-val">${config.blurStrength}px</span>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <div class="form-label">Neon Spread</div>
                    <div class="form-desc">Glow aura radius around floating widgets</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="neonSpread" min="10" max="60" value="${config.neonGlowSpread}" oninput="updateSliders()">
                    <span id="spreadVal" class="slider-val">${config.neonGlowSpread}px</span>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <div class="form-label">Glass Opacity</div>
                    <div class="form-desc">Translucency of tooltips and popups</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="glassOpacity" min="50" max="95" value="${Math.round(config.glassOpacity * 100)}" oninput="updateSliders()">
                    <span id="opacityVal" class="slider-val">${Math.round(config.glassOpacity * 100)}%</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Accent &amp; Borders</h2>
            <div class="form-row"><label for="accentColor" class="form-label">Accent color</label><input type="color" id="accentColor" value="${config.accentColor}" oninput="renderMockup()"></div>
            <div class="form-row"><label for="borderColor" class="form-label">Border color</label><input type="color" id="borderColor" value="${config.borderColor}" oninput="renderMockup()"></div>
            <div class="form-row"><label for="borderWidth" class="form-label">Border thickness</label><div class="slider-wrapper"><input type="range" id="borderWidth" min="0" max="4" step="0.5" value="${config.borderWidth}" oninput="renderMockup()"><output id="borderWidthVal" class="slider-val"></output></div></div>
            <p class="form-desc">Text contrast is adjusted automatically for your selected mode and accent.</p>
            <button class="btn btn-secondary" onclick="surpriseMe()"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m4 4 16 16M4 20l6-6m4-4 6-6m-5 0h5v5m-5 11h5v-5"/></svg> Surprise me</button>
        </div>
        <!-- Live Whole-Page Simulation -->
        <div class="card" id="syntaxStudio">
            <h2>Language &amp; Syntax Colors</h2>
            <div class="form-row"><label for="syntaxLanguage" class="form-label">Language palette</label><select id="syntaxLanguage" onchange="renderSyntaxControls();renderMockup()">${['all', ...Object.keys(languageScopes)].map(language => '<option value="' + language + '"' + (language === 'typescript' ? ' selected' : '') + '>' + (language === 'all' ? 'All languages' : language) + '</option>').join('')}</select></div>
            <p class="form-desc">Set shared colors under All languages, then override individual languages. Colors are adjusted for readable contrast. Semantic colors depend on the installed language provider.</p>
            <div class="syntax-grid" id="syntaxControls"></div>
            <div class="form-row"><label for="fileColors" class="form-label">Color file labels in Explorer &amp; tabs</label><input type="checkbox" id="fileColors" ${config.fileColors ? 'checked' : ''}></div>
            <button class="btn btn-secondary" onclick="resetSyntaxLanguage()">Reset this language palette</button>
        </div>
        <div class="card">
            <h2><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg> Effects Preview</h2>
            <div class="page-mockup ${config.themeMode === 'light' ? 'light-mode' : ''}" id="mockup">
                <div class="mock-activity">
                    <div class="mock-icon" id="mockIcon1"></div>
                    <div class="mock-icon" id="mockIcon2"></div>
                </div>
                <div class="mock-sidebar">
                    <div class="mock-section-title">EXPLORER</div>
                    <button class="mock-file-label active" data-language="typescript" onclick="selectSample('typescript')">theme.ts</button>
                    <button class="mock-file-label" data-language="python" onclick="selectSample('python')">palette.py</button>
                    <button class="mock-file-label" data-language="dart" onclick="selectSample('dart')">theme.dart</button>
                    <button class="mock-file-label" data-language="markdown" onclick="selectSample('markdown')">README.md</button>
                    <button class="mock-file-label" data-language="dotenv" onclick="selectSample('dotenv')">.env.example</button>
                    <button class="mock-file-label" data-language="plaintext" onclick="selectSample('plaintext')">notes.txt</button>
                </div>
                <div class="mock-editor">
                    <div class="mock-tabs">
                        <div class="mock-tab-item" id="mockActiveTab">theme.ts</div><div class="mock-file-label" style="width:auto">README.md</div>
                    </div>
                    <pre class="mock-code" id="mockCode"></pre>
                    <div class="mock-bottom"><div class="mock-bottom-nav"><span class="selected">TERMINAL</span><span>OUTPUT</span><span>PROBLEMS</span></div><span>$ theme ready · all colors in balance</span></div>
                    <div class="mock-tooltip" id="mockTooltip">
                        <div style="font-weight:600;">Theme.name: string</div>
                        <div style="opacity:0.85;">A readable tooltip surface.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions">
            <button class="btn btn-primary" onclick="applyToVSCode()"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m4 12 5 5L20 6"/></svg> Apply Real-time Changes</button>
            <button class="btn btn-secondary" onclick="resetDefaults()"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg> Reset Defaults</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let initialConfig = ${jsonConfig};
        const syntaxData = ${syntaxData};
        let syntaxOverrides = JSON.parse(JSON.stringify(initialConfig.syntaxOverrides || {}));
        let currentMode = initialConfig.themeMode || 'dark';
        let currentStops = initialConfig.colorStops || [
            { color: '#28A12F', offset: 0 },
            { color: '#00D2FF', offset: 40 },
            { color: '#A008B9', offset: 100 }
        ];

        function init() {
            renderSyntaxControls();
            renderStopsList();
            setThemeMode(currentMode);
            renderMockup();
        }

        function setThemeMode(mode) {
            currentMode = mode;
            document.body.classList.toggle('studio-light', mode === 'light');
            document.getElementById('btnModeDark').classList.toggle('active', mode === 'dark');
            document.getElementById('btnModeLight').classList.toggle('active', mode === 'light');
            document.getElementById('mockup').classList.toggle('light-mode', mode === 'light');
            renderSyntaxControls();
            renderMockup();
        }

        function selectSample(language) {
            document.getElementById('syntaxLanguage').value = language;
            renderSyntaxControls(); renderMockup();
        }
        function resetSyntaxLanguage() {
            delete syntaxOverrides[document.getElementById('syntaxLanguage').value];
            renderSyntaxControls(); renderMockup();
        }
        function currentSyntaxPalette(language) {
            return Object.assign({}, syntaxData.palettes[currentMode][language] || syntaxData.palettes[currentMode].all, syntaxOverrides.all, syntaxOverrides[language]);
        }
        function renderSyntaxControls() {
            const language = document.getElementById('syntaxLanguage').value;
            const palette = currentSyntaxPalette(language);
            const root = document.getElementById('syntaxControls'); root.replaceChildren();
            syntaxData.roles.forEach(role => {
                const row = document.createElement('div'); row.className = 'syntax-control';
                const input = document.createElement('input'); input.type = 'color'; input.id = 'syntax-' + role; input.value = palette[role];
                const label = document.createElement('label'); label.htmlFor = input.id; label.textContent = role;
                input.addEventListener('input', () => { syntaxOverrides[language] = Object.assign({}, syntaxOverrides[language], { [role]: input.value }); renderMockup(); });
                row.append(input, label); root.append(row);
            });
        }
        function contrastText(color, background) {
            const rgb = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
            const luminance = hex => rgb(hex).map(v => v/255).map(v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4)).reduce((sum,v,i) => sum + v * [0.2126,0.7152,0.0722][i],0);
            const ratio = hex => { const a = luminance(hex), b = luminance(background); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); };
            if (ratio(color) >= 4.5) return color;
            const target = ratio('#000000') > ratio('#ffffff') ? 0 : 255;
            for (let i=1;i<=100;i++) { const c = '#' + rgb(color).map(v => Math.round(v*(1-i/100)+target*i/100).toString(16).padStart(2,'0')).join(''); if (ratio(c)>=4.5) return c; }
            return target ? '#ffffff' : '#000000';
        }
        function renderCodeSample() {
            const language = document.getElementById('syntaxLanguage').value;
            const sample = syntaxData.samples[language] || syntaxData.samples.typescript;
            const palette = currentSyntaxPalette(language);
            const code = document.getElementById('mockCode'); code.replaceChildren();
            sample.forEach(([role, text]) => {
                const span = document.createElement('span'); span.textContent = text;
                span.style.color = contrastText(palette[role] || palette.text, currentMode === 'light' ? '#f8fafc' : '#11151d');
                if (role === 'comment') span.style.fontStyle = 'italic';
                if (role === 'heading') span.style.fontWeight = '600';
                code.append(span);
            });
            document.querySelectorAll('.mock-file-label[data-language]').forEach(el => el.classList.toggle('active', el.dataset.language === language));
            const names = { typescript:'theme.ts', python:'palette.py', dart:'theme.dart', markdown:'README.md', dotenv:'.env.example', plaintext:'notes.txt' };
            document.getElementById('mockActiveTab').textContent = names[language] || 'Token palette sample';
        }
        function renderStopsList() {
            // Sort stops by offset
            currentStops.sort((a, b) => a.offset - b.offset);
            const container = document.getElementById('stopsContainer');
            container.innerHTML = '';

            currentStops.forEach((stop, index) => {
                const row = document.createElement('div');
                row.className = 'stop-row';
                row.innerHTML = \`
                    <div class="stop-left">
                        <span class="stop-badge">#\${index + 1}</span>
                        <div class="color-picker-wrapper">
                            <input aria-label="Color point \${index + 1}" type="color" value="\${stop.color}" onchange="updateStopColor(\${index}, this.value)">
                            <input aria-label="Hex color point \${index + 1}" type="text" class="hex-input" value="\${stop.color}" onchange="updateStopColor(\${index}, this.value)">
                        </div>
                    </div>
                    <div class="stop-slider-wrap">
                        <input type="range" min="0" max="100" value="\${stop.offset}" oninput="updateStopOffset(\${index}, this.value)">
                        <span class="slider-val" style="width:40px;">\${stop.offset}%</span>
                    </div>
                    <button class="btn-del-stop" onclick="deleteColorStop(\${index})" \${currentStops.length <= 2 ? 'disabled' : ''} aria-label="Remove color point" title="Remove point"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg></button>
                \`;
                container.appendChild(row);
            });

            // Update gradient bar preview
            const bar = document.getElementById('gradientBar');
            const cssGradient = \`linear-gradient(90deg, \${currentStops.map(s => \`\${s.color} \${s.offset}%\`).join(', ')})\`;
            bar.style.background = cssGradient;

            renderMockup();
        }

        function updateStopColor(index, color) {
            if (!/^#[0-9a-f]{6}$/i.test(color)) {
                renderStopsList();
                return;
            }
            currentStops[index].color = color;
            renderStopsList();
        }

        function updateStopOffset(index, offset) {
            currentStops[index].offset = parseInt(offset, 10);
            renderStopsList();
        }

        function deleteColorStop(index) {
            if (currentStops.length <= 2) return;
            currentStops.splice(index, 1);
            renderStopsList();
        }

        function addColorStop() {
            if (currentStops.length >= 6) {
                alert('Maximum 6 color points allowed.');
                return;
            }
            // Generate intermediate offset and bright color
            const last = currentStops[currentStops.length - 1];
            const prev = currentStops[currentStops.length - 2] || { offset: 0 };
            const newOffset = Math.round((last.offset + prev.offset) / 2);
            currentStops.push({ color: '#ec4899', offset: newOffset });
            renderStopsList();
        }

        function onGradientBarClick(event) {
            if (currentStops.length >= 6) return;
            const bar = document.getElementById('gradientBar');
            const rect = bar.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
            currentStops.push({ color: '#06b6d4', offset: percentage });
            renderStopsList();
        }

        function updateRadius() {
            const isRounded = document.getElementById('roundedCorners').checked;
            const rad = isRounded ? parseInt(document.getElementById('borderRadius').value, 10) : 0;
            document.getElementById('radiusVal').innerText = document.getElementById('borderRadius').value + 'px';
            document.documentElement.style.setProperty('--radius', rad + 'px');
            renderMockup();
        }

        function onFontSelectChange() {
            const select = document.getElementById('fontSelect');
            const custom = document.getElementById('fontCustomInput');
            if (select.value !== 'custom') {
                custom.value = select.value;
            }
            updateFont();
        }

        function updateFont() {
            const fam = document.getElementById('fontCustomInput').value;
            const size = document.getElementById('fontSize').value;
            const line = document.getElementById('lineHeight').value;
            
            document.getElementById('fontSizeVal').innerText = size + 'px';
            document.getElementById('lineHeightVal').innerText = line + 'px';
            
            document.documentElement.style.setProperty('--font-fam', fam);
            document.documentElement.style.setProperty('--font-size', size + 'px');
            document.documentElement.style.setProperty('--line-height', line + 'px');
            
            const mockCode = document.getElementById('mockCode');
            mockCode.style.fontFamily = fam;
            mockCode.style.fontSize = size + 'px';
            mockCode.style.lineHeight = line + 'px';
        }

        function setAngle(deg) {
            document.getElementById('gradientAngle').value = deg;
            updateAngle();
        }

        function updateAngle() {
            const deg = document.getElementById('gradientAngle').value;
            document.getElementById('angleVal').innerText = deg + '°';
            document.documentElement.style.setProperty('--angle', deg + 'deg');
            renderMockup();
        }

        function updateIntensity() {
            const intVal = document.getElementById('gradientIntensity').value;
            document.getElementById('intensityVal').innerText = intVal + '%';
            document.documentElement.style.setProperty('--intensity', intVal / 100);
            renderMockup();
        }

        function updateSliders() {
            const blur = document.getElementById('blurStrength').value;
            const spread = document.getElementById('neonSpread').value;
            const opacity = document.getElementById('glassOpacity').value;
            
            document.getElementById('blurVal').innerText = blur + 'px';
            document.getElementById('spreadVal').innerText = spread + 'px';
            document.getElementById('opacityVal').innerText = opacity + '%';
            
            document.documentElement.style.setProperty('--blur', blur + 'px');
            document.documentElement.style.setProperty('--spread', spread + 'px');
            document.documentElement.style.setProperty('--opacity', opacity / 100);
            renderMockup();
        }

        function hexToRgba(hex, alpha) {
            let clean = hex.replace('#', '');
            if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
            const num = parseInt(clean, 16);
            return \`rgba(\${(num >> 16) & 255}, \${(num >> 8) & 255}, \${num & 255}, \${alpha})\`;
        }

        function surpriseMe() {
            const hue = Math.floor(Math.random() * 360);
            function color(h) {
                const a = 0.65 * Math.min(0.5, 0.5);
                const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (0.5 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
                return '#' + f(0) + f(8) + f(4);
            }
            currentStops = [0, 45, 90].map((shift, i) => ({color: color((hue + shift) % 360), offset: i * 50}));
            document.getElementById('accentColor').value = color((hue + 180) % 360);
            document.getElementById('borderColor').value = color((hue + 90) % 360);
            document.getElementById('gradientIntensity').value = 15 + Math.floor(Math.random() * 25);
            document.getElementById('darkIntensity').value = 50 + Math.floor(Math.random() * 40);
            document.getElementById('lightIntensity').value = 40 + Math.floor(Math.random() * 40);
            document.getElementById('gradientAngle').value = Math.floor(Math.random() * 360);
            renderStopsList(); updateIntensity(); updateAngle();
        }
        function renderMockup() {
            renderCodeSample();
            const width = document.getElementById('borderEnabled').checked ? document.getElementById('borderWidth').value : 0;
            for (const mode of ['dark', 'light']) document.getElementById(mode + 'IntensityVal').textContent = document.getElementById(mode + 'Intensity').value + '%';
            const border = document.getElementById('borderColor').value;
            const accent = document.getElementById('accentColor').value;
            const glow = Number(document.getElementById('neonGlowIntensity').value) / 100;
            document.getElementById('glowIntensityVal').textContent = Math.round(glow * 100) + '%';
            const tooltip = document.getElementById('mockTooltip');
            const spread = Number(document.getElementById('neonSpread').value);
            tooltip.style.background = hexToRgba(currentMode === 'light' ? '#f5f2fa' : '#14101e', Number(document.getElementById('glassOpacity').value) / 100);
            tooltip.style.backdropFilter = 'blur(' + document.getElementById('blurStrength').value + 'px)';
            const alpha = glow * (currentMode === 'light' ? 0.65 : 1);
            tooltip.style.boxShadow = glow === 0 ? 'none' : '0 6px 16px -8px rgba(0,0,0,0.25), 0 0 ' + spread + 'px -4px ' + hexToRgba(accent, alpha);
            document.querySelectorAll('.mock-file-label, .mock-tab-item, .mock-icon').forEach(el => { el.style.borderRadius = document.getElementById('roundedCorners').checked ? '5px' : '0'; });
            document.getElementById('borderWidthVal').textContent = width + 'px';
            document.querySelectorAll('.mock-editor, .mock-sidebar, .mock-tooltip').forEach(el => { el.style.border = width + 'px solid ' + border; });
            document.querySelector('.mock-tab-item').style.borderTopColor = accent;

            const deg = document.getElementById('gradientAngle').value;
            const intensity = document.getElementById(currentMode + 'Intensity').value / 100;
            const isLight = currentMode === 'light';
            
            const mock = document.getElementById('mockup');
            const stopsString = currentStops.map(s => {
                const alpha = intensity * 0.65;
                return \`\${hexToRgba(s.color, alpha)} \${s.offset}%\`;
            }).join(', ');

            mock.style.background = \`linear-gradient(\${deg}deg, \${stopsString})\`;
            mock.style.backgroundColor = isLight ? '#f2faf6' : '#101216';

            if (currentStops.length > 0) {
                document.getElementById('mockIcon1').style.background = currentStops[0].color;
                document.getElementById('mockIcon2').style.background = currentStops[currentStops.length - 1].color;
                document.getElementById('mockTooltip').style.borderColor = border;
            }
        }

        function applyPresetStops(stops, angle, intensity, blur, spread, opacity, rounded, radius) {
            currentStops = JSON.parse(JSON.stringify(stops));
            document.getElementById('gradientAngle').value = angle;
            document.getElementById('gradientIntensity').value = Math.round(intensity * 100);
            document.getElementById('blurStrength').value = blur;
            document.getElementById('neonSpread').value = spread;
            document.getElementById('glassOpacity').value = Math.round(opacity * 100);
            document.getElementById('roundedCorners').checked = rounded;
            document.getElementById('borderRadius').value = radius;
            
            renderStopsList();
            updateAngle();
            updateIntensity();
            updateSliders();
            updateRadius();
        }

        function applyToVSCode() {
            currentStops.sort((a, b) => a.offset - b.offset);
            const config = {
                themeMode: currentMode,
                neonGlowIntensity: Number(document.getElementById('neonGlowIntensity').value) / 100,
                syntaxOverrides,
                fileColors: document.getElementById('fileColors').checked,
                accentColor: document.getElementById('accentColor').value,
                borderColor: document.getElementById('borderColor').value,
                borderWidth: Number(document.getElementById('borderWidth').value),
                borderEnabled: document.getElementById('borderEnabled').checked,
                workbenchEffects: document.getElementById('workbenchEffects').checked,
                darkIntensity: Number(document.getElementById('darkIntensity').value) / 100,
                lightIntensity: Number(document.getElementById('lightIntensity').value) / 100,
                colorStops: currentStops,
                leftColor: currentStops[0].color,
                rightColor: currentStops[currentStops.length - 1].color,
                roundedCorners: document.getElementById('roundedCorners').checked,
                borderRadius: parseInt(document.getElementById('borderRadius').value, 10),
                gradientAngle: parseInt(document.getElementById('gradientAngle').value, 10),
                gradientIntensity: parseInt(document.getElementById('gradientIntensity').value, 10) / 100,
                blurStrength: parseInt(document.getElementById('blurStrength').value, 10),
                neonGlowSpread: parseInt(document.getElementById('neonSpread').value, 10),
                glassOpacity: parseInt(document.getElementById('glassOpacity').value, 10) / 100,
                fontFamily: document.getElementById('fontCustomInput').value,
                fontSize: parseInt(document.getElementById('fontSize').value, 10),
                lineHeight: parseInt(document.getElementById('lineHeight').value, 10),
                fontLigatures: document.getElementById('fontLigatures').checked,
                fontWeight: document.getElementById('fontWeight').value
            };
            vscode.postMessage({ command: 'applyTheme', config });
        }

        function resetDefaults() {
            vscode.postMessage({ command: 'resetDefaults' });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'syncConfig') {
                syntaxOverrides = JSON.parse(JSON.stringify(message.config.syntaxOverrides || {}));
                document.getElementById('neonGlowIntensity').value = Math.round((message.config.neonGlowIntensity ?? 0.18) * 100);
                document.getElementById('fileColors').checked = message.config.fileColors !== false;
                document.getElementById('accentColor').value = message.config.accentColor;
                document.getElementById('borderColor').value = message.config.borderColor;
                document.getElementById('borderWidth').value = message.config.borderWidth;
                document.getElementById('borderEnabled').checked = message.config.borderEnabled;
                document.getElementById('workbenchEffects').checked = message.config.workbenchEffects;
                document.getElementById('darkIntensity').value = message.config.darkIntensity * 100;
                document.getElementById('lightIntensity').value = message.config.lightIntensity * 100;
                setThemeMode(message.config.themeMode || 'dark');
                applyPresetStops(
                    message.config.colorStops || [{color: '#28A12F', offset: 0}, {color: '#A008B9', offset: 100}],
                    message.config.gradientAngle ?? 90,
                    message.config.gradientIntensity ?? 0.28,
                    message.config.blurStrength ?? 24,
                    message.config.neonGlowSpread ?? 35,
                    message.config.glassOpacity ?? 0.70,
                    message.config.roundedCorners !== false,
                    message.config.borderRadius ?? 12
                );
                document.getElementById('fontCustomInput').value = message.config.fontFamily;
                document.getElementById('fontSize').value = message.config.fontSize;
                document.getElementById('lineHeight').value = message.config.lineHeight;
                document.getElementById('fontLigatures').checked = message.config.fontLigatures;
                document.getElementById('fontWeight').value = message.config.fontWeight;
                updateFont();
            }
        });

        init();
    </script>
</body>
</html>`;
    }
}

export function getCurrentConfig(): ThemeConfig {
    const nitroConfig = vscode.workspace.getConfiguration('gradientNitro');
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const savedFont = <T>(key: string, fallback: T): T => nitroConfig.inspect(key)?.globalValue !== undefined ? nitroConfig.get<T>(key, fallback) : fallback;
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const activeTheme = workbenchConfig.get<string>('colorTheme', 'Gradient Nitro Glass');
    const isLight = activeTheme.includes('Light');

    let stops = nitroConfig.get<ColorStop[]>('colorStops');
    const leftColor = nitroConfig.get<string>('leftColor', isLight ? '#10b981' : '#28A12F');
    const rightColor = nitroConfig.get<string>('rightColor', isLight ? '#a855f7' : '#A008B9');

    if (!stops || !Array.isArray(stops) || stops.length < 2) {
        stops = [
            { color: leftColor, offset: 0 },
            { color: blendColor(leftColor, rightColor, 0.5), offset: 50 },
            { color: rightColor, offset: 100 }
        ];
    }

    return {
        themeMode: isLight ? 'light' : 'dark',
        accentColor: nitroConfig.get<string>('accentColor', '#00D2FF'),
        borderColor: nitroConfig.get<string>('borderColor', '#64748B'),
        borderWidth: nitroConfig.get<number>('borderWidth', 1),
        borderEnabled: nitroConfig.get<boolean>('borderEnabled', true),
        workbenchEffects: nitroConfig.get<boolean>('workbenchEffects', true),
        darkIntensity: nitroConfig.get<number>('darkIntensity', 0.65),
        lightIntensity: nitroConfig.get<number>('lightIntensity', 0.55),
        neonGlowIntensity: nitroConfig.get<number>('neonGlowIntensity', 0.18),
        syntaxOverrides: normalizeSyntaxOverrides(nitroConfig.get('syntaxOverrides', {})),
        fileColors: nitroConfig.get<boolean>('fileColors', true),
        colorStops: stops,
        leftColor: stops[0]?.color || leftColor,
        rightColor: stops[stops.length - 1]?.color || rightColor,
        roundedCorners: nitroConfig.get<boolean>('roundedCorners', true),
        borderRadius: nitroConfig.get<number>('borderRadius', 12),
        blurStrength: nitroConfig.get<number>('blurStrength', 24),
        neonGlowSpread: nitroConfig.get<number>('neonGlowSpread', 35),
        glassOpacity: nitroConfig.get<number>('glassOpacity', 0.70),
        gradientAngle: nitroConfig.get<number>('gradientAngle', 90),
        gradientIntensity: nitroConfig.get<number>('gradientIntensity', 0.28),
        fontFamily: savedFont('fontFamily', editorConfig.get<string>('fontFamily', "'JetBrains Mono', 'Fira Code', Consolas, monospace")),
        fontSize: savedFont('fontSize', editorConfig.get<number>('fontSize', 14)),
        lineHeight: savedFont('lineHeight', editorConfig.get<number>('lineHeight', 23)),
        fontLigatures: savedFont('fontLigatures', editorConfig.get<boolean>('fontLigatures', true)),
        fontWeight: savedFont('fontWeight', editorConfig.get<string>('fontWeight', '400'))
    };
}

export function getDefaultConfig(): ThemeConfig {
    return {
        themeMode: 'dark',
        accentColor: '#00D2FF',
        borderColor: '#64748B',
        borderWidth: 1,
        borderEnabled: true,
        workbenchEffects: true,
        darkIntensity: 0.65,
        lightIntensity: 0.55,
        neonGlowIntensity: 0.18,
        syntaxOverrides: {},
        fileColors: true,
        colorStops: [
            { color: '#28A12F', offset: 0 },
            { color: '#00D2FF', offset: 40 },
            { color: '#A008B9', offset: 100 }
        ],
        leftColor: '#28A12F',
        rightColor: '#A008B9',
        roundedCorners: true,
        borderRadius: 12,
        blurStrength: 24,
        neonGlowSpread: 35,
        glassOpacity: 0.70,
        gradientAngle: 90,
        gradientIntensity: 0.28,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontSize: 14,
        lineHeight: 23,
        fontLigatures: true,
        fontWeight: '400'
    };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

export function blendColor(hex: string, baseHex: string, ratio: number): string {
    const c1 = hexToRgb(hex);
    const c2 = hexToRgb(baseHex);
    const r = Math.round(c1.r * ratio + c2.r * (1 - ratio));
    const g = Math.round(c1.g * ratio + c2.g * (1 - ratio));
    const b = Math.round(c1.b * ratio + c2.b * (1 - ratio));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function normalizeConfig(input: Partial<ThemeConfig>): ThemeConfig {
    const defaults = getDefaultConfig();
    const cfg = { ...defaults, ...input };
    const hex = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
    const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    cfg.themeMode = cfg.themeMode === 'light' ? 'light' : 'dark';
    cfg.colorStops = Array.isArray(cfg.colorStops) && cfg.colorStops.length >= 2 ? cfg.colorStops.slice(0, 6).map((stop, i) => ({ color: hex(stop?.color, defaults.colorStops[i % 3].color), offset: number(stop?.offset, i ? 100 : 0, 0, 100) })).sort((a, b) => a.offset - b.offset) : defaults.colorStops;
    cfg.leftColor = cfg.colorStops[0].color;
    cfg.rightColor = cfg.colorStops[cfg.colorStops.length - 1].color;
    cfg.accentColor = hex(cfg.accentColor, defaults.accentColor);
    cfg.borderColor = hex(cfg.borderColor, defaults.borderColor);
    cfg.borderWidth = number(cfg.borderWidth, 1, 0, 4);
    cfg.borderEnabled = cfg.borderEnabled !== false;
    cfg.workbenchEffects = cfg.workbenchEffects !== false;
    cfg.darkIntensity = number(cfg.darkIntensity, 0.65, 0, 1);
    cfg.lightIntensity = number(cfg.lightIntensity, 0.55, 0, 1);
    cfg.neonGlowIntensity = number(cfg.neonGlowIntensity, 0.18, 0, 0.4);
    cfg.syntaxOverrides = normalizeSyntaxOverrides(cfg.syntaxOverrides);
    cfg.fileColors = cfg.fileColors !== false;
    cfg.gradientIntensity = number(cfg.gradientIntensity, 0.28, 0, 0.6);
    cfg.gradientAngle = number(cfg.gradientAngle, 90, 0, 360);
    cfg.borderRadius = number(cfg.borderRadius, 12, 0, 24);
    cfg.blurStrength = number(cfg.blurStrength, 24, 0, 40);
    cfg.neonGlowSpread = number(cfg.neonGlowSpread, 35, 0, 60);
    cfg.glassOpacity = number(cfg.glassOpacity, 0.7, 0.5, 1);
    cfg.fontSize = number(cfg.fontSize, 14, 8, 40);
    cfg.lineHeight = number(cfg.lineHeight, 23, 0, 60);
    cfg.fontFamily = typeof cfg.fontFamily === 'string' && /^[\w\s,'".\-]+$/.test(cfg.fontFamily) ? cfg.fontFamily.slice(0, 200) : defaults.fontFamily;
    cfg.fontWeight = typeof cfg.fontWeight === 'string' && /^(normal|bold|[1-9]00)$/.test(cfg.fontWeight) ? cfg.fontWeight : '400';
    cfg.roundedCorners = cfg.roundedCorners === true;
    cfg.fontLigatures = cfg.fontLigatures === true;
    return cfg;
}

export function buildColors(input: ThemeConfig): Record<string, string> {
    const cfg = normalizeConfig(input);
    const light = cfg.themeMode === 'light';
    const surfaces = gradientSurfaces(cfg).map(stop => stop.color);
    const left = surfaces[0], right = surfaces[surfaces.length - 1];
    const editor = surfaces[Math.floor(surfaces.length / 2)];
    const foreground = readableAcross(light ? '#172033' : '#f1f5f9', surfaces);
    const muted = readableAcross(light ? '#475569' : '#94a3b8', surfaces);
    const accent = readableAcross(cfg.accentColor, surfaces);
    const border = !cfg.borderEnabled || cfg.borderWidth === 0 ? '#00000000' : cfg.borderColor;
    const colors: Record<string, string> = {};
    for (const key of ['editor.background', 'editorGutter.background', 'editorGroup.emptyBackground', 'terminal.background', 'minimap.background', 'editorStickyScroll.background', 'editorHoverWidget.background', 'editorWidget.background', 'editorSuggestWidget.background', 'peekViewEditor.background', 'peekViewResult.background', 'input.background', 'dropdown.background', 'quickInput.background', 'menu.background', 'notifications.background']) colors[key] = editor;
    for (const key of ['sideBar.background', 'activityBar.background', 'statusBar.background', 'statusBar.noFolderBackground', 'titleBar.activeBackground', 'titleBar.inactiveBackground']) colors[key] = left;
    for (const key of ['panel.background', 'editorGroupHeader.tabsBackground', 'editorGroupHeader.noTabsBackground', 'tab.inactiveBackground', 'tab.unfocusedInactiveBackground', 'breadcrumb.background', 'sideBarSectionHeader.background']) colors[key] = right;
    for (const key of ['foreground', 'editor.foreground', 'terminal.foreground', 'sideBar.foreground', 'sideBarTitle.foreground', 'sideBarSectionHeader.foreground', 'activityBar.foreground', 'statusBar.foreground', 'titleBar.activeForeground', 'tab.activeForeground', 'tab.unfocusedActiveForeground', 'panelTitle.activeForeground', 'breadcrumb.foreground', 'editorHoverWidget.foreground', 'editorSuggestWidget.foreground', 'input.foreground', 'dropdown.foreground', 'quickInput.foreground', 'menu.foreground', 'notifications.foreground', 'peekViewResult.fileForeground', 'peekViewResult.lineForeground', 'list.activeSelectionForeground', 'list.inactiveSelectionForeground']) colors[key] = foreground;
    for (const key of ['descriptionForeground', 'editorLineNumber.foreground', 'tab.inactiveForeground', 'tab.unfocusedInactiveForeground', 'titleBar.inactiveForeground', 'activityBar.inactiveForeground', 'panelTitle.inactiveForeground']) colors[key] = muted;
    for (const key of ['focusBorder', 'editorCursor.foreground', 'editorLineNumber.activeForeground', 'tab.activeBorderTop', 'activityBar.activeBorder', 'panelTitle.activeBorder', 'progressBar.background', 'textLink.foreground', 'textLink.activeForeground', 'list.highlightForeground', 'editorSuggestWidget.highlightForeground']) colors[key] = accent;
    for (const key of ['sideBar.border', 'activityBar.border', 'panel.border', 'editorGroup.border', 'tab.border', 'statusBar.border', 'titleBar.border', 'editorHoverWidget.border', 'editorWidget.border', 'editorSuggestWidget.border', 'input.border', 'dropdown.border', 'menu.border', 'notifications.border', 'peekView.border']) colors[key] = border;
    for (const key of ['button', 'badge', 'activityBarBadge']) { colors[key + '.background'] = cfg.accentColor; colors[key + '.foreground'] = onColor(cfg.accentColor); }
    colors['button.hoverBackground'] = blend(cfg.accentColor, onColor(cfg.accentColor) === '#000000' ? '#ffffff' : '#000000', 0.9);
    colors['statusBar.debuggingBackground'] = cfg.accentColor;
    colors['statusBar.debuggingForeground'] = onColor(cfg.accentColor);
    colors['statusBarItem.remoteBackground'] = cfg.accentColor;
    colors['statusBarItem.remoteForeground'] = onColor(cfg.accentColor);
    colors['tab.activeBackground'] = editor;
    colors['activityBar.foreground'] = accent;
    colors['activityBar.inactiveForeground'] = readableAcross(blend(cfg.accentColor, cfg.rightColor, 0.5), surfaces, 3);
    colors['tab.unfocusedActiveBackground'] = editor;
    const alpha = Math.round(cfg.neonGlowIntensity * (light ? 0.65 : 1) * 255).toString(16).padStart(2, '0');
    colors['widget.shadow'] = cfg.accentColor + alpha;
    colors['scrollbar.shadow'] = '#00000000';
    colors['editorStickyScroll.shadow'] = '#00000000';
    colors['listFilterWidget.shadow'] = cfg.accentColor + alpha;
    colors['widget.border'] = border;
    colors['tab.hoverBackground'] = blend(accent, editor, 0.10);
    colors['tab.unfocusedHoverBackground'] = blend(accent, editor, 0.06);
    colors['tab.selectedBackground'] = blend(accent, editor, 0.10);
    colors['tab.activeBorder'] = '#00000000';
    colors['list.hoverBackground'] = blend(accent, left, 0.08);
    colors['list.focusBackground'] = blend(accent, left, 0.14);
    colors['list.focusForeground'] = foreground;
    colors['list.focusOutline'] = accent;
    colors['toolbar.hoverBackground'] = blend(accent, editor, 0.10);
    colors['toolbar.activeBackground'] = blend(accent, editor, 0.16);
    for (const [family, data] of Object.entries(fileFamilies)) colors['gradientNitro.file.' + family] = readable(light ? data.light : data.dark, left);
    for (const key of ['editor.selectionBackground', 'editor.inactiveSelectionBackground', 'editorSuggestWidget.selectedBackground', 'list.activeSelectionBackground', 'list.inactiveSelectionBackground']) colors[key] = blend(accent, editor, 0.18);
    return colors;
}

type OwnedScope = { before: Record<string, unknown>; applied: Record<string, string> };
export async function applyCustomTheme(input: ThemeConfig) {
    const cfg = normalizeConfig(input);
    await cleanupLegacyRootCustomizations();
    const nitro = vscode.workspace.getConfiguration('gradientNitro');
    for (const key of fontKeys) await nitro.update(key, cfg[key], vscode.ConfigurationTarget.Global);
    await typography.apply(cfg);
    for (const key of ['colorStops', 'roundedCorners', 'borderRadius', 'leftColor', 'rightColor', 'blurStrength', 'neonGlowSpread', 'glassOpacity', 'gradientAngle', 'gradientIntensity', 'accentColor', 'borderColor', 'borderWidth', 'borderEnabled', 'workbenchEffects', 'darkIntensity', 'lightIntensity', 'neonGlowIntensity', 'syntaxOverrides', 'fileColors'] as const) await nitro.update(key, cfg[key], vscode.ConfigurationTarget.Global);
    const name = cfg.themeMode === 'light' ? 'Gradient Nitro Glass Light' : 'Gradient Nitro Glass';
    const workbench = vscode.workspace.getConfiguration('workbench');
    const colors = { ...(workbench.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
    const scope = '[' + name + ']';
    const applied = buildColors(cfg);
    const owned = { ...(extensionContext.globalState.get<Record<string, OwnedScope>>('ownedColors') || {}) };
    const before = { ...(owned[scope]?.before || {}) };
    for (const key of Object.keys(applied)) {
        if (!owned[scope] || colors[scope]?.[key] !== owned[scope].applied[key]) before[key] = colors[scope]?.[key] ?? null;
    }
    owned[scope] = { before, applied };
    // Persist recovery information before modifying the user's settings.
    await extensionContext.globalState.update('ownedColors', owned);
    colors[scope] = { ...colors[scope], ...applied };
    await workbench.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
    await tokenSettings.apply(cfg.themeMode, cfg.syntaxOverrides, gradientSurfaces(cfg).map(stop => stop.color));
    await workbench.update('colorTheme', name, vscode.ConfigurationTarget.Global);
    await nativeLayout.apply(cfg.roundedCorners, cfg.neonGlowIntensity > 0);
    await syncEffects(cfg);
    fileColors.refresh();
    if (!nativeLayout.available && cfg.roundedCorners) vscode.window.showInformationMessage('Native rounded layout requires a VS Code version with workbench.experimental.modernUI. Your theme colors have been applied.');
}

export async function resetToDefaultSettings() {
    await runtime.stop();
    await typography.restore();
    if (vscode.env?.appRoot) await installRuntime(vscode.env.appRoot, extensionContext.extensionUri.fsPath, path.join(extensionContext.globalStorageUri.fsPath, 'runtime-backups'), false);
    await nativeLayout.restore();
    await tokenSettings.restore();
    if (vscode.env?.appRoot) await removeLegacyWorkbenchStyles(vscode.env.appRoot, path.join(extensionContext.globalStorageUri.fsPath, 'legacy-backups'));
    await clearCustomCssFile();
    await cleanupLegacyRootCustomizations();
    const workbench = vscode.workspace.getConfiguration('workbench');
    const colors = { ...(workbench.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
    const owned = extensionContext.globalState.get<Record<string, OwnedScope>>('ownedColors') || {};
    for (const [scope, state] of Object.entries(owned)) {
        if (!colors[scope]) continue;
        colors[scope] = { ...colors[scope] };
        delete colors[scope]['gradientNitro.runtime'];
        for (const [key, value] of Object.entries(state.applied)) {
            if (colors[scope][key] !== value) continue;
            if (state.before[key] == null) delete colors[scope][key];
            else colors[scope][key] = state.before[key];
        }
        if (!Object.keys(colors[scope]).length) delete colors[scope];
    }
    await workbench.update('colorCustomizations', Object.keys(colors).length ? colors : undefined, vscode.ConfigurationTarget.Global);
    await extensionContext.globalState.update('ownedColors', undefined);
    const nitro = vscode.workspace.getConfiguration('gradientNitro');
    for (const key of Object.keys(getDefaultConfig())) if (nitro.inspect(key)?.globalValue !== undefined) await nitro.update(key, undefined, vscode.ConfigurationTarget.Global);
    await workbench.update('colorTheme', 'Default Dark Modern', vscode.ConfigurationTarget.Global);
}
