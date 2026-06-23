/**
 * AutoApply Form Scanner Injector
 * 
 * Content script injected into job pages to auto-fill forms.
 * Reads profile data from storage, identifies fields, and injects values safely.
 */

// Function to safely set value and trigger React/Vue native events
function setNativeValue(element, value) {
    if (element.tagName === 'SELECT') {
        // Simple select logic
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
        
        // React 15 hack
        event.simulated = true;
        // React 16+ hack
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
        // Read profile directly from storage
        const storageResult = await new Promise((resolve) => chrome.storage.local.get(['profile'], resolve));
        const profile = storageResult.profile;

        if (!profile) {
            console.warn("[AutoApply] Profile is empty. Cannot auto-fill.");
            return;
        }

        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
        let filledCount = 0;
        let unknownCount = 0;

        inputs.forEach(input => {
            // FormFieldDetector is injected right before this script
            const detection = FormFieldDetector.identifyField(input);
            
            if (detection.confidence >= 30 && detection.profileKey && profile[detection.profileKey]) {
                // We have a match and data to fill
                setNativeValue(input, profile[detection.profileKey]);
                filledCount++;
                // Give a subtle green outline to show it was filled
                input.style.border = "2px solid #10B981";
            } else if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'checkbox' && input.type !== 'radio') {
                // Unknown field - highlight yellow for manual input
                input.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
                input.style.border = "2px dashed #EAB308";
                unknownCount++;
            }
        });

        showSummaryOverlay(filledCount, unknownCount);

    } catch (error) {
        console.error("[AutoApply] Error during auto-fill:", error);
    }
}

function showSummaryOverlay(filled, unknown) {
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

// Execute immediately upon injection
executeAutoFill();
