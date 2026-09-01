--!strict
-- 引擎：移植自网页版 hype-life/src/engine/engine.ts，判定顺序保持一致。
-- 纯逻辑模块：不含任何 Roblox 实例操作，可在服务端/客户端两侧使用。

local Content = require(script.Parent.Content)

local CARDS: { [string]: any } = {}
for _, card in ipairs(Content.cards) do
	CARDS[card.id] = card
end

local MAINLINE: { string } = Content.mainline
local INITIAL_STATS: { [string]: number } = Content.initialStats
local UNDO_LIMIT: number = Content.undoLimit
local WIN_ENDING_ID: string = Content.winEndingId
local STAT_KEYS = { "hype", "trust", "cash", "risk" }

export type Stats = { [string]: number }
export type GameState = {
	stats: Stats,
	currentEventId: string?,
	seenIds: { string },
	flags: { string },
	queue: { string },
	mainIndex: number,
	sideOrder: { string },
	sideIndex: number,
	lastSideAtMain: number,
	cardsPlayed: number,
	lastEffects: { [string]: number }?,
	toast: string?,
	endingId: string?,
	history: { GameState },
	undoLeft: number,
}

local Engine = {}

local function clampStat(n: number): number
	return math.max(0, math.min(100, math.floor(n + 0.5)))
end

local function shallowCopy(t): any
	local out = {}
	for k, v in pairs(t) do
		out[k] = v
	end
	return out
end

local function copyList(t): { any }
	local out = {}
	for _, v in ipairs(t) do
		table.insert(out, v)
	end
	return out
end

function Engine.applyEffects(stats: Stats, effects: { [string]: number }?): Stats
	local out = shallowCopy(stats)
	if effects then
		for _, key in ipairs(STAT_KEYS) do
			local delta = effects[key]
			if delta then
				out[key] = clampStat(out[key] + delta)
			end
		end
	end
	return out
end

local function checkEnding(stats: Stats): string?
	if stats.risk >= 100 then
		return "blocked"
	end
	if stats.cash <= 0 then
		return "broke"
	end
	if stats.hype <= 0 then
		return "forgotten"
	end
	if stats.trust <= 0 then
		return "enemy"
	end
	return nil
end

function Engine.createInitialState(): GameState
	local first = MAINLINE[1]
	assert(first, "mainline 不能为空")
	local sideOrder = copyList(Content.side)
	for i = #sideOrder, 2, -1 do
		local j = math.random(i)
		sideOrder[i], sideOrder[j] = sideOrder[j], sideOrder[i]
	end
	return {
		stats = shallowCopy(INITIAL_STATS),
		currentEventId = first,
		seenIds = { first },
		flags = {},
		queue = {},
		mainIndex = 1,
		sideOrder = sideOrder,
		sideIndex = 1,
		lastSideAtMain = -1,
		cardsPlayed = 0,
		lastEffects = nil,
		toast = nil,
		endingId = nil,
		history = {},
		undoLeft = UNDO_LIMIT,
	}
end

local function evalWhenSpec(spec, stats: Stats): boolean
	if not spec then
		return true
	end
	local v = stats[spec.stat]
	if spec.op == ">=" then
		return v >= spec.value
	end
	return v <= spec.value
end

