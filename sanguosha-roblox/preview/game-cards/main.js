const DATA_URL = "../../data/game-card-art-v1.json";
const IMAGE_ROOT = "../../";

const categoryMeta = {
  basic: { label: "基本", className: "category-basic" },
  trick: { label: "锦囊", className: "category-trick" },
  equipment: { label: "装备", className: "category-equipment" },
};

const categoryOrder = {
  basic: 0,
  trick: 1,
  equipment: 2,
};

const fixedTerms = {
  火杀: "term-huosha",
  雷杀: "term-leisha",
  杀: "term-sha",
  闪: "term-shan",
  桃: "term-tao",
  酒: "term-jiu",
};

const suitMeta = {
  spade: { symbol: "♠", label: "黑桃", color: "suit-black" },
  heart: { symbol: "♥", label: "红桃", color: "suit-red" },
  club: { symbol: "♣", label: "梅花", color: "suit-black" },
  diamond: { symbol: "♦", label: "方片", color: "suit-red" },
};

const packMeta = {
  standard: "标准",
  ex: "EX",
  maneuver: "军争",
};

const state = {
  cards: [],
  category: "all",
  query: "",
  lastFocused: null,
  termRules: [],
};

const gallery = document.querySelector("#gallery");
const statusEl = document.querySelector("#status");
const resultCount = document.querySelector("#resultCount");
const deckSummary = document.querySelector("#deckSummary");
const searchInput = document.querySelector("#searchInput");
const filters = [...document.querySelectorAll(".filter")];
const dialog = document.querySelector("#cardDialog");
const dialogClose = dialog.querySelector(".dialog-close");
const copySelect = document.querySelector("#copySelect");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeTermRules(cards) {
  const dynamicTerms = cards.map((card) => card.name).filter(Boolean);
  const merged = [...new Set([...Object.keys(fixedTerms), ...dynamicTerms])];

  return merged
    .map((token) => ({
      token,
      className: fixedTerms[token] || "term-card",
    }))
    .sort((a, b) => b.token.length - a.token.length || a.token.localeCompare(b.token, "zh-Hans-CN"));
}

function highlightTerms(value = "") {
  const text = String(value);
  let html = "";

  for (let index = 0; index < text.length; ) {
    const hit = state.termRules.find((rule) => text.startsWith(`【${rule.token}】`, index) || text.startsWith(rule.token, index));

    if (!hit) {
      html += escapeHtml(text[index]);
      index += 1;
      continue;
    }

    if (hit.token === "桃" && ["红", "黑"].includes(text[index - 1])) {
      html += escapeHtml(text[index]);
      index += 1;
      continue;
    }

    const alreadyBracketed = text.startsWith(`【${hit.token}】`, index);
    html += `<span class="rule-term ${hit.className}">【${escapeHtml(hit.token)}】</span>`;
    index += alreadyBracketed ? hit.token.length + 2 : hit.token.length;
  }

  return html;
}

function normaliseCard(card, index) {
  const copies = Array.isArray(card.copies) ? card.copies : [];

  return {
    id: card.id || `card-${index + 1}`,
    name: card.name || "未命名",
    category: categoryMeta[card.category] ? card.category : "trick",
    description: card.description || "",
    subtitle: card.subtitle || "",
    palette: Array.isArray(card.palette) ? card.palette : [],
    subject: card.subject || "",
    composition: card.composition || "",
    readability: card.readability || "",
    promptEnglish: card.promptEnglish || "",
    artPath: card.artPath || `assets/art-design/game-cards-v1/${card.id || `card-${index + 1}`}.png`,
    copies: copies.map((copy, copyIndex) => ({
      suit: copy.suit || "",
      rank: copy.rank,
      pack: copy.pack || "",
      index: copyIndex,
    })),
    sourceIndex: index,
  };
}

function getCategory(card) {
  return categoryMeta[card.category] || { label: card.category || "未分类", className: "" };
}

function getImageUrl(card) {
  return `${IMAGE_ROOT}${card.artPath}`;
}

