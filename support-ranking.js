(() => {
  "use strict";

  const firepower = /ダメージ量(?:増加|\+)|攻撃威力増加|攻撃レベル増加|コイン威力|最終威力|クリティカルダメージ|脆弱/;
  const sustain = /体力.*回復|精神力.*回復|保護|バリア|混乱.*(?:防止|ならない)/;
  const speed = /クイック|速度|束縛/;
  const soloTarget = /味方1名|味方が|最も(?:高|低|多|少|速)/;
  const physicalNames = { "斬": "斬撃", "貫": "貫通", "打": "打撃" };

  function scoreSupport(solo, candidate) {
    const passive = candidate.support;
    const resonance = passive.condition.includes("共鳴");
    const starter = candidate.name === "LCB囚人";
    let score = 0;
    let ready = true;
    const reasons = [];

    if (resonance) {
      Object.entries(passive.requirements).forEach(([sin, required]) => {
        const count = solo.affinities[sin] || 0;
        if (count) {
          score += 4 + Math.min(count, 3);
          reasons.push(`${sin}${required}共鳴を自力で狙える`);
        } else {
          score -= 10;
          ready = false;
          reasons.push(`${sin}共鳴に対応するスキルなし`);
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
    if (firepower.test(passive.effect)) { score += 3; reasons.push("火力支援"); }
    if (sustain.test(passive.effect)) { score += 2; reasons.push("継戦支援"); }
    if (speed.test(passive.effect)) { score += 1; reasons.push("速度支援"); }
    if (soloTarget.test(passive.effect)) { score += 2; reasons.push("単騎なら対象が安定"); }
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
    })).sort((a, b) => compare(a.candidates[0], b.candidates[0]) || a.sinner.localeCompare(b.sinner, "ja"));
  }

  window.SUPPORT_RANKING = { scoreSupport, recommendations };
})();
