// settings.js
import { extension_settings } from "./index.js";
import * as Constants from './constants.js';
import { sharedState } from './state.js';
import { updateMenuStylesUI } from './events.js'; // Import for applying styles

// Helper function for long press detection
function addLongPressListener(element, callback, duration = 500) {
    let timer;
    let startX, startY;
    let moved = false;

    const start = (e) => {
        // Prevent triggering on right-click or middle-click
        if (e.button !== 0) return;

        moved = false;
        startX = e.clientX || e.touches?.[0]?.clientX;
        startY = e.clientY || e.touches?.[0]?.clientY;

        timer = setTimeout(() => {
            if (!moved) { // Only fire if mouse hasn't moved significantly
                callback(e); // Execute the long press action
            }
        }, duration);

        element.addEventListener('mousemove', move);
        element.addEventListener('touchmove', move); // For touch devices
        element.addEventListener('mouseup', end);
        element.addEventListener('mouseleave', end);
        element.addEventListener('touchend', end); // For touch devices
    };

    const move = (e) => {
        const currentX = e.clientX || e.touches?.[0]?.clientX;
        const currentY = e.clientY || e.touches?.[0]?.clientY;
        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);

        // If moved more than a few pixels, cancel the long press
        if (deltaX > 5 || deltaY > 5) {
            moved = true;
            clearTimeout(timer);
        }
    };

    const end = () => {
        clearTimeout(timer);
        element.removeEventListener('mousemove', move);
        element.removeEventListener('touchmove', move);
        element.removeEventListener('mouseup', end);
        element.removeEventListener('mouseleave', end);
        element.removeEventListener('touchend', end);
    };

    element.addEventListener('mousedown', start);
    element.addEventListener('touchstart', start); // For touch devices

    // Return a cleanup function to remove the listener if needed
    return () => {
        element.removeEventListener('mousedown', start);
        element.removeEventListener('touchstart', start);
        // Ensure other listeners are also removed in case they are still attached
        end();
    };
}


/**
 * Ensures the container for whitelisted buttons exists within #qr--bar.
 */
export function initializeWhitelistContainerInQrBar() {
    const qrBar = document.getElementById('qr--bar');
    if (!qrBar) {
        console.warn(`[${Constants.EXTENSION_NAME}] #qr--bar not found. Cannot initialize whitelist container.`);
        return;
    }
    let whitelistContainer = document.getElementById(Constants.ID_QR_BAR_WHITELIST_CONTAINER);
    if (!whitelistContainer) {
        whitelistContainer = document.createElement('div');
        whitelistContainer.id = Constants.ID_QR_BAR_WHITELIST_CONTAINER;
        // Add classes needed for layout (might be similar to original qr--buttons)
        whitelistContainer.className = 'qr--buttons'; // Assuming this class handles flex layout
        // Prepend or append based on desired position relative to the rocket button
        // Prepending might make sense visually
        qrBar.prepend(whitelistContainer);
        console.log(`[${Constants.EXTENSION_NAME}] Initialized whitelist container in #qr--bar.`);
    }
}

/**
 * Updates the display of whitelisted quick replies in the #qr--bar.
 */
