import * as vscode from 'vscode';

type OwnedSetting = { before: boolean | null; applied: boolean };
/** Native Modern UI is a global layout preference, so keep a recoverable ownership record. */
export class NativeLayout {
    constructor(private readonly state: vscode.Memento) {}
    get available(): boolean {
        return typeof vscode.workspace.getConfiguration('workbench').inspect<boolean>('experimental.modernUI')?.defaultValue === 'boolean';
    }
    async apply(rounded: boolean, shadows: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration('workbench');
        const owned = { ...(this.state.get<Record<string, OwnedSetting>>('nativeLayout') || {}) };
        for (const [key, applied] of Object.entries({ 'experimental.modernUI': rounded, shadows })) {
            const inspected = config.inspect<boolean>(key);
            if (typeof inspected?.defaultValue !== 'boolean') continue;
            // A workspace policy wins; never copy it into user settings.
            if (inspected.workspaceValue !== undefined || inspected.workspaceFolderValue !== undefined) continue;
            const current = inspected.globalValue;
            if (!owned[key] && config.get(key) === applied) continue;
            const before = owned[key] && current === owned[key].applied ? owned[key].before : current ?? null;
            owned[key] = { before, applied };
            await this.state.update('nativeLayout', owned);
            await config.update(key, applied, vscode.ConfigurationTarget.Global);
        }
    }
    async restore(): Promise<void> {
        const config = vscode.workspace.getConfiguration('workbench');
        const owned = this.state.get<Record<string, OwnedSetting>>('nativeLayout') || {};
        for (const [key, value] of Object.entries(owned)) {
            if (config.inspect<boolean>(key)?.globalValue === value.applied) await config.update(key, value.before ?? undefined, vscode.ConfigurationTarget.Global);
        }
        await this.state.update('nativeLayout', undefined);
    }
}
