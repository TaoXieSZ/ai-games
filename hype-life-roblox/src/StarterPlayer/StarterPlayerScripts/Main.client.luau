--!strict
-- 热搜人生 · Roblox 客户端：ScreenGui 三屏 UI（标题 / 卡牌 / 结局）。
-- 引擎与内容来自 ReplicatedStorage.Game（与网页版同源）。
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local AssetService = game:GetService("AssetService")

local Content = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("Content"))
local Engine = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("Engine"))
local SaveAPI = ReplicatedStorage:WaitForChild("SaveAPI")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local function showFatal(title: string, message: unknown)
	local ok, err = pcall(function()
		local f = Instance.new("ScreenGui")
		f.Name = "HypeLifeFatal"
		f.ResetOnSpawn = false
		f.Parent = playerGui
		local bg = Instance.new("Frame")
		bg.Size = UDim2.fromScale(1, 1)
		bg.BackgroundColor3 = Color3.fromRGB(26, 28, 44)
		bg.Parent = f
		local t = Instance.new("TextLabel")
		t.Size = UDim2.new(1, -24, 0, 24)
		t.Position = UDim2.new(0, 12, 0, 12)
		t.BackgroundTransparency = 1
		t.TextColor3 = Color3.fromRGB(255, 107, 107)
		t.TextXAlignment = Enum.TextXAlignment.Left
		t.TextSize = 16
		t.Font = Enum.Font.Code
		t.Text = title
		t.Parent = bg
		local body = Instance.new("TextLabel")
		body.Size = UDim2.new(1, -24, 1, -48)
		body.Position = UDim2.new(0, 12, 0, 44)
		body.BackgroundTransparency = 1
		body.TextColor3 = Color3.fromRGB(244, 244, 244)
		body.TextXAlignment = Enum.TextXAlignment.Left
		body.TextYAlignment = Enum.TextYAlignment.Top
		body.TextSize = 12
		body.Font = Enum.Font.Code
		body.TextWrapped = true
		body.Text = tostring(message)
		body.Parent = bg
	end)
	if not ok then
		warn(title, message)
	end
end

local function boot()
local C = {
	bg = Color3.fromRGB(26, 28, 44),
	panel = Color3.fromRGB(41, 54, 111),
	deep = Color3.fromRGB(31, 42, 82),
	ink = Color3.fromRGB(244, 244, 244),
	dim = Color3.fromRGB(148, 176, 194),
	lock = Color3.fromRGB(86, 108, 134),
	gold = Color3.fromRGB(255, 205, 117),
	hot = Color3.fromRGB(239, 125, 87),
	trust = Color3.fromRGB(115, 239, 247),
	cash = Color3.fromRGB(255, 205, 117),
	risk = Color3.fromRGB(177, 62, 83),
	blue = Color3.fromRGB(65, 166, 246),
}

local STAT_META = {
	{ key = "hype", label = "热度", color = C.hot },
	{ key = "trust", label = "信用", color = C.trust },
	{ key = "cash", label = "资金", color = C.cash },
	{ key = "risk", label = "风险", color = C.risk },
}

local ENDING_SPRITE: { [string]: string } = {
	flowgod = "bell", ipo = "bell", writer = "student", art = "rich",
	lecture = "rich", nobody = "student", nextweek = "panic", blocked = "panic",
	broke = "panic", forgotten = "student", enemy = "melon", stomach = "melon",
}

-- ── 客户端状态 ───────────────────────────────────────

local gallery: { string } = {}
local store: any = { screen = "title", state = nil, lastEndingNew = false }
local listeners = {}

local function getStore()
	return store
end

local function set(patch)
	for k, v in pairs(patch) do
		store[k] = v
	end
	for _, fn in ipairs(listeners) do
		fn()
	end
end

local function subscribe(fn)
	table.insert(listeners, fn)
end

-- ── 存档（经服务端 DataStore） ────────────────────────

local galleryDirty = false

local function pushSave()
	task.spawn(function()
		pcall(function()
			SaveAPI:InvokeServer("save", {
				save = store.state,
				gallery = gallery,
			})
		end)
	end)
end

-- （存档加载在文件末尾执行，避免引用未定义的渲染函数）

