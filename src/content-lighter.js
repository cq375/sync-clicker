/**
 * Lighter 页面内容脚本 - 增强版
 */

let selectedButton = null;
let buttonSelector = null; // 保存按钮的 CSS 选择器
let floatingButton = null;
let selectionMode = false;

// 初始化
function init() {
  console.log('[Lighter Sync] Content script loaded');

  // 从 storage 恢复按钮选择器
  chrome.storage.local.get(['lighter_button_selector'], (result) => {
    if (result.lighter_button_selector) {
      buttonSelector = result.lighter_button_selector;
      console.log('[Lighter Sync] Restored button selector:', buttonSelector);

      // 尝试找到按钮
      try {
        selectedButton = document.querySelector(buttonSelector);
        if (selectedButton) {
          console.log('[Lighter Sync] ✓ Button found using saved selector');
        }
      } catch (e) {
        console.warn('[Lighter Sync] Could not find button with selector:', buttonSelector);
      }
    }
  });

  createFloatingButton();

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Lighter Sync] Received message:', message);

    if (message.type === 'ENTER_SELECTION_MODE') {
      enterSelectionMode();
      sendResponse({ success: true });
    } else if (message.type === 'SYNC_CLICK') {
      performSyncClick(message.syncTimestamp)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 异步响应
    } else if (message.type === 'GET_STATUS') {
      sendResponse({
        hasSelectedButton: selectedButton !== null || buttonSelector !== null,
        platform: 'lighter'
      });
    }

    return true;
  });
}

// 创建悬浮按钮
function createFloatingButton() {
  // 避免重复创建
  if (document.getElementById('sync-clicker-float-btn')) {
    return;
  }

  floatingButton = document.createElement('div');
  floatingButton.id = 'sync-clicker-float-btn';
  floatingButton.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      cursor: pointer;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      user-select: none;
      transition: all 0.3s ease;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <div id="sync-btn-text">🎯 选择提交按钮</div>
      <div id="sync-btn-status" style="font-size: 11px; margin-top: 4px; opacity: 0.9;"></div>
    </div>
  `;

  document.body.appendChild(floatingButton);

  floatingButton.addEventListener('click', () => {
    if (!selectedButton && !buttonSelector) {
      enterSelectionMode();
    } else {
      updateFloatingButtonStatus();
    }
  });

  updateFloatingButtonStatus();
}

// 进入选择模式
function enterSelectionMode() {
  selectionMode = true;

  document.getElementById('sync-btn-text').textContent = '👆 请点击提交按钮';
  document.getElementById('sync-btn-status').textContent = '选择模式已激活';

  document.addEventListener('click', handleButtonSelection, true);
  document.addEventListener('mouseover', highlightElement);
  document.addEventListener('mouseout', removeHighlight);
}

// 生成元素的唯一 CSS 选择器
function getElementSelector(element) {
  // 如果有 ID，直接使用
  if (element.id) {
    return `#${element.id}`;
  }

  // 使用类名 + nth-child
  let path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = current.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // 添加 nth-child
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// 处理按钮选择
function handleButtonSelection(e) {
  if (!selectionMode) return;

  e.preventDefault();
  e.stopPropagation();

  selectedButton = e.target;
  buttonSelector = getElementSelector(selectedButton);

  console.log('[Lighter Sync] Button selected:', selectedButton);
  console.log('[Lighter Sync] Selector:', buttonSelector);

  exitSelectionMode();
  updateFloatingButtonStatus();

  // 保存到 storage
  chrome.storage.local.set({
    lighter_button_saved: true,
    lighter_button_selector: buttonSelector
  });

  alert('✅ Lighter 提交按钮已保存！\n请在 Variational 页面也选择一次提交按钮。');
}

// 退出选择模式
function exitSelectionMode() {
  selectionMode = false;

  document.removeEventListener('click', handleButtonSelection, true);
  document.removeEventListener('mouseover', highlightElement);
  document.removeEventListener('mouseout', removeHighlight);
}

// 高亮元素
function highlightElement(e) {
  if (!selectionMode) return;
  if (e.target === floatingButton || floatingButton.contains(e.target)) return;

  e.target.style.outline = '3px solid #667eea';
  e.target.style.outlineOffset = '2px';
}

// 移除高亮
function removeHighlight(e) {
  if (!selectionMode) return;

  e.target.style.outline = '';
  e.target.style.outlineOffset = '';
}

// 更新悬浮按钮状态
function updateFloatingButtonStatus() {
  const textEl = document.getElementById('sync-btn-text');
  const statusEl = document.getElementById('sync-btn-status');

  if (!textEl || !statusEl) return;

  if (selectedButton || buttonSelector) {
    textEl.textContent = '✅ Lighter 已就绪';
    statusEl.textContent = '等待同步点击...';
  } else {
    textEl.textContent = '🎯 选择提交按钮';
    statusEl.textContent = '点击此处开始';
  }
}

// 执行同步点击 - 增强版
async function performSyncClick(syncTimestamp) {
  console.log('[Lighter Sync] performSyncClick called');
  console.log('[Lighter Sync] Current time:', Date.now());
  console.log('[Lighter Sync] Sync timestamp:', syncTimestamp);

  // 尝试找到按钮
  let button = selectedButton;

  // 如果按钮引用失效，使用选择器重新查找
  if (!button && buttonSelector) {
    console.log('[Lighter Sync] Button reference lost, trying to find using selector...');
    try {
      button = document.querySelector(buttonSelector);
      if (button) {
        selectedButton = button;
        console.log('[Lighter Sync] ✓ Button found using selector');
      }
    } catch (e) {
      console.error('[Lighter Sync] Error finding button:', e);
    }
  }

  if (!button) {
    const error = 'No button selected or button not found!';
    console.error('[Lighter Sync]', error);
    showClickFeedback('❌ 未找到按钮', 'error');
    throw new Error(error);
  }

  // 检查按钮是否可见和可点击
  if (!button.offsetParent) {
    const error = 'Button is not visible';
    console.error('[Lighter Sync]', error);
    showClickFeedback('❌ 按钮不可见', 'error');
    throw new Error(error);
  }

  const delay = syncTimestamp - Date.now();

  console.log(`[Lighter Sync] Scheduled click in ${delay}ms`);

  return new Promise((resolve, reject) => {
    if (delay > 0) {
      setTimeout(() => {
        try {
          const actualTime = Date.now();
          const timeDiff = Math.abs(actualTime - syncTimestamp);

          console.log(`[Lighter Sync] Clicking now!`);
          console.log(`[Lighter Sync] Actual time: ${actualTime}`);
          console.log(`[Lighter Sync] Time diff: ${timeDiff}ms`);

          button.click();
          showClickFeedback('✅ Lighter 已点击！');
          resolve();
        } catch (error) {
          console.error('[Lighter Sync] Click error:', error);
          showClickFeedback('❌ 点击失败', 'error');
          reject(error);
        }
      }, delay);
    } else {
      console.log(`[Lighter Sync] Timestamp已过，立即点击`);
      try {
        button.click();
        showClickFeedback('✅ Lighter 已点击！');
        resolve();
      } catch (error) {
        console.error('[Lighter Sync] Click error:', error);
        showClickFeedback('❌ 点击失败', 'error');
        reject(error);
      }
    }
  });
}

// 显示点击反馈
function showClickFeedback(text, type = 'success') {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(102, 126, 234, 0.95)'};
    color: white;
    padding: 30px 50px;
    border-radius: 20px;
    font-size: 24px;
    font-weight: bold;
    z-index: 9999999;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;
  feedback.textContent = text;

  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
  }, 2000);
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
