(() => {
  "use strict";

  const identities = window.IDENTITY_DATA;
  const { recommendations } = window.SUPPORT_RANKING;
  const sinners = ["イサン", "ファウスト", "ドンキホーテ", "良秀", "ムルソー", "ホンル", "ヒースクリフ", "イシュメール", "ロージャ", "シンクレア", "ウーティス", "グレゴール"];
  const sinColors = { "憤怒": "#c94343", "色欲": "#d87532", "怠惰": "#d7a63c", "暴食": "#65a650", "憂鬱": "#4779bd", "傲慢": "#315e88", "嫉妬": "#7650a7" };
  const keywordColors = { "火傷": "#d9683d", "出血": "#c94343", "振動": "#d7a63c", "破裂": "#65a650", "沈潜": "#4779bd", "呼吸": "#79b3ba", "充電": "#6f61bd" };
  const $ = id => document.getElementById(id);
  const image = identity => `https://limbus-assets.eldritchtools.com/assets/identities/${identity.id}_gacksung_profile.webp`;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  sinners.forEach(sinner => {
    const option = document.createElement("option");
    option.value = option.textContent = sinner;
    $("soloSinner").append(option);
  });

  function chooseSinner() {
    const sinner = $("soloSinner").value;
    const select = $("soloIdentity");
    const options = identities.filter(identity => identity.sinner === sinner).sort((a, b) => b.date.localeCompare(a.date)).map(identity => {
      const option = document.createElement("option");
      option.value = identity.id;
      option.textContent = identity.name;
      return option;
    });
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = sinner ? "人格を選択" : "先に囚人を選択";
    select.replaceChildren(placeholder, ...options);
    select.disabled = !sinner;
    render(null);
  }

  function tag(text, color) {
    return `<span class="data-tag" style="--tag:${color || "var(--strong-line)"}">${escape(text)}</span>`;
  }

  function render(identity) {
    $("soloPreview").hidden = !identity;
    $("supportEmpty").hidden = Boolean(identity);
    $("supportContent").hidden = !identity;
    if (!identity) return;

    const affinityTags = Object.entries(identity.affinities).map(([sin, count]) => tag(`${sin} ×${count}`, sinColors[sin])).join("");
    const keywordTags = identity.keywords.map(keyword => tag(keyword, keywordColors[keyword])).join("");
    $("soloPreview").innerHTML = `<img class="solo-portrait" src="${image(identity)}" alt=""><h3>${escape(identity.name)}</h3><p>${escape(identity.sinner)} · ${identity.physical.map(type => `${type}撃`).join(" / ") || "攻撃属性なし"}</p><div class="tag-row">${keywordTags}${affinityTags}</div>`;
    $("soloPreview").querySelector("img").onerror = event => event.currentTarget.hidden = true;

    const ranked = recommendations(identity, identities);
    $("supportOverview").innerHTML = `<strong>${escape(identity.name)}の控え候補</strong><p>${escape(identity.keywords.join("・") || "固有キーワードなし")}と、${escape(Object.keys(identity.affinities).join("・"))}のスキル構成を基準に、各囚人から最も噛み合う1人格を表示しています。</p>`;
    $("supportRecommendations").replaceChildren(...ranked.map((result, index) => supportCard(result, index)));
  }

  function supportCard({ candidate, score, ready, reasons }, index) {
    const card = document.createElement("article");
    card.className = `support-card${index < 3 ? " top-support" : ""}`;
    const requirements = Object.entries(candidate.support.requirements).map(([sin, count]) => `<span style="color:${sinColors[sin]}">${escape(sin)}${count}</span>`).join("＋") || "条件なし";
    const rank = !ready ? "要補助" : score >= 13 ? "最適" : score >= 8 ? "好相性" : "候補";
    card.innerHTML = `
      <img src="${image(candidate)}" alt="" loading="lazy">
      <div>
        <div class="support-card-head"><div><h3>${escape(candidate.sinner)}／${escape(candidate.name)}</h3><p>${escape(candidate.physical.map(type => `${type}撃`).join(" / "))}</p></div><span class="match-rank">${rank}</span></div>
        <p class="passive-name">${escape(candidate.support.name)} <span class="passive-condition">［${escape(candidate.support.condition)}：${requirements}］</span></p>
        <p class="passive-effect">${escape(candidate.support.effect)}</p>
        <div class="match-reasons">${reasons.map(reason => `<span class="match-reason">${escape(reason)}</span>`).join("")}</div>
        <a class="wiki-link" href="${candidate.wiki}" target="_blank" rel="noreferrer">Wikiで人格を確認</a>
      </div>`;
    card.querySelector("img").onerror = event => event.currentTarget.hidden = true;
    return card;
  }

  $("soloSinner").onchange = chooseSinner;
  $("soloIdentity").onchange = event => render(identities.find(identity => identity.id === event.target.value));
  document.querySelectorAll(".tool-tab").forEach(button => button.onclick = () => {
    const support = button.dataset.tool === "support";
    $("giftTool").hidden = support;
    $("giftMobileNav").hidden = support;
    $("supportTool").hidden = !support;
    document.querySelectorAll(".tool-tab").forEach(tab => {
      tab.classList.toggle("active", tab === button);
      tab.setAttribute("aria-pressed", String(tab === button));
    });
  });
})();