-- ── 动作 ─────────────────────────────────────────────

local function recordEnding(id: string): boolean
	if table.find(gallery, id) then
		return false
	end
	table.insert(gallery, id)
	return true
end

local function chooseIndex(i: number)
	local st = store.state
	if not st or not st.currentEventId then
		return
	end
	local event = Content.cards[st.currentEventId]
	local choice = event.choices[i]
	if not choice then
		return
	end
	local next = Engine.choose(st, choice)
	if next.endingId then
		next.endingId = Engine.resolveEnding(next.endingId, next.flags)
	end
	local lastEndingNew = store.lastEndingNew
	if next.endingId then
		lastEndingNew = recordEnding(next.endingId)
	end
	set({ state = next, lastEndingNew = lastEndingNew })
	pushSave()
end

local function undoGame()
	if not store.state then
		return
	end
	set({ state = Engine.undo(store.state) })
	pushSave()
end

local function startNew()
	local fresh = Engine.createInitialState()
	set({ screen = "game", state = fresh, lastEndingNew = false })
	pushSave()
end

local function continueGame()
	if store.savedGame then
		set({ screen = "game", state = store.savedGame, lastEndingNew = false })
	else
		startNew()
	end
end

local function toTitle()
	set({ screen = "title" })
end

-- ── UI 构建工具 ──────────────────────────────────────

local gui = Instance.new("ScreenGui")
gui.Name = "HypeLife"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = playerGui

local function mk(className: string, props: { [string]: any }, parent: Instance?): Instance
	local inst = Instance.new(className)
	for k, v in pairs(props) do
		(inst :: any)[k] = v
	end
	inst.Parent = parent or gui
	return inst
end

local function mkLabel(parent, text: string, size: number, color: Color3): TextLabel
	return mk("TextLabel", {
		Text = text,
		TextSize = size,
		TextColor3 = color,
		BackgroundTransparency = 1,
		Font = Enum.Font.Arimo,
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		Size = UDim2.new(1, 0, 0, size * 1.5),
	}, parent)
end

local function mkButton(parent, text: string, size: number, onClick, props): TextButton
	local btn = mk("TextButton", {
		Text = text,
		TextSize = size,
		TextColor3 = props.color or C.ink,
		BackgroundColor3 = props.bg or C.blue,
		Font = Enum.Font.Arimo,
		TextWrapped = true,
		Size = props.size or UDim2.new(1, 0, 0, 44),
		AutoButtonColor = true,
	}, parent)
	mk("UICorner", { CornerRadius = UDim.new(0, 4) }, btn)
	mk("UIStroke", { Color = props.border or C.ink, Thickness = 2 }, btn)
	btn.Activated:Connect(onClick)
	return btn
end

-- 像素立绘：EditableImage 运行时写入像素（需在 Game Settings → Security 开启
-- "Allow Mesh & Image APIs"；未开启时立绘自动隐藏，不影响游玩）
local spriteCache: { [string]: ImageLabel? } = {}

local function spriteLabel(key: string, pxSize: number): ImageLabel?
	if spriteCache[key] ~= nil then
		local cached = spriteCache[key]
		if cached then
			local clone = cached:Clone()
			return clone
		end
		return nil
	end
	local matrix = Content.sprites[key]
	local label: ImageLabel? = nil
	local ok, result = pcall(function()
		local size = #matrix
		local image = AssetService:CreateEditableImage({ Size = Vector2.new(size, size) })
		local buf = buffer.create(size * size * 4)
		for r = 1, size do
			local row = matrix[r]
			for c = 1, size do
				local ch = row:sub(c, c)
				local hex = Content.palette[ch]
				local idx = ((r - 1) * size + (c - 1)) * 4
				if hex then
					buffer.writeu8(buf, idx, tonumber(hex:sub(2, 3), 16) or 0)
					buffer.writeu8(buf, idx + 1, tonumber(hex:sub(4, 5), 16) or 0)
					buffer.writeu8(buf, idx + 2, tonumber(hex:sub(6, 7), 16) or 0)
					buffer.writeu8(buf, idx + 3, 255)
				else
					buffer.writeu8(buf, idx + 3, 0)
				end
			end
		end
		image:WritePixelsBuffer(Vector2.zero, Vector2.new(size, size), buf)
		return image
	end)
	if ok and result then
		label = mk("ImageLabel", {
			BackgroundTransparency = 1,
			ImageContent = Content.fromObject(result),
			ResampleMode = Enum.ResamplerMode.Pixelated,
			Size = UDim2.fromOffset(pxSize, pxSize),
		})
	end
	spriteCache[key] = label
	return if label then label:Clone() else nil
