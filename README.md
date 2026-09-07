# Gradient Nitro Glass

**An elegant glass and gradient theme for Visual Studio Code.**

A minimal workspace with colorful language-aware syntax, purple dark and light palettes, and a visual customizer. Version **1.3.1** brings gradients into the text editor, adjustable rounded corners, consistent panel borders and independent color intensity for both modes.

[Marketplace](https://marketplace.visualstudio.com/items?itemName=dadayan1234.gradient-nitro-glass) | [Issues](https://github.com/dadayan1234/gradient-nitro/issues) | [Changelog](CHANGELOG.md)

## Installation

1. Open **Extensions** in VS Code with **Ctrl+Shift+X** on Windows/Linux or **Cmd+Shift+X** on macOS.
2. Search for **Gradient Nitro Glass Theme** and select **Install**. To install a downloaded package instead, open the Command Palette, run **Extensions: Install from VSIX...**, and select `gradient-nitro-glass-1.3.1.vsix`.
3. Open the **Command Palette** with **Ctrl+Shift+P** on Windows/Linux or **Cmd+Shift+P** on macOS. **F1** also opens it.
4. Run **Preferences: Color Theme**, then select **Gradient Nitro Glass** or **Gradient Nitro Glass Light**.
5. Open the built-in customizer below to make the theme your own. On first use of live workbench effects, select **Reload Window** when prompted; later adjustments apply live.

## Open the built-in customizer

**This theme includes a visual customizer.** Change the gradient, accent, fonts, borders, rounded corners, shadows, glass effects and language-specific syntax colors without editing JSON.

### Steps 1–2: Find and open the customizer

Press **Ctrl+Shift+P** (Windows/Linux), **Cmd+Shift+P** (macOS), or **F1** to open the Command Palette. Type **Gradient Nitro**, then click **Theme: Gradient Nitro: Open Theme Customizer**. You can also select it with the arrow keys and press **Enter**.

![Real VS Code screenshot: yellow boxes 1 and 2 highlight the Command Palette search field and Open Theme Customizer command](docs/images/guide-open-customizer.png)

### Step 3: Customize your theme

The customizer opens as an editor tab. Adjust the gradient colors or select a preset. Scroll down for font settings, borders, rounded corners, Shadows & Glass, and language-specific syntax colors. Try **Surprise me** for a fresh palette.

![Real VS Code screenshot: yellow box 3 highlights the gradient controls inside the visual customizer](docs/images/guide-customize.png)

### Step 4: Apply your changes

Scroll to the bottom and click **Apply Real-time Changes** to save and apply your choices. On first use of live workbench effects, select **Reload Window** when prompted. Later adjustments apply live.

![Real VS Code screenshot: yellow box 4 highlights the Apply Real-time Changes button at the bottom of the customizer](docs/images/guide-apply.png)

*These are screenshots of the actual VS Code interface with yellow highlight boxes and numbered instructions added for this guide.*

Requires desktop VS Code **1.129.0 or newer**. Live effects modify the installed workbench HTML to load a small helper and require write access to that installation. Original files are backed up in extension global storage. VS Code updates may require reapplying the helper and reloading. Native theme colors remain available with live workbench effects disabled.

## Preview

![Purple glass gradient VS Code dark theme with colorful syntax and rounded panels](docs/images/workbench-dark.png)

![Elegant light gradient VS Code theme with readable code and colored navigation icons](docs/images/workbench-light.png)

![Colorful Markdown and environment file syntax](docs/images/file-formats.png)

Real screenshots from VS Code **1.136.1**, using the included examples and plum `#480f40` and blue `#00118f`, with green accent `#00852c`. The current preview uses Fira Code at 16 px, 13 px corners and 25% dark intensity. Reproduce it with [preview settings](docs/preview-theme.json).

## Controls

| Control | Result |
| --- | --- |
| Color stops and direction | Gradient across the workbench and text editor |
| Dark / light intensity | Independent richness; higher values bring out more color |
| Accent | Contrasting navigation icons, active states and buttons |
| Show borders | Bordered or borderless panels and controls |
| Border color / thickness | Consistent inset strokes without changing spacing |
| Rounded corners / radius | Live radius for panels, tabs, inputs and widgets |
| Glow intensity / spread | Live widget elevation; zero removes glow |
| Glass blur / opacity | Translucent floating widgets with adjustable backdrop blur |
| Editor typography | Apply font family, size, line height, weight and ligatures |
| Surprise me | Generate a fresh palette to preview and apply |

Keyboard focus indicators remain visible in borderless mode. Operating-system dialogs and third-party extension webviews have separate styling. Typography controls apply editor font family, size, line height, weight and ligatures. Reset or leaving Nitro restores previous preferences while preserving later manual edits. Workspace and language-specific overrides retain precedence. Fonts must be installed on your system.

## Colorful syntax

Panel headers use a darker surface. Active editor tabs have an accent-tinted fill, a visible underline and contrast-adjusted text, including the Modern UI tab fill.

![Translucent code tooltip with the current glass opacity, blur and green glow](docs/images/tooltip-dark.png)

Customize variables, parameters, keywords, functions, types, strings, numbers and comments by language. Select a language in the syntax studio, adjust its palette, then Apply. **Reset this language palette** clears draft overrides for that language.

![Language-specific syntax palette customizer](docs/images/syntax-studio.png)

Supported families include JavaScript/TypeScript, Python, Dart, Go, Rust, Java, C/C++, C#, PHP, Ruby, Swift, Kotlin, shell, PowerShell, SQL, HTML/Vue, CSS, JSON, YAML, TOML, Markdown, environment files and plain text. Language extensions supply semantic information where available. Bundled grammars color environment and plain-text tokens; Explorer decorations distinguish file families.

Token colors are adjusted for readability across the gradient. Use **Developer: Inspect Editor Tokens and Scopes** to inspect the tokens provided by your language extension.

```json
{
  "gradientNitro.darkIntensity": 0.8,
  "gradientNitro.lightIntensity": 0.75,
  "gradientNitro.borderEnabled": true,
  "gradientNitro.borderColor": "#b45cad",
  "gradientNitro.borderWidth": 1,
  "gradientNitro.borderRadius": 24,
  "gradientNitro.syntaxOverrides": {
    "typescript": { "variable": "#bbaaff", "keyword": "#ff82c4" }
  }
}
```

After editing settings, open the customizer and Apply.

## Reset and recovery

Run the **Gradient Nitro** reset or clean-settings command to restore **Dark Modern**, remove the helper and restore settings owned by Nitro. Later manual edits are preserved where ownership can be determined.

The helper receives styles from a local extension session. Switching themes, stopping or removing the extension disconnects that session and removes live styles. A heartbeat timeout clears styles after unexpected disconnection. An inert helper may remain after uninstall; use Reset before uninstalling to remove it from disk.

Legacy Nitro CSS blocks are backed up and removed during migration. Reload once to clear old styles already loaded in memory. Very old versions did not record every replaced preference, so those values cannot always be reconstructed.

If effects are missing, enable live effects, Apply and reload once. Installation write errors appear in notifications. Workspace overrides take precedence over user settings. For environment files, check the language mode and `files.associations`.

## Development

```sh
npm install
npm test
npm run themes:generate
npm run package
```

`scripts/check-vscode.cjs` uses Playwright and a separate VS Code copy with an isolated profile to verify rendering and capture screenshots. It does not install the extension into your regular profile.

Logo: a geometric glass monogram generated with the built-in imagegen tool. See [asset provenance](docs/logo-provenance.md).

[MIT](LICENSE.md) | dadayan1234
