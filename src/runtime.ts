import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';
import { createHash } from 'crypto';
import { Duplex } from 'stream';

const start = '<!-- GRADIENT-NITRO-RUNTIME-START -->';
const end = '<!-- GRADIENT-NITRO-RUNTIME-END -->';
const block = /<!-- GRADIENT-NITRO-RUNTIME-START -->[\s\S]*?<!-- GRADIENT-NITRO-RUNTIME-END -->\r?\n?/g;
const relative = 'vs/code/electron-browser/workbench/workbench.html';
export async function installRuntime(appRoot: string, extensionRoot: string, backupRoot: string, enabled: boolean): Promise<boolean> {
    const htmlPath = path.join(appRoot, 'out', relative);
    const loaderPath = path.join(path.dirname(htmlPath), 'gradient-nitro-runtime.js');
    const original = await fs.readFile(htmlPath, 'utf8');
    const clean = original.replace(block, '');
    const updated = enabled ? clean.replace('</html>', `${start}\n<script type="module" src="./gradient-nitro-runtime.js"></script>\n${end}\n</html>`) : clean;
    if (enabled && updated === clean) throw new Error('Unsupported workbench HTML: missing closing html tag.');
    const loader = enabled ? await fs.readFile(path.join(extensionRoot, 'media', 'workbench-runtime.js'), 'utf8') : '';
    let previousLoader = '';
    try { previousLoader = await fs.readFile(loaderPath, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    if (previousLoader && !previousLoader.startsWith('/* Gradient Nitro runtime bridge v1 */')) throw new Error('Runtime filename is occupied by an unrelated file.');
    if (updated === original && (!enabled || previousLoader === loader)) return false;
    const backup = path.join(backupRoot, new Date().toISOString().replace(/[:.]/g, '-'));
    await fs.mkdir(backup, { recursive: true });
    const productPath = path.join(appRoot, 'product.json');
    const productText = await fs.readFile(productPath, 'utf8');
    const product = JSON.parse(productText);
    await fs.writeFile(path.join(backup, 'workbench.html'), original);
    await fs.writeFile(path.join(backup, 'product.json'), productText);
    if (previousLoader) await fs.writeFile(path.join(backup, 'gradient-nitro-runtime.js'), previousLoader);
    try {
        if (enabled) await fs.writeFile(loaderPath, loader);
        await fs.writeFile(htmlPath, updated);
        if (product.checksums?.[relative]) {
            product.checksums[relative] = createHash('sha256').update(updated).digest('base64').replace(/=+$/, '');
            await fs.writeFile(productPath, JSON.stringify(product, null, '\t'));
        }
        if (!enabled && previousLoader) await fs.unlink(loaderPath);
    } catch (error) {
        await fs.writeFile(htmlPath, original).catch(() => {});
        await fs.writeFile(productPath, productText).catch(() => {});
        if (previousLoader) await fs.writeFile(loaderPath, previousLoader).catch(() => {});
        else await fs.unlink(loaderPath).catch(() => {});
        throw new Error('Could not install/remove Nitro workbench effects. Backup: ' + backup + '. ' + String(error));
    }
    return true;
}

function frame(value: string): Buffer {
    const data = Buffer.from(value);
    if (data.length < 126) return Buffer.concat([Buffer.from([0x81, data.length]), data]);
    if (data.length > 65535) throw new Error('Runtime CSS exceeds frame limit.');
    const header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(data.length, 2);
    return Buffer.concat([header, data]);
}
/** Local, read-only CSS stream; no commands, files, or user data are accepted. */
export class RuntimeSession {
    private server?: http.Server;
    private clients = new Set<Duplex>();
    private heartbeat?: NodeJS.Timeout;
    private payload = JSON.stringify({ active: false });
    port = 0;
    async start(): Promise<void> {
        if (this.server) return;
        const server = http.createServer((_request, response) => { response.writeHead(404); response.end(); });
        server.on('upgrade', (request, socket) => {
            const key = request.headers['sec-websocket-key'];
            if (request.url !== '/gradient-nitro' || request.headers.origin !== 'vscode-file://vscode-app' || request.headers['sec-websocket-protocol'] !== 'gradient-nitro-v1' || typeof key !== 'string' || !/^[A-Za-z\d+/]{22}==$/.test(key)) { socket.destroy(); return; }
            const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
            socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\nSec-WebSocket-Protocol: gradient-nitro-v1\r\n\r\n');
            this.clients.add(socket);
            socket.on('error', () => this.clients.delete(socket));
            socket.on('close', () => this.clients.delete(socket));
            socket.on('data', () => socket.destroy()); // Client messages are neither required nor executed.
            socket.write(frame(this.payload));
        });
        await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); }); });
        this.server = server;
        this.port = (server.address() as { port: number }).port;
        this.heartbeat = setInterval(() => this.broadcast(), 1500);
        this.heartbeat.unref();
    }
    get marker(): string { return '#01' + this.port.toString(16).padStart(4, '0'); }
    update(css: string, light: boolean, visual?: unknown): void { this.payload = JSON.stringify({ active: true, css, light, visual }); this.broadcast(); }
    pause(): void { this.payload = JSON.stringify({ active: false }); this.broadcast(); }
    private broadcast(): void { const data = frame(this.payload); for (const client of this.clients) if (!client.destroyed) client.write(data); }
    async stop(): Promise<void> {
        this.pause(); clearInterval(this.heartbeat);
        for (const client of this.clients) client.destroy();
        this.clients.clear();
        const server = this.server; this.server = undefined; this.port = 0;
        if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    }
}