end

-- ── 三屏骨架 ─────────────────────────────────────────

local titleFrame = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.bg, Visible = true })
local gameFrame = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.bg, Visible = false })
local endingFrame = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.bg, Visible = false })

-- 标题页
local titleSpriteHolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 130), Position = UDim2.new(0, 0, 0, 70) }, titleFrame)
mk("TextLabel", { Text = "热搜人生", TextSize = 44, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 60), Position = UDim2.new(0, 0, 0, 206) }, titleFrame)
mk("TextLabel", { Text = "HYPE LIFE · 流量炼金术士模拟器", TextSize = 13, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 20), Position = UDim2.new(0, 0, 0, 266) }, titleFrame)
mk("TextLabel", { Text = "从三本线到纳斯达克。你有四条命：热度、信用、资金、风险——任何一条归零，人生杀青。", TextSize = 14, TextColor3 = C.ink, BackgroundTransparency = 1, TextWrapped = true, Size = UDim2.new(1, -60, 0, 60), Position = UDim2.new(0, 30, 0, 296) }, titleFrame)
local titleButtons = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, -120, 0, 100), Position = UDim2.new(0, 60, 0, 366) }, titleFrame)
mk("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder, HorizontalAlignment = Enum.HorizontalAlignment.Center }, titleButtons)
local galleryLabel = mk("TextLabel", { Text = "结局图鉴 0/12", TextSize = 13, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 22), Position = UDim2.new(0, 0, 0, 480) }, titleFrame)
local galleryGrid = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, -80, 0, 120), Position = UDim2.new(0, 40, 0, 506) }, titleFrame)
mk("UIGridLayout", { CellSize = UDim2.new(0.24, -4, 0, 28), CellPadding = UDim2.new(0.01, 0, 0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, galleryGrid)
mk("TextLabel", { Text = "GitHub: TaoXieSZ/ai-games", TextSize = 12, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 18), Position = UDim2.new(0, 0, 0, 636) }, titleFrame)
mk("TextLabel", { Text = "本游戏纯属虚构讽刺作品，人物与事件均为艺术加工，请勿对号入座。", TextSize = 11, TextColor3 = C.dim, TextWrapped = true, BackgroundTransparency = 1, Size = UDim2.new(1, -80, 0, 32), Position = UDim2.new(0, 40, 0, 656) }, titleFrame)

-- 游戏页
local gameScroll = mk("ScrollingFrame", {
	Position = UDim2.new(0, 8, 0, 8),
	Size = UDim2.new(1, -16, 1, -16),
	BackgroundTransparency = 1,
	ScrollBarThickness = 4,
	CanvasSize = UDim2.new(0, 0, 0, 0),
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
}, gameFrame)
mk("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, gameScroll)

local topbar = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 32), LayoutOrder = 1 }, gameScroll)
local exitBtn = mkButton(topbar, "✕ 退出", 12, function()
	toTitle()
end, { bg = C.panel, border = C.dim, size = UDim2.fromOffset(80, 26) })
exitBtn.Position = UDim2.new(0, 0, 0, 3)
mk("TextLabel", { Text = "热搜人生", TextSize = 14, TextColor3 = C.gold, BackgroundTransparency = 1, Size = UDim2.new(1, -180, 1, 0), Position = UDim2.new(0, 90, 0, 0) }, topbar)
local muteBtn = mkButton(topbar, "🔊", 12, function()
	-- 小游戏版音效独立；Roblox 版 v1 为静音界面
end, { bg = C.panel, border = C.dim, size = UDim2.fromOffset(40, 26) })
muteBtn.Position = UDim2.new(1, -40, 0, 3)

