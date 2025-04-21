// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { createMenuElement } from './ui.js';
// 从 settings.js 导入核心功能
import {
    createSettingsHtml,
    loadAndApplySettings as loadAndApplySettingsToPanel,
    updateIconDisplay,
    updateWhitelistedRepliesInBar, // <-- Import new function
    initializeWhitelistContainerInQrBar // <-- Import initializer
} from './settings.js';
import { setupEventListeners, handleQuickReplyClick, updateMenuStylesUI } from './events.js';

// 创建本地设置对象，如果全局对象不存在
if (typeof window.extension_settings === 'undefined') {
    window.extension_settings = {};
}
// 初始化当前扩展的设置，包含新增字段的默认值
if (!window.extension_settings[Constants.EXTENSION_NAME]) {
    window.extension_settings[Constants.EXTENSION_NAME] = {
        enabled: true,
        iconType: Constants.ICON_TYPES.ROCKET,
        customIconUrl: '',
        customIconSize: Constants.DEFAULT_CUSTOM_ICON_SIZE,
        faIconCode: '',
        matchButtonColors: true,
        menuStyles: JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES)),
        whitelistedReplies: [] // <-- Add default whitelist array
    };
} else {
    // Ensure whitelist exists even if settings were loaded from older version
    if (!window.extension_settings[Constants.EXTENSION_NAME].whitelistedReplies) {
        window.extension_settings[Constants.EXTENSION_NAME].whitelistedReplies = [];
    }
    // Ensure menuStyles exists
     if (!window.extension_settings[Constants.EXTENSION_NAME].menuStyles) {
        window.extension_settings[Constants.EXTENSION_NAME].menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
     }
}

// 导出设置对象以便其他模块使用
export const extension_settings = window.extension_settings;

/**
 * Injects the rocket button next to the send button
 */
function injectRocketButton() {
    const sendButton = document.getElementById('send_but'); // 使用原生 JS 获取
    if (!sendButton) {
        console.error(`[${Constants.EXTENSION_NAME}] Could not find send button (#send_but)`);
        return null; // Return null if send button isn't found
    }

    // 检查按钮是否已存在
    let rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
    if (rocketButton) {
        console.log(`[${Constants.EXTENSION_NAME}] Rocket button already exists.`);
        return rocketButton;
    }

    // 创建按钮元素
    rocketButton = document.createElement('div');
    rocketButton.id = Constants.ID_ROCKET_BUTTON;
    // 初始类名在 updateIconDisplay 中设置
    rocketButton.title = "快速回复菜单";
    rocketButton.setAttribute('aria-haspopup', 'true');
    rocketButton.setAttribute('aria-expanded', 'false');
    rocketButton.setAttribute('aria-controls', Constants.ID_MENU);

    // Insert the button before the send button
    sendButton.parentNode.insertBefore(rocketButton, sendButton);

    console.log(`[${Constants.EXTENSION_NAME}] Rocket button injected.`);
    return rocketButton; // Return the reference
}

// 移除此文件中重复的 updateIconDisplay 函数，使用 settings.js 导出的版本

/**
 * 更新图标预览 (现在也处理 FontAwesome 和自定义大小)
 */
