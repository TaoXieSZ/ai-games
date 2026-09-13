const $ = (selector) => document.querySelector(selector);
const ROOT = '../../';
const SELF = 'sun_shangxiang';
const initialHand = ['sha', 'shan', 'tao', 'guohe', 'tiesuo', 'wanjian', 'zhuge_crossbow'];
// Public view models deliberately contain no opponent hand faces or hidden identities.
const players = [
  { id: SELF, name: '孙尚香', faction: 'wu', hp: 3, maxHp: 3, handCount: 7, equipment: ['kylin_bow', 'red_hare'] },
  { id: 'cao_cao', name: '曹操', faction: 'wei', hp: 3, maxHp: 4, handCount: 4, equipment: ['qinggang_sword', 'eight_trigrams'] },
  { id: 'zhao_yun', name: '赵云', faction: 'shu', hp: 4, maxHp: 4, handCount: 3, equipment: ['serpent_spear', 'dilu'] },
  { id: 'lu_bu', name: '吕布', faction: 'qun', hp: 4, maxHp: 4, handCount: 2, equipment: ['halberd'] },
];
const factionNames = {wu:'吴',wei:'魏',shu:'蜀',qun:'群'};
const state = {cards: new Map(), heroes:new Map(), hand:[], selected:null, targets:[], mode:'play', inspect:null, choosingRegion:false, logs:[], serial:0, stage:null, toastTimer:null, castTimers:[]};
const html = (value='') => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function terms(text) { return html(text).replace(/【?([杀闪桃])】?/g,'<span class="term" data-term="$1">【$1】</span>'); }
function health(p) { return `<span class="health" aria-label="体力 ${p.hp}/${p.maxHp}">${Array.from({length:p.maxHp},(_,i)=>`<i class="${i>=p.hp?'empty':''}" aria-hidden="true"></i>`).join('')}</span>`; }
function heroArt(id) {return ROOT + state.heroes.get(id).artPath;}
function cardArt(id) {return ROOT + state.cards.get(id).artPath;}
function selectedCard() {return state.hand.find(c=>c.key===state.selected);}
function cardSpec() {const selected=selectedCard();return selected&&state.cards.get(selected.id);}
function playerById(id) {return players.find(p=>p.id===id);}
function notify(text) {clearTimeout(state.toastTimer);$('#announcement').textContent=text;$('#announcement').classList.add('show');state.toastTimer=setTimeout(()=>$('#announcement').classList.remove('show'),2600);}
function log(text) {state.logs.unshift(text);state.logs=state.logs.slice(0,4);$('#log').innerHTML=state.logs.map(t=>`<li>${terms(t)}</li>`).join('');}
function cardMarkup(card,index,copyIndex=0) {
 const copy=card.copies[copyIndex%card.copies.length],suits={spade:'♠',heart:'♥',club:'♣',diamond:'♦'};
 const rank={1:'A',11:'J',12:'Q',13:'K'}[copy.rank]||copy.rank;
 return `<img src="${html(cardArt(card.id))}" alt="" draggable="false"><span class="card-corner ${['heart','diamond'].includes(copy.suit)?'red':''}">${rank}<span>${suits[copy.suit]}</span></span><span class="card-index">${index||''}</span><span class="card-title ${card.name.length>2?'long':''}">${html(card.name)}<small>${{basic:'基本牌',trick:'锦囊',equipment:'装备'}[card.category]}</small></span>`;
}
function addHand(id) {state.hand.push({id,key:`hand-${++state.serial}`});}
function renderRoster() {
 $('#roster').innerHTML=players.filter(p=>p.id!==SELF).map(p=>`<article class="opponent ${state.targets.includes(p.id)?'active':''}" data-player="${p.id}"><button class="portrait-select" data-hero="${p.id}" aria-label="${html(p.name)}，${state.selected?'选择目标':'查看公开信息'}"><img src="${heroArt(p.id)}" alt=""><span><span class="opponent-name"><span class="faction" data-faction="${p.faction}">${factionNames[p.faction]}</span>${p.name}</span><span class="opponent-meta">${health(p)}<span>▱ ${p.handCount}</span></span></span></button><button class="inspect-trigger" data-inspect="${p.id}" aria-label="查看${p.name}装备与手牌数量">⋯</button></article>`).join('');
}
function renderSelf() {
 const p=players[0];$('#selfPanel').innerHTML=`<div class="self-title"><img src="${heroArt(SELF)}" alt="孙尚香头像"><div><small>吴 · 弓腰姬</small><h2>孙尚香<span class="you">你</span></h2>${health(p)}</div></div><div class="skills"><button data-skill="结姻" aria-label="查看结姻技能">结姻</button><button data-skill="枭姬" aria-label="查看枭姬技能">枭姬</button></div><div class="equipment-row" aria-label="我的装备">${['武器','防具','进攻马','防御马'].map((label,i)=>{const id=i===0?'kylin_bow':i===2?'red_hare':null;return `<button class="equipment-slot ${id?'filled':''}" data-own-equipment="${id||''}" aria-label="${label}${id?'：'+state.cards.get(id).name:'空槽'}">${id?state.cards.get(id).name:label}</button>`}).join('')}</div>`;
}
function renderHand() {
 $('#handCount').textContent=state.hand.length;
 $('#hand').classList.toggle('overflow',state.hand.length>7);
 $('#hand').innerHTML=state.hand.length?state.hand.map((entry,i)=>{
 const card=state.cards.get(entry.id),disabled=state.mode==='response'&&entry.id!=='shan';
 const angle=(i-(state.hand.length-1)/2)*2.2,lift=Math.abs(i-(state.hand.length-1)/2)*2;
 return `<button class="hand-card" data-card="${card.id}" data-hand="${entry.key}" aria-label="${i+1} ${card.name}${disabled?'，此时不能用于出闪':''}" aria-pressed="${state.selected===entry.key}" style="--angle:${angle}deg;--lift:${lift}px" ${disabled?'disabled':''}>${cardMarkup(card,i+1,i)}</button>`;
 }).join(''):'<p class="empty-hand">手牌已试用完，点击右上角 ↺ 重新体验。</p>';
}
function renderLabels() {
 $('#worldLabels').innerHTML=players.map(p=>`<button class="world-label ${p.id===SELF?'self-label':''}" data-hero="${p.id}" aria-label="${p.name}，${p.id===SELF?'我的武将':'查看或选择'}"><small>${p.id===SELF?'你的阵位':'公开信息'}</small><span>${p.name}</span></button>`).join('');
}
function updateLabels() {
 const spec=cardSpec(),targeted=spec&&['sha','guohe','tiesuo'].includes(spec.id);
 $('#worldLabels').querySelectorAll('[data-hero]').forEach(el=>{
 const id=el.dataset.hero,selected=state.targets.includes(id),allowed=id!==SELF;
 el.classList.toggle('selectable',Boolean(targeted&&allowed));el.classList.toggle('selected',selected);
 el.querySelector('small').textContent=id===SELF?'你的阵位':selected?`${state.targets.indexOf(id)+1} · 已选择`:targeted?'可选目标':'点击查看';
 });
 renderRoster();
}
function showCardInfo(id) { const card=state.cards.get(id);if(!card)return;$('#cardInfoContent').innerHTML=`<p class="eyebrow">${{basic:'基本牌',trick:'锦囊牌',equipment:'装备牌'}[card.category]}</p><h3>${terms(card.name)}</h3><p>${terms(card.description)}</p>`;$('#cardInfo').hidden=false; }
function closeInspector(restoreFocus=false) {const id=state.inspect;state.inspect=null;state.choosingRegion=false;$('#inspector').hidden=true;if(restoreFocus&&id)document.querySelector(`[data-inspect="${id}"]`)?.focus();}
function inspect(id,chooseRegion=false) {
 const p=playerById(id);if(!p)return;state.inspect=id;state.choosingRegion=chooseRegion;$('#cardInfo').hidden=true;
 $('#inspectorEyebrow').textContent=chooseRegion?'过河拆桥 · 选择一张区域牌':'公开信息';
 $('#inspectorContent').innerHTML=`<div class="inspect-hero"><img src="${heroArt(id)}" alt=""><div><h2>${p.name}</h2>${health(p)}</div></div><section class="inspect-section"><h3>手牌 <small>${p.handCount} 张 · 牌面不可见</small></h3><div class="card-backs">${Array.from({length:p.handCount},(_,i)=>chooseRegion?`<button class="card-back" data-hidden-slot="${i}" aria-label="选择第 ${i+1} 张未知手牌">◆</button>`:'<span class="card-back" aria-hidden="true">◆</span>').join('')}</div><p class="private-note">${chooseRegion?'选择一个牌背，或下方一件公开装备。':'仅显示数量；未经公开的牌面始终不可见。'}</p></section><section class="inspect-section"><h3>装备区 <small>公开可查看</small></h3>${p.equipment.map(e=>{const c=state.cards.get(e);return chooseRegion?`<button class="equip-detail" data-remove-equipment="${e}"><img src="${cardArt(e)}" alt="">${c.name} · 选择</button>`:`<details class="equip-detail"><summary><img src="${cardArt(e)}" alt="">${c.name}</summary><p>${terms(c.description)}</p></details>`;}).join('')}</section><section class="inspect-section"><h3>判定区 <small>暂无判定牌</small></h3></section>`;
 $('#inspector').hidden=false;$('#closeInspector').focus();
}
function selectCard(key) {
 const entry=state.hand.find(c=>c.key===key);if(!entry)return;
 if(state.mode==='response'&&entry.id!=='shan'){notify('需要使用【闪】响应这次【杀】');return;}
 closeInspector();state.targets=[];state.selected=state.selected===key?null:key;
 const spec=cardSpec();if(spec?.id==='wanjian')state.targets=players.filter(p=>p.id!==SELF).map(p=>p.id);
 state.stage?.setRange(Boolean(spec&&['sha','guohe','tiesuo','wanjian'].includes(spec.id)));state.stage?.setSelected(null);
 renderHand();renderCommand();updateLabels();if(spec)showCardInfo(spec.id);else $('#cardInfo').hidden=true;
}
function selectHero(id) {
 const spec=cardSpec();if(!spec){if(id===SELF){notify('你是孙尚香。技能与装备位于左下方。');return;}inspect(id);return;}
 if(!['sha','guohe','tiesuo'].includes(spec.id)){notify(spec.id==='wanjian'?'万箭齐发已标出所有其他武将':'这张牌不需要选择其他目标');return;}
 if(id===SELF){notify('本演示请从其他武将中选择目标');return;}
 closeInspector();
 if(state.targets.includes(id))state.targets=state.targets.filter(t=>t!==id);
 else if(spec.id==='tiesuo'){if(state.targets.length===2)state.targets.shift();state.targets.push(id);}
 else state.targets=[id];
 state.stage?.setSelected(state.targets.at(-1)||null);renderCommand();updateLabels();
}
function canConfirm() {const spec=cardSpec();if(!spec)return false;if(state.mode==='response')return spec.id==='shan';if(spec.id==='shan')return false;return !['sha','guohe','tiesuo'].includes(spec.id)||state.targets.length>0;}
function renderCommand() {
 const spec=cardSpec(),response=state.mode==='response';
 let title=response?'曹操对你使用了【杀】':'从手牌中选择一张',desc=response?'使用一张【闪】，或选择放弃响应。':'点击武将可查看公开信息';
 if(spec){
  title=`已选择【${spec.name}】`;
  desc=spec.id==='tiesuo'?`选择 1–2 名武将 · 已选 ${state.targets.length}/2`:['sha','guohe'].includes(spec.id)?(state.targets.length?'目标已选，确认后使用':'点击场上人物，选择一名目标'):spec.id==='shan'?(response?'确认出闪，响应这次攻击':'闪在受到攻击时使用；点右上角 ? 体验响应'):spec.id==='wanjian'?'作用于其他 3 名武将，已逐个标出':spec.category==='equipment'?'查看装备入场的界面反馈':'确认后播放使用反馈';
 }
 $('#commandKicker').textContent=response?'等待你的响应':'你的出牌阶段';$('#commandTitle').innerHTML=terms(title);$('#commandDescription').textContent=desc;
 $('#activePhase').textContent=response?'响应':'出牌';
 $('#targetChips').innerHTML=state.targets.map((id,i)=>`<span>${i+1} · ${playerById(id).name}</span>`).join('');
 $('#confirm').disabled=!canConfirm();$('#confirm span').textContent=!spec?'选择手牌':response?'使用【闪】':spec.id==='guohe'&&state.targets.length?'选择区域牌':canConfirm()?'确认使用':'选择目标';
 $('#cancel').disabled=!spec;$('#endTurn').innerHTML=response?'放弃响应 <span>→</span>':'结束出牌 <span>→</span>';
 $('#handHint').textContent=response?'仅【闪】可以用于此次响应':'点击选择 · 再次点击收回';
}
function cancel() {
 state.selected=null;state.targets=[];closeInspector();$('#cardInfo').hidden=true;state.stage?.setSelected(null);state.stage?.setRange(false);renderHand();renderCommand();updateLabels();
}
function cast(id,name) {const label=document.querySelector(`.world-label[data-hero="${id}"]`);if(!label)return;label.querySelector('.cast-name')?.remove();const text=document.createElement('strong');text.className='cast-name';text.textContent=name;label.append(text);state.castTimers.push(setTimeout(()=>text.remove(),1550));}
function finishUse(regionDescription='') {
 const entry=selectedCard(),spec=cardSpec();if(!entry||!spec)return;
 const targets=[...state.targets],responding=state.mode==='response';
 state.stage?.play(SELF,responding?'dodge':spec.category==='equipment'?'ready':'attack');cast(SELF,spec.name);
 const label=targets.map(id=>playerById(id).name).join('、');
 log(responding?'孙尚香使用【闪】，响应曹操的【杀】。':`孙尚香${label?' → '+label:''}：使用【${spec.name}】${regionDescription?' · '+regionDescription:''}。`);
 notify(responding?'【闪】已打出 · 响应完成':`${spec.name} · ${regionDescription||'使用反馈已播放'}`);
 state.hand=state.hand.filter(c=>c.key!==entry.key);if(responding)state.mode='play';cancel();
}
function confirm() {if(!canConfirm())return;if(cardSpec().id==='guohe'){inspect(state.targets[0],true);return;}finishUse();}
function setScenario(mode) {
 cancel();state.mode=mode==='response'?'response':'play';
 if(mode==='response') {if(!state.hand.some(c=>c.id==='shan'))addHand('shan');log('曹操向你使用【杀】，等待你的响应。');notify('响应示例 · 请选择【闪】');}
 if(mode==='harvest')openPool();renderHand();renderCommand();updateLabels();
}
function openPool() {
 const ids=['fire_sha','tao','wuxie','eight_trigrams','jiu'];
 $('#poolCards').innerHTML=ids.map((id,i)=>`<button class="hand-card" data-pool="${id}" aria-label="选择公开牌 ${state.cards.get(id).name}">${cardMarkup(state.cards.get(id),null,i)}</button>`).join('');$('#poolDialog').showModal();
}
function reset() {
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();state.castTimers.forEach(clearTimeout);state.castTimers=[];document.querySelectorAll('.cast-name').forEach(el=>el.remove());state.hand=[];state.serial=0;initialHand.forEach(addHand);state.mode='play';state.logs=[];state.stage?.reset();cancel();log('孙尚香摸牌完毕，进入出牌阶段。');log('曹操装备【青釭剑】。');$('#scenario').value='play';renderSelf();notify('演武场已重置');
}
function showSkill(name) {const skill=state.heroes.get(SELF).skills.find(s=>s.name===name);$('#cardInfoContent').innerHTML=`<p class="eyebrow">孙尚香 · 武将技能</p><h3>${name}</h3><p>${terms(skill.description)}</p><p class="private-note">当前展示技能说明。</p>`;$('#cardInfo').hidden=false;}
function connectEvents() {
 $('#hand').addEventListener('click',e=>{const b=e.target.closest('[data-hand]');if(b)selectCard(b.dataset.hand);});
 $('#hand').addEventListener('pointerover',e=>{if(e.pointerType==='touch'||state.inspect)return;const b=e.target.closest('[data-hand]');if(b)showCardInfo(state.hand.find(c=>c.key===b.dataset.hand).id);});
 $('#hand').addEventListener('pointerleave',()=>{const spec=cardSpec();if(spec)showCardInfo(spec.id);else $('#cardInfo').hidden=true;});
 document.addEventListener('click',e=>{const inspectButton=e.target.closest('[data-inspect]'),hero=e.target.closest('[data-hero]'),skill=e.target.closest('[data-skill]'),equip=e.target.closest('[data-own-equipment]'),pool=e.target.closest('[data-pool]'),close=e.target.closest('[data-close]');
  if(inspectButton)inspect(inspectButton.dataset.inspect);else if(hero)selectHero(hero.dataset.hero);
  if(skill)showSkill(skill.dataset.skill);if(equip){if(equip.dataset.ownEquipment)showCardInfo(equip.dataset.ownEquipment);else notify('这个装备槽目前为空');}
  if(pool){addHand(pool.dataset.pool);$('#poolDialog').close();renderHand();log(`你从公开牌池选择了【${state.cards.get(pool.dataset.pool).name}】。`);notify('选中的公开牌已加入手牌');}
  if(close)$('#'+close.dataset.close).close();
  if(state.choosingRegion&&(e.target.closest('[data-hidden-slot]')||e.target.closest('[data-remove-equipment]')))finishUse(e.target.closest('[data-hidden-slot]')?'选择了一张未知手牌':'选择了公开装备');
 });
 $('#confirm').addEventListener('click',confirm);$('#cancel').addEventListener('click',cancel);$('#closeInspector').addEventListener('click',()=>closeInspector(true));
 $('#endTurn').addEventListener('click',()=>{if(state.mode==='response'){log('孙尚香放弃响应，交由玩法结算。');state.mode='play';cancel();notify('放弃响应示例结束');}else $('#endDialog').showModal();});
 $('#nextResponse').addEventListener('click',()=>{$('#endDialog').close();setScenario('response');});
 $('#helpButton').addEventListener('click',()=>$('#helpDialog').showModal());$('#applyScenario').addEventListener('click',()=>{const mode=$('#scenario').value;$('#helpDialog').close();setScenario(mode);});
 $('#resetButton').addEventListener('click',reset);$('#logToggle').addEventListener('click',()=>{const hidden=!$('#log').hidden;$('#log').hidden=hidden;$('#logToggle').setAttribute('aria-expanded',String(!hidden));$('#logToggle span').textContent=hidden?'+':'−';});
 document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target.matches('input,select,textarea'))return;if(e.repeat)return;
  if(e.key==='Escape'){e.preventDefault();if(state.inspect)closeInspector(true);else cancel();}
  if(e.target.closest('button,a'))return;
  if(/^[1-9]$/.test(e.key)){const entry=state.hand[Number(e.key)-1];if(entry){e.preventDefault();selectCard(entry.key);}}
  if(e.key==='Enter'){e.preventDefault();confirm();}
 });
 const joystick=$('#joystick');let drag=null;
 const move=e=>{if(drag!==e.pointerId)return;const r=joystick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/28,dz=(e.clientY-r.top-r.height/2)/28,length=Math.max(1,Math.hypot(dx,dz));joystick.firstElementChild.style.transform=`translate(${dx/length*19}px,${dz/length*19}px)`;state.stage?.move?.(dx/length,dz/length);};
 joystick.addEventListener('pointerdown',e=>{drag=e.pointerId;joystick.setPointerCapture(e.pointerId);move(e);});joystick.addEventListener('pointermove',move);
 const stop=()=>{drag=null;joystick.firstElementChild.style.transform='';state.stage?.move?.(0,0);};joystick.addEventListener('pointerup',stop);joystick.addEventListener('pointercancel',stop);joystick.addEventListener('lostpointercapture',stop);
}
async function init() {
 try {
  const responses=await Promise.all(['game-card-art-v1','hero-art-v1'].map(name=>fetch(`${ROOT}data/${name}.json`)));if(responses.some(r=>!r.ok))throw Error('牌库或武将数据未能加载');const [cards,heroes]=await Promise.all(responses.map(r=>r.json()));state.cards=new Map(cards.map(c=>[c.id,c]));state.heroes=new Map(heroes.map(h=>[h.id,h]));
  initialHand.forEach(addHand);renderRoster();renderSelf();renderHand();renderLabels();renderCommand();connectEvents();log('曹操装备【青釭剑】。');log('孙尚香摸牌完毕，进入出牌阶段。');
  state.stage=window.BattleStage.create($('#arena'),{onSelect:selectHero,onPositions:positions=>{for(const [id,p]of Object.entries(positions)){const label=document.querySelector(`.world-label[data-hero="${id}"]`);if(label){label.style.left=`${p.x}px`;label.style.top=`${p.y}px`;label.hidden=p.visible===false;}}},onReady:()=>{$('#loadStatus').hidden=true;},onError:error=>{$('#loadStatus').textContent=`场景加载失败：${error.message||error}`;$('#loadStatus').classList.add('error');}});
 }catch(error){$('#loadStatus').textContent=`加载失败：${error.message}。请刷新重试。`;$('#loadStatus').classList.add('error');}
}
init();
