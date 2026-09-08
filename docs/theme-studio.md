# Theme Studio 1.4.0 implementation report

## Repository architecture discovered

- `package.json` points to `out/extension.js`, with startup activation and the existing Open Customizer, Reset and Clean commands.
- `contributes.themes` registers `Gradient Nitro Glass` (`vs-dark`, `themes/gradient-nitro-theme.json`) and `Gradient Nitro Glass Light` (`vs`, `themes/gradient-nitro-light-theme.json`). Names and paths are retained.
- `src/extension.ts` previously contained configuration normalization, a large embedded HTML/CSS/JS Webview, color generation, Save and recovery.
- `src/colors.ts` contains existing RGB/contrast helpers used by syntax. `src/syntax.ts`, `src/samples.ts`, `src/tokenSettings.ts` and the grammars own syntax and its persistence.
- Old workbench colors were duplicated in `buildColors`, Webview RGB calculations, `src/effects.ts`, and the generation script. The effects runtime injected a helper into installed VS Code files.
- Save uses `gradientNitro.*` user settings and theme-scoped `workbench.colorCustomizations`. `globalState.ownedColors` records replaced values; typography and syntax have their own ownership records.
- TypeScript compiles to CommonJS in `out/`. Prepublish runs `themes:generate`; packaging uses vsce. Existing tests include a VS Code harness and Playwright scripts.

## Minimum architecture changes implemented

The extension entry, theme contributions, syntax system, configuration persistence and build toolchain are retained. The Webview markup/styles/client code are extracted into `media/customizer.html`, `.css` and `.js`, with the host builder in `src/customizer.ts`. A pure `src/palette.ts` replaces duplicated workbench calculations. Both environments execute the identical compiled module; there is no copied browser color algorithm or new production dependency.

The active extension no longer imports or executes the effects runtime or legacy installation migration. Historical source modules remain in the repository for reference but their compiled artifacts and bridge are excluded from VSIX packages. The existing settings-only cleanup command remains.

## Palette architecture and derivation

The canonical Webview state contains the saved configuration and simulated UI fields. It stores no derived colors. Defaults are BASE `#120D24`, ACCENT `#22D3EE`, depth 1, contrast 1, intensity 1, inactive fade 0.5, border visibility 0.5 and Top Line.

1. Decode sRGB transfer values to linear light and convert to OKLab/OKLCH.
2. Derive six surfaces at the BASE hue. Relative lightness offsets are -0.022, 0, +0.022, +0.038, +0.028 and +0.062, scaled by surface depth. Chroma changes slightly with elevation. Light palettes reverse the direction.
3. Generate primary, secondary, muted and disabled foregrounds with very low BASE-family chroma. Contrast and inactive fade adjust their lightness.
4. Adjust ACCENT chroma and lightness with intensity. Increase/decrease lightness as necessary for at least 3:1 contrast against the main surfaces; textual suggestion highlights use 4.5:1.
5. Derive bright and muted accents in OKLCH. Selection and hover use OKLab interpolation toward the accent at 8.5% and 3.5%, respectively. These operations do not mix gamma-encoded RGB.
6. Derive borders through small BASE lightness offsets. Gamut mapping reduces chroma at constant lightness/hue via a bounded binary search.
7. Round to deterministic six-digit sRGB colors. Alpha is used for editor overlays that must not hide decorations.

Default generated examples:

| Role | Color |
| --- | --- |
| base-0 | `#0D081E` |
| base-1 | `#120D24` |
| base-2 | `#17122A` |
| base-3 | `#1A152F` |
| base-4 | `#18132C` |
| base-5 | `#201B36` |
| fg-primary | `#F2F1FE` |
| fg-secondary | `#C1BFCC` |
| fg-muted | `#8D8C97` |
| accent | `#22D3EE` |
| accent-bright | `#87ECFF` |
| accent-subtle | `#1D2038` |
| accent-hover | `#1A1830` |
| border-subtle | `#232033` |
| border-normal | `#2F2C40` |

Syntax remains independent: default theme token JSON is preserved exactly, workbench Save does not write syntax settings, and only an explicit syntax override uses the existing syntax generator. The Webview also uses the existing syntax module for optional syntax adjustments; it never derives syntax from BASE or ACCENT.

## Semantic VS Code mapping

The complete executable mapping is `workbenchColors()` in `src/palette.ts`.