local function currentMainAct(state: GameState): number
	local lastIdx = math.min(state.mainIndex, #MAINLINE) - 1
	local id = MAINLINE[lastIdx]
	local card = id and CARDS[id]
	return (card and card.act) or 1
end

local function drawSide(state: GameState): string?
	local act = currentMainAct(state, Content)
	for i = state.sideIndex, #state.sideOrder do
		local id = state.sideOrder[i]
		local ev = CARDS[id]
		if ev and ev.act <= act and evalWhenSpec(ev.whenSpec, state.stats) then
			state.sideOrder[i] = state.sideOrder[state.sideIndex]
			state.sideOrder[state.sideIndex] = id
			state.sideIndex += 1
			return id
		end
	end
	return nil
end

local function advance(state: GameState, content): string?
	if #state.queue > 0 then
		return table.remove(state.queue, 1)
	end
	if
		state.mainIndex >= 2
		and state.mainIndex % 2 == 0
		and state.lastSideAtMain < state.mainIndex
	then
		local sideId = drawSide(state, content)
		if sideId then
			state.lastSideAtMain = state.mainIndex
			return sideId
		end
	end
	local nextMain = MAINLINE[state.mainIndex + 1]
	if not nextMain then
		return nil
	end
	state.mainIndex += 1
	return nextMain
end

function Engine.choose(state: GameState, choice): GameState
	if state.endingId or state.currentEventId == nil then
		return state
	end

	local snapshot = shallowCopy(state)
	snapshot.history = {}
	snapshot.lastEffects = nil
	snapshot.toast = nil

	local s = shallowCopy(state)
	s.stats = Engine.applyEffects(state.stats, choice.effects)
	s.flags = copyList(state.flags)
	if choice.flags then
		for _, f in ipairs(choice.flags) do
			table.insert(s.flags, f)
		end
	end
	s.queue = copyList(state.queue)
	s.seenIds = copyList(state.seenIds)
	s.sideOrder = copyList(state.sideOrder)
	s.history = copyList(state.history)
	table.insert(s.history, snapshot)
	while #s.history > UNDO_LIMIT do
		table.remove(s.history, 1)
	end
	s.lastEffects = choice.effects or {}
	s.toast = choice.resultText or nil
	s.cardsPlayed = state.cardsPlayed + 1
	if choice.nextEventId then
		table.insert(s.queue, 1, choice.nextEventId)
	end

	local death = choice.endingId or checkEnding(s.stats)
	if death then
		s.endingId = death :: string
		s.currentEventId = nil
		return s
	end

	local next = advance(s, Content)
	if next == nil then
		s.endingId = WIN_ENDING_ID
		s.currentEventId = nil
		return s
	end
	s.currentEventId = next
	table.insert(s.seenIds, next)
	return s
end

function Engine.undo(state: GameState): GameState
	if
		state.endingId
		or state.currentEventId == nil
		or state.undoLeft <= 0
		or #state.history == 0
	then
		return state
	end
	local prev = state.history[#state.history]
	local out = shallowCopy(prev)
	out.history = copyList(state.history)
	table.remove(out.history, #out.history)
	out.undoLeft = state.undoLeft - 1
	out.toast = "↩ 时光机启动：这一题，换个选法。"
	out.lastEffects = nil
	return out
end

function Engine.resolveEnding(baseId: string, flags: { string }): string
	local has = function(f: string)
		return table.find(flags, f) ~= nil
	end
	if baseId == "ipo" then
		local allFinale = true
		for _, f in ipairs(Content.finaleFlags) do
			if not has(f) then
				allFinale = false
				break
			end
		end
		if allFinale then
			return "flowgod"
		end
		if has("essay") and has("essay_backlash") then
			return "writer"
		end
		if has("museum") then
			return "art"
		end
		if has("huxin_flex") then
			return "lecture"
		end
		if #flags == 0 then
			return "nobody"
		end
		return "ipo"
	end
	if baseId == "blocked" and has("debt") then
		return "nextweek"
	end
	return baseId
end

function Engine.reactionsFor(effects): { string }
	local out = {}
	if not effects then
		return out
	end
	for _, rule in ipairs(Content.reactionRules) do
		local delta = effects[rule.key]
		if delta then
			local hit = if rule.threshold > 0
				then delta >= rule.threshold
				else delta <= rule.threshold
			if hit then
				table.insert(out, rule.line)
			end
		end
	end
	if #out > 2 then
		while #out > 2 do
			table.remove(out)
		end
	end
	return out
end

return Engine
