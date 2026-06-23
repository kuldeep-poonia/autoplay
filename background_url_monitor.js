/**
 * AutoApply Background URL Monitor
 * Service Worker script running in the background.
 */

const SUPPORTED_DOMAINS = [
    /greenhouse\.io/i,
    /lever\.co/i,
    /workday\.com/i,
    /boards\.ashbyhq\.com/i,
    /jobs\.ashbyhq\.com/i,
    /linkedin\.com\/jobs/i
];

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({ url: chrome.runtime.getURL("profile_setup_form.html") });
    }
});

function isSupportedUrl(url) {
    if (!url) return false;
    return SUPPORTED_DOMAINS.some(regex => regex.test(url));
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (isSupportedUrl(tab.url)) {
            chrome.action.setBadgeText({ tabId: tabId, text: "READY" });
            chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10B981" });
        } else {
            chrome.action.setBadgeText({ tabId: tabId, text: "" });
        }
    }
});
