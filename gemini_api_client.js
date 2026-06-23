/**
 * AutoApply Gemini API Client
 * 
 * Handles network communication with the Google Gemini Flash API.
 */

class GeminiApiClient {
    static API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    /**
     * Constructs a prompt and queries the Gemini API for an answer.
     * @param {string} questionContext - The question asked on the form.
     * @param {object} profileData - The user's profile object.
     * @param {string} apiKey - The Gemini API key.
     * @returns {Promise<string>} The generated answer.
     */
    static async generateAnswer(questionContext, profileData, apiKey) {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error("Missing Gemini API Key. Please configure it in the AutoApply setup.");
        }

        const prompt = this._buildPrompt(questionContext, profileData);

        const url = `${this.API_ENDPOINT}?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 250
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`API Error ${response.status}: ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                return data.candidates[0].content.parts[0].text.trim();
            } else {
                throw new Error("Unexpected response structure from Gemini API");
            }

        } catch (error) {
            console.error("[AutoApply] Gemini API Client Error:", error);
            throw error;
        }
    }

    /**
     * @private
     */
    static _buildPrompt(question, profile) {
        return `You are acting as an applicant filling out a job application.
Question: "${question}"

Applicant Profile Details:
Name: ${profile.name || 'Not provided'}
Experience: ${profile.totalYears ? profile.totalYears + ' years' : 'Not provided'}
Current Role: ${profile.currentRole || 'Not provided'}
Skills: ${(profile.skills || []).join(', ')}

Provide a professional, concise, and direct answer (max 3-4 sentences) to the question based on the profile. Do not include placeholders or generic greetings. If the profile lacks specific info, provide a reasonable general professional response that doesn't hallucinate facts.`;
    }
}

// Export for module usage and testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeminiApiClient };
}
