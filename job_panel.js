/**
 * AutoApply — Job Panel UI
 * Handles scrape button, renders job cards, opens jobs + triggers autofill
 */

'use strict';

// ── DOM refs 
const scrapeBtn   = document.getElementById('scrapeBtn');
const scrapeIcon  = document.getElementById('scrapeIcon');
const scrapeTxt   = document.getElementById('scrapeTxt');
const statusBar   = document.getElementById('statusBar');
const jobsList    = document.getElementById('jobsList');
const countBadge  = document.getElementById('countBadge');

// ── State 
let scrapedJobs   = [];
let safetyTimer   = null;

// ── Scrape button 
scrapeBtn.addEventListener('click', () => {
    setBusy(true);
    setStatus('Scanning page for jobs…', 'default');

    // Tell background to inject job_scraper.js into active tab
    chrome.runtime.sendMessage({ type: 'INJECT_SCRAPER' });

    // Safety timeout — if no response in 8 s, reset
    safetyTimer = setTimeout(() => {
        setBusy(false);
        setStatus('No jobs found. Make sure you are on a jobs listing page.', 'warning');
    }, 8000);
});

// ── Listen for scraped jobs forwarded by background 
chrome.runtime.onMessage.addListener((msg) => {

    if (msg.type === 'JOBS_SCRAPED_FORWARD') {
        clearTimeout(safetyTimer);
        setBusy(false);

        scrapedJobs = msg.jobs || [];
        renderJobs(scrapedJobs);

        if (scrapedJobs.length === 0) {
            setStatus('No jobs detected. Try a search results / listing page.', 'warning');
        } else {
            const host = msg.site ? new URL(msg.site).hostname : 'this page';
            setStatus(`Found ${scrapedJobs.length} jobs on ${host}`, 'success');
        }
    }

    if (msg.type === 'SCRAPER_ERROR') {
        clearTimeout(safetyTimer);
        setBusy(false);
        setStatus(`Error: ${msg.error}`, 'error');
    }
});

// ── Render job cards ─
function renderJobs(jobs) {
    countBadge.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;

    if (jobs.length === 0) {
        jobsList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">😕</div>
                <p>No jobs detected on this page.<br>
                   Try scrolling down to load more,<br>
                   then scrape again.</p>
            </div>`;
        return;
    }

    jobsList.innerHTML = jobs.map((job, i) => `
        <div class="job-card">
            <div class="jc-title">${esc(job.title)}</div>
            <div class="jc-company">🏢 ${esc(job.company)}</div>
            <div class="jc-location">📍 ${esc(job.location)}</div>
            <div class="jc-actions">
                <button class="btn-fill" data-idx="${i}">
                    ${job.easyApply ? '⚡ Easy Apply' : '✅ Open & Fill'}
                </button>
                <button class="btn-view" data-view="${i}">View</button>
                ${job.easyApply ? '<span class="easy-tag">EASY APPLY</span>' : ''}
            </div>
        </div>
    `).join('');

    // Event delegation — one listener for all cards
    jobsList.addEventListener('click', onCardClick, { once: false });
}

// ── Card click handler ──
function onCardClick(e) {
    const fillBtn = e.target.closest('[data-idx]');
    const viewBtn = e.target.closest('[data-view]');

    if (fillBtn) {
        const idx = parseInt(fillBtn.dataset.idx, 10);
        openAndFill(idx);
    }

    if (viewBtn) {
        const idx = parseInt(viewBtn.dataset.view, 10);
        openOnly(idx);
    }
}

// ── Open job tab + trigger autofill once page loads 
function openAndFill(idx) {
    const job = scrapedJobs[idx];
    if (!job) return;

    chrome.tabs.create({ url: job.link, active: true }, (tab) => {
        // Tell background to inject autofill when this tab finishes loading
        chrome.runtime.sendMessage({
            type:  'TRIGGER_AUTOFILL',
            tabId: tab.id,
        });

        setStatus(`Opening: ${job.title} — AutoFill will trigger on load`, 'success');
    });
}

// ── Open job tab for viewing only ──
function openOnly(idx) {
    const job = scrapedJobs[idx];
    if (!job) return;
    chrome.tabs.create({ url: job.link, active: true });
}

// ── UI helpers 
function setBusy(busy) {
    scrapeBtn.disabled = busy;
    if (busy) {
        scrapeIcon.outerHTML = '<span class="spinner" id="scrapeIcon"></span>';
        scrapeTxt.textContent = 'Scraping…';
    } else {
        // Re-query after DOM change
        const icon = document.getElementById('scrapeIcon');
        if (icon) icon.outerHTML = '<span id="scrapeIcon">🔍</span>';
        scrapeTxt.textContent = 'Scrape Jobs from This Page';
    }
}

function setStatus(msg, type = 'default') {
    statusBar.textContent = msg;
    statusBar.className = `status ${type === 'default' ? '' : type}`.trim();
}

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}