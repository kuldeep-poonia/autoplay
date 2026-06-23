/**
 * Logic for the Profile Setup page.
 * Loads existing data from local storage, handles form submission, and saves data.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('profileForm');
    const toast = document.getElementById('toast');
    const resumeFileInput = document.getElementById('resumeFile');
    const resumeStatus = document.getElementById('resumeStatus');
    
    // Base64 storage for the uploaded resume
    let resumeBase64 = null;

    const fields = [
        'name', 'email', 'phone', 'city', 'linkedinUrl', 'portfolioUrl',
        'degree', 'college', 'gradYear', 'cgpa',
        'totalYears', 'currentRole', 'currentCompany', 'isOnNoticePeriod', 'noticePeriod',
        'primarySkills', 'secondarySkills', 'coverLetter', 'nationality',
        'workMode', 'prefLocations', 'expectedCTC',
        'ansJobChange', 'ansAchievement', 'ansGoals', 'ansStrengths'
    ];

    // Load existing profile and settings
    try {
        const profile = await LocalDataStore.getProfile();
        const settings = await LocalDataStore.getSettings();

        // Populate form fields
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

        // Check if resume exists
        if (profile.resumeData) {
            resumeBase64 = profile.resumeData;
            resumeStatus.innerText = "Resume already saved. Upload a new one to replace it.";
        }

    } catch (error) {
        console.error("Failed to load profile data:", error);
    }

    // Handle File Upload reading
    resumeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            resumeStatus.style.color = "red";
            resumeStatus.innerText = "Please upload a valid PDF file.";
            resumeFileInput.value = "";
            return;
        }

        resumeStatus.style.color = "#EAB308";
        resumeStatus.innerText = "Reading file...";
        
        const reader = new FileReader();
        reader.onload = (event) => {
            resumeBase64 = event.target.result;
            resumeStatus.style.color = "#10B981";
            resumeStatus.innerText = "Resume loaded securely! It will be saved when you click Save Profile.";
        };
        reader.onerror = () => {
            resumeStatus.style.color = "red";
            resumeStatus.innerText = "Failed to read file.";
        };
        reader.readAsDataURL(file);
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSave = document.getElementById('btnSave');
        const originalText = btnSave.innerText;
        btnSave.innerText = 'Saving...';
        btnSave.disabled = true;

        try {
            const profile = await LocalDataStore.getProfile();
            const settings = await LocalDataStore.getSettings();

            const formData = new FormData(form);
            
            fields.forEach(field => {
                profile[field] = formData.get(field) || "";
            });

            if (resumeBase64) {
                profile.resumeData = resumeBase64;
            }

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
