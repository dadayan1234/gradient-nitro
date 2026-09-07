import { blend, luminance, readableAcross, onColor } from './colors';
import type { ThemeConfig } from './extension';

export function gradientSurfaces(cfg: ThemeConfig): Array<{ color: string; offset: number }> {
    const light = cfg.themeMode === 'light';
    const base = light ? '#faf7ff' : '#100b19';
    const intensity = light ? cfg.lightIntensity : cfg.darkIntensity;
    return cfg.colorStops.map(stop => {
        // Bound endpoint luminance so a single syntax palette stays legible across the canvas.
        let target = stop.color;
        for (let i = 0; i <= 100; i++) {
            target = blend(stop.color, base, 1 - i / 100);
            if (light ? luminance(target) >= 0.48 : luminance(target) <= 0.15) break;
        }
        return { color: blend(target, base, intensity), offset: stop.offset };
    });
}
export function buildEffects(cfg: ThemeConfig): string {
    const light = cfg.themeMode === 'light';
    const stops = gradientSurfaces(cfg);
    const radius = cfg.roundedCorners ? cfg.borderRadius : 0;
    const width = cfg.borderEnabled ? cfg.borderWidth : 0;
    const border = cfg.borderColor;
    const header = blend(stops[0].color, '#000000', light ? 0.86 : 0.62);
    const headerText = onColor(header);
    const activeTab = blend(cfg.accentColor, light ? '#ffffff' : '#101019', light ? 0.22 : 0.40);
    const activeText = onColor(activeTab);
    const glassBase = light ? '#f5f2fa' : '#14101e';
    const glass = glassBase + Math.round(cfg.glassOpacity * 255).toString(16).padStart(2, '0');
    const accent = readableAcross(cfg.accentColor, stops.map(stop => stop.color));
    const inactive = readableAcross(blend(cfg.accentColor, light ? '#3b255d' : '#b9a8dc', 0.35), stops.map(stop => stop.color));
    const gradient = `linear-gradient(${cfg.gradientAngle}deg, ${stops.map(stop => `${stop.color} ${stop.offset}%`).join(', ')})`;
    const shadow = cfg.neonGlowIntensity === 0 ? 'none' : `0 6px 18px -10px ${light ? '#17102026' : '#00000070'}, 0 0 ${cfg.neonGlowSpread}px -6px ${cfg.accentColor}${Math.round(cfg.neonGlowIntensity * 255).toString(16).padStart(2, '0')}`;
    // Modern UI ships deeply nested !important rules; keep the override scoped but more specific.
    const root = '.monaco-workbench[data-gradient-nitro="active"]'.repeat(4);
    const scope = (selectors: string[]) => selectors.map(selector => `${root} ${selector}`).join(',\n');
    const surfaces = ['.part.editor', '.part.sidebar', '.part.auxiliarybar', '.part.panel', '.part.activitybar', '.part.statusbar', '.part.titlebar'];
    const chrome = ['.editor-group-container', '.editor-group-container > .title', '.tabs-and-actions-container', '.tabs-breadcrumbs-container', '.breadcrumbs-control', '.monaco-breadcrumbs', '.pane-header', '.composite.title', '.part.sidebar .monaco-list', '.part.sidebar .monaco-list-rows', '.part.sidebar .pane-body', '.part.sidebar .monaco-scrollable-element', '.part.panel .content', '.part.panel .terminal', '.part.panel .xterm', '.part.panel .xterm-viewport', '.part.editor .minimap'];
    const controls = ['.tab', '.monaco-button', '.monaco-inputbox', '.monaco-select-box', '.monaco-dropdown .dropdown-label', '.monaco-list-row.focused', '.monaco-list-row.selected', '.action-item.checked .action-label'];
    const widgets = ['.monaco-hover', '.monaco-editor-hover', '.suggest-widget', '.parameter-hints-widget', '.quick-input-widget', '.monaco-menu', '.notification-toast', '.find-widget', '.rename-box', '.peekview-widget'];
    return `/* Gradient Nitro live session: removed when the extension disconnects. */
${root} {
  --vscode-sideBar-background: transparent !important;
  --vscode-sideBarSectionHeader-background: transparent !important;
  --vscode-editorGroupHeader-tabsBackground: transparent !important;
  --vscode-panel-background: transparent !important;
  --vscode-cornerRadius-xSmall: ${radius}px; --vscode-cornerRadius-small: ${radius}px;
  --vscode-cornerRadius-medium: ${radius}px; --vscode-cornerRadius-large: ${radius}px;
  --vscode-cornerRadius-xLarge: ${radius}px; --vscode-strokeThickness: ${width}px;
  --vscode-shadow-sm: ${shadow}; --vscode-shadow-md: ${shadow}; --vscode-shadow-lg: ${shadow}; --vscode-shadow-xl: ${shadow};
  --vscode-shadow-active-tab: none;
  background: ${gradient} fixed !important;
}
${scope(surfaces)}, ${scope(['.monaco-editor'])} {
  background-image: ${gradient} !important; background-color: ${stops[0].color} !important;
  background-attachment: fixed !important; background-size: 100vw 100vh !important;
}
${scope(chrome)}, ${scope(['.monaco-editor .monaco-editor-background', '.monaco-editor .margin', '.monaco-editor .sticky-widget', '.terminal-outer-container', '.terminal-wrapper'])} {
  background: transparent !important;
}
${scope([...surfaces, '.editor-group-container', ...widgets])} {
  border-radius: ${radius}px !important;
}
${scope([...surfaces, ...controls, ...widgets])} {
  border-width: 0 !important;
  outline: ${width}px solid ${border} !important; outline-offset: -${width}px !important;
}
${scope(chrome)}, ${scope(['.tab-border-top-container', '.tab-border-bottom-container', '.monaco-list-row'])} {
  border-color: ${width ? border : 'transparent'} !important;
  border-width: 0 !important;
}
${scope(controls)}, ${scope(['.monaco-list-row', '.action-label', '.monaco-breadcrumb-item'])} {
  border-radius: ${radius}px !important;
}
${scope(['.part.activitybar .action-item .action-label'])} { color: ${inactive} !important; opacity: 1 !important; }
${scope(['.part.activitybar .action-item.checked .action-label', '.part.activitybar .action-item:hover .action-label'])} { color: ${accent} !important; }
${scope(['.editor-group-container > .title', '.composite.title', '.pane-header'])} {
  background: ${header} !important; color: ${headerText} !important;
}
${scope(['.composite.title .action-label', '.pane-header .title', '.pane-header .codicon'])} { color: ${headerText} !important; }
${scope(['.tab:not(.active)', '.tab:not(.active) > .tab-fill'])} { background: transparent !important; color: ${headerText} !important; }
${scope(['.tab.active', '.tab.active > .tab-fill'])} {
  background: ${activeTab} !important; color: ${activeText} !important;
  border-radius: ${radius}px !important;
  box-shadow: inset 0 -3px 0 ${accent} !important;
}
${scope(['.tab.active .tab-label', '.tab.active .label-name', '.tab.active .label-description', '.tab.active .action-label'])} { color: ${activeText} !important; opacity: 1 !important; }
${scope(widgets)} {
  background: ${glass} !important;
  color: ${onColor(glassBase)} !important;
  box-shadow: ${shadow} !important;
  backdrop-filter: blur(${cfg.blurStrength}px) !important;
}
${scope(['.monaco-hover .monaco-hover-content', '.monaco-hover .hover-row', '.suggest-widget > .tree', '.quick-input-widget .quick-input-list', '.monaco-menu .monaco-action-bar', '.notification-toast .notifications-list-container'])} { background: transparent !important; }
${scope(['.monaco-hover .monaco-editor', '.suggest-widget .monaco-editor', '.peekview-widget .monaco-editor'])} {
  background: var(--vscode-editorWidget-background) !important;
}
${scope(['.monaco-editor .view-line span'])} { text-shadow: none !important; }
${scope(['button:focus-visible', '.monaco-button:focus-visible', 'input:focus-visible'])} { outline: 2px solid ${accent} !important; outline-offset: -2px !important; }
`;
}