export function updateWhitelistedRepliesInBar() {
    const container = document.getElementById(Constants.ID_QR_BAR_WHITELIST_CONTAINER);
    if (!container) {
        console.error(`[${Constants.EXTENSION_NAME}] Whitelist container #${Constants.ID_QR_BAR_WHITELIST_CONTAINER} not found in DOM.`);
        initializeWhitelistContainerInQrBar(); // Try to create it if missing
        container = document.getElementById(Constants.ID_QR_BAR_WHITELIST_CONTAINER); // Try getting it again
        if (!container) return; // Still not found, abort
    }

    container.innerHTML = ''; // Clear existing buttons

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const whitelist = settings.whitelistedReplies || [];

    if (whitelist.length === 0) {
        // console.log(`[${Constants.EXTENSION_NAME}] No whitelisted replies to display.`);
        return; // Nothing to display
    }

    // Check if Quick Reply v2 API is available and enabled
    if (!window.quickReplyApi || window.quickReplyApi.settings?.isEnabled === false) {
        console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled or API not found. Cannot display whitelisted replies.`);
        return;
    }

    console.log(`[${Constants.EXTENSION_NAME}] Updating whitelisted replies in qr--bar:`, whitelist);

    whitelist.forEach(item => {
        const { setName, label } = item;

        // Create the button
        const button = document.createElement('button');
        button.type = 'button';
        // Apply styles to mimic original Quick Reply buttons
        // This might need adjustment based on actual QRv2 classes/styles
        button.className = 'menu_button secondary-button'; // Example classes
        button.textContent = label;
        button.title = `${setName} > ${label}`;
        // Add necessary data attributes if QRv2 relies on them (unlikely for direct execution)

        // Add click listener to execute the reply using the core API
        button.addEventListener('click', async () => {
            if (!window.quickReplyApi || !window.quickReplyApi.executeQuickReply) {
                console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API or executeQuickReply not available.`);
                alert('无法触发快速回复：API不可用。'); // User feedback
                return;
            }
            if (window.quickReplyApi.settings?.isEnabled === false) {
                 console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Cannot trigger whitelisted reply.`);
                 alert('无法触发快速回复：核心插件已禁用。'); // User feedback
                 return;
            }

            console.log(`[${Constants.EXTENSION_NAME}] Triggering whitelisted reply from qr--bar: "${setName}.${label}"`);
            try {
                await window.quickReplyApi.executeQuickReply(setName, label);
            } catch (error) {
                console.error(`[${Constants.EXTENSION_NAME}] Failed to execute whitelisted Quick Reply "${setName}.${label}" from qr--bar:`, error);
                alert(`触发快速回复 "${label}" 失败。\n错误: ${error.message}`); // User feedback
            }
        });

        container.appendChild(button);
    });
}


/**
 * Updates the rocket button icon display based on current settings.
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

    // 1. Clear existing content and styles
    button.innerHTML = '';
    button.classList.remove('primary-button', 'secondary-button');
    button.style.backgroundImage = '';
    button.style.backgroundSize = '';
    button.style.backgroundPosition = '';
    button.style.backgroundRepeat = '';
    button.classList.add('interactable');

    // 2. Set content based on icon type
    if (iconType === Constants.ICON_TYPES.CUSTOM && customIconUrl) {
        const customContent = customIconUrl.trim();
        const sizeStyle = `${customIconSize}px ${customIconSize}px`;

        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
            button.style.backgroundImage = `url('${svgDataUrl}')`;
            button.style.backgroundSize = sizeStyle;
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } else if (customContent.startsWith('data:') || customContent.startsWith('http') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(customContent)) {
            button.style.backgroundImage = `url('${customContent}')`;
            button.style.backgroundSize = sizeStyle;
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } else if (customContent.includes('base64,')) {
            let imgUrl = customContent;
            if (!customContent.startsWith('data:')) {
                const possibleType = customContent.substring(0, 10).includes('PNG') ? 'image/png' : 'image/jpeg';
                imgUrl = `data:${possibleType};base64,` + customContent.split('base64,')[1];
            }
            button.style.backgroundImage = `url('${imgUrl}')`;
            button.style.backgroundSize = sizeStyle;
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } else {
            button.textContent = '?';
            console.warn(`[${Constants.EXTENSION_NAME}] Unrecognized custom icon format`);
        }
    } else if (iconType === Constants.ICON_TYPES.FONTAWESOME && faIconCode) {
        button.innerHTML = faIconCode.trim();
    } else {
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        button.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }

    // 3. Apply color matching
    const sendButton = document.getElementById('send_but');
    let buttonClassToAdd = 'secondary-button'; // Default
    if (matchColors && sendButton?.classList.contains('primary-button')) {
        buttonClassToAdd = 'primary-button';
    }
    button.classList.add(buttonClassToAdd);
    button.style.color = ''; // Let CSS class handle color
}


/**
 * Creates the HTML for the settings panel, including the new Whitelist section.
 * @returns {string} HTML string for the settings.
 */
export function createSettingsHtml() {
    // Whitelist Management Panel HTML
    const whitelistPanel = `
    <div id="${Constants.ID_WHITELIST_PANEL}" class="qr-sub-panel" style="display: none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3>白名单管理</h3>
            <button class="menu_button" id="${Constants.ID_WHITELIST_PANEL}-close" style="width:auto; padding:0 10px;" title="关闭">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <p style="font-size: 12px; color: #aaa; margin-bottom: 10px;">
            长按列表中的项目可将其移出白名单。白名单中的回复将始终显示在原始输入栏中。
        </p>
        <div id="${Constants.ID_WHITELIST_ITEMS_CONTAINER}" class="whitelist-items-list">
            <!-- Whitelist items will be rendered here by JS -->
            <p style="color: #666; text-align: center;">白名单为空。</p>
        </div>
    </div>
    `;

    // Menu Style Panel HTML (copied from original, assuming no changes needed here for now)
    const stylePanel = `
    <div id="${Constants.ID_MENU_STYLE_PANEL}" class="qr-sub-panel" style="display: none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3>菜单样式设置</h3>
            <button class="menu_button" id="${Constants.ID_MENU_STYLE_PANEL}-close" style="width:auto; padding:0 10px;" title="关闭">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>

        <div class="quick-reply-style-group">
            <h4>菜单项样式</h4>
            <div class="quick-reply-settings-row">
                <label>背景:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-item-bgcolor-picker" class="qr-color-picker">
                    <input type="text" id="qr-item-bgcolor-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
                <div class="slider-container">
                    <input type="range" id="qr-item-opacity" min="0" max="1" step="0.1" value="0.7" class="qr-opacity-slider">
                    <span id="qr-item-opacity-value" class="opacity-value">0.7</span>
                </div>
            </div>
            <div class="quick-reply-settings-row">
                <label>文字:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-item-color-picker" class="qr-color-picker">
                    <input type="text" id="qr-item-color-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>

        <div class="quick-reply-style-group">
            <h4>标题样式</h4>
             <div class="quick-reply-settings-row">
                <label>文字:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-title-color-picker" class="qr-color-picker">
                    <input type="text" id="qr-title-color-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
            <div class="quick-reply-settings-row">
                <label>分割线:</label>
                 <div class="color-picker-container">
                    <input type="color" id="qr-title-border-picker" class="qr-color-picker">
                    <input type="text" id="qr-title-border-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>

         <div class="quick-reply-style-group">
            <h4>空提示样式</h4>
             <div class="quick-reply-settings-row">
                <label>文字:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-empty-color-picker" class="qr-color-picker">
                    <input type="text" id="qr-empty-color-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
            </div>
        </div>

        <div class="quick-reply-style-group">
            <h4>菜单面板样式</h4>
            <div class="quick-reply-settings-row">
                <label>背景:</label>
                <div class="color-picker-container">
                    <input type="color" id="qr-menu-bgcolor-picker" class="qr-color-picker">
                    <input type="text" id="qr-menu-bgcolor-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
                <div class="slider-container">
                    <input type="range" id="qr-menu-opacity" min="0" max="1" step="0.1" value="0.85" class="qr-opacity-slider">
                    <span id="qr-menu-opacity-value" class="opacity-value">0.85</span>
                </div>
            </div>
            <div class="quick-reply-settings-row">
                <label>边框:</label>
                 <div class="color-picker-container">
                    <input type="color" id="qr-menu-border-picker" class="qr-color-picker">
                    <input type="text" id="qr-menu-border-text" class="qr-color-text-input" placeholder="#RRGGBB">
                </div>
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

    // Usage Panel HTML (copied from original)
    const usagePanel = `
    <div id="${Constants.ID_USAGE_PANEL}" class="qr-usage-panel" style="display: none;">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
             <h3 style="margin:0; color: white; font-weight: bold;">使用说明</h3>
             <button class="menu_button" id="${Constants.ID_USAGE_PANEL}-close" style="width:auto; padding:0 10px;" title="关闭">
                 <i class="fa-solid fa-times"></i>
             </button>
         </div>
        <div class="quick-reply-usage-content">
             <p><strong>该插件主要提供以下基本功能：</strong></p>
             <ul>
                 <li>通过点击发送按钮旁边的小图标，快速打开或关闭快捷回复菜单。</li>
                 <li>支持两种快捷回复类型：“聊天快捷回复”（针对当前聊天）和“全局快捷回复”（适用于所有聊天），方便分类管理。</li>
                 <li>提供“白名单”功能，允许您选择哪些快捷回复始终显示在原始输入栏中，而不是被收纳到菜单里。</li>
             </ul>

             <p><strong>以下是关于插件的详细设置</strong></p>

             <p><strong>首先，在基本设置中，你可以：</strong></p>
             <ul>
                 <li>选择“启用”或“禁用”来控制插件的整体开关状态。</li>
                 <li>选择显示在发送按钮旁边的图标样式。</li>
             </ul>

             <p><strong>其次，在图标设置部分：</strong></p>
             <ul>
                 <li>若选择“自定义图标”，可以输入URL/SVG/Base64，或上传本地图片，并调整显示大小。</li>
                 <li>若选择“Font Awesome”，可以粘贴 Font Awesome 图标的 HTML 代码。</li>
                 <li>可以勾选“使用与发送按钮相匹配的颜色风格”。</li>
             </ul>

             <p><strong>然后，你可以通过点击“菜单样式”按钮，来自定义快捷回复菜单的外观。</strong></p>

            <p><strong>新增的“白名单管理”功能：</strong></p>
            <ul>
                 <li>点击“白名单管理”按钮打开管理面板。</li>
                 <li>面板中会列出所有已添加到白名单的快捷回复。</li>
                 <li><strong>长按 (按住不放约半秒)</strong> 列表中的某个项目，即可将其从白名单中移除。</li>
                 <li>白名单中的项目会直接显示在聊天输入框旁，不会被插件菜单隐藏。</li>
                 <li><strong>如何添加？</strong> 在插件弹出的快捷回复菜单中，长按您想要保留在外的快捷回复按钮即可将其加入白名单。</li>
            </ul>

             <p><strong>最后是关于数据保存：</strong></p>
             <p>完成所有配置（包括图标、样式和白名单设置）后，记得点击“保存设置”按钮来手动保存。</p>
        </div>
         <div style="text-align:center; margin-top:15px;">
             <button class="menu_button" id="${Constants.ID_USAGE_PANEL}-confirm" style="width:auto; padding:0 10px;">
                 确定
             </button>
         </div>
    </div>
    `;

    // Main Settings Structure
    return `
    <div class="extension-settings"> <!-- Outer container remains -->
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
                        <button class="menu_button" style="width:auto; padding:0 10px; flex-shrink: 0;" onclick="document.getElementById('icon-file-upload').click()">
                            选择文件
                        </button>
                    </div>
                </div>

                <div class="flex-container flexGap5 fa-icon-container" style="display: none; margin-top:10px;">
                    <label for="${Constants.ID_FA_ICON_CODE_INPUT}">FA 代码:</label>
                    <input type="text" id="${Constants.ID_FA_ICON_CODE_INPUT}" class="text_pole" style="flex-grow:1;" placeholder='粘贴 FontAwesome HTML, 如 <i class="fa-solid fa-house"></i>' />
                </div>

                <div class="flex-container flexGap5" style="margin:10px 0; align-items:center;">
                    <input type="checkbox" id="${Constants.ID_COLOR_MATCH_CHECKBOX}" style="margin-right:5px;" />
                    <label for="${Constants.ID_COLOR_MATCH_CHECKBOX}">匹配发送按钮颜色风格</label>
                </div>

                <div class="quick-reply-settings-actions" style="display:flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; margin-top:15px;">
                     <button id="${Constants.ID_WHITELIST_BUTTON}" class="menu_button" style="flex-basis: calc(33% - 10px);">
                         <i class="fa-solid fa-list-check"></i> 白名单管理
                     </button>
                    <button id="${Constants.ID_MENU_STYLE_BUTTON}" class="menu_button" style="flex-basis: calc(33% - 10px);">
                        <i class="fa-solid fa-palette"></i> 菜单样式
                    </button>
                    <button id="${Constants.ID_USAGE_BUTTON}" class="menu_button" style="flex-basis: calc(33% - 10px);">
                        <i class="fa-solid fa-circle-info"></i> 使用说明
                    </button>
                    <button id="qr-save-settings" class="menu_button primary-button" style="flex-basis: 100%; margin-top: 10px;" onclick="window.quickReplyMenu.saveSettings()">
                        <i class="fa-solid fa-floppy-disk"></i> 保存设置
                    </button>
                </div>

                <hr class="sysHR">
                <div id="qr-save-status" style="text-align: center; color: #4caf50; height: 20px; margin-top: 5px;"></div>
            </div>
        </div>
    </div>
    ${whitelistPanel}
    ${stylePanel}
    ${usagePanel}`;
}

