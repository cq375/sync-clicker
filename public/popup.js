/**
 * Popup 界面逻辑
 */

const executeBtn = document.getElementById('executeBtn');
const resetBtn = document.getElementById('resetBtn');
const lighterStatus = document.getElementById('lighterStatus');
const variationalStatus = document.getElementById('variationalStatus');
const feedback = document.getElementById('feedback');

// 初始化
async function init() {
  console.log('[Popup] Initializing...');

  // 检查状态
  await updateStatus();

  // 绑定事件
  executeBtn.addEventListener('click', executeSyncClick);
  resetBtn.addEventListener('click', resetSelection);

  // 定期更新状态
  setInterval(updateStatus, 1000);
}

// 更新状态
async function updateStatus() {
  try {
    // 从 storage 读取状态
    const result = await chrome.storage.local.get(['lighter_button_saved', 'variational_button_saved']);

    const lighterReady = result.lighter_button_saved || false;
    const variationalReady = result.variational_button_saved || false;

    // 更新 UI
    updateStatusBadge(lighterStatus, lighterReady);
    updateStatusBadge(variationalStatus, variationalReady);

    // 更新执行按钮
    if (lighterReady && variationalReady) {
      executeBtn.disabled = false;
      executeBtn.textContent = '⚡ 执行同步点击';
    } else {
      executeBtn.disabled = true;
      executeBtn.textContent = '请先选择提交按钮';
    }

  } catch (error) {
    console.error('[Popup] Error updating status:', error);
  }
}

// 更新状态徽章
function updateStatusBadge(element, isReady) {
  if (isReady) {
    element.textContent = '✅ 已就绪';
    element.className = 'status-badge status-ready';
  } else {
    element.textContent = '❌ 未就绪';
    element.className = 'status-badge status-not-ready';
  }
}

// 执行同步点击
async function executeSyncClick() {
  try {
    console.log('[Popup] Executing sync click...');

    executeBtn.disabled = true;
    executeBtn.textContent = '⏳ 执行中...';

    // 发送消息给 background
    await chrome.runtime.sendMessage({
      type: 'EXECUTE_SYNC_CLICK'
    });

    // 显示成功反馈
    showFeedback('✅ 同步点击已执行！', 'success');

    // 恢复按钮
    setTimeout(() => {
      executeBtn.disabled = false;
      executeBtn.textContent = '⚡ 执行同步点击';
    }, 2000);

  } catch (error) {
    console.error('[Popup] Error executing sync click:', error);
    showFeedback('❌ 执行失败: ' + error.message, 'error');

    executeBtn.disabled = false;
    executeBtn.textContent = '⚡ 执行同步点击';
  }
}

// 重置选择
async function resetSelection() {
  const confirmed = confirm('确定要重新选择提交按钮吗？\n这将清除当前保存的按钮。');

  if (!confirmed) return;

  try {
    // 清除 storage
    await chrome.storage.local.remove(['lighter_button_saved', 'variational_button_saved']);

    // 刷新两个页面
    const [lighterTabs, variationalTabs] = await Promise.all([
      chrome.tabs.query({ url: '*://app.lighter.xyz/*' }),
      chrome.tabs.query({ url: ['*://variational.io/*', '*://*.variational.io/*', '*://omni.variational.io/*'] }),
    ]);

    const reloadPromises = [];

    if (lighterTabs.length > 0) {
      reloadPromises.push(chrome.tabs.reload(lighterTabs[0].id));
    }

    if (variationalTabs.length > 0) {
      reloadPromises.push(chrome.tabs.reload(variationalTabs[0].id));
    }

    await Promise.all(reloadPromises);

    showFeedback('✅ 已重置，请重新选择按钮', 'success');

    // 更新状态
    await updateStatus();

  } catch (error) {
    console.error('[Popup] Error resetting:', error);
    showFeedback('❌ 重置失败: ' + error.message, 'error');
  }
}

// 显示反馈
function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = 'show';

  setTimeout(() => {
    feedback.className = '';
  }, 2000);
}

// 初始化
init();
