# B站字幕侧边栏 - 油猴脚本

一个用于在B站视频页面右侧显示字幕列表的油猴脚本,支持点击跳转和自动同步高亮。

## 功能特性

- **自动检测**: 自动检测B站视频是否有字幕,如有则显示浮动按钮
- **侧边栏显示**: 点击右下角浮动按钮展开/收起字幕侧边栏
- **完整字幕列表**: 显示所有字幕内容及其时间戳
- **点击跳转**: 点击任意字幕,视频跳转到对应时间点并自动播放
- **自动同步**: 视频播放时自动高亮当前字幕并滚动到可视区域
- **极简 UI**: 灰色系设计,类似 VSCode 风格,美观简洁

## 安装方法

### 1. 安装油猴插件

首先需要在浏览器中安装油猴扩展:

- **Chrome/Edge**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) 或 [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- **Safari**: [Tampermonkey](https://apps.apple.com/app/tampermonkey/id1482490089)

### 2. 安装脚本

1. 点击油猴图标,选择"添加新脚本"
2. 删除默认内容
3. 复制 `bilibili_subtitle_sidebar.user.js` 的全部内容
4. 粘贴到编辑器中
5. 按 `Ctrl+S` (Mac: `Cmd+S`) 保存

或直接在油猴中点击"文件" → "从 URL 安装",然后选择本地文件。

## 使用方法

1. 访问B站视频页面 (如: https://www.bilibili.com/video/BV1SGA3eLEqu)
2. 如果视频有字幕,右下角会出现一个粉红色的💬浮动按钮
3. 点击按钮,右侧会展开字幕列表侧边栏
4. 点击任意字幕项,视频会跳转到对应时间点
5. 播放视频时,当前字幕会自动高亮(蓝色背景)

## 技术架构

### 技术栈

- **平台**: Tampermonkey / Violentmonkey
- **版本**: Manifest V2
- **API 调用**: GM_xmlhttpRequest (绕过 CORS)
- **样式注入**: GM_addStyle
- **DOM 操作**: 原生 JavaScript

### 核心功能实现

#### 1. 获取视频信息

从页面 `window.__INITIAL_STATE__` 提取 `aid`、`cid`、`bvid`:

```javascript
const initialState = window.__INITIAL_STATE__;
const { aid, cid, bvid } = initialState;
```

#### 2. 获取字幕列表

调用 B站 API:

```
GET https://api.bilibili.com/x/player/wbi/v2?aid={aid}&cid={cid}
```

#### 3. 下载字幕内容

```
GET https:{subtitle_url}
```

#### 4. 视频同步

监听视频 `timeupdate` 事件,高亮当前字幕并滚动:

```javascript
video.addEventListener('timeupdate', () => {
  const currentTime = video.currentTime;
  const index = subtitles.findIndex(sub =>
    currentTime >= sub.from && currentTime <= sub.to
  );
  if (index !== currentIndex && index !== -1) {
    currentIndex = index;
    highlightSubtitle(index);
    scrollToSubtitle(index);
  }
});
```

## UI 设计

### 配色方案

```css
--bg-primary: #fafafa;      /* 主背景 */
--bg-hover: #f0f0f0;        /* 悬停背景 */
--bg-active: #e3f2fd;       /* 激活背景 */
--text-primary: #333;       /* 主文字 */
--text-secondary: #999;     /* 次要文字 */
--accent-color: #1976d2;    /* 强调色 */
--border-color: #e0e0e0;    /* 边框颜色 */
```

### 侧边栏规格

- **宽度**: 320px
- **位置**: 右侧固定,距离顶部 100px
- **最大高度**: calc(100vh - 120px)
- **背景**: rgba(250, 250, 250, 0.95) + 毛玻璃效果
- **圆角**: 8px
- **阴影**: 0 2px 12px rgba(0, 0, 0, 0.1)

## 测试用例

推荐使用以下视频进行测试:

1. **有字幕视频**: [BV1SGA3eLEqu](https://www.bilibili.com/video/BV1SGA3eLEqu) (包含 AI 自动生成字幕)
2. **无字幕视频**: 需要找一个没有字幕的视频进行测试
3. **多语言字幕**: 如果有包含多种语言的视频

## 调试方法

打开浏览器控制台 (F12),所有日志都以 `[字幕侧边栏]` 前缀开头:

```javascript
// 查看当前字幕数据
console.log('[字幕侧边栏] 成功加载 123 条字幕');

// 查看视频信息
console.log('[字幕侧边栏] 视频信息: aid=xxx, cid=xxx, bvid=xxx');

// 查看错误信息
console.error('[字幕侧边栏] 获取字幕失败:', error);
```

## 已知问题

1. **无字幕视频**: 脚本会自动检测,无字幕时不显示浮动按钮
2. **API 限流**: 如果频繁请求可能触发限流,建议正常使用
3. **动态页面**: 部分 B站页面使用动态加载,脚本会自动等待视频元素加载

## 开发计划

- [x] 基础功能: 获取字幕列表
- [x] 基础功能: 显示字幕侧边栏
- [x] 交互功能: 点击字幕跳转
- [x] 交互功能: 自动同步高亮
- [x] UI 设计: 极简风格界面
- [ ] 高级功能: 多字幕语言切换
- [ ] 高级功能: 字幕搜索功能
- [ ] 高级功能: 导出字幕为文本

## 参考资源

- **B站 API 文档**: https://github.com/SocialSisterYi/bilibili-API-collect
- **参考项目**: https://github.com/IndieKKY/bilibili-subtitle
- **油猴官方文档**: https://www.tampermonkey.net/documentation.php

## 许可证

MIT License

## 作者

YourName

## 更新日志

### v1.0.0 (2025-02-26)

- 初始版本发布
- 支持自动检测字幕
- 支持点击跳转
- 支持自动同步高亮
- 极简 UI 设计
