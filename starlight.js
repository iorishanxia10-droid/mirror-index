(() => {
  "use strict";

  // 攻略 Wiki「シーシュポスの鏡」の獲得量計算式:
  // 基本60 + 編成ボーナス + 戦闘報酬カード + 制約P×15 + (探査点数 + 鉄道パック×5) × 編成ボーナス倍率
  // 探査点数は階層kのクリアで 基礎点+k、ハードならさらに+3k(5層で基礎15・ハード45)。6層以降は1層ごとに+20
  // hardFrom: ハードに切り替えた階層(1=最初からハード、null=ノーマルのみ)
  // ponytail: 途中切り替えは Wiki の表から推定した階層ごとの加算。実測で合わなければここを直す
  function explorationScore(hardFrom, floor) {
    let score = 0;
    for (let k = 1; k <= Math.min(floor, 5); k++) score += k + (hardFrom && k >= hardFrom ? 3 * k : 0);
    return score + Math.max(0, floor - 5) * 20;
  }

  function calc({ hard, hardFrom = hard ? 1 : null, floor, bonus, railway = 0, constraint = 0, cards = 0 }) {
    bonus = Math.max(0, Math.min(60, bonus));
    const multiplier = Math.min(2, 1 + bonus * 0.017);
    const score = explorationScore(hardFrom, floor) + (hardFrom ? railway * 5 : 0);
    const extreme = hardFrom === 1 && floor > 10 ? constraint * 15 : 0;
    // ponytail: 端数は切り捨て。Wiki の例とは1件だけ1ずれる(5層ハード・ボーナス25で171)
    const explored = Math.floor(score * multiplier);
    return { total: 60 + bonus + cards + extreme + explored, multiplier, score, explored, extreme };
  }

  window.STARLIGHT = { calc, explorationScore };
  if (typeof document === "undefined" || !document.getElementById("starTool")) return;

  const $ = id => document.getElementById(id);
  const num = id => Math.max(0, Number($(id).value) || 0);

  // 途中から切り替えた場合は平行重畳(6層以降)に入れないので5層まで
  const hardFrom = () => $("starHard").checked ? 1 : $("starSwitch").checked ? Number($("starHardFrom").value) : null;

  function syncFloors() {
    const max = $("starHard").checked ? 15 : 5;
    const current = Math.min(Number($("starFloor").value) || max, max);
    $("starFloor").replaceChildren(...Array.from({ length: max }, (_, i) => new Option(`${i + 1}層`, i + 1)));
    $("starFloor").value = current;
    $("starHardFromLabel").hidden = !$("starSwitch").checked;
  }

  function render() {
    const from = hardFrom();
    const floor = Number($("starFloor").value);
    $("starRailway").disabled = !from;
    $("starConstraint").disabled = !(from === 1 && floor > 10);
    const input = { hardFrom: from, floor, bonus: num("starBonus"), railway: num("starRailway"), constraint: num("starConstraint"), cards: num("starCards") };
    const r = calc(input);
    const spent = num("starSpent");
    $("starTotal").textContent = r.total;
    $("starNet").textContent = spent ? `消費 ${spent} を引くと ${r.total - spent >= 0 ? "+" : ""}${r.total - spent}` : "";
    $("starBreakdown").innerHTML = [
      ["基本", 60],
      ["編成ボーナス", Math.min(60, input.bonus)],
      [`探査点数 ${r.score} × ${r.multiplier.toFixed(3)}`, r.explored],
      ["制約ボーナス", r.extreme],
      ["戦闘報酬カード", input.cards]
    ].map(([label, value]) => `<li><span>${label}</span><strong>${value}</strong></li>`).join("");
  }

  $("starHard").onchange = $("starNormal").onchange = $("starSwitch").onchange = () => { syncFloors(); render(); };
  document.querySelectorAll("#starTool input, #starTool select").forEach(el => el.addEventListener("input", render));
  syncFloors();
  render();
})();
