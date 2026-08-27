import { readFile, writeFile } from "node:fs/promises";

const PASSIVE_URL = "https://wikiwiki.jp/lcbwiki/%E4%B8%80%E8%A6%A7%E8%A1%A8/%E3%83%91%E3%83%83%E3%82%B7%E3%83%96%E3%82%B9%E3%82%AD%E3%83%AB";
const IDENTITY_URL = "https://wikiwiki.jp/lcbwiki/%E4%BA%BA%E6%A0%BC%E3%83%BBEGO%E4%B8%80%E8%A6%A7/%E5%AF%BE%E5%BF%9C%E3%82%AD%E3%83%BC%E3%83%AF%E3%83%BC%E3%83%89/%E9%8F%A1%E3%83%80%E3%83%B3%E3%82%B8%E3%83%A7%E3%83%B3%E5%9F%BA%E6%BA%96";
const sins = ["憤怒", "色欲", "怠惰", "暴食", "憂鬱", "傲慢", "嫉妬"];
const keywords = ["火傷", "出血", "振動", "破裂", "沈潜", "呼吸", "充電"];

async function source(path, url) {
  if (path) return readFile(path, "utf8");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.text();
}

function text(html) {
  return html
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&nbsp;|&ensp;|&emsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function tableRows(html, index) {
  const table = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)][index]?.[0];
  if (!table) throw new Error(`表${index}を取得できませんでした`);
  return [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(row =>
    [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => text(cell[1]))
  );
}

const [passivePath, identityPath] = process.argv.slice(2);
const [passiveHtml, identityHtml] = await Promise.all([source(passivePath, PASSIVE_URL), source(identityPath, IDENTITY_URL)]);
const supports = new Map(tableRows(passiveHtml, 1).filter(row => /^\d{4}$/.test(row[0])).map(row => [row[0], {
  name: row[1],
  effect: row[4],
  condition: row[5],
  requirements: Object.fromEntries(sins.map((sin, index) => [sin, parseInt(row[index + 6]) || 0]).filter(([, value]) => value))
}]));

supports.set("0616", {
  name: "退路を融かしておきますね",
  effect: "速度が最も高い味方が火傷または特殊火傷を保有した敵にマッチ勝利時、次のターンに束縛1を付与(1ターンにつき1回)\n-対象の火傷回数が4以下なら、追加でこのターンに対象の火傷回数が1増加\n-対象の火傷回数が5以上なら、追加でこのターンに火傷3を付与",
  condition: "共鳴",
  requirements: { "憤怒": 3 }
});

const identities = tableRows(identityHtml, 0).filter(row => /^\d{4}$/.test(row[0])).map(row => ({
  id: String(10000 + Number(row[0])),
  code: row[0],
  name: row[2],
  sinner: row[3],
  date: row[4],
  keywords: keywords.filter((_, index) => row[index + 5]),
  physical: [...row[13]].filter(type => "斬貫打".includes(type)),
  affinities: Object.fromEntries(sins.map((sin, index) => [sin, parseInt(row[index + 14]) || 0]).filter(([, value]) => value)),
  support: supports.get(row[0]) || null,
  wiki: `https://wikiwiki.jp/lcbwiki/${["人格", row[3], row[2]].map(encodeURIComponent).join("/")}`
}));

if (identities.length < 180) throw new Error(`人格データ不足: ${identities.length}`);
if (identities.filter(identity => identity.support).length < 180) throw new Error("サポートパッシブデータが不足しています");
await writeFile("support-data.js", `window.IDENTITY_DATA = ${JSON.stringify(identities, null, 2)};\n`);
console.log(`OK: ${identities.length} identities / ${identities.filter(identity => identity.support).length} support passives`);