/**
 * Removes a specific reply from the whitelist.
 * @param {string} setName
 * @param {string} label
 */
function removeReplyFromWhitelist(setName, label) {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    if (!settings.whitelistedReplies) return;

    const initialLength = settings.whitelistedReplies.length;
    settings.whitelistedReplies = settings.whitelistedReplies.filter(item =>
        !(item.setName === setName && item.label === label)
    );

    if (settings.whitelistedReplies.length < initialLength) {
        console.log(`[${Constants.EXTENSION_NAME}] Removed "${setName}.${label}" from whitelist.`);
        // Save settings immediately after removal
        if (window.quickReplyMenu && window.quickReplyMenu.saveSettings) {
             // Use a slight delay to allow UI feedback before potential blocking save
             setTimeout(() => {
                window.quickReplyMenu.saveSettings();
             }, 50);
        } else {
            console.error("Save function not found on window.quickReplyMenu");
        }

        // Re-render the management list and update the qr--bar
        renderWhitelistManagementList();
        updateWhitelistedRepliesInBar();
    }
}

/**
 * Renders the list of whitelisted items in the settings panel.
 */
function renderWhitelistManagementList() {
    const container = document.getElementById(Constants.ID_WHITELIST_ITEMS_CONTAINER);
    if (!container) return;

    container.innerHTML = ''; // Clear previous items

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const whitelist = settings.whitelistedReplies || [];

    if (whitelist.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">白名单为空。</p>';
        return;
    }

    whitelist.forEach(item => {
        const { setName, label } = item;
        const listItem = document.createElement('div');
        listItem.className = 'whitelist-item'; // Add class for styling
        listItem.style.padding = '5px 8px';
        listItem.style.margin = '3px 0';
        listItem.style.backgroundColor = 'var(--background-color2, #2a2a2a)';
        listItem.style.borderRadius = '4px';
        listItem.style.cursor = 'pointer'; // Indicate interactiveness
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.alignItems = 'center';

        const textSpan = document.createElement('span');
        textSpan.textContent = `${setName} > ${label}`;
        textSpan.style.overflow = 'hidden';
        textSpan.style.textOverflow = 'ellipsis';
        textSpan.style.whiteSpace = 'nowrap';
        textSpan.title = `${setName} > ${label}`; // Tooltip for full text

        listItem.appendChild(textSpan);

        // Add long-press listener to remove item
        const cleanupListener = addLongPressListener(listItem, () => {
            // Visual feedback for removal
            listItem.style.transition = 'opacity 0.3s ease-out';
            listItem.style.opacity = '0';
             listItem.style.backgroundColor = 'darkred'; // Temp visual cue

            // Wait for animation before actually removing
            setTimeout(() => {
                removeReplyFromWhitelist(setName, label);
                // The list will be re-rendered by removeReplyFromWhitelist
            }, 300); // Match animation duration
        });

        // Store cleanup function if needed later, e.g., when panel closes
        // listItem._cleanupLongPress = cleanupListener;

        container.appendChild(listItem);
    });
}

