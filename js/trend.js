// trend.js — 推移＝体重・体脂肪率・除脂肪（その日の点＋7日平均）と、歩数・睡眠の棒
var Trend = (function () {
  var RANGE_KEY = 'kk_range';
  var data = null;
  var range = Number(API.store(RANGE_KEY)) === 90 ? 90 : 30;

  function pick(days, field) {
    var o = {};
    days.forEach(function (d) { o[d.date] = d[field]; });
    return o;
  }

  function card(id, title, legend) {
    return '<div class="box"><h2>' + title + '</h2><div id="' + id + '" class="chart"></div>' + (legend ? '<div class="legend">' + legend + '</div>' : '') + '</div>';
  }

  var LG_DOT = '<span><i class="lg dot"></i>その日の値</span>';
  var LG_MA = '<span><i class="lg ma"></i>7日平均</span>';

  function draw() {
    if (!data) return;
    var days = data.days.slice(-range);
    var g = data.goal;
    var dates = days.map(function (d) { return d.date; });
    var today = dates[dates.length - 1];
    var late = {};
    days.forEach(function (d) { if (d.late) late[d.date] = true; });

    document.getElementById('trendBody').innerHTML =
      '<div class="seg"><button data-range="30"' + (range === 30 ? ' class="on"' : '') + '>30日</button><button data-range="90"' + (range === 90 ? ' class="on"' : '') + '>90日</button></div>' +
      card('chWeight', '体重（kg）', LG_DOT + '<span><i class="lg late"></i>12時以降の測定</span>' + LG_MA + '<span><i class="lg path"></i>必要ペース</span>') +
      card('chFat', '体脂肪率（%）', LG_DOT + LG_MA + '<span><i class="lg path"></i>目安への道のり</span>') +
      card('chLean', '除脂肪（kg）＝守る対象', LG_DOT + LG_MA) +
      card('chSteps', '歩数', '') +
      card('chSleep', '睡眠（時間）', '') +
      '<p class="note foot">グラフを指でなぞると、その日の数字が出ます</p>';

    // 体のグラフは、測りはじめる前の空白を出さない＝期間内の最初の測定日から描く
    var first = 0;
    for (var i = 0; i < days.length; i++) { if (UI.has(days[i].weight)) { first = i; break; } }
    var bDates = dates.slice(first);

    // 体重と体脂肪率は横軸を期限（12/23）まで伸ばして、目標までの道のりを見せる
    var wDates = bDates.slice();
    for (var d = UI.addDays(today, 1); d <= g.deadline; d = UI.addDays(d, 1)) wDates.push(d);
    Chart.line(document.getElementById('chWeight'), {
      dates: wDates, v: pick(days, 'weight'), ma: pick(days, 'weightMa'), late: late, unit: 'kg', digits: 1, height: 220,
      refs: [{ y: g.target, label: '目標 ' + g.target.toFixed(1) }],
      path: { from: { date: g.startDate, y: g.startWeight }, to: { date: g.deadline, y: g.target } }
    });
    Chart.line(document.getElementById('chLean'), {
      dates: bDates, v: pick(days, 'lean'), ma: pick(days, 'leanMa'), unit: 'kg', digits: 1,
      refs: [{ y: g.baseLean, label: '起点 ' + g.baseLean.toFixed(1) + '（ここより下がらなければOK）' }]
    });
    Chart.line(document.getElementById('chFat'), {
      dates: wDates, v: pick(days, 'fat'), ma: pick(days, 'fatMa'), unit: '%', digits: 1, height: 220,
      refs: [{ y: g.targetFat, label: '目安 ' + g.targetFat.toFixed(1) }],
      path: { from: { date: g.startDate, y: g.startFat }, to: { date: g.deadline, y: g.targetFat } }
    });
    Chart.bars(document.getElementById('chSteps'), {
      dates: dates, v: pick(days, 'steps'), height: 160,
      fmtAxis: function (v) { return v >= 1000 ? (v / 1000) + '千' : String(v); },
      fmtTip: function (v) { return UI.comma(v) + '歩'; }
    });
    var sleepH = {};
    days.forEach(function (d) { sleepH[d.date] = UI.has(d.sleepMin) && d.sleepMin > 0 ? d.sleepMin / 60 : null; });
    Chart.bars(document.getElementById('chSleep'), {
      dates: dates, v: sleepH, height: 160,
      fmtAxis: function (v) { return v + 'h'; },
      fmtTip: function (v) { return UI.hm(Math.round(v * 60)); }
    });
  }

  function load() {
    if (!data) document.getElementById('trendBody').innerHTML = '<div class="empty">読み込み中…</div>';
    return API.call('trend', { days: 90 }).then(function (res) { data = res; draw(); });
  }

  document.getElementById('trendBody').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-range]');
    if (!b) return;
    range = Number(b.dataset.range);
    API.store(RANGE_KEY, String(range));
    draw();
  });

  return { load: load };
})();
