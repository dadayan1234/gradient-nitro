import * as path from 'path';
import * as vscode from 'vscode';
import { RuntimeSession, installRuntime } from './runtime';
import { buildEffects } from './effects';
import type { ThemeConfig } from './extension';

export interface RuntimeJournal {
    active: boolean;
    installed: boolean;
    marker?: string;
    timestamp: number;
}

let activeSession: RuntimeSession | undefined;

/** End the renderer stream on reload without uninstalling the opted-in loader. */
export async function suspendWorkbenchRuntime(): Promise<void> {
    if (activeSession) await activeSession.stop();
    activeSession = undefined;
}

export function getRuntimeSession(): RuntimeSession {
    if (!activeSession) {
        activeSession = new RuntimeSession();
    }
    return activeSession;
}

export async function syncWorkbenchRuntime(
    context: vscode.ExtensionContext,
    cfg: ThemeConfig
): Promise<{ installed: boolean; marker?: string }> {
    const session = getRuntimeSession();
    const appRoot = vscode.env?.appRoot;
    const extensionRoot = context?.extensionUri?.fsPath || '';
    const backupRoot = context?.globalStorageUri?.fsPath ? path.join(context.globalStorageUri.fsPath, 'runtime-backups') : '';

    if (!cfg.workbenchEffects) {
        await revertWorkbenchRuntime(context);
        return { installed: false };
    }

    if (!appRoot) {
        if (context?.globalState) {
            await context.globalState.update('workbenchRuntimeJournal', {
                active: true,
                installed: false,
                marker: 'test-environment',
                timestamp: Date.now()
            });
        }
        return { installed: false };
    }

    try {
        const changed = await installRuntime(appRoot, extensionRoot, backupRoot, true);
        await session.start();
        session.update(buildEffects(cfg), cfg.themeMode === 'light', cfg);

        const wb = vscode.workspace.getConfiguration('workbench');
        const colors = { ...(wb.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
        const scope = cfg.themeMode === 'light' ? '[Gradient Nitro Glass Light]' : '[Gradient Nitro Glass]';
        colors[scope] = { ...colors[scope], 'gradientNitro.runtime': session.marker };
        await wb.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);

        const journal: RuntimeJournal = {
            active: true,
            installed: true,
            marker: session.marker,
            timestamp: Date.now()
        };
        await context?.globalState?.update('workbenchRuntimeJournal', journal);

        if (changed) {
            void vscode.window.showInformationMessage('Gradient Nitro: Workbench effects installed. Reload Window once to enable live gradients and blur.', 'Reload Window').then(choice => {
                if (choice === 'Reload Window') void vscode.commands.executeCommand('workbench.action.reloadWindow');
            });
        }

        return { installed: true, marker: session.marker };
    } catch (error) {
        console.error('Gradient Nitro workbench runtime failed to sync:', error);
        // Rollback session safely
        await session.stop();
        throw error;
    }
}

export async function revertWorkbenchRuntime(
    context?: vscode.ExtensionContext
): Promise<void> {
    if (activeSession) {
        await activeSession.stop();
        activeSession = undefined;
    }

    try {
        const wb = vscode.workspace.getConfiguration('workbench');
        const colors = { ...(wb.inspect<Record<string, any>>('colorCustomizations')?.globalValue || {}) };
        let updated = false;
        for (const scope of ['[Gradient Nitro Glass]', '[Gradient Nitro Glass Light]']) {
            if (colors[scope] && colors[scope]['gradientNitro.runtime']) {
                const nextScope = { ...colors[scope] };
                delete nextScope['gradientNitro.runtime'];
                colors[scope] = nextScope;
                updated = true;
            }
        }
        if (updated) {
            await wb.update('colorCustomizations', colors, vscode.ConfigurationTarget.Global);
        }
    } catch {
        // Ignore settings update failures in headless test runners
    }

    const appRoot = vscode.env?.appRoot;
    if (context) {
        if (appRoot) {
            const extensionRoot = context?.extensionUri?.fsPath || '';
            const backupRoot = context?.globalStorageUri?.fsPath ? path.join(context.globalStorageUri.fsPath, 'runtime-backups') : '';
            try {
                await installRuntime(appRoot, extensionRoot, backupRoot, false);
            } catch (error) {
                console.error('Gradient Nitro workbench runtime cleanup warning:', error);
            }
        }
        await context?.globalState?.update('workbenchRuntimeJournal', undefined);
    }
}
