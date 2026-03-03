// ==UserScript==
// @name         YouTube 转写稿复制增强
// @namespace    https://github.com/yourname/youtube-transcript-copy
// @version      2.0.0
// @description  为 YouTube 原生转写稿面板添加“复制全文”按钮
// @author       YourName
// @match        *://www.youtube.com/*
// @match        *://youtube.com/*
// @match        *://m.youtube.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_TAG = 'yt-transcript-copy';
    const TRANSCRIPT_OPEN_RETRY_MS = 700;
    const TRANSCRIPT_OPEN_MAX_ATTEMPTS = 20;
    let autoOpenTimer = null;

    GM_addStyle(`
        .yt-transcript-copy-btn {
            border: 1px solid var(--yt-spec-10-percent-layer, #d9d9d9);
            background: var(--yt-spec-badge-chip-background, #f2f2f2);
            color: var(--yt-spec-text-primary, #0f0f0f);
            border-radius: 18px;
            height: 32px;
            padding: 0 12px;
            margin-right: 8px;
            font-size: 13px;
            line-height: 32px;
            cursor: pointer;
            white-space: nowrap;
        }

        .yt-transcript-copy-btn:hover {
            background: var(--yt-spec-badge-chip-background-hover, #e9e9e9);
        }

        .yt-transcript-copy-toast {
            position: fixed;
            right: 24px;
            bottom: 24px;
            background: rgba(15, 15, 15, 0.92);
            color: #fff;
            border-radius: 8px;
            padding: 8px 12px;
            z-index: 2147483647;
            font-size: 13px;
        }
    `);

    function showToast(message) {
        const old = document.querySelector('.yt-transcript-copy-toast');
        if (old) old.remove();

        const toast = document.createElement('div');
        toast.className = 'yt-transcript-copy-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    function normalizeText(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    function lowerText(text) {
        return normalizeText(text).toLowerCase();
    }

    function getVideoId() {
        const url = new URL(location.href);
        if (url.pathname === '/watch') return url.searchParams.get('v') || '';
        const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/);
        return shortsMatch ? shortsMatch[1] : '';
    }

    function isTranscriptPanelOpen() {
        return !!document.querySelector('ytd-transcript-search-panel-renderer');
    }

    function getAllClickableElements() {
        return Array.from(document.querySelectorAll(
            'button, tp-yt-paper-button, yt-button-shape button, div[role="button"], a[role="button"]'
        ));
    }

    function findClickableByKeywords(keywords) {
        const lowers = keywords.map((k) => k.toLowerCase());
        return getAllClickableElements().find((el) => {
            if (!(el instanceof HTMLElement)) return false;

            const text = lowerText(el.textContent || '');
            const ariaLabel = lowerText(el.getAttribute('aria-label') || '');
            const title = lowerText(el.getAttribute('title') || '');
            const value = `${text} ${ariaLabel} ${title}`;

            return lowers.some((keyword) => value.includes(keyword));
        }) || null;
    }

    function clickElement(el) {
        if (!(el instanceof HTMLElement)) return false;
        el.click();
        return true;
    }

    function tryOpenTranscriptPanel() {
        if (isTranscriptPanelOpen()) return true;

        const directSelectors = [
            'ytd-video-description-transcript-section-renderer button',
            'ytd-video-description-transcript-section-renderer tp-yt-paper-button',
            '#description-inline-expander ytd-video-description-transcript-section-renderer button',
            '#description-inline-expander ytd-video-description-transcript-section-renderer tp-yt-paper-button'
        ];

        for (const selector of directSelectors) {
            const node = document.querySelector(selector);
            if (node && clickElement(node)) {
                return true;
            }
        }

        const transcriptKeywords = [
            'show transcript',
            'transcript',
            'view transcript',
            '转写文稿',
            '显示转写',
            '显示文字稿',
            '查看转写',
            '字幕记录'
        ];

        const directButton = findClickableByKeywords(transcriptKeywords);
        if (directButton && clickElement(directButton)) {
            return true;
        }

        const expandSelectors = [
            '#description-inline-expander #expand',
            'ytd-text-inline-expander #expand',
            '#description-inline-expander button[aria-label]',
            '#description-inline-expander tp-yt-paper-button'
        ];

        for (const selector of expandSelectors) {
            const node = document.querySelector(selector);
            if (node) {
                clickElement(node);
                return false;
            }
        }

        const expandKeywords = [
            'show more',
            'more',
            '展开',
            '更多',
            '查看全部',
            '显示更多'
        ];

        const expandButton = findClickableByKeywords(expandKeywords);
        if (expandButton) {
            clickElement(expandButton);
        }

        return false;
    }

    function collectTranscriptLines(panel) {
        const segments = panel.querySelectorAll('ytd-transcript-segment-renderer');
        const lines = [];

        segments.forEach((seg) => {
            const tsEl = seg.querySelector('.segment-timestamp, #segment-timestamp, [class*="timestamp"]');
            const textEl = seg.querySelector('.segment-text, #segment-text, yt-formatted-string');

            const timestamp = normalizeText(tsEl?.textContent || '');
            const text = normalizeText(textEl?.textContent || '');

            if (!text) return;
            lines.push(timestamp ? `[${timestamp}] ${text}` : text);
        });

        return lines;
    }

    async function copyTranscript(panel) {
        const lines = collectTranscriptLines(panel);
        if (!lines.length) {
            showToast('未找到可复制的转写内容');
            return;
        }

        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            showToast(`已复制 ${lines.length} 行转写`);
        } catch (error) {
            console.error('[YT转写复制] 复制失败:', error);
            showToast('复制失败，请检查浏览器权限');
        }
    }

    function findButtonHost(panel) {
        return (
            panel.querySelector('#header #actions') ||
            panel.querySelector('#header #buttons') ||
            panel.querySelector('#header #end') ||
            panel.querySelector('#header #right-controls') ||
            panel.querySelector('#header') ||
            panel
        );
    }

    function ensureCopyButton(panel) {
        if (!(panel instanceof HTMLElement)) return;

        const existed = panel.querySelector('.yt-transcript-copy-btn');
        if (existed) return;

        const host = findButtonHost(panel);
        if (!host) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'yt-transcript-copy-btn';
        button.textContent = '复制全文';
        button.setAttribute('data-script', SCRIPT_TAG);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            copyTranscript(panel);
        });

        host.prepend(button);
    }

    function installButtons() {
        const panels = document.querySelectorAll('ytd-transcript-search-panel-renderer');
        panels.forEach(ensureCopyButton);
    }

    function stopAutoOpenLoop() {
        if (autoOpenTimer) {
            clearInterval(autoOpenTimer);
            autoOpenTimer = null;
        }
    }

    function startAutoOpenLoop() {
        stopAutoOpenLoop();

        const videoId = getVideoId();
        if (!videoId) return;

        let attempts = 0;
        autoOpenTimer = setInterval(() => {
            attempts += 1;

            if (isTranscriptPanelOpen()) {
                installButtons();
                stopAutoOpenLoop();
                return;
            }

            tryOpenTranscriptPanel();
            installButtons();

            if (attempts >= TRANSCRIPT_OPEN_MAX_ATTEMPTS) {
                stopAutoOpenLoop();
            }
        }, TRANSCRIPT_OPEN_RETRY_MS);
    }

    function watchTranscriptPanel() {
        const observer = new MutationObserver(() => {
            installButtons();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener('yt-navigate-finish', () => {
            startAutoOpenLoop();
            setTimeout(installButtons, 300);
            setTimeout(installButtons, 1200);
        });

        installButtons();
        startAutoOpenLoop();
        setTimeout(installButtons, 1000);
    }

    watchTranscriptPanel();
})();
