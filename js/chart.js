// chart.js — 小さなSVGグラフ（折れ線＝その日の点＋7日平均／棒）。指でなぞると日付と数字が出る
var Chart = (function () {
  var M = { l: 38, r: 40, t: 12, b: 22 };

  function ticks(min, max, n) {
    var raw = (max - min) / n;
    var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var f = raw / pow;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
    var out = [];
    for (var v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
    return out;
  }

  // 横軸の日付ラベル＝4か所くらい
  function xLabels(dates, x, H) {
    var n = dates.length;
    var every = Math.max(1, Math.round(n / 4));
    var s = '';
    for (var i = n - 1; i >= 0; i -= every) {
      var anchor = i === n - 1 ? 'end' : i < every / 2 ? 'start' : 'middle';
      s += '<text class="ax" x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor + '">' + UI.md(dates[i]) + '</text>';
    }
    return s;
  }

  function frame(el, o) {
    var W = Math.max(280, el.clientWidth || 340);
    var H = o.height || 190;
    return { W: W, H: H, pw: W - M.l - M.r, ph: H - M.t - M.b };
  }

  function grid(tk, y, W, fmt) {
    return tk.map(function (v) {
      return '<line class="grid" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/>' +
        '<text class="ax" x="' + (M.l - 6) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>';
    }).join('');
  }

  // なぞったときの縦線と吹き出し
  function hover(el, f, n, x, idxOf, tipHtml, hasData) {
    var svg = el.querySelector('svg');
    var line = svg.querySelector('.cross');
    var tip = el.querySelector('.tip');
    function move(e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) * (f.W / r.width);
      var i = Math.max(0, Math.min(n - 1, idxOf(px)));
      // いちばん近い「数字がある日」に寄せる
      var best = -1;
      for (var d = 0; d < n; d++) {
        if (i - d >= 0 && hasData(i - d)) { best = i - d; break; }
        if (i + d < n && hasData(i + d)) { best = i + d; break; }
      }
      if (best < 0) return;
      var cx = x(best);
      line.setAttribute('x1', cx); line.setAttribute('x2', cx);
      line.style.display = '';
      tip.innerHTML = tipHtml(best);
      tip.hidden = false;
      var left = cx / f.W * r.width;
      var tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(r.width - tw, left - tw / 2)) + 'px';
    }
    function leave() { line.style.display = 'none'; tip.hidden = true; }
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', leave);
  }

  // 折れ線
  // o = { dates:[ymd…], v:{ymd:数}, ma:{ymd:数}, late:{ymd:true}, unit, digits,
  //       refs:[{y,label}], path:{from:{date,y},to:{date,y}}, height }
  function line(el, o) {
    var f = frame(el, o);
    var dates = o.dates, n = dates.length;
    var vals = [];
    dates.forEach(function (d) {
      if (UI.has(o.v[d])) vals.push(o.v[d]);
      if (UI.has(o.ma[d])) vals.push(o.ma[d]);
    });
    (o.refs || []).forEach(function (r) { vals.push(r.y); });
    if (o.path) { vals.push(o.path.from.y); vals.push(o.path.to.y); }
    if (!vals.length) { el.innerHTML = '<div class="nodata">まだデータがありません</div>'; return; }
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = Math.max((hi - lo) * 0.08, 0.2);
    lo -= pad; hi += pad;
    var x = function (i) { return M.l + (n === 1 ? f.pw / 2 : i / (n - 1) * f.pw); };
    var y = function (v) { return M.t + (hi - v) / (hi - lo) * f.ph; };
    var fmt = function (v) { return v.toFixed(o.digits === 0 ? 0 : (hi - lo) < 3 ? 1 : 0); };
    var s = '<svg viewBox="0 0 ' + f.W + ' ' + f.H + '" role="img">';
    s += grid(ticks(lo, hi, 4), y, f.W, fmt);
    s += xLabels(dates, x, f.H);

    // 必要ペースの線（起点→期限）
    if (o.path) {
      var i0 = dates.indexOf(o.path.from.date), i1 = dates.indexOf(o.path.to.date);
      if (i1 >= 0) {
        var xa = i0 >= 0 ? x(i0) : x(0), ya = y(o.path.from.y);
        if (i0 < 0) {
          // 起点がグラフの左外＝左端での高さを比例で出す
          var span = (UI.parse(o.path.to.date) - UI.parse(o.path.from.date)) / 86400000;
          var gone = (UI.parse(dates[0]) - UI.parse(o.path.from.date)) / 86400000;
          ya = y(o.path.from.y + (o.path.to.y - o.path.from.y) * gone / span);
        }
        s += '<line class="path" x1="' + xa.toFixed(1) + '" y1="' + ya.toFixed(1) + '" x2="' + x(i1).toFixed(1) + '" y2="' + y(o.path.to.y).toFixed(1) + '"/>';
      }
    }
    (o.refs || []).forEach(function (r) {
      s += '<line class="ref" x1="' + M.l + '" x2="' + (f.W - M.r) + '" y1="' + y(r.y).toFixed(1) + '" y2="' + y(r.y).toFixed(1) + '"/>' +
        '<text class="reflabel" x="' + (M.l + 4) + '" y="' + (y(r.y) - 4).toFixed(1) + '">' + UI.esc(r.label) + '</text>';
    });

    // その日の点
    dates.forEach(function (d, i) {
      if (!UI.has(o.v[d])) return;
      s += '<circle class="' + (o.late && o.late[d] ? 'dot late' : 'dot') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(o.v[d]).toFixed(1) + '" r="2.6"/>';
    });

    // 7日平均の線（空いた日で切る）
    var seg = '', last = -1;
    dates.forEach(function (d, i) {
      if (!UI.has(o.ma[d])) { seg += ' '; return; }
      seg += (seg === '' || seg.slice(-1) === ' ' ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(o.ma[d]).toFixed(1);
      last = i;
    });
    s += '<path class="ma" d="' + seg.trim() + '"/>';
    if (last >= 0) {
      var lv = o.ma[dates[last]];
      // 最新の値は点の右に書く（右の余白 M.r に収まる）
      s += '<circle class="madot" cx="' + x(last).toFixed(1) + '" cy="' + y(lv).toFixed(1) + '" r="4"/>' +
        '<text class="malabel" x="' + (x(last) + 8).toFixed(1) + '" y="' + (y(lv) + 4).toFixed(1) + '">' + lv.toFixed(o.digits) + '</text>';
    }
    s += '<line class="cross" y1="' + M.t + '" y2="' + (f.H - M.b) + '" style="display:none"/></svg><div class="tip" hidden></div>';
    el.innerHTML = s;

    hover(el, f, n, x, function (px) { return Math.round((px - M.l) / f.pw * (n - 1)); }, function (i) {
      var d = dates[i];
      return '<b>' + UI.mdw(d) + '</b>' +
        (UI.has(o.v[d]) ? '<span>' + o.v[d].toFixed(o.digits) + o.unit + (o.late && o.late[d] ? '（12時以降）' : '') + '</span>' : '') +
        (UI.has(o.ma[d]) ? '<span>7日平均 ' + o.ma[d].toFixed(o.digits) + '</span>' : '');
    }, function (i) { return UI.has(o.v[dates[i]]) || UI.has(o.ma[dates[i]]); });
  }

  // 棒
  // o = { dates, v:{ymd:数}, fmtAxis(v), fmtTip(v), height }
  function bars(el, o) {
    var f = frame(el, o);
    var dates = o.dates, n = dates.length;
    var vals = dates.map(function (d) { return o.v[d]; }).filter(UI.has);
    if (!vals.length) { el.innerHTML = '<div class="nodata">まだデータがありません</div>'; return; }
    var hi = Math.max.apply(null, vals) * 1.05 || 1;
    var step = f.pw / n;
    var bw = Math.max(1.2, Math.min(10, step - 2));
    var x = function (i) { return M.l + step * (i + 0.5); };
    var y = function (v) { return M.t + (hi - v) / hi * f.ph; };
    var base = M.t + f.ph;
    var s = '<svg viewBox="0 0 ' + f.W + ' ' + f.H + '" role="img">';
    s += grid(ticks(0, hi, 3), y, f.W, o.fmtAxis);
    s += xLabels(dates, x, f.H);
    dates.forEach(function (d, i) {
      if (!UI.has(o.v[d]) || o.v[d] <= 0) return;
      var top = y(o.v[d]), h = base - top, r = Math.min(3, bw / 2, h);
      var l = x(i) - bw / 2, rr = x(i) + bw / 2;
      // 上だけ角を丸める
      s += '<path class="bar" d="M' + l.toFixed(1) + ',' + base + 'V' + (top + r).toFixed(1) + 'Q' + l.toFixed(1) + ',' + top.toFixed(1) + ' ' + (l + r).toFixed(1) + ',' + top.toFixed(1) +
        'H' + (rr - r).toFixed(1) + 'Q' + rr.toFixed(1) + ',' + top.toFixed(1) + ' ' + rr.toFixed(1) + ',' + (top + r).toFixed(1) + 'V' + base + 'Z"/>';
    });
    s += '<line class="cross" y1="' + M.t + '" y2="' + base + '" style="display:none"/></svg><div class="tip" hidden></div>';
    el.innerHTML = s;
    hover(el, f, n, x, function (px) { return Math.floor((px - M.l) / step); }, function (i) {
      return '<b>' + UI.mdw(dates[i]) + '</b><span>' + o.fmtTip(o.v[dates[i]]) + '</span>';
    }, function (i) { return UI.has(o.v[dates[i]]); });
  }

  return { line: line, bars: bars };
})();
