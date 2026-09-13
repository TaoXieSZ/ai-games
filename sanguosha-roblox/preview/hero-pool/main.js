const DATA_URL = "../../data/hero-art-v1.json";
const IMAGE_ROOT = "../../";

const factionMeta = {
  wei: { label: "魏", className: "faction-wei" },
  shu: { label: "蜀", className: "faction-shu" },
  wu: { label: "吴", className: "faction-wu" },
  qun: { label: "群", className: "faction-qun" },
};

const termRules = [
  { token: "过河拆桥", className: "term-purple" },
  { token: "乐不思蜀", className: "term-purple" },
  { token: "顺手牵羊", className: "term-purple" },
  { token: "决斗", className: "term-purple" },
  { token: "杀", className: "term-sha" },
  { token: "闪", className: "term-shan" },
  { token: "桃", className: "term-tao" },
].sort((a, b) => b.token.length - a.token.length);

const state = {
  heroes: [],
  faction: "all",
  query: "",
  lastFocused: null,
};

const gallery = document.querySelector("#gallery");
const statusEl = document.querySelector("#status");
const resultCount = document.querySelector("#resultCount");
const searchInput = document.querySelector("#searchInput");
const filters = [...document.querySelectorAll(".filter")];
const dialog = document.querySelector("#heroDialog");
const dialogClose = dialog.querySelector(".dialog-close");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightTerms(value = "") {
  const text = String(value);
  let html = "";

  for (let index = 0; index < text.length; ) {
    const hit = termRules.find((rule) => text.startsWith(`【${rule.token}】`, index) || text.startsWith(rule.token, index));

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
    html += `<span class="${hit.className}">【${hit.token}】</span>`;
    index += alreadyBracketed ? hit.token.length + 2 : hit.token.length;
  }

  return html;
}

function normaliseHero(hero) {
  return {
    id: hero.id,
    name: hero.name || "未命名",
    faction: hero.faction || "qun",
    hp: Number(hero.hp) || 0,
    title: hero.title || hero.description || "",
    skills: Array.isArray(hero.skills) ? hero.skills : [],
    role: hero.role || "",
    silhouette: hero.silhouette || "",
    palette: Array.isArray(hero.palette) ? hero.palette : [],
    outfit: hero.outfit || "",
    prop: hero.prop || "",
    pose: hero.pose || "",
    cardComposition: hero.cardComposition || "",
    effect: hero.effect || "",
    movementNotes: hero.movementNotes || "",
    promptEnglish: hero.promptEnglish || "",
    artPath: hero.artPath || `assets/art-design/hero-pool-v1/${hero.id}.png`,
  };
}

function getFaction(hero) {
  return factionMeta[hero.faction] || { label: hero.faction || "未", className: "" };
}

function getImageUrl(hero) {
  return `${IMAGE_ROOT}${hero.artPath}`;
}

function getSearchText(hero) {
  return [
    hero.name,
    hero.title,
    ...hero.skills.flatMap((skill) => [skill.name, skill.description]),
  ]
    .join(" ")
    .toLowerCase();
}

function getVisibleHeroes() {
  const query = state.query.trim().toLowerCase().replaceAll("【", "").replaceAll("】", "");

  return state.heroes.filter((hero) => {
    const factionMatch = state.faction === "all" || hero.faction === state.faction;
    const queryMatch = !query || getSearchText(hero).includes(query);
    return factionMatch && queryMatch;
  });
}

function makeHpDots(hero) {
  return Array.from({ length: hero.hp }, (_, index) => `<span class="hp-dot" aria-hidden="true" title="${index + 1}"></span>`).join("");
}

function makeSkills(hero) {
  if (!hero.skills.length) {
    return `<div class="skill">技能文案待补充</div>`;
  }

  return hero.skills
    .map((skill) => {
      const name = escapeHtml(skill.name || "技能");
      const description = highlightTerms(skill.description || "");
      return `<div class="skill"><strong>${name}</strong>：${description}</div>`;
    })
    .join("");
}

