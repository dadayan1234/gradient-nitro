
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
import { paletteDefaults, normalizePalette, workbenchColors } from './palette';
import { ThemeConfig, ColorStop, getDefaultConfig, normalizeConfig } from './config';
export { ThemeConfig, ColorStop, getDefaultConfig, normalizeConfig } from './config';
import { customizerHtml } from './customizer';
import { exportPreset, importPreset } from './preset';
import { NitroActivityView } from './activityView';
import { WorkbenchPreview } from './workbenchPreview';
import { syncWorkbenchRuntime, revertWorkbenchRuntime, suspendWorkbenchRuntime } from './workbenchRuntime';


import { NativeLayout } from './layout';
import { Typography, fontKeys } from './typography';
import { TokenSettings } from './tokenSettings';
import { FileColors, fileFamilies } from './files';
import { buildSyntax, LanguageOverrides, normalizeSyntaxOverrides } from './syntax';

let extensionContext: vscode.ExtensionContext;
let nativeLayout: NativeLayout;
let typography: Typography;
let tokenSettings: TokenSettings;
let fileColors: FileColors;
let workbenchPreview: WorkbenchPreview;
let activityView: NitroActivityView;
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
    workbenchPreview = new WorkbenchPreview(context.globalState);
    activityView = new NitroActivityView(getCurrentConfig, () => !!context.globalState.get<{active:boolean}>('workbenchRuntimeJournal')?.active);
    context.subscriptions.push(
        activityView,
        vscode.window.registerTreeDataProvider('gradientNitro.studioView', activityView),
        vscode.commands.registerCommand('gradientNitro.applySaved', () => enqueue(() => applyCustomTheme(getCurrentConfig()))),
        vscode.commands.registerCommand('gradientNitro.saveAndApply', () => ThemeCustomizerPanel.saveAndApply()),
        vscode.commands.registerCommand('gradientNitro.previewSaved', () => enqueue(() => applyWorkbenchPreview(getCurrentConfig()))),
        vscode.commands.registerCommand('gradientNitro.revertPreview', () => enqueue(revertWorkbenchPreview)),
        fileColors,
        vscode.window.registerFileDecorationProvider(fileColors),
        vscode.commands.registerCommand('gradientNitro.openCustomizer', () => ThemeCustomizerPanel.render(context.extensionUri)),
        vscode.commands.registerCommand('gradientNitro.resetDefaults', () => enqueue(resetToDefaultSettings)),
        vscode.commands.registerCommand('gradientNitro.cleanSettings', () => enqueue(resetToDefaultSettings)),
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('gradientNitro')) activityView.refresh();
            if (event.affectsConfiguration('workbench.colorTheme')) void enqueue(syncNativeLayout).catch(() => {});
            if (event.affectsConfiguration('workbench.colorTheme') || event.affectsConfiguration('gradientNitro.fileColors')) fileColors.refresh();
        })
    );
    void enqueue(async () => { await workbenchPreview.revert(); await syncNativeLayout(); }).catch(() => {});
}
async function syncNativeLayout() {
    const theme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
    if (theme === 'Gradient Nitro Glass' || theme === 'Gradient Nitro Glass Light') {
        const cfg = getCurrentConfig();
        await nativeLayout.apply(cfg.nativeModernUI, cfg.neonGlowIntensity > 0);
        if (vscode.workspace.getConfiguration('gradientNitro').inspect('fontFamily')?.globalValue !== undefined) await typography.apply(normalizeConfig(cfg));
        if (cfg.workbenchEffects) await syncWorkbenchRuntime(extensionContext, normalizeConfig(cfg));
        else await revertWorkbenchRuntime(extensionContext);
    } else {
        await revertWorkbenchRuntime(extensionContext);
        await typography.restore();
        await nativeLayout.restore();
    }
}
export async function deactivate() {
    await pending;
    if (getCurrentConfig().workbenchEffects) await suspendWorkbenchRuntime();
    else await revertWorkbenchRuntime(extensionContext);
    await workbenchPreview?.revert();
    await typography?.restore();
    await nativeLayout?.restore();
}

