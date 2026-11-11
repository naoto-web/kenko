// home.js — ホーム（今日）＝⚠️未着・目標・体・睡眠と歩数・運動・たんぱく質
var Home = (function () {
  var e = UI.esc;

  function mark(ok) { return ok ? '<b class="ok">○</b>' : '<b class="ng">×</b>'; }

  function missing(list) {
    return (list || []).map(function (m) {
      return '<div class="warn"><b>⚠️ 未着：' + e(m.what) + '</b><span>' + e(m.fix) + '</span></div>';
    }).join('');
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
    var judge = g.judgeCount ? '<div class="kv"><span>判定（朝3回の平均）</span><span><b>' + UI.num(g.judgeAvg, 2) + 'kg</b>　' + g.judgeCount + '／3回</span></div>' : '';
    return '<div class="box goal">' +
      '<h2>🎯 ' + UI.md(g.deadline) + 'までに ' + UI.num(g.target, 1) + 'kg以下</h2>' +
      '<div class="hero"><span class="big">あと ' + UI.num(Math.max(g.remain, 0), 1) + '<small>kg</small></span><span class="sub">残り' + g.daysLeft + '日</span></div>' +
      '<div class="meter"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<div class="meter-ends"><span>起点 ' + UI.num(g.startWeight, 1) + '</span><span>いま ' + UI.num(g.current, 1) + '（7日平均）</span><span>' + UI.num(g.target, 1) + '</span></div>' +
      '<div class="kv"><span>今のペース（直近14日）</span><span><b>' + pace + '</b></span></div>' +
      '<div class="kv"><span>必要なペース</span><span><b>' + need + '</b></span></div>' +
      proj + lean + judge + '</div>';
  }

  function bodyCard(b) {
    function tile(label, ma, today, unit, k) {
      return '<div class="tile"><span class="label">' + label + '</span>' +
        '<span class="val">' + UI.num(ma, k) + '<small>' + unit + '</small></span>' +
        '<span class="sub">今朝 ' + (UI.has(today) ? UI.num(today, k) : '—') + '</span></div>';
    }
    var when = UI.has(b.weight) ? '今朝の測定 ' + e(b.time) + (b.late ? '（12時以降＝朝の値ではない）' : '') : '今朝はまだ測っていません';
    return '<div class="box"><h2>⚖️ 体（7日平均）</h2><div class="tiles three">' +
      tile('体重', b.weightMa, b.weight, 'kg', 1) + tile('体脂肪率', b.fatMa, b.fat, '%', 1) + tile('除脂肪', b.leanMa, b.lean, 'kg', 1) +
      '</div><p class="note">' + when + '</p></div>';
  }

  function dayCard(r) {
    var s = r.sleep, y = r.yesterday, t = r.todayMove;
    var sleep = UI.has(s.minutes) && s.minutes > 0 ? UI.hm(s.minutes) : '—';
    var sleepSub = s.start ? e(s.start) + '〜' + e(s.end) : '';
    return '<div class="box"><h2>🌙 昨夜と昨日</h2><div class="tiles two">' +
      '<div class="tile"><span class="label">昨夜の睡眠</span><span class="val mid">' + sleep + '</span><span class="sub">' + sleepSub + '</span></div>' +
      '<div class="tile"><span class="label">昨日の歩数</span><span class="val mid">' + UI.comma(y.steps) + '<small>歩</small></span><span class="sub">今日ここまで ' + UI.comma(t.steps) + '歩</span></div>' +
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
    var p = f.total.protein || 0, target = f.proteinTarget;
    var pct = Math.max(0, Math.min(1, p / target)) * 100;
    return '<div class="box"><h2>🍚 今日のたんぱく質　<small>' + Math.round(p) + 'g／' + target + 'g</small></h2>' +
      '<div class="meter"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      (f.total.pending ? '<p class="note">⏳ 分析待ち ' + f.total.pending + '件</p>' : '') +
      '<p class="note">食事の記録（写真・定番ボタン）は11/13に入ります</p></div>';
  }

  function render(r) {
    document.getElementById('homeBody').innerHTML =
      '<p class="datehead">' + UI.mdw(r.today) + '</p>' +
      missing(r.missing) + goalCard(r.goal) + bodyCard(r.body) + dayCard(r) + weekCard(r.week, r.today) + foodCard(r.food) +
      '<p class="note foot">更新 ' + e(String(r.now).substring(5, 16).replace('-', '/')) + (r.jobLast ? '　分析役が最後に動いた時刻 ' + e(r.jobLast) : '') + '</p>';
  }

  return { render: render };
})();
