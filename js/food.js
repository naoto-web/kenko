// food.js — 食事＝📷撮る／定番ボタン／その日の記録と合計
// 写真は画面で縮めてから送る → GASがドライブに保存 → PCの分析役（1時間おき）が中身を埋める
var Food = (function () {
  var e = UI.esc;
  var MAX_SIDE = 1600;
  var date = '';
  var data = null;
  // 送る前の写真（確認中）
  var shot = null;
  var sending = false;

  function g(v, k) { return UI.has(v) ? UI.num(v, k) : '—'; }

  function totalCard() {
    var t = data.total, target = data.proteinTarget || 80;
    var p = t.protein || 0;
    var pct = Math.max(0, Math.min(1, p / target)) * 100;
    var left = target - p;
    return '<div class="box"><h2>たんぱく質　<small>' + (left > 0 ? 'あと' + Math.ceil(left) + 'g' : '達成') + '</small></h2>' +
      '<div class="hero"><span class="big">' + Math.round(p) + '<small>g／' + target + 'g</small></span></div>' +
      '<div class="meter"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<div class="tiles four">' +
      '<div class="tile"><span class="label">kcal</span><span class="val small">' + UI.comma(t.kcal) + '</span></div>' +
      '<div class="tile"><span class="label">脂質</span><span class="val small">' + g(t.fat, 0) + '<small>g</small></span></div>' +
      '<div class="tile"><span class="label">食物繊維</span><span class="val small">' + g(t.fiber, 1) + '<small>g</small></span></div>' +
      '<div class="tile"><span class="label">食塩</span><span class="val small">' + g(t.salt, 1) + '<small>g</small></span></div>' +
      '</div>' +
      (t.pending ? '<p class="note">⏳ 分析待ち ' + t.pending + '件（合計にはまだ入っていません）</p>' : '') +
      '</div>';
  }

  function addCard() {
    if (shot) {
      return '<div class="box"><h2>この写真を送る</h2>' +
        '<img class="shot" src="data:image/jpeg;base64,' + shot.image + '" alt="">' +
        '<div class="q">ひとこと（なくてもよい）</div>' +
        '<input type="text" id="foodMemo" maxlength="100" placeholder="例：ごはん半分・2人で分けた" value="' + e(shot.memo) + '">' +
        '<div class="row2"><button class="btn sub" id="foodCancel"' + (sending ? ' disabled' : '') + '>やめる</button>' +
        '<button class="btn" id="foodSend"' + (sending ? ' disabled' : '') + '>' + (sending ? '送信中…' : '送る') + '</button></div></div>';
    }
    var teiban = (data.teiban || []).map(function (t) {
      return '<button class="btn sub teiban" data-teiban="' + e(t.name) + '">' + e(t.name) + '<small>たんぱく質 ' + g(t.protein, 0) + 'g</small></button>';
    }).join('');
    return '<div class="box"><h2>記録する</h2>' +
      '<div class="row2"><button class="btn big" id="foodCam">📷 撮る</button><button class="btn sub big" id="foodPick">🖼 写真を選ぶ</button></div>' +
      '<p class="note">料理でも、パッケージ裏の栄養表示でも。分析はPCが動いているときに1時間おき。</p>' +
      (teiban ? '<div class="q">定番</div><div class="teibans">' + teiban + '</div>' : '') +
      '</div>';
  }

  function itemHtml(m) {
    var head = '<div class="rec-head"><b>' + e(m.name) + '</b><span class="time">' + e(m.time) + '</span></div>';
    if (m.state === '未分析') {
      return '<div class="rec">' + head + '<div class="note">⏳ 分析待ち' + (m.memo ? '　📝 ' + e(m.memo) : '') + '</div>' +
        '<div class="rec-acts"><button class="link" data-del="' + e(m.id) + '">消す</button></div></div>';
    }
    if (m.state === '分析失敗') {
      return '<div class="rec">' + head + (m.memo ? '<div class="note">' + e(m.memo) + '</div>' : '') +
        '<div class="rec-acts"><button class="link" data-del="' + e(m.id) + '">消す</button></div></div>';
    }
    var nums = 'たんぱく質 <b>' + g(m.protein, 0) + 'g</b>　' + g(m.kcal, 0) + 'kcal　脂質 ' + g(m.fat, 0) + 'g　繊維 ' + g(m.fiber, 1) + 'g　塩 ' + g(m.salt, 1) + 'g';
    return '<div class="rec">' + head + '<div class="nut">' + nums + '</div>' +
      (m.memo ? '<div class="note">' + e(m.memo) + '</div>' : '') +
      '<div class="rec-acts"><button class="link" data-half="' + e(m.id) + '">半分にする</button><button class="link" data-del="' + e(m.id) + '">消す</button></div></div>';
  }

  function listCard() {
    var items = data.items.slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; });
    return '<div class="box"><h2>記録</h2>' +
      (items.length ? items.map(itemHtml).join('') : '<p class="note">まだありません</p>') + '</div>';
  }

  function dateNav() {
    var today = UI.lifeDay();
    return '<div class="datenav"><button class="btn sub" id="foodPrev">‹ 前の日</button>' +
      '<b>' + UI.mdw(date) + (date === today ? '（今日）' : '') + '</b>' +
      '<button class="btn sub" id="foodNext"' + (date >= today ? ' disabled' : '') + '>次の日 ›</button></div>';
  }

  function render() {
    document.getElementById('foodBody').innerHTML = dateNav() + totalCard() + addCard() + listCard() +
      '<input type="file" id="foodFileCam" accept="image/*" capture="environment" hidden>' +
      '<input type="file" id="foodFilePick" accept="image/*" hidden>';
  }

  function load() {
    if (!date) date = UI.lifeDay();
    if (!data) document.getElementById('foodBody').innerHTML = '<div class="empty">読み込み中…</div>';
    return API.call('meals', { date: date }).then(function (res) { data = res; render(); });
  }

  function reloadQuiet() {
    return load().catch(function (err) { UI.toast('読めませんでした：' + err.message); });
  }

  // 長い辺を MAX_SIDE まで縮めてJPEGに（スマホの写真は5MB超＝そのままでは重い）
  function shrink(file) {
    function draw(src, w, h) {
      var k = Math.min(1, MAX_SIDE / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.82).split(',')[1];
    }
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .then(function (bmp) { return draw(bmp, bmp.width, bmp.height); })
        .catch(function () { return viaImg(); });
    }
    return viaImg();
    function viaImg() {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () { URL.revokeObjectURL(url); resolve(draw(img, img.naturalWidth, img.naturalHeight)); };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('写真を開けませんでした')); };
        img.src = url;
      });
    }
  }

  function send() {
    if (!shot || sending) return;
    sending = true;
    render();
    API.call('addMeal', { kind: 'photo', image: shot.image, memo: shot.memo, date: date })
      .then(function () {
        shot = null;
        sending = false;
        UI.toast('送りました');
        return reloadQuiet();
      })
      .catch(function (err) {
        sending = false;
        render();
        UI.toast('送れませんでした：' + err.message);
      });
  }

  function find(id) { return data.items.filter(function (m) { return m.id === id; })[0]; }

  var body = document.getElementById('foodBody');

  body.addEventListener('click', function (ev) {
    var t = ev.target.closest('button');
    if (!t) return;
    if (t.id === 'foodCam') { document.getElementById('foodFileCam').click(); return; }
    if (t.id === 'foodPick') { document.getElementById('foodFilePick').click(); return; }
    if (t.id === 'foodCancel') { shot = null; render(); return; }
    if (t.id === 'foodSend') { send(); return; }
    if (t.id === 'foodPrev') { date = UI.addDays(date, -1); data = null; reloadQuiet(); return; }
    if (t.id === 'foodNext') { date = UI.addDays(date, 1); data = null; reloadQuiet(); return; }
    if (t.dataset.teiban) {
      t.disabled = true;
      API.call('addMeal', { kind: 'teiban', name: t.dataset.teiban, date: date })
        .then(function () { UI.toast('記録しました'); return reloadQuiet(); })
        .catch(function (err) { t.disabled = false; UI.toast('記録できませんでした：' + err.message); });
      return;
    }
    if (t.dataset.half) {
      var m = find(t.dataset.half);
      if (!m || !confirm('「' + m.name + '」の量を半分にしますか？')) return;
      t.disabled = true;
      API.call('editMeal', { id: m.id, factor: 0.5, name: m.name + '×½' })
        .then(reloadQuiet)
        .catch(function (err) { t.disabled = false; UI.toast('直せませんでした：' + err.message); });
      return;
    }
    if (t.dataset.del) {
      var d = find(t.dataset.del);
      if (!d || !confirm('「' + d.name + '」を消しますか？')) return;
      t.disabled = true;
      API.call('editMeal', { id: d.id, remove: true })
        .then(reloadQuiet)
        .catch(function (err) { t.disabled = false; UI.toast('消せませんでした：' + err.message); });
    }
  });

  body.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.type !== 'file' || !t.files || !t.files[0]) return;
    var file = t.files[0];
    t.value = '';
    shrink(file).then(function (b64) {
      shot = { image: b64, memo: '' };
      render();
      window.scrollTo(0, 0);
    }).catch(function (err) { UI.toast(err.message); });
  });

  body.addEventListener('input', function (ev) {
    if (ev.target.id === 'foodMemo' && shot) shot.memo = ev.target.value;
  });

  // 写真を確認中・送信中は、勝手に読み直さない
  function busy() { return !!shot || sending; }

  return { load: load, busy: busy };
})();
