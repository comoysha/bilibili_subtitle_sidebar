// ==UserScript==
// @name         B站字幕侧边栏
// @namespace    https://github.com/yourname/bilibili-subtitle-sidebar
// @version      1.1.0
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
     * 从页面获取视频信息
     */
    function getVideoInfo() {
        return new Promise((resolve) => {
            try {
                console.log('[字幕侧边栏] 开始获取视频信息...');

                // 使用 unsafeWindow 访问页面的全局变量
                const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
                console.log('[字幕侧边栏] unsafeWindow 可用:', typeof unsafeWindow !== 'undefined');
                console.log('[字幕侧边栏] pageWindow.__INITIAL_STATE__ 存在:', !!pageWindow.__INITIAL_STATE__);

                const initialState = pageWindow.__INITIAL_STATE__;

                if (!initialState) {
                    console.error('[字幕侧边栏] 无法获取 __INITIAL_STATE__');
                    resolve(null);
                    return;
                }

                console.log('[字幕侧边栏] initialState 键:', Object.keys(initialState).slice(0, 20).join(', '));

                const videoData = initialState.videoData || initialState.view?.videoData || {};
                console.log('[字幕侧边栏] videoData:', videoData);

                const aid = videoData.aid || initialState.aid;
                const cid = videoData.cid || initialState.cid;
                const bvid = videoData.bvid || initialState.bvid;

                console.log('[字幕侧边栏] 提取的 aid:', aid, 'cid:', cid, 'bvid:', bvid);

                if (!aid || !cid) {
                    console.error('[字幕侧边栏] 无法获取 aid 或 cid');
                    console.log('[字幕侧边栏] initialState 全部内容:', initialState);
                    resolve(null);
                    return;
                }

                resolve({ aid, cid, bvid });
            } catch (error) {
                console.error('[字幕侧边栏] 获取视频信息失败:', error);
                resolve(null);
            }
        });
    }

    // ==================== API 调用 ====================

    /**
     * 获取字幕列表
     */
    function fetchSubtitleList(aid, cid) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.code === 0) {
                            const subtitles = data.data.subtitle?.subtitles || [];
                            console.log(`[字幕侧边栏] 找到 ${subtitles.length} 个字幕`);
                            resolve(subtitles);
                        } else {
                            reject(new Error(data.message || '获取字幕列表失败'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    }

    /**
     * 获取字幕内容
     */
    function fetchSubtitleContent(subtitleUrl) {
        return new Promise((resolve, reject) => {
            const fullUrl = subtitleUrl.startsWith('//') ? 'https:' + subtitleUrl : subtitleUrl;

            GM_xmlhttpRequest({
                method: 'GET',
                url: fullUrl,
                headers: {
                    'Accept': 'application/json'
                },
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        const body = data.body || [];
                        console.log(`[字幕侧边栏] 加载字幕内容: ${body.length} 条`);
                        resolve(body);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => {
                    reject(new Error('下载字幕内容失败'));
                }
            });
        });
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
        sidebarVisible = !sidebarVisible;
        const sidebar = document.querySelector('.subtitle-sidebar');

        if (sidebarVisible) {
            if (!sidebar) {
                createSidebar();
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
        if (!videoElement || currentSubtitles.length === 0) return;

        let currentIndex = -1;

        videoElement.addEventListener('timeupdate', () => {
            const currentTime = videoElement.currentTime;

            // 查找当前字幕
            const index = currentSubtitles.findIndex(sub =>
                currentTime >= sub.from && currentTime <= sub.to
            );

            // 如果字幕发生变化
            if (index !== currentIndex && index !== -1) {
                currentIndex = index;
                highlightSubtitle(index);
                scrollToSubtitle(index);
            }
        });
    }

    // ==================== 等待元素加载 ====================

    /**
     * 等待视频元素加载
     */
    function waitForVideo(callback, timeout = 10000) {
        const video = document.querySelector('.bpx-player-container video') ||
                      document.querySelector('video');

        if (video) {
            callback(video);
            return;
        }

        const startTime = Date.now();

        const observer = new MutationObserver(() => {
            const video = document.querySelector('.bpx-player-container video') ||
                          document.querySelector('video');

            if (video) {
                observer.disconnect();
                callback(video);
                return;
            }

            // 超时检查
            if (Date.now() - startTime > timeout) {
                observer.disconnect();
                console.error('[字幕侧边栏] 等待视频元素超时');
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // ==================== 主初始化流程 ====================

    /**
     * 检查并获取字幕
     */
    async function checkAndFetchSubtitles(aid, cid) {
        try {
            console.log(`[字幕侧边栏] 开始检查字幕: aid=${aid}, cid=${cid}`);

            // 获取字幕列表
            const subtitleList = await fetchSubtitleList(aid, cid);

            if (!subtitleList || subtitleList.length === 0) {
                console.log('[字幕侧边栏] 该视频没有字幕');
                return null;
            }

            // 优先选择中文自动生成字幕(ai-zh),否则选择第一个
            const targetSubtitle = subtitleList.find(s => s.lan === 'ai-zh') || subtitleList[0];
            console.log(`[字幕侧边栏] 选择字幕: ${targetSubtitle.lan_doc || targetSubtitle.lan}`);

            // 下载字幕内容
            const subtitles = await fetchSubtitleContent(targetSubtitle.subtitle_url);

            return subtitles;

        } catch (error) {
            console.error('[字幕侧边栏] 获取字幕失败:', error);
            return null;
        }
    }

    /**
     * 初始化脚本
     */
    async function init() {
        console.log('[字幕侧边栏] ========================================');
        console.log('[字幕侧边栏] 初始化开始...');
        console.log('[字幕侧边栏] 当前 URL:', location.href);

        // 检查是否在视频页面
        const isVideoPage = location.href.match(/bilibili\.com\/(video|bangumi\/play)/);
        console.log('[字幕侧边栏] 是否视频页面:', !!isVideoPage);

        if (!isVideoPage) {
            console.log('[字幕侧边栏] 非视频页面,跳过初始化');
            return;
        }

        // 获取视频信息
        console.log('[字幕侧边栏] 等待获取视频信息...');
        const videoInfo = await getVideoInfo();

        if (!videoInfo) {
            console.error('[字幕侧边栏] 无法获取视频信息,终止初始化');
            return;
        }

        console.log(`[字幕侧边栏] 视频信息: aid=${videoInfo.aid}, cid=${videoInfo.cid}, bvid=${videoInfo.bvid}`);

        // 等待视频元素加载
        console.log('[字幕侧边栏] 等待视频元素...');
        waitForVideo(async (video) => {
            console.log('[字幕侧边栏] ✓ 视频元素已加载');
            videoElement = video;

            // 检查并获取字幕
            console.log('[字幕侧边栏] 开始获取字幕...');
            const subtitles = await checkAndFetchSubtitles(videoInfo.aid, videoInfo.cid);

            console.log('[字幕侧边栏] 字幕获取结果:', subtitles ? `${subtitles.length} 条` : 'null');

            if (subtitles && subtitles.length > 0) {
                currentSubtitles = subtitles;
                console.log(`[字幕侧边栏] ✓ 成功加载 ${subtitles.length} 条字幕`);

                // 创建浮动按钮
                console.log('[字幕侧边栏] 创建浮动按钮...');
                createToggleButton();

                // 创建侧边栏(但不显示)
                console.log('[字幕侧边栏] 创建侧边栏...');
                createSidebar();
                renderSubtitles(subtitles);

                // 启动字幕同步
                console.log('[字幕侧边栏] 启动字幕同步...');
                syncSubtitles();

                console.log('[字幕侧边栏] ✓✓✓ 初始化完成 ✓✓✓');
            } else {
                console.log('[字幕侧边栏] ✗ 视频无字幕,不显示浮动按钮');
            }
        });
    }

    // ==================== 启动 ====================

    // 延迟启动,确保页面加载完成
    setTimeout(init, 1000);

})();
