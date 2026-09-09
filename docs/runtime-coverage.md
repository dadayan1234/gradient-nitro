# Runtime coverage

## 1.5.3 release verification

The stable 1.5.3 build passed 53 unit tests, Studio browser interactions, lint, and 60 installed-VSIX integration phases with 46 surface captures. Integration evidence: `.vscode-test/parity-1788940967410`. Personal VS Code installation hashes remained unchanged.

Four separate release captures in `.vscode-test/parity-1788940660615` use exactly two custom stops and lavender softlight. The release gallery is copied from these captures, not the diagnostic regression palette. The shared preset preserves users' existing defaults and saved settings.

Local release validation confirms the version/lockfile, stable manifest, packaged runtime/source parity, HTTPS README URLs and bundled media. The versioned GIF is 960 × 686, 179 frames, 14.91 seconds and 739,588 bytes, with nonzero frame delays and infinite looping.

Public-media verification returned HTTP 404 for all five README image URLs during preparation. **Marketplace publication must wait until the release media is pushed to public `main` and `npm run release:media` passes.** Local GIF playback cannot establish Store-page behavior while its source URL is unavailable. See [the release guide](release-guide.md).

## 1.5.2 verification

The installed 1.5.2 VSIX passed 60 integration phases and 46 surface captures on 2026-09-09. Evidence is in `.vscode-test/parity-1788939347325`; selected screenshots are included in the preview guide. Personal VS Code installation hashes remained unchanged.

All 53 unit tests, Studio browser interaction checks, TypeScript/JavaScript lint and README/preview-guide local link checks passed.

- Dark/light themes and classic/Modern UI layouts: all Explorer and terminal ancestor backgrounds are translucent; a blank terminal pixel matches the backdrop with the terminal canvas hidden, within two RGB levels.
- Explorer hover/selection and active editor-tab labels: computed foreground/background contrast is at least 4.5:1 in all four combinations.
- Side-menu Save and Apply: submits an edited open Studio draft, then reapplies the same configuration after Studio closes.
- Existing Save/reload, border widths, floating surfaces, glass, neon and motion checks continue to pass.

The regression removes opaque `.monaco-pane-view .pane` layers in sidebars and panels. Runtime colors also make `terminal.background` transparent; native theme JSON exports retain an opaque terminal background. Applications that explicitly paint ANSI background colors remain in control of those colors.

The documentation GIF records real browser-rendered Studio interactions: 174 frames at 960 × 686, approximately 629 KB. It is not a recording of the native VS Code renderer.

## 1.5.1 regression verification

On 2026-09-09, the installed 1.5.1 VSIX passed 53 phases and 42 surface captures in `.vscode-test/parity-1788937571863`. All 51 unit tests, browser interactions and lint passed as well.

The previous build reproduced the Save failure when native Modern UI was enabled: `.monaco-workbench > .monaco-grid-view` had an opaque `rgb(13, 8, 30)` background covering the viewport gradient. The fixed build keeps that layout container transparent. The `modern-save.png` capture confirms the diagnostic gradient remains visible after Save. The suite also exercises Preview then Save, waits beyond the bridge timeout, and verifies configuration after reload.

Border checks verify popup widths of 0, 1, 3 and 4px, a custom color at full visibility, and disabling borders. Browser checks cover the picker/hex configuration, canvas thickness, preserving thickness when visibility changes, and the Save payload. Native theme exports contain colors; runtime effects provide adjustable thickness.

## 1.5.0 baseline verification

Verified on 2026-09-09 against desktop VS Code 1.136.1, using the installed 1.5.0 VSIX in an isolated application copy and profile. The packaged integration run passed 46 phases with 37 surface captures. Personal installation file hashes remained unchanged.

Evidence: `.vscode-test/parity-1788935522356/results.json` and adjacent screenshots/DOM captures. These local test artifacts are excluded from the VSIX.

| Area | Verification |
| --- | --- |
| Configuration | Exact complete configuration equality after Studio Save, window reload, and delivery to the renderer bridge |
| Gradient | Diagnostic red/green/blue stops at 0 and 90 degrees; low/high softness |
| Glass | Blur at 0, 16, 24 and 40px; popup computed radius, translucency, blur and shadow |
| Motion | Computed hover and press scales at 0/50/100% strength; duration/easing at 0/50/100% spring |
| Softlight and neon | Captured individual strength, spread, softness, radius, opacity, custom color and disabled states |
| Studio | Reopened controls retain saved values; 420px panel drags and resets position |
| Activity Bar | Native view opens Theme Studio |

Popup checks cover the command palette, editor context menu, Activity Bar and toolbar tooltips, editor and diagnostic hovers, suggestions, parameter hints, Find, Peek, notification toast, notification center, and custom dialog.

VS Code context menus use an open shadow root. The runtime inserts scoped floating-surface styles into that root while the Nitro session is active and removes them when the session clears. The enclosing scrollable menu surface is transparent so it does not mask the glass shell.

Native operating-system dialogs are outside renderer CSS coverage. The test profile explicitly uses `window.dialogStyle: custom`; the extension does not change that preference. The selector registry targets 1.136.1; compatibility with other versions has not been established by this run.

Additional checks: 50 unit tests, TypeScript/JavaScript lint, and Theme Studio browser interactions passed. The state-parity audit documents the baseline before implementation; this report records the completed verification.