local statsFrame = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 70), LayoutOrder = 2 }, gameScroll)
mk("UIGridLayout", { CellSize = UDim2.new(0.5, -5, 1, -4), CellPadding = UDim2.new(0, 10, 0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, statsFrame)
local statBars = {}
for i, meta in ipairs(STAT_META) do
	local cell = mk("Frame", { BackgroundColor3 = C.panel, LayoutOrder = i }, statsFrame)
	mk("UIStroke", { Color = C.ink, Thickness = 2 }, cell)
	mk("TextLabel", { Text = meta.label, TextSize = 12, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(0, 40, 0, 14), Position = UDim2.new(0, 6, 0, 2) }, cell)
	local track = mk("Frame", { BackgroundColor3 = C.bg, Size = UDim2.new(1, -34, 0, 6), Position = UDim2.new(0, 28, 0, 17) }, cell)
	local fill = mk("Frame", { BackgroundColor3 = meta.color, Size = UDim2.new(0.3, 0, 1, 0) }, track)
	local delta = mk("TextLabel", { Text = "", TextSize = 12, BackgroundTransparency = 1, Size = UDim2.new(0, 40, 0, 14), Position = UDim2.new(1, -44, 0, 2) }, cell)
	statBars[meta.key] = { fill = fill, delta = delta }
end

local cardPanel = mk("Frame", { BackgroundColor3 = C.panel, LayoutOrder = 3 }, gameScroll)
mk("UIStroke", { Color = C.ink, Thickness = 3 }, cardPanel)
mk("UIPadding", { PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 12), PaddingLeft = UDim.new(0, 12), PaddingRight = UDim.new(0, 12) }, cardPanel)
mk("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, cardPanel)

local cardBadges = mk("TextLabel", { Text = "", TextSize = 12, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 20), TextXAlignment = Enum.TextXAlignment.Right, LayoutOrder = 1 }, cardPanel)
local toastLabel = mk("TextLabel", { Text = "", TextSize = 13, TextColor3 = C.cash, BackgroundColor3 = C.deep, TextWrapped = true, Size = UDim2.new(1, 0, 0, 30), Visible = false, LayoutOrder = 2 }, cardPanel)
local reactionsLabel = mk("TextLabel", { Text = "", TextSize = 12, TextColor3 = C.dim, BackgroundTransparency = 1, TextWrapped = true, Size = UDim2.new(1, 0, 0, 20), Visible = false, LayoutOrder = 3 }, cardPanel)
local cardTitle = mk("TextLabel", { Text = "", TextSize = 24, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 34), LayoutOrder = 4 }, cardPanel)
local cardSpriteHolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 96), LayoutOrder = 5 }, cardPanel)
local cardText = mk("TextLabel", { Text = "", TextSize = 14, TextColor3 = C.ink, TextWrapped = true, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 60), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 6 }, cardPanel)
local choicesFolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 7 }, cardPanel)
mk("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, choicesFolder)
local undoBtn = mkButton(cardPanel, "↩ 时光机", 13, function()
	undoGame()
end, { bg = C.panel, color = C.dim, border = C.lock, size = UDim2.new(1, 0, 0, 32), LayoutOrder = 8 })

-- 结局页
local endingPanel = mk("Frame", { BackgroundColor3 = C.panel, Size = UDim2.new(1, -28, 0, 500), Position = UDim2.new(0, 14, 0, 16) }, endingFrame)
mk("UIStroke", { Color = C.gold, Thickness = 3 }, endingPanel)
mk("UIPadding", { PaddingTop = UDim.new(0, 16), PaddingBottom = UDim.new(0, 16), PaddingLeft = UDim.new(0, 16), PaddingRight = UDim.new(0, 16) }, endingPanel)
mk("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, endingPanel)
local endingSub = mk("TextLabel", { Text = "", TextSize = 12, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 18), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 1 }, endingPanel)
local endingTitle = mk("TextLabel", { Text = "", TextSize = 34, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 44), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 2 }, endingPanel)
local endingSpriteHolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 126), LayoutOrder = 3 }, endingPanel)
local endingText = mk("TextLabel", { Text = "", TextSize = 14, TextColor3 = C.ink, TextWrapped = true, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 80), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 4 }, endingPanel)
local endingNew = mk("TextLabel", { Text = "★ 新结局收录！图鉴已更新", TextSize = 13, TextColor3 = C.gold, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 24), Visible = false, LayoutOrder = 5 }, endingPanel)
local endingScenes = mk("TextLabel", { Text = "", TextSize = 13, TextColor3 = C.ink, TextWrapped = true, BackgroundColor3 = C.deep, Size = UDim2.new(1, 0, 0, 60), AutomaticSize = Enum.AutomaticSize.Y, Visible = false, LayoutOrder = 6 }, endingPanel)
local endingStats = mk("TextLabel", { Text = "", TextSize = 13, TextColor3 = C.cash, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 22), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 7 }, endingPanel)
local endingButtons = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 100), LayoutOrder = 8 }, endingPanel)
mk("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, endingButtons)
mkButton(endingButtons, "再活一次", 15, startNew, { bg = C.gold, color = C.bg })
mkButton(endingButtons, "回到标题", 15, toTitle, { bg = C.blue })
mk("TextLabel", { Text = "本游戏纯属虚构讽刺作品，人物与事件均为艺术加工。", TextSize = 11, TextColor3 = C.dim, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 18), LayoutOrder = 9 }, endingPanel)

