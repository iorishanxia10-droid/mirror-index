(() => {
  "use strict";

  const firepower = /ダメージ量(?:増加|\+)|攻撃威力増加|攻撃レベル増加|コイン威力|最終威力|クリティカルダメージ|脆弱/;
  const sustain = /体力.*回復|精神力.*回復|保護|バリア|混乱.*(?:防止|ならない)/;
  const speed = /クイック|速度|束縛/;
  const soloTarget = /味方1名|味方が|最も(?:高|低|多|少|速)/;
  const physicalNames = { "斬": "斬撃", "貫": "貫通", "打": "打撃" };

  function scoreSupport(solo, candidate) {
    const passive = candidate.support;
    let score = 0;
    let ready = true;
    const reasons = [];

    Object.entries(passive.requirements).forEach(([sin, required]) => {
      const count = solo.affinities[sin] || 0;
      if (count) {
        score += (passive.condition.includes("共鳴") ? 4 : 3) + Math.min(count, 3);
        reasons.push(`${sin}${required}${passive.condition}を自力で狙える`);
      } else {
        score -= 8;
        ready = false;
        reasons.push(`${sin}はギフト等で補助が必要`);
      }
    });

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
    if (firepower.test(passive.effect)) { score += 3; reasons.push("火力支援"); }
    if (sustain.test(passive.effect)) { score += 2; reasons.push("継戦支援"); }
    if (speed.test(passive.effect)) { score += 1; reasons.push("速度支援"); }
    if (soloTarget.test(passive.effect)) { score += 2; reasons.push("単騎なら対象が安定"); }

    return { candidate, score, ready, reasons: [...new Set(reasons)].slice(0, 4) };
  }

  function recommendations(solo, identities) {
    const bestBySinner = new Map();
    identities.filter(identity => identity.sinner !== solo.sinner && identity.support).forEach(candidate => {
      const result = scoreSupport(solo, candidate);
      const current = bestBySinner.get(candidate.sinner);
      if (!current || result.score > current.score) bestBySinner.set(candidate.sinner, result);
    });
    return [...bestBySinner.values()].sort((a, b) => b.score - a.score || a.candidate.sinner.localeCompare(b.candidate.sinner, "ja"));
  }

  window.SUPPORT_RANKING = { scoreSupport, recommendations };
})();
