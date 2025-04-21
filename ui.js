// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
// No longer need extension_settings here directly

// Removed updateButtonIconDisplay and updateIconDisplay from this file. Use settings.js version.

/**
 * Helper function for long press detection, adapted for UI elements.
 * Calls clickCallback on normal click, longPressCallback on long press.
 */
function addInteractionListener(element, clickCallback, longPressCallback, duration = Constants.LONG_PRESS_DURATION) {
    let timer;
    let startX, startY;
    let moved = false;
    let longPressTriggered = false; // Flag to prevent click after long press

    const start = (e) => {
        // Prevent triggering on right-click or middle-click
        if (e.button !== 0 && e.type === 'mousedown') return;

        moved = false;
        longPressTriggered = false;
        // Use pageX/pageY for touch events, clientX/clientY for mouse
        startX = e.type === 'touchstart' ? e.touches[0].pageX : e.clientX;
        startY = e.type === 'touchstart' ? e.touches[0].pageY : e.clientY;

        // Set dataset flag immediately for potential use in click handler
        element.dataset.longPressActive = 'true';

        timer = setTimeout(() => {
            if (!moved) {
                longPressTriggered = true;
                // console.log(`[${Constants.EXTENSION_NAME}] Long press detected!`);
                longPressCallback(e); // Execute the long press action
                // Optionally add haptic feedback if possible/desired
                if (navigator.vibrate) {
                     navigator.vibrate(50); // Vibrate for 50ms
                }
            }
             // Clean up flag after timer regardless of moved status if it fires
             delete element.dataset.longPressActive;
        }, duration);

        // Add move/end listeners specific to this interaction instance
        document.addEventListener('mousemove', move, { passive: true }); // Use document to track moves outside the element
        document.addEventListener('touchmove', move, { passive: true });
        document.addEventListener('mouseup', end, { once: true }); // Use document and once:true
        document.addEventListener('touchend', end, { once: true });
    };

    const move = (e) => {
        if (!timer) return; // Exit if interaction already ended

        const currentX = e.type === 'touchmove' ? e.touches[0].pageX : e.clientX;
        const currentY = e.type === 'touchmove' ? e.touches[0].pageY : e.clientY;
        // Use a slightly larger threshold for movement cancellation
        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);

        if (deltaX > 10 || deltaY > 10) {
            moved = true;
            clearTimeout(timer);
            // console.log(`[${Constants.EXTENSION_NAME}] Long press cancelled due to movement.`);
            delete element.dataset.longPressActive; // Clean up flag
            // Remove global listeners early if moved
            document.removeEventListener('mousemove', move);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('mouseup', end);
            document.removeEventListener('touchend', end);
        }
    };

    const end = (e) => {
        clearTimeout(timer);
        // Remove global listeners
        document.removeEventListener('mousemove', move);
        document.removeEventListener('touchmove', move);
        // document.removeEventListener('mouseup', end); // Already removed by {once: true}
        // document.removeEventListener('touchend', end); // Already removed by {once: true}

        if (!longPressTriggered && !moved) {
            // If timer didn't fire and mouse didn't move significantly, treat as a click
            // console.log(`[${Constants.EXTENSION_NAME}] Normal click detected.`);
            // Check flag again before firing click, although it should be cleared by timer firing
            if (element.dataset.longPressActive !== 'true') {
                 clickCallback(e);
            }
        }
         // Always clean up the flag if it hasn't been cleared yet
         delete element.dataset.longPressActive;
    };

    // Attach starting listeners to the element
    element.addEventListener('mousedown', start);
    element.addEventListener('touchstart', start, { passive: true }); // Passive for performance

    // Return a cleanup function
    return () => {
        element.removeEventListener('mousedown', start);
        element.removeEventListener('touchstart', start);
        // Ensure any lingering global listeners are removed
        clearTimeout(timer);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchend', end);
        delete element.dataset.longPressActive;
    };
}


/**
 * Creates the main quick reply button (legacy, kept for reference).
 * @returns {HTMLElement} The created button element.
 */
export function createMenuButton() {
    // This function is likely unused but kept for potential reference.
    const button = document.createElement('button');
    button.id = Constants.ID_BUTTON; // Legacy ID
    button.type = 'button';
    button.innerText = '[快速回复]';
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', Constants.ID_MENU);
    console.warn(`[${Constants.EXTENSION_NAME}] Legacy function createMenuButton called.`);
    return button;
}