class ThemeCustomizerPanel {
    public static async saveAndApply() {
        if (this.currentPanel) {
            await this.currentPanel._panel.webview.postMessage({ command: 'saveAndApply' });
        } else {
            await enqueue(() => applyCustomTheme(getCurrentConfig()));
        }
    }
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
        void enqueue(revertWorkbenchPreview).catch(() => {});
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
                if (!message || typeof message.command !== 'string') return;
                switch (message.command) {
                    case 'applyTheme':
                        try {
                            await enqueue(() => applyCustomTheme(message.config));
                            webview.postMessage({ command: 'actionResult', action: message.command, ok: true, text: 'Theme saved and applied.', previewActive: false });
                        } catch { webview.postMessage({ command: 'actionResult', ok: false, text: 'Save failed. See the VS Code notification.' }); }
                        break;
                    case 'previewWorkbench':
                    case 'revertPreview':
                        try {
                            await enqueue(() => message.command === 'previewWorkbench' ? applyWorkbenchPreview(message.config) : revertWorkbenchPreview());
                            webview.postMessage({ command: 'actionResult', ok: true, text: message.command === 'previewWorkbench' ? 'Temporary workbench preview applied. Revert or close to restore.' : 'Workbench preview reverted.', previewActive: workbenchPreview.active });
                        } catch { webview.postMessage({ command: 'actionResult', ok: false, text: 'Preview action failed. Recovery data retained.' }); }
                        break;
                    case 'exportTheme':
                    case 'exportPreset':
                        try {
                            const full = message.command === 'exportPreset';
                            const destination = await vscode.window.showSaveDialog({ filters: full ? { 'Gradient Nitro full preset': ['gradient-nitro.json'] } : { 'VS Code color theme': ['json'] }, saveLabel: full ? 'Export Full Preset' : 'Export VS Code Theme JSON' });
                            const cfg = normalizeConfig(message.config), theme = generateTheme(cfg);
                            if (destination) await vscode.workspace.fs.writeFile(destination, Buffer.from(JSON.stringify(full ? exportPreset(cfg, theme) : theme, null, 2) + '\n'));
                            webview.postMessage({ command: 'actionResult', ok: true, text: destination ? (full ? 'Full preset exported, including runtime settings.' : 'Native theme exported. Runtime effects are not included.') : 'Export cancelled.' });
                        } catch (error) { webview.postMessage({ command: 'actionResult', ok: false, text: 'Export failed: ' + String(error) }); }
                        break;
                    case 'importPreset':
                        try {
                            const files = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Gradient Nitro full preset': ['json'] }, openLabel: 'Import Full Preset' });
                            if (files?.[0]) {
                                const bytes = await vscode.workspace.fs.readFile(files[0]);
                                if (bytes.length > 2_000_000) throw new Error('Preset exceeds 2 MB.');
                                const config = importPreset(JSON.parse(Buffer.from(bytes).toString('utf8')));
                                // Import updates the draft only. Existing runtime authorization stays local.
                                config.workbenchEffects = getCurrentConfig().workbenchEffects;
                                webview.postMessage({ command: 'importConfig', config });
                            }
                            webview.postMessage({ command: 'actionResult', ok: true, text: files?.length ? 'Preset imported into draft. Save or Preview to apply.' : 'Import cancelled.' });
                        } catch (error) { webview.postMessage({ command: 'actionResult', ok: false, text: 'Import failed: ' + String(error) }); }
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
        return customizerHtml(normalizeConfig(getCurrentConfig()), getDefaultConfig(), webview, extensionUri);
    }
}

export async function applyWorkbenchPreview(input: ThemeConfig): Promise<void> {
    await workbenchPreview.apply(buildColors(input));
    // A draft never installs the helper or turns on runtime effects. Reuse an opted-in session.
    const saved = getCurrentConfig();
    if (saved.workbenchEffects) await syncWorkbenchRuntime(extensionContext, { ...normalizeConfig(input), workbenchEffects: true });
}

export async function revertWorkbenchPreview(): Promise<void> {
    const wasActive = workbenchPreview.active;
    await workbenchPreview.revert();
    if (wasActive) await syncNativeLayout();
}

