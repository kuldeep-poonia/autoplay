/**
 * AutoApply — Job Scraper Content Script
 * Injected into any job listing page by background_url_monitor.js
 * Extracts job cards generically — works on LinkedIn, Naukri, Wellfound, etc.
 */

(function () {
    'use strict';

    // ── Already ran guard ──────────────────────────────────────────────────
    if (window.__autoApplyScraperRan) return;
    window.__autoApplyScraperRan = true;

    // ── Field selector patterns (ordered by priority) ──────────────────────
    const SELECTORS = {

        // Job card containers — parent element wrapping each job
        container: [
            // LinkedIn
            '.jobs-search__results-list > li',
            '.scaffold-layout__list > ul > li',
            '[data-testid="job-card-container"]',
            '.job-card-container',
            '.base-card',
            // Naukri
            '[class*="jobTuple"]',
            '[class*="job-tuple"]',
            '.cust-job-tuple',
            // Wellfound / AngelList
            '[class*="job-listing"]',
            '[data-test="JobListing"]',
            // Internshala
            '.internship-hightlights',
            '.individual_internship',
            // Greenhouse
            '.opening',
            // Lever
            '.posting',
            // Generic fallbacks
            '[class*="job-card"]',
            '[class*="job-item"]',
            '[class*="job-result"]',
            '[class*="jobCard"]',
            '[class*="JobCard"]',
            'li[class*="job"]',
            'article[class*="job"]',
        ],

        // Job title inside a card
        title: [
            // LinkedIn
            '.job-card-list__title',
            '.base-search-card__title',
            '[class*="job-card-list__title"]',
            // Naukri
            '.title a',
            '[class*="jobTuple"] a[title]',
            // Wellfound
            '[data-test="job-title"]',
            // Generic
            '[class*="job-title"]',
            '[class*="jobtitle"]',
            '[class*="position-title"]',
            '[class*="role-title"]',
            '[data-testid*="job-title"]',
            'h1[class*="job"]',
            'h2[class*="job"]',
            'h3[class*="job"]',
            'a[class*="job-title"]',
            '.posting-title h5',
            '.opening-title',
        ],

        // Company name inside a card
        company: [
            // LinkedIn
            '.job-card-container__company-name',
            '.base-search-card__subtitle',
            // Naukri
            '[class*="jobTuple"] [class*="company"]',
            '.comp-name',
            // Generic
            '[class*="company-name"]',
            '[class*="companyname"]',
            '[class*="employer-name"]',
            '[class*="org-name"]',
            '[data-testid*="company"]',
        ],

        // Location inside a card
        location: [
            // LinkedIn
            '.job-card-container__metadata-item',
            '.job-search-card__location',
            // Naukri
            '[class*="jobTuple"] [class*="location"]',
            '.loc',
            // Generic
            '[class*="job-location"]',
            '[class*="location"]',
            '[data-testid*="location"]',
            '[class*="workplace"]',
        ],
    };

    // ── Helper: try selectors until one matches ────────────────────────────
    function queryFirst(parent, selectors) {
        for (const sel of selectors) {
            try {
                const el = parent.querySelector(sel);
                if (el) {
                    const text = (el.textContent || el.getAttribute('title') || '').trim();
                    if (text.length > 0) return text;
                }
            } catch (_) { /* bad selector, skip */ }
        }
        return '';
    }

    // ── Helper: find best apply link inside a card ─────────────────────────
    function findLink(card) {
        const anchors = Array.from(card.querySelectorAll('a[href]'));

        // Priority 1: href pattern matches job paths
        const jobPathRx = /\/(jobs?|careers?|apply|position|opening|posting|role)\//i;
        const paramRx   = /[?&](job_id|jobId|jk|currentJobId|id)=/i;

        for (const a of anchors) {
            const href = a.href;
            if (jobPathRx.test(href) || paramRx.test(href)) return href;
        }

        // Priority 2: first anchor that isn't a company profile / hash only
        for (const a of anchors) {
            const href = a.href;
            if (
                href &&
                !href.endsWith('#') &&
                !href.includes('/company/') &&
                !href.includes('/school/')
            ) {
                return href;
            }
        }

        return window.location.href;
    }

    // ── Helper: detect Easy Apply badge in card ────────────────────────────
    function detectEasyApply(card) {
        const text = card.textContent.toLowerCase();
        return (
            text.includes('easy apply') ||
            text.includes('quick apply') ||
            text.includes('1-click apply') ||
            text.includes('instant apply') ||
            !!card.querySelector(
                '[class*="easy-apply"], [aria-label*="Easy Apply"], [data-test*="easy-apply"]'
            )
        );
    }

    // ── Core: extract all job listings from page ───────────────────────────
    function extractJobs() {
        const jobs = [];
        const seenKeys = new Set();

        for (const containerSel of SELECTORS.container) {
            let cards;
            try {
                cards = document.querySelectorAll(containerSel);
            } catch (_) {
                continue;
            }

            if (cards.length < 2) continue; // too few → wrong selector

            cards.forEach((card, idx) => {
                try {
                    const title   = queryFirst(card, SELECTORS.title);
                    if (!title || title.length < 3) return; // skip empty

                    const company  = queryFirst(card, SELECTORS.company);
                    const location = queryFirst(card, SELECTORS.location);
                    const link     = findLink(card);

                    // Deduplicate by title+link
                    const key = `${title}||${link}`;
                    if (seenKeys.has(key)) return;
                    seenKeys.add(key);

                    jobs.push({
                        id:        `job_${Date.now()}_${idx}`,
                        title:     title,
                        company:   company  || 'Unknown Company',
                        location:  location || 'Location N/A',
                        link:      link,
                        easyApply: detectEasyApply(card),
                        site:      window.location.hostname,
                        pageUrl:   window.location.href,
                        scrapedAt: new Date().toISOString(),
                    });
                } catch (_) { /* skip bad card */ }
            });

            if (jobs.length >= 2) break; // good selector found, stop trying
        }

        return jobs;
    }

    // ── Run & send results to background ──────────────────────────────────
    const jobs = extractJobs();

    chrome.runtime.sendMessage({
        type:  'JOBS_SCRAPED',
        jobs:  jobs,
        count: jobs.length,
    });

})();