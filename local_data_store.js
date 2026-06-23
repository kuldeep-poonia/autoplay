/**
 * AutoApply Local Data Store
 * 
 * Provides type-safe access to chrome.storage.local.
 * Abstracts the async nature of the storage API and provides defined defaults.
 */

// Define default shapes to ensure we always return valid structures
const DEFAULTS = {
    profile: {
        name: "", email: "", phone: "", city: "", linkedinUrl: "", 
        totalYears: "", currentRole: "", currentCompany: "", noticePeriod: "", 
        currentCTC: "", expectedCTC: "", degree: "", college: "", 
        gradYear: "", skills: [], commonAnswers: {}
    },
    resumes: [], // Array of { id, label, fileName, fileData, uploadDate }
    applications: [], // Array of { id, company, role, site, url, date, resumeId, status, notes }
    preferences: { locations: [], workMode: "", minSalary: "", targetRoles: [] },
    settings: { geminiApiKey: "", autoHintEnabled: true, activatedSites: [] }
};

class LocalDataStore {
    /**
     * Retrieves data from chrome.storage.local for a given key, falling back to DEFAULTS.
     * @param {string} key - The storage key ('profile', 'resumes', etc.)
     * @returns {Promise<any>}
     */
    static async get(key) {
        if (!DEFAULTS.hasOwnProperty(key)) {
            throw new Error(`Invalid storage key requested: ${key}`);
        }

        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get([key], (result) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Storage read error for key ${key}:`, chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        // Return stored value or default if not found
                        resolve(result[key] !== undefined ? result[key] : DEFAULTS[key]);
                    }
                });
            } catch (error) {
                console.error(`Unexpected error reading key ${key}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Saves data to chrome.storage.local for a given key.
     * @param {string} key - The storage key.
     * @param {any} data - The data payload to save.
     * @returns {Promise<void>}
     */
    static async set(key, data) {
        if (!DEFAULTS.hasOwnProperty(key)) {
            throw new Error(`Invalid storage key provided for save: ${key}`);
        }
        
        if (data === undefined || data === null) {
            throw new Error(`Cannot save null/undefined data for key: ${key}`);
        }

        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set({ [key]: data }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Storage write error for key ${key}:`, chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                console.error(`Unexpected error writing key ${key}:`, error);
                reject(error);
            }
        });
    }

    static async getProfile() { return this.get('profile'); }
    static async setProfile(data) { return this.set('profile', data); }
    
    static async getResumes() { return this.get('resumes'); }
    static async setResumes(data) { return this.set('resumes', data); }
    
    static async getApplications() { return this.get('applications'); }
    static async setApplications(data) { return this.set('applications', data); }
    
    static async getPreferences() { return this.get('preferences'); }
    static async setPreferences(data) { return this.set('preferences', data); }
    
    static async getSettings() { return this.get('settings'); }
    static async setSettings(data) { return this.set('settings', data); }
}

// Export for module usage (e.g., in UI scripts) and for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalDataStore, DEFAULTS };
}
