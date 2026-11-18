// ==UserScript==
// @name         B站字幕侧边栏
// @namespace    https://github.com/yourname/bilibili-subtitle-sidebar
// @version      1.1.1
// @description  在B站视频页面右侧显示字幕列表,支持点击跳转、自动同步和复制全文
// @author       YourName
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      api.bilibili.com
// @connect      *.bilibili.com
// @connect      *.hdslb.com
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 样式定义 ====================
    const styles = `
        :root {
            --bg-primary: #fafafa;
            --bg-hover: #f0f0f0;
            --bg-active: #e3f2fd;
            --text-primary: #333;
            --text-secondary: #999;
            --accent-color: #1976d2;
            --border-color: #e0e0e0;
            --sidebar-width: 320px;
        }

        .subtitle-toggle-btn {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #FB7299;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transition: all 0.3s ease;
            font-size: 24px;
            user-select: none;
        }

        .subtitle-toggle-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .subtitle-sidebar {
            position: fixed;
            top: 100px;
            right: 20px;
            width: var(--sidebar-width);
            max-height: calc(100vh - 120px);
            background: rgba(250, 250, 250, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        .subtitle-sidebar.show {
            display: flex;
        }

        .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-primary);
        }

        .sidebar-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .copy-btn {
            background: var(--accent-color);
            color: white;
            border: none;
            font-size: 12px;
            cursor: pointer;
            padding: 4px 10px;
            border-radius: 4px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .copy-btn:hover {
            opacity: 0.9;
            transform: scale(1.05);
        }

        .copy-btn:active {
            transform: scale(0.95);
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .close-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .toast {
            position: fixed;
            bottom: 100px;
            right: 80px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10001;
            animation: fadeInOut 2s ease;
        }

        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(10px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }

        .subtitle-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 0;
        }

        .subtitle-list::-webkit-scrollbar {
            width: 6px;
        }

        .subtitle-list::-webkit-scrollbar-track {
            background: transparent;
        }

        .subtitle-list::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 3px;
        }

        .subtitle-list::-webkit-scrollbar-thumb:hover {
            background: #999;
        }

        .subtitle-item {
            display: flex;
            flex-direction: column;
            padding: 10px 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
        }

        .subtitle-item:hover {
            background: var(--bg-hover);
        }

        .subtitle-item.active {
            background: var(--bg-active);
            border-left-color: var(--accent-color);
        }

        .subtitle-time {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
        }

        .subtitle-item.active .subtitle-time {
            color: var(--accent-color);
            font-weight: 600;
        }

        .subtitle-text {
            font-size: 13px;
            color: var(--text-primary);
            line-height: 1.5;
            word-break: break-word;
        }

        .subtitle-item.active .subtitle-text {
            color: var(--accent-color);
            font-weight: 600;
        }

        .loading-spinner {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            color: var(--text-secondary);
            font-size: 14px;
            text-align: center;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }
    `;

    // 注入样式
    GM_addStyle(styles);

    // ==================== 全局状态 ====================
    let sidebarVisible = false;
    let currentSubtitles = [];
    let currentIndex = -1;
    let videoElement = null;
    let activeLoad = null;

    // ==================== 工具函数 ====================

    /**
     * 格式化时间戳为 MM:SS 格式
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 识别当前视频地址
     */
    function getVideoRoute() {
        const url = new URL(location.href);
        const video = url.pathname.match(/^\/video\/(BV[0-9A-Za-z]+|av\d+)\/?$/);
        if (video) {
            const id = video[1];
            const part = Number(url.searchParams.get('p') || 1);
            if (!Number.isSafeInteger(part) || part < 1) return null;
            const type = id.startsWith('BV') ? 'bvid' : 'aid';
            return { key: `${id}:${part}`, type, id: type === 'aid' ? id.slice(2) : id, part };
        }

        const bangumi = url.pathname.match(/^\/bangumi\/play\/(ep|ss)(\d+)\/?$/);
        if (!bangumi) return null;
        const [, type, id] = bangumi;
        if (type === 'ep') return { key: `ep${id}`, type, id };

        const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const arc = pageWindow.__playinfo__?.result?.arc;
        return arc?.aid && arc?.cid
            ? { key: `ss${id}:${arc.aid}:${arc.cid}`, type, id, aid: arc.aid, cid: arc.cid }
            : null;
    }

    async function getVideoInfo(route) {
        if (route.type === 'bvid' || route.type === 'aid') {
            const { data } = await requestJson(`https://api.bilibili.com/x/web-interface/view?${route.type}=${route.id}`);
            if (String(data?.[route.type]) !== route.id) return null;
            const part = data.pages?.find(page => Number(page.page) === route.part);
            return part?.cid && data.aid ? { aid: data.aid, cid: part.cid } : null;
        }

        const param = route.type === 'ep' ? 'ep_id' : 'season_id';
        const { result } = await requestJson(`https://api.bilibili.com/pgc/view/web/season?${param}=${route.id}`);
        if (!result || (route.type === 'ss' && String(result.season_id) !== route.id)) return null;
        const episodes = [...(result.episodes || []), ...(result.section || []).flatMap(section => section.episodes || [])];
        const episode = episodes.find(item => route.type === 'ep'
            ? String(item.id) === route.id
            : String(item.aid) === String(route.aid) && String(item.cid) === String(route.cid));
        return episode?.aid && episode?.cid ? { aid: episode.aid, cid: episode.cid } : null;
    }

    // ==================== API 调用 ====================

    /**
     * 请求 JSON 数据
     */
    function requestJson(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: 15000,
                headers: {
                    'Accept': 'application/json'
                },
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        const data = JSON.parse(response.responseText);
                        if (data.code != null && data.code !== 0) {
                            throw new Error(data.message || `API ${data.code}`);
                        }
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: () => reject(new Error('网络请求失败')),
                ontimeout: () => reject(new Error('网络请求超时'))
            });
        });
    }

    /**
     * 获取字幕内容
     */
    async function fetchSubtitleContent(subtitleUrl) {
        const fullUrl = subtitleUrl.startsWith('//') ? 'https:' + subtitleUrl : subtitleUrl;
        const { body } = await requestJson(fullUrl);
        return Array.isArray(body) ? body : [];
    }

    // ==================== DOM 操作 ====================

    /**
     * 创建浮动按钮
     */
    function createToggleButton() {
        const button = document.createElement('div');
        button.className = 'subtitle-toggle-btn';
        button.innerHTML = '💬';
        button.title = '显示/隐藏字幕列表';
        button.addEventListener('click', toggleSidebar);
        document.body.appendChild(button);
        console.log('[字幕侧边栏] 浮动按钮已创建');
    }

    /**
     * 创建侧边栏
     */
    function createSidebar() {
        // 如果已存在,先移除
        const existing = document.querySelector('.subtitle-sidebar');
        if (existing) {
            existing.remove();
        }

        const sidebar = document.createElement('div');
        sidebar.className = 'subtitle-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <span class="sidebar-title">字幕列表</span>
                <div class="header-actions">
                    <button class="copy-btn" title="复制所有字幕">📋 复制全文</button>
                    <button class="close-btn" title="关闭">×</button>
                </div>
            </div>
            <div class="subtitle-list">
                <div class="loading-spinner">加载中...</div>
            </div>
        `;

        // 关闭按钮事件
        sidebar.querySelector('.close-btn').addEventListener('click', () => {
            toggleSidebar();
        });

        // 复制按钮事件
        sidebar.querySelector('.copy-btn').addEventListener('click', () => {
            copyAllSubtitles();
        });

        document.body.appendChild(sidebar);
        return sidebar;
    }

    /**
     * 复制所有字幕到剪贴板
     */
    function copyAllSubtitles() {
        if (!isCurrentLoad(activeLoad)) return;
        if (!currentSubtitles || currentSubtitles.length === 0) {
            showToast('没有可复制的字幕');
            return;
        }

        // 合并所有字幕文本
        const fullText = currentSubtitles.map(sub => {
            const time = `[${formatTime(sub.from)}]`;
            return `${time} ${sub.content}`;
        }).join('\n');

        // 复制到剪贴板
        const textarea = document.createElement('textarea');
        textarea.value = fullText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('[字幕侧边栏] 复制成功,共', currentSubtitles.length, '条字幕');
                showToast(`✓ 已复制 ${currentSubtitles.length} 条字幕`);
            } else {
                showToast('复制失败,请手动复制');
            }
        } catch (err) {
            console.error('[字幕侧边栏] 复制失败:', err);
            showToast('复制失败,请手动复制');
        }

        document.body.removeChild(textarea);
    }

    /**
     * 显示提示消息
     */
    function showToast(message) {
        // 移除旧的 toast
        const oldToast = document.querySelector('.toast');
        if (oldToast) {
            oldToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 2秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 2000);
    }

    /**
     * 渲染字幕列表
     */
    function renderSubtitles(subtitles) {
        const listContainer = document.querySelector('.subtitle-list');
        if (!listContainer) return;

        if (!subtitles || subtitles.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div>暂无字幕</div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = subtitles.map((sub, index) => `
            <div class="subtitle-item" data-index="${index}" data-from="${sub.from}" data-to="${sub.to}">
                <span class="subtitle-time">${formatTime(sub.from)}</span>
                <span class="subtitle-text">${escapeHtml(sub.content)}</span>
            </div>
        `).join('');

        // 绑定点击事件
        listContainer.querySelectorAll('.subtitle-item').forEach(item => {
            item.addEventListener('click', handleSubtitleClick);
        });

        console.log(`[字幕侧边栏] 渲染了 ${subtitles.length} 条字幕`);
    }

    /**
     * 转义 HTML 特殊字符
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== 交互处理 ====================

    /**
     * 切换侧边栏显示/隐藏
     */
    function toggleSidebar() {
        if (!isCurrentLoad(activeLoad)) return;
        sidebarVisible = !sidebarVisible;
        let sidebar = document.querySelector('.subtitle-sidebar');

        if (sidebarVisible) {
            if (!sidebar) {
                sidebar = createSidebar();
                if (currentSubtitles.length > 0) {
                    renderSubtitles(currentSubtitles);
                }
            }
            sidebar?.classList.add('show');
            console.log('[字幕侧边栏] 侧边栏已展开');
        } else {
            sidebar?.classList.remove('show');
            console.log('[字幕侧边栏] 侧边栏已收起');
        }
    }

    /**
     * 处理字幕点击事件
     */
    function handleSubtitleClick(event) {
        if (!isCurrentLoad(activeLoad)) return;
        const item = event.currentTarget;
        const from = parseFloat(item.dataset.from);

        if (videoElement && !isNaN(from)) {
            videoElement.currentTime = from;
            videoElement.play();
            console.log(`[字幕侧边栏] 跳转到 ${formatTime(from)}`);
        }
    }

    /**
     * 高亮当前字幕
     */
    function highlightSubtitle(index) {
        // 移除旧的高亮
        document.querySelectorAll('.subtitle-item.active').forEach(el =>
            el.classList.remove('active')
        );

        // 添加新的高亮
        const items = document.querySelectorAll('.subtitle-item');
        if (items[index]) {
            items[index].classList.add('active');
        }
    }

    /**
     * 滚动到当前字幕
     */
    function scrollToSubtitle(index) {
        const items = document.querySelectorAll('.subtitle-item');
        if (items[index]) {
            items[index].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // ==================== 视频同步 ====================

    /**
     * 同步字幕高亮和滚动
     */
    function syncSubtitles() {
        if (!videoElement || currentSubtitles.length === 0 || !isCurrentLoad(activeLoad)) return;
        const currentTime = videoElement.currentTime;
        const index = currentSubtitles.findIndex(sub =>
            currentTime >= sub.from && currentTime <= sub.to
        );
        if (index !== currentIndex) {
            currentIndex = index;
            highlightSubtitle(index);
            scrollToSubtitle(index);
        }
    }

    // ==================== 等待元素加载 ====================

    /**
     * 等待视频元素加载
     */
    function bindVideo(video) {
        if (video === videoElement) return;
        videoElement?.removeEventListener('timeupdate', syncSubtitles);
        videoElement = video;
        videoElement?.addEventListener('timeupdate', syncSubtitles);
        syncSubtitles();
    }

    // ==================== 主初始化流程 ====================

    /**
     * 检查并获取字幕
     */
    async function loadSubtitles(load, route) {
        try {
            const video = await getVideoInfo(route);
            if (!video || !isCurrentLoad(load)) return;

            const { aid, cid } = video;
            const { data } = await requestJson(`https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`);
            if (!isCurrentLoad(load)) return;
            if ((data?.aid != null && String(data.aid) !== String(aid)) ||
                (data?.cid != null && String(data.cid) !== String(cid))) {
                throw new Error('字幕列表不属于当前视频');
            }
            const subtitleList = data?.subtitle?.subtitles || [];
            const targetSubtitle = subtitleList.find(s => s.lan === 'ai-zh') || subtitleList[0];
            if (!targetSubtitle?.subtitle_url) return;
            const subtitles = await fetchSubtitleContent(targetSubtitle.subtitle_url);
            if (!isCurrentLoad(load) || subtitles.length === 0) return;

            currentSubtitles = subtitles;
            createToggleButton();
            createSidebar();
            renderSubtitles(subtitles);
            syncSubtitles();
        } catch (error) {
            if (isCurrentLoad(load)) load.failed = true;
            console.error('[字幕侧边栏] 获取字幕失败:', load.key, error);
        }
    }

    function isCurrentLoad(load) {
        return Boolean(load && activeLoad === load && getVideoRoute()?.key === load.key);
    }

    function refreshVideo(retry = false) {
        const route = getVideoRoute();
        if (route?.key !== activeLoad?.key || (retry && activeLoad?.failed)) {
            activeLoad = null;
            currentSubtitles = [];
            currentIndex = -1;
            sidebarVisible = false;
            document.querySelector('.subtitle-toggle-btn')?.remove();
            document.querySelector('.subtitle-sidebar')?.remove();
            if (route) {
                activeLoad = { key: route.key, failed: false };
                void loadSubtitles(activeLoad, route);
            }
        }
        bindVideo(route ? document.querySelector('.bpx-player-container video') || document.querySelector('video') : null);
    }

    // ==================== 启动 ====================

    const refreshVisibleVideo = () => {
        if (!document.hidden) refreshVideo(true);
    };
    document.addEventListener('visibilitychange', refreshVisibleVideo);
    window.addEventListener('pageshow', refreshVisibleVideo);
    window.addEventListener('popstate', () => refreshVideo());
    setInterval(() => {
        if (!document.hidden) refreshVideo();
    }, 500);
    refreshVisibleVideo();

})();
