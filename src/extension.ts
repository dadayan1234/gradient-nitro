
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
import { PaletteConfig, paletteDefaults, normalizePalette, workbenchColors } from './palette';
import { customizerHtml } from './customizer';
import { WorkbenchPreview } from './workbenchPreview';


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
    void enqueue(async () => { await workbenchPreview.revert(); await syncNativeLayout(); }).catch(() => {});
}
async function syncNativeLayout() {
    const theme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
    if (theme === 'Gradient Nitro Glass' || theme === 'Gradient Nitro Glass Light') {
        const cfg = getCurrentConfig();
        await nativeLayout.apply(cfg.roundedCorners, cfg.neonGlowIntensity > 0);
        if (vscode.workspace.getConfiguration('gradientNitro').inspect('fontFamily')?.globalValue !== undefined) await typography.apply(normalizeConfig(cfg));

    } else { await typography.restore(); await nativeLayout.restore(); }
}
export async function deactivate() { await pending; await workbenchPreview?.revert(); await typography?.restore(); await nativeLayout?.restore(); }

export interface ColorStop {
    color: string;
    offset: number; // 0 to 100
}

export interface ThemeConfig extends PaletteConfig {
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
        void enqueue(() => workbenchPreview.revert()).catch(() => {});
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
                            await enqueue(() => message.command === 'previewWorkbench' ? workbenchPreview.apply(buildColors(message.config)) : workbenchPreview.revert());
                            webview.postMessage({ command: 'actionResult', ok: true, text: message.command === 'previewWorkbench' ? 'Temporary workbench preview applied. Revert or close to restore.' : 'Workbench preview reverted.', previewActive: workbenchPreview.active });
                        } catch { webview.postMessage({ command: 'actionResult', ok: false, text: 'Preview action failed. Recovery data retained.' }); }
                        break;
                    case 'exportTheme':
                        try {
                            const destination = await vscode.window.showSaveDialog({ filters: { 'VS Code color theme': ['json'] }, saveLabel: 'Export Theme' });
                            if (destination) await vscode.workspace.fs.writeFile(destination, Buffer.from(JSON.stringify(generateTheme(message.config), null, 2) + '\n'));
                            webview.postMessage({ command: 'actionResult', ok: true, text: destination ? 'Theme JSON exported.' : 'Export cancelled.' });
                        } catch (error) { webview.postMessage({ command: 'actionResult', ok: false, text: 'Export failed: ' + String(error) }); }
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
        return customizerHtml(normalizeConfig(getCurrentConfig()), getDefaultConfig());
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
        workbenchEffects: false,
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
        ...paletteDefaults,
        borderColor: '#64748B',
        borderWidth: 1,
        borderEnabled: true,
        workbenchEffects: false,
        darkIntensity: 0.65,
        lightIntensity: 0.55,
        neonGlowIntensity: 0.18,
        syntaxOverrides: {},
        fileColors: false,
        colorStops: [
            { color: '#28A12F', offset: 0 },
            { color: '#00D2FF', offset: 40 },
            { color: '#A008B9', offset: 100 }
        ],
        leftColor: '#28A12F',
        rightColor: '#A008B9',
        roundedCorners: false,
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
    cfg.workbenchEffects = false;
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
    return { ...cfg, ...normalizePalette(cfg) };
}

export function buildColors(input: ThemeConfig): Record<string, string> {
    const cfg = normalizeConfig(input);
    const colors = workbenchColors(cfg);
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
    Object.assign(theme.colors, buildColors(cfg));
    if (Object.keys(cfg.syntaxOverrides).length) Object.assign(theme, buildSyntax(cfg.themeMode, cfg.syntaxOverrides));
    return theme;
}

type OwnedScope = { before: Record<string, unknown>; applied: Record<string, string> };
export async function applyCustomTheme(input: ThemeConfig) {
    const cfg = normalizeConfig(input);
    await workbenchPreview.revert();
    const nitro = vscode.workspace.getConfiguration('gradientNitro');
    for (const key of fontKeys) await nitro.update(key, cfg[key], vscode.ConfigurationTarget.Global);
    await typography.apply(cfg);
    for (const key of ['colorStops', 'roundedCorners', 'borderRadius', 'leftColor', 'rightColor', 'blurStrength', 'neonGlowSpread', 'glassOpacity', 'gradientAngle', 'gradientIntensity', 'accentColor', 'borderColor', 'borderWidth', 'borderEnabled', 'workbenchEffects', 'darkIntensity', 'lightIntensity', 'neonGlowIntensity', 'syntaxOverrides', 'fileColors', 'baseColor', 'surfaceDepth', 'contrast', 'accentIntensity', 'inactiveFade', 'borderVisibility', 'activeTabIndicator'] as const) await nitro.update(key, cfg[key], vscode.ConfigurationTarget.Global);
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
    await nativeLayout.apply(cfg.roundedCorners, cfg.neonGlowIntensity > 0);

    fileColors.refresh();
    if (!nativeLayout.available && cfg.roundedCorners) vscode.window.showInformationMessage('Native rounded layout requires a VS Code version with workbench.experimental.modernUI. Your theme colors have been applied.');
}

export async function resetToDefaultSettings() {
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
    for (const key of Object.keys(getDefaultConfig())) if (nitro.inspect(key)?.globalValue !== undefined) await nitro.update(key, undefined, vscode.ConfigurationTarget.Global);
    await workbench.update('colorTheme', 'Default Dark Modern', vscode.ConfigurationTarget.Global);
}
