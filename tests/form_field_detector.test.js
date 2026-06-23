/**
 * Unit Tests for form_field_detector.js
 */
const assert = require('assert');
const { FormFieldDetector } = require('../form_field_detector.js');

// Minimal DOM Mocking
global.document = {
    querySelector: function(selector) { return null; },
    getElementById: function(id) { return null; }
};

class MockElement {
    constructor(props) {
        this.tagName = props.tagName || 'INPUT';
        this.id = props.id || '';
        this.name = props.name || '';
        this.type = props.type || 'text';
        this.placeholder = props.placeholder || '';
        this.attributes = props.attributes || {};
        this._closest = props._closest || null;
    }
    getAttribute(attr) { return this.attributes[attr] || null; }
    closest(selector) { return this._closest; }
}

function runTests() {
    console.log("Starting form_field_detector.test.js...");
    try {
        // Test 1: Identify Email by type
        const emailInput = new MockElement({ type: 'email', name: 'user_email' });
        const res1 = FormFieldDetector.identifyField(emailInput);
        assert.strictEqual(res1.profileKey, 'email');
        assert.ok(res1.confidence >= 50, "High confidence for type='email'");
        console.log("✓ Email field identified");

        // Test 2: Identify Phone by placeholder
        const phoneInput = new MockElement({ placeholder: 'Enter your mobile number' });
        const res2 = FormFieldDetector.identifyField(phoneInput);
        assert.strictEqual(res2.profileKey, 'phone');
        assert.ok(res2.confidence >= 30, "Confidence sufficient for placeholder match");
        console.log("✓ Phone field identified by placeholder");

        // Test 3: Unknown field
        const randomInput = new MockElement({ name: 'favorite_color', placeholder: 'Color' });
        const res3 = FormFieldDetector.identifyField(randomInput);
        assert.strictEqual(res3.profileKey, null, "Should return null for unknown fields");
        console.log("✓ Unknown field correctly ignored");

        console.log("All form_field_detector tests passed successfully.");
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}
runTests();
