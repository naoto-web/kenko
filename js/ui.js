// ui.js — 画面の共通部品（文字の無害化・数字と日付の書き方・トースト）
var UI = (function () {
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function has(v) { return v !== null && v !== undefined && v !== ''; }

  // 小数 k 桁（なければ「—」）
  function num(v, k) { return has(v) ? Number(v).toFixed(k || 0) : '—'; }

  // 4桁以上はカンマ
  function comma(v) { return has(v) ? Math.round(Number(v)).toLocaleString('ja-JP') : '—'; }

  // 符号つき（+0.10 / −0.20）
  function signed(v, k) {
    if (!has(v)) return '—';
    var n = Number(v);
    return (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toFixed(k);
  }

  // 419 → 「6時間59分」
  function hm(min) {
    if (!has(min)) return '—';
    return Math.floor(min / 60) + '時間' + ('0' + (min % 60)).slice(-2) + '分';
  }

  function parse(ymd) {
    var p = String(ymd).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
  }

  // "2026-11-11" → 「11/11」
  function md(ymd) {
    var d = parse(ymd);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  // "2026-11-11" → 「11/11(水)」
  function mdw(ymd) {
    return md(ymd) + '(' + WD[parse(ymd).getDay()] + ')';
  }

  function ymd(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function addDays(s, n) {
    var d = parse(s);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }

  // 生活日＝朝5時で日付を区切る（GASの lifeDay_ と同じ）
  function lifeDay() {
    return ymd(new Date(Date.now() - 5 * 3600000));
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  return { esc: esc, has: has, num: num, comma: comma, signed: signed, hm: hm, md: md, mdw: mdw, addDays: addDays, lifeDay: lifeDay, toast: toast, WD: WD, parse: parse };
})();
