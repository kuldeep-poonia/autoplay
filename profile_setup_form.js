/**
 * Logic for the Profile Setup page.
 * Loads existing data from local storage, handles form submission, and saves data.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('profileForm');
    const toast = document.getElementById('toast');

    // Load existing profile and settings
    try {
        const profile = await LocalDataStore.getProfile();
        const settings = await LocalDataStore.getSettings();

        // Populate form fields
        const fields = ['name', 'email', 'phone', 'city', 'linkedinUrl', 'totalYears', 'currentRole', 'currentCompany', 'noticePeriod'];
        fields.forEach(field => {
            const input = document.getElementById(field);
            if (input && profile[field]) {
                input.value = profile[field];
            }
        });

        const apiKeyInput = document.getElementById('geminiApiKey');
        if (apiKeyInput && settings.geminiApiKey) {
            apiKeyInput.value = settings.geminiApiKey;
        }

    } catch (error) {
        console.error("Failed to load profile data:", error);
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('btnSave');
        const originalText = btnSave.innerText;
        btnSave.innerText = 'Saving...';
        btnSave.disabled = true;

        try {
            // Get current profile and settings to preserve fields not in this form
            const profile = await LocalDataStore.getProfile();
            const settings = await LocalDataStore.getSettings();

            // Extract data from form
            const formData = new FormData(form);
            const fields = ['name', 'email', 'phone', 'city', 'linkedinUrl', 'totalYears', 'currentRole', 'currentCompany', 'noticePeriod'];
            
            fields.forEach(field => {
                profile[field] = formData.get(field) || "";
            });

            settings.geminiApiKey = formData.get('geminiApiKey') || "";

            // Save to local storage
            await LocalDataStore.setProfile(profile);
            await LocalDataStore.setSettings(settings);

            // Show success toast
            toast.style.opacity = '1';
            setTimeout(() => {
                toast.style.opacity = '0';
            }, 3000);

        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Error saving profile. Check console for details.");
        } finally {
            btnSave.innerText = originalText;
            btnSave.disabled = false;
        }
    });
});
