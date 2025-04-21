// events.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js'; // Handles showing/hiding/populating the menu
import { triggerQuickReply } from './api.js';
// Import functions from settings.js for handling settings changes and panel visibility
import {
    handleSettingsChange,
    handleUsageButtonClick,
    closeUsagePanel,
    updateIconDisplay, // Though likely called mainly within settings.js itself now
    handleWhitelistButtonClick, // Import new handlers if needed here (but likely setup in settings.js)
    closeWhitelistPanel,        // Import new handlers if needed here
    // Whitelist button/panel listeners are likely set up in settings.js's setupSettingsEventListeners
} from './settings.js';
// Import settings object and style utility functions
import { extension_settings } from './index.js'; // Needed for style functions
import { updateMenuStylesUI } from './settings.js'; // <-- Moved updateMenuStylesUI TO settings.js to keep style logic together


/**
 * Handles clicks on the rocket button. Toggles menu visibility state and updates UI.
 * Includes check for extension enabled status.
 */
export function handleRocketButtonClick() {
    // Check if the extension is enabled in settings
    const settings = extension_settings[Constants.EXTENSION_NAME];
    if (!settings.enabled) {
        console.log(`[${Constants.EXTENSION_NAME}] Extension is disabled. Rocket button click ignored.`);
        return; // Do nothing if disabled
    }

    setMenuVisible(!sharedState.menuVisible); // Toggle state
    updateMenuVisibilityUI(); // Update UI based on new state (will fetch/render replies if opening)
}

/**
 * Handles clicks outside the menu and specific sub-panels to close them.
 * @param {Event} event
 */
export function handleOutsideClick(event) {
    const { menu, rocketButton } = sharedState.domElements;
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    const whitelistPanel = document.getElementById(Constants.ID_WHITELIST_PANEL);
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL); // Usage panel might also need closing

    // Close the main menu if click is outside menu and rocket button
    if (sharedState.menuVisible &&
        menu && rocketButton &&
        !menu.contains(event.target) &&
        !rocketButton.contains(event.target) && // Check the button itself
        !rocketButton.contains(event.target.closest('div')) // Check potential container of the button icon/svg
       ) {
        // Check if the click was inside one of the *other* panels that should remain open
        const isClickInsideSubPanel = stylePanel?.contains(event.target) ||
                                      whitelistPanel?.contains(event.target) ||
                                      usagePanel?.contains(event.target);

        if (!isClickInsideSubPanel) {
            setMenuVisible(false); // Update state
            updateMenuVisibilityUI(); // Update UI
        }
    }

    // Consider closing sub-panels if click is outside them AND outside their trigger buttons?
    // This might be overly complex. Usually, sub-panels have their own close buttons.
    // Let's keep it simple: outside click only closes the main menu.
}

/**
 * Handles clicks on individual quick reply items (buttons) within the *plugin menu*.
 * Reads data attributes and triggers the API call.
 * This is only called for NORMAL clicks, not long-presses.
 * @param {Event} event The click event on the button.
 */
export async function handleQuickReplyClick(event) {
    const button = event.currentTarget; // Get the button that was clicked
    const setName = button.dataset.setName;
    const label = button.dataset.label;

    // Prevent triggering if this was part of a long-press action (handled elsewhere)
    if (button.dataset.longPressActive === 'true') {
         console.log(`[${Constants.EXTENSION_NAME}] Click ignored due to active long press.`);
         delete button.dataset.longPressActive; // Clean up flag
         return;
     }


    if (!setName || !label) {
        console.error(`[${Constants.EXTENSION_NAME}] Missing data-set-name or data-label on clicked item.`);
        setMenuVisible(false); // Close menu on error
        updateMenuVisibilityUI();
        return;
    }

    // Optimistically close the menu visually first
    setMenuVisible(false);
    updateMenuVisibilityUI();

    // Attempt to trigger the reply
    try {
        const triggered = await triggerQuickReply(setName, label); // Await the API call
        if (!triggered) {
            // Handle cases where triggerQuickReply returned false (e.g., API disabled)
            // Menu is already closed, but maybe show a notification?
            console.warn(`[${Constants.EXTENSION_NAME}] Quick reply trigger was not attempted or failed pre-check.`);
        }
    } catch (error) {
        // Error is logged within triggerQuickReply, user feedback (alert) is also there.
        // UI is already closed.
    }
}

