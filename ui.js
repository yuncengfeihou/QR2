// ui.js
import * as Constants from './constants.js';
import { fetchQuickReplies } from './api.js';
import { sharedState } from './state.js';
import { extension_settings } from './index.js'; // 导入设置以检查白名单

// Removed updateButtonIconDisplay and updateIconDisplay from this file. Use settings.js version.

/**
 * Creates the main quick reply button (legacy, kept for reference).
 */
// ... (createMenuButton function remains unchanged) ...

/**
 * Creates the menu element structure.
 */
// ... (createMenuElement function remains unchanged) ...

/**
 * Creates a single quick reply item (button).
 * Adds long-press listener for adding to whitelist.
 * @param {object} reply - The quick reply data { setName, label, message }
 * @param {boolean} isWhitelisted - Whether this item is currently in the whitelist
 * @returns {HTMLButtonElement} The button element for the quick reply item.
 */
export function createQuickReplyItem(reply, isWhitelisted) {
    const item = document.createElement('button');
    item.type = 'button'; // Explicitly set type
    item.className = Constants.CLASS_ITEM;
    if (isWhitelisted) {
        item.classList.add(Constants.CLASS_WHITELISTED_ITEM); // Add class if whitelisted
        item.title = `(已在白名单中) ${reply.setName} > ${reply.label}\n${reply.message.slice(0, 50)}${reply.message.length > 50 ? '...' : ''}`;
    } else {
        item.title = `(长按加入白名单) ${reply.setName} > ${reply.label}\n${reply.message.slice(0, 50)}${reply.message.length > 50 ? '...' : ''}`;
    }
    item.setAttribute('role', Constants.ARIA_ROLE_MENUITEM);
    item.dataset.setName = reply.setName;
    item.dataset.label = reply.label;
    item.textContent = reply.label;

    // --- Long Press Logic for Whitelisting ---
    let pressTimer = null;
    let isLongPress = false;
    let startX, startY;

    const handleMouseDown = (e) => {
        // Only react to left clicks or touch start
        if (e.button !== 0 && e.type !== 'touchstart') return;
         isLongPress = false;
         const touch = e.touches ? e.touches[0] : e;
         startX = touch.clientX;
         startY = touch.clientY;

         clearTimeout(pressTimer); // Clear any previous timer
         pressTimer = window.setTimeout(() => {
             isLongPress = true;
             // Execute long press action
             console.log(`Long press detected on: ${reply.setName}.${reply.label}`);
             // Add to whitelist using the global function
             if (window.quickReplyMenu && window.quickReplyMenu.addToWhitelist) {
                 const added = window.quickReplyMenu.addToWhitelist(reply.setName, reply.label);
                 if (added) {
                     // Visual feedback: flash background
                     item.style.transition = 'background-color 0.1s ease-in-out';
                     item.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'; // Green flash
                     setTimeout(() => {
                         item.style.backgroundColor = ''; // Revert to original background
                         item.classList.add(Constants.CLASS_WHITELISTED_ITEM); // Mark as whitelisted immediately
                         item.title = `(已在白名单中) ${reply.setName} > ${reply.label}...`; // Update title
                     }, 200);
                     showTemporaryMessage(item, '已加入白名单');
                 } else {
                     // Already exists or failed
                     showTemporaryMessage(item, '已在白名单中', '#ffcc00'); // Yellow info
                 }
             }
         }, Constants.LONG_PRESS_DURATION); // Use constant for duration
    };

    const handleMouseUpOrLeave = (e) => {
        clearTimeout(pressTimer);
        if (!isLongPress && e.type !== 'mouseleave' && e.type !== 'touchcancel' && e.type !== 'touchmove') {
            // If it wasn't a long press and not a leave/cancel event, trigger the normal click
             if (window.quickReplyMenu && window.quickReplyMenu.handleQuickReplyClick) {
                 // Create a synthetic event if needed or just pass necessary data
                 // Pass the original event if possible, but ensure it's treated as a click
                 // Directly call handleQuickReplyClick which expects the event target to have datasets
                 window.quickReplyMenu.handleQuickReplyClick({ currentTarget: item });
             } else {
                  console.error(`[${Constants.EXTENSION_NAME}] handleQuickReplyClick not found on window.quickReplyMenu`);
             }
        }
         // Reset long press flag after handling
         // isLongPress = false; // Resetting here might interfere with contextmenu prevention
    };

     const handleMove = (e) => {
         const touch = e.touches ? e.touches[0] : e;
         const deltaX = Math.abs(touch.clientX - startX);
         const deltaY = Math.abs(touch.clientY - startY);
         // If moved significantly, cancel the long press timer
         if (deltaX > 10 || deltaY > 10) {
             clearTimeout(pressTimer);
         }
     };

     // Prevent context menu after a successful long press
     item.addEventListener('contextmenu', (e) => {
         if (isLongPress) {
             e.preventDefault();
             isLongPress = false; // Reset flag after preventing menu
         }
     });


    // Attach listeners
    item.addEventListener('mousedown', handleMouseDown);
    item.addEventListener('mouseup', handleMouseUpOrLeave);
    item.addEventListener('mouseleave', handleMouseUpOrLeave);
    item.addEventListener('mousemove', handleMove); // Cancel if mouse moves significantly

    item.addEventListener('touchstart', handleMouseDown, { passive: true }); // Use passive for touchstart
    item.addEventListener('touchend', handleMouseUpOrLeave);
    item.addEventListener('touchcancel', handleMouseUpOrLeave);
    item.addEventListener('touchmove', handleMove, { passive: true }); // Use passive for touchmove

    return item;
}