function updateIconPreview(iconType) {
    const previewContainer = document.querySelector(`.${Constants.CLASS_ICON_PREVIEW}`);
    if (!previewContainer) return;

    // 清除内容和样式
    previewContainer.innerHTML = '';
    previewContainer.style.backgroundImage = '';
    previewContainer.style.backgroundSize = '';
    previewContainer.style.backgroundPosition = '';
    previewContainer.style.backgroundRepeat = '';
    previewContainer.style.fontSize = ''; // 清除可能的字体大小设置

    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;

    if (iconType === Constants.ICON_TYPES.CUSTOM) {
        const customContent = settings.customIconUrl?.trim() || '';
        const sizeStyle = `${customIconSize}px ${customIconSize}px`; // 使用设置的大小

        if (!customContent) {
            previewContainer.innerHTML = '<span>(无预览)</span>';
            return;
        }

        // 使用CSS背景图像显示
        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
            previewContainer.style.backgroundImage = `url('${svgDataUrl}')`;
            previewContainer.style.backgroundSize = sizeStyle;
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundRepeat = 'no-repeat';
        }
        else if (customContent.startsWith('data:') || customContent.startsWith('http') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(customContent)) {
            previewContainer.style.backgroundImage = `url('${customContent}')`;
            previewContainer.style.backgroundSize = sizeStyle;
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundRepeat = 'no-repeat';
        }
         else if (customContent.includes('base64,')) {
             let imgUrl = customContent;
             if (!customContent.startsWith('data:')) {
                 const possibleType = customContent.substring(0, 10).includes('PNG') ? 'image/png' : 'image/jpeg';
                 imgUrl = `data:${possibleType};base64,` + customContent.split('base64,')[1];
             }
             previewContainer.style.backgroundImage = `url('${imgUrl}')`;
             previewContainer.style.backgroundSize = sizeStyle;
             previewContainer.style.backgroundPosition = 'center';
             previewContainer.style.backgroundRepeat = 'no-repeat';
        } else {
            previewContainer.innerHTML = '<span>(格式不支持)</span>';
        }
    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME) { // <-- 新增处理 FA
        const faIconCode = settings.faIconCode?.trim() || '';
        if (faIconCode) {
            previewContainer.innerHTML = faIconCode;
            previewContainer.style.fontSize = '24px';
        } else {
            previewContainer.innerHTML = '<span>(无代码)</span>';
        }
    } else {
        // 处理预设的 FontAwesome 图标
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        if (iconClass) {
            previewContainer.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
            previewContainer.style.fontSize = '24px';
        } else {
             previewContainer.innerHTML = '<span>(无预览)</span>';
        }
    }
}

/**
 * Saves current settings, including the whitelist.
 * @returns {boolean} True if saving was successful via at least one method.
 */