/**
 * Creates the menu element structure.
 * @returns {HTMLElement} The created menu element (initially hidden).
 */
export function createMenuElement() {
    const menu = document.createElement('div');
    menu.id = Constants.ID_MENU;
    menu.className = 'custom-styled-menu'; // Add class for custom styling hooks
    menu.setAttribute('role', Constants.ARIA_ROLE_MENU);
    menu.tabIndex = -1; // Allows focus programmatically but not via tab initially
    menu.style.display = 'none'; // Start hidden

    const container = document.createElement('div');
    container.className = Constants.CLASS_MENU_CONTAINER;

    // Chat quick replies section
    const chatListContainer = document.createElement('div');
    chatListContainer.id = Constants.ID_CHAT_LIST_CONTAINER;
    chatListContainer.className = Constants.CLASS_LIST;
    chatListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);
    chatListContainer.setAttribute('aria-labelledby', `${Constants.ID_CHAT_LIST_CONTAINER}-title`); // ARIA

    const chatTitle = document.createElement('div');
    chatTitle.id = `${Constants.ID_CHAT_LIST_CONTAINER}-title`; // ID for aria-labelledby
    chatTitle.className = Constants.CLASS_LIST_TITLE;
    chatTitle.textContent = '聊天快速回复';

    const chatItems = document.createElement('div');
    chatItems.id = Constants.ID_CHAT_ITEMS; // Container for chat items

    chatListContainer.appendChild(chatTitle);
    chatListContainer.appendChild(chatItems);

    // Global quick replies section
    const globalListContainer = document.createElement('div');
    globalListContainer.id = Constants.ID_GLOBAL_LIST_CONTAINER;
    globalListContainer.className = Constants.CLASS_LIST;
    globalListContainer.setAttribute('role', Constants.ARIA_ROLE_GROUP);
    globalListContainer.setAttribute('aria-labelledby', `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`); // ARIA

    const globalTitle = document.createElement('div');
    globalTitle.id = `${Constants.ID_GLOBAL_LIST_CONTAINER}-title`; // ID for aria-labelledby
    globalTitle.className = Constants.CLASS_LIST_TITLE;
    globalTitle.textContent = '全局快速回复';

    const globalItems = document.createElement('div');
    globalItems.id = Constants.ID_GLOBAL_ITEMS; // Container for global items

    globalListContainer.appendChild(globalTitle);
    globalListContainer.appendChild(globalItems);

    // Append sections to container
    container.appendChild(chatListContainer);
    container.appendChild(globalListContainer);
    menu.appendChild(container);

    return menu;
}

/**
 * Creates a single quick reply item (button) for the plugin menu.
 * Attaches both click and long-press listeners.
 * @param {object} reply - The quick reply data { setName, label, message }
 * @returns {HTMLButtonElement} The button element for the quick reply item.
 */
export function createQuickReplyItem(reply) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = Constants.CLASS_ITEM;
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);
    item.dataset.setName = reply.setName;
    item.dataset.label = reply.label;

    // Check if this item is whitelisted and add a class if it is
    if (window.quickReplyMenu && window.quickReplyMenu.isReplyWhitelisted(reply.setName, reply.label)) {
        item.classList.add(Constants.CLASS_WHITELISTED_ITEM_MENU);
        item.title = `[白名单] ${reply.setName} > ${reply.label}:\n${reply.message}`;
        item.style.borderLeft = '3px solid var(--accent-color, limegreen)'; // Example visual indicator
    } else {
        item.title = `${reply.setName} > ${reply.label}:\n${reply.message}`;
    }

    // Truncate long labels for display
    const maxLabelLength = 30; // Adjust as needed
    item.textContent = reply.label.length > maxLabelLength
                       ? reply.label.substring(0, maxLabelLength) + '...'
                       : reply.label;

    // Add combined interaction listener
    addInteractionListener(
        item,
        // Normal Click Action: Trigger the reply via the globally exposed handler
        (event) => {
            if (window.quickReplyMenu && window.quickReplyMenu.handleQuickReplyClick) {
                 // Pass the original event object
                window.quickReplyMenu.handleQuickReplyClick(event);
            } else {
                console.error(`[${Constants.EXTENSION_NAME}] handleQuickReplyClick not found on window.quickReplyMenu`);
            }
        },
        // Long Press Action: Add to whitelist via the globally exposed handler
        () => {
            if (window.quickReplyMenu && window.quickReplyMenu.addReplyToWhitelist) {
                window.quickReplyMenu.addReplyToWhitelist(reply.setName, reply.label);
                 // Update visual state immediately after successful long press
                 item.classList.add(Constants.CLASS_WHITELISTED_ITEM_MENU);
                 item.title = `[白名单] ${reply.setName} > ${reply.label}:\n${reply.message}`; // Update title
                 item.style.borderLeft = '3px solid var(--accent-color, limegreen)'; // Add indicator
            } else {
                console.error(`[${Constants.EXTENSION_NAME}] addReplyToWhitelist not found on window.quickReplyMenu`);
            }
        }
    );

    return item;
}

