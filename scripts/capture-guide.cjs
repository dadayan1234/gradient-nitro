// Compatibility entry point: capture the current studio without installation patches.
const { execSync } = require('node:child_process');
const path = require('node:path');
execSync('npm run previews:refresh', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true });
