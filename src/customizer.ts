import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import type * as vscode from 'vscode';
import type { ThemeConfig } from './extension';
import { syntaxPalette, syntaxRoles, languageScopes } from './syntax';
import { syntaxSamples } from './samples';

/** One small Webview, using the exact compiled palette module loaded by the extension. */
export function customizerHtml(config: ThemeConfig, defaults: ThemeConfig, webview?: vscode.Webview, extensionUri?: vscode.Uri): string {
    const media = path.join(__dirname, '..', 'media');
    const nonce = randomBytes(24).toString('base64');
    const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
    const syntax = { roles: syntaxRoles, samples: syntaxSamples, palettes: Object.fromEntries(['dark','light'].map(mode => [mode, Object.fromEntries(['all', ...Object.keys(languageScopes)].map(language => [language, syntaxPalette(mode as 'dark' | 'light', language)]))])) };
    const engine = fs.readFileSync(path.join(__dirname, 'palette.js'), 'utf8');
    const configEngine = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
    const colorsEngine = fs.readFileSync(path.join(__dirname, 'colors.js'), 'utf8');
    const syntaxEngine = fs.readFileSync(path.join(__dirname, 'syntax.js'), 'utf8');
    const css = fs.readFileSync(path.join(media, 'customizer.css'), 'utf8');
    const script = fs.readFileSync(path.join(media, 'customizer.js'), 'utf8');
    const html = fs.readFileSync(path.join(media, 'customizer.html'), 'utf8');

    let logoUri = '';
    if (webview && typeof webview.asWebviewUri === 'function' && extensionUri && typeof extensionUri === 'object') {
        try {
            // @ts-ignore
            logoUri = webview.asWebviewUri(extensionUri.with ? extensionUri.with({ path: path.join(extensionUri.fsPath, 'icon.png') }) : (vscode.Uri ? vscode.Uri.joinPath(extensionUri, 'icon.png') : '')).toString();
        } catch {
            logoUri = '';
        }
    }
    if (!logoUri) {
        try {
            const iconPath = path.join(__dirname, '..', 'icon.png');
            if (fs.existsSync(iconPath)) {
                const b64 = fs.readFileSync(iconPath).toString('base64');
                logoUri = `data:image/png;base64,${b64}`;
            }
        } catch {
            logoUri = '';
        }
    }

    const cspSource = webview?.cspSource || 'vscode-webview:';
    const headMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><style>${css}</style>`;

    return html.replace('<!--HEAD-->', headMeta)
        .replace(/<!--LOGO_URI-->/g, logoUri)
        .replace('<!--SCRIPT-->', `<script nonce="${nonce}">const initialConfig=${json(config)}; const defaultConfig=${json(defaults)}; const syntaxData=${json(syntax)}; const engine=(()=>{const exports={};\n${engine}\nreturn exports;})();\nconst syntaxEngine=(()=>{const exports={}; const require=()=>{const exports={};\n${colorsEngine}\nreturn exports;};\n${syntaxEngine}\nreturn exports;})();\nconst configEngine=(()=>{const exports={}; const require=name=>name==='./palette'?engine:syntaxEngine;\n${configEngine}\nreturn exports;})();\n${script}</script>`);
}