/** Opens the Whitelist Management Panel */
function handleWhitelistButtonClick() {
    const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
    if (panel) {
        renderWhitelistManagementList(); // Populate before showing
        panel.style.display = 'block';
        // Optional: Add focus management or animation
    }
}

/** Closes the Whitelist Management Panel */
function closeWhitelistPanel() {
    const panel = document.getElementById(Constants.ID_WHITELIST_PANEL);
    if (panel) {
        panel.style.display = 'none';
        // Optional: Clean up listeners if necessary (though re-rendering on open is safer)
    }
}


/** Opens the Usage Panel */
export function handleUsageButtonClick() {
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    if (usagePanel) {
        usagePanel.style.display = 'block';
        // Center panel logic (consider moving to a general showPanel function)
        const windowHeight = window.innerHeight;
        const panelHeight = usagePanel.offsetHeight;
        const topPosition = Math.max(50, (windowHeight - panelHeight) / 2);
        usagePanel.style.top = `${topPosition}px`;
        // usagePanel.style.transform = 'translateX(-50%)'; // Already in CSS? Check style.css
    }
}

/** Closes the Usage Panel */
export function closeUsagePanel() {
    const usagePanel = document.getElementById(Constants.ID_USAGE_PANEL);
    if (usagePanel) {
        usagePanel.style.display = 'none';
    }
}

