// main.js — 起動・タブ切り替え・読み直し（ホームは前回の中身をすぐ出してから最新を取りに行く）
var Main = (function () {
  var CACHE = 'kk_home';
  var TITLES = { home: '健康管理', trend: '📈 推移', food: '🍚 食事', kintore: '💪 筋トレ' };
  var tab = 'home';
  var lastLoad = 0;

  function loadHome() {
    return API.call('home').then(function (res) {
      Home.render(res);
      API.store(CACHE, JSON.stringify(res));
    });
  }

  function loadFood() {
    document.getElementById('foodBody').innerHTML = '<div class="empty"><b>🍚 食事の記録</b>写真で撮る・定番ボタン・今日の合計は<br>11/13（金）に入ります</div>';
    return Promise.resolve();
  }

  function reload() {
    var btn = document.getElementById('reloadBtn');
    btn.classList.add('spin');
    lastLoad = Date.now();
    var p = tab === 'home' ? loadHome() : tab === 'trend' ? Trend.load() : tab === 'kintore' ? Kintore.load() : loadFood();
    return p.catch(function (err) { UI.toast('読めませんでした：' + err.message); })
      .then(function () { btn.classList.remove('spin'); });
  }

  function show(name) {
    if (!TITLES[name]) name = 'home';
    tab = name;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + name; });
    document.getElementById('pageTitle').textContent = TITLES[name];
    history.replaceState(null, '', name === 'home' ? location.pathname : '#' + name);
    window.scrollTo(0, 0);
    reload();
  }

  function start() {
    if (!API.hasKey()) {
      document.getElementById('homeBody').innerHTML = '<div class="empty"><b>鍵がありません</b>クロコから届いた「?k=」付きのURLで1回開いてください</div>';
      return;
    }
    var cached = API.store(CACHE);
    if (cached) { try { Home.render(JSON.parse(cached)); } catch (e) {} }
    // #kintore などで開いたらそのタブから
    show(location.hash.replace('#', '') || 'home');
  }

  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b) return;
    if (b.dataset.tab === tab) { reload(); return; }
    show(b.dataset.tab);
  });
  document.getElementById('reloadBtn').addEventListener('click', reload);

  // ホームの「筋トレを記録する」など、カードから別のタブへ
  document.querySelector('main').addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) show(b.dataset.go);
  });

  // 戻ってきたとき、5分以上たっていたら読み直す（筋トレは入力中なので読み直さない）
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && tab === 'home' && Date.now() - lastLoad > 5 * 60000) reload();
  });

  // アプリとしてインストール
  // 🪤Pixel の Chrome は「︙→ホーム画面に追加」で naoto-web.github.io の新しいアプリを「すでにインストールされています」と誤判定する
  //   ⇒ ページ側からインストール画面を直接呼ぶボタン（beforeinstallprompt）。合図が来たときだけ出す
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    if (document.getElementById('installBtn')) return;
    var b = document.createElement('button');
    b.id = 'installBtn';
    b.className = 'install-btn';
    b.textContent = 'アプリとしてインストール';
    b.addEventListener('click', function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { installEvt = null; b.textContent = 'インストール中…'; }
      }).catch(function () {});
    });
    document.querySelector('.top').insertBefore(b, document.getElementById('reloadBtn'));
  });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('installBtn');
    if (b) b.remove();
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }

  start();
  return { reload: reload, show: show };
})();
