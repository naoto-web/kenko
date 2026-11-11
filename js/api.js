// api.js — GASとの通信。APIキーは公開リポジトリに書かない＝初回だけ ?k=キー で開いて端末に覚えさせる
var API = (function () {
  var URL = 'https://script.google.com/macros/s/AKfycbzb5_PEC3LWMGc0OtUmkd6v9NHcTHLwwN3WFJc0z_6-17dtDQyvI3Wwqg1jUr8NFz0N/exec';
  var KEY_NAME = 'kk_key';

  function store(name, value) {
    try {
      if (value === undefined) return localStorage.getItem(name);
      if (value === null) { localStorage.removeItem(name); return null; }
      localStorage.setItem(name, value);
    } catch (e) { return null; }
  }

  // ?k=… で開いたら覚えて、アドレス欄からは消す
  (function takeKeyFromUrl() {
    var m = location.search.match(/[?&]k=([0-9a-f]{32})/);
    if (!m) return;
    store(KEY_NAME, m[1]);
    history.replaceState(null, '', location.pathname + location.hash);
  })();

  function hasKey() { return !!store(KEY_NAME); }

  function call(action, data) {
    var body = Object.assign({ key: store(KEY_NAME), action: action }, data || {});
    // Content-Type を付けない（text/plain）＝GASへの事前確認（CORS）が起きない
    return fetch(URL, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || '失敗しました');
        return res;
      });
  }

  return { call: call, hasKey: hasKey, store: store };
})();
