/* Gradient Nitro runtime bridge v1 */
// Inert unless a Nitro theme advertises a live local extension session.
(() => {
    if (window.__gradientNitroBridge) return;
    window.__gradientNitroBridge = true;
    let socket, port = 0, lastMessage = 0, retryAt = 0, style, observer, root;
    const shadowStyles = new Map();
    function refreshMenus() {
        for (const [shadow, sheet] of shadowStyles) {
            if (!shadow.host.isConnected || !style) { sheet.remove(); shadowStyles.delete(shadow); }
        }
        if (!style || !root) return;
        const scope = '.monaco-workbench[data-gradient-nitro="active"]'.repeat(4);
        const css = style.textContent;
        // Share tokens only: the workbench background/isolation do not belong on popup hosts.
        const declarations = css.slice(css.indexOf('{') + 1, css.indexOf('}'));
        const variables = scope + ' {' + declarations.split('\n').filter(line => line.trim().startsWith('--')).join('\n') + '\n}';
        const floating = css.slice(css.indexOf('/* FLOATING SURFACE REGISTRY:'));
        const menuCSS = (variables + '\n' + floating).replaceAll(scope, ':host') +
            '\n:host .monaco-menu-container > .monaco-scrollable-element { background: transparent !important; }';
        for (const host of root.querySelectorAll('.shadow-root-host')) {
            const shadow = host.shadowRoot;
            if (!shadow || !shadow.querySelector('.monaco-menu-container')) continue;
            let sheet = shadowStyles.get(shadow);
            if (!sheet) { sheet = document.createElement('style'); shadow.append(sheet); shadowStyles.set(shadow, sheet); }
            if (sheet.textContent !== menuCSS) sheet.textContent = menuCSS;
        }
    }
    function clear() {
        delete window.__gradientNitroVisualConfig;
        style?.remove(); style = undefined;
        for (const sheet of shadowStyles.values()) sheet.remove();
        shadowStyles.clear();
        root?.removeAttribute('data-gradient-nitro');
    }
    function disconnect() {
        clear();
        if (socket) { const previous = socket; socket = undefined; previous.close(); }
        port = 0;
    }
    function marker() {
        const value = getComputedStyle(root).getPropertyValue('--vscode-gradientNitro-runtime').trim();
        const rgb = value.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);
        if (rgb && Number(rgb[1]) === 1) return Number(rgb[2]) * 256 + Number(rgb[3]);
        if (/^#01[\da-f]{4}$/i.test(value)) return parseInt(value.slice(3), 16);
        return 0;
    }
    function refresh() {
        const current = document.querySelector('.monaco-workbench');
        if (!current) { disconnect(); return; }
        if (root !== current) {
            disconnect(); observer?.disconnect(); root = current;
            observer = new MutationObserver(refresh);
            observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
        }
        const next = marker();
        if (!next) { disconnect(); return; }
        if (port !== next) disconnect();
        if (socket || Date.now() < retryAt) return;
        port = next;
        const client = new WebSocket('ws://127.0.0.1:' + port + '/gradient-nitro', 'gradient-nitro-v1');
        socket = client;
        client.onmessage = event => {
            if (socket !== client || marker() !== port) return;
            try {
                const data = JSON.parse(event.data);
                lastMessage = Date.now();
                if (!data.active || typeof data.css !== 'string') { clear(); return; }
                const light = root.classList.contains('vs');
                if (light !== data.light || root.classList.contains('hc-black') || root.classList.contains('hc-light')) { clear(); return; }
                if (!style) { style = document.createElement('style'); style.id = 'gradient-nitro-live'; document.head.append(style); }
                if (style.textContent !== data.css) style.textContent = data.css;
                window.__gradientNitroVisualConfig = data.visual;
                root.setAttribute('data-gradient-nitro', 'active');
                refreshMenus();
            } catch { clear(); }
        };
        client.onclose = client.onerror = () => {
            if (socket !== client) return;
            clear(); socket = undefined; retryAt = Date.now() + 1200;
        };
    }
    new MutationObserver(refresh).observe(document.head, { childList: true, subtree: true, characterData: true });
    new MutationObserver(refreshMenus).observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
        if (style && Date.now() - lastMessage > 5500) disconnect();
        refresh();
    }, 1000);
    window.addEventListener('pagehide', disconnect);
    refresh();
})();
