import { readable } from './colors';

export const syntaxRoles = ['variable', 'parameter', 'property', 'keyword', 'function', 'type', 'string', 'number', 'constant', 'operator', 'comment', 'tag', 'attribute', 'heading', 'link', 'text'] as const;
export type SyntaxRole = typeof syntaxRoles[number];
export type SyntaxPalette = Record<SyntaxRole, string>;
export type LanguageOverrides = Record<string, Partial<SyntaxPalette>>;
export const languageScopes: Record<string, string[]> = {
    javascript: ['source.js', 'source.js.jsx'], typescript: ['source.ts', 'source.tsx'],
    python: ['source.python'], dart: ['source.dart'], go: ['source.go'], rust: ['source.rust'],
    java: ['source.java'], c: ['source.c'], cpp: ['source.cpp'], csharp: ['source.cs'],
    php: ['source.php', 'text.html.php'], ruby: ['source.ruby'], swift: ['source.swift'], kotlin: ['source.kotlin'],
    shellscript: ['source.shell'], powershell: ['source.powershell'], sql: ['source.sql'],
    html: ['text.html.basic', 'text.html.vue'], css: ['source.css', 'source.css.scss', 'source.css.less'],
    json: ['source.json', 'source.json.comments'], yaml: ['source.yaml'], toml: ['source.toml'], ini: ['source.ini'],
    markdown: ['text.html.markdown'], dotenv: ['source.dotenv', 'source.dotenv.nitro'], plaintext: ['text.plain', 'text.plain.nitro']
};
const roleScopes: Record<SyntaxRole, string[]> = {
    variable: ['variable.other', 'variable.language', 'entity.name.variable'],
    parameter: ['variable.parameter'], property: ['variable.other.property', 'variable.other.object.property', 'support.type.property-name', 'support.type.property-name.json'],
    keyword: ['keyword.control', 'keyword.other', 'storage.type', 'storage.modifier'],
    function: ['entity.name.function', 'support.function', 'variable.function'],
    type: ['entity.name.type', 'entity.name.class', 'entity.name.namespace', 'support.type', 'support.class'],
    string: ['string', 'string.unquoted'], number: ['constant.numeric'],
    constant: ['constant.language', 'constant.other', 'variable.other.constant', 'variable.other.enummember'],
    operator: ['keyword.operator'], comment: ['comment', 'punctuation.definition.comment'],
    tag: ['entity.name.tag'], attribute: ['entity.other.attribute-name'],
    heading: ['markup.heading', 'entity.name.section'], link: ['markup.underline.link', 'string.other.link', 'markup.link'],
    text: ['text.plain.nitro', 'meta.paragraph.markdown']
};
export function defaultSyntaxPalette(mode: 'dark' | 'light'): SyntaxPalette {
    return mode === 'dark'
        ? { variable: '#8BD5FF', parameter: '#F5C38B', property: '#79E2D0', keyword: '#F49AC2', function: '#C4AEFF', type: '#68D9EF', string: '#ADE580', number: '#FFB870', constant: '#F8D878', operator: '#EDB5FF', comment: '#96A6BB', tag: '#F49AC2', attribute: '#F8D878', heading: '#B7AAFF', link: '#68D9EF', text: '#D8E2EF' }
        : { variable: '#075F9C', parameter: '#97511D', property: '#087765', keyword: '#AA2365', function: '#6941AC', type: '#086B86', string: '#397021', number: '#A34E16', constant: '#806000', operator: '#873DA5', comment: '#596B80', tag: '#AA2365', attribute: '#806000', heading: '#6941AC', link: '#086B86', text: '#25364B' };
}
export function normalizeSyntaxOverrides(input: unknown): LanguageOverrides {
    const result: LanguageOverrides = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
    for (const [language, values] of Object.entries(input)) {
        if (language !== 'all' && !Object.hasOwn(languageScopes, language)) continue;
        if (!values || typeof values !== 'object') continue;
        const palette: Partial<SyntaxPalette> = {};
        for (const role of syntaxRoles) {
            const value = (values as Record<string, unknown>)[role];
            if (typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value)) palette[role] = value;
        }
        if (Object.keys(palette).length) result[language] = palette;
    }
    return result;
}
export function syntaxPalette(mode: 'dark' | 'light', language = 'all', overrides: LanguageOverrides = {}, background = mode === 'dark' ? '#11151d' : '#f8fafc'): SyntaxPalette {
    const palette = defaultSyntaxPalette(mode);
    // A distinct keyword family makes language changes visible without randomizing token meaning.
    const keywordFamilies: Record<string, SyntaxRole> = { javascript: 'constant', typescript: 'keyword', python: 'keyword', dart: 'type', go: 'type', rust: 'number', java: 'operator', c: 'operator', cpp: 'operator', csharp: 'operator', php: 'keyword', ruby: 'keyword', swift: 'number', kotlin: 'function', shellscript: 'function', powershell: 'function', sql: 'type' };
    if (keywordFamilies[language]) palette.keyword = palette[keywordFamilies[language]];
    Object.assign(palette, overrides.all, overrides[language]);
    for (const role of syntaxRoles) palette[role] = readable(palette[role], background);
    return palette;
}
export interface TextMateRule { name: string; scope: string[]; settings: { foreground: string; fontStyle?: string } }
export function buildSyntax(mode: 'dark' | 'light', input: unknown = {}, background?: string) {
    const overrides = normalizeSyntaxOverrides(input);
    const tokenColors: TextMateRule[] = [];
    const semanticTokenColors: Record<string, string | { foreground: string; fontStyle: string }> = {};
    const semanticRoles: Record<string, SyntaxRole> = { variable: 'variable', parameter: 'parameter', property: 'property', keyword: 'keyword', function: 'function', method: 'function', type: 'type', class: 'type', interface: 'type', enum: 'type', struct: 'type', namespace: 'type', typeParameter: 'type', string: 'string', number: 'number', 'variable.readonly': 'constant', enumMember: 'constant', operator: 'operator', comment: 'comment', decorator: 'function', regexp: 'string' };
    for (const language of ['all', ...Object.keys(languageScopes)]) {
        const palette = syntaxPalette(mode, language, overrides, background);
        for (const role of syntaxRoles) {
            const scope = language === 'all' ? roleScopes[role] : languageScopes[language].flatMap(root => roleScopes[role].map(scope => root + ' ' + scope));
            tokenColors.push({ name: `Nitro ${language}: ${role}`, scope, settings: { foreground: palette[role], ...(role === 'comment' ? { fontStyle: 'italic' } : role === 'heading' ? { fontStyle: 'bold' } : {}) } });
        }
        for (const [selector, role] of Object.entries(semanticRoles)) {
            const ids = language === 'typescript' ? ['typescript', 'typescriptreact'] : language === 'javascript' ? ['javascript', 'javascriptreact'] : [language];
            for (const id of ids) semanticTokenColors[selector + (id === 'all' ? '' : ':' + id)] = palette[role];
        }
    }
    const p = syntaxPalette(mode, 'markdown', overrides, background);
    tokenColors.push(
        { name: 'Nitro Markdown emphasis', scope: ['markup.bold.markdown'], settings: { foreground: p.keyword, fontStyle: 'bold' } },
        { name: 'Nitro Markdown italic', scope: ['markup.italic.markdown'], settings: { foreground: p.parameter, fontStyle: 'italic' } },
        { name: 'Nitro Markdown inline code', scope: ['markup.inline.raw.string.markdown', 'markup.raw.inline.markdown'], settings: { foreground: p.string } },
        { name: 'Nitro Markdown quote and list', scope: ['markup.quote.markdown', 'punctuation.definition.list.begin.markdown'], settings: { foreground: p.type } }
    );
    return { semanticHighlighting: true, semanticTokenColors, tokenColors };
}
