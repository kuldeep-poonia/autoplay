/**
 * Logic for the Extension Popup Menu.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const btnOpenSetup = document.getElementById('btnOpenSetup');
    const btnActivate = document.getElementById('btnActivate');
    const profileStatus = document.getElementById('profileStatus');

    // 1. Calculate and show profile completion status
    try {
        const profile = await LocalDataStore.getProfile();
        let filledFields = 0;
        let totalFields = 0;

        // Simple count of top-level string fields
        for (const [key, value] of Object.entries(profile)) {
            if (typeof value === 'string') {
                totalFields++;
                if (value.trim() !== '') {
                    filledFields++;
                }
            }
        }

        if (totalFields === 0) totalFields = 1; // Prevent division by zero
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

    // 2. Open Profile Setup page in a new full tab
    btnOpenSetup.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("profile_setup_form.html") });
    });

    const btnOpenHistory = document.getElementById('btnOpenHistory');
    if (btnOpenHistory) {
        btnOpenHistory.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL("application_history.html") });
        });
    }

    // 3. Activate auto-fill on current tab (Phase 2 placeholder)
    btnActivate.addEventListener('click', async () => {
        btnActivate.innerText = "Activating...";
        btnActivate.disabled = true;

        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error("No active tab found.");
            }

            // In Phase 2, this will inject the content script.
            // For now, we just simulate activation.
            console.log(`Activation triggered for tab: ${tab.url}`);
            
            // Inject dependencies first, then the scanner
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['form_field_detector.js', 'gemini_api_client.js']
            });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['form_scanner_injector.js']
            });

            btnActivate.innerText = "Activated!";
            setTimeout(() => window.close(), 1500);

        } catch (error) {
            console.error("Activation failed:", error);
            btnActivate.innerText = "Activation Failed";
            btnActivate.disabled = false;
        }
    });
});
