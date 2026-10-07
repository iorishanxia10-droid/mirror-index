import { readFile, writeFile } from "node:fs/promises";

const PASSIVE_URL = "https://wikiwiki.jp/lcbwiki/%E4%B8%80%E8%A6%A7%E8%A1%A8/%E3%83%91%E3%83%83%E3%82%B7%E3%83%96%E3%82%B9%E3%82%AD%E3%83%AB";
const IDENTITY_URL = "https://wikiwiki.jp/lcbwiki/%E4%BA%BA%E6%A0%BC%E3%83%BBEGO%E4%B8%80%E8%A6%A7/%E5%AF%BE%E5%BF%9C%E3%82%AD%E3%83%BC%E3%83%AF%E3%83%BC%E3%83%89/%E9%8F%A1%E3%83%80%E3%83%B3%E3%82%B8%E3%83%A7%E3%83%B3%E5%9F%BA%E6%BA%96";
const ASSET_IDENTITY_URL = "https://raw.githubusercontent.com/eldritchtools/limbus-assets/main/data/identities.json";
const ASSET_PASSIVE_URL = "https://raw.githubusercontent.com/eldritchtools/limbus-assets/main/data/passives.json";
const sins = ["憤怒", "色欲", "怠惰", "暴食", "憂鬱", "傲慢", "嫉妬"];
const sinNames = { wrath: "憤怒", lust: "色欲", sloth: "怠惰", gluttony: "暴食", gloom: "憂鬱", pride: "傲慢", envy: "嫉妬" };
const keywords = ["火傷", "出血", "振動", "破裂", "沈潜", "呼吸", "充電"];
const affiliationNames = ["蜘蛛の巣", "中指", "親指", "人差し指", "薬指", "小指", "剣契", "黒雲会", "ピークォド号", "夜明事務所", "炎拳事務所", "技術解放連合", "マルチクラック事務所", "センク協会", "シ協会", "セブン協会", "ディエーチ協会", "ツヴァイ協会", "リウ協会", "ヂェーヴィチ協会", "ぽんぽん派", "ユロージヴィ"];

async function source(path, url) {
  if (path) return readFile(path, "utf8");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url);
    if (response.ok) return response.text();
    if (response.status !== 429 || attempt === 3) throw new Error(`${response.status}: ${url}`);
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
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

function tableRows(html, index, imageFallback = false) {
  const table = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)][index]?.[0];
  if (!table) throw new Error(`表${index}を取得できませんでした`);
  return [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(row =>
    [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => {
      const value = text(cell[1]);
      if (value) return value;
      return imageFallback ? (cell[1].match(/(?:alt|title)="([^"]+)"/i)?.[1] || "").replace(/\.(?:webp|png).*$/i, "") : "";
    })
  );
}

function allTableRows(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].flatMap((_, index) => tableRows(html, index));
}

function affiliations(row) {
  const raw = row[1].replace(/[()（）]/g, "");
  const primary = /^(?:LCB囚人|LCCB|LCE|LCA|LCD)$/.test(raw) ? "LimbusCompany" : raw;
  return [...new Set([primary, ...affiliationNames.filter(name => row[2].includes(name))].filter(Boolean))];
}

function skill3(row, assetIdentities) {
  const id = String(10000 + Number(row[0]));
  const skill = assetIdentities[id]?.skillTypes?.find(item => item.num > 0 && item.type?.tier === 3);
  const affinity = sinNames[skill?.type?.affinity];
  if (!affinity) throw new Error(`S3属性を取得できません: ${row[0]} ${row[2]}`);
  return affinity;
}

const [passivePath, identityPath] = process.argv.slice(2);
const [passiveHtml, identityHtml, assetIdentities, assetPassives] = await Promise.all([
  source(passivePath, PASSIVE_URL), source(identityPath, IDENTITY_URL), source(null, ASSET_IDENTITY_URL).then(JSON.parse), source(null, ASSET_PASSIVE_URL).then(JSON.parse)
]);

// Wiki 未掲載の新人格は Eldritch Tools の英語サポートパッシブで代用する
function assetSupport(id) {
  const passive = assetPassives.support[id]?.at(-1)?.passives?.[0];
  if (!passive) return null;
  return {
    name: passive.name,
    effect: passive.desc,
    condition: passive.condition?.type === "res" ? "共鳴" : "保有",
    requirements: Object.fromEntries((passive.condition?.requirement || []).map(({ type, value }) => [sinNames[type], value]))
  };
}
const supports = new Map(allTableRows(passiveHtml).filter(row => /^\d{4}$/.test(row[0]) && /保有|共鳴/.test(row[5])).map(row => [row[0], {
  name: row[1],
  effect: row[4],
  condition: row[5],
  requirements: Object.fromEntries(sins.map((sin, index) => [sin, parseInt(row[index + 6]) || 0]).filter(([, value]) => value))
}]));

try {
  const previous = JSON.parse((await readFile("support-data.js", "utf8")).replace(/^window\.IDENTITY_DATA\s*=\s*/, "").replace(/;\s*$/, ""));
  previous.forEach(identity => { if (identity.support && !supports.has(identity.code)) supports.set(identity.code, identity.support); });
} catch {}

supports.set("0616", {
  name: "退路を融かしておきますね",
  effect: "速度が最も高い味方が火傷または特殊火傷を保有した敵にマッチ勝利時、次のターンに束縛1を付与(1ターンにつき1回)\n-対象の火傷回数が4以下なら、追加でこのターンに対象の火傷回数が1増加\n-対象の火傷回数が5以上なら、追加でこのターンに火傷3を付与",
  condition: "共鳴",
  requirements: { "憤怒": 3 }
});

const identities = tableRows(identityHtml, 0, true).filter(row => /^\d{4}$/.test(row[0])).map(row => {
  const name = row[2].replace(/\s+/g, " ").trim();
  return ({
  id: String(10000 + Number(row[0])),
  code: row[0],
  name,
  sinner: row[3],
  date: row[4],
  keywords: keywords.filter((_, index) => row[index + 5]),
  physical: [...row[13]].filter(type => "斬貫打".includes(type)),
  affinities: Object.fromEntries(sins.map((sin, index) => [sin, parseInt(row[index + 14]) || 0]).filter(([, value]) => value)),
  s3: skill3(row, assetIdentities),
  affiliations: affiliations([row[0], row[1], name]),
  support: supports.get(row[0]) || assetSupport(String(10000 + Number(row[0]))),
  wiki: `https://wikiwiki.jp/lcbwiki/${["人格", row[3], name].map(encodeURIComponent).join("/")}`
  });
});

if (identities.length < 180) throw new Error(`人格データ不足: ${identities.length}`);
if (identities.filter(identity => identity.support).length < 180) throw new Error(`サポートパッシブデータが不足しています: ${identities.filter(identity => identity.support).length}/${identities.length} (${identities.filter(identity => !identity.support).map(identity => identity.code).join(",")})`);
await writeFile("support-data.js", `window.IDENTITY_DATA = ${JSON.stringify(identities, null, 2)};\n`);
console.log(`OK: ${identities.length} identities / ${identities.filter(identity => identity.support).length} support passives`);
