import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.runInNewContext(fs.readFileSync("support-data.js", "utf8"), context);
vm.runInNewContext(fs.readFileSync("support-ranking.js", "utf8"), context);
const identities = context.window.IDENTITY_DATA;
const solo = identities.find(identity => identity.code === "0116");
const ranked = context.window.SUPPORT_RANKING.recommendations(solo, identities);

if (identities.length < 185 || identities.some(identity => !identity.support)) throw new Error("人格またはサポートパッシブの欠損があります");
if (ranked.length !== 11 || new Set(ranked.map(result => result.candidate.sinner)).size !== 11) throw new Error("囚人別推薦に失敗しました");
if (ranked.some(result => result.candidate.sinner === solo.sinner)) throw new Error("出撃囚人が控え候補に含まれています");
if (!ranked.some(result => result.reasons.some(reason => reason.includes("破裂") || reason.includes("充電")))) throw new Error("キーワード推薦に失敗しました");
console.log(`OK: ${identities.length} identities / ${ranked.length} sinner recommendations`);
