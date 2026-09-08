import * as vscode from 'vscode';

interface PreviewRecord { scope: string; before: Record<string, unknown>; applied: Record<string, string> }
/** Configuration-only preview. Journal first, restore only values we still own. */
export class WorkbenchPreview {
    constructor(private readonly state: vscode.Memento) {}
    get active(): boolean { return !!this.state.get('workbenchPreview'); }
    async apply(colors: Record<string,string>): Promise<void> {
        await this.revert();
        const config = vscode.workspace.getConfiguration('workbench');
        const theme = config.get<string>('colorTheme', 'Default Dark Modern');
        const scope = '[' + theme + ']';
        const current = { ...(config.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
        const before = Object.fromEntries(Object.keys(colors).map(key => [key, current[scope]?.[key] ?? null]));
        await this.state.update('workbenchPreview', { scope, before, applied: colors });
        await config.update('colorCustomizations', { ...current, [scope]: { ...current[scope], ...colors } }, vscode.ConfigurationTarget.Global);
    }
    async revert(): Promise<void> {
        const record = this.state.get<PreviewRecord>('workbenchPreview');
        if (!record) return;
        const config = vscode.workspace.getConfiguration('workbench');
        const current = { ...(config.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
        if (current[record.scope]) {
            current[record.scope] = { ...current[record.scope] };
            for (const [key, value] of Object.entries(record.applied)) {
                if (current[record.scope][key] !== value) continue;
                if (record.before[key] === null) delete current[record.scope][key];
                else current[record.scope][key] = record.before[key];
            }
            if (!Object.keys(current[record.scope]).length) delete current[record.scope];
            await config.update('colorCustomizations', Object.keys(current).length ? current : undefined, vscode.ConfigurationTarget.Global);
        }
        await this.state.update('workbenchPreview', undefined);
    }
}
