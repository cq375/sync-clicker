/**
 * Background Service Worker
 * 负责协调两个页面的同步点击
 */

console.log('[Background] Service worker loaded');

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message);

  if (message.type === 'EXECUTE_SYNC_CLICK') {
    executeSyncClick();
    sendResponse({ success: true });
  }

  return true;
});

/**
 * 执行同步点击
 */
async function executeSyncClick() {
  try {
    console.log('[Background] Starting sync click...');

    // 1. 查询两个平台的标签页
    const [lighterTabs, variationalTabs] = await Promise.all([
      chrome.tabs.query({ url: '*://app.lighter.xyz/*' }),
      chrome.tabs.query({ url: ['*://variational.io/*', '*://*.variational.io/*', '*://omni.variational.io/*'] }),
    ]);

    console.log('[Background] Found tabs:', {
      lighter: lighterTabs.length,
      variational: variationalTabs.length
    });

    if (lighterTabs.length === 0) {
      throw new Error('未找到 Lighter 标签页！请确保已打开 https://app.lighter.xyz');
    }

    if (variationalTabs.length === 0) {
      throw new Error('未找到 Variational 标签页！请确保已打开 https://omni.variational.io');
    }

    const lighterTab = lighterTabs[0];
    const variationalTab = variationalTabs[0];

    // 2. 计算同步时间戳（300ms 后）
    const syncTimestamp = Date.now() + 300;

    console.log('[Background] Sync timestamp:', syncTimestamp);
    console.log('[Background] Current time:', Date.now());
    console.log('[Background] Delay: 300ms');

    // 3. 同时发送点击指令给两个标签页
    const promises = [
      chrome.tabs.sendMessage(lighterTab.id, {
        type: 'SYNC_CLICK',
        syncTimestamp: syncTimestamp
      }),
      chrome.tabs.sendMessage(variationalTab.id, {
        type: 'SYNC_CLICK',
        syncTimestamp: syncTimestamp
      })
    ];

    await Promise.all(promises);

    console.log('[Background] ✓ Sync click commands sent to both tabs');

  } catch (error) {
    console.error('[Background] Error executing sync click:', error);
    throw error;
  }
}
