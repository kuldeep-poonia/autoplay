/**
 * AutoApply Form Field Detector
 * 
 * Analyzes DOM elements (inputs, selects, textareas) and uses heuristic scoring
 * to map them to predefined user profile keys.
 */

class FormFieldDetector {
    /**
     * Define the dictionary of keywords for each profile key.
     * Weights are not explicitly needed if we just do simple boolean/regex matching,
     * but we'll use a scoring system based on where the match is found.
     */
    static PATTERNS = {
        name: /(full.?name|first.?name|name|fname|lname|last.?name)/i,
        email: /(email|e-mail|mail)/i,
        phone: /(phone|mobile|tel|contact.?number|cell)/i,
        city: /(city|location|town|address)/i,
        linkedinUrl: /(linkedin|linked.?in)/i,
        portfolioUrl: /(portfolio|website|github|personal.?site)/i,
        degree: /(degree|qualification|highest.?education)/i,
        college: /(college|university|institute|school)/i,
        gradYear: /(graduation.?year|passing.?year|year.?of.?passing)/i,
        cgpa: /(cgpa|gpa|percentage|grade|marks)/i,
        totalYears: /(experience|years|total.?exp)/i,
        currentRole: /(current.?role|job.?title|designation)/i,
        currentCompany: /(current.?company|employer|organization)/i,
        isOnNoticePeriod: /(serving.?notice|currently.?on.?notice)/i,
        noticePeriod: /(notice.?period|availability)/i,
        primarySkills: /(skills|primary.?skills|core.?skills|technologies)/i,
        coverLetter: /(cover.?letter|message.?to.?hiring.?manager)/i,
        nationality: /(nationality|citizenship)/i,
        secondarySkills: /(secondary.?skills|certifications|other.?skills)/i,
        workMode: /(work.?mode|remote|hybrid|onsite|on.?site)/i,
        prefLocations: /(preferred.?location|willing.?to.?relocate)/i,
        expectedCTC: /(expected.?ctc|expected.?salary|compensation)/i
    };

    /**
     * Main method to identify a field.
     * @param {HTMLElement} element - The input element to analyze.
     * @returns {{ profileKey: string | null, confidence: number }}
     */
    static identifyField(element) {
        if (!element || !element.tagName) {
            return { profileKey: null, confidence: 0 };
        }

        // 1. Gather signals
        const signals = {
            id: element.id || '',
            name: element.name || '',
            placeholder: element.placeholder || '',
            type: element.type || '',
            ariaLabel: element.getAttribute('aria-label') || '',
            labelText: this._getAssociatedLabelText(element)
        };

        // 2. Score against patterns
        let bestMatch = null;
        let highestScore = 0;

        for (const [key, regex] of Object.entries(this.PATTERNS)) {
            let score = 0;
            
            // Exact match in type (very high confidence)
            if (signals.type === key) score += 50; 
            if (signals.type === 'tel' && key === 'phone') score += 50;
            if (signals.type === 'email' && key === 'email') score += 50;

            // Regex matches
            if (regex.test(signals.labelText)) score += 40;
            if (regex.test(signals.placeholder)) score += 30;
            if (regex.test(signals.ariaLabel)) score += 30;
            if (regex.test(signals.name)) score += 20;
            if (regex.test(signals.id)) score += 10;

            if (score > highestScore) {
                highestScore = score;
                bestMatch = key;
            }
        }

        // 3. Determine if confidence is sufficient
        // A score of >= 30 means at least a placeholder or aria-label matched.
        if (highestScore >= 30) {
            return { profileKey: bestMatch, confidence: highestScore };
        }

        return { profileKey: null, confidence: highestScore };
    }

    /**
     * Helper to find associated label text.
     * Looks for <label for="id"> or parent <label>.
     * @param {HTMLElement} element 
     * @returns {string}
     */
    static _getAssociatedLabelText(element) {
        let text = '';
        
        // Check for 'for' attribute link
        if (element.id && typeof document !== 'undefined') {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) text += label.innerText + ' ';
        }
        
        // Check for parent label
        if (typeof element.closest === 'function') {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                text += parentLabel.innerText + ' ';
            }
        }

        // Check for aria-labelledby
        if (typeof element.getAttribute === 'function') {
            const labelledBy = element.getAttribute('aria-labelledby');
            if (labelledBy && typeof document !== 'undefined') {
                const labelEl = document.getElementById(labelledBy);
                if (labelEl) text += labelEl.innerText + ' ';
            }
        }

        return text.trim();
    }
}

// Export for module usage (e.g., in UI scripts) and for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FormFieldDetector };
}
