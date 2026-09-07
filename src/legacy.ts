import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

/** Remove only the delimited block written by old Nitro releases. No new CSS injection. */
export async function removeLegacyWorkbenchStyles(appRoot: string, backupRoot: string): Promise<boolean> {
    const relative = 'vs/code/electron-browser/workbench/workbench.html';
    const file = path.join(appRoot, 'out', relative);
    let original: string;
    try { original = await fs.readFile(file, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
    const cleaned = original.replace(/<!-- !! GRADIENT-NITRO-CSS-START !! -->[\s\S]*?<!-- !! GRADIENT-NITRO-CSS-END !! -->/g, '');
    if (cleaned === original) return false;
    const backup = path.join(backupRoot, new Date().toISOString().replace(/[:.]/g, '-'));
    await fs.mkdir(backup, { recursive: true });
    await fs.writeFile(path.join(backup, 'workbench.html'), original);
    const productFile = path.join(appRoot, 'product.json');
    const productText = await fs.readFile(productFile, 'utf8');
    const product = JSON.parse(productText);
    await fs.writeFile(path.join(backup, 'product.json'), productText);
    await fs.writeFile(file, cleaned);
    if (product.checksums?.[relative]) {
        product.checksums[relative] = createHash('sha256').update(cleaned).digest('base64').replace(/=+$/, '');
        await fs.writeFile(productFile, JSON.stringify(product, null, '\t'));
    }
    return true;
}
