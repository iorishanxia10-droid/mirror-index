(() => {
  "use strict";

  const gifts = window.GIFT_DATA;
  const packs = window.PACK_DATA;
  const roman = { 1: "Ⅰ", 2: "Ⅱ", 3: "Ⅲ", 4: "Ⅳ", 5: "Ⅴ", EX: "EX" };
  const categories = {
    Burn: ["火傷", "#d9683d"], Bleed: ["出血", "#c94343"], Tremor: ["振動", "#d7a63c"],
    Rupture: ["破裂", "#65a650"], Sinking: ["沈潜", "#4779bd"], Poise: ["呼吸", "#79b3ba"],
    Charge: ["充電", "#6f61bd"], Slash: ["斬撃", "#a75050"], Pierce: ["貫通", "#4c77a5"],
    Blunt: ["打撃", "#a88752"], Keywordless: ["その他", "#858982"]
  };
  const giftList = Object.entries(gifts).map(([id, gift]) => ({ id, ...gift }));
  const state = { category: "all", search: "", tier: "all", source: "all", selected: new Set(), limit: 80 };

  const $ = id => document.getElementById(id);
  const giftImage = gift => {
    return `https://limbus-assets.eldritchtools.com/assets/gifts/${encodeURIComponent(gift.imageKey)}.webp`;
  };
  const label = gift => categories[gift.keyword]?.[0] || gift.keyword;
  const packNames = ids => (ids || []).map(id => packs[id]?.name || id);
  const isGeneral = gift => !gift.fusion && !gift.exclusiveTo?.length;

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mirror-index-theme", theme);
    $("themeIcon").textContent = theme === "dark" ? "☾" : "☀";
    $("themeLabel").textContent = theme === "dark" ? "ダーク" : "ライト";
  }

  function buildCategoryFilters() {
    const counts = giftList.reduce((out, gift) => (out[gift.keyword] = (out[gift.keyword] || 0) + 1, out), {});
    const all = document.createElement("button");
    all.type = "button";
    all.className = "category-button active";
    all.dataset.category = "all";
    all.textContent = `すべて ${giftList.length}`;
    $("categoryFilters").append(all);
    Object.entries(categories).forEach(([key, [name, color]]) => {
      if (!counts[key]) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-button";
      button.dataset.category = key;
      button.style.setProperty("--cat", color);
      button.textContent = `${name} ${counts[key]}`;
      $("categoryFilters").append(button);
    });
  }

  function filteredGifts() {
    const query = state.search.toLowerCase();
    const effectQuery = query.replace("ダメージアップ", "ダメージ量");
    return giftList.filter(gift => {
      if (state.category !== "all" && gift.keyword !== state.category) return false;
      if (state.tier !== "all" && gift.tier !== state.tier) return false;
      if (state.source === "fusion" && !gift.fusion) return false;
      if (state.source === "pack" && !gift.exclusiveTo?.length) return false;
      if (state.source === "general" && !isGeneral(gift)) return false;
      return !query || gift.names.some(name => name.toLowerCase().includes(query)) || gift.enName.toLowerCase().includes(query) || gift.effect.toLowerCase().includes(effectQuery);
    }).sort((a, b) => Number(a.tier) - Number(b.tier) || a.names[0].localeCompare(b.names[0]));
  }

  function renderGifts() {
    const filtered = filteredGifts();
    const visible = filtered.slice(0, state.limit);
    $("resultCount").textContent = `${filtered.length}件`;
    $("giftGrid").replaceChildren(...visible.map(giftCard));
    $("showMore").hidden = visible.length === filtered.length;
    $("showMore").textContent = `さらに表示（残り ${filtered.length - visible.length}件）`;
  }

  function giftCard(gift) {
    const card = $("giftCardTemplate").content.firstElementChild.cloneNode(true);
    card.dataset.id = gift.id;
    card.classList.toggle("selected", state.selected.has(gift.id));
    card.setAttribute("aria-pressed", String(state.selected.has(gift.id)));
    card.setAttribute("aria-label", `${gift.names[0]}、ランク${roman[gift.tier] || gift.tier}、${label(gift)}`);
    card.querySelector("img").src = giftImage(gift);
    card.querySelector("img").onerror = event => event.currentTarget.style.display = "none";
    card.querySelector(".tier-badge").textContent = roman[gift.tier] || gift.tier;
    card.querySelector(".gift-name").textContent = gift.names[0];
    card.querySelector(".gift-category").textContent = `${label(gift)}${gift.fusion ? " · 固定合成" : gift.exclusiveTo?.length ? " · パック限定" : ""}`;
    addGiftCardInteractions(card, gift);
    return card;
  }

  function addGiftCardInteractions(card, gift) {
    let timer = 0;
    let longPressed = false;
    let startX = 0;
    let startY = 0;
    const cancelTimer = () => {
      clearTimeout(timer);
      timer = 0;
    };

    card.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      cancelTimer();
      longPressed = false;
      startX = event.clientX;
      startY = event.clientY;
      timer = setTimeout(() => {
        timer = 0;
        longPressed = true;
        showGiftPreview(gift);
      }, 550);
    });
    card.addEventListener("pointermove", event => {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 12) cancelTimer();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(type => card.addEventListener(type, cancelTimer));
    card.addEventListener("contextmenu", event => event.preventDefault());
    card.addEventListener("click", event => {
      if (longPressed) {
        event.preventDefault();
        longPressed = false;
        return;
      }
      toggleGift(gift.id);
    });
  }

  function showGiftPreview(gift) {
    const dialog = $("giftPreviewDialog");
    const image = $("giftPreviewImage");
    image.style.display = "";
    image.src = giftImage(gift);
    image.alt = `${gift.names[0]}の画像`;
    image.onerror = event => event.currentTarget.style.display = "none";
    $("giftPreviewTitle").textContent = gift.names[0];
    $("giftPreviewMeta").textContent = `${label(gift)} · ${roman[gift.tier] || gift.tier} · ${giftSource(gift)}`;
    $("giftPreviewEffect").textContent = gift.effect;
    if (!dialog.open) dialog.showModal();
  }

  function giftSource(gift) {
    if (gift.fusion) return "固定合成";
    if (gift.exclusiveTo?.length) return `限定: ${packNames(gift.exclusiveTo).join(" / ")}`;
    return "汎用入手";
  }

  function toggleGift(id) {
    state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
    renderGifts();
    renderPlan();
  }

  function routeFor(id, visiting = new Set()) {
    const gift = gifts[id];
    if (!gift?.fusion || !gift.recipes?.length || visiting.has(id)) return { leaves: [id], steps: [], score: Number(gift?.tier || 0) };
    visiting.add(id);
    const routes = gift.recipes.map(recipe => {
      const parts = recipe.map(part => routeFor(part, new Set(visiting)));
      return {
        leaves: parts.flatMap(part => part.leaves),
        steps: [...parts.flatMap(part => part.steps), { result: id, ingredients: recipe }],
        score: parts.reduce((sum, part) => sum + part.score, 0)
      };
    });
    return routes.sort((a, b) => a.leaves.length - b.leaves.length || a.score - b.score)[0];
  }

  function tally(ids) {
    return ids.reduce((map, id) => map.set(id, (map.get(id) || 0) + 1), new Map());
  }

  function selectedRouteData() {
    const selected = [...state.selected];
    const routes = selected.map(id => routeFor(id));
    const leaves = routes.flatMap(route => route.leaves).filter(id => !state.selected.has(id));
    const relevant = new Set([...selected, ...leaves, ...routes.flatMap(route => route.steps.flatMap(step => [step.result, ...step.ingredients]))]);
    const packCounts = new Map();
    relevant.forEach(id => (gifts[id]?.exclusiveTo || []).forEach(packId => packCounts.set(packId, (packCounts.get(packId) || 0) + 1)));
    return { selected, routes, materials: tally(leaves), packCounts };
  }

  function renderPlan() {
    const hasSelection = state.selected.size > 0;
    $("emptyPlan").hidden = hasSelection;
    $("planContent").hidden = !hasSelection;
    if ($("mobilePlan")) $("mobilePlan").disabled = !hasSelection;
    if ($("mobileSelectedCount")) $("mobileSelectedCount").textContent = state.selected.size;
    if (!hasSelection) return;

    const data = selectedRouteData();
    $("selectedCount").textContent = data.selected.length;
    $("selectedChips").replaceChildren(...data.selected.map(id => {
      const chip = document.createElement("span");
      chip.className = "selected-chip";
      const text = document.createElement("span");
      text.textContent = gifts[id].names[0];
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `${gifts[id].names[0]}を選択解除`);
      remove.textContent = "×";
      remove.onclick = () => toggleGift(id);
      chip.append(text, remove);
      return chip;
    }));

    renderPackSummary(data.packCounts);
    renderMaterialSummary(data.materials);
    $("giftDetails").replaceChildren(...data.selected.map(id => giftDetail(id, true)));
  }

  function renderPackSummary(counts) {
    if (!counts.size) {
      $("packSummary").innerHTML = '<p class="summary-empty">限定パックの指定はありません。通常パックのショップ、戦闘報酬、イベント、またはランダム合成を狙えます。</p>';
      return;
    }
    const list = document.createElement("ul");
    [...counts].sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${escapeHtml(packs[id]?.name || id)}</strong><br><small>${count}個の対象・素材に関連</small>`;
      list.append(item);
    });
    $("packSummary").replaceChildren(list);
  }

  function renderMaterialSummary(materials) {
    if (!materials.size) {
      $("materialSummary").innerHTML = '<p class="summary-empty">固定合成素材は不要です。選択したギフトを直接入手してください。</p>';
      return;
    }
    const list = document.createElement("ul");
    [...materials].sort((a, b) => b[1] - a[1] || gifts[a[0]].names[0].localeCompare(gifts[b[0]].names[0])).forEach(([id, count]) => {
      const item = document.createElement("li");
      const source = gifts[id].exclusiveTo?.length ? `限定: ${packNames(gifts[id].exclusiveTo).join(" / ")}` : "汎用入手";
      item.innerHTML = `<strong>${escapeHtml(gifts[id].names[0])} ×${count}</strong><br><small>${escapeHtml(source)} · ${roman[gifts[id].tier] || gifts[id].tier}</small>`;
      list.append(item);
    });
    $("materialSummary").replaceChildren(list);
  }

  function giftDetail(id, open) {
    const gift = gifts[id];
    const detail = document.createElement("details");
    detail.className = "gift-detail";
    detail.open = open;
    const source = gift.fusion ? "固定合成で入手" : gift.exclusiveTo?.length ? `限定: ${packNames(gift.exclusiveTo).join(" / ")}` : "汎用入手（ショップ・報酬・イベント・ランダム合成）";
    detail.innerHTML = `
      <summary>
        <img src="${giftImage(gift)}" alt="">
        <span class="detail-title"><strong>${escapeHtml(gift.names[0])}</strong><span>${escapeHtml(label(gift))} · ${roman[gift.tier] || gift.tier} · ${escapeHtml(source)}</span></span>
      </summary>
      <div class="detail-body"></div>`;
    detail.querySelector("img").onerror = event => event.currentTarget.style.visibility = "hidden";
    const body = detail.querySelector(".detail-body");
    if (gift.fusion && gift.recipes?.length) {
      const heading = document.createElement("h4");
      heading.textContent = "DIRECT RECIPES / 直接レシピ";
      body.append(heading);
      gift.recipes.forEach((recipe, index) => body.append(recipeRow(recipe, gift, index)));
      const route = routeFor(id);
      const baseHeading = document.createElement("h4");
      baseHeading.textContent = "BASE MATERIALS / 推奨経路の基礎素材";
      body.append(baseHeading, materialInline(tally(route.leaves)));
    }
    const effectHeading = document.createElement("h4");
    effectHeading.textContent = "EFFECT / 効果";
    const effect = document.createElement("div");
    effect.className = "effect";
    effect.textContent = gift.effect;
    body.append(effectHeading, effect);
    return detail;
  }

  function recipeRow(recipe, result, index) {
    const row = document.createElement("div");
    row.className = "recipe";
    recipe.forEach((id, itemIndex) => {
      if (itemIndex) row.append(document.createTextNode("＋"));
      row.append(miniGift(id));
    });
    const arrow = document.createElement("span");
    arrow.className = "recipe-arrow";
    arrow.textContent = `→ ${result.names[0]}${index === 0 ? "" : "（別経路）"}`;
    row.append(arrow);
    return row;
  }

  function miniGift(id, count = 1) {
    const gift = gifts[id];
    const span = document.createElement("span");
    span.className = "mini-gift";
    span.innerHTML = `<img src="${giftImage(gift)}" alt=""><span>${escapeHtml(gift.names[0])}${count > 1 ? ` ×${count}` : ""}</span>`;
    span.querySelector("img").onerror = event => event.currentTarget.style.display = "none";
    return span;
  }

  function materialInline(materials) {
    const row = document.createElement("div");
    row.className = "recipe";
    [...materials].forEach(([id, count], index) => {
      if (index) row.append(document.createTextNode("＋"));
      row.append(miniGift(id, count));
    });
    return row;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function clearFilters() {
    state.category = state.tier = state.source = "all";
    state.search = "";
    state.limit = 80;
    $("searchInput").value = "";
    $("tierFilter").value = $("sourceFilter").value = "all";
    document.querySelectorAll(".category-button").forEach(button => button.classList.toggle("active", button.dataset.category === "all"));
    renderGifts();
  }

  buildCategoryFilters();
  $("giftTotal").textContent = giftList.length;
  $("dataSummary").textContent = `${giftList.filter(g => g.fusion).length}固定合成 / ${Object.keys(packs).length}パック`;
  setTheme(localStorage.getItem("mirror-index-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  renderGifts();
  renderPlan();

  $("themeToggle").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  $("searchInput").oninput = event => { state.search = event.target.value.trim(); state.limit = 80; renderGifts(); };
  $("tierFilter").onchange = event => { state.tier = event.target.value; state.limit = 80; renderGifts(); };
  $("sourceFilter").onchange = event => { state.source = event.target.value; state.limit = 80; renderGifts(); };
  $("categoryFilters").onclick = event => {
    const button = event.target.closest("button");
    if (!button) return;
    state.category = button.dataset.category;
    state.limit = 80;
    document.querySelectorAll(".category-button").forEach(item => item.classList.toggle("active", item === button));
    renderGifts();
  };
  $("showMore").onclick = () => { state.limit += 80; renderGifts(); };
  $("clearFilters").onclick = clearFilters;
  $("clearSelection").onclick = () => { state.selected.clear(); renderGifts(); renderPlan(); };
  if ($("mobileGiftList")) $("mobileGiftList").onclick = () => $("searchInput").scrollIntoView({ behavior: "smooth", block: "start" });
  if ($("mobilePlan")) $("mobilePlan").onclick = () => $("planTitle").scrollIntoView({ behavior: "smooth", block: "start" });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
  window.MIRROR_INDEX = {
    addGift(id) {
      if (!gifts[id]) return false;
      state.selected.add(id);
      renderGifts();
      renderPlan();
      return true;
    },
    hasGift(id) { return state.selected.has(id); }
  };
  document.addEventListener("keydown", event => {
    if (event.key === "/" && document.activeElement !== $("searchInput")) { event.preventDefault(); $("searchInput").focus(); }
  });
})();
