(() => {
  "use strict";

  // 攻略 Wiki「シーシュポスの鏡」の獲得量計算式:
  // 基本60 + 編成ボーナス + 戦闘報酬カード + 制約P×15 + (探査点数 + 鉄道パック×5) × 編成ボーナス倍率
  const normalScore = [1, 3, 6, 10, 15];

  function explorationScore(hard, floor) {
    if (!hard) return normalScore[Math.min(floor, 5) - 1];
    if (floor <= 5) return normalScore[floor - 1] * 4; // 基礎点 + ハード点(基礎点×3)
    return 60 + (floor - 5) * 20;
  }

  function calc({ hard, floor, bonus, railway = 0, constraint = 0, cards = 0 }) {
    bonus = Math.max(0, Math.min(60, bonus));
    const multiplier = Math.min(2, 1 + bonus * 0.017);
    const score = explorationScore(hard, floor) + railway * 5;
    const extreme = hard && floor > 10 ? constraint * 15 : 0;
    // ponytail: 端数は切り捨て。Wiki の例とは1件だけ1ずれる(5層ハード・ボーナス25で171)
    const explored = Math.floor(score * multiplier);
    return { total: 60 + bonus + cards + extreme + explored, multiplier, score, explored, extreme };
  }

  window.STARLIGHT = { calc, explorationScore };
  if (typeof document === "undefined" || !document.getElementById("starTool")) return;

  const $ = id => document.getElementById(id);
  const num = id => Math.max(0, Number($(id).value) || 0);

  function syncFloors() {
    const hard = $("starHard").checked;
    const max = hard ? 15 : 5;
    const current = Math.min(Number($("starFloor").value) || max, max);
    $("starFloor").replaceChildren(...Array.from({ length: max }, (_, i) => new Option(`${i + 1}層`, i + 1)));
    $("starFloor").value = current;
  }

  function render() {
    const hard = $("starHard").checked;
    const floor = Number($("starFloor").value);
    $("starRailway").disabled = !hard;
    $("starConstraint").disabled = !(hard && floor > 10);
    const input = { hard, floor, bonus: num("starBonus"), railway: hard ? num("starRailway") : 0, constraint: num("starConstraint"), cards: num("starCards") };
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

  $("starHard").onchange = $("starNormal").onchange = () => { syncFloors(); render(); };
  document.querySelectorAll("#starTool input, #starTool select").forEach(el => el.addEventListener("input", render));
  syncFloors();
  render();
})();
