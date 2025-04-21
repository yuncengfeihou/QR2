// api.js
import * as Constants from './constants.js';
// Assuming state.js is no longer needed directly here, setMenuVisible removed from imports

/**
 * Fetches chat and global quick replies from the quickReplyApi.
 * Checks if the main Quick Reply v2 extension is enabled before fetching.
 * Note: Still relies on accessing internal settings structure.
 * @returns {{ chat: Array<object>, global: Array<object> } | null} Returns null if API not found or disabled.
 */
export function fetchQuickReplies() {
    const chatReplies = [];
    const globalReplies = [];
    const chatQrLabels = new Set(); // To track labels and avoid duplicates in global

    if (!window.quickReplyApi) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API (window.quickReplyApi) not found! Cannot fetch replies.`);
        return null; // Indicate failure clearly
    }

    const qrApi = window.quickReplyApi;

    // Check if Quick Reply v2 extension itself is enabled
    // Also check if settings object exists
    // Assume enabled if isEnabled=true or undefined, only disabled if explicitly false
    if (!qrApi.settings || qrApi.settings.isEnabled === false) {
        console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Skipping reply fetch.`);
        return null; // Indicate disabled state
    }

    try {
        // Fetch Chat Quick Replies (Accessing internal settings)
        if (qrApi.settings?.chatConfig?.setList) {
            qrApi.settings.chatConfig.setList.forEach(setLink => {
                if (setLink?.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        if (qr && !qr.isHidden && qr.label) {
                            chatReplies.push({
                                setName: setLink.set.name || 'Unknown Set',
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                            chatQrLabels.add(qr.label);
                        }
                    });
                }
            });
        } else {
             console.warn(`[${Constants.EXTENSION_NAME}] Could not find chatConfig.setList in quickReplyApi settings.`);
        }

        // Fetch Global Quick Replies (Accessing internal settings)
        if (qrApi.settings?.config?.setList) {
            qrApi.settings.config.setList.forEach(setLink => {
                if (setLink?.isVisible && setLink.set?.qrList) {
                    setLink.set.qrList.forEach(qr => {
                        // Only add if not hidden and label doesn't exist in chat replies
                        if (qr && !qr.isHidden && qr.label && !chatQrLabels.has(qr.label)) {
                            globalReplies.push({
                                setName: setLink.set.name || 'Unknown Set',
                                label: qr.label,
                                message: qr.message || '(无消息内容)'
                            });
                        }
                    });
                }
            });
        } else {
             console.warn(`[${Constants.EXTENSION_NAME}] Could not find config.setList in quickReplyApi settings.`);
        }

        console.log(`[${Constants.EXTENSION_NAME}] Fetched Replies - Chat: ${chatReplies.length}, Global: ${globalReplies.length}`);

    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Error fetching quick replies:`, error);
        // Return null on error to prevent issues down the line
        return null;
    }

    return { chat: chatReplies, global: globalReplies };
}


/**
 * Triggers a specific quick reply using the API.
 * Checks if the core Quick Reply v2 is enabled before triggering.
 * @param {string} setName
 * @param {string} label
 * @returns {Promise<boolean>} True if execution was attempted, false otherwise.
 */
export async function triggerQuickReply(setName, label) {
    if (!window.quickReplyApi || !window.quickReplyApi.executeQuickReply) {
        console.error(`[${Constants.EXTENSION_NAME}] Quick Reply API or executeQuickReply function not found! Cannot trigger reply.`);
        // Caller should handle UI state (e.g., closing the menu)
        return false; // Indicate failure or inability to proceed
    }

    // Check if the core Quick Reply v2 is enabled before triggering
    if (!window.quickReplyApi.settings || window.quickReplyApi.settings.isEnabled === false) {
         console.log(`[${Constants.EXTENSION_NAME}] Core Quick Reply v2 is disabled. Cannot trigger reply.`);
         // Caller should handle UI state
         return false; // Indicate inability to proceed
    }

    console.log(`[${Constants.EXTENSION_NAME}] Triggering Quick Reply via API: "${setName}.${label}"`);
    try {
        // Use the correct API call method: executeQuickReply
        await window.quickReplyApi.executeQuickReply(setName, label);
        console.log(`[${Constants.EXTENSION_NAME}] Quick Reply "${setName}.${label}" executed successfully via API.`);
        return true; // Indicate successful attempt
    } catch (error) {
        console.error(`[${Constants.EXTENSION_NAME}] Failed to execute Quick Reply "${setName}.${label}" via API:`, error);
        // Let the caller handle UI, even on error
        alert(`触发快速回复 "${label}" 失败。\n错误: ${error.message}`); // Provide feedback
        return true; // Indicate attempt was made, even if it failed
    }
    // No need to set menu visibility here; let the caller manage the UI state.
}
