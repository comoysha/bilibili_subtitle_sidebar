// ==UserScript==
// @name         YouTube 转写稿复制增强
// @namespace    https://github.com/yourname/youtube-transcript-copy
// @version      2.0.0
// @description  为 YouTube 原生转写稿面板添加“复制全文”按钮
// @author       YourName
// @match        *://www.youtube.com/*
// @match        *://youtube.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_TAG = 'yt-transcript-copy';

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

    function watchTranscriptPanel() {
        const observer = new MutationObserver(() => {
            installButtons();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener('yt-navigate-finish', () => {
            setTimeout(installButtons, 300);
            setTimeout(installButtons, 1200);
        });

        installButtons();
        setTimeout(installButtons, 1000);
    }

    watchTranscriptPanel();
})();
