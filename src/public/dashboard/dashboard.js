(function () {
  'use strict';

  var METRICS_URL = '/metrics';
  var STORAGE_KEY = 'gtd-metrics-token';
  var HISTORY_LENGTH = 30;
  var STATUS_ORDER = ['2xx', '3xx', '4xx', '5xx', '1xx'];

  var els = {};
  [
    'service-line', 'status-pill', 'auth-card', 'token-form', 'token-input', 'disconnect', 'error',
    'metrics', 'uptime', 'started', 'req-total', 'req-inflight', 'req-avg', 'mem-rss', 'mem-heap',
    'mem-bar', 'mem-chart', 'sys-load', 'sys-free', 'status-rows', 'updated', 'interval',
  ].forEach(function (id) {
    els[id] = document.getElementById(id);
  });

  var token = readStoredToken();
  var timer = null;
  var heapHistory = [];

  function readStoredToken() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function storeToken(value) {
    try {
      if (value) {
        window.sessionStorage.setItem(STORAGE_KEY, value);
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      /* sessionStorage недоступен — токен живёт только в переменной */
    }
  }

  function formatDuration(totalSeconds) {
    var d = Math.floor(totalSeconds / 86400);
    var h = Math.floor((totalSeconds % 86400) / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var parts = [];
    if (d) parts.push(d + ' д');
    if (d || h) parts.push(h + ' ч');
    if (d || h || m) parts.push(m + ' мин');
    parts.push(s + ' с');
    return parts.join(' ');
  }

  function setText(id, value) {
    els[id].textContent = value;
  }

  function setStatus(state, label) {
    els['status-pill'].dataset.state = state;
    els['status-pill'].textContent = label;
  }

  function showError(message) {
    els.error.textContent = message;
    els.error.hidden = !message;
  }

  function renderStatusRows(byClass, total) {
    var tbody = els['status-rows'];
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    STATUS_ORDER.forEach(function (name) {
      var count = byClass[name] || 0;
      var share = total ? Math.round((count / total) * 1000) / 10 : 0;
      var row = document.createElement('tr');
      var cells = [name, String(count), null];
      cells.forEach(function (text, index) {
        var cell = document.createElement('td');
        if (index === 2) {
          cell.className = 'share';
          var bar = document.createElement('div');
          bar.className = 'bar';
          var fill = document.createElement('span');
          fill.style.width = share + '%';
          bar.appendChild(fill);
          var label = document.createElement('small');
          label.textContent = share + '%';
          cell.appendChild(bar);
          cell.appendChild(label);
        } else {
          cell.textContent = text;
        }
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  }

  function renderChart(values) {
    var svg = els['mem-chart'];
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (values.length < 2) return;
    var max = Math.max.apply(null, values) * 1.1 || 1;
    var step = 240 / (HISTORY_LENGTH - 1);
    var offset = (HISTORY_LENGTH - values.length) * step;
    var points = values.map(function (value, index) {
      return (offset + index * step).toFixed(1) + ',' + (46 - (value / max) * 44).toFixed(1);
    });
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points.join(' '));
    svg.appendChild(line);
  }

  function render(data) {
    var memory = data.process.memory;
    setText('service-line', data.service.name + ' v' + data.service.version + ' · ' + data.service.environment +
      ' · release ' + String(data.service.release).slice(0, 8));
    setStatus('ok', 'работает');
    setText('uptime', formatDuration(data.uptimeSeconds));
    setText('started', 'Node ' + data.process.node + ', PID ' + data.process.pid);
    setText('req-total', String(data.requests.total));
    setText('req-inflight', String(data.requests.inFlight));
    setText('req-avg', data.requests.averageDurationMs + ' мс');
    setText('mem-rss', memory.rssMb + ' МБ');
    setText('mem-heap', memory.heapUsedMb + ' / ' + memory.heapTotalMb + ' МБ');
    els['mem-bar'].style.width = Math.min(100, (memory.heapUsedMb / memory.heapTotalMb) * 100) + '%';
    setText('sys-load', data.system.loadAverage.join(' / '));
    setText('sys-free', data.system.freeMemoryMb + ' из ' + data.system.totalMemoryMb + ' МБ');
    renderStatusRows(data.requests.byStatusClass, data.requests.total);
    heapHistory.push(memory.heapUsedMb);
    if (heapHistory.length > HISTORY_LENGTH) heapHistory.shift();
    renderChart(heapHistory);
    setText('updated', 'обновлено: ' + new Date(data.timestamp).toLocaleTimeString('ru-RU'));
  }

  function explain(status) {
    if (status === 401) return 'Токен не принят (401). Проверьте METRICS_TOKEN или войдите администратором.';
    if (status === 403) return 'Недостаточно прав (403): нужна роль admin.';
    if (status === 429) return 'Слишком много попыток (429). Подождите и повторите.';
    return 'Сервер ответил кодом ' + status + '.';
  }

  function disconnect(message) {
    token = '';
    storeToken('');
    heapHistory = [];
    stopPolling();
    els.metrics.hidden = true;
    els['auth-card'].hidden = false;
    els.disconnect.hidden = true;
    setStatus('idle', 'нет данных');
    showError(message || '');
  }

  function poll() {
    if (!token) return;
    fetch(METRICS_URL, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', credentials: 'omit' })
      .then(function (response) {
        if (!response.ok) {
          var failure = new Error(explain(response.status));
          failure.status = response.status;
          throw failure;
        }
        return response.json();
      })
      .then(function (data) {
        showError('');
        els['auth-card'].hidden = true;
        els.metrics.hidden = false;
        els.disconnect.hidden = false;
        render(data);
      })
      .catch(function (error) {
        if (error.status === 401 || error.status === 403 || error.status === 429) {
          disconnect(error.message);
          return;
        }
        setStatus('error', 'нет связи');
        showError(error.status ? error.message : 'Сервер недоступен.');
      });
  }

  function stopPolling() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startPolling() {
    stopPolling();
    poll();
    var period = Number(els.interval.value);
    if (period > 0) timer = window.setInterval(poll, period);
  }

  els['token-form'].addEventListener('submit', function (event) {
    event.preventDefault();
    token = els['token-input'].value.trim();
    els['token-input'].value = '';
    storeToken(token);
    showError('');
    startPolling();
  });

  els.disconnect.addEventListener('click', function () {
    disconnect('');
  });

  els.interval.addEventListener('change', function () {
    if (token) startPolling();
  });

  if (token) {
    startPolling();
  }
})();
