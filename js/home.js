// home.js — ホーム（今日）＝⚠️未着・目標・体・睡眠と歩数・運動・たんぱく質
var Home = (function () {
  var e = UI.esc;

  function mark(ok) { return ok ? '<b class="ok">○</b>' : '<b class="ng">×</b>'; }

  function missing(list) {
    return (list || []).map(function (m) {
      return '<div class="warn"><b>⚠️ 未着：' + e(m.what) + '</b><span>' + e(m.fix) + '</span></div>';
    }).join('');
  }

  // クロコから（1日1通・PCの分析役が朝の体重が届いたあとに書く）
  function messageCard(m, today) {
    if (!m || !m.text) return '';
    return '<div class="box msg"><h2>💬 クロコから　<small>' + UI.md(m.date) + (m.date === today ? '' : '（今日の分はまだ）') + '</small></h2>' +
      '<p>' + e(m.text) + '</p></div>';
  }

  function goalCard(g) {
    if (!UI.has(g.current)) return '<div class="box"><h2>🎯 目標</h2><p class="note">体重のデータが足りません</p></div>';
    var done = g.startWeight > g.target ? (g.startWeight - g.current) / (g.startWeight - g.target) : 0;
    var pct = Math.max(0, Math.min(1, done)) * 100;
    var pace;
    if (!UI.has(g.pacePerWeek)) pace = '直近2週間のデータが足りません';
    else pace = '週 ' + UI.signed(g.pacePerWeek, 2) + 'kg' + (g.pacePerWeek > 0 ? '（増えている）' : '');
    var need = UI.has(g.needPerWeek) ? '週 ' + UI.signed(-g.needPerWeek, 2) + 'kg' : '—';
    var proj = '';
    if (UI.has(g.projected)) {
      var gap = Math.round((g.projected - g.target) * 10) / 10;
      proj = '<p class="proj">今のペースが続くと ' + UI.md(g.deadline) + ' は <b>' + UI.num(g.projected, 1) + 'kg</b>' +
        (gap > 0 ? '（目標まであと' + gap.toFixed(1) + 'kg）' : '（目標に届く）') + '</p>';
    }
    var lean = '';
    if (UI.has(g.lean)) {
      lean = '<div class="kv"><span>除脂肪（守る対象）</span><span><b>' + UI.num(g.lean, 1) + 'kg</b>　起点' + UI.num(g.baseLean, 1) + 'kgから ' + UI.signed(g.leanDiff, 2) + '</span></div>';
    }
    if (UI.has(g.fat) && UI.has(g.targetFat)) {
      lean += '<div class="kv"><span>体脂肪率</span><span><b>' + UI.num(g.fat, 1) + '%</b>　目安 ' + UI.num(g.targetFat, 1) + '%</span></div>' +
        '<p class="note">目安＝除脂肪を守ったまま' + UI.num(g.target, 1) + 'kgになったときの体脂肪率</p>';
    }
    var judge =g.judgeCount ? '<div class="kv"><span>判定（朝3回の平均）</span><span><b>' + UI.num(g.judgeAvg, 2) + 'kg</b>　' + g.judgeCount + '／3回</span></div>' : '';
    return '<div class="box goal">' +
      '<h2>🎯 ' + UI.md(g.deadline) + 'までに ' + UI.num(g.target, 1) + 'kg以下</h2>' +
      '<div class="hero"><span class="big">あと ' + UI.num(Math.max(g.remain, 0), 1) + '<small>kg</small></span><span class="sub">残り' + g.daysLeft + '日</span></div>' +
      '<div class="meter"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<div class="meter-ends"><span>起点 ' + UI.num(g.startWeight, 1) + '</span><span>いま ' + UI.num(g.current, 1) + '（7日平均）</span><span>' + UI.num(g.target, 1) + '</span></div>' +
      '<div class="kv"><span>今のペース（直近14日）</span><span><b>' + pace + '</b></span></div>' +
      '<div class="kv"><span>必要なペース</span><span><b>' + need + '</b></span></div>' +
      proj + lean + judge + '</div>';
  }

  // 届いていないときの書き方（11/12）＝「—」ではなく、その場に「まだ届いていません」
  var WAIT = '<span class="val wait">まだ届いていません</span>';

  function bodyCard(b, r) {
    var lw = (r.latest || {}).weight;
    function tile(label, ma, today, unit, k) {
      return '<div class="tile"><span class="label">' + label + '</span>' +
        '<span class="val">' + UI.num(ma, k) + '<small>' + unit + '</small></span>' +
        '<span class="sub">今朝 ' + (UI.has(today) ? UI.num(today, k) : '未着') + '</span></div>';
    }
    var when;
    if (UI.has(b.weight)) {
      when = '今朝（' + UI.md(r.today) + ' ' + e(b.time) + '）の測定まで反映' + (b.late ? '（12時以降＝朝の値ではない）' : '');
    } else {
      when = '今朝（' + UI.md(r.today) + '）の体重はまだ届いていません' +
        (lw ? '。7日平均は ' + UI.md(lw.date) + ' ' + e(lw.time) + ' の測定まで' : '');
    }
    return '<div class="box"><h2>⚖️ 体（7日平均）</h2><div class="tiles three">' +
      tile('体重', b.weightMa, b.weight, 'kg', 1) + tile('体脂肪率', b.fatMa, b.fat, '%', 1) + tile('除脂肪', b.leanMa, b.lean, 'kg', 1) +
      '</div><p class="note">' + when + '</p></div>';
  }

  // 「11/11→12」（昨夜＝前日の夜から今朝まで）
  function night(ymd) {
    return UI.md(UI.addDays(ymd, -1)) + '→' + UI.parse(ymd).getDate();
  }

  function dayCard(r) {
    var s = r.sleep, y = r.yesterday, t = r.todayMove, L = r.latest || {};
    var hasSleep = UI.has(s.minutes) && s.minutes > 0;
    var sleepVal = hasSleep ? '<span class="val mid">' + UI.hm(s.minutes) + '</span>' : WAIT;
    var sleepSub = hasSleep && s.start ? e(s.start) + '〜' + e(s.end) : (L.sleep ? '最新＝' + night(L.sleep.date) + 'の分' : '');
    var stepVal = UI.has(y.steps) ? '<span class="val mid">' + UI.comma(y.steps) + '<small>歩' + (UI.has(y.km) ? '　' + UI.num(y.km, 1) + 'km' : '') + '</small></span>' : WAIT;
    var todaySteps = UI.has(t.steps) ? '今日 ' + UI.comma(t.steps) + '歩' + (UI.has(t.km) ? '（' + UI.num(t.km, 1) + 'km）' : '') :'今日の分はまだ届いていません';
    var stepSub = !UI.has(y.steps) && L.steps ? '最新＝' + UI.md(L.steps.date) + 'の分' : todaySteps;
    // 11/13 「届いている最新」の行はやめた（Naoto＝タイルの日付と情報が被る）。未着のときだけタイル内に「最新＝◯◯の分」を出す
    return '<div class="box"><h2>🌙 昨夜と昨日</h2><div class="tiles two">' +
      '<div class="tile"><span class="label">昨夜の睡眠 ' + night(r.today) + '</span>' + sleepVal + '<span class="sub">' + sleepSub + '</span></div>' +
      '<div class="tile"><span class="label">昨日の歩数 ' + UI.md(y.date) + '</span>' + stepVal + '<span class="sub">' + stepSub + '</span></div>' +
      '</div>' +
      '<div class="kv"><span>昨日の運動</span><span>筋トレ ' + mark(!!y.kintore) + (y.kintore ? '（' + e(y.kintore) + '）' : '') + '　歩く ' + mark(y.walk) + (y.walk ? '（' + y.walkMin + '分）' : '') + '</span></div>' +
      '<div class="kv"><span>今日の運動</span><span>筋トレ ' + mark(!!t.kintore) + (t.kintore ? '（' + e(t.kintore) + '）' : '') + '　歩く ' + mark(t.walk) + (t.walk ? '（' + t.walkMin + '分）' : '') + '</span></div>' +
      '</div>';
  }

  function weekCard(w, today) {
    var dots = '';
    for (var i = 0; i < 7; i++) {
      var d = UI.addDays(w.monday, i);
      var menu = w.dates[d];
      dots += '<div class="day' + (menu ? ' done' : '') + (d === today ? ' today' : '') + (d > today ? ' future' : '') + '"><span>' + UI.WD[(i + 1) % 7] + '</span><i>' + (menu ? e(String(menu).charAt(0)) : '') + '</i></div>';
    }
    var state = w.count >= 3 ? '3回達成' : w.count >= 2 ? '合格（2回）' : 'あと' + (2 - w.count) + '回で合格';
    return '<div class="box"><h2>💪 今週の筋トレ　<small>' + w.count + '／3回・' + state + '</small></h2><div class="week">' + dots + '</div>' +
      '<button class="btn wide" data-go="kintore">筋トレを記録する</button></div>';
  }

  function foodCard(f) {
    // 主役はカロリー（11/16 Naoto）。たんぱく質は下の小さい行
    var kc = Math.round(f.total.kcal || 0), kt = (f.targets && f.targets.kcal) || 1400;
    var p = f.total.protein || 0, target = f.proteinTarget;
    var pct = Math.max(0, Math.min(1, kc / kt)) * 100;
    var over = kc > kt;
    var rest = over ? '<b style="color:var(--late)">' + UI.comma(kc - kt) + 'kcal 超え</b>' : 'あと' + UI.comma(kt - kc) + 'kcal';
    return '<div class="box"><h2>🍚 今日のカロリー　<small>' + UI.comma(kc) + '／' + UI.comma(kt) + 'kcal</small></h2>' +
      '<div class="meter"><i style="width:' + pct.toFixed(1) + '%' + (over ? ';background:var(--late)' : '') + '"></i></div>' +
      '<p class="note">' + rest + '　／　たんぱく質 ' + Math.round(p) + 'g／' + target + 'g' + (p >= target ? '（達成）' : '') + '</p>' +
      (f.total.pending ? '<p class="note">⏳ 分析待ち ' + f.total.pending + '件</p>' : '') +
      '<button class="btn wide" data-go="food" style="margin-top:10px">食事を記録する</button></div>';
  }

  // 今週の見立て（月曜の朝に、前の週の月〜日を判定する・要件定義 §11）
  function weeklyCard(w) {
    if (!w) return '';
    function tile(label, val, sub) {
      return '<div class="tile"><span class="label">' + label + '</span><span class="val small">' + val + '</span><span class="sub">' + sub + '</span></div>';
    }
    var pace = UI.has(w.paceKg) ? UI.signed(w.paceKg, 2) + '<small>kg</small>' : '—';
    var paceSub = UI.has(w.lossPct) ? '体重の' + UI.num(Math.abs(w.lossPct), 1) + '%' + (w.lossPct < 0 ? '増' : '減') : '体重の記録 ' + w.weightDays + '日';
    var prot = w.mealDays ? w.proteinOkDays + '<small>／' + w.mealDays + '日</small>' : '—';
    var protSub = w.mealDays ? '平均' + UI.num(w.proteinAvg, 0) + 'g' : '食事の記録なし';
    var kin = w.kintoreCount + '<small>回</small>';
    var kinSub = w.kintoreTrend === '比較なし' ? '前回との比較なし' : '回数は' + e(w.kintoreTrend);
    var text = w.text ? '<p class="wk-text">' + e(w.text) + '</p>' :
      w.textWait ? '<p class="note wk-wait">提案の文は、PCの分析役が次に動いたときに入ります</p>' : '';
    var lean = UI.has(w.leanDiff) ? '<div class="kv"><span>除脂肪（週の平均）</span><span>起点から <b>' + UI.signed(w.leanDiff, 2) + 'kg</b></span></div>' : '';
    return '<div class="box weekly st-' + e(w.state) + '">' +
      '<h2>📋 今週の見立て　<small>' + UI.md(w.week) + '〜' + UI.md(w.to) + 'の結果</small></h2>' +
      '<div class="wk-badge">' + e(w.label) + '</div>' +
      '<div class="tiles three">' + tile('体重のペース', pace, paceSub) + tile('たんぱく質' + w.proteinTarget + 'g', prot, protSub) + tile('筋トレ', kin, kinSub) + '</div>' +
      text + lean +
      '<p class="proj"><span class="wk-dim">食事の目安</span>　' + e(w.reason) + '</p>' +
      '</div>';
  }

  function render(r) {
    document.getElementById('homeBody').innerHTML =
      '<p class="datehead">' + UI.mdw(r.today) + '</p>' +
      messageCard(r.message, r.today) + missing(r.missing) + goalCard(r.goal) + weeklyCard(r.weekly) + bodyCard(r.body, r) + dayCard(r) + weekCard(r.week, r.today) + foodCard(r.food) +
      '<p class="note foot">更新 ' + e(String(r.now).substring(5, 16).replace('-', '/')) + (r.jobLast ? '　分析役が最後に動いた時刻 ' + e(r.jobLast) : '') + '</p>';
  }

  return { render: render, weeklyCard: weeklyCard };
})();
