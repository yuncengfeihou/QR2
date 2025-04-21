// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js'; // 导入 setMenuVisible
import { createMenuElement, updateMenuVisibilityUI } from './ui.js'; // 导入 updateMenuVisibilityUI
// 从 settings.js 导入核心功能
import { createSettingsHtml, loadAndApplySettings as loadAndApplySettingsToPanel, updateIconDisplay, handleWhitelistButtonClick, closeWhitelistPanel, handleWhitelistItemLongPress, renderWhitelistManagementList } from './settings.js'; // 导入白名单相关函数
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
        whitelistedReplies: [] // <-- 新增白名单数组
    };
}

// 导出设置对象以便其他模块使用
export const extension_settings = window.extension_settings;

/**
 * Injects the rocket button next to the send button
 */
function injectRocketButton() {
    const sendButton = document.getElementById('send_but');
    if (!sendButton) {
        console.error(`[${Constants.EXTENSION_NAME}] Could not find send button (#send_but)`);
        return null;
    }
    let rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
    if (rocketButton) return rocketButton;

    rocketButton = document.createElement('div');
    rocketButton.id = Constants.ID_ROCKET_BUTTON;
    rocketButton.title = "快速回复菜单 (长按项加入白名单)"; // 更新 title
    rocketButton.setAttribute('aria-haspopup', 'true');
    rocketButton.setAttribute('aria-expanded', 'false');
    rocketButton.setAttribute('aria-controls', Constants.ID_MENU);
    sendButton.parentNode.insertBefore(rocketButton, sendButton);
    console.log(`[${Constants.EXTENSION_NAME}] Rocket button injected.`);
    return rocketButton;
}

/**
 * 在 qr--bar 中注入用于放置白名单按钮的容器
 */
function injectWhitelistContainer() {
    const qrBar = document.getElementById('qr--bar');
    if (!qrBar) {
        console.warn(`[${Constants.EXTENSION_NAME}] Could not find #qr--bar to inject whitelist container.`);
        return null;
    }

    let whitelistContainer = document.getElementById(Constants.ID_WHITELIST_CONTAINER_IN_BAR);
    if (whitelistContainer) {
        return whitelistContainer; // Already exists
    }

    whitelistContainer = document.createElement('div');
    whitelistContainer.id = Constants.ID_WHITELIST_CONTAINER_IN_BAR;
    whitelistContainer.className = 'qr--buttons'; // 模拟原始 Quick Reply v2 的容器类
    // 将其添加到 qr--bar 的开头或结尾，取决于偏好
    qrBar.insertBefore(whitelistContainer, qrBar.firstChild); // 添加到开头
    console.log(`[${Constants.EXTENSION_NAME}] Whitelist container injected into #qr--bar.`);
    return whitelistContainer;
}


/**
 * 更新 qr--bar 中显示的白名单快捷回复按钮
 */
