const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/Users/txie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');

const out = 'sanguosha-roblox/docs/art/battle-ui-v1';
const url = 'http://127.0.0.1:4178/preview/battle-ui/';
const launchOptions = {
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function pageReady(page) {
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#loadStatus').hidden);
  await page.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 7);
  await page.waitForFunction(() => [...document.querySelectorAll('.world-label')].every(el=>el.style.left&&el.style.top));
}

async function box(page, selector) {
  const value = await page.locator(selector).boundingBox();
  if (!value) throw Error(`missing box: ${selector}`);
  return value;
}

async function sendCdp(client, method, params) {
  let timer;
  try {
    return await Promise.race([
      client.send(method, params),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 2000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function mouseDrag(page, fromSelector, toSelector, options = {}) {
  const from = center(await box(page, fromSelector));
  const to = center(await box(page, toSelector));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + (options.startDx || 0), from.y + (options.startDy || -14), { steps: 2 });
  await page.mouse.move(to.x + (options.dropDx || 0), to.y + (options.dropDy || 0), { steps: 12 });
  const finalTo = center(await box(page, toSelector));
  await page.mouse.move(finalTo.x + (options.dropDx || 0), finalTo.y + (options.dropDy || 0), { steps: 2 });
  if (options.beforeUp) await options.beforeUp();
  await page.mouse.up();
}

async function touchDrag(page, client, fromSelector, toSelector, options = {}) {
  const from = center(await box(page, fromSelector));
  const to = center(await box(page, toSelector));
  const id = options.id || 17;
  await sendCdp(client, 'Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id, x: from.x, y: from.y }],
  });
  const steps = options.steps || 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await sendCdp(client, 'Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        id,
        x: from.x + (to.x - from.x) * t + (options.dropDx || 0) * t,
        y: from.y + (to.y - from.y) * t + (options.dropDy || 0) * t,
      }],
    });
  }
  if (options.beforeEnd) await options.beforeEnd();
  await sendCdp(client, 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function horizontalTouchPan(page, client) {
  const hand = await box(page, '#hand');
  const y = hand.y + hand.height * 0.72;
  const startX = hand.x + hand.width * 0.78;
  const endX = hand.x + hand.width * 0.22;
  await sendCdp(client, 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 33, x: startX, y }] });
  for (let i = 1; i <= 10; i++) {
    await sendCdp(client, 'Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 33, x: startX + (endX - startX) * (i / 10), y: y + Math.sin(i) }],
    });
  }
  await sendCdp(client, 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function stateSummary(page) {
  return page.evaluate(() => ({
    count: document.querySelectorAll('#hand [data-hand]').length,
    selected: document.querySelector('#hand [aria-pressed="true"]')?.dataset.card || null,
    targets: typeof state === 'undefined' ? [] : state.targets.map(id => ({ id, name: document.querySelector(`[data-hero="${id}"] span`)?.textContent?.trim() || id })),
    targetText: document.querySelector('#targetChips').textContent.trim(),
    confirm: !document.querySelector('#confirm').disabled,
    ghost: Boolean(document.querySelector('.card-drag-ghost')),
    hover: [...document.querySelectorAll('.drop-hover')].map(e => e.dataset.hero),
    allowed: [...document.querySelectorAll('.drop-allowed')].map(e => e.dataset.hero),
    inspector: !document.querySelector('#inspector').hidden,
    choosingRegion: typeof state === 'undefined' ? undefined : state.choosingRegion,
    mode: typeof state === 'undefined' ? undefined : state.mode,
    phase: document.querySelector('#activePhase').textContent,
    log: document.querySelector('#log').innerText,
    scrollLeft: document.querySelector('#hand').scrollLeft,
  }));
}

(async () => {
  const browser = await chromium.launch(launchOptions);
  const report = { pass: false, desktop: {}, mobile: {}, errors: [] };

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  desktop.on('pageerror', e => report.errors.push(e.message));
  await pageReady(desktop);

  await mouseDrag(desktop, '[data-card="sha"]', '.world-label[data-hero="cao_cao"]', {
    beforeUp: async () => {
      const mid = await stateSummary(desktop);
      if (!mid.ghost || mid.hover[0] !== 'cao_cao') throw Error('desktop sha drag did not hover Cao Cao '+JSON.stringify(mid));
      await desktop.screenshot({ path: `${out}/drag-hover.png` });
    },
  });
  await desktop.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 6);
  const afterSha = await stateSummary(desktop);
  if (!afterSha.log.includes('使用【杀】')) throw Error('sha drag did not log use');

  await desktop.click('[data-card="shan"]');
  await mouseDrag(desktop, '[data-card="tao"]', '.world-label[data-hero="cao_cao"]');
  await desktop.waitForTimeout(120);
  const invalidTao = await stateSummary(desktop);
  if (invalidTao.count !== 6 || invalidTao.selected !== 'shan' || invalidTao.targets.length !== 0 || invalidTao.ghost || invalidTao.allowed.length) {
    throw Error(`invalid Tao drop changed selection: ${JSON.stringify(invalidTao)}`);
  }

  await mouseDrag(desktop, '[data-card="tao"]', '.world-label[data-hero="sun_shangxiang"]', {beforeUp:()=>desktop.keyboard.press('Escape')});
  const escaped = await stateSummary(desktop);
  if(escaped.count!==6||escaped.selected!=='shan'||escaped.ghost)throw Error('Escape failed to preserve prior selection');
  await desktop.keyboard.press('Escape');
  await mouseDrag(desktop, '[data-card="guohe"]', '.world-label[data-hero="cao_cao"]');
  await desktop.waitForSelector('#inspector:not([hidden])');
  const afterGuohe = await stateSummary(desktop);
  if (afterGuohe.count !== 6 || !afterGuohe.inspector || !afterGuohe.choosingRegion) {
    throw Error(`guohe drag did not open region selection without consuming: ${JSON.stringify(afterGuohe)}`);
  }
  await desktop.locator('[data-hidden-slot]').first().click();
  await desktop.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 5);
  const afterRegion = await stateSummary(desktop);
  if (!afterRegion.log.includes('未知手牌')) throw Error('guohe region choice did not preserve hidden-hand wording');

  await desktop.click('#resetButton');
  await desktop.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 7);
  await mouseDrag(desktop, '[data-card="tiesuo"]', '.world-label[data-hero="zhao_yun"]');
  await desktop.waitForTimeout(150);
  const tiesuoOne = await stateSummary(desktop);
  if (tiesuoOne.count !== 7 || tiesuoOne.selected !== 'tiesuo' || tiesuoOne.targets.length !== 1 || tiesuoOne.targets[0].id !== 'zhao_yun' || !tiesuoOne.confirm) {
    throw Error(`tiesuo first drag should select one target without consuming: ${JSON.stringify(tiesuoOne)}`);
  }
  await mouseDrag(desktop, '[data-card="tiesuo"]', '.world-label[data-hero="zhao_yun"]');
  await desktop.waitForTimeout(150);
  const tiesuoSame = await stateSummary(desktop);
  if (tiesuoSame.count !== 7 || tiesuoSame.targets.length !== 1 || tiesuoSame.targets[0].id !== 'zhao_yun') {
    throw Error(`tiesuo repeat drop should keep first target: ${JSON.stringify(tiesuoSame)}`);
  }
  await mouseDrag(desktop, '[data-card="tiesuo"]', '.world-label[data-hero="cao_cao"]');
  await desktop.waitForTimeout(150);
  const tiesuoTwo = await stateSummary(desktop);
  if (tiesuoTwo.count !== 7 || tiesuoTwo.targets.length !== 2 || tiesuoTwo.targets[0].id !== 'zhao_yun' || tiesuoTwo.targets[1].id !== 'cao_cao') {
    throw Error(`tiesuo second drag should add a second target: ${JSON.stringify(tiesuoTwo)}`);
  }
  await mouseDrag(desktop, '[data-card="tiesuo"]', '.world-label[data-hero="lu_bu"]');
  await desktop.waitForTimeout(150);
  const tiesuoReplace = await stateSummary(desktop);
  if (tiesuoReplace.count !== 7 || tiesuoReplace.targets.length !== 2 || tiesuoReplace.targets[0].id !== 'zhao_yun' || tiesuoReplace.targets[1].id !== 'lu_bu') {
    throw Error(`tiesuo third drag should replace the second target: ${JSON.stringify(tiesuoReplace)}`);
  }
  await desktop.click('#confirm');
  await desktop.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 6);
  const afterTiesuo = await stateSummary(desktop);
  if (!afterTiesuo.log.includes('赵云、吕布') || !afterTiesuo.log.includes('铁索连环')) throw Error('tiesuo confirm did not consume once with two targets');

  await desktop.click('#resetButton');
  await desktop.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 7);
  await mouseDrag(desktop, '[data-card="wanjian"]', '.world-label[data-hero="lu_bu"]');
  await desktop.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 6);
  const afterWanjian = await stateSummary(desktop);
  if (!afterWanjian.log.includes('曹操、赵云、吕布') || !afterWanjian.log.includes('万箭齐发')) throw Error('wanjian drop did not hit all opponents');

  await desktop.screenshot({ path: `${out}/drag-desktop.png` });
  report.desktop = { afterSha, invalidTao, afterGuohe, afterRegion, tiesuoOne, tiesuoTwo, tiesuoReplace, afterTiesuo, afterWanjian };
  await desktop.close();

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const mobile = await context.newPage();
  mobile.on('pageerror', e => report.errors.push(e.message));
  await pageReady(mobile);
  const client = await context.newCDPSession(mobile);

  await touchDrag(mobile, client, '[data-card="shan"]', '.world-label[data-hero="cao_cao"]');
  await mobile.waitForTimeout(150);
  const badShan = await stateSummary(mobile);
  if (badShan.count !== 7 || badShan.selected || badShan.ghost) throw Error('normal shan opponent drop should cancel');

  await mobile.click('#helpButton');
  await mobile.selectOption('#scenario', 'response');
  await mobile.click('#applyScenario');
  await touchDrag(mobile, client, '[data-card="shan"]', '.world-label[data-hero="sun_shangxiang"]', {beforeEnd:()=>mobile.screenshot({path:`${out}/drag-mobile-hover.png`})});
  await mobile.waitForFunction(() => document.querySelector('#activePhase').textContent === '出牌');
  const responseShan = await stateSummary(mobile);
  if (responseShan.count !== 6 || !responseShan.log.includes('响应曹操的【杀】')) throw Error('touch shan response did not complete');

  await mobile.click('#resetButton');
  await mobile.waitForFunction(() => document.querySelectorAll('#hand [data-hand]').length === 7);
  await mobile.waitForTimeout(150);
  const panClient = await context.newCDPSession(mobile);
  await horizontalTouchPan(mobile, panClient);
  await mobile.waitForTimeout(150);
  const afterPan = await stateSummary(mobile);
  if (afterPan.scrollLeft <= 0) throw Error('horizontal gesture did not scroll hand');
  if (afterPan.count !== 7 || afterPan.selected || afterPan.ghost || afterPan.hover.length || afterPan.allowed.length) {
    throw Error(`horizontal pan polluted drag state: ${JSON.stringify(afterPan)}`);
  }

  await mobile.screenshot({ path: `${out}/drag-mobile.png` });
  await mobile.locator('#hand [data-card="tiesuo"]').scrollIntoViewIfNeeded();
  await touchDrag(mobile, panClient, '[data-card="tiesuo"]', '.world-label[data-hero="cao_cao"]');
  const mobileFirst=await stateSummary(mobile);
  if(mobileFirst.count!==7||mobileFirst.targets.length!==1)throw Error('mobile first tiesuo target');
  await touchDrag(mobile, panClient, '[data-card="tiesuo"]', '.world-label[data-hero="zhao_yun"]');
  const mobileTwo=await stateSummary(mobile);
  if(mobileTwo.count!==7||mobileTwo.targets.length!==2)throw Error('mobile second tiesuo target '+JSON.stringify({mobileFirst,mobileTwo}));
  await mobile.screenshot({path:`${out}/tiesuo-mobile.png`});
  await mobile.click('#confirm');
  if((await stateSummary(mobile)).count!==6)throw Error('mobile tiesuo confirm');
  report.mobile = { badShan, responseShan, afterPan, mobileFirst, mobileTwo };

  if (report.errors.length) throw Error(report.errors.join('\n'));
  report.pass = true;
  fs.writeFileSync(`${out}/drag-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log('PASS drag cards to hero heads: desktop mouse, invalid drop preservation, region choice, all-opponent trick, mobile touch response, horizontal pan');
})().catch(async e => {
  console.error(e);
  process.exit(1);
});