// Unified handler for settings changes (main panel controls)
export function handleSettingsChange(event) {
    const settings = extension_settings[Constants.EXTENSION_NAME];
    const targetId = event.target.id;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

    let needsIconUpdate = false;
    let needsVisibilityUpdate = false;
    let needsFaCustomToggle = false;

    switch (targetId) {
        case Constants.ID_SETTINGS_ENABLED_DROPDOWN:
            settings.enabled = value === 'true';
            needsVisibilityUpdate = true;
            break;
        case Constants.ID_ICON_TYPE_DROPDOWN:
            settings.iconType = value;
            needsIconUpdate = true;
            needsFaCustomToggle = true;
            break;
        case Constants.ID_CUSTOM_ICON_URL:
            settings.customIconUrl = value;
            if (settings.iconType === Constants.ICON_TYPES.CUSTOM) needsIconUpdate = true;
            break;
        case Constants.ID_CUSTOM_ICON_SIZE_INPUT:
            settings.customIconSize = parseInt(value, 10) || Constants.DEFAULT_CUSTOM_ICON_SIZE;
            if (settings.iconType === Constants.ICON_TYPES.CUSTOM) needsIconUpdate = true;
            break;
        case Constants.ID_FA_ICON_CODE_INPUT:
            settings.faIconCode = value;
            if (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) needsIconUpdate = true;
            break;
        case Constants.ID_COLOR_MATCH_CHECKBOX:
            settings.matchButtonColors = value;
            needsIconUpdate = true;
            break;
    }

    // Update UI elements based on changes
    if (needsVisibilityUpdate) {
        document.body.classList.remove('qra-enabled', 'qra-disabled');
        document.body.classList.add(settings.enabled ? 'qra-enabled' : 'qra-disabled');
        const rocketButton = document.getElementById(Constants.ID_ROCKET_BUTTON);
        if (rocketButton) {
            rocketButton.style.display = settings.enabled ? 'flex' : 'none';
        }
        // Also update qr--bar visibility based on whitelist? No, CSS handles that.
    }

    if (needsFaCustomToggle) {
        const customIconContainer = document.querySelector('.custom-icon-container');
        const faIconContainer = document.querySelector('.fa-icon-container');
        if (customIconContainer) customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
        if (faIconContainer) faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';
    }

    if (needsIconUpdate) {
        updateIconDisplay();
    }

    // Note: Settings are saved via the global save button, not automatically on change here.
}

