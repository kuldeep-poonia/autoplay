/**
 * Logic for the Extension Popup Menu.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const profileStatus = document.getElementById('profileStatus');
    const defaultState = document.getElementById('defaultState');
    const detectedState = document.getElementById('detectedState');

    // 1. Calculate and show profile completion status
    try {
        const profile = await LocalDataStore.getProfile();
        let filledFields = 0;
        let totalFields = 0;

        for (const [key, value] of Object.entries(profile)) {
            if (typeof value === 'string') {
                totalFields++;
                if (value.trim() !== '') {
                    filledFields++;
                }
            }
        }

        if (totalFields === 0) totalFields = 1;
        const completionPercentage = Math.round((filledFields / totalFields) * 100);

        if (completionPercentage === 0) {
            profileStatus.innerHTML = `Profile is <strong>empty</strong>.<br>Please set it up to start applying.`;
        } else {
            profileStatus.innerHTML = `Profile completion: <strong>${completionPercentage}%</strong>`;
        }
    } catch (error) {
        console.error("Error reading profile data:", error);
        profileStatus.innerHTML = `Error loading profile.`;
    }

    // Setup open links
    const openSetup = () => chrome.tabs.create({ url: chrome.runtime.getURL("profile_setup_form.html") });
    const openHistory = () => chrome.tabs.create({ url: chrome.runtime.getURL("application_history.html") });

    // ── Scrape Jobs handler (NEW) ──────────────────────────────────────────
    // Opens job_panel.html in a new tab — user clicks Scrape there
    const openScrapePanel = () => chrome.tabs.create({ url: chrome.runtime.getURL("job_panel.html") });

    document.getElementById('btnScrape')?.addEventListener('click', openScrapePanel);
    document.getElementById('btnScrapeDet')?.addEventListener('click', openScrapePanel);
    // ──────────────────────────────────────────────────────────────────────

    document.getElementById('btnOpenSetup').addEventListener('click', openSetup);
    document.getElementById('btnOpenSetupDet').addEventListener('click', openSetup);
    document.getElementById('btnOpenHistory').addEventListener('click', openHistory);
    document.getElementById('btnOpenHistoryDet').addEventListener('click', openHistory);

    // 2. Check current tab for URL support
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isSupported = tab && tab.url && /(greenhouse\.io|lever\.co|workday\.com|boards\.ashbyhq\.com|jobs\.ashbyhq\.com|myworkdayjobs\.com|bamboohr\.com|applytojob\.com)/i.test(tab.url);

    const storageResult = await new Promise(resolve => chrome.storage.local.get(['silencedTabs'], resolve));
    const silencedTabs = storageResult.silencedTabs || {};

    if (isSupported && !silencedTabs[tab.id]) {
        defaultState.style.display = 'none';
        detectedState.style.display = 'block';
    }

    // 3. Activation Logic
    const activateAutoFill = async (btn) => {
        btn.innerText = "Activating...";
        btn.disabled = true;

        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['form_field_detector.js', 'gemini_api_client.js']
            });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['form_scanner_injector.js']
            });

            btn.innerText = "Activated!";
            setTimeout(() => window.close(), 1500);
        } catch (error) {
            console.error("Activation failed:", error);
            btn.innerText = "Activation Failed";
            btn.disabled = false;
        }
    };

    document.getElementById('btnActivate').addEventListener('click', function() { activateAutoFill(this); });
    document.getElementById('btnYesHelp').addEventListener('click', function() { activateAutoFill(this); });

    document.getElementById('btnNoHelp').addEventListener('click', async () => {
        silencedTabs[tab.id] = true;
        await new Promise(resolve => chrome.storage.local.set({ silencedTabs }, resolve));
        window.close();
    });
});