function getSearchText(card) {
  return [card.name, card.subtitle, card.description].join(" ").toLowerCase();
}

function compareCards(a, b) {
  const categoryDiff = (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99);
  return categoryDiff || a.sourceIndex - b.sourceIndex;
}

function getVisibleCards() {
  const query = state.query.trim().toLowerCase().replaceAll("【", "").replaceAll("】", "");

  return state.cards
    .filter((card) => {
      const categoryMatch = state.category === "all" || card.category === state.category;
      const queryMatch = !query || getSearchText(card).includes(query);
      return categoryMatch && queryMatch;
    })
    .sort(compareCards);
}

function rankLabel(rank) {
  const value = Number(rank);
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return Number.isFinite(value) ? String(value) : String(rank || "?");
}

function copyLabel(copy, includeIndex = false) {
  if (!copy) return "花色点数待补";
  const suit = suitMeta[copy.suit] || { symbol: "?", label: copy.suit || "未知", color: "suit-black" };
  const pack = packMeta[copy.pack] || copy.pack || "未标包";
  const prefix = includeIndex ? `${copy.index + 1}. ` : "";
  return `${prefix}${suit.label}${rankLabel(copy.rank)} · ${pack}`;
}

function suitRankHtml(copy) {
  if (!copy) return `<span class="suit-black">?</span>`;
  const suit = suitMeta[copy.suit] || { symbol: "?", color: "suit-black" };
  return `<span class="${suit.color}">${suit.symbol}${rankLabel(copy.rank)}</span>`;
}

