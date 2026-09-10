# Release 1.6.0

## Build and validate

The release uses a stable semantic version, without a prerelease flag. This release fixes menu popup layering and switches new distributions to PolyForm Noncommercial License 1.0.0. Versions through 1.5.3 remain MIT.

```sh
npm test
npm run lint
npm run test:customizer
npm run package
node scripts/check-parity.cjs
npm run release:check
```

`release:check` uses Python's standard library. It checks package/lockfile versions and licenses, the VSIX store license asset, the two-stop preview preset, GIF structure/frame timing/looping, packaged README HTTPS image URLs, bundled asset bytes and source/build parity. It writes `gradient-nitro-glass-1.6.0.vsix.sha256` next to the VSIX inside `release/`.

The installed-extension suite passed 60 phases on desktop VS Code 1.136.1 on Windows. A focused suite passed five phases on Antigravity 1.107.0, including 32 menu checks. Both use isolated application copies and fresh profiles. See [runtime coverage](runtime-coverage.md) for scope and evidence; Linux was not rerun in this release verification.

## Release palette

All current release previews use Midnight Studio, defined in [preview-theme.json](preview-theme.json). The dark presentation uses exactly two custom gradient stops:

| Setting | Value |
| --- | --- |
| Base / Accent | `#10111F` / `#B9AEED` |
| Stop 1 | `#243B61` at 0%, opacity 0.90 |
| Stop 2 | `#51344F` at 100%, opacity 0.85 |
| Gradient | 125°, strength 0.38, softness 0.95 |
| Softlight | Custom `#C4BAF4`, strength 0.32, spread 0.95, softness 0.95 |
| Glass | Opacity 0.62, blur 20px |
| Border | 1px, visibility 0.28 |

[Import the full Midnight Studio preset](midnight-studio.gradient-nitro.json) in Studio to reproduce this appearance. Existing users' saved configuration and the extension's default presets are preserved.

To refresh every release image, build a matching VSIX, run `npm run previews:refresh`, then rebuild the VSIX. This workflow records the shared two-stop configuration and copies verified release captures. Diagnostic RGB test images are retained only in local test output.

## Publish media before uploading the VSIX

The previous GIF URL returned HTTP 404 during preparation. An image bundled inside a VSIX is not sufficient when the Marketplace README references a GitHub URL.

This package rewrites README images to `https://raw.githubusercontent.com/dadayan1234/gradient-nitro/main/`. The unchanged GIF keeps its published URL, versioned as `theme-studio-motion-1.5.3.gif` to avoid reusing the old URL. It loops continuously and begins with a complete preview. The README also includes a static poster and direct GIF link for viewers that do not animate inline images.

Before uploading:

1. Commit and push the release files, including `docs/images`, README and the importable preset, to the repository's public `main` branch.
2. Run `npm run release:media`. Every public README image must return image content identical to its local release file. Missing or stale assets fail this check.
3. Run `npm run release:check` again and upload the checked `release/gradient-nitro-glass-1.6.0.vsix` through the Marketplace publisher page.
4. After publishing, open the Store page and test the inline GIF and its direct link. A local browser animation test cannot establish that a hosted Store page will autoplay in every viewer.

Do not upload while `release:media` reports missing or stale files. Preparing the local build does not push repository files or publish the extension.

Microsoft documents HTTPS image URLs and README link rewriting in the [extension publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Open VSX license metadata

Publish the new `release/gradient-nitro-glass-1.6.0.vsix`; editing repository files alone does not update an existing store version. The package SPDX identifier is `PolyForm-Noncommercial-1.0.0`, and the VSIX license asset contains the complete terms from [SPDX](https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html). Confirm the latest listing shows that identifier after publishing. The Contributor License Grant applies separately to incoming contributions.

For the local Antigravity 1.107.0 fixture, copy the application to `.vscode-test/antigravity` and run `node scripts/check-parity.cjs --antigravity --surfaces-only`. The script creates a fresh offline profile with onboarding completed, without copying account data.
