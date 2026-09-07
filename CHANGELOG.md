# Changelog

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
