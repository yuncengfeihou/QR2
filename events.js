// events.js
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { updateMenuVisibilityUI } from './ui.js';
import { triggerQuickReply } from './api.js';
// 导入 settings.js 中的函数
import { handleSettingsChange, handleUsageButtonClick, closeUsagePanel, updateIconDisplay, handleWhitelistButtonClick, closeWhitelistPanel } from './settings.js'; // 导入白名单处理函数
// 导入 index.js 的设置对象和函数
import { extension_settings } from './index.js';
// import { updateWhitelistedRepliesInBar } from './index.js'; // 避免循环依赖

/**
 * Handles clicks on the rocket button. Toggles menu visibility state and updates UI.
 */
// ... (handleRocketButtonClick function remains unchanged) ...

/**
 * Handles clicks outside the menu to close it.
 * Also closes settings panels if click is outside them.
 * @param {Event} event
 */
export function handleOutsideClick(event) {
    const { menu, rocketButton } = sharedState.domElements;
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    const whitelistPanel = document.getElementById(Constants.ID_WHITELIST_PANEL); // Check whitelist panel

    // Close main menu
    if (sharedState.menuVisible &&
        menu && rocketButton &&
        !menu.contains(event.target) &&
        !rocketButton.contains(event.target) &&
        !stylePanel?.contains(event.target) && // Don't close if clicking inside panels
        !usagePanel?.contains(event.target) &&
        !whitelistPanel?.contains(event.target)
       ) {
        setMenuVisible(false);
        updateMenuVisibilityUI();
    }

    // Close Style Panel if click is outside it
    if (stylePanel && stylePanel.style.display === 'block' && !stylePanel.contains(event.target) && event.target.id !== Constants.ID_MENU_STYLE_BUTTON) {
         // Don't close if clicking the button that opens it
        closeMenuStylePanel();
    }
     // Close Usage Panel if click is outside it
     if (usagePanel && usagePanel.style.display === 'block' && !usagePanel.contains(event.target) && event.target.id !== Constants.ID_USAGE_BUTTON) {
        closeUsagePanel();
     }
      // Close Whitelist Panel if click is outside it
      if (whitelistPanel && whitelistPanel.style.display === 'block' && !whitelistPanel.contains(event.target) && event.target.id !== Constants.ID_WHITELIST_BUTTON) {
         closeWhitelistPanel();
      }
}

/**
 * Handles clicks on individual quick reply items (buttons).
 * Reads data attributes and triggers the API call.
 * NOTE: This is now only called for *short* clicks due to long-press logic in ui.js.
 * @param {Event} event The click event on the button (or an object containing currentTarget).
 */
export async function handleQuickReplyClick(event) {
    // event might be the original event or a custom object from long-press handler
    const button = event.currentTarget;
    if (!button) return;

    const setName = button.dataset.setName;
    const label = button.dataset.label;

    if (!setName || !label) {
        console.error(`[${Constants.EXTENSION_NAME}] Missing data-set-name or data-label on clicked item.`);
        setMenuVisible(false);
        updateMenuVisibilityUI();
        return;
    }

    // Close menu visually first
    setMenuVisible(false);
    updateMenuVisibilityUI();

    console.log(`[${Constants.EXTENSION_NAME}] Short click detected, triggering reply: ${setName}.${label}`);
    try {
        await triggerQuickReply(setName, label); // Call API
    } catch (error) {
        // Error logged within triggerQuickReply
    }
}

/**
 * 处理菜单样式按钮点击
 */
// ... (handleMenuStyleButtonClick function remains unchanged) ...

/**
 * 将当前菜单样式加载到设置面板中
 */
// ... (loadMenuStylesIntoPanel function remains unchanged) ...

/**
 * 关闭菜单样式面板
 */
export function closeMenuStylePanel() { // Keep this exported if needed elsewhere
    const stylePanel = document.getElementById(Constants.ID_MENU_STYLE_PANEL);
    if (stylePanel) {
        stylePanel.style.display = 'none';
    }
}

/**
 * 从样式面板中收集样式设置并应用
 */
// ... (applyMenuStyles function remains unchanged) ...

/**
 * 重置样式到默认值
 */
// ... (resetMenuStyles function remains unchanged) ...

/**
 * 更新菜单的实际样式 (应用CSS变量)
 */
// ... (updateMenuStylesUI function remains unchanged) ...

