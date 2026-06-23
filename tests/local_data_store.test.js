/**
 * Unit Tests for local_data_store.js
 */
const assert = require('assert');
const { LocalDataStore, DEFAULTS } = require('../local_data_store.js');

// Mock chrome API for Node.js environment
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

async function runTests() {
    console.log("Starting local_data_store.test.js...");

    try {
        // Test 1: Fallback to defaults
        const profile = await LocalDataStore.getProfile();
        assert.deepStrictEqual(profile, DEFAULTS.profile, "Should return default profile when storage is empty");
        console.log("✓ Fallback to defaults passed");

        // Test 2: Save and retrieve
        const testProfile = { ...DEFAULTS.profile, name: "John Doe" };
        await LocalDataStore.setProfile(testProfile);
        const retrievedProfile = await LocalDataStore.getProfile();
        assert.strictEqual(retrievedProfile.name, "John Doe", "Should retrieve the saved profile name");
        console.log("✓ Save and retrieve passed");

        // Test 3: Rejects invalid keys
        let errorCaught = false;
        try {
            await LocalDataStore.get('invalidKey');
        } catch (e) {
            errorCaught = true;
        }
        assert.ok(errorCaught, "Should throw error on invalid key");
        console.log("✓ Invalid key rejection passed");

        // Test 4: Rejects null data
        errorCaught = false;
        try {
            await LocalDataStore.set('profile', null);
        } catch (e) {
            errorCaught = true;
        }
        assert.ok(errorCaught, "Should throw error on null data save");
        console.log("✓ Null data rejection passed");

        console.log("All tests passed successfully.");
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}

runTests();
