/**
 * Source of the `/bootstrap.js` script the canvas HTTP server serves.
 *
 * Defines `window.acquireVsCodeApi` so the existing webview code (which calls
 * `window.acquireVsCodeApi?.()` on boot) gets a WebSocket-backed transport
 * instead of the real VSCode API. Messages from the webview travel through the
 * WebSocket to the canvas server's handlers; replies are dispatched back as
 * `MessageEvent`s on `window`, matching what VSCode's webview API does.
 *
 * The script intentionally runs as a classic script (not a module) so it
 * evaluates before the main bundle's `<script type="module">` is fetched and
 * defines the API by the time `main.tsx` reads it.
 */

export const BOOTSTRAP_SOURCE = `(function () {
  if (typeof window === 'undefined') return;
  var cfg = window.__CC_WF_BOOTSTRAP__ || {};
  if (cfg.locale) {
    window.initialLocale = cfg.locale;
  }
  var ws = new WebSocket(cfg.wsUrl);
  var queue = [];
  ws.addEventListener('open', function () {
    while (queue.length) ws.send(queue.shift());
  });
  ws.addEventListener('message', function (event) {
    var data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      console.error('[ccwf canvas] non-JSON message from server:', event.data);
      return;
    }
    window.dispatchEvent(new MessageEvent('message', { data: data }));
  });
  ws.addEventListener('close', function () {
    console.warn('[ccwf canvas] WebSocket closed. Reload the page to reconnect.');
  });
  window.acquireVsCodeApi = function () {
    return {
      postMessage: function (msg) {
        var payload = JSON.stringify(msg);
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        else queue.push(payload);
      },
      getState: function () { return null; },
      setState: function () {},
    };
  };
})();
`;
