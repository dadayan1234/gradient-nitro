# Changelog

## [1.6.0] - 2026-09-10

- Set package and store license metadata to PolyForm-Noncommercial-1.0.0 and include the complete license text. Releases through 1.5.3 retain MIT.
- Move structural/menu blur to noninteractive paint layers so fixed menu popups and nested submenus retain viewport positioning.
- Keep menu and dropdown owners free of motion transforms, and stop applying workbench backgrounds to shadow menu hosts.
- Extend installed-package checks to menubar/submenu pointer access and an isolated Antigravity fixture. Validate the store license asset during release checks.

## [1.5.3] - 2026-09-09

- Prepared stable release previews with two custom midnight-indigo/plum stops and broad lavender softlight; added an importable Midnight Studio preset.
- Refreshed Studio and real-workbench screenshots from one shared configuration. Diagnostic test palettes remain outside the release gallery.
- Recorded a looping versioned GIF with a representative first frame, a static fallback and a direct link. Packaging now uses explicit HTTPS raw-image URLs.
- Added local VSIX/GIF/checksum validation and a public-media check that rejects missing or stale Marketplace images.

## [1.5.2] - 2026-09-09

- Removed opaque Explorer and terminal pane layers in classic and Modern UI layouts. Runtime terminal backgrounds are transparent; native theme exports retain their background color.
- Strengthened hover and selected-item fills with contrast-adjusted labels across lists, menus, tabs and navigation.
- Added Save and Apply Configuration to Studio, the Gradient Nitro side menu and its title toolbar. It saves the open draft or reapplies the saved configuration when Studio is closed.
- Updated the side-menu guide, feature highlights, verified screenshots and recorded interaction GIF.

## [1.5.1] - 2026-09-09

- Fixed the opaque native Modern UI grid covering gradients after Save Theme.
- Added a Borders section with color picker, hex input, 0–4px thickness, visibility and enable/disable controls. Border settings persist through Save and full presets.
- Added Preview → Save regression coverage and native Modern UI and border rendering checks in the packaged extension.

## [1.5.0] - 2026-09-08

- Added a versioned visual configuration and full preset import/export so Save and reload retain every Studio setting.
- Added draggable Studio controls and an Activity Bar entry; separated runtime rounding from native Modern UI layout.
- Extended shared glass, radius and motion styles to floating surfaces, including context menus inside VS Code shadow roots. Native OS dialogs retain their platform appearance.
- Corrected compositing: one viewport backdrop, translucent workbench regions, and a separate editor radial light. Removed the opaque editor content mask and Zen Mode margin masks.
- Shared glass opacity, neon and motion parameters between Theme Studio and runtime; preserved the existing composer and palette engine.
- Removed tab glow rectangles, large structural accent outlines and cyan resize separators. Active icons, thin tab lines and panel underlines remain.
- Preserved runtime opt-in across Save and draft Reset. Preview/Revert now updates/restores an already opted-in runtime.
- Added five compositing regression tests (41 total) and full-window runtime captures across nine layout/resize scenarios, with real bridge verification.

- **Restored Gradient Subsystem**: Restored ambient gradient and editor-centered softlight as first-class visual features in Theme Studio and the workbench engine.
- **Adjustable Gradient Softness**: Introduced spatial falloff and stop distribution controls (Defined, Balanced, Very Soft), decoupling transition smoothness from simple opacity.
- **Editor-Centered Softlight**: Added subtle, broad ambient illumination centered around the active editor content area without distracting glare or bleeding into sidebar, Activity Bar, or title bar chrome.
- **Perceptual OKLCH Color Derivation**: Derived all gradient roles (`gradient-base`, `gradient-accent`, `gradient-accent-muted`, `gradient-softlight`, `gradient-edge`) dynamically from BASE + ACCENT via the shared OKLCH palette engine.
- **Harmonious Preset Gradients**: All five presets (`Nitro Aqua`, `Mint`, `Electric Violet`, `Nitro Pink`, `Electric Blue`) automatically generate cohesive gradient and softlight atmospheres.
- **High-Performance Live Preview**: Theme Studio workbench preview updates gradient layers instantly in-memory without disk writes or extension-host bottlenecks.
- **Retained Modern Tab & Navigation Hierarchy**: Preserved all recent improvements to active tabs, Activity Bar states, Explorer selection, and panel navigation.
- **Recovery**: Runtime styling retains installation backups, a session journal and cleanup; color previews restore only settings they still own.
- **Documentation & Previews Updated**: Refreshed all screenshots, installation guides, and documentation for VS Code 1.136.1.

