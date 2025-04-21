// constants.js

export const EXTENSION_NAME = "quick-reply-menu";

export const CLASS_ENABLED = 'qr-menu-enabled';
export const CLASS_DISABLED = 'qr-menu-disabled';

// --- DOM Element IDs ---
export const ID_BUTTON = 'quick-reply-menu-button'; // 保留用于向后兼容
export const ID_ROCKET_BUTTON = 'quick-reply-rocket-button'; // 新的火箭按钮ID
export const ID_MENU = 'quick-reply-menu';
export const ID_CHAT_LIST_CONTAINER = 'chat-quick-replies';
export const ID_GLOBAL_LIST_CONTAINER = 'global-quick-replies';
export const ID_CHAT_ITEMS = 'chat-qr-items';
export const ID_GLOBAL_ITEMS = 'global-qr-items';
export const ID_SETTINGS_CONTAINER = `${EXTENSION_NAME}-settings`; // Container for the entire extension's settings UI
export const ID_SETTINGS_ENABLED_DROPDOWN = `${EXTENSION_NAME}-enabled`;
export const ID_ICON_TYPE_DROPDOWN = `${EXTENSION_NAME}-icon-type`;
export const ID_CUSTOM_ICON_URL = `${EXTENSION_NAME}-custom-icon-url`;
export const ID_CUSTOM_ICON_SIZE_INPUT = `${EXTENSION_NAME}-custom-icon-size`;
export const ID_FA_ICON_CODE_INPUT = `${EXTENSION_NAME}-fa-icon-code`;
export const ID_COLOR_MATCH_CHECKBOX = `${EXTENSION_NAME}-color-match`;

// --- 菜单样式相关常量 ---
export const ID_MENU_STYLE_BUTTON = `${EXTENSION_NAME}-menu-style-button`;
export const ID_MENU_STYLE_PANEL = `${EXTENSION_NAME}-menu-style-panel`; // Panel itself
export const ID_RESET_STYLE_BUTTON = `${EXTENSION_NAME}-reset-style`;
// Note: IDs for individual style controls (like qr-item-bgcolor-picker) are kept hardcoded in settings.js for now

// --- 使用说明相关常量 ---
export const ID_USAGE_BUTTON = `${EXTENSION_NAME}-usage-button`;
export const ID_USAGE_PANEL = `${EXTENSION_NAME}-usage-panel`; // Panel itself

// --- 白名单相关常量 (New) ---
export const ID_WHITELIST_BUTTON = `${EXTENSION_NAME}-whitelist-button`; // Button to open the panel
export const ID_WHITELIST_PANEL = `${EXTENSION_NAME}-whitelist-panel`; // Panel itself
export const ID_WHITELIST_ITEMS_CONTAINER = `${EXTENSION_NAME}-whitelist-items-container`; // Container for items inside the panel
export const ID_QR_BAR_WHITELIST_CONTAINER = `${EXTENSION_NAME}-qr-bar-whitelist-container`; // Container in #qr--bar for whitelisted buttons

// --- CSS Classes ---
export const CLASS_MENU_CONTAINER = 'quick-reply-menu-container';
export const CLASS_LIST = 'quick-reply-list';
export const CLASS_LIST_TITLE = 'quick-reply-list-title';
export const CLASS_ITEM = 'quick-reply-item';
export const CLASS_EMPTY = 'quick-reply-empty';
export const CLASS_ICON_PREVIEW = 'quick-reply-icon-preview'; // In settings panel for preview
export const CLASS_SETTINGS_ROW = 'quick-reply-settings-row'; // General settings row class
export const CLASS_WHITELISTED_ITEM_MENU = 'whitelisted-in-menu'; // Class for whitelisted items shown in the plugin menu

// --- ARIA ---
export const ARIA_ROLE_MENU = 'menu';
export const ARIA_ROLE_GROUP = 'group';
export const ARIA_ROLE_MENUITEM = 'menuitem'; // For items in the plugin menu

// --- 默认图标选项 ---
export const ICON_TYPES = {
    ROCKET: 'rocket',
    COMMENT: 'comment',
    SPARKLES: 'sparkles', // Added sparkles
    STAR: 'star',         // Represents star-and-crescent
    BOLT: 'bolt',         // Represents star-of-david (adjust if needed)
    FONTAWESOME: 'fontawesome',
    CUSTOM: 'custom'
};

// --- 图标类型到FontAwesome类名的映射 ---
export const ICON_CLASS_MAP = {
    [ICON_TYPES.ROCKET]: 'fa-rocket',
    [ICON_TYPES.COMMENT]: 'fa-palette', // Changed from 'comment' to 'palette'
    [ICON_TYPES.SPARKLES]: 'fa-sparkles', // Added
    [ICON_TYPES.STAR]: 'fa-star-and-crescent', // Added
    [ICON_TYPES.BOLT]: 'fa-star-of-david', // Added
    [ICON_TYPES.CUSTOM]: '',
    [ICON_TYPES.FONTAWESOME]: ''
};

// --- 默认菜单样式值 ---
export const DEFAULT_MENU_STYLES = {
    itemBgColor: 'rgba(60, 60, 60, 0.7)',
    itemTextColor: '#ffffff',
    titleColor: '#cccccc',
    titleBorderColor: '#444444',
    emptyTextColor: '#666666',
    menuBgColor: 'rgba(0, 0, 0, 0.85)',
    menuBorderColor: '#555555'
};

// --- 默认图标大小 ---
export const DEFAULT_CUSTOM_ICON_SIZE = 20;

// --- 长按持续时间 (毫秒) ---
export const LONG_PRESS_DURATION = 500; // Half a second for long press detection