/**
 * Renders fetched quick replies into the respective menu containers.
 * @param {Array<object> | null} chatReplies - Chat-specific quick replies, or null if fetch failed/disabled.
 * @param {Array<object> | null} globalReplies - Global quick replies, or null if fetch failed/disabled.
 */
export function renderQuickReplies(chatReplies, globalReplies) {
    const { chatItemsContainer, globalItemsContainer } = sharedState.domElements;
    if (!chatItemsContainer || !globalItemsContainer) {
         console.error(`[${Constants.EXTENSION_NAME}] Menu item containers not found for rendering.`);
         return;
     }

    // Clear previous content safely
    chatItemsContainer.innerHTML = '';
    globalItemsContainer.innerHTML = '';

    // Handle null case (API disabled or fetch error)
     if (chatReplies === null || globalReplies === null) {
         const errorMsg = "无法加载回复列表 (核心API禁用或出错)";
         chatItemsContainer.appendChild(createEmptyPlaceholder(errorMsg));
         globalItemsContainer.appendChild(createEmptyPlaceholder("")); // Keep second column empty
         return;
     }

    // Render chat replies or placeholder
    if (chatReplies.length > 0) {
        chatReplies.forEach(reply => {
            const item = createQuickReplyItem(reply);
            chatItemsContainer.appendChild(item);
        });
    } else {
        chatItemsContainer.appendChild(createEmptyPlaceholder('没有可用的聊天快速回复'));
    }

    // Render global replies or placeholder
    if (globalReplies.length > 0) {
        globalReplies.forEach(reply => {
             const item = createQuickReplyItem(reply);
             globalItemsContainer.appendChild(item);
         });
    } else {
        globalItemsContainer.appendChild(createEmptyPlaceholder('没有可用的全局快速回复'));
    }
}

/**
 * Creates an empty placeholder element (e.g., when a list is empty).
 * @param {string} message - The message to display in the placeholder.
 * @returns {HTMLDivElement} The placeholder div element.
 */
export function createEmptyPlaceholder(message) {
    const empty = document.createElement('div');
    empty.className = Constants.CLASS_EMPTY;
    empty.textContent = message;
    return empty;
}

/**
 * Updates the visibility of the menu UI and related ARIA attributes.
 * Fetches and renders content if the menu is being shown.
 */
export function updateMenuVisibilityUI() {
    const { menu, rocketButton } = sharedState.domElements;
    const show = sharedState.menuVisible;

    if (!menu || !rocketButton) {
         console.error(`[${Constants.EXTENSION_NAME}] Menu or rocket button DOM element not found for visibility update.`);
         return;
     }

    if (show) {
        // Fetch and render content *before* showing
        console.log(`[${Constants.EXTENSION_NAME}] Opening menu, fetching replies...`);
        const replies = fetchQuickReplies(); // From api.js (returns null if disabled/error)

        // Render based on fetched data or null status
        renderQuickReplies(replies?.chat ?? null, replies?.global ?? null); // Pass nulls if replies is null

        // Show the menu and update ARIA/classes
        menu.style.display = 'block';
        rocketButton.setAttribute('aria-expanded', 'true');
        rocketButton.classList.add('active'); // For visual feedback

        // Optional: Focus management
        // menu.focus(); // Focus the menu container itself first

    } else {
        // Hide the menu and update ARIA/classes
        menu.style.display = 'none';
        rocketButton.setAttribute('aria-expanded', 'false');
        rocketButton.classList.remove('active');
    }
}