/**
 * Handles menu style button click - Opens the style panel.
 */
export function handleMenuStyleButtonClick() {
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        // Load current styles into the panel before showing
        loadMenuStylesIntoPanel(); // Function defined below
        stylePanel.style.display = 'block';
        // Hide other panels if they are open? Optional.
        // closeWhitelistPanel();
        // closeUsagePanel();
    }
}

/**
 * Loads current menu style settings into the style panel controls.
 */
function loadMenuStylesIntoPanel() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    // Ensure menuStyles exists, otherwise use defaults
    const styles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // Helper functions
    const safeSetValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value; else console.warn("Element not found:", id);
    };
    const safeSetText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value; else console.warn("Element not found:", id);
    };

    // Safely get hex and opacity from RGBA
    const itemBgColorHex = rgbaToHex(styles.itemBgColor || Constants.DEFAULT_MENU_STYLES.itemBgColor);
    const itemOpacity = getOpacityFromRgba(styles.itemBgColor || Constants.DEFAULT_MENU_STYLES.itemBgColor);
    safeSetValue('qr-item-bgcolor-picker', itemBgColorHex);
    safeSetValue('qr-item-bgcolor-text', itemBgColorHex.toUpperCase());
    safeSetValue('qr-item-opacity', itemOpacity);
    safeSetText('qr-item-opacity-value', itemOpacity.toFixed(1));

    const itemTextColor = styles.itemTextColor || Constants.DEFAULT_MENU_STYLES.itemTextColor;
    safeSetValue('qr-item-color-picker', itemTextColor);
    safeSetValue('qr-item-color-text', itemTextColor.toUpperCase());

    const titleColor = styles.titleColor || Constants.DEFAULT_MENU_STYLES.titleColor;
    safeSetValue('qr-title-color-picker', titleColor);
    safeSetValue('qr-title-color-text', titleColor.toUpperCase());

    const titleBorderColor = styles.titleBorderColor || Constants.DEFAULT_MENU_STYLES.titleBorderColor;
    safeSetValue('qr-title-border-picker', titleBorderColor);
    safeSetValue('qr-title-border-text', titleBorderColor.toUpperCase());

    const emptyColor = styles.emptyTextColor || Constants.DEFAULT_MENU_STYLES.emptyTextColor;
    safeSetValue('qr-empty-color-picker', emptyColor);
    safeSetValue('qr-empty-color-text', emptyColor.toUpperCase());

    const menuBgColorHex = rgbaToHex(styles.menuBgColor || Constants.DEFAULT_MENU_STYLES.menuBgColor);
    const menuOpacity = getOpacityFromRgba(styles.menuBgColor || Constants.DEFAULT_MENU_STYLES.menuBgColor);
    safeSetValue('qr-menu-bgcolor-picker', menuBgColorHex);
    safeSetValue('qr-menu-bgcolor-text', menuBgColorHex.toUpperCase());
    safeSetValue('qr-menu-opacity', menuOpacity);
    safeSetText('qr-menu-opacity-value', menuOpacity.toFixed(1));

    const menuBorderColor = styles.menuBorderColor || Constants.DEFAULT_MENU_STYLES.menuBorderColor;
    safeSetValue('qr-menu-border-picker', menuBorderColor);
    safeSetValue('qr-menu-border-text', menuBorderColor.toUpperCase());
}

/**
 * Closes the menu style panel.
 */
export function closeMenuStylePanel() {
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        stylePanel.style.display = 'none';
    }
}

/**
 * Applies style changes from the panel to settings and updates the UI.
 */
