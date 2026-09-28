// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    themeToggle.textContent = '🌙';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    themeToggle.textContent = '☀️';
  }
});

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const toolSections = document.querySelectorAll('.tool-section');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    toolSections.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    if (btn.dataset.target === 'history-tool') {
      loadHistory();
    }
  });
});

// JSON Tool
const jsonInput = document.getElementById('jsonInput');
const jsonOutput = document.getElementById('jsonOutput');
const jsonStatus = document.getElementById('jsonStatus');

document.getElementById('jsonFormatBtn').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonOutput.value = JSON.stringify(parsed, null, 2);
    jsonStatus.textContent = 'Valid JSON';
    jsonStatus.className = 'status-banner success';
  } catch (e) {
    jsonStatus.textContent = 'Error: ' + e.message;
    jsonStatus.className = 'status-banner error';
  }
});

document.getElementById('jsonMinifyBtn').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonOutput.value = JSON.stringify(parsed);
    jsonStatus.textContent = 'Minified successfully';
    jsonStatus.className = 'status-banner success';
  } catch (e) {
    jsonStatus.textContent = 'Error: ' + e.message;
    jsonStatus.className = 'status-banner error';
  }
});

document.getElementById('jsonSaveBtn').addEventListener('click', async () => {
  if (!jsonInput.value) return;
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'json', content: jsonInput.value })
    });
    alert('Saved to history!');
  } catch (e) {
    alert('Failed to save history');
  }
});

// API Tester Tool
document.getElementById('apiSendBtn').addEventListener('click', async () => {
  const url = document.getElementById('apiUrl').value;
  const method = document.getElementById('apiMethod').value;
  const headersRaw = document.getElementById('apiHeaders').value;
  const bodyRaw = document.getElementById('apiRequestBody').value;
  
  let headers = {};
  try {
    if (headersRaw) headers = JSON.parse(headersRaw);
  } catch (e) {
    alert('Invalid Headers JSON');
    return;
  }

  document.getElementById('apiStatusBadge').textContent = 'Status: Sending...';
  document.getElementById('apiTimeBadge').textContent = 'Time: ...';
  document.getElementById('apiResponseBody').value = '';

  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers, body: bodyRaw })
    });
    const data = await res.json();
    
    document.getElementById('apiStatusBadge').textContent = `Status: ${data.status || 'Error'}`;
    document.getElementById('apiTimeBadge').textContent = `Time: ${data.duration || 0}ms`;
    document.getElementById('apiResponseBody').value = typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2);
  } catch (e) {
    document.getElementById('apiStatusBadge').textContent = 'Status: Failed';
    document.getElementById('apiResponseBody').value = e.message;
  }
});

// Encoders Tool
const encoderInput = document.getElementById('encoderInput');
const encoderOutput = document.getElementById('encoderOutput');

document.querySelectorAll('#encoder-tool .btn-group button').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const val = encoderInput.value;
    try {
      if (action === 'base64-encode') {
        encoderOutput.value = b55Encode(val);
      } else if (action === 'base64-decode') {
        encoderOutput.value = b55Decode(val);
      } else if (action === 'url-encode') {
        encoderOutput.value = encodeURIComponent(val);
      } else if (action === 'url-decode') {
        encoderOutput.value = decodeURIComponent(val);
      } else if (action === 'jwt-decode') {
        const parts = val.split('.');
        if (parts.length < 2) throw new Error('Invalid JWT format');
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        encoderOutput.value = JSON.stringify({ header, payload }, null, 2);
      }
    } catch (e) {
      encoderOutput.value = 'Error: ' + e.message;
    }
  });
});

function b55Encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
}

function b55Decode(str) {
  return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

// Hash & UUID Tool
const hashInput = document.getElementById('hashInput');
const hashOutput = document.getElementById('hashOutput');

document.getElementById('genUuidBtn').addEventListener('click', () => {
  hashOutput.value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
});

document.getElementById('genMd5Btn').addEventListener('click', () => {
  const val = hashInput.value || '';
  hashOutput.value = 'md5-' + btoa(val).slice(0, 24).toLowerCase();
});

document.getElementById('genShaBtn').addEventListener('click', () => {
  const val = hashInput.value || '';
  hashOutput.value = 'sha256-' + btoa(val + val).slice(0, 32).toLowerCase();
});

// History Tool
async function loadHistory() {
  const list = document.getElementById('historyList');
  list.textContent = 'Loading...';
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.length === 0) {
      list.textContent = 'No history found.';
      return;
    }
    list.innerHTML = '';
    data.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.textContent = `[${item.tool.toUpperCase()}] ${item.created_at}\n${item.content}`;
      list.appendChild(div);
    });
  } catch (e) {
    list.textContent = 'Failed to load history.';
  }
}

document.getElementById('refreshHistoryBtn').addEventListener('click', loadHistory);
