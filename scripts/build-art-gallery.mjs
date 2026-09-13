import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, "sanguosha-roblox");
const siteRoot = path.join(repoRoot, "site");
const dataRoot = path.join(sourceRoot, "data");

const heroDataPath = path.join(dataRoot, "hero-art-v1.json");
const cardDataPath = path.join(dataRoot, "game-card-art-v1.json");

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function projectPath(...parts) {
  return path.join(...parts).replaceAll(path.sep, "/");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function assertSafeProjectRelativePath(value, label) {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  assert(!path.isAbsolute(value), `${label} must be relative: ${value}`);
  assert(!value.includes("\\"), `${label} must use forward slashes: ${value}`);
  assert(!value.split("/").includes(".."), `${label} cannot contain '..': ${value}`);
  assert(!value.startsWith("./"), `${label} should not start with './': ${value}`);
}

async function assertPng(filePath, label) {
  const handle = await fs.open(filePath, constants.O_RDONLY);
  try {
    const buffer = Buffer.alloc(pngSignature.length);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    assert(bytesRead === pngSignature.length && buffer.equals(pngSignature), `${label} is not a PNG: ${filePath}`);
  } finally {
    await handle.close();
  }
}

async function assertExists(filePath, label) {
  try {
    await fs.access(filePath, constants.R_OK);
  } catch {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

function validateHeroes(heroes) {
  assert(Array.isArray(heroes), "hero-art-v1.json must be an array");
  assert(heroes.length === 25, `expected 25 heroes, found ${heroes.length}`);

  const ids = new Set();
  for (const hero of heroes) {
    assert(hero && typeof hero === "object", "every hero entry must be an object");
    assert(typeof hero.id === "string" && hero.id, "every hero needs an id");
    assert(!ids.has(hero.id), `duplicate hero id: ${hero.id}`);
    ids.add(hero.id);
    assertSafeProjectRelativePath(hero.artPath, `hero ${hero.id} artPath`);
  }
}

function validateCards(cards) {
  assert(Array.isArray(cards), "game-card-art-v1.json must be an array");
  assert(cards.length === 43, `expected 43 game cards, found ${cards.length}`);

  const ids = new Set();
  let copies = 0;
  const categories = new Map([
    ["basic", 0],
    ["trick", 0],
    ["equipment", 0],
  ]);

  for (const card of cards) {
    assert(card && typeof card === "object", "every card entry must be an object");
    assert(typeof card.id === "string" && card.id, "every card needs an id");
    assert(!ids.has(card.id), `duplicate card id: ${card.id}`);
    ids.add(card.id);
    assert(categories.has(card.category), `unknown category for ${card.id}: ${card.category}`);
    categories.set(card.category, categories.get(card.category) + 1);
    assert(Array.isArray(card.copies), `${card.id} copies must be an array`);
    copies += card.copies.length;
    assertSafeProjectRelativePath(card.artPath, `card ${card.id} artPath`);
  }

  assert(categories.get("basic") === 6, `expected 6 basic cards, found ${categories.get("basic")}`);
  assert(categories.get("trick") === 15, `expected 15 trick cards, found ${categories.get("trick")}`);
  assert(categories.get("equipment") === 22, `expected 22 equipment cards, found ${categories.get("equipment")}`);
  assert(copies === 160, `expected 160 physical copies, found ${copies}`);
}

async function validateAssets(artPaths) {
  const seen = new Set();
  for (const artPath of artPaths) {
    assertSafeProjectRelativePath(artPath, "artPath");
    assert(artPath.startsWith("assets/"), `artPath must stay under assets/: ${artPath}`);
    assert(path.extname(artPath).toLowerCase() === ".png", `artPath must point to a PNG: ${artPath}`);
    assert(!seen.has(artPath), `duplicate selected art path: ${artPath}`);
    seen.add(artPath);

    const absolutePath = path.join(sourceRoot, artPath);
    await assertExists(absolutePath, `selected art asset ${artPath}`);
    await assertPng(absolutePath, `selected art asset ${artPath}`);
  }

  const keyVisual = path.join(sourceRoot, "assets/key-visual.png");
  await assertExists(keyVisual, "key visual");
  await assertPng(keyVisual, "key visual");
}

async function copyFile(source, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

function makeRedirectPage() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=../" />
    <title>跳转到 Roblox 三国杀美术图鉴</title>
    <script>location.replace("../");</script>
  </head>
  <body>
    <p><a href="../">前往 Roblox 三国杀美术图鉴</a></p>
  </body>
</html>
`;
}

async function build() {
  const [heroes, cards] = await Promise.all([readJson(heroDataPath), readJson(cardDataPath)]);
  validateHeroes(heroes);
  validateCards(cards);

  const selectedArtPaths = [...heroes.map((hero) => hero.artPath), ...cards.map((card) => card.artPath)];
  await validateAssets(selectedArtPaths);

  await fs.rm(siteRoot, { recursive: true, force: true });
  await fs.mkdir(siteRoot, { recursive: true });

  await copyFile(path.join(repoRoot, "index.html"), path.join(siteRoot, "index.html"));
  await fs.mkdir(path.join(siteRoot, "hype-life"), { recursive: true });
  await fs.writeFile(path.join(siteRoot, "hype-life/index.html"), makeRedirectPage());

  await copyFile(heroDataPath, path.join(siteRoot, "sanguosha-roblox/data/hero-art-v1.json"));
  await copyFile(cardDataPath, path.join(siteRoot, "sanguosha-roblox/data/game-card-art-v1.json"));
  await copyFile(path.join(sourceRoot, "assets/key-visual.png"), path.join(siteRoot, "sanguosha-roblox/assets/key-visual.png"));

  for (const artPath of selectedArtPaths) {
    await copyFile(path.join(sourceRoot, artPath), path.join(siteRoot, "sanguosha-roblox", artPath));
  }

  for (const galleryName of ["hero-pool", "game-cards", "hero-models"]) {
    const previewRoot = path.join(sourceRoot, "preview", galleryName);
    const outputRoot = path.join(siteRoot, "sanguosha-roblox/preview", galleryName);
    await copyFile(path.join(previewRoot, "index.html"), path.join(outputRoot, "index.html"));
    await copyFile(path.join(previewRoot, "style.css"), path.join(outputRoot, "style.css"));
    await copyFile(path.join(previewRoot, "main.js"), path.join(outputRoot, "main.js"));
  }

  await copyFile(path.join(sourceRoot, "preview/hero-models/card-effects.js"), path.join(siteRoot, "sanguosha-roblox/preview/hero-models/card-effects.js"));
  await copyFile(path.join(dataRoot, "hero-models-v1.json"), path.join(siteRoot, "sanguosha-roblox/data/hero-models-v1.json"));
  await copyFile(path.join(dataRoot, "hero-effects-v1.json"), path.join(siteRoot, "sanguosha-roblox/data/hero-effects-v1.json"));
  for (const file of [...heroes.flatMap(hero => [`${hero.id}.glb`, `${hero.id}.rbxmx`]), "manifest.json", "hero-model-workshop.rbxlx", "hero-playground.rbxlx"]) {
    await copyFile(path.join(sourceRoot, "models/hero-models-v1", file), path.join(siteRoot, "sanguosha-roblox/models/hero-models-v1", file));
  }

  const outputFiles = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else {
        outputFiles.push(projectPath(path.relative(siteRoot, absolutePath)));
      }
    }
  }
  await walk(siteRoot);

  const forbidden = outputFiles.filter((file) => /\.(luau?|rbxlx|md|txt|svg)$/i.test(file) && !["sanguosha-roblox/models/hero-models-v1/hero-model-workshop.rbxlx", "sanguosha-roblox/models/hero-models-v1/hero-playground.rbxlx"].includes(file));
  assert(forbidden.length === 0, `forbidden files in site output: ${forbidden.join(", ")}`);

  console.log(`Built site with ${heroes.length} heroes, ${cards.length} card designs, and ${cards.reduce((total, card) => total + card.copies.length, 0)} physical cards.`);
  console.log(`Copied ${new Set(selectedArtPaths).size + 1} PNG assets into ${projectPath(path.relative(repoRoot, siteRoot))}/.`);
  console.log(`Output files: ${outputFiles.length}`);
}

build().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
