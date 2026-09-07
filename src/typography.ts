import * as vscode from 'vscode';
import type { ThemeConfig } from './extension';
export const fontKeys = ['fontFamily', 'fontSize', 'lineHeight', 'fontLigatures', 'fontWeight'] as const;
type Owned = Record<string, { before: unknown; applied: unknown }>;
export class Typography {
    constructor(private readonly state: vscode.Memento) {}
    async apply(cfg: ThemeConfig) {
        const owned: Owned = JSON.parse(JSON.stringify(this.state.get<Owned>('ownedTypography') || {}));
        for (const key of fontKeys) {
            const editor = vscode.workspace.getConfiguration('editor');
            const setting = editor.inspect(key);
            if (setting?.workspaceValue !== undefined || setting?.workspaceFolderValue !== undefined) continue;
            const current = setting?.globalValue;
            const before = owned[key] && current === owned[key].applied ? owned[key].before : current ?? null;
            owned[key] = { before, applied: cfg[key] };
            await this.state.update('ownedTypography', JSON.parse(JSON.stringify(owned)));
            await editor.update(key, cfg[key], vscode.ConfigurationTarget.Global);
        }
    }
    async restore() {
        const owned = this.state.get<Owned>('ownedTypography') || {};
        for (const [key, value] of Object.entries(owned)) {
            const editor = vscode.workspace.getConfiguration('editor');
            if (editor.inspect(key)?.globalValue === value.applied) await editor.update(key, value.before ?? undefined, vscode.ConfigurationTarget.Global);
        }
        await this.state.update('ownedTypography', undefined);
    }
}