export function updateWhitelistedRepliesInBar() {
    const container = document.getElementById(Constants.ID_WHITELIST_CONTAINER_IN_BAR);
    if (!container) {
        console.error(`[${Constants.EXTENSION_NAME}] Whitelist container in bar not found.`);
        return;
    }
    container.innerHTML = ''; // 清空现有按钮

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const whitelisted = settings.whitelistedReplies || [];

    if (whitelisted.length === 0) {
        container.style.display = 'none'; // 如果没有白名单项，隐藏容器
        return;
    }

    container.style.display = 'flex'; // 确保容器可见

    if (!window.quickReplyApi || !window.quickReplyApi.settings) {
        console.warn(`[${Constants.EXTENSION_NAME}] Quick Reply API or settings not available to fetch original button details.`);
        return;
    }

    const qrApi = window.quickReplyApi;
    const allRepliesMap = new Map(); // 用于快速查找原始回复数据

    // 预处理所有回复以便快速查找 (优化)
    const processSetList = (setList) => {
        setList?.forEach(setLink => {
            setLink?.set?.qrList?.forEach(qr => {
                if (qr && qr.label && setLink.set?.name) {
                    const key = `${setLink.set.name}::${qr.label}`; // 使用 setName::label 作为 Key
                    if (!allRepliesMap.has(key)) {
                        allRepliesMap.set(key, qr);
                    }
                }
            });
        });
    };

    if (qrApi.settings?.chatConfig?.setList) {
        processSetList(qrApi.settings.chatConfig.setList);
    }
    if (qrApi.settings?.config?.setList) {
        processSetList(qrApi.settings.config.setList);
    }

    whitelisted.forEach(item => {
        const key = `${item.setName}::${item.label}`;
        const originalQrData = allRepliesMap.get(key); // 尝试找到原始数据

        const button = document.createElement('div');
        button.className = `${Constants.CLASS_WHITELIST_BAR_BUTTON} qr--button`; // 添加自定义类和模拟原始类
        button.dataset.setName = item.setName;
        button.dataset.label = item.label;
        button.textContent = item.label;
        button.title = originalQrData?.message || `触发: ${item.setName} > ${item.label}`; // 使用原始消息或默认提示

        // **重要：添加点击事件监听器，调用原始 API**
        button.addEventListener('click', async () => {
            if (window.quickReplyApi && window.quickReplyApi.executeQuickReply) {
                try {
                    console.log(`[${Constants.EXTENSION_NAME}] Triggering whitelisted reply from bar: "${item.setName}.${item.label}"`);
                    await window.quickReplyApi.executeQuickReply(item.setName, item.label);
                } catch (error) {
                    console.error(`[${Constants.EXTENSION_NAME}] Failed to execute whitelisted reply "${item.setName}.${item.label}" from bar:`, error);
                }
            } else {
                console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API executeQuickReply not found!`);
            }
        });

        container.appendChild(button);
    });
}


// 移除此文件中重复的 updateIconPreview 函数，使用 settings.js 导出的版本

/**
 * Initializes the plugin: creates UI, sets up listeners, loads settings.
 */
function initializePlugin() {
    try {
        console.log(`[${Constants.EXTENSION_NAME}] Initializing...`);

        // 1. 注入白名单容器到 qr--bar
        const whitelistContainerInBar = injectWhitelistContainer();

        // 2. 创建和注入火箭按钮
        const rocketButton = injectRocketButton();
        if (!rocketButton) {
             console.error(`[${Constants.EXTENSION_NAME}] Initialization failed: Rocket button could not be injected.`);
             return;
        }

        // 3. 创建菜单元素
        const menu = createMenuElement();

        // 4. Store references in shared state
        sharedState.domElements.rocketButton = rocketButton;
        sharedState.domElements.menu = menu;
        sharedState.domElements.chatItemsContainer = menu.querySelector(`#${Constants.ID_CHAT_ITEMS}`);
        sharedState.domElements.globalItemsContainer = menu.querySelector(`#${Constants.ID_GLOBAL_ITEMS}`);
        // ... 其他设置元素引用在 setupEventListeners 或 loadAndApplySettingsToPanel 中获取 ...
        sharedState.domElements.whitelistContainerInBar = whitelistContainerInBar; // Store ref

        // 5. 创建全局对象暴露事件处理函数和保存函数
        window.quickReplyMenu = {
            handleQuickReplyClick, // 从 events.js 导入
            saveSettings: function() {
                console.log(`[${Constants.EXTENSION_NAME}] Attempting to save settings via window.quickReplyMenu.saveSettings...`);
                // 从DOM元素获取最新值
                const settings = extension_settings[Constants.EXTENSION_NAME];
                const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
                const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
                const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
                const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
                const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
                const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);

                // 获取并更新基本设置
                if (enabledDropdown) settings.enabled = enabledDropdown.value === 'true';
                if (iconTypeDropdown) settings.iconType = iconTypeDropdown.value;
                if (customIconUrl) settings.customIconUrl = customIconUrl.value;
                if (customIconSizeInput) settings.customIconSize = parseInt(customIconSizeInput.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
                if (faIconCodeInput) settings.faIconCode = faIconCodeInput.value;
                if (colorMatchCheckbox) settings.matchButtonColors = colorMatchCheckbox.checked;

                // 注意: settings.whitelistedReplies 由长按事件直接修改，这里不需要从 DOM 读取

                // 更新图标显示
                updateIconDisplay(); // settings.js

                // 更新菜单样式
                updateMenuStylesUI(); // events.js

                // **重要：更新 qr--bar 中的白名单按钮**
                updateWhitelistedRepliesInBar(); // index.js

                // 保存逻辑 (localStorage / context API)
                let savedToLocalStorage = false;
                try {
                    localStorage.setItem('QRA_settings', JSON.stringify(settings)); // 保存包含白名单的完整设置
                    savedToLocalStorage = true;
                } catch(e) {
                    console.error(`[${Constants.EXTENSION_NAME}] 保存到localStorage失败:`, e);
                }

                let savedToContext = false;
                if (typeof context !== 'undefined' && context.saveExtensionSettings) {
                    try {
                        context.saveExtensionSettings();
                        console.log(`[${Constants.EXTENSION_NAME}] 设置已通过 context.saveExtensionSettings() 保存`);
                        savedToContext = true;
                    } catch(e) {
                        console.error(`[${Constants.EXTENSION_NAME}] 通过 context.saveExtensionSettings() 保存设置失败:`, e);
                    }
                } else {
                    console.warn(`[${Constants.EXTENSION_NAME}] context.saveExtensionSettings 不可用`);
                }

                const success = savedToContext || savedToLocalStorage;

                // 显示保存反馈
                const saveStatus = document.getElementById('qr-save-status');
                if (saveStatus) {
                    saveStatus.textContent = success ? '✓ 设置已保存' : '✗ 保存失败';
                    saveStatus.style.color = success ? '#4caf50' : '#f44336';
                    setTimeout(() => { saveStatus.textContent = ''; }, 2000);
                }

                // 更新保存按钮视觉反馈
                const saveButton = document.getElementById('qr-save-settings');
                if (saveButton && success) {
                    const originalText = '<i class="fa-solid fa-floppy-disk"></i> 保存设置';
                    saveButton.innerHTML = '<i class="fa-solid fa-check"></i> 已保存';
                    saveButton.style.backgroundColor = '#4caf50';
                    setTimeout(() => {
                        saveButton.innerHTML = originalText;
                        saveButton.style.backgroundColor = '';
                    }, 2000);
                }

                return success;
            },
            // 暴露其他需要的函数
            updateIconPreview: window.quickReplyMenu ? window.quickReplyMenu.updateIconPreview : null, // 从 settings.js 导入并暴露
            // 暴露白名单相关函数，供 UI 模块的长按事件调用
            addToWhitelist: function(setName, label) {
                const settings = extension_settings[Constants.EXTENSION_NAME];
                if (!settings.whitelistedReplies) settings.whitelistedReplies = [];
                // 检查是否已存在
                const exists = settings.whitelistedReplies.some(item => item.setName === setName && item.label === label);
                if (!exists) {
                    settings.whitelistedReplies.push({ setName, label });
                    console.log(`[${Constants.EXTENSION_NAME}] Added to whitelist: ${setName}.${label}`);
                    this.saveSettings(); // 保存并更新 qr--bar
                    return true; // 表示成功添加
                }
                return false; // 表示已存在
            },
             removeFromWhitelist: function(setName, label) {
                 const settings = extension_settings[Constants.EXTENSION_NAME];
                 const initialLength = settings.whitelistedReplies?.length ?? 0;
                 if (initialLength > 0) {
                     settings.whitelistedReplies = settings.whitelistedReplies.filter(item => !(item.setName === setName && item.label === label));
                     if (settings.whitelistedReplies.length < initialLength) {
                         console.log(`[${Constants.EXTENSION_NAME}] Removed from whitelist: ${setName}.${label}`);
                         this.saveSettings(); // 保存并更新 qr--bar
                         // 更新白名单管理面板 (如果可见)
                         if (document.getElementById(Constants.ID_WHITELIST_PANEL)?.style.display === 'block') {
                             renderWhitelistManagementList(); // 重新渲染列表
                         }
                         return true; // 表示成功移除
                     }
                 }
                 return false; // 表示未找到或移除失败
             },
             // 暴露白名单按钮更新函数，可能在某些场景下需要外部调用
             updateWhitelistedRepliesInBar: updateWhitelistedRepliesInBar
        };

        // 6. Append menu to the body
        document.body.appendChild(menu);

        // 7. Load settings and apply initial UI state
        loadAndApplyInitialSettings(); // 这会调用 updateIconDisplay 和 updateWhitelistedRepliesInBar

        // 8. Setup event listeners
        setupEventListeners(); // events.js (确保它会设置白名单面板的监听器)

        console.log(`[${Constants.EXTENSION_NAME}] Initialization complete.`);
    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] 初始化失败:`, err);
    }
}


/**
 * 加载初始设置并应用到插件状态和UI
 */
function loadAndApplyInitialSettings() {
    const settings = window.extension_settings[Constants.EXTENSION_NAME];

    // 确保默认值已设置
    settings.enabled = settings.enabled !== false;
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || '';
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    settings.faIconCode = settings.faIconCode || '';
    settings.matchButtonColors = settings.matchButtonColors !== false;
    settings.menuStyles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    settings.whitelistedReplies = settings.whitelistedReplies || []; // <-- 确保白名单数组存在

    // 更新body类控制显示状态
    document.body.classList.remove('qra-enabled', 'qra-disabled');
    document.body.classList.add(settings.enabled ? 'qra-enabled' : 'qra-disabled');

    // 更新火箭按钮的初始可见性
    if (sharedState.domElements.rocketButton) {
        sharedState.domElements.rocketButton.style.display = settings.enabled ? 'flex' : 'none';
    }

    // 更新初始图标显示
    updateIconDisplay(); // settings.js

    // 应用初始菜单样式设置
    updateMenuStylesUI(); // events.js

    // **重要：更新 qr--bar 中的白名单按钮**
    updateWhitelistedRepliesInBar(); // index.js

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

// 添加到 onReady 回调之前
function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('QRA_settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            const currentSettings = extension_settings[Constants.EXTENSION_NAME];
            // 合并，确保新字段（如whitelistedReplies）也能被加载
            Object.assign(currentSettings, parsedSettings);
            // 再次确保默认值，以防localStorage中缺少某些字段
             currentSettings.whitelistedReplies = currentSettings.whitelistedReplies || [];
             currentSettings.menuStyles = currentSettings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
             // ... 其他可能需要默认值的字段 ...
            console.log(`[${Constants.EXTENSION_NAME}] 从localStorage加载了设置:`, currentSettings);
            return true;
        }
    } catch(e) {
        console.error(`[${Constants.EXTENSION_NAME}] 从localStorage加载设置失败:`, e);
    }
    return false;
}

// 在 onReady 回调中
onReady(() => {
    try {
        // 1. 尝试从localStorage加载设置
        loadSettingsFromLocalStorage();

        // 2. 确保设置面板容器存在
        let settingsContainer = document.getElementById('extensions_settings');
        if (!settingsContainer) {
            console.warn("[Quick Reply Menu] #extensions_settings not found, creating dummy container.");
            settingsContainer = document.createElement('div');
            settingsContainer.id = 'extensions_settings';
            settingsContainer.style.display = 'none';
            document.body.appendChild(settingsContainer);
        }

        // 3. 添加设置面板HTML内容 (使用 settings.js 的函数)
        const settingsHtml = createSettingsHtml(); // settings.js (应包含白名单面板HTML)
        // 尝试找到或创建特定扩展的容器
        let extensionSettingsDiv = document.getElementById(`${Constants.EXTENSION_NAME}-settings-wrapper`);
        if (!extensionSettingsDiv) {
            extensionSettingsDiv = document.createElement('div');
            extensionSettingsDiv.id = `${Constants.EXTENSION_NAME}-settings-wrapper`;
            settingsContainer.appendChild(extensionSettingsDiv);
        }
        extensionSettingsDiv.innerHTML = settingsHtml; // 替换内容，避免 innerHTML+= 的问题

        // 4. 初始化插件 (创建按钮、菜单、注入白名单容器等)
        initializePlugin(); // 调用上面修改过的函数

        // 5. 加载设置到设置面板UI元素
        loadAndApplySettingsToPanel(); // settings.js (加载到面板控件)

    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] 启动失败:`, err);
    }
});
