import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

export function activate(context: vscode.ExtensionContext) {
    // 1. Register Open Customizer Command
    const openCustomizerCmd = vscode.commands.registerCommand('gradientNitro.openCustomizer', () => {
        ThemeCustomizerPanel.render(context.extensionUri);
    });

    // 2. Register Reset Defaults Command
    const resetDefaultsCmd = vscode.commands.registerCommand('gradientNitro.resetDefaults', async () => {
        await resetToDefaultSettings();
        vscode.window.showInformationMessage('Gradient Nitro Theme reset to defaults!');
    });

    // 3. Listen to Color Theme switches (sync custom.css)
    const themeChangeSub = vscode.window.onDidChangeActiveColorTheme(async (theme) => {
        if (theme.kind === vscode.ColorThemeKind.Light || theme.kind === vscode.ColorThemeKind.Dark) {
            const config = getCurrentConfig();
            config.themeMode = theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
            await updateCustomCssFile(config);
        }
    });

    context.subscriptions.push(openCustomizerCmd, resetDefaultsCmd, themeChangeSub);
}

export function deactivate() {}

export interface ColorStop {
    color: string;
    offset: number; // 0 to 100
}

export interface ThemeConfig {
    themeMode: 'dark' | 'light';
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
                'Gradient Nitro: Theme & Font Studio',
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
                        await applyCustomTheme(message.config);
                        const reloadOpt = await vscode.window.showInformationMessage(
                            '✨ Gradient Nitro applied! Reload window to see the new gradient & rounded effects.',
                            'Reload Window'
                        );
                        if (reloadOpt === 'Reload Window') {
                            await vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                        break;
                    case 'resetDefaults':
                        await resetToDefaultSettings();
                        webview.postMessage({ command: 'syncConfig', config: getDefaultConfig() });
                        vscode.window.showInformationMessage('🔄 Theme & layout restored to default configuration.');
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
        const config = getCurrentConfig();
        const jsonConfig = JSON.stringify(config);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gradient Nitro Theme & Layout Studio</title>
    <style>
        :root {
            --blur: ${config.blurStrength}px;
            --spread: ${config.neonGlowSpread}px;
            --opacity: ${config.glassOpacity};
            --angle: ${config.gradientAngle}deg;
            --intensity: ${config.gradientIntensity};
            --radius: ${config.roundedCorners ? config.borderRadius : 0}px;
            --font-fam: ${config.fontFamily};
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
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
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
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
        }
        .btn-primary:hover { opacity: 0.92; transform: translateY(-2px); }
        .btn-secondary {
            flex: 1;
            background: #232833;
            color: #cbd5e1;
            border: 1px solid #3b4455;
        }
        .btn-secondary:hover { background: #2c3342; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">
                <h1>Gradient Nitro Glass</h1>
                <p>Whole-Page Gradient, Rounded Floating Cards & Font Studio</p>
            </div>
            <div class="mode-toggle-group">
                <button id="btnModeDark" class="mode-btn ${config.themeMode === 'dark' ? 'active' : ''}" onclick="setThemeMode('dark')">🌙 Dark Mode</button>
                <button id="btnModeLight" class="mode-btn ${config.themeMode === 'light' ? 'active' : ''}" onclick="setThemeMode('light')">☀️ Light Mode</button>
            </div>
        </div>

        <!-- Multi-Stop Gradient Palette Bar -->
        <div class="card">
            <h2>🎨 Multi-Stop Gradient Palette Bar</h2>
            <div class="gradient-bar-wrapper">
                <div class="gradient-preview-bar" id="gradientBar" onclick="onGradientBarClick(event)" title="Click anywhere on the bar to add a new color point!"></div>
                <div class="stops-container" id="stopsContainer"></div>
                <button class="btn-add-stop" onclick="addColorStop()">➕ Add Color Point</button>
            </div>
        </div>

        <!-- Presets -->
        <div class="card">
            <h2>⚡ Multi-Point Gradient Presets</h2>
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
            <h2>🪟 Rounded Windows & Modern Floating Cards</h2>
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
                    <div class="form-label">Corner Radius</div>
                    <div class="form-desc">Curvature for editor, sidebar, terminal & tabs</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="borderRadius" min="0" max="24" value="${config.borderRadius}" oninput="updateRadius()">
                    <span id="radiusVal" class="slider-val">${config.borderRadius}px</span>
                </div>
            </div>
        </div>

        <!-- Gradient Direction & Intensity -->
        <div class="card">
            <h2>🌐 Whole-Page UI Gradient Direction & Glow</h2>
            <div class="direction-grid">
                <button class="dir-btn" onclick="setAngle(90)">➡️ Left to Right (90°)</button>
                <button class="dir-btn" onclick="setAngle(135)">↘️ Diagonal Down (135°)</button>
                <button class="dir-btn" onclick="setAngle(180)">⬇️ Top to Bottom (180°)</button>
                <button class="dir-btn" onclick="setAngle(45)">↗️ Diagonal Up (45°)</button>
                <button class="dir-btn" onclick="setAngle(270)">⬅️ Right to Left (270°)</button>
                <button class="dir-btn" onclick="setAngle(225)">↙️ Down-Left (225°)</button>
                <button class="dir-btn" onclick="setAngle(0)">⬆️ Bottom to Top (0°)</button>
                <button class="dir-btn" onclick="setAngle(315)">↖️ Up-Left (315°)</button>
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
                    <div class="form-label">Whole-Page Glow Intensity</div>
                    <div class="form-desc">Strength of ambient gradient across all panels</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="gradientIntensity" min="10" max="50" value="${Math.round(config.gradientIntensity * 100)}" oninput="updateIntensity()">
                    <span id="intensityVal" class="slider-val">${Math.round(config.gradientIntensity * 100)}%</span>
                </div>
            </div>
        </div>

        <!-- Typography Studio -->
        <div class="card">
            <h2>🔤 Custom Font Studio</h2>
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
            <h2>🧊 Frozen Glass & Neon Glow</h2>
            <div class="form-row">
                <div>
                    <div class="form-label">Gaussian Blur Strength</div>
                    <div class="form-desc">Background glass blur intensity</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="blurStrength" min="8" max="40" value="${config.blurStrength}" oninput="updateSliders()">
                    <span id="blurVal" class="slider-val">${config.blurStrength}px</span>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <div class="form-label">Neon Diffusion Spread</div>
                    <div class="form-desc">Glow aura radius around floating widgets</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="neonSpread" min="10" max="60" value="${config.neonGlowSpread}" oninput="updateSliders()">
                    <span id="spreadVal" class="slider-val">${config.neonGlowSpread}px</span>
                </div>
            </div>
            <div class="form-row">
                <div>
                    <div class="form-label">Frosted Glass Opacity</div>
                    <div class="form-desc">Translucency of tooltips and popups</div>
                </div>
                <div class="slider-wrapper">
                    <input type="range" id="glassOpacity" min="50" max="95" value="${Math.round(config.glassOpacity * 100)}" oninput="updateSliders()">
                    <span id="opacityVal" class="slider-val">${Math.round(config.glassOpacity * 100)}%</span>
                </div>
            </div>
        </div>

        <!-- Live Whole-Page Simulation -->
        <div class="card">
            <h2>🖥️ Live Whole-Page UI Simulation</h2>
            <div class="page-mockup ${config.themeMode === 'light' ? 'light-mode' : ''}" id="mockup">
                <div class="mock-activity">
                    <div class="mock-icon" id="mockIcon1"></div>
                    <div class="mock-icon" id="mockIcon2"></div>
                </div>
                <div class="mock-sidebar">
                    <div class="mock-file" style="width:70%"></div>
                    <div class="mock-file" style="width:90%"></div>
                    <div class="mock-file" style="width:50%"></div>
                </div>
                <div class="mock-editor">
                    <div class="mock-tabs">
                        <div class="mock-tab-item">main.py</div>
                    </div>
                    <div class="mock-code" id="mockCode">
                        <span style="color:#ff5599;font-style:italic">def</span> <span style="color:#60a5fa;font-weight:bold">gradient_nitro_flow</span>():<br>
                        &nbsp;&nbsp;<span style="color:#ff5599;font-style:italic">return</span> <span style="color:#10b981">f"Multi-point color gradient & rounded cards != None"</span>
                    </div>
                    <div class="mock-tooltip" id="mockTooltip">
                        <div style="font-weight:600;">✨ Frosted Glass</div>
                        <div style="opacity:0.75;">Multi-Stop Acrylic Glow</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions">
            <button class="btn btn-primary" onclick="applyToVSCode()">✨ Apply Real-time Changes</button>
            <button class="btn btn-secondary" onclick="resetDefaults()">🔄 Reset Defaults</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let initialConfig = ${jsonConfig};
        let currentMode = initialConfig.themeMode || 'dark';
        let currentStops = initialConfig.colorStops || [
            { color: '#28A12F', offset: 0 },
            { color: '#00D2FF', offset: 40 },
            { color: '#A008B9', offset: 100 }
        ];

        function init() {
            renderStopsList();
            renderMockup();
        }

        function setThemeMode(mode) {
            currentMode = mode;
            document.getElementById('btnModeDark').classList.toggle('active', mode === 'dark');
            document.getElementById('btnModeLight').classList.toggle('active', mode === 'light');
            document.getElementById('mockup').classList.toggle('light-mode', mode === 'light');
            renderMockup();
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
                            <input type="color" value="\${stop.color}" onchange="updateStopColor(\${index}, this.value)">
                            <input type="text" class="hex-input" value="\${stop.color}" onchange="updateStopColor(\${index}, this.value)">
                        </div>
                    </div>
                    <div class="stop-slider-wrap">
                        <input type="range" min="0" max="100" value="\${stop.offset}" oninput="updateStopOffset(\${index}, this.value)">
                        <span class="slider-val" style="width:40px;">\${stop.offset}%</span>
                    </div>
                    <button class="btn-del-stop" onclick="deleteColorStop(\${index})" \${currentStops.length <= 2 ? 'disabled' : ''} title="Remove point">✖</button>
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
        }

        function hexToRgba(hex, alpha) {
            let clean = hex.replace('#', '');
            if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
            const num = parseInt(clean, 16);
            return \`rgba(\${(num >> 16) & 255}, \${(num >> 8) & 255}, \${num & 255}, \${alpha})\`;
        }

        function renderMockup() {
            const deg = document.getElementById('gradientAngle').value;
            const intensity = document.getElementById('gradientIntensity').value / 100;
            const isLight = currentMode === 'light';
            
            const mock = document.getElementById('mockup');
            const stopsString = currentStops.map(s => {
                const alpha = isLight ? Math.min(0.65, intensity * 1.6) : intensity;
                return \`\${hexToRgba(s.color, alpha)} \${s.offset}%\`;
            }).join(', ');

            mock.style.background = \`linear-gradient(\${deg}deg, \${stopsString})\`;
            mock.style.backgroundColor = isLight ? '#f2faf6' : '#101216';

            if (currentStops.length > 0) {
                document.getElementById('mockIcon1').style.background = currentStops[0].color;
                document.getElementById('mockIcon2').style.background = currentStops[currentStops.length - 1].color;
                document.getElementById('mockTooltip').style.borderColor = currentStops[currentStops.length - 1].color;
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
                setThemeMode(message.config.themeMode || 'dark');
                applyPresetStops(
                    message.config.colorStops || [{color: '#28A12F', offset: 0}, {color: '#A008B9', offset: 100}],
                    message.config.gradientAngle || 90,
                    message.config.gradientIntensity || 0.28,
                    message.config.blurStrength || 24,
                    message.config.neonGlowSpread || 35,
                    message.config.glassOpacity || 0.70,
                    message.config.roundedCorners !== false,
                    message.config.borderRadius || 12
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
        fontFamily: editorConfig.get<string>('fontFamily', "'JetBrains Mono', 'Fira Code', Consolas, monospace"),
        fontSize: editorConfig.get<number>('fontSize', 14),
        lineHeight: editorConfig.get<number>('lineHeight', 23),
        fontLigatures: editorConfig.get<boolean>('fontLigatures', true),
        fontWeight: editorConfig.get<string>('fontWeight', '400')
    };
}

export function getDefaultConfig(): ThemeConfig {
    return {
        themeMode: 'dark',
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

export function findWorkbenchHtml(): string | null {
    const roots = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code'),
        path.join(process.env.ProgramFiles || '', 'Microsoft VS Code'),
        path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft VS Code')
    ];

    for (const r of roots) {
        if (!fs.existsSync(r)) continue;
        const relCandidates = [
            path.join('resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'),
            path.join('resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html')
        ];
        for (const rc of relCandidates) {
            const p = path.join(r, rc);
            if (fs.existsSync(p)) return p;
        }
        try {
            const items = fs.readdirSync(r);
            for (const item of items) {
                const sub = path.join(r, item);
                if (fs.statSync(sub).isDirectory()) {
                    for (const rc of relCandidates) {
                        const p = path.join(sub, rc);
                        if (fs.existsSync(p)) return p;
                    }
                }
            }
        } catch (e) {}
    }
    return null;
}

export async function patchWorkbenchHtmlWithChecksum(cssContent: string) {
    try {
        const htmlPath = findWorkbenchHtml();
        if (!htmlPath) return;

        const productPath = path.resolve(path.dirname(htmlPath), '../../../../../product.json');

        // Backup original product.json if not present
        const productBackup = productPath + '.nitro-orig';
        if (!fs.existsSync(productBackup) && fs.existsSync(productPath)) {
            await fs.promises.copyFile(productPath, productBackup);
        }

        // Backup original workbench.html if not present
        const htmlBackup = htmlPath + '.nitro-orig';
        if (!fs.existsSync(htmlBackup)) {
            await fs.promises.copyFile(htmlPath, htmlBackup);
        }

        // 1. Read base clean html from backup if available, else from file
        const sourceHtml = fs.existsSync(htmlBackup) ? await fs.promises.readFile(htmlBackup, 'utf-8') : await fs.promises.readFile(htmlPath, 'utf-8');
        let html = sourceHtml.replace(/<!-- !! GRADIENT-NITRO-CSS-START !! -->[\s\S]*?<!-- !! GRADIENT-NITRO-CSS-END !! -->\n*/g, '');
        const patchBlock = `<!-- !! GRADIENT-NITRO-CSS-START !! -->\n<style id="gradient-nitro-custom-css">\n${cssContent}\n</style>\n<!-- !! GRADIENT-NITRO-CSS-END !! -->\n`;
        html = html.replace('</head>', `${patchBlock}</head>`);

        // 2. Write patched workbench.html
        await fs.promises.writeFile(htmlPath, html, 'utf-8');

        // 3. Compute sha256 checksum and update product.json so VS Code NEVER reports corruption!
        if (fs.existsSync(productPath)) {
            const fileBuf = await fs.promises.readFile(htmlPath);
            const newHash = crypto.createHash('sha256').update(fileBuf).digest('base64').replace(/=+$/, '');
            
            const prodContent = await fs.promises.readFile(productPath, 'utf-8');
            const prod = JSON.parse(prodContent);
            if (!prod.checksums) prod.checksums = {};
            
            prod.checksums['vs/code/electron-browser/workbench/workbench.html'] = newHash;
            
            await fs.promises.writeFile(productPath, JSON.stringify(prod, null, '\t'), 'utf-8');
        }
    } catch (err) {
        console.error('Failed to patch workbench.html with checksum:', err);
    }
}

export async function applyCustomTheme(cfg: ThemeConfig) {
    const nitroConfig = vscode.workspace.getConfiguration('gradientNitro');
    await nitroConfig.update('colorStops', cfg.colorStops, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('roundedCorners', cfg.roundedCorners, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('borderRadius', cfg.borderRadius, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('leftColor', cfg.leftColor, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('rightColor', cfg.rightColor, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('blurStrength', cfg.blurStrength, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('neonGlowSpread', cfg.neonGlowSpread, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('glassOpacity', cfg.glassOpacity, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('gradientAngle', cfg.gradientAngle, vscode.ConfigurationTarget.Global);
    await nitroConfig.update('gradientIntensity', cfg.gradientIntensity, vscode.ConfigurationTarget.Global);

    const editorConfig = vscode.workspace.getConfiguration('editor');
    await editorConfig.update('fontFamily', cfg.fontFamily, vscode.ConfigurationTarget.Global);
    await editorConfig.update('fontSize', cfg.fontSize, vscode.ConfigurationTarget.Global);
    await editorConfig.update('lineHeight', cfg.lineHeight, vscode.ConfigurationTarget.Global);
    await editorConfig.update('fontLigatures', cfg.fontLigatures, vscode.ConfigurationTarget.Global);
    await editorConfig.update('fontWeight', cfg.fontWeight, vscode.ConfigurationTarget.Global);

    const terminalConfig = vscode.workspace.getConfiguration('terminal.integrated');
    await terminalConfig.update('fontFamily', cfg.fontFamily, vscode.ConfigurationTarget.Global);

    const targetThemeName = cfg.themeMode === 'light' ? 'Gradient Nitro Glass Light' : 'Gradient Nitro Glass';
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    await workbenchConfig.update('colorTheme', targetThemeName, vscode.ConfigurationTarget.Global);

    const isLight = cfg.themeMode === 'light';
    const leftDark = isLight ? blendColor(cfg.leftColor, '#dcfce7', 0.35) : blendColor(cfg.leftColor, '#0a0d0c', 0.16);
    const leftSidebar = isLight ? blendColor(cfg.leftColor, '#ecfdf5', 0.30) : blendColor(cfg.leftColor, '#0d1210', 0.18);
    const leftBorder = isLight ? blendColor(cfg.leftColor, '#a7f3d0', 0.50) : blendColor(cfg.leftColor, '#121c15', 0.30);
    const rightPanel = isLight ? blendColor(cfg.rightColor, '#fdf4ff', 0.35) : blendColor(cfg.rightColor, '#0d0a12', 0.20);
    const rightBorder = isLight ? blendColor(cfg.rightColor, '#f5d0fe', 0.50) : blendColor(cfg.rightColor, '#1c1224', 0.34);

    const fullColorCustomizations = {
        "focusBorder": `${cfg.leftColor}a0`,
        "widget.shadow": `${cfg.rightColor}60`,
        "selection.background": `${cfg.rightColor}40`,
        
        // Activity Bar: High Contrast Icons & Indicators
        "activityBar.background": leftDark,
        "activityBar.foreground": isLight ? "#0f172a" : "#ffffff",
        "activityBar.inactiveForeground": isLight ? "#475569" : "#cbd5e1",
        "activityBar.activeBorder": cfg.leftColor,
        "activityBar.border": leftBorder,
        "activityBarBadge.background": cfg.rightColor,
        "activityBarBadge.foreground": "#ffffff",
        
        "sideBar.background": leftSidebar,
        "sideBar.border": leftBorder,
        "sideBarTitle.foreground": isLight ? "#0f172a" : "#ffffff",
        "sideBarSectionHeader.foreground": isLight ? "#0f172a" : "#ffffff",
        
        // Transparent Editor Layers
        "editor.background": "#00000000",
        "editorGutter.background": "#00000000",
        "editorGroup.emptyBackground": "#00000000",
        "editorGroupHeader.tabsBackground": "#00000000",
        "editorGroupHeader.noTabsBackground": "#00000000",
        "editorGroupHeader.tabsBorder": "#00000000",
        
        // High Contrast Tabs
        "tab.activeBackground": isLight ? "#ffffff90" : "#ffffff28",
        "tab.unfocusedActiveBackground": isLight ? "#ffffff70" : "#ffffff18",
        "tab.inactiveBackground": "#00000000",
        "tab.unfocusedInactiveBackground": "#00000000",
        "tab.hoverBackground": isLight ? "#ffffff99" : "#ffffff32",
        "tab.unfocusedHoverBackground": isLight ? "#ffffff60" : "#ffffff16",
        "tab.activeForeground": isLight ? "#000000" : "#ffffff",
        "tab.inactiveForeground": isLight ? "#334155" : "#e2e8f0",
        "tab.unfocusedActiveForeground": isLight ? "#0f172a" : "#ffffff",
        "tab.unfocusedInactiveForeground": isLight ? "#475569" : "#cbd5e1",
        "tab.hoverForeground": isLight ? "#000000" : "#ffffff",
        "tab.border": "#00000000",
        "tab.activeBorder": "#00000000",
        "tab.activeBorderTop": cfg.leftColor,
        
        // Breadcrumbs: High Contrast
        "breadcrumb.background": "#00000000",
        "breadcrumb.foreground": isLight ? "#334155" : "#cbd5e1",
        "breadcrumb.focusForeground": isLight ? "#000000" : "#ffffff",
        "breadcrumb.activeSelectionForeground": isLight ? "#000000" : "#ffffff",
        
        "editorLineNumber.foreground": isLight ? "#64748b" : "#64748b",
        "editorLineNumber.activeForeground": cfg.leftColor,
        "editorCursor.foreground": cfg.leftColor,
        
        "editorHoverWidget.border": `${cfg.rightColor}cc`,
        "editorWidget.border": `${cfg.rightColor}bb`,
        "editorWidget.resizeBorder": cfg.leftColor,
        
        "editorSuggestWidget.border": `${cfg.leftColor}cc`,
        "editorSuggestWidget.highlightForeground": cfg.leftColor,
        "editorSuggestWidget.selectedBackground": `${cfg.rightColor}55`,
        
        "quickInput.border": `${cfg.leftColor}66`,
        "pickerGroup.border": `${cfg.leftColor}66`,
        "pickerGroup.foreground": cfg.leftColor,
        
        "notifications.border": `${cfg.rightColor}aa`,
        "notificationToast.border": cfg.rightColor,
        
        "peekView.border": cfg.rightColor,
        "badge.background": cfg.rightColor,
        "badge.foreground": "#ffffff",
        
        "button.background": cfg.leftColor,
        "button.hoverBackground": blendColor(cfg.leftColor, isLight ? '#ffffff' : '#000000', 0.85),
        "button.foreground": "#ffffff",
        "progressBar.background": cfg.leftColor,
        "inputOption.activeBorder": cfg.rightColor,
        
        "list.activeSelectionBackground": `${cfg.leftColor}33`,
        "list.highlightForeground": cfg.leftColor,
        
        "panel.background": rightPanel,
        "panel.border": rightBorder,
        "panelTitle.activeBorder": cfg.rightColor,
        "panelTitle.activeForeground": isLight ? "#0f172a" : "#ffffff",
        "panelTitle.inactiveForeground": isLight ? "#475569" : "#cbd5e1",
        
        "terminal.background": "#00000000",
        "terminalCursor.foreground": cfg.rightColor,
        "terminal.ansiGreen": cfg.leftColor,
        "terminal.ansiMagenta": cfg.rightColor,
        
        "statusBar.background": leftDark,
        "statusBar.foreground": isLight ? "#0f172a" : "#ffffff",
        "statusBar.border": leftBorder,
        "statusBar.debuggingBackground": cfg.rightColor,
        "statusBar.noFolderBackground": leftDark,
        "statusBarItem.hoverBackground": `${cfg.leftColor}33`,
        "statusBarItem.remoteBackground": cfg.leftColor,
        
        "titleBar.activeBackground": leftDark,
        "titleBar.activeForeground": isLight ? "#0f172a" : "#ffffff",
        "titleBar.inactiveForeground": isLight ? "#475569" : "#cbd5e1",
        "titleBar.border": leftBorder,
        
        "gitDecoration.untrackedResourceForeground": cfg.leftColor,
        "gitDecoration.stageModifiedResourceForeground": cfg.rightColor
    };

    await workbenchConfig.update('colorCustomizations', fullColorCustomizations, vscode.ConfigurationTarget.Global);

    // Write custom.css and patch workbench.html with valid checksum
    await updateCustomCssFile(cfg);
}

export async function updateCustomCssFile(cfg: ThemeConfig) {
    try {
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
        const customCssPath = path.join(appData, 'Code', 'User', 'custom.css');

        const isLight = cfg.themeMode === 'light';
        const stops = cfg.colorStops && cfg.colorStops.length >= 2 ? cfg.colorStops : [
            { color: cfg.leftColor || '#28A12F', offset: 0 },
            { color: '#00D2FF', offset: 35 },
            { color: '#7C3AED', offset: 70 },
            { color: cfg.rightColor || '#A008B9', offset: 100 }
        ];

        const angle = cfg.gradientAngle !== undefined ? cfg.gradientAngle : 60;
        const intensity = cfg.gradientIntensity !== undefined ? cfg.gradientIntensity : 0.28;
        const radius = cfg.roundedCorners ? (cfg.borderRadius || 14) : 0;
        const blurStrength = cfg.blurStrength || 18;
        const neonSpread = cfg.neonGlowSpread || 28;
        const glassOpacity = cfg.glassOpacity || 0.88;

        const gradientStops = stops.map(s => {
            const rgb = hexToRgb(s.color);
            const alpha = isLight ? Math.min(0.65, intensity * 1.65) : Math.min(0.70, intensity * 1.25);
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${s.offset}%`;
        }).join(', ');

        const cardGradientStops = stops.map(s => {
            const rgb = hexToRgb(s.color);
            const alpha = isLight ? 0.08 : 0.12;
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${s.offset}%`;
        }).join(', ');

        const activeTabGradientStops = stops.map(s => {
            const rgb = hexToRgb(s.color);
            const alpha = isLight ? 0.38 : 0.30;
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${s.offset}%`;
        }).join(', ');

        const hoverTabGradientStops = stops.map(s => {
            const rgb = hexToRgb(s.color);
            const alpha = isLight ? 0.22 : 0.18;
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${s.offset}%`;
        }).join(', ');

        const baseBg = isLight ? '#f2faf6' : '#101216';
        const panelHoverBg = isLight ? `rgba(255, 255, 255, ${glassOpacity})` : `rgba(22, 26, 32, ${glassOpacity})`;
        const rgb1 = hexToRgb(stops[0].color);
        const rgbLast = hexToRgb(stops[stops.length - 1].color);

        const cssContent = `/* ==========================================================================
   GRADIENT NITRO GLASS ENGINE - CLEAN LAYOUT & ULTRA HIGH CONTRAST
   ========================================================================== */

/* ── 1. Whole-Page Multi-Stop Gradient Canvas ─────────────────────────── */
body,
.monaco-workbench {
    background: linear-gradient(${angle}deg, ${gradientStops}) !important;
    background-color: ${baseBg} !important;
}

/* ── 2. Transparent Monaco Layers (Gradient Flows Through Code) ───────── */
.monaco-workbench .part.editor,
.monaco-workbench .part.editor > .content,
.monaco-workbench .part.editor .editor-group-container > .editor-container,
.monaco-workbench .part.editor .editor-instance,
.monaco-workbench .part.editor .split-view-container,
.monaco-workbench .part.editor .split-view-view,
.monaco-editor,
.monaco-editor-pane,
.monaco-editor .overflow-guard,
.monaco-editor .monaco-editor-background,
.monaco-editor .margin,
.monaco-editor .glyph-margin,
.monaco-editor .lines-content,
.monaco-editor .view-lines,
.monaco-editor .view-line,
.monaco-editor .view-overlays,
.monaco-editor .monaco-scrollable-element,
.monaco-editor .decorationsOverviewRuler,
.monaco-editor .sticky-widget,
.monaco-editor .sticky-widget-lines,
.monaco-editor .sticky-widget-line-numbers,
.monaco-editor .inputarea.ime-input {
    background: transparent !important;
    background-color: transparent !important;
}

/* ── 3. Rounded Floating Editor Windows (Code Cards) ──────────────────── */
.monaco-workbench .part.editor .editor-group-container,
div.monaco-workbench .part.editor > .content .editor-group-container {
    background: linear-gradient(${angle}deg, ${cardGradientStops}), ${isLight ? 'rgba(255, 255, 255, 0.42)' : 'rgba(18, 22, 28, 0.52)'} !important;
    backdrop-filter: blur(14px) !important;
    -webkit-backdrop-filter: blur(14px) !important;
    border-radius: ${radius}px !important;
    border: ${radius > 0 ? (isLight ? '1px solid rgba(255, 255, 255, 0.80)' : '1px solid rgba(255, 255, 255, 0.12)') : 'none'} !important;
    overflow: hidden !important;
    box-shadow: ${radius > 0 ? (isLight ? '0 10px 30px rgba(0, 0, 0, 0.08)' : '0 14px 36px rgba(0, 0, 0, 0.52)') : 'none'} !important;
}

/* ── 4. Editor Tab Bar Header & Actions (Cascade Gradient Glass) ──────── */
.monaco-workbench .part.editor .title,
.monaco-workbench .part.editor .title.tabs,
.monaco-workbench .part.editor .editor-group-container > .title,
.monaco-workbench .part.editor .tabs-and-actions-container,
.monaco-workbench .part.editor .tabs-breadcrumbs-container,
.monaco-workbench .part.editor .editor-group-header,
.monaco-workbench .part.editor .editor-group-header.tabs {
    background: linear-gradient(${angle}deg, ${cardGradientStops}), ${isLight ? 'rgba(255, 255, 255, 0.38)' : 'rgba(15, 18, 24, 0.44)'} !important;
    background-color: transparent !important;
    border-bottom: 1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'} !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
}

.monaco-workbench .part.editor .tabs-container,
.monaco-workbench .part.editor .editor-actions,
.monaco-workbench .part.editor .title .editor-actions,
.monaco-workbench .part.editor .tabs-and-actions-container .monaco-scrollable-element {
    background: transparent !important;
    background-color: transparent !important;
}

/* ── 5. All Tabs (High Contrast, Rounded Floating Gradient Tabs) ──────── */
.monaco-workbench .part.editor .tab {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    transition: all 0.15s ease !important;
}

/* Active Tab: Crisp, Solid Glass, High Contrast */
.monaco-workbench .part.editor .tab.active,
.monaco-workbench .part.editor .tabs-container > .tab.active,
.monaco-workbench .part.editor .editor-group-container > .title .tabs-container > .tab.active {
    background: linear-gradient(${angle}deg, ${activeTabGradientStops}), ${isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(30, 36, 48, 0.88)'} !important;
    background-color: transparent !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid ${isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.22)'} !important;
    border-top: 3px solid ${stops[0].color} !important;
    border-bottom: 1px solid transparent !important;
    border-radius: ${Math.min(8, radius)}px ${Math.min(8, radius)}px 0 0 !important;
    margin: 3px 2px 0 2px !important;
    box-shadow: 0 4px 16px ${stops[0].color}40, inset 0 1px 1px rgba(255, 255, 255, 0.25) !important;
}

/* Active Tab Text - MAXIMUM CONTRAST */
.monaco-workbench .part.editor .tab.active .label-name,
.monaco-workbench .part.editor .tab.active .tab-label a,
.monaco-workbench .part.editor .tab.active .monaco-icon-label,
.monaco-workbench .part.editor .tab.active .monaco-icon-name-container {
    color: ${isLight ? '#000000' : '#ffffff'} !important;
    font-weight: 700 !important;
    opacity: 1 !important;
}

/* Inactive Tab */
.monaco-workbench .part.editor .tab:not(.active) {
    background: ${isLight ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.22)'} !important;
    border-radius: ${Math.min(8, radius)}px ${Math.min(8, radius)}px 0 0 !important;
    margin: 3px 2px 0 2px !important;
    border: 1px solid transparent !important;
}

/* Inactive Tab Text - SHARP, READABLE CONTRAST */
.monaco-workbench .part.editor .tab:not(.active) .label-name,
.monaco-workbench .part.editor .tab:not(.active) .tab-label a,
.monaco-workbench .part.editor .tab:not(.active) .monaco-icon-label,
.monaco-workbench .part.editor .tab:not(.active) .monaco-icon-name-container {
    color: ${isLight ? '#1e293b' : '#e2e8f0'} !important;
    font-weight: 500 !important;
    opacity: 1 !important;
}

.monaco-workbench .part.editor .tab:not(.active):hover {
    background: linear-gradient(${angle}deg, ${hoverTabGradientStops}), ${isLight ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.08)'} !important;
    border: 1px solid ${stops[0].color}55 !important;
    border-bottom: 1px solid transparent !important;
}

.monaco-workbench .part.editor .tab .tab-label,
.monaco-workbench .part.editor .tab .monaco-icon-label {
    background: transparent !important;
}

.monaco-workbench .part.editor .tab-border-top-container,
.monaco-workbench .part.editor .tab-border-bottom-container {
    display: none !important;
}

/* ── 6. Activity Bar Icons (High Contrast, ZERO margin to prevent offside) */
.monaco-workbench .part.activitybar {
    background-color: rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${isLight ? 0.22 : 0.14}) !important;
    backdrop-filter: blur(14px) !important;
    -webkit-backdrop-filter: blur(14px) !important;
    /* ZERO margin - keeps bottom gear/profile icons strictly on-screen! */
    margin: 0 !important;
}

.monaco-workbench .part.activitybar .action-item .action-label,
.monaco-workbench .activitybar .action-item .action-label {
    opacity: 1 !important;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)) !important;
}

.monaco-workbench .part.activitybar .action-item.checked .action-label {
    color: #ffffff !important;
    opacity: 1 !important;
}

.monaco-workbench .part.activitybar .action-item {
    border-radius: ${Math.min(8, radius)}px !important;
}

/* ── 7. Sidebar, Auxiliarybar & Panel (Safe Background, ZERO outer margin) */
.monaco-workbench .part.sidebar {
    background: linear-gradient(${angle}deg, ${cardGradientStops}), ${isLight ? 'rgba(238, 252, 245, 0.65)' : 'rgba(19, 32, 24, 0.68)'} !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    margin: 0 !important;
}

.monaco-workbench .part.auxiliarybar {
    background: linear-gradient(${angle}deg, ${cardGradientStops}), ${isLight ? 'rgba(238, 252, 245, 0.65)' : 'rgba(19, 32, 24, 0.68)'} !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    margin: 0 !important;
}

.monaco-workbench .part.panel {
    background: linear-gradient(${angle}deg, ${cardGradientStops}), ${isLight ? 'rgba(253, 244, 255, 0.68)' : 'rgba(27, 23, 37, 0.75)'} !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    margin: 0 !important;
}

.monaco-workbench .part.statusbar {
    background-color: ${isLight ? 'rgba(220, 252, 231, 0.92)' : 'rgba(15, 28, 19, 0.88)'} !important;
    margin: 0 !important;
}

.monaco-workbench .part.titlebar {
    background-color: ${isLight ? 'rgba(220, 252, 231, 0.92)' : 'rgba(16, 25, 21, 0.88)'} !important;
    margin: 0 !important;
}

/* ── 8. Navigation, File Explorer & Lists (Rounded Items) ──────────────── */
.monaco-list .monaco-list-row,
.monaco-list-row,
.monaco-tree-row {
    border-radius: ${Math.min(6, radius)}px !important;
    margin: 1px 4px !important;
}

.monaco-breadcrumbs .monaco-breadcrumb-item {
    border-radius: ${Math.min(4, radius)}px !important;
    padding: 2px 4px !important;
}

/* ── 9. Pop Up Tooltips & Hover Widgets (Frosted Glass & Rounded) ─────── */
.monaco-hover,
.hover-widget,
.monaco-editor-hover,
.monaco-hover .hover-row,
.monaco-hover-content,
.parameter-hints-widget {
    background: ${panelHoverBg} !important;
    backdrop-filter: blur(${blurStrength}px) saturate(190%) !important;
    -webkit-backdrop-filter: blur(${blurStrength}px) saturate(190%) !important;
    border-radius: ${radius > 0 ? radius : 8}px !important;
    border: 1px solid ${stops[stops.length - 1].color}cc !important;
    box-shadow: 
        0 14px ${neonSpread}px 8px ${stops[stops.length - 1].color}66,
        0 0 30px 4px ${stops[0].color}4d,
        inset 0 1px 1px 0 rgba(255, 255, 255, 0.15) !important;
}

/* ── 10. Autocomplete & Suggestion Widget ──────────────────────────────── */
.monaco-editor .suggest-widget,
.monaco-editor .suggest-widget .tree,
.monaco-editor .suggest-widget .monaco-list {
    background: ${isLight ? `rgba(255, 255, 255, ${glassOpacity})` : `rgba(20, 26, 23, ${glassOpacity})`} !important;
    backdrop-filter: blur(${blurStrength}px) saturate(190%) !important;
    -webkit-backdrop-filter: blur(${blurStrength}px) saturate(190%) !important;
    border-radius: ${radius > 0 ? radius : 8}px !important;
    border: 1px solid ${stops[0].color}cc !important;
    box-shadow: 
        0 14px ${neonSpread}px 8px ${stops[0].color}59,
        0 0 30px 5px ${stops[stops.length - 1].color}4d,
        inset 0 1px 1px 0 rgba(255, 255, 255, 0.15) !important;
}

/* ── 11. Quick Input / Command Palette ────────────────────────────────── */
.quick-input-widget {
    background: ${isLight ? `rgba(255, 255, 255, ${Math.min(0.96, glassOpacity + 0.10)})` : `rgba(23, 26, 34, ${Math.min(0.92, glassOpacity + 0.05)})`} !important;
    backdrop-filter: blur(${blurStrength + 4}px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(${blurStrength + 4}px) saturate(200%) !important;
    border: 1px solid ${stops[0].color}cc !important;
    border-radius: ${radius > 0 ? radius + 4 : 10}px !important;
    box-shadow: 
        0 20px ${neonSpread + 15}px 10px ${stops[stops.length - 1].color}73,
        0 0 40px 6px ${stops[0].color}59,
        inset 0 1px 2px 0 rgba(255, 255, 255, 0.20) !important;
}

/* ── 12. Notifications & Toasts ───────────────────────────────────────── */
.notifications-toasts .notification-toast {
    background: ${panelHoverBg} !important;
    backdrop-filter: blur(${blurStrength}px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(${blurStrength}px) saturate(180%) !important;
    border: 1px solid ${stops[stops.length - 1].color}cc !important;
    border-radius: ${radius > 0 ? radius : 8}px !important;
    box-shadow: 
        0 14px ${neonSpread}px 8px ${stops[stops.length - 1].color}66,
        0 0 25px 4px ${stops[0].color}40 !important;
}

/* ── 13. Find Widget, Dialogs & Menus ─────────────────────────────────── */
.monaco-editor .find-widget,
.editor-widget.find-widget {
    background: ${panelHoverBg} !important;
    backdrop-filter: blur(${blurStrength}px) !important;
    -webkit-backdrop-filter: blur(${blurStrength}px) !important;
    border-radius: ${radius > 0 ? radius : 8}px !important;
    border: 1px solid ${stops[0].color}aa !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
}

.monaco-menu,
.monaco-menu-container,
.context-view.monaco-menu-container,
.monaco-dropdown-menu,
.monaco-dialog-box {
    background: ${panelHoverBg} !important;
    backdrop-filter: blur(${blurStrength}px) saturate(190%) !important;
    -webkit-backdrop-filter: blur(${blurStrength}px) saturate(190%) !important;
    border-radius: ${Math.min(10, radius > 0 ? radius : 8)}px !important;
    border: 1px solid ${stops[stops.length - 1].color}88 !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
}

.monaco-menu .action-menu-item {
    border-radius: ${Math.min(6, radius > 0 ? radius - 2 : 6)}px !important;
    margin: 2px 4px !important;
}
`;

        // 1. Write custom.css
        await fs.promises.writeFile(customCssPath, cssContent, 'utf-8');

        // 2. Patch workbench.html AND update product.json checksums simultaneously!
        await patchWorkbenchHtmlWithChecksum(cssContent);
    } catch (err) {
        console.error('Failed to update CSS and patch workbench:', err);
    }
}

export async function resetToDefaultSettings() {
    const defaults = getDefaultConfig();
    await applyCustomTheme(defaults);
}