export function applyMenuStyles() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    if (!settings.menuStyles) {
        settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    }

    // Helper to get value safely
    const safeGetValue = (id, defaultValue) => {
        const element = document.getElementById(id);
        return element ? element.value : defaultValue;
    };

    // Get color value, preferring valid hex from text input
    function getColorValue(pickerId, defaultValue) {
        const textInput = document.getElementById(pickerId + '-text');
        if (textInput && /^#[0-9A-F]{6}$/i.test(textInput.value)) {
            return textInput.value;
        }
        return safeGetValue(pickerId, defaultValue);
    }

    // Get values and update settings.menuStyles
    const itemBgColorHex = getColorValue('qr-item-bgcolor-picker', '#3c3c3c');
    const itemOpacity = parseFloat(safeGetValue('qr-item-opacity', 0.7));
    settings.menuStyles.itemBgColor = hexToRgba(itemBgColorHex, itemOpacity);

    settings.menuStyles.itemTextColor = getColorValue('qr-item-color-picker', '#ffffff');
    settings.menuStyles.titleColor = getColorValue('qr-title-color-picker', '#cccccc');
    settings.menuStyles.titleBorderColor = getColorValue('qr-title-border-picker', '#444444');
    settings.menuStyles.emptyTextColor = getColorValue('qr-empty-color-picker', '#666666');

    const menuBgColorHex = getColorValue('qr-menu-bgcolor-picker', '#000000');
    const menuOpacity = parseFloat(safeGetValue('qr-menu-opacity', 0.85));
    settings.menuStyles.menuBgColor = hexToRgba(menuBgColorHex, menuOpacity);

    settings.menuStyles.menuBorderColor = getColorValue('qr-menu-border-picker', '#555555');

    // Apply styles to the menu UI immediately
    updateMenuStylesUI(); // This now resides in settings.js

    // Close the panel
    closeMenuStylePanel();

    // Remind user to save overall settings
    console.log(`[${Constants.EXTENSION_NAME}] Menu styles applied. Remember to save settings globally.`);
    // Optionally, show a temporary message near the save button?
     const saveStatus = document.getElementById('qr-save-status');
     if(saveStatus) {
        const originalText = saveStatus.textContent;
        const originalColor = saveStatus.style.color;
        saveStatus.textContent = '样式已应用，请记得保存设置';
        saveStatus.style.color = 'orange'; // Indicate pending save
        setTimeout(() => {
             // Restore previous status message or clear
             saveStatus.textContent = originalText;
             saveStatus.style.color = originalColor;
        }, 3000);
     }
}

/**
 * Resets menu styles to default values in settings, panel, and UI.
 */
export function resetMenuStyles() {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

    // Reload panel to show default values
    loadMenuStylesIntoPanel();

    // Apply default styles to the menu UI immediately
    updateMenuStylesUI(); // From settings.js

    // Remind user to save
    console.log(`[${Constants.EXTENSION_NAME}] Menu styles reset to default. Remember to save settings globally.`);
     // Optional feedback
     const saveStatus = document.getElementById('qr-save-status');
      if(saveStatus) {
         const originalText = saveStatus.textContent;
         const originalColor = saveStatus.style.color;
         saveStatus.textContent = '样式已重置，请记得保存设置';
         saveStatus.style.color = 'orange';
         setTimeout(() => {
              saveStatus.textContent = originalText;
              saveStatus.style.color = originalColor;
         }, 3000);
      }
}


// --- Color Conversion Helper Functions ---

/** Converts Hex to RGBA */
function hexToRgba(hex, opacity) {
    if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
        console.warn(`Invalid hex color: ${hex}. Using default #3c3c3c.`);
        hex = '#3c3c3c';
    }
    const validOpacity = (opacity !== null && opacity !== undefined && !isNaN(opacity) && opacity >= 0 && opacity <= 1)
                         ? parseFloat(opacity)
                         : 1.0; // Default to fully opaque if invalid

    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Ensure opacity has limited precision to avoid long decimals in CSS
    return `rgba(${r}, ${g}, ${b}, ${validOpacity.toFixed(2)})`;
}

/** Converts RGBA to Hex */
function rgbaToHex(rgba) {
    if (!rgba || typeof rgba !== 'string') return '#000000';
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match) {
        return /^#[0-9A-F]{6}$/i.test(rgba) ? rgba.toUpperCase() : '#000000';
    }
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const hexR = Math.max(0, Math.min(255, r)).toString(16).padStart(2, '0');
    const hexG = Math.max(0, Math.min(255, g)).toString(16).padStart(2, '0');
    const hexB = Math.max(0, Math.min(255, b)).toString(16).padStart(2, '0');
    return `#${hexR}${hexG}${hexB}`.toUpperCase();
}

