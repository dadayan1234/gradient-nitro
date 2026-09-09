import * as vscode from 'vscode';
import type { ThemeConfig } from './config';
import { presets } from './palette';

/** Native sidebar launcher/status view. Theme Studio remains an editor Webview. */
export class NitroActivityView implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable {
    private readonly changed = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.changed.event;
    constructor(private readonly read: () => ThemeConfig, private readonly runtimeActive: () => boolean) {}
    refresh() { this.changed.fire(); }
    getTreeItem(item: vscode.TreeItem) { return item; }
    getChildren() {
        const cfg = this.read();
        const preset = presets.find(p => p.baseColor === cfg.baseColor && p.accentColor === cfg.accentColor);
        const item = (label: string, description?: string, command?: string) => {
            const row = new vscode.TreeItem(label);
            row.description = description;
            if (command) row.command = { command, title: label };
            return row;
        };
        return [
            item('Theme Studio', preset?.name || 'Custom'),
            item('Base', cfg.baseColor), item('Accent', cfg.accentColor),
            item('Runtime effects', this.runtimeActive() ? 'Active' : cfg.workbenchEffects ? 'Waiting for runtime' : 'Disabled'),
            item('Open Theme Studio', undefined, 'gradientNitro.openCustomizer'),
            item('Save and Apply Configuration', undefined, 'gradientNitro.saveAndApply'),
            item('Apply Saved Theme', undefined, 'gradientNitro.applySaved'),
            item('Preview Saved Theme', undefined, 'gradientNitro.previewSaved'),
            item('Revert Preview', undefined, 'gradientNitro.revertPreview')
        ];
    }
    dispose() { this.changed.dispose(); }
}