export function getCurrentConfig(): ThemeConfig {
    const nitroConfig = vscode.workspace.getConfiguration('gradientNitro');
    const snapshot = nitroConfig.get<Partial<ThemeConfig>>('visualConfig');
    if (snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length) return normalizeConfig(snapshot);
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

    return normalizeConfig({
        ...normalizePalette(Object.fromEntries(Object.entries(paletteDefaults).map(([key, value]) => {
            const inspected = nitroConfig.inspect(key);
            const hasSavedValue = inspected?.globalValue !== undefined || inspected?.workspaceValue !== undefined || inspected?.workspaceFolderValue !== undefined;
            return [key, key === 'baseColor' && isLight && !hasSavedValue ? '#FAF7FF' : nitroConfig.get(key, value)];
        }))),
        themeMode: isLight ? 'light' : 'dark',
        accentColor: nitroConfig.get<string>('accentColor', paletteDefaults.accentColor),
        borderColor: nitroConfig.get<string>('borderColor', '#64748B'),
        borderWidth: nitroConfig.get<number>('borderWidth', 1),
        borderEnabled: nitroConfig.get<boolean>('borderEnabled', true),
        workbenchEffects: nitroConfig.get<boolean>('workbenchEffects', false),
        darkIntensity: nitroConfig.get<number>('darkIntensity', 0.65),
        lightIntensity: nitroConfig.get<number>('lightIntensity', 0.55),
        neonGlowIntensity: nitroConfig.get<number>('neonGlowIntensity', 0.18),
        syntaxOverrides: normalizeSyntaxOverrides(nitroConfig.get('syntaxOverrides', {})),
        fileColors: nitroConfig.get<boolean>('fileColors', false),
        colorStops: stops,
        leftColor: stops[0]?.color || leftColor,
        rightColor: stops[stops.length - 1]?.color || rightColor,
        roundedCorners: nitroConfig.get<boolean>('roundedCorners', false),
        borderRadius: nitroConfig.get<number>('borderRadius', 12),
        blurStrength: nitroConfig.get<number>('blurStrength', 24),
        neonGlowSpread: nitroConfig.get<number>('neonGlowSpread', 35),
        glassOpacity: nitroConfig.get<number>('glassOpacity', 0.70),
        gradientAngle: nitroConfig.get<number>('gradientAngle', 135),
        gradientIntensity: nitroConfig.get<number>('gradientIntensity', 0.28),
        gradientEnabled: nitroConfig.get<boolean>('gradientEnabled', true),
        gradientStrength: nitroConfig.get<number>('gradientStrength', nitroConfig.get<number>('gradientIntensity', 0.35)),
        gradientSoftness: nitroConfig.get<number>('gradientSoftness', 0.80),
        editorSoftlight: nitroConfig.get<number>('editorSoftlight', 0.28),
        softlightSpread: nitroConfig.get<number>('softlightSpread', 0.70),
        fontFamily: savedFont('fontFamily', editorConfig.get<string>('fontFamily', "'JetBrains Mono', 'Fira Code', Consolas, monospace")),
        fontSize: savedFont('fontSize', editorConfig.get<number>('fontSize', 14)),
        lineHeight: savedFont('lineHeight', editorConfig.get<number>('lineHeight', 23)),
        fontLigatures: savedFont('fontLigatures', editorConfig.get<boolean>('fontLigatures', true)),
        fontWeight: savedFont('fontWeight', editorConfig.get<string>('fontWeight', '400'))
    });
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

export function buildColors(input: ThemeConfig): Record<string, string> {
    const cfg = normalizeConfig(input);
    const colors = workbenchColors(cfg);
    // xterm paints its own background, independently of the workbench CSS.
    if (cfg.workbenchEffects) colors['terminal.background'] = '#00000000';
    // Existing file-family and syntax identities remain independent of BASE / ACCENT.
    for (const [family, data] of Object.entries(fileFamilies)) colors['gradientNitro.file.' + family] = cfg.themeMode === 'light' ? data.light : data.dark;
    const alpha = Math.round(cfg.neonGlowIntensity * (cfg.themeMode === 'light' ? 0.65 : 1) * 255).toString(16).padStart(2, '0');
    colors['widget.shadow'] = cfg.accentColor + alpha;
    colors['listFilterWidget.shadow'] = cfg.accentColor + alpha;
    return colors;
}

export function generateTheme(input: ThemeConfig): Record<string, unknown> {
    const cfg = normalizeConfig(input);
    const file = path.join(__dirname, '..', 'themes', cfg.themeMode === 'light' ? 'gradient-nitro-light-theme.json' : 'gradient-nitro-theme.json');
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    theme.name = cfg.themeMode === 'light' ? 'Gradient Nitro Glass Light Custom' : 'Gradient Nitro Glass Custom';
    Object.assign(theme.colors, buildColors({ ...cfg, workbenchEffects: false }));
    if (Object.keys(cfg.syntaxOverrides).length) Object.assign(theme, buildSyntax(cfg.themeMode, cfg.syntaxOverrides));
    return theme;
}

type OwnedScope = { before: Record<string, unknown>; applied: Record<string, string> };
export async function applyCustomTheme(input: ThemeConfig) {
    const cfg = normalizeConfig(input);
    await workbenchPreview.revert();
    const nitro = vscode.workspace.getConfiguration('gradientNitro');
    // One atomic, versioned snapshot is the source read by Studio and runtime after reload.
    await nitro.update('visualConfig', cfg, vscode.ConfigurationTarget.Global);
    for (const key of fontKeys) await nitro.update(key, cfg[key], vscode.ConfigurationTarget.Global);
    await typography.apply(cfg);
    const persistenceKeys = [
        'colorStops', 'roundedCorners', 'borderRadius', 'leftColor', 'rightColor',
        'blurStrength', 'neonGlowSpread', 'glassOpacity', 'gradientAngle', 'gradientIntensity',
        'gradientEnabled', 'gradientStrength', 'gradientSoftness', 'editorSoftlight', 'softlightSpread',
        'accentColor', 'borderColor', 'borderWidth', 'borderEnabled', 'workbenchEffects',
        'darkIntensity', 'lightIntensity', 'neonGlowIntensity', 'syntaxOverrides', 'fileColors',
        'baseColor', 'surfaceDepth', 'contrast', 'accentIntensity', 'inactiveFade', 'borderVisibility', 'activeTabIndicator',
        'gradientMode', 'gradientStops', 'softlightEnabled', 'softlightSoftness', 'softlightMode', 'softlightColor',
        'glassEnabled', 'glassBlur', 'glassSaturation', 'neonEnabled', 'neonColorMode', 'neonCustomColor',
        'neonStrength', 'neonRadius', 'neonOpacity', 'motionEnabled', 'motionStrength', 'motionSpring'
    ] as const;
    for (const key of persistenceKeys) await nitro.update(key, (cfg as any)[key], vscode.ConfigurationTarget.Global);
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
    // Only explicit syntax edits invoke the existing syntax workflow. Workbench edits never recolor tokens.
    const savedSyntax = extensionContext.globalState.get<Record<string, LanguageOverrides>>('savedSyntaxOverrides') || {};
    const previousSyntax = savedSyntax[cfg.themeMode] || {};
    if (JSON.stringify(previousSyntax) !== JSON.stringify(cfg.syntaxOverrides)) {
        await tokenSettings.apply(cfg.themeMode, cfg.syntaxOverrides, cfg.themeMode === 'dark' ? '#11151d' : '#f8fafc');
        await extensionContext.globalState.update('savedSyntaxOverrides', { ...savedSyntax, [cfg.themeMode]: cfg.syntaxOverrides });
    }
    await workbench.update('colorTheme', name, vscode.ConfigurationTarget.Global);
    await nativeLayout.apply(cfg.nativeModernUI, cfg.neonGlowIntensity > 0);

    fileColors.refresh();
    if (input && input.workbenchEffects) {
        try {
            await syncWorkbenchRuntime(extensionContext, { ...cfg, workbenchEffects: true });
        } catch (e) { throw new Error('Configuration saved, but runtime effects could not be applied: ' + String(e)); }
    } else {
        await revertWorkbenchRuntime(extensionContext);
    }
    if (!nativeLayout.available && cfg.nativeModernUI) vscode.window.showInformationMessage('Native rounded layout requires a VS Code version with workbench.experimental.modernUI. Your theme colors have been applied.');
    activityView?.refresh();
}

export async function resetToDefaultSettings() {
    await revertWorkbenchRuntime(extensionContext);
    await workbenchPreview.revert();
    await typography.restore();
    await nativeLayout.restore();
    await tokenSettings.restore();
    await extensionContext.globalState.update('savedSyntaxOverrides', undefined);
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
    for (const key of ['visualConfig', ...Object.keys(getDefaultConfig())]) if (nitro.inspect(key)?.globalValue !== undefined) await nitro.update(key, undefined, vscode.ConfigurationTarget.Global);
    await workbench.update('colorTheme', 'Default Dark Modern', vscode.ConfigurationTarget.Global);
}