// Saves settings (called by global save button)
// This function is now mainly a wrapper around the globally exposed saveSettings
function saveSettings() {
    if (window.quickReplyMenu && window.quickReplyMenu.saveSettings) {
        return window.quickReplyMenu.saveSettings();
    } else {
        console.error("Save function not found on window.quickReplyMenu");
        return false;
    }
}

/**
 * Sets up event listeners for the settings panel elements.
 */
export function setupSettingsEventListeners() {
    // Main settings controls
    const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    const customIconSizeInput = document.getElementById(Constants.ID_CUSTOM_ICON_SIZE_INPUT);
    const faIconCodeInput = document.getElementById(Constants.ID_FA_ICON_CODE_INPUT);
    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);
    const fileUploadInput = document.getElementById('icon-file-upload');

    enabledDropdown?.addEventListener('change', handleSettingsChange);
    iconTypeDropdown?.addEventListener('change', handleSettingsChange);
    customIconUrlInput?.addEventListener('input', handleSettingsChange); // Use input for real-time preview possibility
    customIconSizeInput?.addEventListener('input', handleSettingsChange);
    faIconCodeInput?.addEventListener('input', handleSettingsChange);
    colorMatchCheckbox?.addEventListener('change', handleSettingsChange);
    fileUploadInput?.addEventListener('change', handleFileUpload); // File upload handler below

    // Sub-panel buttons
    const whitelistButton = document.getElementById(Constants.ID_WHITELIST_BUTTON);
    const whitelistCloseButton = document.getElementById(`${Constants.ID_WHITELIST_PANEL}-close`);
    const menuStyleButton = document.getElementById(Constants.ID_MENU_STYLE_BUTTON); // Defined in events.js handler
    const usageButton = document.getElementById(Constants.ID_USAGE_BUTTON);
    const usageCloseButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-close`); // Close button inside usage panel
    const usageConfirmButton = document.getElementById(`${Constants.ID_USAGE_PANEL}-confirm`); // Confirm button inside usage panel


    whitelistButton?.addEventListener('click', handleWhitelistButtonClick);
    whitelistCloseButton?.addEventListener('click', closeWhitelistPanel);
    // menuStyleButton listener is setup in events.js as it calls event.js functions
    usageButton?.addEventListener('click', handleUsageButtonClick);
    usageCloseButton?.addEventListener('click', closeUsagePanel); // Close usage panel
    usageConfirmButton?.addEventListener('click', closeUsagePanel); // Confirm button also closes usage panel

    // Save button listener (already set up via inline onclick, but could be done here too)
    // const saveButton = document.getElementById('qr-save-settings');
    // saveButton?.addEventListener('click', saveSettings);

    console.log(`[${Constants.EXTENSION_NAME}] Settings event listeners set up.`);
}

/**
 * Handles file upload for custom icons.
 * @param {Event} event
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Limit file size (e.g., 1MB)
     const maxSize = 1 * 1024 * 1024;
     if (file.size > maxSize) {
         alert('文件太大！请选择小于 1MB 的图片。');
         event.target.value = ''; // Clear the input
         return;
     }

    // Check file type (allow common image types + SVG)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
     if (!allowedTypes.includes(file.type)) {
         alert('不支持的文件类型！请选择 JPG, PNG, GIF, WEBP, 或 SVG 图片。');
         event.target.value = ''; // Clear the input
         return;
     }


    const reader = new FileReader();
    reader.onload = function(e) {
        const customIconUrlInput = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        if (customIconUrlInput) {
            customIconUrlInput.value = e.target.result; // Set input value to base64 data URL

            // Update settings object immediately
            const settings = extension_settings[Constants.EXTENSION_NAME];
            settings.customIconUrl = e.target.result;

            // Trigger icon update
            updateIconDisplay();

            // Trigger change event manually for input to potentially update preview if listening
            customIconUrlInput.dispatchEvent(new Event('input', { bubbles:true }));
        }
    };
    reader.onerror = function(error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error reading file:`, error);
        alert('读取文件失败。');
    };
    reader.readAsDataURL(file);
}

