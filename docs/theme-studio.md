# Theme Studio 1.5.0 implementation report

This report records the 1.5.0 implementation. For the current 1.5.2 interface, side-menu access, Save and Apply workflow and animation, see the [preview guide](preview-guide.md). The [runtime coverage report](runtime-coverage.md) includes the subsequent Explorer/terminal transparency and interaction-contrast fixes.

## Corrective compositing pass — VS Code 1.136.1

The previous renderer mixed the composer gradient with editor softlight. A partial global fix then painted the same field on both the root and its pseudo-element, while `.part.editor > .content` remained opaque. That masked the field below code and produced mismatched slabs. Computed background properties alone did not expose the masked pixels.

`src/effects.ts` now paints the atmosphere exactly once on the session-scoped `.monaco-workbench::before`: fixed inset zero, pointer events disabled, negative stack level inside an isolated workbench. The root supplies the dark base. This uses the full viewport, independent of sidebars, panel height and editor splits. The `.part.editor` background contains only radial softlight. No editor group owns a copy of the global gradient.

`deriveComposition` extends the existing pure palette module without replacing its OKLCH engine or stop composer. Both renderers consume its gradient, tint colors, neon filter and motion scales. Atmospheric lighting takes its hues and opacity from composer stops; Auto softlight uses a lifted version of the existing light role so it illuminates rather than darkens the composited center.

| Surface | Tint role | Alpha at saved default opacity 0.70 |
| --- | --- | --- |
| Title Bar | base-0 | 0.266 |
| Activity Bar | base-1 | 0.266 |
| Primary / secondary sidebar | base-2 | 0.294 |
| Editor | base-4 | 0.336 |
| Panel | base-1 | 0.322 |
| Status Bar | base-0 | 0.364 |
| Headers above their parent surface | base-2 | 0.196 |

Blur and saturation apply to the main chrome surfaces. Editor content stays sharp. Disabling glass removes blur while keeping the independent gradient visible; disabling the gradient restores opaque surface colors. Only verified background masks are cleared: outer editor content, editor layout wrappers, main Monaco backgrounds/margins, tree/terminal wrappers and centered-layout margins. Sticky scroll, suggest, peek, selections, diagnostics, cursor and code retain their own rendering.

Structural outlines and neon box shadows were removed from editor/panel/sidebar regions. Structural focus and resize separators use derived neutral borders. Tabs retain native top/bottom indicators without filled rectangles; neon is confined to the thin indicator, active Activity Bar icon and small focus signals. There is no global accent shadow override.

The Theme Studio canvas uses the equivalent single backdrop beneath tinted regions and a radial background on its editor group. Angle, stops, opacity, softness, glass, softlight, custom neon and motion come from the same compiled module. Controls, logo, composer, presets, grouped history, save/export and recovery remain in place. Disabled motion now produces identity scales in the canvas too.

`Control → state → derivePalette / deriveComposition → CSS variables → preview`

`Save → normalized state → workbenchColors + deriveComposition → saved color overrides + opted-in runtime CSS`

`Export → normalized state → palette → VS Code tokens → theme JSON` (CSS effects are not representable in theme JSON).

Preview/Revert uses the existing color ownership journal. If runtime effects are already enabled, Apply Preview also updates the live session and Revert restores the saved composition. Draft controls never install the helper or communicate with the host. The explicit runtime flag now survives normalization and Save; draft Reset preserves that opt-in choice.

Verification for this pass: **41 automated tests passed**, including five new compositing tests. Browser interaction checks passed with no host messages during draft editing; palette/token calculation measured approximately **0.14ms** per update on this machine. The real extension bridge passed on **VS Code 1.136.1**, with **205 token IDs** checked. The driver uses the isolated `.vscode-test/code` application copy and verifies that the personal installation hashes are unchanged. It does not inject capture-only CSS.

Full-window screenshots were visually reviewed for all nine runtime scenarios: sidebar+panel open, sidebar only, panel only, neither, two editor groups, secondary sidebar, Zen Mode, 1120×800 window, and vertical panel resize. The review caught and corrected opaque Zen margins and the cyan resize sash. Main captures are [real workbench](images/workbench-preview.png) and [Theme Studio](images/theme-studio.png), using the same default composition. The panel-size and editor-size differences change only local softlight bounds, not the global field.