-- ── 渲染 ─────────────────────────────────────────────

local function statColor(key: string): Color3
	for _, meta in ipairs(STAT_META) do
		if meta.key == key then
			return meta.color
		end
	end
	return C.ink
end

local function renderTitle()
	titleFrame.Visible = true
	gameFrame.Visible = false
	endingFrame.Visible = false
	local unlocked = gallery
	local all = {}
	for id, _e in pairs(Content.endings) do
		table.insert(all, id)
	end
	local count = 0
	for _, child in ipairs(galleryGrid:GetChildren()) do
		if child:IsA("TextLabel") then
			child:Destroy()
		end
	end
	-- 固定顺序展示
	local ordered = {}
	for id, _e in pairs(Content.endings) do
		table.insert(ordered, id)
	end
	table.sort(ordered)
	for _, id in ipairs(ordered) do
		local got = table.find(unlocked, id) ~= nil
		local item = mk("TextLabel", { Text = if got then Content.endings[id].title else "？？？", TextSize = 10, TextColor3 = if got then C.gold else C.lock, BackgroundColor3 = if got then C.panel else C.bg, TextWrapped = true, Size = UDim2.new(1, 0, 1, 0) }, galleryGrid)
		mk("UIStroke", { Color = if got then C.gold else C.lock, Thickness = 1 }, item)
		if got then
			count += 1
		end
	end
	galleryLabel.Text = `结局图鉴 {count}/{#all}`
	-- 按钮区
	for _, child in ipairs(titleButtons:GetChildren()) do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
	local hasSave = store.savedGame ~= nil
	if hasSave then
		mkButton(titleButtons, "继续上辈子", 15, continueGame, { bg = C.gold, color = C.bg, size = UDim2.new(1, 0, 0, 44) })
	end
	mkButton(titleButtons, if hasSave then "重新投胎" else "开始人生", 15, startNew, { bg = C.blue, size = UDim2.new(1, 0, 0, 44) })
	-- 立绘
	for _, child in ipairs(titleSpriteHolder:GetChildren()) do
		child:Destroy()
	end
	local sprite = spriteLabel("smug", 112)
	if sprite then
		sprite.Parent = titleSpriteHolder
		sprite.Position = UDim2.new(0.5, -56, 0, 8)
	end
end