/**
 * Renders fetched quick replies into the respective menu containers.
 * Attaches click and long-press listeners.
 * @param {Array<object>} chatReplies - Chat-specific quick replies
 * @param {Array<object>} globalReplies - Global quick replies
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

    const settings = extension_settings[Constants.EXTENSION_NAME];
    const whitelistedSet = new Set(
        (settings.whitelistedReplies || []).map(item => `${item.setName}::${item.label}`)
    );

    // Helper function to create and append item
    const addItem = (container, reply) => {
        const isWhitelisted = whitelistedSet.has(`${reply.setName}::${reply.label}`);
        const item = createQuickReplyItem(reply, isWhitelisted); // Pass whitelist status
        // Click/long-press listeners are now added within createQuickReplyItem
        container.appendChild(item);
    };

    // Render chat replies or placeholder
    if (chatReplies && chatReplies.length > 0) {
        chatReplies.forEach(reply => addItem(chatItemsContainer, reply));
    } else {
        chatItemsContainer.appendChild(createEmptyPlaceholder('没有可用的聊天快速回复'));
    }

    // Render global replies or placeholder
    if (globalReplies && globalReplies.length > 0) {
        globalReplies.forEach(reply => addItem(globalItemsContainer, reply));
    } else {
        globalItemsContainer.appendChild(createEmptyPlaceholder('没有可用的全局快速回复'));
    }
}

/**
 * Creates an empty placeholder element (e.g., when a list is empty).
 */
// ... (createEmptyPlaceholder function remains unchanged) ...

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
        // Update content *before* showing
        console.log(`[${Constants.EXTENSION_NAME}] Opening menu, fetching replies...`);
        try {
            const { chat, global } = fetchQuickReplies();
             if (chat === undefined || global === undefined) {
                 throw new Error("fetchQuickReplies did not return expected structure.");
             }
            renderQuickReplies(chat, global); // Will now handle long press listeners
        } catch (error) {
             console.error(`[${Constants.EXTENSION_NAME}] Error fetching or rendering replies:`, error);
             const errorMsg = "加载回复列表失败";
             if (sharedState.domElements.chatItemsContainer) {
                 sharedState.domElements.chatItemsContainer.innerHTML = '';
                 sharedState.domElements.chatItemsContainer.appendChild(createEmptyPlaceholder(errorMsg));
             }
              if (sharedState.domElements.globalItemsContainer) {
                  sharedState.domElements.globalItemsContainer.innerHTML = '';
                  sharedState.domElements.globalItemsContainer.appendChild(createEmptyPlaceholder(errorMsg));
              }
        }

        // Show the menu and update ARIA/classes
        menu.style.display = 'block';
        rocketButton.setAttribute('aria-expanded', 'true');
        rocketButton.classList.add('active');

    } else {
        // Hide the menu and update ARIA/classes
        menu.style.display = 'none';
        rocketButton.setAttribute('aria-expanded', 'false');
        rocketButton.classList.remove('active');
    }
}

/**
 * 辅助函数：在指定元素附近显示临时消息 (同 settings.js)
 */
function showTemporaryMessage(referenceElement, text, color = '#4caf50', duration = 1500) {
    if (!referenceElement) return;
    const messageDiv = document.createElement('div');
    messageDiv.textContent = text;
    Object.assign(messageDiv.style, {
        position: 'fixed', // Use fixed to position relative to viewport
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: color,
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: '1005',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out, top 0.3s ease-in-out', // Add transition for top
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
    });

    document.body.appendChild(messageDiv);

    const rect = referenceElement.getBoundingClientRect();
     // Position above the center of the element initially slightly lower
    messageDiv.style.left = `${rect.left + rect.width / 2 - messageDiv.offsetWidth / 2}px`;
    messageDiv.style.top = `${rect.top - messageDiv.offsetHeight}px`; // Start slightly lower

    // Fade in and move up
    requestAnimationFrame(() => {
         messageDiv.style.opacity = '1';
         messageDiv.style.top = `${rect.top - messageDiv.offsetHeight - 5}px`; // Move up
    });

    // Fade out and remove
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, duration);
}
