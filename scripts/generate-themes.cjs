const fs = require('fs');
const path = require('path');
const { harness } = require('../tests/harness.cjs');
const { readable } = require('../out/colors.js');
const { buildSyntax } = require('../out/syntax.js');
const { extension } = harness();
for (const themeMode of ['light', 'dark']) {
  const file = path.join(__dirname, '../themes', themeMode === 'light' ? 'gradient-nitro-light-theme.json' : 'gradient-nitro-theme.json');
  const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(theme.colors, extension.buildColors({ ...extension.getDefaultConfig(), themeMode }));
  Object.assign(theme, buildSyntax(themeMode, {}, theme.colors['editor.background']));
  fs.writeFileSync(file, JSON.stringify(theme, null, 2) + '\n');
}
