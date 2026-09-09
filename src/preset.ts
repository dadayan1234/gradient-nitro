import { ThemeConfig, normalizeConfig } from './config';

export interface FullPreset {
    format: 'gradient-nitro';
    formatVersion: 1;
    theme: Record<string, unknown>;
    visual: ThemeConfig;
}
export function exportPreset(config: ThemeConfig, theme: Record<string, unknown>): FullPreset {
    return { format: 'gradient-nitro', formatVersion: 1, theme, visual: normalizeConfig(config) };
}
export function importPreset(value: unknown): ThemeConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Gradient Nitro preset.');
    const data = value as Record<string, any>;
    if (data.format !== 'gradient-nitro' || data.formatVersion !== 1 || !data.visual || typeof data.visual !== 'object' || Array.isArray(data.visual))
        throw new Error('Use a Full Gradient Nitro Preset (formatVersion 1). Native theme JSON contains no runtime configuration.');
    if (data.visual.visualConfigVersion !== undefined && data.visual.visualConfigVersion !== 1 && data.visual.visualConfigVersion !== 2)
        throw new Error('This preset uses a newer visual configuration version.');
    if (data.visual.gradientStops && (!Array.isArray(data.visual.gradientStops) || data.visual.gradientStops.length < 2 || data.visual.gradientStops.length > 8))
        throw new Error('A gradient must contain 2 to 8 stops.');
    return normalizeConfig(data.visual);
}
