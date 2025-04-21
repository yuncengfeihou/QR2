// settings.js
import { extension_settings } from "./index.js";
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { updateMenuStylesUI } from './events.js'; // 导入样式更新函数
// 可能需要导入 index.js 中的 updateWhitelistedRepliesInBar
// import { updateWhitelistedRepliesInBar } from './index.js'; // 避免循环依赖，通过 window.quickReplyMenu 调用

/**
 * 更新按钮图标显示 (核心逻辑)
 * 根据设置使用不同的图标、大小和颜色风格
 */
export function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    const customIconUrl = settings.customIconUrl || '';
    const customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    const faIconCode = settings.faIconCode || '';
    const matchColors = settings.matchButtonColors !== false;

    // 清除内容和样式
    button.innerHTML = '';
    button.classList.remove('primary-button', 'secondary-button');
    button.style.backgroundImage = '';
    button.style.backgroundSize = '';
    button.style.backgroundPosition = '';
    button.style.backgroundRepeat = '';
    button.classList.add('interactable');

    // 设置图标内容
    if (iconType === Constants.ICON_TYPES.CUSTOM && customIconUrl) {
        const customContent = customIconUrl.trim();
        const sizeStyle = `${customIconSize}px ${customIconSize}px`;
        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
             const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
             button.style.backgroundImage = `url('${svgDataUrl}')`;
        } else if (customContent.startsWith('data:') || customContent.startsWith('http') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(customContent)) {
             button.style.backgroundImage = `url('${customContent}')`;
        } else if (customContent.includes('base64,')) {
             let imgUrl = customContent;
             if (!customContent.startsWith('data:')) {
                 const possibleType = customContent.substring(0, 10).includes('PNG') ? 'image/png' : 'image/jpeg';
                 imgUrl = `data:${possibleType};base64,` + customContent.split('base64,')[1];
             }
             button.style.backgroundImage = `url('${imgUrl}')`;
        } else {
             button.textContent = '?';
             console.warn(`[${Constants.EXTENSION_NAME}] 无法识别的自定义图标格式`);
        }
        button.style.backgroundSize = sizeStyle;
        button.style.backgroundPosition = 'center';
        button.style.backgroundRepeat = 'no-repeat';
    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
        button.innerHTML = faIconCode.trim();
    } else {
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }

    // 应用颜色匹配
    const sendButton = document.getElementById('send_but');
    let buttonClassToAdd = 'secondary-button';
    if (matchColors && sendButton && sendButton.classList.contains('primary-button')) {
        buttonClassToAdd = 'primary-button';
    }
    button.classList.add(buttonClassToAdd);
    button.style.color = ''; // Let CSS classes handle color
}

/**
 * Creates the HTML for the settings panel.
 * @returns {string} HTML string for the settings.
 */
