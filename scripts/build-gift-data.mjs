import { readFile, writeFile } from "node:fs/promises";

// ギフト・合成・パックは Eldritch Tools、日本語名と効果は LimbusCompany攻略 Wiki から取得して data.js を作り直す。
// 使い方: node scripts/build-gift-data.mjs [gifts.json] [md_theme_packs.json] [wiki.html]
const ASSETS = "https://raw.githubusercontent.com/eldritchtools/limbus-assets/main/data";
const WIKI_URL = "https://wikiwiki.jp/lcbwiki/" + encodeURIComponent("鏡ダンジョン") + "/" + encodeURIComponent("E.G.Oギフト");

async function source(path, url) {
  if (path) return readFile(path, "utf8");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (response.ok) return response.text();
    if (response.status !== 429 || attempt === 3) throw new Error(`${response.status}: ${url}`);
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
}

function text(html) {
  return html
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<a[^>]*class="note_super[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&nbsp;|&ensp;|&emsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

const key = name => name.normalize("NFKD").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

const [giftPath, packPath, wikiPath] = process.argv.slice(2);
const eldritch = JSON.parse(await source(giftPath, `${ASSETS}/gifts.json`));
const themePacks = JSON.parse(await source(packPath, `${ASSETS}/md_theme_packs.json`));
const wiki = await source(wikiPath, WIKI_URL);

// Wiki の各行: ID | 画像(anchor=英語名)+日本語名 | 罪 | ランク | 価格 | 強化 | 効果 | 入手 | キーワード
const jp = new Map();
for (const [, row] of wiki.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
  const anchor = row.match(/class="anchor" name ="([^"]+)"/)?.[1];
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
  if (!anchor || cells.length < 7 || jp.has(key(anchor))) continue;
  jp.set(key(anchor), { name: text(cells[1]), effect: text(cells[6]) });
}

// Wiki で引けないギフトは前回の data.js の日本語を引き継ぐ
const previous = { window: {} };
new Function("window", await readFile("data.js", "utf8").catch(() => ""))(previous.window);
const old = previous.window.GIFT_DATA || {};

const gifts = {};
const missing = [];
for (const [id, gift] of Object.entries(eldritch)) {
  const enName = gift.names[0];
  const kept = old[id]?.names?.[0] !== old[id]?.enName && old[id];
  const ja = jp.get(key(enName)) || jp.get(key(gift.srcPath || "")) || (kept && { name: kept.names[0], effect: kept.effect });
  if (!ja) missing.push(`${id} ${enName}`);
  gifts[id] = {
    names: [ja?.name || enName],
    enName,
    effect: ja?.effect || gift.descs.join("\n"),
    imageKey: gift.srcPath || enName,
    tier: gift.tier,
    keyword: gift.keyword,
    ...(gift.fusion && { fusion: true, recipes: gift.recipes }),
    ...(gift.exclusiveTo?.length && { exclusiveTo: gift.exclusiveTo })
  };
}

const packs = Object.fromEntries(Object.entries(themePacks).map(([id, pack]) => [id, {
  category: pack.category, image: pack.image, name: pack.name, tags: pack.tags,
  ...(pack.exclusive_gifts?.length && { exclusive_gifts: pack.exclusive_gifts })
}]));

await writeFile("data.js", `window.GIFT_DATA=${JSON.stringify(gifts)};\nwindow.PACK_DATA=${JSON.stringify(packs)};\n`);
console.log(`data.js: ${Object.keys(gifts).length} gifts / ${Object.keys(packs).length} packs`);
if (missing.length) console.log(`日本語なし(英語のまま) ${missing.length}件:\n${missing.join("\n")}`);
