import * as vscode from 'vscode';
import * as path from 'path';

export const fileFamilies: Record<string, { extensions: string[]; dark: string; light: string }> = {
    javascript: { extensions: ['.js', '.jsx', '.mjs', '.cjs'], dark: '#F8D878', light: '#806000' },
    typescript: { extensions: ['.ts', '.tsx', '.mts', '.cts'], dark: '#8BD5FF', light: '#075F9C' },
    python: { extensions: ['.py', '.pyi'], dark: '#ADE580', light: '#397021' },
    dart: { extensions: ['.dart'], dark: '#68D9EF', light: '#086B86' },
    systems: { extensions: ['.rs', '.go', '.c', '.h', '.cpp', '.hpp'], dark: '#FFB870', light: '#A34E16' },
    application: { extensions: ['.java', '.kt', '.cs', '.swift', '.php', '.rb'], dark: '#C4AEFF', light: '#6941AC' },
    markup: { extensions: ['.html', '.vue', '.svelte', '.xml'], dark: '#F49AC2', light: '#AA2365' },
    styles: { extensions: ['.css', '.scss', '.sass', '.less'], dark: '#EDB5FF', light: '#873DA5' },
    data: { extensions: ['.json', '.jsonc', '.yaml', '.yml', '.toml', '.ini', '.sql'], dark: '#79E2D0', light: '#087765' },
    markdown: { extensions: ['.md', '.mdx'], dark: '#B7AAFF', light: '#6941AC' },
    environment: { extensions: ['.env', '.sh', '.bash', '.zsh', '.ps1'], dark: '#F5C38B', light: '#97511D' },
    text: { extensions: ['.txt', '.text', '.log'], dark: '#D8E2EF', light: '#25364B' }
};
export function fileFamily(filename: string): string | undefined {
    const name = path.posix.basename(filename.replace(/\\/g, '/')).toLowerCase();
    if (name === '.env' || name.startsWith('.env.')) return 'environment';
    return Object.keys(fileFamilies).find(family => fileFamilies[family].extensions.includes(path.posix.extname(name)));
}
export class FileColors implements vscode.FileDecorationProvider, vscode.Disposable {
    private readonly changed = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations = this.changed.event;
    refresh(): void { this.changed.fire(undefined); }
    async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
        const theme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
        if (!['Gradient Nitro Glass', 'Gradient Nitro Glass Light'].includes(theme || '') || !vscode.workspace.getConfiguration('gradientNitro').get('fileColors', true)) return;
        const family = fileFamily(uri.path);
        if (!family) return;
        try { if ((await vscode.workspace.fs.stat(uri)).type & vscode.FileType.Directory) return; } catch { return; }
        return { color: new vscode.ThemeColor('gradientNitro.file.' + family), tooltip: 'Nitro · ' + family, propagate: false };
    }
    dispose(): void { this.changed.dispose(); }
}