export function createSettingsHtml() {
    // 菜单样式设置面板 (不变)
    const stylePanel = `
    <div id="${Constants.ID_MENU_STYLE_PANEL}" style="display:none; position: fixed; left: 50%; top: 10%; transform: translateX(-50%); z-index: 1002; border-radius: 10px; padding: 20px; width: 500px; max-width: 90vw; max-height: 80vh; overflow-y: auto; background-color: var(--background-color1, #0f0f0f); border: 1px solid var(--border-color, #444); color: var(--text-color, #fff);">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3 style="margin:0; color: var(--text-color, #fff);">菜单样式设置</h3>
            <button class="menu_button" id="${Constants.ID_MENU_STYLE_PANEL}-close" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <div class="quick-reply-style-group">
            <h4>菜单项样式</h4>
            <div class="quick-reply-settings-row">
                <label>背景:</label>
                <div class="color-picker-container"><input type="color" id="qr-item-bgcolor-picker" class="qr-color-picker"><input type="text" id="qr-item-bgcolor-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
                <div class="slider-container"><input type="range" id="qr-item-opacity" min="0" max="1" step="0.1" value="0.7" class="qr-opacity-slider"><span id="qr-item-opacity-value" class="opacity-value">0.7</span></div>
            </div>
            <div class="quick-reply-settings-row">
                <label>文字:</label>
                <div class="color-picker-container"><input type="color" id="qr-item-color-picker" class="qr-color-picker"><input type="text" id="qr-item-color-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
            </div>
        </div>
        <div class="quick-reply-style-group">
            <h4>标题样式</h4>
            <div class="quick-reply-settings-row">
                <label>文字:</label>
                <div class="color-picker-container"><input type="color" id="qr-title-color-picker" class="qr-color-picker"><input type="text" id="qr-title-color-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
            </div>
            <div class="quick-reply-settings-row">
                <label>分割线:</label>
                <div class="color-picker-container"><input type="color" id="qr-title-border-picker" class="qr-color-picker"><input type="text" id="qr-title-border-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
            </div>
        </div>
         <div class="quick-reply-style-group">
            <h4>空提示样式</h4>
             <div class="quick-reply-settings-row">
                 <label>提示文字:</label>
                 <div class="color-picker-container"><input type="color" id="qr-empty-color-picker" class="qr-color-picker"><input type="text" id="qr-empty-color-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
             </div>
         </div>
         <div class="quick-reply-style-group">
            <h4>菜单面板样式</h4>
            <div class="quick-reply-settings-row">
                 <label>背景:</label>
                 <div class="color-picker-container"><input type="color" id="qr-menu-bgcolor-picker" class="qr-color-picker"><input type="text" id="qr-menu-bgcolor-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
                 <div class="slider-container"><input type="range" id="qr-menu-opacity" min="0" max="1" step="0.1" value="0.85" class="qr-opacity-slider"><span id="qr-menu-opacity-value" class="opacity-value">0.85</span></div>
             </div>
             <div class="quick-reply-settings-row">
                 <label>边框:</label>
                 <div class="color-picker-container"><input type="color" id="qr-menu-border-picker" class="qr-color-picker"><input type="text" id="qr-menu-border-text" class="qr-color-text-input" placeholder="#RRGGBB"></div>
             </div>
         </div>
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            <button class="menu_button" id="${Constants.ID_RESET_STYLE_BUTTON}" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-rotate-left"></i> 恢复默认
            </button>
            <button class="menu_button" id="${Constants.ID_MENU_STYLE_PANEL}-apply" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-check"></i> 应用样式
            </button>
        </div>
    </div>
    `;

    // 使用说明面板 (不变)
    const usagePanel = `
    <div id="${Constants.ID_USAGE_PANEL}" class="qr-usage-panel" style="display:none;">
        <div style="margin-bottom:7px;">
            <h3 style="color: white; font-weight: bold; margin: 0 0 7px 0;">使用说明</h3>
        </div>
        <div class="quick-reply-usage-content">
            <!-- ... (内容不变，省略) ... -->
             <p><strong>新增功能：白名单</strong></p>
             <ul>
                <li>您可以在快速回复菜单中长按某个项目，将其添加到白名单。</li>
                <li>添加到白名单的快捷回复按钮将**不会**被本插件隐藏，而是直接显示在聊天输入框下方的原始快捷回复栏中。</li>
                <li>您可以在插件设置中点击“白名单管理”按钮，查看并管理已加入白名单的项目。在管理列表中长按项目即可将其移出白名单。</li>
             </ul>
             <p><strong>数据保存：</strong></p>
             <p>完成所有配置（包括图标、样式和白名单设置）后，记得点击主设置区域的“保存设置”按钮来手动保存。</p>
        </div>
        <div style="text-align:center; margin-top:10px;">
            <button class="menu_button" id="${Constants.ID_USAGE_PANEL}-close" style="width:auto; padding:0 10px;">
                确定
            </button>
        </div>
    </div>
    `;

    // --- 新增: 白名单管理面板 ---
    const whitelistPanel = `
    <div id="${Constants.ID_WHITELIST_PANEL}" style="display:none; position: fixed; left: 50%; top: 15%; transform: translateX(-50%); z-index: 1003; border-radius: 10px; padding: 20px; width: 450px; max-width: 90vw; max-height: 70vh; overflow-y: auto; background-color: var(--background-color1, #0f0f0f); border: 1px solid var(--border-color, #444); color: var(--text-color, #fff);">
        <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom:15px;">
            <h3 style="margin:0; color: var(--text-color, #fff);">白名单管理</h3>
            <button class="menu_button" id="${Constants.ID_WHITELIST_PANEL}-close" style="width:auto; padding:0 10px;">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <p style="font-size: 12px; color: #aaa; margin-top: -10px; margin-bottom: 15px;">长按列表中的项目可将其移出白名单。</p>
        <div id="${Constants.ID_WHITELIST_ITEMS_CONTAINER}">
            <!-- 白名单项目将由 JS 动态填充 -->
        </div>
    </div>
    `;

    // --- 主设置面板 HTML ---
    return `
    <div id="${Constants.ID_SETTINGS_CONTAINER}" class="extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>QR助手</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container flexGap5">
                    <label for="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}">插件状态:</label>
                    <select id="${Constants.ID_SETTINGS_ENABLED_DROPDOWN}" class="text_pole">
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                    </select>
                </div>

                <hr class="sysHR">
                <div class="flex-container flexGap5">
                    <label for="${Constants.ID_ICON_TYPE_DROPDOWN}">图标类型:</label>
                    <select id="${Constants.ID_ICON_TYPE_DROPDOWN}" class="text_pole transparent-select" style="width:120px;">
                        <option value="${Constants.ICON_TYPES.ROCKET}">小火箭</option>
                        <option value="${Constants.ICON_TYPES.COMMENT}">调色盘</option>
                        <option value="${Constants.ICON_TYPES.SPARKLES}">星闪</option>
                        <option value="${Constants.ICON_TYPES.STAR}">星月</option>
                        <option value="${Constants.ICON_TYPES.BOLT}">五芒星</option>
                        <option value="${Constants.ICON_TYPES.FONTAWESOME}">Font Awesome</option>
                        <option value="${Constants.ICON_TYPES.CUSTOM}">自定义图标</option>
                    </select>
                </div>

                <div class="flex-container flexGap5 custom-icon-container" style="display: none; margin-top:10px; align-items: center;">
                    <label for="${Constants.ID_CUSTOM_ICON_URL}">自定义图标:</label>
                     <div style="display:flex; flex-grow:1; gap:5px; align-items: center;">
                        <input type="text" id="${Constants.ID_CUSTOM_ICON_URL}" class="text_pole" style="flex-grow:1;" placeholder="URL, base64, 或 SVG 代码" />
                        <input type="number" id="${Constants.ID_CUSTOM_ICON_SIZE_INPUT}" class="text_pole" style="width: 60px;" min="10" max="50" step="1" placeholder="大小" title="图标大小 (像素)">
                        <input type="file" id="icon-file-upload" accept="image/*, image/svg+xml" style="display:none" />
                        <button class="menu_button" style="width:auto; padding:0 10px; flex-shrink: 0;" onclick="document.getElementById('icon-file-upload').click()">选择文件</button>
                     </div>
                </div>

                <div class="flex-container flexGap5 fa-icon-container" style="display: none; margin-top:10px;">
                    <label for="${Constants.ID_FA_ICON_CODE_INPUT}">FA 代码:</label>
                    <input type="text" id="${Constants.ID_FA_ICON_CODE_INPUT}" class="text_pole" style="flex-grow:1;" placeholder='粘贴 FontAwesome HTML, 如 <i class="fa-solid fa-house"></i>' />
                </div>

                <div class="flex-container flexGap5" style="margin:10px 0; align-items:center;">
                    <input type="checkbox" id="${Constants.ID_COLOR_MATCH_CHECKBOX}" style="margin-right:5px;" />
                    <label for="${Constants.ID_COLOR_MATCH_CHECKBOX}">使用与发送按钮相匹配的颜色风格</label>
                </div>

                <div style="display:flex; justify-content:space-between; flex-wrap: wrap; gap: 10px; margin-top:15px;">
                    <button id="${Constants.ID_MENU_STYLE_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-palette"></i> 菜单样式
                    </button>
                     {/* --- 新增: 白名单管理按钮 --- */}
                     <button id="${Constants.ID_WHITELIST_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                         <i class="fa-solid fa-list-check"></i> 白名单管理
                     </button>
                    <button id="${Constants.ID_USAGE_BUTTON}" class="menu_button" style="width:auto; padding:0 10px;">
                        <i class="fa-solid fa-circle-info"></i> 使用说明
                    </button>
                    <button id="qr-save-settings" class="menu_button" style="width:auto; padding:0 10px;" onclick="window.quickReplyMenu.saveSettings()">
                        <i class="fa-solid fa-floppy-disk"></i> 保存设置
                    </button>
                </div>

                <hr class="sysHR">
                <div id="qr-save-status" style="text-align: center; color: #4caf50; height: 20px; margin-top: 5px;"></div>
            </div>
        </div>
    </div>
    ${stylePanel}
    ${usagePanel}
    ${whitelistPanel} {/* 添加白名单面板到HTML */}
    `;
}