local function renderGame()
	local st = store.state
	if not st or not st.currentEventId then
		return
	end
	titleFrame.Visible = false
	endingFrame.Visible = false
	gameFrame.Visible = true

	for _, meta in ipairs(STAT_META) do
		local bar = statBars[meta.key]
		bar.fill.Size = UDim2.new(st.stats[meta.key] / 100, 0, 1, 0)
		local delta = st.lastEffects and st.lastEffects[meta.key]
		if delta then
			bar.delta.Text = string.format("%s%d", if delta > 0 then "+" else "", delta)
			bar.delta.TextColor3 = if delta > 0 then C.trust else C.risk
		else
			bar.delta.Text = ""
		end
	end

	local event = Content.cards[st.currentEventId]
	cardBadges.Text = `{event.year} · {event.scene} · 第{event.act}幕 {st.mainIndex}/{#Content.mainline}`
	if st.toast then
		toastLabel.Text = `“{st.toast}”`
		toastLabel.Visible = true
	else
		toastLabel.Visible = false
	end
	local reactions = Engine.reactionsFor(st.lastEffects)
	if #reactions > 0 then
		reactionsLabel.Text = table.concat(reactions, "　")
		reactionsLabel.Visible = true
	else
		reactionsLabel.Visible = false
	end
	cardTitle.Text = event.title
	cardText.Text = event.text

	-- 立绘
	for _, child in ipairs(cardSpriteHolder:GetChildren()) do
		child:Destroy()
	end
	local sprite = spriteLabel(event.sprite, 90)
	if sprite then
		sprite.Parent = cardSpriteHolder
		sprite.Position = UDim2.new(0.5, -45, 0, 4)
	end

	-- 选项
	for _, child in ipairs(choicesFolder:GetChildren()) do
		child:Destroy()
	end
	for i, choice in ipairs(event.choices) do
		local btn = mkButton(choicesFolder, choice.text, 14, function()
			chooseIndex(i)
		end, { bg = C.blue, size = UDim2.new(1, 0, 0, 44) })
		btn.LayoutOrder = i
	end

	-- 时光机
	local canUndo = st.undoLeft > 0 and #st.history > 0
	undoBtn.Text = `↩ 时光机（剩 {st.undoLeft} 次）`
	undoBtn.Active = canUndo
	undoBtn.AutoButtonColor = canUndo
	undoBtn.TextColor3 = if canUndo then C.dim else C.lock

	gameScroll.CanvasPosition = Vector2.new(0, 0)
end

local function renderEnding()
	local st = store.state
	if not st then
		return
	end
	titleFrame.Visible = false
	gameFrame.Visible = false
	endingFrame.Visible = true
	local ending = Content.endings[st.endingId or "forgotten"] or Content.endings.forgotten
	endingSub.Text = ending.subtitle
	endingTitle.Text = ending.title
	endingText.Text = ending.text
	endingNew.Visible = store.lastEndingNew
	endingPanel.UIStroke.Color = if ending.isWin then C.gold else C.ink

	for _, child in ipairs(endingSpriteHolder:GetChildren()) do
		child:Destroy()
	end
	local sprite = spriteLabel(ENDING_SPRITE[ending.id] or "smug", 112)
	if sprite then
		sprite.Parent = endingSpriteHolder
		sprite.Position = UDim2.new(0.5, -56, 0, 6)
	end

	local scenes = {}
	for _, f in ipairs(st.flags) do
		local label = Content.flagLabels[f]
		if label then
			table.insert(scenes, `· {label}`)
		end
	end
	if #scenes > 0 then
		endingScenes.Text = `本局名场面（{#scenes}）\n` .. table.concat(scenes, "\n")
		endingScenes.Visible = true
	else
		endingScenes.Visible = false
	end
	local statStr = {}
	for _, meta in ipairs(STAT_META) do
		table.insert(statStr, `{meta.label} {st.stats[meta.key]}`)
	end
	endingStats.Text = table.concat(statStr, "   ")
end

local function render()
	local screen = getStore().screen
	if screen == "title" then
		renderTitle()
	elseif screen == "game" and getStore().state and getStore().state.currentEventId then
		renderGame()
	else
		renderEnding()
	end
end

subscribe(render)
render()

-- 异步加载云端存档与图鉴，完成后刷新标题页
task.spawn(function()
	local ok, payload = pcall(function()
		return SaveAPI:InvokeServer("load", player.UserId)
	end)
	if ok and payload then
		gallery = payload.gallery or {}
		if payload.save and payload.save.currentEventId and not payload.save.endingId then
			store.savedGame = payload.save
		end
	end
	render()
end

local okBoot, bootErr = pcall(boot)
if not okBoot then
	showFatal("启动异常 Startup Error", bootErr)
end

pcall(function()
	game:GetService("LogService").MessageOut:Connect(function(message, messageType)
		if messageType == Enum.MessageType.MessageError then
			showFatal("运行时错误 Runtime Error", message)
		end
	end)
end)