function makePalette(hero) {
  return hero.palette
    .slice(0, 5)
    .map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`)
    .join("");
}

function wireImageFallback(container, img, hero) {
  const placeholder = container.querySelector(".image-placeholder");
  img.addEventListener(
    "error",
    () => {
      img.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = `${hero.name} 插画待生成`;
    },
    { once: true },
  );
}

function renderCard(hero) {
  const faction = getFaction(hero);
  const card = document.createElement("article");
  card.className = "hero-card";
  card.dataset.id = hero.id;
  card.tabIndex = 0;
  card.role = "button";
  card.setAttribute("aria-label", `查看${hero.name}完整美术设定`);
  card.innerHTML = `
    <div class="card-frame">
      <img src="${escapeHtml(getImageUrl(hero))}" alt="${escapeHtml(hero.name)} Roblox 武将插画" loading="lazy">
      <div class="image-placeholder" hidden></div>
    </div>
    <div class="card-body">
      <div class="meta-row">
        <span class="faction-badge ${faction.className}">${faction.label}</span>
        <span class="hp-row" aria-label="${hero.hp} 点体力">${makeHpDots(hero)}</span>
      </div>
      <h2 class="hero-name">${escapeHtml(hero.name)}</h2>
      <p class="hero-title">${escapeHtml(hero.title)}</p>
      <div class="skill-list">${makeSkills(hero)}</div>
      <div class="palette" aria-label="配色">${makePalette(hero)}</div>
    </div>
  `;

  wireImageFallback(card.querySelector(".card-frame"), card.querySelector("img"), hero);
  card.addEventListener("click", () => openHero(hero, card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openHero(hero, card);
    }
  });
  return card;
}

function render() {
  const heroes = getVisibleHeroes();
  gallery.replaceChildren();

  if (!heroes.length) {
    gallery.innerHTML = `<div class="empty">没有匹配的武将。换个势力或关键词试试。</div>`;
  } else {
    gallery.append(...heroes.map(renderCard));
  }

  resultCount.value = `${heroes.length} / ${state.heroes.length} 位`;
}

function setDialogImage(hero) {
  const img = document.querySelector("#dialogImage");
  const placeholder = document.querySelector("#dialogPlaceholder");
  placeholder.hidden = true;
  img.hidden = false;
  img.src = getImageUrl(hero);
  img.alt = `${hero.name} Roblox 武将插画大图`;
  img.onerror = () => {
    img.hidden = true;
    placeholder.hidden = false;
    placeholder.textContent = `${hero.name} 插画待生成`;
  };
}

function openHero(hero, trigger) {
  const faction = getFaction(hero);
  state.lastFocused = trigger;

  setDialogImage(hero);
  document.querySelector("#dialogFaction").textContent = `${faction.label}势力 · ${hero.role || hero.silhouette || "Roblox 武将"}`;
  document.querySelector("#dialogFaction").className = `dialog-kicker ${faction.className}`;
  document.querySelector("#dialogName").textContent = hero.name;
  document.querySelector("#dialogTitle").textContent = hero.title;
  document.querySelector("#dialogHp").innerHTML = makeHpDots(hero);
  document.querySelector("#dialogHp").setAttribute("aria-label", `${hero.hp} 点体力`);
  document.querySelector("#dialogSkills").innerHTML = makeSkills(hero);
  document.querySelector("#dialogOutfit").textContent = hero.outfit || "造型说明待补充";
  document.querySelector("#dialogPose").textContent = hero.pose || "动作说明待补充";
  document.querySelector("#dialogEffect").textContent = hero.effect || "特效说明待补充";
  document.querySelector("#dialogMovement").textContent = hero.movementNotes || "移动说明待补充";
  document.querySelector("#dialogLink").href = getImageUrl(hero);

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
      state.faction = button.dataset.faction;
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

async function loadHeroes() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("hero-art-v1.json 必须是数组");
    }

    state.heroes = data.map(normaliseHero);
    statusEl.textContent = "";
    render();
  } catch (error) {
    state.heroes = [];
    gallery.innerHTML = "";
    resultCount.value = "0 / 0 位";
    statusEl.textContent = `暂时没有读到英雄池数据：${error.message}。请生成 data/hero-art-v1.json 后刷新本页。`;
  }
}

bindControls();
loadHeroes();
