// kenshin.js — 健診タブ＝月イチの健診（毎月1日に前の月の分が出る・要件定義 §12）
//   上から：総合所見 → 成績表（体・食事・運動・睡眠）→ 来月やること → これまでの健診
//   数字と判定はGAS（月次.gs）、所見の文はPCの分析役が書く
var Kenshin = (function () {
  var e = UI.esc;

  function kg(v, k) { return UI.has(v) ? UI.num(v, k === undefined ? 1 : k) + 'kg' : '—'; }
  function arrow(a, b, unit, k) { return (UI.has(a) && UI.has(b)) ? UI.num(a, k) + ' → ' + UI.num(b, k) + unit : '—'; }
  function of(a, b) { return b ? a + '／' + b + '日' : '—'; }
  function sd(v) { return UI.has(v) ? 'ばらつき ±' + v + '分' : ''; }

  // 表の1行＝項目・その月・前の月
  function row(label, cur, prev) {
    return '<tr><th>' + label + '</th><td>' + cur + '</td><td class="prev">' + prev + '</td></tr>';
  }

  function table(rows, prevLabel) {
    return '<table class="ks-table"><thead><tr><th></th><td>この月</td><td class="prev">' + e(prevLabel || '前の月') + '</td></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }

  function bodyRows(c, p) {
    function change(b) { return UI.has(b.change) ? UI.signed(b.change, 1) + 'kg' : '—'; }
    function week(b) { return UI.has(b.perWeek) ? UI.signed(b.perWeek, 2) + 'kg' : '—'; }
    return [
      row('体重（7日平均）', arrow(c.start, c.end, 'kg', 1), arrow(p.start, p.end, 'kg', 1)),
      row('月の増減', '<b>' + change(c) + '</b>', change(p)),
      row('週あたり', week(c), week(p)),
      row('除脂肪', arrow(c.leanStart, c.leanEnd, 'kg', 1), arrow(p.leanStart, p.leanEnd, 'kg', 1)),
      row('体脂肪率', arrow(c.fatStart, c.fatEnd, '%', 1), arrow(p.fatStart, p.fatEnd, '%', 1))
    ];
  }

  function foodRows(c, p, t) {
    function kc(f) { return UI.has(f.kcalAvg) ? UI.comma(f.kcalAvg) + 'kcal' : '—'; }
    function g(v, k) { return UI.has(v) ? UI.num(v, k) + 'g' : '—'; }
    return [
      row('記録した日', c.days + '日', p.days + '日'),
      row('カロリー平均', '<b>' + kc(c) + '</b>', kc(p)),
      row('目安以内の日 <small>' + UI.comma(t.kcal) + 'kcal</small>', of(c.kcalOkDays, c.days), of(p.kcalOkDays, p.days)),
      row('たんぱく質平均', g(c.proteinAvg, 0), g(p.proteinAvg, 0)),
      row('届いた日 <small>' + t.protein + 'g</small>', of(c.proteinOkDays, c.days), of(p.proteinOkDays, p.days)),
      row('脂質・食物繊維・食塩', g(c.fatAvg, 0) + '・' + g(c.fiberAvg, 1) + '・' + g(c.saltAvg, 1), p.days ? g(p.fatAvg, 0) + '・' + g(p.fiberAvg, 1) + '・' + g(p.saltAvg, 1) : '—')
    ];
  }

  function moveRows(c, p) {
    function kin(m) { return m.kintoreCount + '回（週' + UI.num(m.kintorePerWeek, 1) + '）'; }
    function walk(m) { return m.walkDays + '日（週' + UI.num(m.walkPerWeek, 1) + '）'; }
    function comp(m) { return m.kintoreCompared ? '増 ' + m.kintoreUp + '・減 ' + m.kintoreDown : '—'; }
    function steps(m) { return UI.has(m.stepsAvg) ? UI.comma(m.stepsAvg) + '歩' : '—'; }
    return [
      row('筋トレ', '<b>' + kin(c) + '</b>', kin(p)),
      row('前回より回数が', comp(c), comp(p)),
      row('歩いた日', '<b>' + walk(c) + '</b>', walk(p)),
      row('歩数の平均', steps(c), steps(p))
    ];
  }

  function sleepRows(c, p) {
    function av(s) { return UI.has(s.avgMin) ? UI.hm(s.avgMin) : '—'; }
    function clock(v, dev) { return UI.has(v) ? e(v) + '<small>' + sd(dev) + '</small>' : '—'; }
    var rows = [
      row('平均', '<b>' + av(c) + '</b>', av(p)),
      row('寝た時刻', clock(c.bedAvg, c.bedSd), clock(p.bedAvg, p.bedSd)),
      row('起きた時刻', clock(c.wakeAvg, c.wakeSd), clock(p.wakeAvg, p.wakeSd)),
      row('6時間未満の日', of(c.shortDays, c.days), of(p.shortDays, p.days))
    ];
    return rows;
  }

  // 睡眠が短い日とほかの日の比べ（数字があるときだけ）
  function sleepLinks(s) {
    var out = [];
    if (s.kcalLink) out.push('6時間未満の日のカロリー 平均' + UI.comma(s.kcalLink.short) + 'kcal（' + s.kcalLink.shortDays + '日）／ほかの日 ' + UI.comma(s.kcalLink.other) + 'kcal（' + s.kcalLink.otherDays + '日）');
    if (s.stepsLink) out.push('6時間未満の日の歩数 平均' + UI.comma(s.stepsLink.short) + '歩／ほかの日 ' + UI.comma(s.stepsLink.other) + '歩');
    return out.map(function (t) { return '<p class="note">' + e(t) + '</p>'; }).join('');
  }

  function area(icon, name, grade, tableHtml, extra, text) {
    var badge = grade ? '<span class="ks-badge g-' + e(grade.grade) + '">' + e(grade.label) + '</span>' : '';
    // 判定なしの理由は、所見の文がまだないときだけ出す（文があれば中で触れているので被る）
    var why = grade && grade.grade === 'none' && !text ? '<p class="note">' + e(grade.why) + '</p>' : '';
    return '<div class="box ks-area"><h2>' + icon + ' ' + name + badge + '</h2>' + tableHtml + (extra || '') + why +
      (text ? '<div class="comment">' + e(text) + '</div>' : '') + '</div>';
  }

  // 1か月ぶん（m＝GASの monthlyView_ の形）
  function report(m) {
    var c = m.cur, p = m.prev || {}, r = m.report || {}, g = m.grades;
    var goal = '';
    if (m.goal && m.goal.inMonth && m.goal.judgeCount) {
      goal = '<div class="kv"><span>目標 ' + UI.md(m.goal.deadline) + 'までに ' + UI.num(m.goal.target, 1) + 'kg以下</span><span><b>' + UI.num(m.goal.judgeAvg, 2) + 'kg</b>' +
        (m.goal.reached === null ? '（' + m.goal.judgeCount + '／3回）' : m.goal.reached ? '　達成' : '　届かず') + '</span></div>';
    }
    var head = '<div class="box msg"><h2>🩺 ' + e(m.label) + 'の健診　<small>' + UI.md(m.from) + '〜' + UI.md(m.until) + (m.partial ? '（途中）' : '') + '</small></h2>' +
      (r.summary ? '<p>' + e(r.summary) + '</p>' : '<p class="note">所見の文は、PCの分析役が次に動いたときに入ります</p>') + '</div>';
    var notes = (m.notes || []).map(function (t) { return '<p class="note ks-notes">※ ' + e(t) + '</p>'; }).join('');
    var next = (r.next && r.next.length) ? '<div class="box"><h2>📌 来月やること</h2><ol class="ks-next">' + r.next.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ol></div>' : '';
    var none = { body: {}, food: { days: 0 }, move: { kintoreCount: 0, walkDays: 0 }, sleep: {} };
    return head + (goal ? '<div class="box">' + goal + '</div>' : '') + notes +
      area('⚖️', '体', g.body, table(bodyRows(c.body, p.body || none.body), m.prevLabel), '', r.body) +
      area('🍚', '食事', g.food, table(foodRows(c.food, p.food || none.food, m.targets), m.prevLabel), '', r.food) +
      area('💪', '運動', g.move, table(moveRows(c.move, p.move || none.move), m.prevLabel), '', r.move) +
      area('🌙', '睡眠', null, table(sleepRows(c.sleep, p.sleep || none.sleep), m.prevLabel), sleepLinks(c.sleep), r.sleep) +
      next;
  }

  function render(res) {
    var list = res.list || [];
    var html;
    if (!list.length) {
      html = '<div class="empty"><b>健診はまだありません</b>毎月1日に、前の月の分が出ます' +
        (res.next ? '<br>最初は ' + UI.md(res.next.date) + '（' + e(res.next.label) + '分）' : '') + '</div>';
    } else {
      html = report(list[0]);
      if (list.length > 1) {
        html += '<div class="box"><h2>これまでの健診</h2>' + list.slice(1).map(function (m) {
          var g = m.grades;
          return '<details class="ks-old"><summary><b>' + e(m.label) + '</b><span>体' + e(g.body.label.charAt(0)) + '　食事' + e(g.food.label.charAt(0)) + '　運動' + e(g.move.label.charAt(0)) + '</span></summary>' + report(m) + '</details>';
        }).join('') + '</div>';
      }
      if (res.next) html += '<p class="note foot">次は ' + UI.md(res.next.date) + ' に' + e(res.next.label) + '分が出ます</p>';
    }
    document.getElementById('kenshinBody').innerHTML = html;
  }

  function load() {
    var body = document.getElementById('kenshinBody');
    if (!body.innerHTML) body.innerHTML = '<div class="empty">読み込み中…</div>';
    return API.call('monthly').then(render);
  }

  return { load: load, render: render };
})();
