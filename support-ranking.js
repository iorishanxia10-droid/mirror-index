(() => {
  "use strict";

  const firepower = /ダメージ量(?:増加|\+)|攻撃威力増加|攻撃レベル増加|コイン威力|最終威力|クリティカルダメージ|脆弱/;
  const sustain = /体力.*回復|精神力.*回復|保護|バリア|混乱.*(?:防止|ならない)/;
  const speed = /クイック|速度|束縛/;
  const soloTarget = /味方1名|味方が|最も(?:高|低|多|少|速)/;
  const physicalNames = { "斬": "斬撃", "貫": "貫通", "打": "打撃" };
  const giftKeywords = { Burn: "火傷", Bleed: "出血", Tremor: "振動", Rupture: "破裂", Sinking: "沈潜", Poise: "呼吸", Charge: "充電", Slash: "斬撃", Pierce: "貫通", Blunt: "打撃" };
  const resourceFragments = new Set(["業火の欠片", "魅惑の欠片", "惰性の欠片", "欲望の欠片", "蚕食の欠片", "驕慢の欠片", "摩擦の欠片"]);

  function requiresParty(effect) {
    return effect.split("\n").some(line => !line.includes("追加発動") && /(?:人格|人員)[^。]{0,60}[2-9]名以上/.test(line) && /発動/.test(line));
  }

  function fixedDamageBonus(effect) {
    const values = [...effect.matchAll(/(?:与)?ダメージ量(?:増加)?\+(\d+)(?:\/(\d+))?%/g)].flatMap(match => match.slice(1).filter(Boolean).map(Number));
    return Math.max(0, ...values);
  }

  function scoreSupport(solo, candidate) {
    const passive = candidate.support;
    const resonance = passive.condition.includes("共鳴");
    const starter = candidate.name === "LCB囚人";
    let score = 0;
    let ready = true;
    const reasons = [];

    if (resonance) {
      Object.entries(passive.requirements).forEach(([sin, required]) => {
        if (solo.s3 === sin) {
          score += 7;
          reasons.push(`S3の${sin}で${required}共鳴を狙える`);
        } else {
          score -= 10;
          ready = false;
          reasons.push(`交換後のS3は${solo.s3 || "不明"}のため${sin}共鳴不可`);
        }
      });
    } else {
      score += 3;
      reasons.push("保有条件は鏡ギフトの資源で達成可能");
    }

    solo.keywords.forEach(keyword => {
      if (!passive.effect.includes(keyword)) return;
      score += 6;
      reasons.push(`${keyword}を直接支援`);
    });
    solo.physical.forEach(type => {
      if (!passive.effect.includes(physicalNames[type])) return;
      score += 3;
      reasons.push(`${physicalNames[type]}を強化`);
    });
    const damageBonus = fixedDamageBonus(passive.effect);
    if (damageBonus) {
      score += Math.min(damageBonus / 2, 12);
      reasons.push(`ダメージ+${damageBonus}%`);
    } else if (firepower.test(passive.effect)) {
      score += 3;
      reasons.push("火力支援");
    }
    if (sustain.test(passive.effect)) { score += 2; reasons.push("継戦支援"); }
    if (speed.test(passive.effect)) { score += 1; reasons.push("速度支援"); }
    if (soloTarget.test(passive.effect)) { score += 2; reasons.push("単騎なら対象が本人に固定"); }
    if (starter) { score += 1.5; reasons.push("初期人格で用意しやすい"); }

    return { candidate, score, ready, starter, reasons: [...new Set(reasons)].slice(0, 5) };
  }

  function recommendations(solo, identities, perSinner = 3) {
    const bySinner = new Map();
    identities.filter(identity => identity.sinner !== solo.sinner && identity.support).forEach(candidate => {
      if (!bySinner.has(candidate.sinner)) bySinner.set(candidate.sinner, []);
      bySinner.get(candidate.sinner).push(scoreSupport(solo, candidate));
    });
    const compare = (a, b) => b.score - a.score || Number(b.starter) - Number(a.starter) || a.candidate.code.localeCompare(b.candidate.code);
    return [...bySinner.entries()].map(([sinner, candidates]) => ({
      sinner,
      candidates: candidates.sort(compare).slice(0, perSinner)
    })).sort((a, b) => Number(a.candidates[0].candidate.code.slice(0, 2)) - Number(b.candidates[0].candidate.code.slice(0, 2)));
  }

  function scoreGift(solo, gift) {
    const effect = gift.effect || "";
    const eligible = !requiresParty(effect) && !resourceFragments.has(gift.names?.[0]);
    let score = 0;
    const reasons = [];
    const keyword = giftKeywords[gift.keyword];
    if (keyword && solo.keywords.includes(keyword)) {
      score += 12;
      reasons.push(`${keyword}人格向け`);
    }
    if (keyword && solo.physical.some(type => physicalNames[type] === keyword)) {
      score += 8;
      reasons.push(`${keyword}スキルを強化`);
    }
    solo.affiliations?.forEach(affiliation => {
      const aliases = affiliation === "LimbusCompany" ? ["LimbusCompany", "リンバス・カンパニー", "リンバス·カンパニー"] : [affiliation];
      if (!aliases.some(alias => effect.includes(alias))) return;
      score += 14;
      reasons.push(`${affiliation}所属への専用効果`);
    });
    if (effect.includes(`${solo.name} ${solo.sinner}専用効果`)) {
      score += 40;
      reasons.push(`${solo.name}専用効果`);
    }
    if (/\[編成(?:順)?1番人格専用効果\]/.test(effect)) {
      score += 10;
      reasons.push("単騎の編成1番で専用効果が発動");
    }
    if (solo.s3 && effect.includes(solo.s3)) {
      score += 4;
      reasons.push(`S3の${solo.s3}属性と一致`);
    }
    if (/スキル3|スキルランク3/.test(effect)) {
      score += 3;
      reasons.push("交換後のS3運用を強化");
    }
    if (solo.keywords.some(value => effect.includes(value))) score += 3;
    if (solo.physical.some(type => effect.includes(physicalNames[type]))) score += 2;
    if (/体力.*回復|精神力.*回復|バリア|保護/.test(effect)) {
      score += 2;
      reasons.push("単騎の継戦力を補助");
    }
    if (/ダメージ量\+|コイン威力\+|最終威力\+|マッチ威力\+|攻撃レベル増加/.test(effect)) {
      score += 2;
      reasons.push("火力・マッチ性能を補助");
    }
    if (/攻撃レベル(?:増加|\+)/.test(effect)) {
      score += 8;
      reasons.push("攻撃レベル増加を優先");
    }
    return { gift, score, eligible, reasons: [...new Set(reasons)].slice(0, 6) };
  }

  function giftRecommendations(solo, gifts, limit = 8) {
    return Object.entries(gifts).map(([id, gift]) => scoreGift(solo, { id, ...gift }))
      .filter(result => result.eligible && result.score >= 7)
      .sort((a, b) => b.score - a.score || Number(b.gift.tier) - Number(a.gift.tier) || a.gift.names[0].localeCompare(b.gift.names[0]))
      .slice(0, limit);
  }

  window.SUPPORT_RANKING = { scoreSupport, recommendations, scoreGift, giftRecommendations };
})();
