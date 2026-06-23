/**
 * AutoApply — Background URL Monitor
 * Service Worker: badge logic + message routing for job scraper + autofill
 */

// ── Domains that trigger the AUTOFILL blue dot (existing behaviour) ────────
const SUPPORTED_DOMAINS = [
    /greenhouse\.io/i,
    /lever\.co/i,
    /workday\.com/i,
    /boards\.ashbyhq\.com/i,
    /jobs\.ashbyhq\.com/i,
    /linkedin\.com\/jobs/i,
];

// ── Domains that trigger the SCRAPER orange dot (new) ─────────────────────
const JOB_SITE_DOMAINS = [
    /linkedin\.com/i,
    /naukri\.com/i,
    /wellfound\.com/i,
    /internshala\.com/i,
    /shine\.com/i,
    /foundit\.in/i,
    /indeed\.com/i,
    /monster\.com/i,
    /greenhouse\.io/i,
    /lever\.co/i,
    /workday\.com/i,
    /icims\.com/i,
    /instahyre\.com/i,
    /cutshort\.io/i,
    /hirist\.tech/i,
];

// ── On install: open profile setup ────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.tabs.create({
            url: chrome.runtime.getURL('profile_setup_form.html'),
        });
    }
});

// ── URL helpers ────────────────────────────────────────────────────────────
function isSupportedUrl(url) {
    if (!url) return false;
    return SUPPORTED_DOMAINS.some((rx) => rx.test(url));
}

function isJobSiteUrl(url) {
    if (!url) return false;
    return JOB_SITE_DOMAINS.some((rx) => rx.test(url));
}

// ── Badge on tab update ────────────────────────────────────────────────────
// Blue dot  → autofill supported (existing)
// Orange dot → job listing page, scraper available (new)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;

    if (isSupportedUrl(tab.url)) {
        // Blue dot — autofill ready
        chrome.action.setBadgeText({ text: '•', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#3B82F6', tabId });
    } else if (isJobSiteUrl(tab.url)) {
        // Orange dot — scraper available
        chrome.action.setBadgeText({ text: '•', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B', tabId });
    } else {
        chrome.action.setBadgeText({ text: '', tabId });
    }
});

// ── Message handler ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // ── 1. job_scraper.js scraped jobs → forward to job_panel ───────────
    if (msg.type === 'JOBS_SCRAPED') {
        chrome.runtime.sendMessage({
            type: 'JOBS_SCRAPED_FORWARD',
            jobs: msg.jobs,
            site: sender.tab?.url || '',
            count: msg.count || msg.jobs.length,
        });
        // No sendResponse needed — fire and forget
        return false;
    }

    // ── 2. job_panel asks background to inject scraper into active tab ───
    if (msg.type === 'INJECT_SCRAPER') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab) {
                chrome.runtime.sendMessage({
                    type: 'SCRAPER_ERROR',
                    error: 'No active tab found.',
                });
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['job_scraper.js'],
            }).catch((err) => {
                chrome.runtime.sendMessage({
                    type: 'SCRAPER_ERROR',
                    error: err.message,
                });
            });
        });
        return false;
    }

    // ── 3. job_panel opened a job tab → inject autofill when tab loads ───
    if (msg.type === 'TRIGGER_AUTOFILL') {
        const targetTabId = msg.tabId;
        if (!targetTabId) return false;

        // Tab may still be loading — wait for complete
        function onUpdated(tabId, changeInfo) {
            if (tabId !== targetTabId || changeInfo.status !== 'complete') return;
            chrome.tabs.onUpdated.removeListener(onUpdated);

            chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                files: ['form_scanner_injector.js'],
            }).catch((err) => {
                console.warn('[AutoApply] Autofill inject failed:', err.message);
            });
        }

        chrome.tabs.onUpdated.addListener(onUpdated);

        // Safety: remove listener after 30 s if tab never finishes loading
        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(onUpdated);
        }, 30_000);

        return false;
    }

    // ── 4. activation_menu.js asks for current tab URL info ──────────────
    if (msg.type === 'GET_TAB_INFO') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            sendResponse({
                url: tab?.url || '',
                isAutofillSite: isSupportedUrl(tab?.url),
                isJobSite: isJobSiteUrl(tab?.url),
                tabId: tab?.id,
            });
        });
        return true; // keep channel open for async sendResponse
    }

});