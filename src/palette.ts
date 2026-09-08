/** Pure, dependency-free module used unchanged by Node and the customizer Webview. */
export interface PaletteConfig {
    baseColor: string; accentColor: string; surfaceDepth: number; contrast: number;
    accentIntensity: number; inactiveFade: number; borderVisibility: number;
    activeTabIndicator: 'top' | 'bottom' | 'side'; themeMode: 'dark' | 'light';
}
export const paletteDefaults: PaletteConfig = {
    baseColor: '#120D24', accentColor: '#22D3EE', surfaceDepth: 1, contrast: 1,
    accentIntensity: 1, inactiveFade: 0.5, borderVisibility: 0.5,
    activeTabIndicator: 'top', themeMode: 'dark'
};
export const presets = [
    { name: 'Nitro Aqua', baseColor: '#120D24', accentColor: '#22D3EE', character: 'Fresh · technical' },
    { name: 'Mint', baseColor: '#110E24', accentColor: '#2DD4BF', character: 'Calm · modern' },
    { name: 'Electric Violet', baseColor: '#100C20', accentColor: '#A78BFA', character: 'Tonal · elegant' },
    { name: 'Nitro Pink', baseColor: '#130B22', accentColor: '#E879F9', character: 'Expressive · energetic' },
    { name: 'Electric Blue', baseColor: '#0F1024', accentColor: '#60A5FA', character: 'Clean · precise' }
];
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export function normalizePalette(input: Partial<PaletteConfig> = {}): PaletteConfig {
    const cfg = { ...paletteDefaults, ...input };
    for (const key of ['baseColor', 'accentColor'] as const) cfg[key] = typeof cfg[key] === 'string' && /^#[a-f\d]{6}$/i.test(cfg[key]) ? cfg[key].toUpperCase() : paletteDefaults[key];
    for (const [key, min, max] of [['surfaceDepth', 0, 2], ['contrast', 0.7, 1.3], ['accentIntensity', 0.2, 1.5], ['inactiveFade', 0, 1], ['borderVisibility', 0, 1]] as const) cfg[key] = typeof cfg[key] === 'number' && Number.isFinite(cfg[key]) ? clamp(cfg[key], min, max) : paletteDefaults[key];
    cfg.themeMode = cfg.themeMode === 'light' ? 'light' : 'dark';
    cfg.activeTabIndicator = ['top', 'bottom', 'side'].includes(cfg.activeTabIndicator) ? cfg.activeTabIndicator : 'top';
    return cfg;
}
type Lab = [number, number, number];
type Lch = [number, number, number];
function linear(hex: string): number[] {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
}
export function toLab(hex: string): Lab {
    const [r, g, b] = linear(hex);
    const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
    const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
    const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
    return [0.2104542553*l + 0.793617785*m - 0.0040720468*s, 1.9779984951*l - 2.428592205*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.808675766*s];
}
export function toLch(hex: string): Lch {
    const [l, a, b] = toLab(hex); return [l, Math.hypot(a, b), Math.atan2(b, a)];
}
function labRgb([l, a, b]: Lab): number[] {
    const x = (l + 0.3963377774*a + 0.2158037573*b) ** 3;
    const y = (l - 0.1055613458*a - 0.0638541728*b) ** 3;
    const z = (l - 0.0894841775*a - 1.291485548*b) ** 3;
    return [4.0767416621*x - 3.3077115913*y + 0.2309699292*z, -1.2684380046*x + 2.6097574011*y - 0.3413193965*z, -0.0041960863*x - 0.7034186147*y + 1.707614701*z];
}
/** Gamut map by reducing chroma at fixed hue/lightness, never clipping RGB channels independently. */
export function fromLch([lightness, chroma, hue]: Lch): string {
    const l = clamp(lightness); let lo = 0, hi = Math.max(0, chroma);
    let rgb = labRgb([l, hi*Math.cos(hue), hi*Math.sin(hue)]);
    if (rgb.some(v => v < -0.000001 || v > 1.000001)) {
        for (let i = 0; i < 22; i++) {
            const c = (lo + hi)/2, candidate = labRgb([l, c*Math.cos(hue), c*Math.sin(hue)]);
            if (candidate.every(v => v >= -0.000001 && v <= 1.000001)) lo = c; else hi = c;
        }
        rgb = labRgb([l, lo*Math.cos(hue), lo*Math.sin(hue)]);
    }
    return '#' + rgb.map(v => Math.round(255*clamp(v <= 0.0031308 ? 12.92*v : 1.055* Math.max(0,v)**(1/2.4) - 0.055)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function perceptualMix(a: string, b: string, weight: number): string {
    const x = toLab(a), y = toLab(b), v = x.map((n, i) => n*(1-weight) + y[i]*weight);
    return fromLch([v[0], Math.hypot(v[1], v[2]), Math.atan2(v[2], v[1])]);
}
export function contrastRatio(a: string, b: string): number {
    const lum = (hex: string) => { const c = linear(hex); return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722; };
    const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
function readableIndicator(color: string, backgrounds: string[], minimum = 3): string {
    const [l,c,h] = toLch(color);
    const target = contrastRatio('#FFFFFF', backgrounds[0]) > contrastRatio('#000000', backgrounds[0]) ? 1 : 0;
    for (let i = 0; i <= 100; i++) {
        const candidate = fromLch([l+(target-l)*i/100,c,h]);
        if (backgrounds.every(bg => contrastRatio(candidate,bg) >= minimum)) return candidate;
    }
    return target ? '#FFFFFF' : '#000000';
}
export function derivePalette(input: Partial<PaletteConfig>): Record<string, string> {
    const cfg = normalizePalette(input);
    const base = cfg.baseColor;
    const [l,c,h] = toLch(base), light = l > 0.6, direction = light ? -1 : 1;
    const p: Record<string,string> = {};
    const offsets = [-0.022, 0, 0.022, 0.038, 0.028, 0.062];
    offsets.forEach((offset,i) => { p['base-'+i] = fromLch([l+direction*offset*cfg.surfaceDepth, c*(1+offset*2), h]); });
    const text = (level: number, chroma: number) => fromLch([light ? 1-level : level, Math.min(c*0.4, chroma), h]);
    p['fg-primary'] = text(clamp(0.963+(cfg.contrast-1)*0.10,0.85,0.99), 0.018);
    p['fg-secondary'] = text(clamp(0.81+(cfg.contrast-1)*0.14,0.65,0.9), 0.023);
    p['fg-muted'] = text(clamp(0.74-cfg.inactiveFade*0.19+(cfg.contrast-1)*0.15,0.40,0.86), 0.016);
    p['fg-disabled'] = text(light ? 0.49 : 0.44, 0.012);
    const [al,ac,ah] = toLch(cfg.accentColor);
    const rawAccent = fromLch([al+(cfg.accentIntensity-1)*0.06, ac*cfg.accentIntensity, ah]);
    p.accent = readableIndicator(rawAccent,[p['base-1'],p['base-2'],p['base-4']]);
    const [il,ic,ih] = toLch(p.accent);
    p['accent-bright'] = fromLch([il+direction*0.09,ic*0.8,ih]);
    p['accent-muted'] = fromLch([il-direction*0.06,ic*0.45,ih]);
    p['accent-subtle'] = perceptualMix(p['base-2'],p.accent,0.085);
    p['accent-hover'] = perceptualMix(p['base-2'],p.accent,0.035);
    p['accent-border'] = p.accent;
    p['border-subtle'] = fromLch([l+direction*(0.025+cfg.borderVisibility*0.10),c*0.8,h]);
    p['border-normal'] = fromLch([l+direction*(0.045+cfg.borderVisibility*0.16),c*0.8,h]);
    p['border-focus'] = p.accent;
    p.selection = p['accent-subtle']; p.hover = p['accent-hover'];
    p.active = p.accent; p.focus = p['border-focus'];
    return p;
}
/** Explicit semantic role → supported VS Code token mapping. */
export function workbenchColors(input: Partial<PaletteConfig> & { borderEnabled?: boolean; borderWidth?: number }, p = derivePalette(input)): Record<string,string> {
    const cfg = normalizePalette(input), t: Record<string,string> = {}, transparent = '#00000000';
    const assign = (role: string, tokens: string[]) => tokens.forEach(token => { t[token] = p[role]; });
    assign('base-0', ['titleBar.activeBackground','titleBar.inactiveBackground','statusBar.background','statusBar.noFolderBackground','statusBar.debuggingBackground']);
    assign('base-1', ['activityBar.background','activityBarTop.background','panel.background','terminal.background']);
    assign('base-2', ['sideBar.background','sideBarSectionHeader.background','sideBarTitle.background','sideBarStickyScroll.background','editorGroupHeader.tabsBackground','editorGroupHeader.noTabsBackground','tab.activeBackground','tab.inactiveBackground','tab.unfocusedActiveBackground','tab.unfocusedInactiveBackground','tab.selectedBackground']);
    assign('base-4', ['editor.background','editorGutter.background','editorPane.background','editorGroup.emptyBackground','minimap.background','editorStickyScroll.background','breadcrumb.background','peekViewEditor.background','peekViewResult.background']);
    assign('base-5', ['editorHoverWidget.background','editorWidget.background','editorSuggestWidget.background','input.background','dropdown.background','quickInput.background','menu.background','notifications.background']);
    assign('fg-primary', ['foreground','editor.foreground','terminal.foreground','titleBar.activeForeground','tab.activeForeground','tab.selectedForeground','panelTitle.activeForeground','list.activeSelectionForeground','list.inactiveSelectionForeground','list.focusForeground','sideBarTitle.foreground','sideBarSectionHeader.foreground','editorHoverWidget.foreground','editorSuggestWidget.foreground','input.foreground','dropdown.foreground','quickInput.foreground','menu.foreground','notifications.foreground']);
    assign('fg-secondary', ['sideBar.foreground','tab.unfocusedActiveForeground','tab.hoverForeground','tab.unfocusedHoverForeground','list.hoverForeground','statusBar.foreground','statusBar.debuggingForeground','breadcrumb.foreground','peekViewResult.fileForeground','peekViewResult.lineForeground','editorLineNumber.activeForeground']);
    assign('fg-muted', ['descriptionForeground','editorLineNumber.foreground','tab.inactiveForeground','tab.unfocusedInactiveForeground','titleBar.inactiveForeground','activityBar.inactiveForeground','activityBarTop.inactiveForeground','panelTitle.inactiveForeground','input.placeholderForeground']);
    assign('fg-disabled', ['disabledForeground']);
    assign('accent', ['activityBar.foreground','activityBarTop.foreground','activityBar.activeBorder','activityBarTop.activeBorder','activityBar.activeFocusBorder','panelTitle.activeBorder','focusBorder','editorCursor.foreground','terminalCursor.foreground','progressBar.background','textLink.foreground','textLink.activeForeground','list.highlightForeground','editorSuggestWidget.highlightForeground','button.border','inputOption.activeBorder']);
    assign('border-subtle', ['titleBar.border','activityBar.border','sideBar.border','sideBarSectionHeader.border','panel.border','statusBar.border','editorGroup.border','editorGroupHeader.tabsBorder','editorWidget.border','editorHoverWidget.border','editorSuggestWidget.border','widget.border','input.border','dropdown.border','menu.border','notifications.border','peekView.border','tree.indentGuidesStroke','tree.inactiveIndentGuidesStroke','editorIndentGuide.background1']);
    assign('border-normal', ['editorIndentGuide.activeBackground1','list.focusOutline','list.focusAndSelectionOutline','list.inactiveFocusOutline']);
    assign('accent-hover', ['tab.hoverBackground','tab.unfocusedHoverBackground','list.hoverBackground','toolbar.hoverBackground','statusBarItem.hoverBackground']);
    assign('accent-subtle', ['list.activeSelectionBackground','list.focusBackground','list.inactiveSelectionBackground','list.inactiveFocusBackground','toolbar.activeBackground','inputOption.activeBackground','button.secondaryBackground']);
    t['editor.selectionBackground'] = perceptualMix(p['base-4'],p.accent,0.16);
    t['editor.inactiveSelectionBackground'] = p.accent+'18';
    t['editor.selectionHighlightBackground'] = p.accent+'12';
    t['editorSuggestWidget.selectedBackground'] = p.selection;
    for (const token of ['tab.border','tab.hoverBorder','tab.unfocusedHoverBorder','activityBar.activeBackground','activityBarTop.activeBackground','scrollbar.shadow','editorStickyScroll.shadow']) t[token] = transparent;
    // No supported side-border token exists. Side Line is preview-only; export uses Top Line.
    const bottom = cfg.activeTabIndicator === 'bottom';
    t['tab.activeBorderTop'] = bottom ? transparent : p['accent-border'];
    t['tab.activeBorder'] = bottom ? p['accent-border'] : transparent;
    t['tab.unfocusedActiveBorderTop'] = bottom ? transparent : p['accent-muted'];
    t['tab.unfocusedActiveBorder'] = bottom ? p['accent-muted'] : transparent;
    t['tab.selectedBorderTop'] = t['tab.activeBorderTop'];
    for (const token of ['tab.activeModifiedBorder','tab.inactiveModifiedBorder','tab.unfocusedActiveModifiedBorder','tab.unfocusedInactiveModifiedBorder']) t[token] = transparent;
    for (const prefix of ['button','badge','activityBarBadge']) {
        t[prefix+'.background'] = p.accent;
        t[prefix+'.foreground'] = contrastRatio('#000000',p.accent) > contrastRatio('#FFFFFF',p.accent) ? '#000000' : '#FFFFFF';
    }
    t['button.hoverBackground'] = p['accent-bright'];
    t['button.secondaryForeground'] = p['fg-primary'];
    t['button.secondaryHoverBackground'] = p.hover;
    t['statusBarItem.remoteBackground'] = p['base-1']; t['statusBarItem.remoteForeground'] = p.accent;
    // Textual search matches need the text threshold, unlike thin navigation indicators.
    t['editorSuggestWidget.highlightForeground'] = readableIndicator(p.accent,[p['base-4'],p['base-5']],4.5);
    // Registered Modern UI tokens in 1.136.1. Native layout owns indicator geometry.
    assign('base-2', ['surface.background','modernEditorTab.activeBackground','modernEditorTab.inactiveBackground','modernEditorTab.activeActionBackground','modernEditorTab.selectedActionBackground']);
    assign('base-1', ['modernActivityBar.background','modernActivityBar.inactiveBackground']);
    assign('fg-primary', ['modernTab.activeForeground','modernEditorTab.activeForeground']);
    assign('fg-secondary', ['surface.foreground','modernTab.hoverForeground','modernEditorTab.hoverForeground','modernActivityBarItem.hoverForeground']);
    assign('accent', ['modernActivityBarItem.activeForeground']);
    assign('border-subtle', ['surface.border','editor.border','modernActivityBar.border']);
    assign('accent-hover', ['modernTab.hoverBackground','modernEditorTab.hoverBackground','modernEditorTab.activeHoverBackground','modernEditorTab.hoverActionBackground','modernEditorTab.activeHoverActionBackground','modernActivityBarItem.hoverBackground']);
    t['modernTab.activeBackground'] = transparent;
    t['modernActivityBarItem.activeBackground'] = transparent;
    assign('base-5', ['editorHoverWidget.statusBarBackground','quickInputTitle.background','notificationCenterHeader.background','peekViewTitle.background','keybindingLabel.background']);
    assign('fg-primary', ['editorSuggestWidget.selectedForeground','keybindingLabel.foreground']);
    assign('accent', ['breadcrumb.focusForeground','breadcrumb.activeSelectionForeground','editorWidget.resizeBorder','pickerGroup.foreground']);
    assign('border-subtle', ['pickerGroup.border','notificationToast.border','keybindingLabel.border']);
    t['selection.background'] = p.accent+'30';
    t['editor.wordHighlightBackground'] = p.accent+'18';
    t['editor.findMatchBackground'] = p.accent+'38';
    t['editor.findMatchHighlightBackground'] = p.accent+'20';
    t['editor.lineHighlightBackground'] = p['base-5']+'60';
    t['editor.lineHighlightBorder'] = transparent;
    if (input.borderEnabled === false || input.borderWidth === 0) {
        for (const key of Object.keys(t)) if (/^(sideBar|activityBar|panel|statusBar|titleBar|editorGroup|editorGroupHeader|widget|editorWidget|editorHoverWidget|editorSuggestWidget|input|dropdown|menu|notifications|peekView)\.(border|tabsBorder)$/.test(key)) t[key] = transparent;
    }
    return t;
}
export function diagnostics(p: Record<string,string>): Array<{ label: string; value: string; warning: boolean }> {
    const active = Math.min(contrastRatio(p['fg-primary'],p['base-4']),contrastRatio(p['fg-primary'],p['base-2']));
    const inactive = contrastRatio(p['fg-muted'],p['base-2']);
    const accent = contrastRatio(p.accent,p['base-1']);
    const border = contrastRatio(p['border-normal'],p['base-2']);
    return [
        { label: 'Active text', value: `${active.toFixed(1)}:1 · ${active >= 4.5 ? 'AA ✓' : 'Low contrast'}`, warning: active < 4.5 },
        { label: 'Inactive text', value: `${inactive.toFixed(1)}:1 · ${inactive >= 4.5 ? 'AA ✓' : 'Low contrast'}`, warning: inactive < 4.5 },
        { label: 'Accent indicator', value: `${accent.toFixed(1)}:1 · ${accent >= 3 ? 'Good' : 'Too faint'}`, warning: accent < 3 },
        { label: 'Borders', value: border < inactive && border < 3 ? 'Subtle' : 'Compete with text', warning: border >= inactive || border >= 3 },
        { label: 'Hover tint', value: toLch(p.hover)[1] <= Math.max(0.08,toLch(p['base-2'])[1]+0.025) ? 'Calm' : 'Too saturated', warning: toLch(p.hover)[1] > Math.max(0.08,toLch(p['base-2'])[1]+0.025) }
    ];
}