| Region / token family | Role |
| --- | --- |
| Title and status bars | base-0 |
| Activity Bar, panel, terminal | base-1 |
| Sidebar, tab header, active/inactive tabs | base-2 |
| Editor, gutter, minimap, breadcrumbs | base-4 |
| Menus, inputs, quick input, widgets | base-5 |
| Active editor filename, active panel title, selected tree row | fg-primary |
| Inactive tabs, panel labels, navigation icons | fg-muted |
| Active Activity Bar icon and indicators | accent |
| `tab.activeBorderTop` | accent-border; bottom line transparent |
| Unfocused active top line | accent-muted |
| Tree selection | accent-subtle |
| Tree/tab hover | accent-hover |
| Container borders | border-subtle |
| Tree focus outlines | border-normal |
| Focus rings and cursor | accent |
| Modern UI active editor surface | base-2 |
| Modern UI active navigation backgrounds | transparent |

Modern UI colors are registered tokens verified in the installed 1.136.1 bundle, not internal CSS variable overrides. Borders, notifications, find matches, breadcrumbs and widget surfaces also use semantic roles; ANSI and source-control status colors remain distinct existing state palettes.

## Before / after

| Element | Before | After |
| --- | --- | --- |
| Active editor tab | Separate editor-colored or saturated effects fill, outline and rounded button geometry | Same background as header, bright filename and thin top signal; bottom line does not compete |
| Activity Bar | Inactive icons blended accent hues, runtime outlines/fills | Accent active icon; cool neutral inactive icons; transparent active background |
| Panel navigation | Inconsistent runtime/Modern UI fill | Bright active label and accent underline in standard layout; transparent Modern UI active fill |
| Explorer | Shared stronger accent selection and accent focus outline | Low-percentage perceptual tint and subdued focus outline |
| Surfaces | Independent gradient endpoints and fixed purple shades | One BASE hue with perceptual lightness hierarchy |

Default native rounded layout and file label decorations are opt-in because they can override line/foreground hierarchy. Existing explicit user settings and workspace policies remain available.

## Live preview architecture and flow

`UI control → canonical in-memory state → derivePalette → workbenchColors → semantic CSS variables → interactive preview`

The palette supplies `--theme-*` roles for controls, diagnostics and swatches. Preview regions primarily consume `--wb-*` properties corresponding to the exact exported VS Code tokens, including focused/unfocused states. Updates are batched with `requestAnimationFrame`; syntax uses its separate `--syntax-*` properties. HTML is rendered immediately from normalized initial state, with a nonce-based CSP and no remote resources or inline event handlers.

Preview components include title navigation/command center, five SVG navigation icons, sesa-pilot Explorer, three editor tabs, Python FastAPI code, line numbers, indentation, selection, cursor, minimap, Problems/Output/Debug Console/Ports/Terminal and status bar. Clicks update simulated states; native buttons, focus rings and arrow-key tab navigation support keyboard use.

The right overlay is 340px on wide canvases, 310px on medium canvases, and a collapsible 47vh bottom sheet below 700px. Motion is limited to short color/state transitions and slight control scaling, with reduced-motion support. No constant background animation is used.

Presets change only BASE, ACCENT and dark mode. Continuous edits are grouped with a 400ms quiet period or a completed change event; history is capped at 60. Reset is draft-only and undoable. Drafts are not persisted across Webview destruction.

Contrast feedback reports active/inactive text ratios and AA thresholds, indicator distinction, overly prominent borders and excessive hover chroma. Unusual mid-tone or saturated bases can still generate warnings; the tool does not silently constrain BASE to dark colors. Syntax contrast is not automatically changed with BASE.

## Save and export flow

`Customizer → state → palette → VS Code tokens → Save settings / Export theme JSON`

Save uses the existing `applyTheme` host message and theme-scoped recovery mechanism. It does not regenerate the installed theme file. Export merges the same token map into the corresponding contributed theme and opens a destination dialog. Build-time `themes:generate` refreshes the two shipped JSON files, preserving syntax fields.

Only Save, Export, Apply Preview and Revert send messages to the extension host. Slider/color input, presets, Reset and history produce no messages and no filesystem writes. Action results clear button busy states and distinguish failures from successful persistence.

## Optional real-workbench preview

`WorkbenchPreview` records the active theme scope, overwritten values and applied values in a separate recovery journal before changing global color overrides. Repeated previews revert the previous overlay first. Revert restores only values that still equal the applied colors, preserving subsequent manual edits and other scopes. Close, deactivation and next activation recover automatically; Save reverts the temporary overlay before persisting. A failed configuration write retains the journal for retry. Workspace overrides are never copied into user settings and can mask a preview.