/**
 * 处理使用说明按钮点击
 */
export function handleUsageButtonClick() {
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    if (usagePanel) {
        usagePanel.style.display = 'block';
        // Position the panel
        const windowHeight = window.innerHeight;
        const panelHeight = usagePanel.offsetHeight;
        const topPosition = Math.max(50, (windowHeight - panelHeight) / 2);
        usagePanel.style.top = `${topPosition}px`;
        // usagePanel.style.transform = 'translateX(-50%)'; // Already in CSS potentially
    }
}

/**
 * 关闭使用说明面板
 */
export function closeUsagePanel() {
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    if (usagePanel) {
        usagePanel.style.display = 'none';
    }
}

/**
 * --- 新增: 处理白名单管理按钮点击 ---
 */
export function handleWhitelistButtonClick() {
    const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
    if (panel) {
        renderWhitelistManagementList(); // 渲染列表内容
        panel.style.display = 'block';
        // Position (optional, similar to usage panel)
        const windowHeight = window.innerHeight;
        const panelHeight = panel.offsetHeight;
        const topPosition = Math.max(50, (windowHeight - panelHeight) / 2);
        panel.style.top = `${topPosition}px`;
    }
}

/**
 * --- 新增: 关闭白名单管理面板 ---
 */
export function closeWhitelistPanel() {
    const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
    if (panel) {
        panel.style.display = 'none';
    }
}