## [1.4.0] - 2026-09-08

- Added a full-canvas interactive workbench preview with floating, collapsible controls and a responsive bottom sheet.
- Added a shared OKLCH Base + Accent palette, five harmonious presets, grouped Undo/Redo, live palette inspection and contrast diagnostics.
- Refined tabs, Activity Bar, panels, tree selections and workbench surfaces; mapped VS Code 1.136.1 Modern UI color tokens as well.
- Added explicit JSON Export and reversible workbench preview using supported configuration APIs. Save reuses existing settings ownership.
- Preserved syntax definitions and separated syntax changes from workbench palette changes.
- Retired installation-patching effects. Their runtime artifacts are excluded from packaging; no automatic installation repair is attempted.
- Made native rounded Modern UI and file-family labels opt-in because they can override indicator and text hierarchy. Existing explicit preferences are retained.

## [1.3.2] - 2026-09-07

- Refresh the Marketplace package with the latest customizer installation guide and annotated screenshots.

## [1.3.1] - 2026-09-07

- Darken panel headers and add a contrasting active-tab surface, readable labels and accent underline.
- Apply editor font family, size, weight, line height and ligatures; restore owned preferences on reset or theme exit.
- Connect glass opacity to translucent popup surfaces so backdrop blur is visible; verify live glow intensity and spread.
- Refresh every preview with the current plum/blue palette and green accent.

## [1.3.0] - 2026-09-07

- Add a session-bound renderer helper for gradients across the editor and workbench, adjustable radius, consistent border strokes and borderless mode.
- Remove live CSS when switching themes or losing the extension session; back up and remove the helper on Reset.
- Add independent dark/light color intensity and contrasting accent-colored activity icons.
- Keep syntax readable across gradient endpoints and refine popup glow.
- Refresh purple-palette screenshots, Marketplace keywords, README and the minimal glass monogram logo.

## [1.2.0] - 2026-09-07

- Connect rounded corners to native VS Code Modern UI with ownership-aware restoration on theme switch, reset and deactivation.
- Refine active tab, navigation and Explorer states; soften widget shadow tint and add zero-shadow support.
- Add configurable shared/per-language syntax palettes, semantic token colors, Markdown styling, and bundled environment/plaintext grammars.
- Add theme-aware file-family label colors and an interactive multi-language preview.
- Document native shadow/radius limitations and include real dark/light workbench, file-format and customizer screenshots.
- Verify native layout and theme switching in an isolated VS Code development host.

## [1.1.0] - 2026-09-07

- Replace global CSS injection with native theme-specific colors; reset now restores Default Dark Modern.
- Recover legacy Nitro CSS/HTML with backups and preserve unrelated settings.
- Add SVG icons, accent and border controls, zero intensity, Surprise me, and responsive light/dark customizer styling.
- Use opaque editor, minimap and widget surfaces and contrast-adjusted text in both bundled themes.
- Label unsupported layout and font effects as preview only.
- Add lifecycle, contrast, recovery and browser interaction checks.
## [1.0.5] - 2026-09-04

### Fixed
- Direct workbench HTML injection ensuring whole-page multi-stop gradient cascades across editor canvas, editor text, tabs, navigation, and explorer.
- Rounded card borders and corners applied comprehensively across all pop-up tooltips, hover widgets, suggest widgets, quick input palette, find widget, context menus, file explorer rows, tabs, and navigation elements.
- Dynamic gradient direction support (0Â° - 360Â°) across all surfaces.

## [1.0.4] - 2026-09-04

### Fixed
- Tab text editor header bar, active/inactive tabs, and breadcrumbs to seamlessly flow into the whole-page gradient and frosted glass aesthetic.
- DOM selectors for `.title`, `.tabs-container`, and `.tab.active` to ensure complete theme transparency and gradient capsule styling.

## [1.0.0] - 2026-09-03

### Added
- Initial release of Gradient Nitro Glass Theme.
- Emerald (`#28A12F`) to Nitro Violet (`#A008B9`) horizontal gradient palette.
- Interactive Theme Customizer Webview UI (`gradientNitro.openCustomizer`).
- Low-contrast eye-friendly canvas with JetBrains IDE typography.
- Multi-layer neon emission diffusion and frozen glass styling.
