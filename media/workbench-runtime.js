/* Gradient Nitro runtime bridge v1 */
// Inert unless a Nitro theme advertises a live local extension session.
(() => {
    if (window.__gradientNitroBridge) return;
    window.__gradientNitroBridge = true;
    let socket, port = 0, lastMessage = 0, retryAt = 0, style, observer, root;
    function clear() {
        style?.remove(); style = undefined;
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
                root.setAttribute('data-gradient-nitro', 'active');
            } catch { clear(); }
        };
        client.onclose = client.onerror = () => {
            if (socket !== client) return;
            clear(); socket = undefined; retryAt = Date.now() + 1200;
        };
    }
    new MutationObserver(refresh).observe(document.head, { childList: true, subtree: true, characterData: true });
    setInterval(() => {
        if (style && Date.now() - lastMessage > 5500) disconnect();
        refresh();
    }, 1000);
    window.addEventListener('pagehide', disconnect);
    refresh();
})();
