import * as vscode from 'vscode';
import { buildSyntax, LanguageOverrides } from './syntax';

interface RecordState { before: any; applied: any }
type Ownership = Record<string, Record<string, RecordState>>;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const settings = ['tokenColorCustomizations', 'semanticTokenColorCustomizations'] as const;
export class TokenSettings {
    constructor(private readonly state: vscode.Memento) {}
    async apply(mode: 'dark' | 'light', overrides: LanguageOverrides, background: string | string[]): Promise<void> {
        const syntax = buildSyntax(mode, overrides, background);
        const scope = mode === 'dark' ? '[Gradient Nitro Glass]' : '[Gradient Nitro Glass Light]';
        const editor = vscode.workspace.getConfiguration('editor');
        const owned: Ownership = JSON.parse(JSON.stringify(this.state.get<Ownership>('ownedSyntax') || {}));
        for (const key of settings) {
            const colors = { ...(editor.inspect<Record<string, any>>(key)?.globalValue || {}) };
            const current = { ...colors[scope] };
            const previous = owned[key]?.[scope];
            let before = { ...current };
            if (previous) before = this.remove(current, previous, key);
            const applied = key === 'tokenColorCustomizations'
                ? { ...before, textMateRules: [...(before.textMateRules || []), ...syntax.tokenColors] }
                : { ...before, enabled: true, rules: { ...before.rules, ...syntax.semanticTokenColors } };
            owned[key] = { ...owned[key], [scope]: { before, applied } };
            await this.state.update('ownedSyntax', JSON.parse(JSON.stringify(owned)));
            await editor.update(key, { ...colors, [scope]: applied }, vscode.ConfigurationTarget.Global);
        }
    }
    private remove(current: any, previous: RecordState, key: typeof settings[number]): any {
        if (equal(current, previous.applied)) return { ...previous.before };
        const result = { ...current };
        if (key === 'tokenColorCustomizations') {
            // Remove only exact generated rules, preserving subsequent user additions/edits.
            const generated = previous.applied.textMateRules.filter((rule: any) => !(previous.before.textMateRules || []).some((old: any) => equal(old, rule)));
            if (Array.isArray(result.textMateRules)) result.textMateRules = result.textMateRules.filter((rule: any) => !generated.some((old: any) => equal(old, rule)));
            if (!result.textMateRules?.length && !previous.before.textMateRules) delete result.textMateRules;
        } else {
            if (result.enabled === previous.applied.enabled) {
                if (previous.before.enabled === undefined) delete result.enabled; else result.enabled = previous.before.enabled;
            }
            result.rules = { ...result.rules };
            for (const [selector, value] of Object.entries(previous.applied.rules)) {
                if (!equal(result.rules[selector], value)) continue;
                if (previous.before.rules?.[selector] === undefined) delete result.rules[selector]; else result.rules[selector] = previous.before.rules[selector];
            }
            if (!Object.keys(result.rules).length && !previous.before.rules) delete result.rules;
        }
        return result;
    }
    async restore(): Promise<void> {
        const owned = this.state.get<Ownership>('ownedSyntax') || {};
        const editor = vscode.workspace.getConfiguration('editor');
        for (const key of settings) {
            const colors = { ...(editor.inspect<Record<string, any>>(key)?.globalValue || {}) };
            for (const [scope, previous] of Object.entries(owned[key] || {})) {
                if (!colors[scope]) continue;
                colors[scope] = this.remove(colors[scope], previous, key);
                if (!Object.keys(colors[scope]).length) delete colors[scope];
            }
            if (owned[key]) await editor.update(key, Object.keys(colors).length ? colors : undefined, vscode.ConfigurationTarget.Global);
        }
        await this.state.update('ownedSyntax', undefined);
    }
}
