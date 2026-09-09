import { blend, luminance } from './colors';
import { derivePalette, deriveComposition, normalizePalette } from './palette';
import type { ThemeConfig } from './extension';
import { surfaceRegistry as registry } from './surfaces';

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

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

export function buildEffects(input: ThemeConfig): string {
    const cfg = { ...input, ...normalizePalette(input) };
    const p = derivePalette(cfg), c = deriveComposition(cfg, p), g = c.gradient;
    const root = '.monaco-workbench[data-gradient-nitro="active"]'.repeat(4);
    const scope = (selectors: string[]) => selectors.map(s => `${root} ${s}`).join(',\n');
    const surfaces = ['titlebar', 'activitybar', 'sidebar', 'auxiliarybar', 'panel', 'statusbar', 'editor'];
    const radius = cfg.roundedCorners ? cfg.borderRadius ?? 12 : 0;
    const borderWidth = cfg.borderEnabled ? cfg.borderWidth : 0;
    const floats = Object.values(registry.floating).flat();
    const clear = [
        '> .monaco-grid-view',
        '.part.sidebar > .content', '.part.auxiliarybar > .content',
        '.part.sidebar .monaco-pane-view .pane', '.part.auxiliarybar .monaco-pane-view .pane',
        '.part.panel .monaco-pane-view .pane',
        '.part.editor > .content', '.centered-layout-margin', '.editor-group-container', '.editor-group-container > .editor-container', '.editor-instance',
        '.editor-instance > .monaco-editor', '.editor-instance > .monaco-editor .monaco-editor-background',
        '.editor-instance > .monaco-editor .margin',
        '.tabs-and-actions-container', '.tabs-breadcrumbs-container', '.breadcrumbs-control', '.monaco-breadcrumbs',
        '.part.sidebar .monaco-list', '.part.sidebar .monaco-list-rows', '.part.sidebar .pane-body',
        '.part.auxiliarybar .monaco-list', '.part.auxiliarybar .monaco-list-rows', '.part.auxiliarybar .pane-body',
        '.part.panel .content', '.part.panel .monaco-list', '.part.panel .monaco-list-rows',
        '.part.panel .terminal', '.part.panel .xterm', '.part.panel .xterm-viewport',
        '.terminal-outer-container', '.terminal-wrapper'
    ];
    return `/* Gradient Nitro live session: one field, translucent surfaces, local light. */
${root} {
  --gn-gradient-background: ${g.workbenchGradient};
  --gn-gradient-angle: ${cfg.gradientAngle}deg;
  --gn-gradient-strength: ${cfg.gradientStrength};
  --gn-glass-opacity: ${cfg.glassOpacity};
  --gn-glass-blur: ${cfg.glassBlur}px;
  --gn-glass-filter: ${g.glassFilter};
  --gn-radius-small: ${c.radius.small}px;
  --gn-radius-medium: ${c.radius.medium}px;
  --gn-radius-large: ${c.radius.large}px;
  --gn-radius-popup: ${c.radius.popup}px;
  --gn-border-width: ${borderWidth}px;
  --gn-border-color: ${borderWidth ? p['border-normal'] : 'transparent'};
  --gn-neon-color: ${cfg.neonColorMode === 'custom' ? cfg.neonCustomColor : p.accent};
  --gn-neon-strength: ${cfg.neonStrength};
  --gn-neon-radius: ${cfg.neonRadius}px;
  --gn-neon-opacity: ${cfg.neonOpacity};
  --gn-neon-filter: ${c.neonFilter};
  --gn-motion-strength: ${cfg.motionStrength};
  --gn-motion-spring: ${cfg.motionSpring};
  --gn-motion-hover: ${c.motion.hoverScale};
  --gn-motion-press: ${c.motion.pressScale};
  --gn-motion-lift: ${c.motion.lift}px;
  --gn-motion-duration: ${c.motion.duration}ms;
  --gn-motion-easing: ${c.motion.easing};
  --gn-softlight-color: ${g.softlightColor};
  --gn-softlight-strength: ${cfg.editorSoftlight};
  --gn-softlight-spread: ${cfg.softlightSpread};
  --gn-softlight-softness: ${cfg.softlightSoftness};
  --gn-softlight-background: ${g.softlightGradient};
  --vscode-focusBorder: ${p['border-subtle']} !important;
  --vscode-contrastBorder: transparent !important;
  --vscode-contrastActiveBorder: transparent !important;
  --vscode-editorGroup-border: var(--gn-border-color) !important;
  --vscode-panel-border: var(--gn-border-color) !important;
  --vscode-sash-hoverBorder: ${p['border-normal']} !important;
  --vscode-shadow-active-tab: none;
  background: ${p['gradient-base']} !important;
  isolation: isolate;
}
/* GLOBAL WORKBENCH ATMOSPHERE: the only owner of the viewport gradient. */
${root}::before {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  background: var(--gn-gradient-background) !important;
  background-size: cover !important;
  pointer-events: none !important;
  z-index: -1 !important;
}
/* GLASS SURFACES: one tint per region, no repeated gradients. */
${surfaces.map(s => `${root} .part.${s} {
  background-color: ${c.surfaces[(s === 'auxiliarybar' ? 'sidebar' : s) as keyof typeof c.surfaces]} !important;
  background-image: none !important;
  ${s === 'editor' ? '' : `backdrop-filter: ${g.glassFilter} !important;`}
}`).join('\n')}
${scope(clear)} { background: transparent !important; }
${scope(['.editor-group-container > .title', '.composite.title', '.pane-header', '.part.sidebar .pane > .pane-header', '.part.auxiliarybar .pane > .pane-header'])} {
  background: ${c.surfaces.header} !important;
}
/* EDITOR SOFTLIGHT: editor-relative radial illumination, never the atmosphere. */
${root} .part.editor {
  background-image: var(--gn-softlight-background) !important;
  background-size: cover !important;
  background-repeat: no-repeat !important;
}
/* Overlays retain readable surfaces above code and selections. */
${scope(['.part.editor .minimap'])} { background: transparent !important; opacity: .55; }
${scope(['.monaco-editor .sticky-widget', '.peekview-widget .monaco-editor'])} {
  background-color: ${p['base-4']} !important;
}
/* STRUCTURAL SEPARATORS: no accent outlines or large neon shadows. */
${scope(surfaces.map(s => '.part.' + s))} {
  outline: none !important; box-shadow: none !important;
  border-color: var(--gn-border-color) !important; border-radius: ${radius}px !important;
  box-shadow: inset 0 0 0 var(--gn-border-width) var(--gn-border-color) !important;
}
${scope(['.editor-group-container', '.part.panel .monaco-list:focus', '.part.sidebar .monaco-list:focus', '.part.auxiliarybar .monaco-list:focus'])} {
  outline: none !important; box-shadow: none !important;
}
/* ACTIVE EFFECTS: icons, thin tab indicators and small focused controls only. */
${scope(['.part.activitybar .action-item .action-label'])} { color: ${p['fg-muted']} !important; }
${scope(['.part.activitybar .action-item:hover .action-label'])} { color: ${p['fg-secondary']} !important; }
${scope(['.part.activitybar .action-item.checked .action-label'])} {
  color: ${p.accent} !important; filter: ${c.neonFilter} !important;
}
${scope(['.tab', '.tab > .tab-fill'])} {
  background: transparent !important; box-shadow: none !important; border-radius: var(--gn-radius-medium) !important;
}
${scope(['.tab:not(.active)'])} { color: ${p['fg-muted']} !important; }
${scope(['.tab.active', '.tab.active .label-name'])} { color: ${p['fg-primary']} !important; }
${scope(['.tab.active .tab-border-top-container', '.tab.active .tab-border-bottom-container'])} { filter: ${c.neonFilter} !important; }
${scope(['button:focus-visible', '.monaco-button:focus-visible', 'input:focus-visible'])} {
  outline: 1px solid ${p.accent} !important; outline-offset: -1px !important;
}
/* FLOATING SURFACE REGISTRY: translucent shells over meaningful content. */
${Object.entries(registry.floating).map(([kind, selectors]) => `${scope([...selectors])} {
  background: ${c.floating[kind as 'popup' | 'tooltip' | 'notification']} !important;
  backdrop-filter: var(--gn-glass-filter) !important;
  border: var(--gn-border-width) solid var(--gn-border-color) !important;
  border-radius: var(--gn-radius-popup) !important;
  box-shadow: ${c.floating.shadow} !important;
  color: ${p['fg-primary']} !important;
  overflow: hidden;
}`).join('\n')}
${scope(floats.map(shell => `${shell} :is(${registry.popupContent.join(',')})`))} {
  background-color: transparent !important;
}
${scope([...registry.interactive])} { border-radius: var(--gn-radius-small) !important; }
${scope(['.monaco-inputbox', '.monaco-select-box', '.command-center .command-center-center'])} {
  border-width: var(--gn-border-width) !important; border-color: var(--gn-border-color) !important;
}
${scope([...registry.navigation])} { border-radius: var(--gn-radius-medium) !important; }
${scope(['.part.activitybar .action-item:hover'])} { background-color: ${p['accent-hover']} !important; }
${scope([...registry.activeSignals])} { filter: var(--gn-neon-filter) !important; }
/* Explicit interaction surfaces keep labels readable over every gradient stop. */
${scope(['.monaco-list-row:hover:not(.selected):not(.focused)', '.monaco-menu .action-item:not(.disabled):hover .action-menu-item', '.monaco-toolbar .action-item:not(.disabled):hover', '.tab:hover', '.part.activitybar .action-item:hover'])} {
  background-color: ${p.hover} !important; color: ${p['interaction-foreground']} !important;
}
${scope(['.monaco-list-row.selected', '.monaco-list-row.focused', '.monaco-menu .action-item.focused .action-menu-item', '.monaco-menu .action-item .action-menu-item:focus', '.tab.active', '.part.activitybar .action-item.checked', '.part.panel .composite-bar .action-item.checked'])} {
  background-color: ${p.selection} !important; color: ${p['interaction-foreground']} !important;
}
${scope(['.monaco-list-row:is(:hover,.selected,.focused) .label-name', '.monaco-list-row:is(:hover,.selected,.focused) .monaco-icon-label', '.monaco-menu .action-item:is(:hover,.focused) .action-label', '.tab:is(:hover,.active) .label-name', '.part.panel .composite-bar .action-item.checked .action-label'])} {
  color: ${p['interaction-foreground']} !important;
}
/* BUBBLE MOTION */
${cfg.motionEnabled ? `@media (prefers-reduced-motion: no-preference) {
  ${scope([...registry.motion])} { transition: scale var(--gn-motion-duration) var(--gn-motion-easing), translate var(--gn-motion-duration) var(--gn-motion-easing) !important; transform-origin: center; }
  ${scope(registry.motion.map(s => s + ':hover'))} { scale: var(--gn-motion-hover) !important; translate: 0 calc(-1 * var(--gn-motion-lift)) !important; }
  ${scope(registry.motion.map(s => s + ':active'))} { scale: var(--gn-motion-press) !important; translate: 0 0 !important; }
}` : ''}
@media (prefers-reduced-motion: reduce) { ${scope([...registry.motion])} { transition: none !important; scale: 1 !important; translate: none !important; } }
`;
}
