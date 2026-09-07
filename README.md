# Gradient Nitro Glass

**A colorful workspace with native rounded surfaces and language-aware syntax.**

Gradient Nitro pairs dark and light palettes with clear token colors, distinct active states, and a customizer for making the workspace your own. Version **1.2.0** uses VS Code?s native Modern UI for rounded components?no new workbench CSS injection.

[Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=dadayan1234.gradient-nitro-glass) ? [Report an issue](https://github.com/dadayan1234/gradient-nitro/issues) ? [Changelog](CHANGELOG.md)

## Preview

### Dark

![Gradient Nitro dark theme with rounded editor, Explorer, tabs and terminal](docs/images/workbench-dark.png)

### Light

![Gradient Nitro light theme with colorful TypeScript and opaque editor surfaces](docs/images/workbench-light.png)

### Markdown and environment files

![Markdown and environment syntax highlighting in a split VS Code editor](docs/images/file-formats.png)

These are screenshots from VS Code **1.136.1**, captured in an isolated development profile with the included example files. Window chrome, icons and native corner sizes can differ by VS Code version and platform.

## Features

- **Native rounded workspace.** Modern UI rounds editor groups, panels, tabs, Explorer selections, buttons and supported floating widgets using VS Code?s built-in radius scale.
- **Colorful syntax.** Separate colors for variables, parameters, properties, keywords, functions, types, strings, numbers, constants and comments. Markdown adds headings, emphasis, links and inline code.
- **Per-language palettes.** Start with shared colors, then override individual languages. TypeScript and JavaScript React variants share their parent language palette.
- **Balanced shadows.** Gentle native elevation, with accent-tinted shadow colors where supported. Light mode uses a softer tint; zero intensity disables native shadows while Nitro is active.
- **File label colors.** Explorer and tab labels distinguish code, markup, data, documentation and environment files. Existing source-control decorations may take precedence.
- **Readable surfaces.** Opaque editor, minimap, tooltip and terminal backgrounds; token colors are adjusted toward at least 4.5:1 contrast against the configured editor background.
- **Surprise me.** Generate a palette, review it in the customizer, and apply it when ready.

## Installation

Requires **VS Code 1.129.0 or newer**. Rounded layout is checked at runtime for native Modern UI support.

1. Install **Gradient Nitro Glass Theme** from Extensions, or run **Extensions: Install from VSIX...** and select `gradient-nitro-glass-1.2.0.vsix`.
2. Run **Preferences: Color Theme**.
3. Choose **Gradient Nitro Glass** or **Gradient Nitro Glass Light**.
4. Run **Gradient Nitro: Open Theme Customizer** to adjust your workspace.

After upgrading from a release that injected CSS, reload the window once if prompted.

## Make it yours

### Workspace colors and layout

1. Select dark or light mode.
2. Choose a preset or edit the palette?s color points.
3. Adjust **Palette Color Intensity**, the independent accent, and border color.
4. Enable rounded corners to use native Modern UI. Set shadow intensity to a comfortable level.
5. Click **Apply Real-time Changes**.

Native changes apply without a reload. A workspace-level layout setting takes precedence over the customizer?s user-level setting.

### Syntax colors

![Language palette controls in the actual customizer webview](docs/images/syntax-studio.png)

1. Open **Language & Syntax Colors**.
2. Select **All languages** to edit shared token colors, or choose a specific language.
3. Change a role such as **variable**, **keyword**, **function**, or **string**.
4. Review the code sample, then click **Apply Real-time Changes**.
5. Use **Reset this language palette** to discard that language?s draft overrides, then Apply to save.

A very dark color chosen in dark mode, or a very light color in light mode, is adjusted to keep the text readable. The same saved override can therefore render differently in the two modes. The active language comes from VS Code?s language mode, not merely the file?s name.

| Language / format | Coverage |
| --- | --- |
| JavaScript, JSX, TypeScript, TSX | TextMate scopes and language-specific semantic token colors |
| Python, Dart, Go, Rust, Java, C/C++, C#, PHP, Ruby, Swift, Kotlin | Token roles and language palettes; requires the appropriate grammar/language extension |
| HTML / Vue, CSS / SCSS / Less | Tags, attributes, property names, values and embedded language scopes |
| JSON / JSONC, YAML, TOML, INI, SQL | Keys, values, strings, constants, numbers and comments where grammars provide them |
| Markdown | Headings, emphasis, links, lists, quotes and inline code; fenced code uses installed grammars |
| `.env`, `.env.*`, `*.env` | Bundled grammar for keys, export, values, interpolation, numbers and comments |
| Plain text / `.txt` | Bundled lightweight grammar for URLs, email addresses, numbers, headings and TODO-style markers |

Semantic highlighting becomes more precise when the language extension provides semantic tokens. Nitro supplies colors, not a replacement language server. User file associations and explicit semantic-highlighting settings are respected. Bundled grammars remain registered while this extension is installed; their colors follow whichever theme is active.

For settings-based configuration, edit `gradientNitro.syntaxOverrides` and Apply from the customizer:

```json
{
  "gradientNitro.syntaxOverrides": {
    "all": { "comment": "#96A6BB" },
    "python": { "keyword": "#F49AC2", "variable": "#8BD5FF" },
    "markdown": { "heading": "#C4AEFF", "link": "#68D9EF" }
  }
}
```

### Native controls and preview effects

| Control | Applied to VS Code |
| --- | --- |
| Palette intensity, accent, border color, syntax and file label colors | Yes |
| Rounded corners | Enables native Modern UI; VS Code controls exact radii |
| Shadow intensity | On/off for native shadows; tint where the widget supports theme shadow colors |
| Custom corner radius and nonzero border thickness | Preview only; native geometry is controlled by VS Code |
| Full gradients, direction, blur, glass opacity and font preview | Preview only |

Some Modern UI widgets use fixed neutral shadows rather than `widget.shadow`; their tint and spread cannot be changed through the public color-theme API. Nitro keeps these native shadows instead of patching installation files. The effects preview demonstrates the custom layout controls and is not a pixel-identical screenshot of the workbench.

## Reset and recovery

Run **Gradient Nitro: Reset to Default Settings** to return to **Default Dark Modern**, remove Nitro preferences and restore settings replaced by the customizer. **Gradient Nitro: Clean All Injected Settings & Styles** performs the same recovery.

Native layout preferences are tracked and restored when switching away from Nitro or during normal extension deactivation. Subsequent user edits are preserved. Color and syntax overrides are stored under Nitro-specific theme scopes, so they do not recolor another theme. Reset before uninstalling if you also want to remove those stored preferences.

Old CSS/HTML blocks are recognized by Nitro?s markers, backed up and removed during legacy recovery. A window reload clears styles already loaded in memory. Old releases did not record the fonts or colors they replaced, so those earlier values cannot be reconstructed.

## Troubleshooting

- **Corners are still square:** confirm Modern UI is available and check whether your workspace overrides `workbench.experimental.modernUI`. Enable the rounded option and Apply.
- **Variables look similar:** verify the file?s language mode and install its language extension. Use **Developer: Inspect Editor Tokens and Scopes** to inspect the grammar/semantic token that supplies a color.
- **An environment file stays plain:** use **Change Language Mode ? Environment**, or check your `files.associations` overrides.
- **A file label uses a Git color:** source-control decorations can take priority. The file-label option does not replace your icon theme.
- **Legacy styles remain:** run Clean, then **Developer: Reload Window**. Recovery reports errors if a protected installation cannot be updated.

## Development

```sh
npm ci
npm test
npm run themes:generate
npm run package
```

The bundled themes are generated from the same color and syntax engines used by the customizer. Update the package version with `npm version patch --no-git-tag-version` for a new maintenance release.

The optional `scripts/check-vscode.cjs` integration check launches VS Code with an isolated profile, verifies native layout and reset behavior, and captures the README screenshots. It uses Playwright via `PLAYWRIGHT_MODULE`; `scripts/check-customizer.cjs` also checks narrow layouts and webview interactions. These tools do not install the development extension into your normal profile.

Commit screenshot assets with the release before publishing so repository and Marketplace image links resolve. Publishing is a separate step from packaging.

## License

[MIT](LICENSE.md) ? dadayan1234
