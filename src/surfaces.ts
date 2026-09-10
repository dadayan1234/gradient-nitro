/** VS Code 1.136.1 and Antigravity 1.107.0 surface registry. Selectors are from shipped CSS/DOM.
 * Capture evidence and exceptions live in docs/runtime-coverage.md. Blur belongs
 * to popup shells, never their list rows or text children.
 */
export const surfaceRegistry = {
    floating: {
        popup: ['.quick-input-widget', '.monaco-menu', '.suggest-widget', '.suggest-details', '.parameter-hints-widget', '.action-widget', '.monaco-select-box-dropdown-container', '.monaco-dialog-box', '.peekview-widget', '.find-widget', '.simple-find-part'],
        tooltip: ['.monaco-hover'],
        notification: ['.notification-toast', '.notifications-center']
    },
    interactive: ['.monaco-button', '.monaco-inputbox', '.monaco-select-box', '.command-center .command-center-center', '.monaco-keybinding-key', '.monaco-list-row', '.monaco-action-bar .action-label'],
    navigation: ['.tab', '.part.activitybar .action-item', '.part.panel .composite-bar .action-item'],
    // Dropdown/menu owners must keep viewport coordinates for their fixed popup children.
    motion: ['.part.activitybar .action-item', '.tab', '.part.panel .composite-bar .action-item', '.monaco-toolbar .action-item:not(:has(.dropdown-action-container))', '.monaco-button', '.quick-input-list .monaco-list-row'],
    activeSignals: ['.part.activitybar .action-item.checked .action-label', '.tab.active .tab-border-top-container', '.tab.active .tab-border-bottom-container', '.part.panel .composite-bar .action-item.checked .active-item-indicator', 'button:focus-visible', '.monaco-button:focus-visible', 'input:focus-visible'],
    popupContent: ['.quick-input-titlebar', '.quick-input-header', '.quick-input-list', '.monaco-list', '.monaco-list-rows', '.notifications-list-container', '.notifications-center-header', '.notification-list-item', '.monaco-hover-content', '.hover-row', '.monaco-action-bar', '.actions-container', '.suggest-status-bar', '.tree', '.head', '.body']
} as const;
