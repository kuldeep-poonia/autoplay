/**
 * Unit Tests for gemini_api_client.js
 */
const assert = require('assert');
const { GeminiApiClient } = require('../gemini_api_client.js');

// Mock global fetch
global.fetch = async function(url, options) {
    const payload = JSON.parse(options.body);
    const text = payload.contents[0].parts[0].text;
    
    // Simulate successful API call
    if (url.includes("key=VALID_KEY")) {
        return {
            ok: true,
            json: async () => ({
                candidates: [{
                    content: { parts: [{ text: "This is a mocked professional response." }] }
                }]
            })
        };
    }
    
    // Simulate API Error
    return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "API key not valid." } })
    };
};

async function runTests() {
    console.log("Starting gemini_api_client.test.js...");
    try {
        const mockProfile = { name: "Test User", totalYears: "3", currentRole: "Dev" };
        
        // Test 1: Missing API Key
        let errorCaught = false;
        try {
            await GeminiApiClient.generateAnswer("Why join us?", mockProfile, "");
        } catch (e) {
            errorCaught = true;
        }
        assert.ok(errorCaught, "Should reject empty API key");
        console.log("✓ Empty API Key rejection passed");

        // Test 2: Successful generation
        const answer = await GeminiApiClient.generateAnswer("Why join us?", mockProfile, "VALID_KEY");
        assert.strictEqual(answer, "This is a mocked professional response.");
        console.log("✓ Successful API generation passed");

        // Test 3: API Error Handling
        errorCaught = false;
        try {
            await GeminiApiClient.generateAnswer("Why join us?", mockProfile, "INVALID_KEY");
        } catch (e) {
            errorCaught = true;
        }
        assert.ok(errorCaught, "Should handle HTTP errors gracefully");
        console.log("✓ HTTP Error handling passed");

        console.log("All gemini_api_client tests passed successfully.");
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}
runTests();