/**
 * Loads settings from the global object and applies them to the settings panel UI elements.
 */
export function loadAndApplySettings() {
    const settings = extension_settings[Constants.EXTENSION_NAME];

    // Ensure defaults for robustness
    settings.enabled = settings.enabled !== false;
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    settings.customIconUrl = settings.customIconUrl || '';
    settings.customIconSize = settings.customIconSize || Constants.DEFAULT_CUSTOM_ICON_SIZE;
    settings.faIconCode = settings.faIconCode || '';
    settings.matchButtonColors = settings.matchButtonColors !== false;
    settings.menuStyles = settings.menuStyles || JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    settings.whitelistedReplies = settings.whitelistedReplies || []; // Ensure whitelist array exists

    // Apply values to settings panel controls
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

    // Set initial visibility of custom/FA input containers
    const customIconContainer = document.querySelector('.custom-icon-container');
    const faIconContainer = document.querySelector('.fa-icon-container');
    if (customIconContainer) customIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.CUSTOM) ? 'flex' : 'none';
    if (faIconContainer) faIconContainer.style.display = (settings.iconType === Constants.ICON_TYPES.FONTAWESOME) ? 'flex' : 'none';

    // Load menu styles into the style panel (ready for when it's opened)
    // Note: This function is defined in events.js but needs to be called here.
    // It might be better to move loadMenuStylesIntoPanel to settings.js or index.js?
    // Let's assume it's accessible or called when the style panel is opened.
    // loadMenuStylesIntoPanel(); // Needs import if moved

    // Setup event listeners for the settings panel controls
    setupSettingsEventListeners();

    // Apply initial icon based on loaded settings
    updateIconDisplay();

    // Apply initial menu styles (CSS vars)
    updateMenuStylesUI();

    // Render initial whitelist buttons in qr--bar
    updateWhitelistedRepliesInBar();

    console.log(`[${Constants.EXTENSION_NAME}] Settings loaded and applied to settings panel.`);
}
