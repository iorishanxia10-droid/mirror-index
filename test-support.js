import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.runInNewContext(fs.readFileSync("support-data.js", "utf8"), context);
vm.runInNewContext(fs.readFileSync("support-ranking.js", "utf8"), context);
const identities = context.window.IDENTITY_DATA;
const solo = identities.find(identity => identity.code === "0116");
const ranked = context.window.SUPPORT_RANKING.recommendations(solo, identities);
const candidates = ranked.flatMap(group => group.candidates);

if (identities.length < 185 || identities.some(identity => !identity.support)) throw new Error("人格またはサポートパッシブの欠損があります");
if (ranked.length !== 11 || ranked.some(group => group.candidates.length !== 3)) throw new Error("囚人別3候補の推薦に失敗しました");
if (new Set(ranked.map(group => group.sinner)).size !== 11 || candidates.length !== 33) throw new Error("囚人別推薦の集計に失敗しました");
if (ranked.some((group, index) => index && Number(ranked[index - 1].candidates[0].candidate.code.slice(0, 2)) > Number(group.candidates[0].candidate.code.slice(0, 2)))) throw new Error("囚人番号順の表示に失敗しました");
if (candidates.some(result => result.candidate.sinner === solo.sinner)) throw new Error("出撃囚人が控え候補に含まれています");
if (!candidates.some(result => result.reasons.some(reason => reason.includes("破裂") || reason.includes("充電")))) throw new Error("キーワード推薦に失敗しました");

const owned = identities.find(identity => identity.support.condition === "保有" && Object.keys(identity.support.requirements).some(sin => !solo.affinities[sin]));
const resonance = identities.find(identity => identity.support.condition === "共鳴" && Object.keys(identity.support.requirements).some(sin => !solo.affinities[sin]));
if (!context.window.SUPPORT_RANKING.scoreSupport(solo, owned).ready) throw new Error("鏡の資源保有条件が候補から外れています");
if (context.window.SUPPORT_RANKING.scoreSupport(solo, resonance).ready) throw new Error("共鳴できないスキル色を発動可能と判定しています");
if (!context.window.SUPPORT_RANKING.scoreSupport(solo, identities.find(identity => identity.name === "LCB囚人" && identity.sinner !== solo.sinner)).starter) throw new Error("初期人格の判定に失敗しました");
const rodionGroup = ranked.find(group => group.sinner === "ロージャ");
const hongLuGroup = ranked.find(group => group.sinner === "ホンル");
if (!rodionGroup.candidates.some(result => result.candidate.code === "0901" && result.reasons.includes("ダメージ+20%"))) throw new Error("LCB囚人ロージャの火力評価に失敗しました");
if (!hongLuGroup.candidates.some(result => result.candidate.code === "0603" && result.reasons.includes("ダメージ+20%"))) throw new Error("ぽんぽん派ホンルの火力評価に失敗しました");
console.log(`OK: ${identities.length} identities / ${candidates.length} recommendations across ${ranked.length} sinners`);