The optional runtime remains outside the supported color-theme API and requires the existing installation helper. An integrity notification was observed in the isolated modified distribution during QA; no integrity-check bypass was added. Standard JSON themes remain supported. This pass changes compositing rather than the helper transport or VS Code's layout engine.

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

In v1.5.0, the essential gradient and editor softlight features accidentally omitted in previous refactoring have been fully restored and integrated into the shared OKLCH visual engine. Runtime styling is encapsulated in `src/workbenchRuntime.ts` with failure-safe recovery journaling (`workbenchRuntimeJournal`), while standard theme generation uses native tokens.

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

## Gradient & Editor Softlight Engine (Restored in v1.5.0)

Gradient is treated as an integral component of the perceptual visual engine, participating directly in the shared OKLCH palette derivation:
- `gradient-base`: Matches `base-4` (editor background surface).
- `gradient-accent`: Derived from ACCENT with tailored chroma (75%) to maintain calm ambiance.
- `gradient-accent-muted`: Perceptual OKLab interpolation between `base-4` and ACCENT (8% tint).
- `gradient-softlight`: Derived from BASE with perceptual lightness elevation (`+0.075 * editorSoftlight` in dark mode, `+0.05 * editorSoftlight` in light mode) and subtle chromatic influence from ACCENT.
- `gradient-edge`: Slightly deeper than BASE to frame the illumination.

### Spatial Falloff & Stop Distribution (Gradient Softness)
Gradient Softness controls the spatial falloff and mathematical stop distribution rather than merely altering opacity:
- **Core stop**: `Math.round(15 + 20 * softness)%`
- **Mid stop**: `Math.round(35 + 28 * softness)%`
- **Outer stop**: `Math.round(65 + 35 * softness)%`

Low softness produces tighter falloff, medium produces balanced distribution, and high softness yields a diffuse, broad ambient glow with zero visible contour edges.

### Focal Hierarchy Isolation
- **Editor Content Area**: Receives the central elliptical softlight (`radial-gradient(...)`) combined with the ambient directional linear gradient.
- **Sidebar, Activity Bar, Title Bar**: Maintain solid, opaque backgrounds (`base-1`, `base-2`, `base-0`), preventing glow bleed into chrome and keeping the visual focus squarely on the code editing region.

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
- The optional 1.5.0 runtime is packaged and retains its backup/install/remove workflow. Effects beyond color tokens use that helper; standard theme JSON cannot encode gradients, blur or animation.

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
| `src/extension.ts` | Shared colors, host actions and ownership; preserves explicit runtime opt-in and coordinates live Preview/Revert |
| `src/files.ts` | File-family label decoration is opt-in |
| `themes/gradient-nitro-theme.json`, `themes/gradient-nitro-light-theme.json` | Regenerated workbench colors; syntax fields unchanged |
| `package.json` | Palette settings, native-layout/file-color defaults, deprecated legacy effects and test scripts |
| `.vscodeignore` | Packages the runtime and current full-window screenshots; excludes test artifacts |
| `scripts/generate-themes.cjs` | Shared workbench generation without rewriting syntax |
| `scripts/check-customizer.cjs` | Browser interaction, parity, responsiveness and no-host-message checks |
| `scripts/check-vscode.cjs`, `tests/vscode-runner.cjs` | Tests the actual bridge in an isolated application copy across nine runtime layouts |
| `tests/palette.test.cjs`, `tests/theme.test.cjs` | New palette/recovery tests and updated customizer/layout assertions |
| `README.md`, `CHANGELOG.md`, `docs/theme-studio.md` | Usage, migration, implementation and compatibility documentation |
| `docs/images/theme-studio.png`, `docs/images/theme-studio-light.png` | Current desktop canvas screenshots |

Reference: [VS Code theme color API](https://code.visualstudio.com/api/references/theme-color). Native layout behavior and additional Modern UI token registration were verified directly against the installed 1.136.1 workbench, without changing it.

## 1.5.0 build and preview update

The package and lockfile identify this build as 1.5.0. The README includes local VSIX installation steps and the current runtime/native/responsive gallery. `docs/preview-theme.json` includes the default global gradient and glass settings. See [preview guide](preview-guide.md) for capture details.

`scripts/refresh-previews.cjs` copies verified screenshots into the documented gallery; `npm run previews:refresh` runs capture checks first. The old `scripts/capture-guide.cjs` now forwards to this supported workflow. Historical effect screenshots remain in the repository but are excluded from packages.
