# Gradient Nitro Glass Theme 🟢🟣

An ultra-modern, glassmorphism VS Code theme with full whole-page multi-stop gradient cascades, floating rounded editor cards, acrylic backdrop blur, JetBrains IDE typography, and an interactive real-time Theme Customizer.

---

## ✨ Features

- 🌈 **Whole-Page Gradient Canvas**: Continuous gradient flowing seamlessly through the entire workbench and code editor.
- 🪟 **Floating Rounded Cards**: Floating editor windows, tabs, sidebars, and panels with configurable corner radius.
- ❄️ **Acrylic Glassmorphism**: Frosted glass backdrop blur and ambient neon glow on hover widgets, autocompletes, and popups.
- 🎛️ **Interactive Theme Customizer**: Built-in GUI panel to customize multi-stop color palettes, angles, intensity, blur strength, and fonts live.
- 🌓 **Dark & Light Modes**: Full support for both dark and light gradient glass aesthetics.
- ⚡ **High Contrast & Clarity**: Crisp text, sharp tabs, and distinct status indicators designed for long coding sessions.

---

## 🚀 Installation

### Option 1: From VS Code Marketplace (Recommended)
1. Open VS Code.
2. Go to the Extensions view (`Ctrl + Shift + X`).
3. Search for `Gradient Nitro Glass Theme`.
4. Click **Install**.

### Option 2: From VSIX Package
1. Download `gradient-nitro-glass-x.x.x.vsix`.
2. In VS Code, press `Ctrl + Shift + P` -> select **Extensions: Install from VSIX...**.
3. Choose the `.vsix` file.

---

## 📖 Usage Guide

### 1. Activating the Theme
1. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on macOS).
2. Select **Preferences: Color Theme**.
3. Choose **Gradient Nitro Glass** (Dark) or **Gradient Nitro Glass Light**.

### 2. Opening the Theme Customizer
1. Press `Ctrl + Shift + P`.
2. Search and select: **Gradient Nitro: Open Theme Customizer**.
3. From the Customizer panel, you can:
   - **Edit Color Stops**: Click any color pin on the gradient bar, change its color, add new stops, or drag offsets.
   - **Gradient Angle**: Adjust the flow direction (0° to 360°).
   - **Intensity & Glass Blur**: Fine-tune background saturation and Gaussian blur.
   - **Rounded Corners**: Toggle rounded windows and adjust corner radius slider (4px – 24px).
   - **Font Studio**: Select JetBrains Mono, Fira Code, Cascadia Code, or custom font with ligatures.
4. Click **Apply Real-time Changes** and reload the window when prompted.

### 3. Restoring Defaults
Run **Gradient Nitro: Reset to Default Settings** from the Command Palette anytime to restore original settings.

---

## ❓ Troubleshooting: "Installation appears to be corrupt"

Because Gradient Nitro Glass customizes the core CSS to achieve whole-page transparency and custom glassmorphism effects, VS Code's background file integrity check may show a notification:
> *"Your Code installation appears to be corrupt. Please reinstall."*

**This is completely normal and expected for deep-customization themes.**

### How to dismiss it:
1. When the notification appears, click the **Gear (⚙️) icon** on the notification prompt.
2. Select **"Don't Show Again"**.
3. The prompt is permanently dismissed.

---

## 🛠️ Development & Maintenance Workflow

### Updating and Publishing New Versions

```bash
# 1. Bump version (patch for fixes, minor for features)
npm version patch

# 2. Compile TypeScript
npm run compile

# 3. Package extension into .vsix
npx @vscode/vsce package

# 4. Publish directly to VS Code Marketplace
npx @vscode/vsce publish
```

*Note: Publishing requires a Personal Access Token (PAT) from [dev.azure.com](https://dev.azure.com) with "Marketplace (Acquire, Manage)" permissions.*

---

## 📄 License

MIT © dadayan1234
