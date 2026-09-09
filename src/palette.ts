export interface GradientColorStop {
    id: string;
    color: string;
    position: number; // 0 to 100
    opacity: number;  // 0 to 1
    softness: number; // 0 to 1
}
export interface PaletteConfig {
    borderColor: string; borderWidth: number; borderEnabled: boolean;
    roundedCorners: boolean; borderRadius: number;
    baseColor: string; accentColor: string; surfaceDepth: number; contrast: number;
    accentIntensity: number; inactiveFade: number; borderVisibility: number;
    activeTabIndicator: 'top' | 'bottom' | 'side'; themeMode: 'dark' | 'light';
    gradientEnabled: boolean; gradientStrength: number; gradientSoftness: number;
    editorSoftlight: number; softlightSpread: number; gradientAngle: number;
    gradientMode: 'auto' | 'custom';
    gradientStops: GradientColorStop[];
    softlightEnabled: boolean;
    softlightSoftness: number;
    softlightMode: 'auto' | 'accent' | 'custom';
    softlightColor: string;
    glassEnabled: boolean;
    glassBlur: number;
    glassOpacity: number;
    glassSaturation: number;
    neonEnabled: boolean;
    neonColorMode: 'auto' | 'custom';
    neonCustomColor: string;
    neonStrength: number;
    neonRadius: number;
    neonOpacity: number;
    motionEnabled: boolean;
    motionStrength: number;
    motionSpring: number;
}
export const paletteDefaults: PaletteConfig = {
    borderColor: '#64748B', borderWidth: 1, borderEnabled: true,
    roundedCorners: false, borderRadius: 12,
    baseColor: '#120D24', accentColor: '#22D3EE', surfaceDepth: 1, contrast: 1,
    accentIntensity: 1, inactiveFade: 0.5, borderVisibility: 0.5,
    activeTabIndicator: 'top', themeMode: 'dark',
    gradientEnabled: true, gradientStrength: 0.35, gradientSoftness: 0.80,
    editorSoftlight: 0.28, softlightSpread: 0.70, gradientAngle: 135,
    gradientMode: 'auto',
    gradientStops: [
        { id: 'stop-1', color: '#2A164D', position: 0, opacity: 0.95, softness: 0.85 },
        { id: 'stop-2', color: '#582582', position: 32, opacity: 0.85, softness: 0.90 },
        { id: 'stop-3', color: '#22D3EE', position: 68, opacity: 0.42, softness: 0.92 },
        { id: 'stop-4', color: '#9333EA', position: 100, opacity: 0.75, softness: 0.88 }
    ],
    softlightEnabled: true,
    softlightSoftness: 0.80,
    softlightMode: 'auto',
    softlightColor: '#22D3EE',
    glassEnabled: true,
    glassBlur: 16,
    glassOpacity: 0.82,
    glassSaturation: 1.05,
    neonEnabled: true,
    neonColorMode: 'auto',
    neonCustomColor: '#22D3EE',
    neonStrength: 0.30,
    neonRadius: 14,
    neonOpacity: 0.24,
    motionEnabled: true,
    motionStrength: 0.35,
    motionSpring: 0.70
};
export const presets = [
    { name: 'Nitro Aqua', baseColor: '#120D24', accentColor: '#22D3EE', character: 'Fresh · technical' },
    { name: 'Mint', baseColor: '#110E24', accentColor: '#2DD4BF', character: 'Calm · modern' },
    { name: 'Electric Violet', baseColor: '#100C20', accentColor: '#A78BFA', character: 'Tonal · elegant' },
    { name: 'Nitro Pink', baseColor: '#130B22', accentColor: '#E879F9', character: 'Expressive · energetic' },
    { name: 'Electric Blue', baseColor: '#0F1024', accentColor: '#60A5FA', character: 'Clean · precise' }
];
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export function deriveDefaultStops(baseColor: string, accentColor: string, p?: Record<string, string>): GradientColorStop[] {
    const base = p?.['gradient-base'] || baseColor;
    const accent = p?.['gradient-accent'] || accentColor;
    const [al, ac, ah] = toLch(accentColor);
    const deepViolet = fromLch([clamp(al * 0.48, 0.16, 0.32), Math.min(0.20, ac * 0.95), (ah + Math.PI * 0.88) % (Math.PI * 2)]);
    const richPurple = fromLch([clamp(al * 0.62, 0.26, 0.44), Math.min(0.24, ac * 1.15), (ah + Math.PI * 0.72) % (Math.PI * 2)]);
    const richMagenta = fromLch([clamp(al * 0.76, 0.36, 0.62), Math.min(0.26, ac * 1.25), (ah + Math.PI * 0.58) % (Math.PI * 2)]);
    return [
        { id: 'stop-1', color: deepViolet, position: 0, opacity: 0.95, softness: 0.85 },
        { id: 'stop-2', color: richPurple, position: 32, opacity: 0.85, softness: 0.90 },
        { id: 'stop-3', color: accent, position: 68, opacity: 0.42, softness: 0.92 },
        { id: 'stop-4', color: richMagenta, position: 100, opacity: 0.75, softness: 0.88 }
    ];
}
export function normalizePalette(input: Partial<PaletteConfig> = {}): PaletteConfig {
    const cfg = { ...paletteDefaults, ...input };
    for (const key of ['baseColor', 'accentColor', 'borderColor', 'softlightColor', 'neonCustomColor'] as const) {
        cfg[key] = typeof cfg[key] === 'string' && /^#[a-f\d]{6}$/i.test(cfg[key]) ? cfg[key].toUpperCase() : paletteDefaults[key];
    }
    for (const [key, min, max] of [
        ['surfaceDepth', 0, 2], ['contrast', 0.7, 1.3], ['accentIntensity', 0.2, 1.5],
        ['inactiveFade', 0, 1], ['borderVisibility', 0, 1], ['borderWidth', 0, 4],
        ['gradientStrength', 0, 1], ['gradientSoftness', 0, 1],
        ['editorSoftlight', 0, 0.6], ['softlightSpread', 0.2, 1.5], ['gradientAngle', 0, 360],
        ['glassBlur', 0, 40], ['glassOpacity', 0.1, 1], ['glassSaturation', 0.5, 2.0],
        ['neonStrength', 0, 1], ['neonRadius', 0, 40], ['neonOpacity', 0, 1],
        ['motionStrength', 0, 1], ['motionSpring', 0, 1]
        , ['borderRadius', 0, 24]
    ] as const) cfg[key] = typeof cfg[key] === 'number' && Number.isFinite(cfg[key]) ? clamp(cfg[key], min, max) : paletteDefaults[key];
    cfg.softlightSoftness = typeof input.softlightSoftness === 'number' && Number.isFinite(input.softlightSoftness)
        ? clamp(input.softlightSoftness, 0, 1)
        : cfg.gradientSoftness;
    cfg.gradientEnabled = cfg.gradientEnabled !== false;
    cfg.borderEnabled = cfg.borderEnabled !== false;
    cfg.softlightEnabled = cfg.softlightEnabled !== false;
    cfg.glassEnabled = cfg.glassEnabled !== false;
    cfg.neonEnabled = cfg.neonEnabled !== false;
    cfg.motionEnabled = cfg.motionEnabled !== false;
    cfg.roundedCorners = cfg.roundedCorners === true;
    cfg.themeMode = cfg.themeMode === 'light' ? 'light' : 'dark';
    cfg.activeTabIndicator = ['top', 'bottom', 'side'].includes(cfg.activeTabIndicator) ? cfg.activeTabIndicator : 'top';
    cfg.gradientMode = cfg.gradientMode === 'custom' ? 'custom' : 'auto';
    cfg.softlightMode = ['auto', 'accent', 'custom'].includes(cfg.softlightMode) ? cfg.softlightMode : 'auto';
    cfg.neonColorMode = cfg.neonColorMode === 'custom' ? 'custom' : 'auto';

    if (Array.isArray(input.gradientStops) && input.gradientStops.length >= 2) {
        cfg.gradientStops = input.gradientStops.slice(0, 8).map((stop, i) => ({
            id: typeof stop?.id === 'string' && stop.id ? stop.id : 'stop-' + (i + 1),
            color: typeof stop?.color === 'string' && /^#[a-f\d]{6}$/i.test(stop.color) ? stop.color.toUpperCase() : (i === 0 ? cfg.baseColor : cfg.accentColor),
            position: typeof stop?.position === 'number' && Number.isFinite(stop.position) ? clamp(stop.position, 0, 100) : Math.round((i / (input.gradientStops!.length - 1)) * 100),
            opacity: typeof stop?.opacity === 'number' && Number.isFinite(stop.opacity) ? clamp(stop.opacity, 0, 1) : 1,
            softness: typeof stop?.softness === 'number' && Number.isFinite(stop.softness) ? clamp(stop.softness, 0, 1) : cfg.gradientSoftness
        })).sort((a, b) => a.position - b.position);
    } else if (cfg.gradientMode === 'auto') {
        cfg.gradientStops = deriveDefaultStops(cfg.baseColor, cfg.accentColor);
    } else {
        cfg.gradientStops = paletteDefaults.gradientStops;
    }
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
    p['accent-subtle'] = perceptualMix(p['base-2'],p.accent,0.24);
    p['accent-hover'] = perceptualMix(p['base-2'],p.accent,0.13);
    p['interaction-foreground'] = readableIndicator(p['fg-primary'],[p['accent-subtle'],p['accent-hover']],4.5);
    p['accent-border'] = p.accent;
    p['border-subtle'] = perceptualMix(p['base-2'], cfg.borderColor, cfg.borderVisibility);
    p['border-normal'] = perceptualMix(p['base-2'], cfg.borderColor, cfg.borderVisibility);
    p['border-focus'] = p.accent;
    p.selection = p['accent-subtle']; p.hover = p['accent-hover'];
    p.active = p.accent; p.focus = p['border-focus'];
    p['gradient-base'] = p['base-4'];
    const [bl, bc, bh] = toLch(p['base-4']);
    p['gradient-accent'] = fromLch([al, ac * 0.75, ah]);
    p['gradient-accent-muted'] = perceptualMix(p['base-4'], p.accent, 0.08);
    const softlightBoost = (light ? 0.05 : 0.075) * cfg.editorSoftlight;
    const dHue = Math.atan2(Math.sin(ah - bh), Math.cos(ah - bh));
    p['gradient-softlight'] = fromLch([
        clamp(bl + direction * softlightBoost, 0.05, 0.94),
        bc * 0.7 + ac * 0.12,
        bh + dHue * 0.15
    ]);
    p['gradient-edge'] = fromLch([clamp(bl - direction * 0.012, 0.02, 0.98), bc * 0.9, bh]);
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
    assign('interaction-foreground', ['list.activeSelectionForeground','list.inactiveSelectionForeground','list.focusForeground','list.hoverForeground','menu.selectionForeground','editorSuggestWidget.selectedForeground','tab.hoverForeground','modernTab.hoverForeground','modernTab.activeForeground']);
    assign('accent-subtle', ['menu.selectionBackground','quickInputList.focusBackground','activityBar.activeBackground','activityBarTop.activeBackground']);
    assign('interaction-foreground', ['quickInputList.focusForeground']);
    t['editor.selectionBackground'] = perceptualMix(p['base-4'],p.accent,0.16);
    t['editor.inactiveSelectionBackground'] = p.accent+'18';
    t['editor.selectionHighlightBackground'] = p.accent+'12';
    t['editorSuggestWidget.selectedBackground'] = p.selection;
    for (const token of ['tab.border','tab.hoverBorder','tab.unfocusedHoverBorder','scrollbar.shadow','editorStickyScroll.shadow']) t[token] = transparent;
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
    t['modernTab.activeBackground'] = p.selection;
    t['modernActivityBarItem.activeBackground'] = p.selection;
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
    assign('interaction-foreground', ['list.activeSelectionForeground','list.inactiveSelectionForeground','list.focusForeground','list.hoverForeground','menu.selectionForeground','quickInputList.focusForeground','editorSuggestWidget.selectedForeground','tab.hoverForeground','tab.unfocusedHoverForeground','modernTab.hoverForeground','modernTab.activeForeground','modernEditorTab.hoverForeground','button.secondaryForeground']);
    if (input.borderEnabled === false || input.borderWidth === 0) {
        for (const key of ['surface.border','editor.border','modernActivityBar.border','notificationToast.border','keybindingLabel.border','sideBarSectionHeader.border','pickerGroup.border']) t[key] = transparent;
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
/** Shared compositing, independent of the composer and syntax palette. */
export function deriveComposition(input: Partial<PaletteConfig>, p = derivePalette(input)) {
    const cfg = normalizePalette(input), gradient = deriveGradient(cfg, p);
    const tint = (role: string, weight: number) => p[role] + Math.round((cfg.gradientEnabled ? cfg.glassOpacity * weight : 1) * 255).toString(16).padStart(2, '0');
    const r = cfg.roundedCorners ? cfg.borderRadius : 0;
    const popupTint = (extra: number, weight: number) => p['base-3'] + Math.round((cfg.glassEnabled ? clamp(extra + weight * cfg.glassOpacity, .15, .96) : 1) * 255).toString(16).padStart(2, '0');
    return {
        gradient,
        radius: { small: Math.round(r * .35), medium: Math.round(r * .65), large: r, popup: r },
        floating: { popup: popupTint(.12, .78), tooltip: popupTint(.12, .85), notification: popupTint(.20, .75), shadow: `0 8px 28px ${p['base-0']}70` },
        motion: deriveMotion(cfg),
        surfaces: {
            titlebar: tint('base-0', .38), activitybar: tint('base-1', .38),
            sidebar: tint('base-2', .42), panel: tint('base-1', .46),
            statusbar: tint('base-0', .52), header: tint('base-2', .28),
            editor: tint('base-4', .48)
        },
        neonFilter: cfg.neonEnabled && cfg.neonStrength > 0
            ? `drop-shadow(0 0 ${cfg.neonRadius}px ${cfg.neonColorMode === 'custom' ? cfg.neonCustomColor : p.accent}${Math.round(cfg.neonOpacity * cfg.neonStrength * 255).toString(16).padStart(2, '0')})` : 'none',
        hoverScale: cfg.motionEnabled ? gradient.motionScaleHover : 1,
        pressScale: cfg.motionEnabled ? gradient.motionScaleActive : 1
    };
}

export interface GradientStyles {
    enabled: boolean;
    editorGradient: string;
    workbenchGradient: string;
    panelGradient: string;
    softlightGradient: string;
    softlightColor: string;
    accentColor: string;
    softness: number;
    spread: number;
    colors: Record<string, string>;
    neonShadow: string;
    glassFilter: string;
    glassBackground: string;
    glassOpacity: number;
    motionCss: string;
    motionScaleHover: number;
    motionScaleActive: number;
    motionSpringBezier: string;
}
export function deriveMotion(input: Partial<PaletteConfig>) {
    const c = normalizePalette(input), strength = c.motionEnabled ? c.motionStrength : 0;
    return {
        hoverScale: Number((1 + .035 * strength).toFixed(4)),
        pressScale: Number((1 - .035 * strength).toFixed(4)),
        lift: Number((.6 * strength).toFixed(3)),
        duration: c.motionEnabled ? Math.round(160 + 180 * c.motionSpring) : 0,
        easing: `cubic-bezier(0.22, ${(1 + .65 * c.motionSpring).toFixed(3)}, 0.36, 1)`
    };
}
export function deriveGradient(input: Partial<PaletteConfig>, p = derivePalette(input)): GradientStyles {
    const cfg = normalizePalette(input);
    const light = cfg.themeMode === 'light';
    const [sl, sc, sh] = toLch(p['gradient-softlight']);
    // Auto illumination must lift the composited atmosphere, rather than tint it darker.
    const autoSoftlight = fromLch([light ? sl : Math.max(.48, sl), sc, sh]);
    const softColor = cfg.softlightMode === 'accent' ? p.accent : cfg.softlightMode === 'custom' ? cfg.softlightColor : autoSoftlight;
    const colors = {
        'gradient-base': p['gradient-base'],
        'gradient-accent': p['gradient-accent'],
        'gradient-accent-muted': p['gradient-accent-muted'],
        'gradient-softlight': softColor,
        'gradient-edge': p['gradient-edge']
    };

    const neonColor = cfg.neonColorMode === 'custom' ? cfg.neonCustomColor : p.accent;
    const a1 = Math.round(clamp(cfg.neonOpacity * cfg.neonStrength * 1.2, 0, 1) * 255).toString(16).padStart(2, '0');
    const a2 = Math.round(clamp(cfg.neonOpacity * cfg.neonStrength * 0.65, 0, 1) * 255).toString(16).padStart(2, '0');
    const a3 = Math.round(clamp(cfg.neonOpacity * cfg.neonStrength * 0.35, 0, 1) * 255).toString(16).padStart(2, '0');
    const r = cfg.neonRadius;
    const neonShadow = cfg.neonEnabled && cfg.neonStrength > 0
        ? `0 0 2px ${neonColor}${a1}, 0 0 ${Math.round(r * 0.5)}px ${neonColor}${a2}, 0 4px ${r}px ${neonColor}${a3}`
        : 'none';

    const glassBase = light ? '#f5f2fa' : '#14101e';
    const glassBackground = glassBase + Math.round(clamp(cfg.glassOpacity, 0.1, 1) * 255).toString(16).padStart(2, '0');
    const glassFilter = cfg.glassEnabled ? `blur(${cfg.glassBlur}px) saturate(${Math.round(cfg.glassSaturation * 100)}%)` : 'none';

    const motion = deriveMotion(cfg);
    const motionScaleHover = motion.hoverScale;
    const motionScaleActive = motion.pressScale;
    const motionSpringBezier = motion.easing;
    const motionCss = cfg.motionEnabled ? `transition: transform ${motion.duration}ms ${motionSpringBezier};` : 'none';


    // Build multi-stop ambient linear gradient with softness interpolation
    const renderedStops: string[] = [];
    const stops = cfg.gradientStops;
    for (let i = 0; i < stops.length; i++) {
        const cur = stops[i];
        const curAlpha = Math.round(clamp(cur.opacity * (light ? 0.75 : 1) * cfg.gradientStrength * 2, 0, 1) * 255).toString(16).padStart(2, '0');
        renderedStops.push(`${cur.color}${curAlpha} ${cur.position}%`);
        if (i < stops.length - 1) {
            const next = stops[i + 1];
            const blendSoft = clamp((cfg.gradientSoftness * 0.6 + (cur.softness + next.softness) * 0.2), 0, 1);
            // Continuously widen each transition around its midpoint. Unlike the previous
            // threshold, every global/per-stop softness value changes the spatial falloff.
            const center = (cur.position + next.position) / 2;
            const halfWidth = (next.position - cur.position) * (.025 + .475 * blendSoft);
            const nextAlpha = Math.round(clamp(next.opacity * (light ? .75 : 1) * cfg.gradientStrength * 2, 0, 1) * 255).toString(16).padStart(2, '0');
            const midColor = perceptualMix(cur.color, next.color, .5);
            const midAlpha = Math.round(clamp((cur.opacity + next.opacity) * (light ? .75 : 1) * cfg.gradientStrength, 0, 1) * 255).toString(16).padStart(2, '0');
            renderedStops.push(`${cur.color}${curAlpha} ${(center-halfWidth).toFixed(2)}%`, `${midColor}${midAlpha} ${center}%`, `${next.color}${nextAlpha} ${(center+halfWidth).toFixed(2)}%`);
        }
    }
    const ambient = `linear-gradient(${cfg.gradientAngle}deg, ${renderedStops.join(', ')})`;

    // Broad atmospheric lighting follows the actual composer stops, including opacity.
    // The stop interpolation above remains the single composer algorithm.
    const first = stops[0], second = stops[Math.min(1, stops.length - 1)], last = stops[stops.length - 1];
    const cool = stops.reduce((a, b) => Math.abs(a.position - 68) < Math.abs(b.position - 68) ? a : b);
    const lift = (color: string, level: number) => { const [, c, h] = toLch(color); return fromLch([light ? .86 : level, c, h]); };
    const richMagenta = lift(perceptualMix(second.color, last.color, .4), .50);
    const titleAtmosphereAlpha = Math.round(clamp(cfg.gradientStrength * (light ? 0.38 : 0.80) * second.opacity, 0, 1) * 255).toString(16).padStart(2, '0');

    // 2. Deep rich violet across sidebar and left activity bar
    const richViolet = lift(first.color, .43);
    const sidebarAtmosphereAlpha = Math.round(clamp(cfg.gradientStrength * (light ? 0.35 : 0.75) * first.opacity, 0, 1) * 255).toString(16).padStart(2, '0');

    // 3. Subtle cyan field across editor right
    const cyanAtmosphereAlpha = Math.round(clamp(cfg.gradientStrength * (light ? 0.22 : 0.42) * cool.opacity, 0, 1) * 255).toString(16).padStart(2, '0');

    // 4. Deep purple / plum atmosphere across bottom panel
    const plumPurple = lift(last.color, .40);
    const panelAtmosphereAlpha = Math.round(clamp(cfg.gradientStrength * (light ? 0.32 : 0.72) * last.opacity, 0, 1) * 255).toString(16).padStart(2, '0');

    const atmosphere = `radial-gradient(135% 120% at 35% 0%, ${richMagenta}${titleAtmosphereAlpha} 0%, transparent 72%), ` +
      `radial-gradient(110% 120% at 0% 45%, ${richViolet}${sidebarAtmosphereAlpha} 0%, transparent 68%), ` +
      `radial-gradient(120% 90% at 80% 45%, ${cool.color}${cyanAtmosphereAlpha} 0%, transparent 65%), ` +
      `radial-gradient(130% 100% at 50% 100%, ${plumPurple}${panelAtmosphereAlpha} 0%, transparent 70%), ` +
      `${ambient}`;

    // Editor-centered softlight radial gradient
    const s = clamp(cfg.gradientSoftness * 0.5 + cfg.softlightSoftness * 0.5, 0, 1);
    const coreStop = Math.round(15 + 20 * s);
    const midStop = Math.round(35 + 28 * s);
    const outerStop = Math.round(65 + 35 * s);
    const softAlpha = Math.round(clamp(cfg.editorSoftlight * (light ? 0.55 : 0.85), 0, 1) * 255).toString(16).padStart(2, '0');
    const midAlpha = Math.round(clamp(cfg.editorSoftlight * (light ? 0.28 : 0.42), 0, 1) * 255).toString(16).padStart(2, '0');
    const edgeAlpha = Math.round(clamp(cfg.editorSoftlight * (light ? 0.08 : 0.12), 0, 1) * 255).toString(16).padStart(2, '0');
    const rx = Math.round(75 * cfg.softlightSpread);
    const ry = Math.round(65 * cfg.softlightSpread);
    const radial = `radial-gradient(${rx}% ${ry}% at 50% 42%, ${softColor}${softAlpha} 0%, ${softColor}${midAlpha} ${coreStop}%, ${p['gradient-base']}${edgeAlpha} ${midStop}%, transparent ${outerStop}%)`;

    const mutedAlpha = Math.round(clamp(cfg.gradientStrength * (light ? 0.06 : 0.10), 0, 1) * 255).toString(16).padStart(2, '0');

    return {
        enabled: cfg.gradientEnabled,
        editorGradient: cfg.gradientEnabled ? (cfg.softlightEnabled ? `${radial}, ${ambient}` : ambient) : 'none',
        workbenchGradient: cfg.gradientEnabled ? atmosphere : 'none',
        panelGradient: cfg.gradientEnabled ? `linear-gradient(${cfg.gradientAngle}deg, ${p['gradient-accent-muted']}${mutedAlpha} 0%, transparent 65%)` : 'none',
        softlightGradient: cfg.softlightEnabled ? radial : 'none',
        softlightColor: softColor,
        accentColor: p['gradient-accent'],
        softness: cfg.gradientSoftness,
        spread: cfg.softlightSpread,
        colors,
        neonShadow,
        glassFilter,
        glassBackground,
        glassOpacity: cfg.glassOpacity,
        motionCss,
        motionScaleHover,
        motionScaleActive,
        motionSpringBezier
    };
}
