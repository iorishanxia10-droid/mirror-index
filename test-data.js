import fs from "node:fs";
import vm from "node:vm";
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("data.js", "utf8"), context);
vm.runInNewContext(fs.readFileSync("gift-overrides.js", "utf8"), context);
const gifts = context.window.GIFT_DATA;
const packs = context.window.PACK_DATA;
const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");

if (!html.includes('id="giftPreviewDialog"') || !app.includes('addGiftCardInteractions(card, gift)')) throw new Error("ギフト長押し説明の配線が不足しています");

if (Object.keys(gifts).length < 300) throw new Error("ギフトデータが不足しています");
if (Object.keys(packs).length < 40) throw new Error("パックデータが不足しています");
for (const [id, gift] of Object.entries(gifts)) {
  if (!gift.names?.[0] || !gift.enName || !gift.effect || !gift.imageKey || !gift.keyword || !gift.tier) throw new Error(`必須項目不足: ${id}`);
  if (gift.names[0] === gift.enName) throw new Error(`日本語名不足: ${id}`);
  for (const recipe of gift.recipes || []) for (const material of recipe) {
    if (!gifts[material]) throw new Error(`不明な合成素材: ${id} <- ${material}`);
  }
  for (const pack of gift.exclusiveTo || []) {
    if (!packs[pack]) throw new Error(`不明なパック: ${id} <- ${pack}`);
  }
}
function leavesFor(id, visiting = new Set()) {
  const gift = gifts[id];
  if (!gift.fusion || visiting.has(id)) return [id];
  visiting.add(id);
  return gift.recipes[0].flatMap(material => leavesFor(material, new Set(visiting)));
}
const sootheMaterials = leavesFor("9088");
if (!sootheMaterials.includes("9003") || !sootheMaterials.includes("9101")) {
  throw new Error("再帰的な基礎素材展開に失敗しました");
}
console.log(`OK: ${Object.keys(gifts).length} gifts / ${Object.values(gifts).filter(g => g.fusion).length} fusions / ${Object.keys(packs).length} packs`);