function saveSettingsInternal() {
    console.log(`[${Constants.EXTENSION_NAME}] Attempting to save settings...`);
    // Settings object is already updated by event handlers or direct manipulation
    const settings = extension_settings[Constants.EXTENSION_NAME];

    // Ensure all settings values are current (defensive check, usually not needed if handlers are correct)
    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);

    if (enabledDropdown) settings.enabled = enabledDropdown.value === 'true';
    if (iconTypeDropdown) settings.iconType = iconTypeDropdown.value;
    if (customIconUrl) settings.customIconUrl = customIconUrl.value;
    if (customIconSizeInput) settings.customIconSize = parseInt(customIconSizeInput.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    if (faIconCodeInput) settings.faIconCode = faIconCodeInput.value;
    if (colorMatchCheckbox) settings.matchButtonColors = colorMatchCheckbox.checked;
    // Note: menuStyles and whitelistedReplies are updated directly in their respective handlers/functions

    // Update display based on current settings before saving
    updateIconDisplay();
    updateWhitelistedRepliesInBar(); // Update the qr--bar display based on the potentially changed whitelist

    // Update icon preview if settings panel is open
    if (document.getElementById(Constants.ID_SETTINGS_CONTAINER)?.offsetParent !== null) {
        updateIconPreview(settings.iconType);
    }
    // Update menu styles (applies CSS variables)
    updateMenuStylesUI();


    // Attempt to save to localStorage
    let savedToLocalStorage = false;
    try {
        // Make sure to stringify the complete settings object including the whitelist
        localStorage.setItem('QRA_settings', JSON.stringify(settings));
        savedToLocalStorage = true;
        console.log(`[${Constants.EXTENSION_NAME}] Settings (incl. whitelist) saved to localStorage.`);
    } catch (e) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to save settings to localStorage:`, e);
    }

    // Attempt to save using context API
    let savedToContext = false;
    if (typeof context !== 'undefined' && context.saveExtensionSettings) {
        try {
            // The context API should save the entire window.extension_settings object
            context.saveExtensionSettings();
            console.log(`[${Constants.EXTENSION_NAME}] Settings saved via context.saveExtensionSettings().`);
            savedToContext = true;
        } catch (e) {
            console.error(`[${Constants.EXTENSION_NAME}] Failed to save settings via context.saveExtensionSettings():`, e);
        }
    } else {
        console.warn(`[${Constants.EXTENSION_NAME}] context.saveExtensionSettings not available.`);
    }

    const success = savedToContext || savedToLocalStorage; // At least one method succeeded

    // Update UI feedback (save button, status message)
    const saveStatus = document.getElementById('qr-save-status');
    if (saveStatus) {
        saveStatus.textContent = success ? '✓ 设置已保存' : '✗ 保存失败';
        saveStatus.style.color = success ? '#4caf50' : '#f44336';
        setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    }

    const saveButton = document.getElementById('qr-save-settings');
    if (saveButton && success) {
        const originalText = saveButton.innerHTML; // Might contain icon HTML
        const originalBg = saveButton.style.backgroundColor;
        saveButton.innerHTML = '<i class="fa-solid fa-check"></i> 已保存';
        saveButton.style.backgroundColor = '#4caf50';
        saveButton.disabled = true; // Briefly disable
        setTimeout(() => {
            saveButton.innerHTML = originalText;
            saveButton.style.backgroundColor = originalBg;
            saveButton.disabled = false;
        }, 2000);
    }

    return success;
}


/**
 * Initializes the plugin: creates UI, sets up listeners, loads settings.
 */
function initializePlugin() {
    try {
        console.log(`[${Constants.EXTENSION_NAME}] Initializing...`);

        // Ensure the container for whitelisted buttons exists in qr--bar
        initializeWhitelistContainerInQrBar(); // From settings.js

        // Create and inject the rocket button
        const rocketButton = injectRocketButton();
        if (!rocketButton) {
             console.error(`[${Constants.EXTENSION_NAME}] Initialization failed: Rocket button could not be injected.`);
             return; // Stop initialization if button injection fails
        }

        // Create menu element
        const menu = createMenuElement();

        // Store references in shared state
        sharedState.domElements.rocketButton = rocketButton;
        sharedState.domElements.menu = menu;
        sharedState.domElements.chatItemsContainer = menu.querySelector(`#${Constants.ID_CHAT_ITEMS}`);
        sharedState.domElements.globalItemsContainer = menu.querySelector(`#${Constants.ID_GLOBAL_ITEMS}`);
        // Other settings elements refs (mostly handled within settings panel logic now)
        sharedState.domElements.customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        sharedState.domElements.customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
        sharedState.domElements.faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
        sharedState.domElements.colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);


        // 创建全局对象暴露事件处理函数和保存函数
        window.quickReplyMenu = {
            handleQuickReplyClick, // From events.js
            saveSettings: saveSettingsInternal, // Use the internal save function
            updateIconPreview: updateIconPreview, // For settings panel
            // Expose function to add to whitelist (will be called by long-press in menu)
            addReplyToWhitelist: (setName, label) => {
                const settings = extension_settings[Constants.EXTENSION_NAME];
                if (!settings.whitelistedReplies) {
                    settings.whitelistedReplies = [];
                }
                // Avoid duplicates
                const exists = settings.whitelistedReplies.some(item => item.setName === setName && item.label === label);
                if (!exists) {
                    settings.whitelistedReplies.push({ setName, label });
                    console.log(`[${Constants.EXTENSION_NAME}] Added "${setName}.${label}" to whitelist.`);
                    saveSettingsInternal(); // Save immediately after adding
                    updateWhitelistedRepliesInBar(); // Update qr--bar display
                    // Optionally provide user feedback here (e.g., brief message)
                     // Find the button in the menu and give feedback?
                     const menuItem = sharedState.domElements.menu?.querySelector(`button[data-set-name="${setName}"][data-label="${label}"]`);
                     if(menuItem) {
                         menuItem.style.outline = '2px solid limegreen';
                         setTimeout(() => { menuItem.style.outline = ''; }, 500);
                     }

                } else {
                    console.log(`[${Constants.EXTENSION_NAME}] "${setName}.${label}" is already in the whitelist.`);
                     // Optional feedback: already added
                }
            },
             // Expose function to check if an item is whitelisted (useful for UI feedback)
             isReplyWhitelisted: (setName, label) => {
                const settings = extension_settings[Constants.EXTENSION_NAME];
                return settings.whitelistedReplies?.some(item => item.setName === setName && item.label === label) ?? false;
            }
        };

        // Append menu to the body
        document.body.appendChild(menu);

        // Load settings and apply initial UI state (like button visibility and icon)
        loadAndApplyInitialSettings(); // Includes updating the whitelist bar

        // Setup event listeners for the button, menu, settings panel etc.
        setupEventListeners(); // events.js

        console.log(`[${Constants.EXTENSION_NAME}] Initialization complete.`);
    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] Initialization failed:`, err);
    }
}


/**
 * 加载初始设置并应用到插件状态和按钮显示
 * (与 settings.js 中的 loadAndApplySettingsToPanel 不同，这个是应用到插件运行状态)
 */
function loadAndApplyInitialSettings() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];

    // Ensure defaults are set (defensive)
    settings.enabled = settings.enabled !== false;
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || '';
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    settings.faIconCode = settings.faIconCode || '';
    settings.matchButtonColors = settings.matchButtonColors !== false;
    settings.menuStyles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    settings.whitelistedReplies = settings.whitelistedReplies || []; // Ensure whitelist array exists

    // Update body class for enabled/disabled state
    document.body.classList.remove('qra-enabled', 'qra-disabled');
    document.body.classList.add(settings.enabled ? 'qra-enabled' : 'qra-disabled');

    // Update rocket button initial visibility
    if (sharedState.domElements.rocketButton) {
        sharedState.domElements.rocketButton.style.display = settings.enabled ? 'flex' : 'none';
    }

    // Update initial icon display
    updateIconDisplay(); // from settings.js

    // Apply initial menu styles
    updateMenuStylesUI(); // from events.js (applies CSS vars)

    // Render the initial state of the whitelisted replies in qr--bar
    updateWhitelistedRepliesInBar(); // from settings.js

    console.log(`[${Constants.EXTENSION_NAME}] Initial settings applied.`);
}

// 确保 jQuery 可用 - 使用原生 js 备用
function onReady(callback) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(callback, 1);
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
}

// Loads settings from localStorage, merging with defaults
function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('QRA_settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            // Merge saved settings into the current settings object
            // This preserves defaults for keys not present in localStorage
            // and overwrites defaults with saved values.
            const currentSettings = extension_settings[Constants.EXTENSION_NAME];
            // Ensure nested objects like menuStyles are handled properly (simple assign is usually ok if structure matches)
             Object.assign(currentSettings, parsedSettings);

            // Explicitly ensure arrays/objects that might be missing in older saves exist
             if (!currentSettings.whitelistedReplies) currentSettings.whitelistedReplies = [];
             if (!currentSettings.menuStyles) currentSettings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));

            console.log(`[${Constants.EXTENSION_NAME}] Settings loaded from localStorage:`, currentSettings);
            return true;
        }
    } catch (e) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to load settings from localStorage:`, e);
    }
    return false;
}

