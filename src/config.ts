import { PaletteConfig, paletteDefaults, normalizePalette } from './palette';
import { LanguageOverrides, normalizeSyntaxOverrides } from './syntax';

export interface ColorStop {
    color: string;
    offset: number; // 0 to 100
}

export interface ThemeConfig extends PaletteConfig {
    visualConfigVersion: 2;
    nativeModernUI: boolean;
    themeMode: 'dark' | 'light';
    accentColor: string;
    borderColor: string;
    borderWidth: number;
    borderEnabled: boolean;
    workbenchEffects: boolean;
    darkIntensity: number;
    lightIntensity: number;
    neonGlowIntensity: number;
    syntaxOverrides: LanguageOverrides;
    fileColors: boolean;
    colorStops: ColorStop[];
    leftColor: string;
    rightColor: string;
    roundedCorners: boolean;
    borderRadius: number;
    blurStrength: number;
    neonGlowSpread: number;
    glassOpacity: number;
    gradientAngle: number;
    gradientIntensity: number;
    gradientEnabled: boolean;
    gradientStrength: number;
    gradientSoftness: number;
    editorSoftlight: number;
    softlightSpread: number;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontLigatures: boolean;
    fontWeight: string;
}

export function getDefaultConfig(): ThemeConfig {
    return {
        ...paletteDefaults,
        visualConfigVersion: 2,
        nativeModernUI: false,
        themeMode: 'dark',
        accentColor: paletteDefaults.accentColor,
        borderColor: '#64748B',
        borderWidth: 1,
        borderEnabled: true,
        workbenchEffects: false,
        darkIntensity: 0.65,
        lightIntensity: 0.55,
        neonGlowIntensity: 0.18,
        syntaxOverrides: {},
        fileColors: false,
        colorStops: [
            { color: '#28A12F', offset: 0 },
            { color: '#00D2FF', offset: 40 },
            { color: '#A008B9', offset: 100 }
        ],
        leftColor: '#28A12F',
        rightColor: '#A008B9',
        roundedCorners: false,
        borderRadius: 12,
        blurStrength: 24,
        neonGlowSpread: 35,
        glassOpacity: 0.70,
        gradientAngle: 135,
        gradientIntensity: 0.28,
        gradientEnabled: true,
        gradientStrength: 0.35,
        gradientSoftness: 0.80,
        editorSoftlight: 0.28,
        softlightSpread: 0.70,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontSize: 14,
        lineHeight: 23,
        fontLigatures: true,
        fontWeight: '400'
    };
}

export function normalizeConfig(input: Partial<ThemeConfig>): ThemeConfig {
    const defaults = getDefaultConfig();
    const cfg = { ...defaults, ...input };
    const hex = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
    const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    cfg.themeMode = cfg.themeMode === 'light' ? 'light' : 'dark';
    cfg.colorStops = Array.isArray(cfg.colorStops) && cfg.colorStops.length >= 2 ? cfg.colorStops.slice(0, 6).map((stop, i) => ({ color: hex(stop?.color, defaults.colorStops[i % 3].color), offset: number(stop?.offset, i ? 100 : 0, 0, 100) })).sort((a, b) => a.offset - b.offset) : defaults.colorStops;
    cfg.leftColor = cfg.colorStops[0].color;
    cfg.rightColor = cfg.colorStops[cfg.colorStops.length - 1].color;
    cfg.accentColor = hex(cfg.accentColor, defaults.accentColor);
    cfg.borderColor = hex(cfg.borderColor, defaults.borderColor);
    cfg.borderWidth = number(cfg.borderWidth, 1, 0, 4);
    cfg.borderEnabled = cfg.borderEnabled !== false;
    cfg.workbenchEffects = cfg.workbenchEffects === true;
    cfg.darkIntensity = number(cfg.darkIntensity, 0.65, 0, 1);
    cfg.lightIntensity = number(cfg.lightIntensity, 0.55, 0, 1);
    cfg.neonGlowIntensity = number(cfg.neonGlowIntensity, 0.18, 0, 0.4);
    cfg.syntaxOverrides = normalizeSyntaxOverrides(cfg.syntaxOverrides);
    cfg.fileColors = cfg.fileColors !== false;
    cfg.gradientIntensity = number(cfg.gradientIntensity, 0.28, 0, 0.6);
    cfg.gradientAngle = number(cfg.gradientAngle, 135, 0, 360);
    cfg.gradientEnabled = cfg.gradientEnabled !== false;
    cfg.gradientStrength = number(cfg.gradientStrength, 0.35, 0, 1);
    cfg.gradientSoftness = number(cfg.gradientSoftness, 0.80, 0, 1);
    cfg.editorSoftlight = number(cfg.editorSoftlight, 0.28, 0, 0.6);
    cfg.softlightSpread = number(cfg.softlightSpread, 0.70, 0.2, 1.5);
    cfg.borderRadius = number(cfg.borderRadius, 12, 0, 24);
    cfg.blurStrength = number(cfg.blurStrength, 24, 0, 40);
    cfg.neonGlowSpread = number(cfg.neonGlowSpread, 35, 0, 60);
    cfg.glassOpacity = number(cfg.glassOpacity, 0.7, 0.1, 1);
    cfg.fontSize = number(cfg.fontSize, 14, 8, 40);
    cfg.lineHeight = number(cfg.lineHeight, 23, 0, 60);
    cfg.fontFamily = typeof cfg.fontFamily === 'string' && /^[\w\s,'".\-]+$/.test(cfg.fontFamily) ? cfg.fontFamily.slice(0, 200) : defaults.fontFamily;
    cfg.fontWeight = typeof cfg.fontWeight === 'string' && /^(normal|bold|[1-9]00)$/.test(cfg.fontWeight) ? cfg.fontWeight : '400';
    cfg.roundedCorners = cfg.roundedCorners === true;
    cfg.fontLigatures = cfg.fontLigatures === true;
    const normalized = { ...cfg, ...normalizePalette(cfg), visualConfigVersion: 2 as const,
        nativeModernUI: input.nativeModernUI === undefined ? (input.visualConfigVersion === undefined && input.roundedCorners === true) : input.nativeModernUI === true };
    return Object.fromEntries(Object.keys(defaults).map(key => [key, normalized[key as keyof ThemeConfig]])) as unknown as ThemeConfig;
}