/**
 * 辅助函数 - hex转rgba
 */
// ... (hexToRgba function remains unchanged) ...

/**
 * 辅助函数 - rgba转hex
 */
// ... (rgbaToHex function remains unchanged) ...

/**
 * 辅助函数 - 获取rgba的透明度值
 */
// ... (getOpacityFromRgba function remains unchanged) ...

/**
 * 配对并同步所有颜色选择器和文本输入框
 */
// ... (setupColorPickerSync function remains unchanged) ...

/**
 * Sets up all event listeners for the plugin.
 */
export function setupEventListeners() {
    const { rocketButton } = sharedState.domElements; // Only need rocketButton from state here

    // 主要按钮和菜单外部点击监听
    rocketButton?.addEventListener('click', handleRocketButtonClick);
    // Use capture phase for outside click to catch clicks before they reach other elements if necessary,
    // but usually bubble phase is fine.
    document.addEventListener('click', handleOutsideClick); // Modified handleOutsideClick

    // --- 设置相关的监听器 ---
    const settingsContainer = document.getElementById(Constants.ID_SETTINGS_CONTAINER);
    if (!settingsContainer) {
        console.error(`[${Constants.EXTENSION_NAME}] Settings container not found. Cannot set up listeners within it.`);
        return;
    }

    // Delegate event listening for settings changes to the container
    settingsContainer.addEventListener('change', (event) => {
        const target = event.target;
        // Check if the change event originated from one of our setting controls
        if (target.id === Constants.ID_SETTINGS_ENABLED_DROPDOWN ||
            target.id === Constants.ID_ICON_TYPE_DROPDOWN ||
            target.id === Constants.ID_COLOR_MATCH_CHECKBOX) {
            handleSettingsChange(event); // Defined in settings.js
        }
    });

    settingsContainer.addEventListener('input', (event) => {
        const target = event.target;
        // Check if the input event originated from one of our text/number inputs
        if (target.id === Constants.ID_CUSTOM_ICON_URL ||
            target.id === Constants.ID_CUSTOM_ICON_SIZE_INPUT ||
            target.id === Constants.ID_FA_ICON_CODE_INPUT) {
             // Debounce input handling slightly if needed, but usually direct call is fine
             handleSettingsChange(event); // Defined in settings.js
        }
         // Handle opacity sliders
         else if (target.id === 'qr-item-opacity' || target.id === 'qr-menu-opacity') {
             const valueSpanId = target.id === 'qr-item-opacity' ? 'qr-item-opacity-value' : 'qr-menu-opacity-value';
             const valueSpan = document.getElementById(valueSpanId);
             if (valueSpan) valueSpan.textContent = target.value;
         }
    });

    // File upload is handled in settings.js (setupSettingsEventListeners calls handleFileUpload listener setup)

    // --- 其他按钮监听器 (直接绑定) ---
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`);
    const menuStyleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON);
    const stylePanelCloseButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-close`);
    const styleApplyButton = document.getElementById(`${Constants.ID_MENU_STYLE_PANEL}-apply`);
    const styleResetButton = document.getElementById(Constants.ID_RESET_STYLE_BUTTON);
    const whitelistButton = document.getElementById(Constants.ID_WHITELIST_BUTTON); // Whitelist button
    const whitelistPanelCloseButton = document.getElementById(`${Constants.ID_WHITELIST_PANEL}-close`); // Whitelist panel close

    // Add listeners for these buttons
    usageButton?.addEventListener('click', handleUsageButtonClick); // from settings.js
    usageCloseButton?.addEventListener('click', closeUsagePanel); // from settings.js
    menuStyleButton?.addEventListener('click', handleMenuStyleButtonClick); // from this file
    stylePanelCloseButton?.addEventListener('click', closeMenuStylePanel); // from this file
    styleApplyButton?.addEventListener('click', applyMenuStyles); // from this file
    styleResetButton?.addEventListener('click', resetMenuStyles); // from this file
    whitelistButton?.addEventListener('click', handleWhitelistButtonClick); // from settings.js
    whitelistPanelCloseButton?.addEventListener('click', closeWhitelistPanel); // from settings.js

    // 设置颜色选择器与文本输入框同步
    setupColorPickerSync(); // from this file

    console.log(`[${Constants.EXTENSION_NAME}] Event listeners set up.`);
}
