// state.js

// Use an object to allow modifications from other modules
export const sharedState = {
    menuVisible: false,
    domElements: {
        // Core UI elements
        rocketButton: null,
        menu: null,
        chatItemsContainer: null, // Inside the menu
        globalItemsContainer: null, // Inside the menu

        // References to some settings panel controls might still be useful if accessed outside settings.js
        // However, it's generally better to manage settings panel elements within settings.js/events.js
        // settingsDropdown: null, // Example: Likely managed within settings scope now
        // customIconUrl: null, // Example: Managed within settings scope
        // customIconSizeInput: null, // Example: Managed within settings scope
        // faIconCodeInput: null, // Example: Managed within settings scope
        // colorMatchCheckbox: null, // Example: Managed within settings scope

        // We don't need references to the Whitelist/Style/Usage panels here,
        // as their visibility and content are managed by functions in settings.js and events.js
    },
    // Potentially add state related to long-press if needed across modules, but likely managed per-element
    // longPressTimer: null,
};

/**
 * Updates the menu visibility state.
 * @param {boolean} visible
 */
export function setMenuVisible(visible) {
    // Basic check to prevent unnecessary updates if state is already correct
    if (sharedState.menuVisible === visible) {
        // console.log(`[${Constants.EXTENSION_NAME}] Menu visibility state already ${visible}`);
        return;
    }
    sharedState.menuVisible = visible;
    // Note: The actual UI update (showing/hiding the menu, fetching data)
    // is handled by updateMenuVisibilityUI() in ui.js, which should be called
    // after calling setMenuVisible.
}