function makePalette(card) {
  return card.palette
    .slice(0, 5)
    .map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`)
    .join("");
}

function titleClass(name) {
  const length = [...String(name || "")].length;
  if (length >= 5) return "title-extra-long";
  if (length >= 4) return "title-long";
  return "";
}

function wireImageFallback(container, img, card) {
  const placeholder = container.querySelector(".image-placeholder");
  img.addEventListener(
    "error",
    () => {
      img.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = `${card.name} 插画待生成`;
    },
    { once: true },
  );
}

function renderCard(card) {
  const category = getCategory(card);
  const sampleCopy = card.copies[0];
  const element = document.createElement("article");
  element.className = "game-card";
  element.dataset.id = card.id;
  element.tabIndex = 0;
  element.role = "button";
  element.setAttribute("aria-label", `查看${card.name}完整游戏牌设定`);
  element.innerHTML = `
    <div class="card-shell">
      <div class="card-title">
        <h2 class="${titleClass(card.name)}">${highlightTerms(card.name)}</h2>
        <span class="suit-rank" title="花色点数示例">${suitRankHtml(sampleCopy)}</span>
      </div>
      <div class="art-frame">
        <img src="${escapeHtml(getImageUrl(card))}" alt="${escapeHtml(card.name)} Roblox 游戏牌插画" loading="lazy">
        <div class="image-placeholder" hidden></div>
      </div>
      <div class="rule-preview">${highlightTerms(card.description || "规则文案待补充")}</div>
    </div>
    <div class="card-body">
      <div class="meta-row">
        <span class="category-badge ${category.className}">${category.label}</span>
        <span class="copy-badge">${card.copies.length} 张实体牌</span>
      </div>
      <p class="card-subtitle">${escapeHtml(card.subtitle || "Roblox 风格卡面")}</p>
      <p class="copy-meta">花色点数示例：${copyLabel(sampleCopy)}</p>
      <div class="palette" aria-label="配色">${makePalette(card)}</div>
    </div>
  `;

  wireImageFallback(element.querySelector(".art-frame"), element.querySelector("img"), card);
  element.addEventListener("click", () => openCard(card, element));
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCard(card, element);
    }
  });
  return element;
}

function renderSummary() {
  const designCount = state.cards.length;
  const physicalCount = state.cards.reduce((total, card) => total + card.copies.length, 0);
  deckSummary.textContent = `${designCount}款设计 · ${physicalCount}张牌`;
}

function render() {
  const cards = getVisibleCards();
  gallery.replaceChildren();

  if (!cards.length) {
    gallery.innerHTML = `<div class="empty">没有匹配的游戏牌。换个分类或关键词试试。</div>`;
  } else {
    gallery.append(...cards.map(renderCard));
  }

  const physicalCount = cards.reduce((total, card) => total + card.copies.length, 0);
  resultCount.value = `${cards.length} / ${state.cards.length} 款 · ${physicalCount} 张`;
}

function setDialogImage(card) {
  const img = document.querySelector("#dialogImage");
  const placeholder = document.querySelector("#dialogPlaceholder");
  placeholder.hidden = true;
  img.hidden = false;
  img.src = getImageUrl(card);
  img.alt = `${card.name} Roblox 游戏牌插画大图`;
  img.onerror = () => {
    img.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = `${card.name} 插画待生成`;
  };
}

function updateDialogCopy(card, copyIndex) {
  const copy = card.copies[copyIndex] || card.copies[0];
  document.querySelector("#dialogSuitRank").innerHTML = suitRankHtml(copy);
  document.querySelector("#dialogCopyMeta").textContent = `当前示例：${copyLabel(copy)}。本设计共有 ${card.copies.length} 张实体牌。`;
}

function openCard(card, trigger) {
  const category = getCategory(card);
  state.lastFocused = trigger;

  setDialogImage(card);
  document.querySelector("#dialogCategory").textContent = category.label;
  document.querySelector("#dialogCategory").className = `dialog-kicker ${category.className}`;
  document.querySelector("#dialogName").className = titleClass(card.name);
  document.querySelector("#dialogName").innerHTML = highlightTerms(card.name);
  document.querySelector("#dialogSubtitle").textContent = card.subtitle || "Roblox 风格卡面";
  document.querySelector("#dialogDescription").innerHTML = highlightTerms(card.description || "规则文案待补充");
  document.querySelector("#dialogSubject").textContent = card.subject || "主体说明待补充";
  document.querySelector("#dialogComposition").textContent = card.composition || "构图说明待补充";
  document.querySelector("#dialogReadability").textContent = card.readability || "辨识说明待补充";
  document.querySelector("#dialogLink").href = getImageUrl(card);
  copySelect.innerHTML = card.copies.length
    ? card.copies.map((copy, index) => `<option value="${index}">${escapeHtml(copyLabel(copy, true))}</option>`).join("")
    : `<option value="0">花色点数待补</option>`;
  copySelect.disabled = card.copies.length < 2;
  copySelect.onchange = () => updateDialogCopy(card, Number(copySelect.value));
  updateDialogCopy(card, 0);

  dialog.showModal();
  dialogClose.focus();
}

function closeDialog() {
  dialog.close();
  state.lastFocused?.focus();
}

function bindControls() {
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      filters.forEach((filter) => filter.classList.toggle("is-active", filter === button));
      filters.forEach((filter) => filter.setAttribute("aria-pressed", String(filter === button)));
      render();
    });
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
  });

  dialogClose.addEventListener("click", closeDialog);
  dialog.addEventListener("close", () => state.lastFocused?.focus());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });
}

async function loadCards() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : payload?.cards;
    if (!Array.isArray(data)) {
      throw new Error("game-card-art-v1.json 必须是数组");
    }

    state.cards = data.map(normaliseCard);
    state.termRules = makeTermRules(state.cards);
    statusEl.textContent = "";
    renderSummary();
    render();
  } catch (error) {
    state.cards = [];
    state.termRules = makeTermRules([]);
    gallery.innerHTML = "";
    resultCount.value = "0 / 0 款 · 0 张";
    deckSummary.textContent = "43款设计 · 160张牌";
    statusEl.textContent = `暂时没有读到游戏牌数据：${error.message}。请生成 data/game-card-art-v1.json 后刷新本页。`;
  }
}

bindControls();
loadCards();