## VS Code 1.136.1 limits

- Theme tokens control colors, not dimensions, DOM, animation or tab geometry. Actual indicator width is native.
- Side Line has no supported editor-tab token; native Save/Export uses Top Line and the UI states this explicitly.
- Modern UI has registered additional color tokens but can suppress standard line indicators and compute inactive text internally. The default standard layout reproduces the requested grammar. Modern UI remains optional; no CSS patches restore its hidden indicators.
- Classic Activity Bar hover has no independent foreground token. Modern UI's registered hover foreground token is mapped where available.
- Third-party file/SCM decorations and workspace overrides may supersede theme foregrounds. Nitro file-family colors are opt-in.
- Previously patched installation files are not repaired by this extension. The runtime is no longer loaded or packaged; installing a clean VS Code distribution is outside this change.

## Verification

- Unit/integration tests cover OKLCH round trips, gamut mapping, presets, extreme inputs, token hierarchy, browser/host parity, syntax preservation, ownership recovery and failed writes.
- Playwright covers live inputs, presets, Undo/Redo/Reset, interactive states, focus simulation, collapse, palette inspector, validation, host actions and responsive widths 1440/950/700/390. It asserts no host messages during draft editing.
- Real desktop VS Code 1.136.1 checks dark/light and Modern UI, actual Webview CSP/execution, Save, temporary preview/revert, reset and all mapped token IDs against the installed registry bundle. Installation file hashes are compared before/after.
- Browser palette/token calculation measured about 0.1ms per update on this machine; this is an observed measurement, not a cross-device latency guarantee.
- Shipped syntax JSON is compared against the pre-change Git version, and generated workbench colors are checked for build determinism.

Artifacts are written to `.vscode-test/theme-studio/`. Current representative screenshots are in `docs/images/theme-studio.png` and `theme-studio-light.png`.

## Files changed

| Files | Change |
| --- | --- |
| `src/palette.ts` | New shared OKLCH engine, presets, semantic token map and diagnostics |
| `src/customizer.ts` | Extracted Webview builder with CSP and shared compiled palette/syntax modules |
| `media/customizer.html`, `media/customizer.css`, `media/customizer.js` | Live canvas, overlay, state/history, interaction and local rendering |
| `src/workbenchPreview.ts` | New reversible configuration preview and recovery journal |
| `src/extension.ts` | Integrates shared colors, Webview and host actions; preserves Save ownership; disconnects patching |
| `src/files.ts` | File-family label decoration is opt-in |
| `themes/gradient-nitro-theme.json`, `themes/gradient-nitro-light-theme.json` | Regenerated workbench colors; syntax fields unchanged |
| `package.json` | Palette settings, native-layout/file-color defaults, deprecated legacy effects and test scripts |
| `.vscodeignore` | Excludes retired runtime bridge and compiled patch modules |
| `scripts/generate-themes.cjs` | Shared workbench generation without rewriting syntax |
| `scripts/check-customizer.cjs` | Browser interaction, parity, responsiveness and no-host-message checks |
| `scripts/check-vscode.cjs`, `tests/vscode-runner.cjs` | Tests the installed target in an isolated profile without installation changes |
| `tests/palette.test.cjs`, `tests/theme.test.cjs` | New palette/recovery tests and updated customizer/layout assertions |
| `README.md`, `CHANGELOG.md`, `docs/theme-studio.md` | Usage, migration, implementation and compatibility documentation |
| `docs/images/theme-studio.png`, `docs/images/theme-studio-light.png` | Current desktop canvas screenshots |

Reference: [VS Code theme color API](https://code.visualstudio.com/api/references/theme-color). Native layout behavior and additional Modern UI token registration were verified directly against the installed 1.136.1 workbench, without changing it.

## 1.4.0 build and preview update

The package and lockfile identify this build as 1.4.0. The README includes local VSIX installation steps and the current dark/light/native/responsive gallery. `docs/preview-theme.json` now uses Base + Accent settings, with no legacy gradient or runtime configuration. See [preview guide](preview-guide.md) for all current screenshots.

`scripts/refresh-previews.cjs` copies verified screenshots into the documented gallery; `npm run previews:refresh` runs capture checks first. The old `scripts/capture-guide.cjs` now forwards to this supported workflow. Historical effect screenshots remain in the repository but are excluded from packages.