/**
 * --- 新增: 渲染白名单管理列表 ---
 */
export function renderWhitelistManagementList() {
    const container = document.getElementById(Constants.ID_WHITELIST_ITEMS_CONTAINER);
    if (!container) return;

    container.innerHTML = ''; // 清空
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const whitelisted = settings.whitelistedReplies || [];

    if (whitelisted.length === 0) {
        container.innerHTML = `<div class="${Constants.CLASS_EMPTY}">白名单为空</div>`;
        return;
    }

    whitelisted.forEach(item => {
        const listItem = document.createElement('div');
        listItem.className = 'whitelist-management-item'; // 添加样式类
        listItem.textContent = `${item.setName} > ${item.label}`;
        listItem.title = `长按移除: ${item.setName} > ${item.label}`;
        listItem.dataset.setName = item.setName;
        listItem.dataset.label = item.label;

        // 添加长按移除监听器
        let pressTimer = null;
        let isLongPress = false;

        listItem.addEventListener('mousedown', (e) => {
             // Only react to left clicks
            if (e.button !== 0) return;
            isLongPress = false;
            pressTimer = window.setTimeout(() => {
                isLongPress = true;
                handleWhitelistItemLongPress(e); // 调用长按处理函数
            }, Constants.LONG_PRESS_DURATION); // 使用常量
        });

        listItem.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
        });

        listItem.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });
         listItem.addEventListener('touchstart', (e) => { // Touch support
            isLongPress = false;
            pressTimer = window.setTimeout(() => {
                isLongPress = true;
                handleWhitelistItemLongPress(e); // 调用长按处理函数
             }, Constants.LONG_PRESS_DURATION);
        });

        listItem.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        listItem.addEventListener('touchmove', () => { // Cancel long press if finger moves
             clearTimeout(pressTimer);
        });

        // Prevent context menu on long press (especially mobile)
         listItem.addEventListener('contextmenu', (e) => {
             if (isLongPress) {
                 e.preventDefault();
             }
         });


        container.appendChild(listItem);
    });
}

/**
 * --- 新增: 处理白名单管理列表项的长按事件 (移除) ---
 * @param {Event} event
 */
