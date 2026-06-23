/**
 * AutoApply Form Scanner Injector
 * 
 * Content script injected into job pages to auto-fill forms.
 * Reads profile data from storage, identifies fields, and injects values safely.
 * Includes AI auto-answer integration.
 */

function setNativeValue(element, value) {
    if (element.tagName === 'SELECT') {
        let found = false;
        for (let i = 0; i < element.options.length; i++) {
            if (element.options[i].text.toLowerCase().includes(value.toLowerCase()) || 
                element.options[i].value.toLowerCase() === value.toLowerCase()) {
                element.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (found) {
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    } else {
        const lastValue = element.value;
        element.value = value;
        const event = new Event('input', { bubbles: true });
        event.simulated = true;
        let tracker = element._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        element.dispatchEvent(event);
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

async function executeAutoFill() {
    console.log("[AutoApply] Scanning form...");
    
    try {
        const storageResult = await new Promise((resolve) => chrome.storage.local.get(['profile', 'settings'], resolve));
        const profile = storageResult.profile;
        const settings = storageResult.settings || {};

        if (!profile) {
            console.warn("[AutoApply] Profile is empty. Cannot auto-fill.");
            return;
        }

        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
        let filledCount = 0;
        let unknownCount = 0;
        let aiCount = 0;

        inputs.forEach(input => {
            const detection = FormFieldDetector.identifyField(input);
            
            // 1. Standard Field Autofill
            if (detection.confidence >= 30 && detection.profileKey && profile[detection.profileKey]) {
                setNativeValue(input, profile[detection.profileKey]);
                filledCount++;
                input.style.border = "2px solid #10B981";
            } 
            // 2. Open-ended / Textarea (AI generation)
            else if (input.tagName === 'TEXTAREA') {
                injectAiButton(input, profile, settings.geminiApiKey);
                aiCount++;
            }
            // 3. Unknown Field
            else if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'checkbox' && input.type !== 'radio') {
                input.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
                input.style.border = "2px dashed #EAB308";
                unknownCount++;
            }
        });

        showSummaryOverlay(filledCount, unknownCount, aiCount);

    } catch (error) {
        console.error("[AutoApply] Error during auto-fill:", error);
    }
}

function injectAiButton(textarea, profile, apiKey) {
    if (textarea.parentElement.querySelector('.autoapply-ai-btn')) return; // Already injected

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'block';
    wrapper.style.width = '100%';
    
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    const btn = document.createElement('button');
    btn.className = 'autoapply-ai-btn';
    btn.innerHTML = '✨ AI Answer';
    btn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: linear-gradient(135deg, #4F46E5, #10B981);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    btn.onclick = async (e) => {
        e.preventDefault();
        const questionText = FormFieldDetector._getAssociatedLabelText(textarea) || textarea.placeholder || "Why are you a good fit for this role?";
        
        btn.innerHTML = '⏳ Generating...';
        btn.disabled = true;

        try {
            const answer = await GeminiApiClient.generateAnswer(questionText, profile, apiKey);
            showAiApprovalModal(answer, (approvedText) => {
                setNativeValue(textarea, approvedText);
                textarea.style.border = "2px solid #4F46E5";
            });
        } catch (err) {
            alert(err.message);
        } finally {
            btn.innerHTML = '✨ AI Answer';
            btn.disabled = false;
        }
    };

    wrapper.appendChild(btn);
}

function showAiApprovalModal(generatedText, onApprove) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(4px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #1E293B;
        padding: 24px;
        border-radius: 12px;
        width: 500px;
        max-width: 90vw;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    `;

    const title = document.createElement('h3');
    title.innerText = 'Review AI Answer';
    title.style.cssText = 'margin-top: 0; color: #F8FAFC; margin-bottom: 16px; font-weight: 600;';

    const textarea = document.createElement('textarea');
    textarea.value = generatedText;
    textarea.style.cssText = `
        width: 100%;
        height: 150px;
        background: rgba(15, 23, 42, 0.6);
        color: #F8FAFC;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 12px;
        font-family: inherit;
        margin-bottom: 16px;
        resize: vertical;
        box-sizing: border-box;
    `;

    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel';
    cancelBtn.style.cssText = 'background: transparent; color: #F8FAFC; border: 1px solid #334155; padding: 8px 16px; border-radius: 6px; cursor: pointer;';
    cancelBtn.onclick = () => modal.remove();

    const approveBtn = document.createElement('button');
    approveBtn.innerText = 'Insert Answer';
    approveBtn.style.cssText = 'background: #4F46E5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;';
    approveBtn.onclick = () => {
        onApprove(textarea.value);
        modal.remove();
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(approveBtn);

    content.appendChild(title);
    content.appendChild(textarea);
    content.appendChild(actions);
    modal.appendChild(content);

    document.body.appendChild(modal);
}

function showSummaryOverlay(filled, unknown, aiCount) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1E293B;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
        display: flex;
        align-items: center;
        gap: 15px;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    let text = `<div style="display:flex; flex-direction:column; gap:4px;">
                  <strong style="color: #4F46E5;">AutoApply</strong>
                  <span style="font-size: 14px;">${filled} fields auto-filled.</span>`;
    
    if (unknown > 0) {
        text += `<span style="font-size: 14px; color: #EAB308;">${unknown} fields need your attention.</span>`;
    }
    if (aiCount > 0) {
        text += `<span style="font-size: 14px; color: #10B981;">${aiCount} AI-ready text areas found.</span>`;
    }
    text += `</div>`;

    const textDiv = document.createElement('div');
    textDiv.innerHTML = text;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = "✕";
    closeBtn.style.cssText = "background: none; border: none; color: #94A3B8; cursor: pointer; font-size: 14px; padding: 4px; margin-left: 8px;";
    closeBtn.onclick = () => overlay.remove();

    overlay.appendChild(textDiv);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    setTimeout(() => overlay.remove(), 6000);
}

// Hook form submission to track applications
document.addEventListener('submit', async (e) => {
    try {
        const company = document.title.split('-')[0].trim() || 'Unknown Company';
        const role = document.title.split('-')[1]?.trim() || 'Job Application';
        
        const storageResult = await new Promise(resolve => chrome.storage.local.get(['history'], resolve));
        const history = storageResult.history || [];
        
        history.push({
            company: company,
            role: role,
            date: new Date().toISOString()
        });
        
        await new Promise(resolve => chrome.storage.local.set({ history }, resolve));
        console.log("[AutoApply] Application recorded in history.");
    } catch (err) {
        console.error("[AutoApply] Failed to record history", err);
    }
});

// Execute immediately upon injection
executeAutoFill();