// Main execution flow on document ready
onReady(() => {
    try {
        // 1. Load settings from localStorage (updates window.extension_settings)
        loadSettingsFromLocalStorage();

        // 2. Ensure settings panel container exists
        let settingsContainer = document.getElementById('extensions_settings');
        if (!settingsContainer) {
            console.warn(`[${Constants.EXTENSION_NAME}] #extensions_settings not found, creating dummy container.`);
            settingsContainer = document.createElement('div');
            settingsContainer.id = 'extensions_settings';
            settingsContainer.style.display = 'none'; // Hide
            document.body.appendChild(settingsContainer);
        }

        // 3. Add extension's settings panel HTML content
        const settingsHtml = createSettingsHtml(); // From settings.js
        // Find or create a dedicated container for this extension's settings
        let extensionSettingsDiv = document.getElementById(Constants.ID_SETTINGS_CONTAINER);
        if (!extensionSettingsDiv) {
            extensionSettingsDiv = document.createElement('div');
            extensionSettingsDiv.id = Constants.ID_SETTINGS_CONTAINER;
            // Append to the main settings container if possible, otherwise to body
            (settingsContainer || document.body).appendChild(extensionSettingsDiv);
        }
         // Replace content instead of appending to avoid duplicate elements/listeners
         extensionSettingsDiv.innerHTML = settingsHtml;


        // 4. Initialize the plugin (creates button, menu, sets up state, etc.)
        initializePlugin();

        // 5. Load settings values into the settings panel UI elements
        loadAndApplySettingsToPanel(); // From settings.js

    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] Startup failed:`, err);
    }
});