/** Gets Opacity from RGBA */
function getOpacityFromRgba(rgba) {
    if (!rgba || typeof rgba !== 'string') return 1.0;
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match || match[4] === undefined) return 1.0; // Default opaque for rgb() or invalid
    const opacity = parseFloat(match[4]);
    return isNaN(opacity) ? 1.0 : Math.max(0, Math.min(1, opacity));
}

/**
 * Sets up synchronization between color pickers and text inputs in the style panel.
 */
function setupColorPickerSync() {
    document.querySelectorAll('.qr-color-picker').forEach(picker => {
        const textId = picker.id.replace('-picker', '-text');
        const textInput = document.getElementById(textId);
        if (!textInput) return;

        // Initial sync: picker -> text
        textInput.value = picker.value.toUpperCase();

        // Picker changes -> update text input
        picker.addEventListener('input', () => {
            textInput.value = picker.value.toUpperCase();
        });

        // Text input changes -> update picker (if valid hex)
        const syncTextToPicker = () => {
            const value = textInput.value.trim();
            if (/^#?([0-9A-F]{6})$/i.test(value)) {
                const color = value.startsWith('#') ? value : '#' + value;
                picker.value = color.toLowerCase(); // Picker usually expects lowercase hex
                textInput.value = color.toUpperCase(); // Keep text input uppercase
            } else {
                // If invalid, revert text input to picker's current value
                 textInput.value = picker.value.toUpperCase();
                 // Maybe add a visual cue for invalid input?
                 textInput.style.outline = '1px solid red';
                 setTimeout(() => { textInput.style.outline = ''; }, 1000);
            }
        };
        textInput.addEventListener('input', syncTextToPicker);
        textInput.addEventListener('change', syncTextToPicker); // Handle blur/enter
    });
}

/**
 * Sets up event listeners for the style panel controls (sliders, buttons).
 */
function setupStylePanelListeners() {
    // Opacity sliders
    const itemOpacitySlider = document.getElementById('qr-item-opacity');
    itemOpacitySlider?.addEventListener('input', function() {
        const valueSpan = document.getElementById('qr-item-opacity-value');
        if(valueSpan) valueSpan.textContent = parseFloat(this.value).toFixed(1);
    });
    const menuOpacitySlider = document.getElementById('qr-menu-opacity');
    menuOpacitySlider?.addEventListener('input', function() {
        const valueSpan = document.getElementById('qr-menu-opacity-value');
        if(valueSpan) valueSpan.textContent = parseFloat(this.value).toFixed(1);
    });

    // Color picker sync
    setupColorPickerSync();

    // Panel buttons
    const stylePanelCloseButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-close`);
    const styleApplyButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-apply`);
    const styleResetButton = document.getElementById(Constants.ID_RESET_STYLE_BUTTON);

    stylePanelCloseButton?.addEventListener('click', closeMenuStylePanel);
    styleApplyButton?.addEventListener('click', applyMenuStyles);
    styleResetButton?.addEventListener('click', resetMenuStyles);
}

/**
 * Sets up all event listeners for the plugin UI (menu, button, global clicks).
 * Settings panel listeners are handled in settings.js's setupSettingsEventListeners.
 */
export function setupEventListeners() {
    const { rocketButton } = sharedState.domElements;

    // Main menu interactions
    rocketButton?.addEventListener('click', handleRocketButtonClick);
    document.addEventListener('click', handleOutsideClick); // Handles clicks outside menu/panels

    // Event listeners for controls *inside the settings panel*
    // are now primarily set up within settings.js (setupSettingsEventListeners)
    // This includes dropdowns, inputs, checkboxes, file upload, and buttons like Usage, Whitelist Mgmt.

    // However, listeners for the *Style Panel* controls are specific to style editing
    // and can be set up when the panel is created or made visible.
    // It might be cleaner to call a setup function for the style panel here or when it's first opened.
    setupStylePanelListeners(); // Set up listeners for sliders, color pickers, apply/reset buttons within the style panel

    // Listener for the button that *opens* the style panel (this button is in the main settings area)
    const menuStyleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON);
    menuStyleButton?.addEventListener('click', handleMenuStyleButtonClick);


    console.log(`[${Constants.EXTENSION_NAME}] Core UI event listeners set up.`);
    // Note: Settings panel listeners log is now in settings.js
}
