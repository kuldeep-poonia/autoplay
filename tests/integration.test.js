/**
 * Integration Tests for AutoApply Phase 1 Data Flow
 */
const assert = require('assert');
const { LocalDataStore, DEFAULTS } = require('../local_data_store.js');

// Mock chrome API
global.chrome = {
    storage: {
        local: {
            _data: {},
            get: function(keys, callback) {
                const key = keys[0];
                callback({ [key]: this._data[key] });
            },
            set: function(items, callback) {
                Object.assign(this._data, items);
                callback();
            }
        }
    },
    runtime: {
        lastError: null
    }
};

async function runIntegrationTests() {
    console.log("Starting integration.test.js...");

    try {
        // Simulate user filling out the profile_setup_form.js
        const formData = {
            name: "Kuldeep Poonia",
            email: "kuldeep@example.com",
            phone: "9876543210",
            city: "Bangalore",
            linkedinUrl: "https://linkedin.com/in/kuldeep",
            totalYears: "5",
            currentRole: "Software Engineer",
            currentCompany: "Tech Corp",
            noticePeriod: "30"
        };

        // Get profile, update fields, save
        let profile = await LocalDataStore.getProfile();
        for (const [key, value] of Object.entries(formData)) {
            profile[key] = value;
        }
        await LocalDataStore.setProfile(profile);
        console.log("✓ Profile saved (Simulating profile_setup_form.js)");

        // Simulate activation_menu.js calculating completion
        const savedProfile = await LocalDataStore.getProfile();
        let filledFields = 0;
        let totalFields = 0;

        for (const [key, value] of Object.entries(savedProfile)) {
            if (typeof value === 'string') {
                totalFields++;
                if (value.trim() !== '') {
                    filledFields++;
                }
            }
        }

        if (totalFields === 0) totalFields = 1;
        const completionPercentage = Math.round((filledFields / totalFields) * 100);

        assert.strictEqual(filledFields, Object.keys(formData).length, "Saved fields should match filled fields");
        assert.ok(completionPercentage > 0, "Completion percentage should be greater than zero");
        console.log(`✓ Menu read profile successfully. Completion: ${completionPercentage}% (Simulating activation_menu.js)`);

        console.log("All integration tests passed successfully.");
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}

runIntegrationTests();
