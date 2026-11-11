// kintore.js — 筋トレの記録＝今日のメニュー（A・B交互）→種目ごとに前回の回数→セットごとに入力→保存
// 入力の途中経過は端末に控える（セットの合間にアプリを閉じても消えない）
var Kintore = (function () {
  var e = UI.esc;
  var DRAFT = 'kk_kin_draft';
  var plan = null;
  var draft = null;
  var again = false;

  function loadDraft() {
    var d = null;
    try { d = JSON.parse(API.store(DRAFT) || 'null'); } catch (err) { d = null; }
    // 日付が変わっていたら前の日の途中経過は捨てる
    if (!d || d.day !== UI.lifeDay()) d = { day: UI.lifeDay(), menu: '', items: {}, tempo: '', stop: '', memo: '', date: '' };
    return d;
  }
  function saveDraft() { API.store(DRAFT, JSON.stringify(draft)); }

  function sum(a) {
    if (!Array.isArray(a)) return 0;
    return a.reduce(function (s, v) { return s + (UI.has(v) ? Number(v) : 0); }, 0);
  }
  function reps(a) {
    if (a === true) return '✔';
    if (!Array.isArray(a)) return '—';
    return a.map(function (v) { return UI.has(v) ? v : '—'; }).join('・');
  }

  // 合計の一言（前回との比較）
  function totalLine(it) {
    var cur = draft.items[it.key];
    var n = sum(cur);
    if (!n) return '';
    var p = sum(it.prev);
    if (!p) return '合計 ' + n + '回';
    var diff = n - p;
    return '合計 ' + n + '回（前回' + p + '回' + (diff > 0 ? '・+' + diff : diff < 0 ? '・−' + (-diff) : '・同じ') + '）';
  }

  function itemHtml(it) {
    var head = '<div class="ex-head"><b>' + e(it.name) + '</b>' + (it.range ? '<span class="range">目標 ' + e(it.range) + '回</span>' : '') + '</div>' +
      (it.note ? '<div class="ex-note">' + e(it.note) + '</div>' : '');
    if (!it.sets) {
      // 回数のない種目（プランク）＝やったらチェック
      return '<div class="box ex">' + head + '<label class="check"><input type="checkbox" data-check="' + e(it.key) + '"' + (draft.items[it.key] === true ? ' checked' : '') + '> やった' +
        (it.prev === true ? '<small>（前回もやった）</small>' : '') + '</label></div>';
    }
    var cur = Array.isArray(draft.items[it.key]) ? draft.items[it.key] : [];
    var rows = '';
    for (var i = 0; i < it.sets; i++) {
      var pv = Array.isArray(it.prev) && UI.has(it.prev[i]) ? it.prev[i] : '';
      rows += '<div class="set"><span class="no">' + (i + 1) + 'セット目</span>' +
        '<button class="step" data-key="' + e(it.key) + '" data-set="' + i + '" data-d="-1" aria-label="1回減らす">−</button>' +
        '<input type="number" inputmode="numeric" min="0" max="999" data-key="' + e(it.key) + '" data-set="' + i + '" value="' + (UI.has(cur[i]) ? cur[i] : '') + '" placeholder="' + pv + '">' +
        '<button class="step" data-key="' + e(it.key) + '" data-set="' + i + '" data-d="1" aria-label="1回増やす">＋</button>' +
        '<span class="prev">' + (pv !== '' ? '前回 ' + pv : '') + '</span></div>';
    }
    return '<div class="box ex">' + head + rows + '<div class="ex-total" data-total="' + e(it.key) + '">' + totalLine(it) + '</div></div>';
  }

  function choice(name, opts) {
    return '<div class="seg small">' + opts.map(function (o) {
      return '<button data-choice="' + name + '" data-val="' + o[0] + '"' + (draft[name] === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function formHtml() {
    var menu = draft.menu || plan.next;
    var p = plan.plans[menu];
    var today = UI.lifeDay();
    var dates = [today, UI.addDays(today, -1), UI.addDays(today, -2)];
    var sel = draft.date || today;
    return '<div class="box"><h2>今日のメニュー</h2>' +
      '<div class="seg">' + Object.keys(plan.plans).map(function (m) {
        return '<button data-menu="' + e(m) + '"' + (m === menu ? ' class="on"' : '') + '>' + e(m) + (m === plan.next ? '<small>順番</small>' : '') + '</button>';
      }).join('') + '</div>' +
      '<p class="note">' + (plan.last ? '前回は ' + UI.mdw(plan.last.date) + ' の' + e(plan.last.menu) + '。' : '') +
      (p.prevDate ? 'この' + e(menu) + 'の前回は ' + UI.mdw(p.prevDate) + '。超えられたら超える。' : 'このメニューは初めてです。') + '</p>' +
      (p.prevComment ? '<div class="comment"><b>💬 前回のクロコのコメント</b>' + e(p.prevComment) + '</div>' : '') +
      '</div>' +
      p.items.map(itemHtml).join('') +
      '<div class="box"><h2>やり方の記録</h2>' +
      '<div class="q">静止・テンポ（1秒静止／3秒下ろし）</div>' + choice('tempo', [['あり', 'やった'], ['一部', '一部だけ'], ['なし', 'やってない']]) +
      '<div class="q">止め方</div>' + choice('stop', [['限界', '限界まで'], ['目標止め', '目標で止めた']]) +
      '<div class="q">メモ（体調・変えたことなど）</div><textarea id="kinMemo" rows="2">' + e(draft.memo) + '</textarea>' +
      '<div class="q">日付</div><select id="kinDate">' + dates.map(function (d, i) {
        return '<option value="' + d + '"' + (d === sel ? ' selected' : '') + '>' + UI.mdw(d) + (i === 0 ? '（今日）' : '') + '</option>';
      }).join('') + '</select>' +
      '</div>' +
      '<button id="kinSave" class="btn wide big">この内容で保存する</button>' +
      '<p class="note">＋を押すと前回の回数から始まります。途中でアプリを閉じても入力は残ります。</p>';
  }

  function recentHtml() {
    if (!plan.recent.length) return '';
    return '<div class="box"><h2>最近の記録</h2>' + plan.recent.map(function (r) {
      var items = (plan.plans[r.menu] || { items: [] }).items;
      var lines = items.filter(function (it) { return r.body[it.key] !== undefined; }).map(function (it) {
        return '<div class="rec-line"><span>' + e(it.name) + '</span><b>' + reps(r.body[it.key]) + '</b></div>';
      }).join('');
      var tags = [r.tempo ? '静止・テンポ：' + r.tempo : '', r.stop ? r.stop : ''].filter(Boolean).join('／');
      var comment = r.comment ? '<div class="comment"><b>💬 クロコのコメント</b>' + e(r.comment) + '</div>' :
        r.commentState === '待ち' ? '<div class="comment wait">💬 クロコのコメント待ち（コメントの仕組みは11/13に入ります）</div>' : '';
      var del = String(r.id).indexOf('seed') === 0 ? '' : '<button class="link" data-del="' + e(r.id) + '">この記録を取り消す</button>';
      return '<div class="rec"><div class="rec-head"><b>' + UI.mdw(r.date) + '　' + e(r.menu) + '</b>' + del + '</div>' + lines +
        (tags ? '<div class="note">' + e(tags) + '</div>' : '') + (r.memo ? '<div class="note">📝 ' + e(r.memo) + '</div>' : '') + comment + '</div>';
    }).join('') + '</div>';
  }

  function render() {
    var today = UI.lifeDay();
    var done = plan.recent.filter(function (r) { return r.date === today; })[0];
    var top;
    if (done && !again) {
      top = '<div class="box donebox"><h2>✅ 今日は記録済み（' + e(done.menu) + '）</h2><p class="note">次は ' + e(plan.next) + ' の番です。</p>' +
        '<button class="btn sub" id="kinAgain">もう1回記録する</button></div>';
    } else {
      top = formHtml();
    }
    document.getElementById('kintoreBody').innerHTML = top + recentHtml();
  }

  function currentItems() { return plan.plans[draft.menu || plan.next].items; }
  function findItem(key) { return currentItems().filter(function (it) { return it.key === key; })[0]; }

  function setRep(key, i, val) {
    var it = findItem(key);
    if (!Array.isArray(draft.items[key])) draft.items[key] = [];
    var a = draft.items[key];
    while (a.length < it.sets) a.push(null);
    a[i] = val;
    saveDraft();
    var t = document.querySelector('[data-total="' + key + '"]');
    if (t) t.textContent = totalLine(it);
  }

  function save() {
    var menu = draft.menu || plan.next;
    var items = {}, filled = 0, holes = 0;
    currentItems().forEach(function (it) {
      var v = draft.items[it.key];
      if (!it.sets) { if (v === true) { items[it.key] = true; filled++; } return; }
      var a = [];
      for (var i = 0; i < it.sets; i++) {
        var n = Array.isArray(v) && UI.has(v[i]) ? Number(v[i]) : null;
        if (n === null) holes++; else { a.push(n); filled++; }
      }
      if (a.length) items[it.key] = a;
    });
    if (!filled) { UI.toast('回数がまだ入っていません'); return; }
    if (holes && !confirm('入っていないセットが' + holes + 'つあります。このまま保存しますか？')) return;
    var btn = document.getElementById('kinSave');
    btn.disabled = true;
    btn.textContent = '保存中…';
    var date = document.getElementById('kinDate').value;
    API.call('kintoreSave', { menu: menu, date: date, items: items, tempo: draft.tempo, stop: draft.stop, memo: draft.memo })
      .then(function () {
        API.store(DRAFT, null);
        draft = loadDraft();
        again = false;
        UI.toast('保存しました');
        return load();
      })
      .then(function () { window.scrollTo(0, 0); })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'この内容で保存する';
        UI.toast('保存できませんでした：' + err.message);
      });
  }

  function load() {
    if (!plan) document.getElementById('kintoreBody').innerHTML = '<div class="empty">読み込み中…</div>';
    draft = loadDraft();
    return API.call('kintorePlan').then(function (res) { plan = res; render(); });
  }

  var body = document.getElementById('kintoreBody');

  body.addEventListener('click', function (ev) {
    var t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.menu) { draft.menu = t.dataset.menu; saveDraft(); render(); return; }
    if (t.dataset.choice) {
      draft[t.dataset.choice] = draft[t.dataset.choice] === t.dataset.val ? '' : t.dataset.val;
      saveDraft();
      t.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', draft[t.dataset.choice] === b.dataset.val); });
      return;
    }
    if (t.dataset.d) {
      var key = t.dataset.key, i = Number(t.dataset.set), d = Number(t.dataset.d);
      var input = body.querySelector('input[data-key="' + key + '"][data-set="' + i + '"]');
      var val;
      if (input.value === '') {
        // 空のときは前回の回数から始める（＋＝前回と同じ・−＝前回より1つ少ない）
        var pv = Number(input.placeholder || 0);
        val = pv ? (d > 0 ? pv : Math.max(0, pv - 1)) : (d > 0 ? 1 : 0);
      } else {
        val = Math.max(0, Number(input.value) + d);
      }
      input.value = val;
      setRep(key, i, val);
      return;
    }
    if (t.id === 'kinSave') { save(); return; }
    if (t.id === 'kinAgain') { again = true; render(); return; }
    if (t.dataset.del) {
      if (!confirm('この記録を取り消しますか？（元に戻せません）')) return;
      t.disabled = true;
      API.call('kintoreDelete', { id: t.dataset.del })
        .then(function () { UI.toast('取り消しました'); return load(); })
        .catch(function (err) { t.disabled = false; UI.toast('取り消せませんでした：' + err.message); });
    }
  });

  body.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.dataset.key && t.type === 'number') {
      setRep(t.dataset.key, Number(t.dataset.set), t.value === '' ? null : Math.max(0, Math.round(Number(t.value))));
    } else if (t.id === 'kinMemo') {
      draft.memo = t.value; saveDraft();
    }
  });

  body.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.dataset.check) {
      if (t.checked) draft.items[t.dataset.check] = true; else delete draft.items[t.dataset.check];
      saveDraft();
    } else if (t.id === 'kinDate') {
      draft.date = t.value; saveDraft();
    }
  });

  return { load: load };
})();
