import fs from "node:fs";
import vm from "node:vm";
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("starlight.js", "utf8"), context);
const { calc } = context.window.STARLIGHT;
// 攻略 Wiki「シーシュポスの鏡」の獲得量の例(編成ボーナス 0/25/30/60)
const cases = [
  [false, 3, [66, 93, 99, 132]],
  [false, 5, [75, 106, 112, 150]],
  [true, 5, [120, 170, 180, 240]], // Wiki は25で171(端数の扱い差)
  [true, 10, [220, 313, 331, 440]]
];
for (const [hard, floor, expected] of cases) [0, 25, 30, 60].forEach((bonus, i) => {
  const got = calc({ hard, floor, bonus }).total;
  if (got !== expected[i]) throw new Error(`${hard ? "ハード" : "ノーマル"}${floor}層 ボーナス${bonus}: ${got} != ${expected[i]}`);
});
if (calc({ hard: true, floor: 15, bonus: 0, railway: 1 }).total !== 325) throw new Error("鉄道パック加算");
if (calc({ hard: true, floor: 15, bonus: 0, constraint: 24 }).total !== 680) throw new Error("制約ボーナス");
if (calc({ hard: true, floor: 5, bonus: 0, constraint: 24 }).total !== 120) throw new Error("10層以下で制約が加算されている");
console.log("OK: starlight");
// 途中切り替え: 3層からハードで5層クリア = 基礎15 + ハード(9+12+15)
if (context.window.STARLIGHT.explorationScore(3, 5) !== 51) throw new Error("途中切り替えの探査点数");
if (calc({ hardFrom: 3, floor: 5, bonus: 0 }).total !== 111) throw new Error("途中切り替えの合計");
if (calc({ hardFrom: 1, floor: 5, bonus: 0 }).total !== calc({ hard: true, floor: 5, bonus: 0 }).total) throw new Error("hardFrom=1 とハードが不一致");
console.log("OK: starlight switch");
