/* Cloud iNIT — in-page download progress
 * ----------------------------------------------------------------------------
 * Used on the final download pages (download/<batch>-<mode>-<os>.html).
 *
 * The progress panel is hidden until the visitor clicks the download button.
 * On click the installer is streamed with fetch() so the page can show real
 * progress: percent, bytes, speed and time remaining. When the stream ends,
 * the received size is checked against the expected size and the file is
 * handed to the browser's save dialog.
 *
 * Reading the response cross-origin needs CORS on the storage bucket. If the
 * bucket refuses (or fetch/streams are unavailable) the script falls back to
 * a normal browser download so the visitor always gets the file, and the
 * panel says where to watch it instead of inventing a percentage.
 *
 * Without JavaScript the button is a plain link and still works.
 */
(function () {
  'use strict';

  var btn = document.querySelector('[data-dlx-url]');
  var root = document.querySelector('[data-dlx-prog]');
  if (!btn || !root) return;

  var $ = function (k) { return root.querySelector('[data-k="' + k + '"]'); };
  var el = {
    state: $('state'), pct: $('pct'), track: $('track'), fill: $('fill'),
    bytes: $('bytes'), speed: $('speed'), eta: $('eta'), msg: $('msg'),
    cancel: $('cancel'), retry: $('retry'), save: $('save'),
    stages: root.querySelectorAll('[data-s]')
  };

  var url = btn.getAttribute('href');
  var expected = parseInt(btn.getAttribute('data-size'), 10) || 0;
  var fileName = btn.getAttribute('data-name') || 'CloudINIT-installer';
  var ctrl = null;       // AbortController for the active transfer
  var blobUrl = null;    // object URL of the finished file
  var busy = false;

  /* ---------------------------------------------------------- formatting */
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }
  function rate(bps) {
    return bps >= 1048576 ? (bps / 1048576).toFixed(1) + ' MB/s'
                          : Math.max(0, bps / 1024).toFixed(0) + ' KB/s';
  }
  function eta(sec) {
    if (!isFinite(sec) || sec < 0) return '—';
    if (sec < 1) return '< 1s';
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m ? m + 'm ' + (s < 10 ? '0' : '') + s + 's' : s + 's';
  }

  /* ------------------------------------------------------------- view */
  function stage(name) {
    var reached = true;
    for (var i = 0; i < el.stages.length; i++) {
      var li = el.stages[i];
      var isNow = li.getAttribute('data-s') === name;
      li.classList.toggle('is-now', isNow);
      li.classList.toggle('is-done', reached && !isNow);
      if (isNow) reached = false;
    }
  }
  function mode(m) { root.setAttribute('data-mode', m); }
  function progress(got, total) {
    var p = total ? Math.min(100, (got / total) * 100) : 0;
    el.fill.style.transform = 'scaleX(' + (p / 100) + ')';
    el.pct.textContent = Math.floor(p) + '%';
    el.track.setAttribute('aria-valuenow', String(Math.floor(p)));
    el.bytes.textContent = mb(got) + ' / ' + (total ? mb(total) : '?');
  }
  function show(id, on) { el[id].hidden = !on; }
  function say(state, msg) {
    el.state.textContent = state;
    el.msg.textContent = msg || '';
  }

  function reset() {
    mode('run');
    progress(0, expected);
    el.speed.textContent = '—';
    el.eta.textContent = '—';
    show('cancel', true); show('retry', false); show('save', false);
    root.hidden = false;
    btn.classList.add('is-busy');
    btn.setAttribute('aria-disabled', 'true');
  }
  function idle() {
    busy = false;
    btn.classList.remove('is-busy');
    btn.removeAttribute('aria-disabled');
    show('cancel', false);
  }

  /* --------------------------------------------------- fallback: browser */
  function handoff() {
    // Let the browser download it natively. Progress can't be read here,
    // so the bar runs in an indeterminate state and the copy says so.
    mode('handoff');
    stage('save');
    el.pct.textContent = '';
    el.bytes.textContent = mb(expected);
    el.speed.textContent = 'browser';
    el.eta.textContent = '—';
    say('Downloading in your browser',
        'Your browser is downloading the file now. Track it in the browser\'s downloads list ' +
        '(Ctrl+J on Windows, ⌥⌘L in Safari, ⇧⌘J in Chrome on Mac).');
    var a = document.createElement('a');
    a.href = url; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    idle();
    show('retry', true);
    el.retry.textContent = 'Download again';
  }

  /* ---------------------------------------------------- main: streamed */
  function start() {
    if (busy) return;
    busy = true;
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    reset();
    stage('connect');
    say('Connecting to storage…', '');
    root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (!window.fetch || !window.ReadableStream || !window.AbortController) { handoff(); return; }

    ctrl = new AbortController();
    var t0 = 0, lastT = 0, lastGot = 0, speed = 0, got = 0, total = expected;

    fetch(url, { signal: ctrl.signal, mode: 'cors', cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        if (!res.body) throw new TypeError('no stream');
        var len = parseInt(res.headers.get('content-length'), 10);
        if (len > 0) total = len;
        stage('fetch');
        say('Downloading…', '');
        t0 = lastT = performance.now();

        var reader = res.body.getReader();
        var chunks = [];
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return chunks;
            chunks.push(r.value);
            got += r.value.length;
            var now = performance.now();
            if (now - lastT > 250) {
              var inst = (got - lastGot) / ((now - lastT) / 1000);
              speed = speed ? speed * 0.7 + inst * 0.3 : inst; // smoothed
              lastT = now; lastGot = got;
              el.speed.textContent = rate(speed);
              el.eta.textContent = eta((total - got) / speed);
            }
            progress(got, total);
            return pump();
          });
        }
        return pump();
      })
      .then(function (chunks) {
        stage('verify');
        say('Verifying…', '');
        progress(got, total);
        if (total && got !== total) {
          throw new Error('size mismatch: got ' + got + ' of ' + total + ' bytes');
        }
        var secs = (performance.now() - t0) / 1000;
        var blob = new Blob(chunks, { type: 'application/octet-stream' });
        blobUrl = URL.createObjectURL(blob);
        el.save.href = blobUrl;
        el.save.download = fileName;

        stage('done');
        mode('done');
        el.speed.textContent = rate(got / Math.max(secs, 0.001)) + ' avg';
        el.eta.textContent = 'done in ' + eta(secs);
        say('Download complete',
            fileName + ' (' + mb(got) + ') is ready. If the save dialog did not appear, use "Save file" below. ' +
            'Then follow the install steps further down this page.');
        el.save.click();
        idle();
        show('save', true);
        show('retry', true);
        el.retry.textContent = 'Download again';
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') {
          mode('error');
          say('Download cancelled', 'Nothing was saved. Click retry to start again.');
          idle(); show('retry', true); el.retry.textContent = 'Retry';
          return;
        }
        // CORS refused / network blocked before any bytes: hand to browser.
        if (err instanceof TypeError && got === 0) { handoff(); return; }
        mode('error');
        say('Download failed', 'Something interrupted the transfer (' + (err && err.message || 'unknown error') +
            '). Check your connection and retry.');
        idle(); show('retry', true); el.retry.textContent = 'Retry';
      });
  }

  btn.addEventListener('click', function (e) {
    // Leave modified clicks (new tab, save link as…) to the browser.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    start();
  });
  el.cancel.addEventListener('click', function () { if (ctrl) ctrl.abort(); });
  el.retry.addEventListener('click', start);

  // Leaving the page mid-transfer would throw the download away.
  window.addEventListener('beforeunload', function (e) {
    if (busy && root.getAttribute('data-mode') === 'run') { e.preventDefault(); e.returnValue = ''; }
  });
})();