export function handleWhitelistItemLongPress(event) {
    const targetItem = event.currentTarget;
    const setName = targetItem.dataset.setName;
    const label = targetItem.dataset.label;

    if (setName && label) {
        // 调用 index.js 暴露的移除函数
        if (window.quickReplyMenu && window.quickReplyMenu.removeFromWhitelist) {
            const removed = window.quickReplyMenu.removeFromWhitelist(setName, label);
            if (removed) {
                // 可选：添加视觉反馈，例如短暂高亮或移除动画
                targetItem.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                setTimeout(() => {
                    // 重新渲染列表（或者直接移除 DOM 元素，取决于 removeFromWhitelist 的实现）
                     renderWhitelistManagementList(); // 重新渲染更简单
                }, 300);
                showTemporaryMessage(targetItem.parentNode, '已移出白名单', '#f44336'); // 显示提示
            }
        }
    }
}

// 统一处理设置变更的函数
export function handleSettingsChange(event) {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const targetId = event.target.id;
    let shouldUpdateIcon = true; // 默认更新图标

    // 处理不同控件的设置变更
    if (targetId === Constants.ID_SETTINGS_ENABLED_DROPDOWN) {
        const enabled = event.target.value === 'true';
        settings.enabled = enabled;
        document.body.classList.remove('qra-enabled', 'qra-disabled');
        document.body.classList.add(enabled ? 'qra-enabled' : 'qra-disabled');
        const rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
        if (rocketButton) {
            rocketButton.style.display = enabled ? 'flex' : 'none';
        }
        // 启用/禁用不需要更新图标本身样式，只需更新可见性
        shouldUpdateIcon = false;
    }
    else if (targetId === Constants.ID_ICON_TYPE_DROPDOWN) {
        settings.iconType = event.target.value;
        // 更新相关输入框显示状态
        const customIconContainer = document.querySelector(`#${Constants.ID_SETTINGS_CONTAINER} .custom-icon-container`);
        const faIconContainer = document.querySelector(`#${Constants.ID_SETTINGS_CONTAINER} .fa-icon-container`);
        if (customIconContainer) customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
        if (faIconContainer) faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';
    }
    else if (targetId === Constants.ID_CUSTOM_ICON_URL) {
        settings.customIconUrl = event.target.value;
    }
    else if (targetId === Constants.ID_CUSTOM_ICON_SIZE_INPUT) {
        settings.customIconSize = parseInt(event.target.value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    }
    else if (targetId === Constants.ID_FA_ICON_CODE_INPUT) {
        settings.faIconCode = event.target.value;
    }
    else if (targetId === Constants.ID_COLOR_MATCH_CHECKBOX) {
        settings.matchButtonColors = event.target.checked;
    } else {
        // 如果是其他未明确处理的控件变化，不更新图标
        shouldUpdateIcon = false;
    }

    // 如果需要，更新火箭按钮图标显示
    if (shouldUpdateIcon) {
        updateIconDisplay();
    }

    // 变更后不需要自动保存，等待用户点击保存按钮
}

// // 保存设置 (现在由 index.js 的 window.quickReplyMenu.saveSettings 处理)
// function saveSettings() { ... }

/**
 * 设置事件监听器 (文件上传、白名单等)
 */
export function setupSettingsEventListeners() {
    // 使用说明按钮
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    usageButton?.addEventListener('click', handleUsageButtonClick);
    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`);
    usageCloseButton?.addEventListener('click', closeUsagePanel);

    // --- 新增: 白名单面板按钮 ---
    const whitelistButton = document.getElementById(Constants.ID_WHITELIST_BUTTON);
    whitelistButton?.addEventListener('click', handleWhitelistButtonClick);
    const whitelistCloseButton = document.getElementById(`${Constants.ID_WHITELIST_PANEL}-close`);
    whitelistCloseButton?.addEventListener('click', closeWhitelistPanel);

    // 文件上传
    const fileUpload = document.getElementById('icon-file-upload');
    fileUpload?.addEventListener('change', handleFileUpload);

    // 保存按钮 (监听器在 createSettingsHtml 中通过 onclick 添加)
    // const saveButton = document.getElementById('qr-save-settings');
    // saveButton?.addEventListener('click', () => { ... }); // 使用 index.js 中的全局函数

    // 主要设置控件的监听器 (在 events.js 中添加，调用 handleSettingsChange)
}

/**
 * 处理文件上传事件
 * @param {Event} event 文件上传事件
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        if (customIconUrlInput) {
            const result = e.target.result;
            customIconUrlInput.value = result; // 更新输入框
            const settings = extension_settings[Constants.EXTENSION_NAME];
            settings.customIconUrl = result; // 更新设置对象
            updateIconDisplay(); // 更新图标预览
            // 触发 input 事件，确保 handleSettingsChange 被调用（如果需要）
            customIconUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };
    reader.onerror = function(error) {
        console.error(`[${Constants.EXTENSION_NAME}] 读取文件失败:`, error);
    };
    reader.readAsDataURL(file);
}

/**
 * Loads initial settings and applies them to the UI elements in the settings panel.
 */
export function loadAndApplySettings() {
    // 确保设置对象存在并设置默认值
    const settings = extension_settings[Constants.EXTENSION_NAME] = extension_settings[Constants.EXTENSION_NAME] || {};

    settings.enabled = settings.enabled !== false;
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || '';
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    settings.faIconCode = settings.faIconCode || '';
    settings.matchButtonColors = settings.matchButtonColors !== false;
    settings.whitelistedReplies = settings.whitelistedReplies || []; // <-- 加载白名单

    // 应用设置到UI元素
    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    if (enabledDropdown) enabledDropdown.value = String(settings.enabled);

    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    if (iconTypeDropdown) iconTypeDropdown.value = settings.iconType;

    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    if (customIconUrlInput) customIconUrlInput.value = settings.customIconUrl;

    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
    if (customIconSizeInput) customIconSizeInput.value = settings.customIconSize;

    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
    if (faIconCodeInput) faIconCodeInput.value = settings.faIconCode;

    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);
    if (colorMatchCheckbox) colorMatchCheckbox.checked = settings.matchButtonColors;

    // 根据加载的 iconType 设置输入容器的初始可见性
    const customIconContainer = document.querySelector(`#${Constants.ID_SETTINGS_CONTAINER} .custom-icon-container`);
    const faIconContainer = document.querySelector(`#${Constants.ID_SETTINGS_CONTAINER} .fa-icon-container`);
    if (customIconContainer) customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
    if (faIconContainer) faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';

    // 设置其他监听器 (包括白名单按钮)
    setupSettingsEventListeners(); // 确保监听器已设置

    // 最后，调用统一的图标更新函数来应用初始图标
    updateIconDisplay();

    console.log(`[${Constants.EXTENSION_NAME}] Settings loaded and applied to settings panel.`);
}

/**
 * 辅助函数：在指定元素附近显示临时消息
 * @param {HTMLElement} referenceElement 消息显示位置的参考元素
 * @param {string} text 消息内容
 * @param {string} color 消息颜色 (CSS color string)
 * @param {number} duration 显示时长 (ms)
 */
function showTemporaryMessage(referenceElement, text, color = '#4caf50', duration = 1500) {
    if (!referenceElement) return;

    const messageDiv = document.createElement('div');
    messageDiv.textContent = text;
    messageDiv.style.position = 'absolute';
    messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageDiv.style.color = color;
    messageDiv.style.padding = '5px 10px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.fontSize = '12px';
    messageDiv.style.zIndex = '1005'; // Ensure it's above the panel
    messageDiv.style.opacity = '0';
    messageDiv.style.transition = 'opacity 0.3s ease-in-out';
    messageDiv.style.pointerEvents = 'none'; // Don't interfere with clicks

    document.body.appendChild(messageDiv); // Append to body to avoid positioning issues

    // Position near the reference element (e.g., above)
    const rect = referenceElement.getBoundingClientRect();
    messageDiv.style.left = `${rect.left + window.scrollX}px`;
    messageDiv.style.top = `${rect.top + window.scrollY - messageDiv.offsetHeight - 5}px`; // Adjust top position

    // Fade in
    requestAnimationFrame(() => {
        messageDiv.style.opacity = '1';
    });

    // Fade out and remove
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300); // Wait for fade out transition
    }, duration);
}

// 确保在 index.js 中暴露 updateIconPreview
if (window.quickReplyMenu) {
    window.quickReplyMenu.updateIconPreview = updateIconPreview;
} else {
    // 如果 quickReplyMenu 尚未创建，则延迟赋值
    // (虽然正常流程中应该已经创建)
    setTimeout(() => {
        if (window.quickReplyMenu) {
            window.quickReplyMenu.updateIconPreview = updateIconPreview;
        }
    }, 0);
}
