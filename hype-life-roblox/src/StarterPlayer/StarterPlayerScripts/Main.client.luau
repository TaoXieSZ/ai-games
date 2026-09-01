--!strict
-- 热搜人生 · Roblox 客户端：RPG 风格 HUD + 3D 场景演出。
-- 布局：左上角色状态栏 / 顶中场景名 / 右上时光机 / 底部 RPG 对话框（头像+打字机+三选项）。
-- 3D 世界为主画面：程序化摄影棚 + 运镜 + 角色传送由 Director 负责。
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local AssetService = game:GetService("AssetService")

-- 注意：Roblox 有个全局 Content 数据类型（fromObject 等 API），
-- 必须在内容模块变量遮蔽它之前捕获，否则像素立绘会调用到 nil。
local RobloxContent = Content
local GameContent = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("Content"))
local Engine = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("Engine"))
local SceneSpecs = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("SceneSpecs"))
local Director = require(script.Parent:WaitForChild("Director"))
local SaveAPI = ReplicatedStorage:WaitForChild("SaveAPI", 10) -- 未发布地形下服务端可能未创建

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local C = {
	bg = Color3.fromRGB(14, 14, 20),
	panel = Color3.fromRGB(24, 26, 34),
	ink = Color3.fromRGB(240, 240, 244),
	dim = Color3.fromRGB(168, 176, 190),
	gold = Color3.fromRGB(255, 204, 110),
	hot = Color3.fromRGB(255, 122, 89),
	trust = Color3.fromRGB(96, 220, 232),
	cash = Color3.fromRGB(255, 204, 110),
	risk = Color3.fromRGB(235, 87, 87),
	blue = Color3.fromRGB(70, 130, 240),
	line = Color3.fromRGB(70, 76, 92),
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
local store: any = { screen = "title", state = nil, lastEndingNew = false, savedGame = nil }
local lastActShown: number? = nil
local lastTypedId: string? = nil
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

-- ── 存档（服务端 DataStore；不可用时自动降级） ─────────

local function pushSave()
	if not SaveAPI then
		return
	end
	task.spawn(function()
		pcall(function()
			SaveAPI:InvokeServer("save", {
				save = store.state,
				gallery = gallery,
			})
		end)
	end)
end

local function recordEnding(id: string): boolean
	if table.find(gallery, id) then
		return false
	end
	table.insert(gallery, id)
	pushSave()
	return true
end

-- 特效函数前置声明（实现在特效层）
local flash: (Color3) -> () = function() end
local shake: (number) -> () = function() end

-- ── 动作 ─────────────────────────────────────────────

local function chooseIndex(i: number)
	local st = store.state
	if not st or not st.currentEventId then
		return
	end
	local event = GameContent.cards[st.currentEventId]
	local choice = event.choices[i]
	if not choice then
		return
	end
	local next = Engine.choose(st, choice)
	local lastEndingNew = store.lastEndingNew
	if next.endingId then
		next.endingId = Engine.resolveEnding(next.endingId, next.flags)
		lastEndingNew = recordEnding(next.endingId)
	end
	set({ state = next, lastEndingNew = lastEndingNew })
	pushSave()
	-- 反馈：正负闪色 + 大事件震屏
	local sum, biggest = 0, 0
	for _, d in pairs(choice.effects or {}) do
		sum += d
		if math.abs(d) > biggest then
			biggest = math.abs(d)
		end
	end
	flash(if sum >= 0 then Color3.fromRGB(140, 255, 170) else Color3.fromRGB(255, 96, 96))
	if biggest >= 10 then
		shake(0.8)
	end
end

local function undoGame()
	if not store.state then
		return
	end
	set({ state = Engine.undo(store.state) })
	pushSave()
end

local function startNew()
	lastActShown = nil
	lastTypedId = nil
	set({ screen = "game", state = Engine.createInitialState(), lastEndingNew = false })
	pushSave()
end

local function continueGame()
	lastActShown = nil
	lastTypedId = nil
	if store.savedGame then
		set({ screen = "game", state = store.savedGame, lastEndingNew = false })
	else
		startNew()
	end
end

local function toTitle()
	set({ screen = "title" })
end

-- ── UI 工具 ──────────────────────────────────────────

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

local function mkLabel(parent, props): TextLabel
	local base = {
		BackgroundTransparency = 1,
		Font = Enum.Font.Arimo,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
	}
	for k, v in pairs(props) do
		base[k] = v
	end
	return mk("TextLabel", base, parent) :: TextLabel
end

local function mkButton(parent, text: string, onClick, props): TextButton
	local btn = mk("TextButton", {
		Text = text,
		TextSize = props.textSize or 15,
		TextColor3 = props.color or C.ink,
		BackgroundColor3 = props.bg or C.blue,
		Font = Enum.Font.ArimoBold,
		TextWrapped = true,
		Size = props.size or UDim2.new(1, 0, 0, 42),
		AutoButtonColor = true,
	}, parent)
	mk("UICorner", { CornerRadius = UDim.new(0, 8) }, btn)
	if props.border then
		mk("UIStroke", { Color = props.border, Thickness = 2 }, btn)
	end
	btn.Activated:Connect(onClick)
	return btn
end

-- 像素立绘（EditableImage 运行时写入；API 不可用时优雅隐藏）
local spriteCache: { [string]: ImageLabel? } = {}

local function spriteImage(key: string, pxSize: number): Content?
	local matrix = GameContent.sprites[key]
	local label: ImageLabel? = nil
	local okBuild = pcall(function()
		local size = #matrix
		local image = AssetService:CreateEditableImage({ Size = Vector2.new(size, size) })
		local buf = buffer.create(size * size * 4)
		for r = 1, size do
			local row = matrix[r]
			for c = 1, size do
				local hex = GameContent.palette[row:sub(c, c)]
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
		label = Instance.new("ImageLabel")
		label.BackgroundTransparency = 1
		label.ImageContent = RobloxContent.fromObject(image)
		label.ResampleMode = Enum.ResamplerMode.Pixelated
		label.Size = UDim2.fromOffset(pxSize, pxSize)
	end)
	spriteCache[key] = label
	if label then
		return label:Clone().ImageContent
	end
	return nil
end

-- ── HUD：左上角色状态栏 ──────────────────────────────

local hudRoot = mk("Frame", {
	Name = "HUD",
	Size = UDim2.new(1, 0, 1, 0),
	BackgroundTransparency = 1,
	Visible = false,
})

local statsPanel = mk("Frame", {
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.new(0, 12, 1, -12),
	Size = UDim2.fromOffset(228, 150),
	BackgroundColor3 = C.panel,
	BackgroundTransparency = 0.3,
}, hudRoot)
mk("UICorner", { CornerRadius = UDim.new(0, 10) }, statsPanel)
mk("UIStroke", { Color = C.line, Thickness = 1, Transparency = 0.4 }, statsPanel)
mkLabel(statsPanel, { Text = "孙晨宇", TextSize = 16, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 10, 0, 6) })
local statRows = {}
for i, meta in ipairs(STAT_META) do
	local row = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 10, 0, 32 + (i - 1) * 27) }, statsPanel)
	mkLabel(row, { Text = meta.label, TextSize = 13, TextColor3 = C.dim, Size = UDim2.fromOffset(34, 16) })
	local track = mk("Frame", { BackgroundColor3 = Color3.fromRGB(0, 0, 0), BackgroundTransparency = 0.45, Size = UDim2.new(1, -78, 0, 8), Position = UDim2.new(0, 38, 0, 5) }, row)
	mk("UICorner", { CornerRadius = UDim.new(0, 4) }, track)
	local fill = mk("Frame", { BackgroundColor3 = meta.color, Size = UDim2.fromScale(0.3, 1) }, track)
	mk("UICorner", { CornerRadius = UDim.new(0, 4) }, fill)
	local delta = mkLabel(row, { Text = "", TextSize = 12, Size = UDim2.fromOffset(40, 16), Position = UDim2.new(1, -42, 0, 0), TextXAlignment = Enum.TextXAlignment.Right })
	statRows[meta.key] = { fill = fill, delta = delta }
end

-- ── HUD：顶中场景名 + 右上时光机 ─────────────────────

local sceneLabel = mkLabel(hudRoot, {
	Text = "",
	TextSize = 15,
	TextColor3 = C.gold,
	Font = Enum.Font.ArimoBold,
	Size = UDim2.new(0, 460, 0, 22),
	Position = UDim2.new(0.5, -230, 0, 12),
	TextXAlignment = Enum.TextXAlignment.Center,
})
local undoBtn = mkButton(hudRoot, "↩ 时光机 ×3", function()
	undoGame()
end, { bg = C.panel, bgT = 0.25, border = C.line, size = UDim2.fromOffset(120, 32), color = C.dim })
undoBtn.Position = UDim2.new(1, -132, 0, 12)

-- ── 底部 RPG 对话框 ──────────────────────────────────

local dialog = mk("Frame", {
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -14),
	Size = UDim2.fromOffset(660, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundColor3 = C.panel,
	BackgroundTransparency = 0.18,
}, hudRoot)
mk("UICorner", { CornerRadius = UDim.new(0, 12) }, dialog)
mk("UIStroke", { Color = C.line, Thickness = 1, Transparency = 0.3 }, dialog)
mk("UIPadding", {
	PaddingTop = UDim.new(0, 14), PaddingBottom = UDim.new(0, 14),
	PaddingLeft = UDim.new(0, 16), PaddingRight = UDim.new(0, 16),
}, dialog)
mk("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, dialog)

local dlgTop = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 24), LayoutOrder = 1 }, dialog)
local sceneBadge = mkLabel(dlgTop, { Text = "", TextSize = 12, TextColor3 = C.dim, Size = UDim2.new(1, -100, 1, 0) })
local toastLabel = mkLabel(dlgTop, { Text = "", TextSize = 12, TextColor3 = C.cash, Size = UDim2.new(1, -100, 1, 0), Position = UDim2.new(0, 100, 0, 0), TextXAlignment = Enum.TextXAlignment.Right, Visible = false })

local dlgBody = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 96), LayoutOrder = 2 }, dialog)
local portraitHolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.fromOffset(92, 92) }, dlgBody)
local cardTitle = mkLabel(dlgBody, { Text = "", TextSize = 22, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, Size = UDim2.new(1, -104, 0, 30), Position = UDim2.new(0, 104, 0, 0) })
local reactionsLabel = mkLabel(dlgBody, { Text = "", TextSize = 13, TextColor3 = C.trust, Size = UDim2.new(1, -104, 0, 20), Position = UDim2.new(0, 104, 0, 34), Visible = false })
local cardText = mkLabel(dlgBody, { Text = "", TextSize = 15, TextColor3 = C.ink, TextWrapped = true, Size = UDim2.new(1, -104, 0, 56), Position = UDim2.new(0, 104, 0, 38), AutomaticSize = Enum.AutomaticSize.Y })

local choicesFolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 3 }, dialog)
mk("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, choicesFolder)

-- ── 标题页 ───────────────────────────────────────────

local titleFrame = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = C.bg, Visible = true })
mkLabel(titleFrame, { Text = "热搜人生", TextSize = 52, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, Size = UDim2.new(1, 0, 0, 70), Position = UDim2.new(0, 0, 0, 120), TextXAlignment = Enum.TextXAlignment.Center })
mkLabel(titleFrame, { Text = "HYPE LIFE · 流量炼金术士模拟器", TextSize = 14, TextColor3 = C.dim, Size = UDim2.new(1, 0, 0, 22), Position = UDim2.new(0, 0, 0, 196), TextXAlignment = Enum.TextXAlignment.Center })
mkLabel(titleFrame, { Text = "从三本线到纳斯达克。你有四条命：热度、信用、资金、风险——任何一条归零，人生杀青。", TextSize = 14, TextColor3 = C.ink, TextWrapped = true, Size = UDim2.new(1, -80, 0, 44), Position = UDim2.new(0, 40, 0, 236), TextXAlignment = Enum.TextXAlignment.Center })
local titleButtons = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(0, 260, 0, 100), Position = UDim2.new(0.5, -130, 0, 300) }, titleFrame)
mk("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, titleButtons)
local galleryLabel = mkLabel(titleFrame, { Text = "结局图鉴 0/12", TextSize = 13, TextColor3 = C.dim, Size = UDim2.new(1, 0, 0, 22), Position = UDim2.new(0, 0, 0, 420), TextXAlignment = Enum.TextXAlignment.Center })
local galleryGrid = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(0, 560, 0, 108), Position = UDim2.new(0.5, -280, 0, 446) }, titleFrame)
mk("UIGridLayout", { CellSize = UDim2.new(0.25, -6, 0, 30), CellPadding = UDim2.new(0, 6, 0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, galleryGrid)
mkLabel(titleFrame, { Text = "GitHub: TaoXieSZ/ai-games", TextSize = 12, TextColor3 = C.dim, Size = UDim2.new(1, 0, 0, 18), Position = UDim2.new(0, 0, 0, 566), TextXAlignment = Enum.TextXAlignment.Center })
mkLabel(titleFrame, { Text = "本游戏纯属虚构讽刺作品，人物与事件均为艺术加工，请勿对号入座。", TextSize = 11, TextColor3 = C.dim, TextWrapped = true, Size = UDim2.new(1, -80, 0, 30), Position = UDim2.new(0, 40, 0, 586), TextXAlignment = Enum.TextXAlignment.Center })

-- ── 结局页 ───────────────────────────────────────────

local endingFrame = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(10, 10, 14), BackgroundTransparency = 0.06, Visible = false })
local endingPanel = mk("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.new(0, 620, 0, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundColor3 = C.panel,
	BackgroundTransparency = 0.1,
}, endingFrame)
mk("UICorner", { CornerRadius = UDim.new(0, 12) }, endingPanel)
mk("UIStroke", { Color = C.gold, Thickness = 2 }, endingPanel)
mk("UIPadding", {
	PaddingTop = UDim.new(0, 18), PaddingBottom = UDim.new(0, 18),
	PaddingLeft = UDim.new(0, 20), PaddingRight = UDim.new(0, 20),
}, endingPanel)
mk("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, endingPanel)
local endingSub = mkLabel(endingPanel, { Text = "", TextSize = 13, TextColor3 = C.dim, Size = UDim2.new(1, 0, 0, 18), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 1 })
local endingTitle = mkLabel(endingPanel, { Text = "", TextSize = 34, TextColor3 = C.gold, Font = Enum.Font.ArimoBold, Size = UDim2.new(1, 0, 0, 46), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 2 })
local endingPortraitHolder = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 100), LayoutOrder = 3 }, endingPanel)
local endingText = mkLabel(endingPanel, { Text = "", TextSize = 15, TextColor3 = C.ink, TextWrapped = true, Size = UDim2.new(1, 0, 0, 70), AutomaticSize = Enum.AutomaticSize.Y, LayoutOrder = 4 })
local endingNew = mkLabel(endingPanel, { Text = "★ 新结局收录！图鉴已更新", TextSize = 14, TextColor3 = C.gold, Size = UDim2.new(1, 0, 0, 22), TextXAlignment = Enum.TextXAlignment.Center, Visible = false, LayoutOrder = 5 })
local endingScenes = mkLabel(endingPanel, { Text = "", TextSize = 13, TextColor3 = C.ink, TextWrapped = true, BackgroundColor3 = C.bg, BackgroundTransparency = 0.4, Size = UDim2.new(1, 0, 0, 60), AutomaticSize = Enum.AutomaticSize.Y, Visible = false, LayoutOrder = 6 })
local endingStats = mkLabel(endingPanel, { Text = "", TextSize = 13, TextColor3 = C.cash, Size = UDim2.new(1, 0, 0, 22), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 7 })
local endingButtons = mk("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 96), LayoutOrder = 8 }, endingPanel)
mk("UIListLayout", { Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder }, endingButtons)
mkButton(endingButtons, "再活一次", startNew, { bg = C.gold, color = C.bg })
mkButton(endingButtons, "回到标题", toTitle, { bg = C.blue })
mkLabel(endingPanel, { Text = "本游戏纯属虚构讽刺作品，人物与事件均为艺术加工。", TextSize = 11, TextColor3 = C.dim, Size = UDim2.new(1, 0, 0, 18), TextXAlignment = Enum.TextXAlignment.Center, LayoutOrder = 9 })

-- ── 特效层 ───────────────────────────────────────────

local flashFrame = mk("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 50 })
local actLabel = mkLabel(flashFrame, {
	Text = "",
	TextSize = 40,
	TextColor3 = C.gold,
	Font = Enum.Font.ArimoBold,
	BackgroundTransparency = 1,
	Size = UDim2.new(1, 0, 0, 60),
	Position = UDim2.new(0, 0, 0.38, 0),
	TextXAlignment = Enum.TextXAlignment.Center,
	Visible = false,
	ZIndex = 51,
}, flashFrame)

local actToken = 0
local function showActCard(act: number)
	actToken += 1
	local token = actToken
	actLabel.Text = SceneSpecs.ACT_NAMES[act] or (`第{act}幕`)
	actLabel.Visible = true
	actLabel.TextTransparency = 1
	TweenService:Create(actLabel, TweenInfo.new(0.4), { TextTransparency = 0 }):Play()
	task.delay(1.6, function()
		if token ~= actToken then
			return
		end
		local out = TweenService:Create(actLabel, TweenInfo.new(0.5), { TextTransparency = 1 })
		out:Play()
		out.Completed:Once(function()
			if token == actToken then
				actLabel.Visible = false
			end
		end)
	end)
end

flash = function(color: Color3)
	flashFrame.BackgroundColor3 = color
	flashFrame.BackgroundTransparency = 0.55
	TweenService:Create(flashFrame, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
end

shake = function(intensity: number)
	local orig = workspace.CurrentCamera.CFrame
	task.spawn(function()
		for _ = 1, 8 do
			workspace.CurrentCamera.CFrame = orig
				* CFrame.new(
					(math.random() - 0.5) * intensity,
					(math.random() - 0.5) * intensity,
					0
				)
			task.wait(0.03)
		end
		workspace.CurrentCamera.CFrame = orig
	end)
end

-- ── 渲染 ─────────────────────────────────────────────

local function renderTitle()
	titleFrame.Visible = true
	hudRoot.Visible = false
	endingFrame.Visible = false
	local count = 0
	for _, child in ipairs(galleryGrid:GetChildren()) do
		child:Destroy()
	end
	local ordered = {}
	for id in pairs(GameContent.endings) do
		table.insert(ordered, id)
	end
	table.sort(ordered)
	for _, id in ipairs(ordered) do
		local got = table.find(gallery, id) ~= nil
		local item = mkLabel(galleryGrid, {
			Text = if got then GameContent.endings[id].title else "？？？",
			TextSize = 10,
			TextColor3 = if got then C.gold else C.lock,
			BackgroundColor3 = if got then C.panel else C.bg,
			BackgroundTransparency = if got then 0 else 0.3,
			Size = UDim2.new(1, 0, 1, 0),
			TextXAlignment = Enum.TextXAlignment.Center,
			TextYAlignment = Enum.TextYAlignment.Center,
		})
		mk("UIStroke", { Color = if got then C.gold else C.lock, Thickness = 1 }, item)
		if got then
			count += 1
		end
	end
	galleryLabel.Text = `结局图鉴 {count}/{#ordered}`
	for _, child in ipairs(titleButtons:GetChildren()) do
		child:Destroy()
	end
	local hasSave = store.savedGame ~= nil
	if hasSave then
		mkButton(titleButtons, "继续上辈子", continueGame, { bg = C.gold, color = C.bg })
	end
	mkButton(titleButtons, if hasSave then "重新投胎" else "开始人生", startNew, { bg = C.blue })
end

local function renderGame()
	local st = store.state
	if not st or not st.currentEventId then
		return
	end
	titleFrame.Visible = false
	endingFrame.Visible = false
	hudRoot.Visible = true

	for _, meta in ipairs(STAT_META) do
		local row = statRows[meta.key]
		TweenService:Create(row.fill, TweenInfo.new(0.35), { Size = UDim2.new(st.stats[meta.key] / 100, 0, 1, 0) }):Play()
		local delta = st.lastEffects and st.lastEffects[meta.key]
		if delta then
			row.delta.Text = string.format("%s%d", if delta > 0 then "+" else "", delta)
			row.delta.TextColor3 = if delta > 0 then C.trust else C.risk
		else
			row.delta.Text = ""
		end
	end

	local event = GameContent.cards[st.currentEventId]
	if not event then
		-- 存档里的卡牌在内容更新后已不存在：回到主线第一张自愈
		st.currentEventId = GameContent.mainline[1]
		st.queue = {}
		st.history = {}
		event = GameContent.cards[st.currentEventId]
	end
	sceneLabel.Text = `{event.scene} · {SceneSpecs.ACT_NAMES[event.act] or ""}`

	local undoLeft = st.undoLeft
	undoBtn.Text = `↩ 时光机 ×{undoLeft}`
	undoBtn.AutoButtonColor = st.undoLeft > 0 and #st.history > 0
	undoBtn.TextColor3 = if st.undoLeft > 0 and #st.history > 0 then C.ink else C.dim

	if st.toast then
		toastLabel.Text = `“{st.toast}”`
		toastLabel.Visible = true
	else
		toastLabel.Visible = false
	end

	-- 场景联动（Director 内部等待复制完成）
	local sceneArch = SceneSpecs.sceneFor(event.scene)
	if sceneArch ~= Director.currentSceneName then
		task.spawn(function()
			Director.showScene(sceneArch)
		end)
	end

	-- 幕间标题卡
	if lastActShown ~= event.act then
		lastActShown = event.act
		showActCard(event.act)
	end

	-- 头像立绘（表情随事件变化）
	local spriteContent = spriteImage(event.sprite, 88)
	if spriteContent then
		portrait.ImageContent = spriteContent
	end

	-- 打字机
	if lastTypedId ~= event.id then
		lastTypedId = event.id
		local total = utf8.len(event.text) or #event.text
		cardText.Text = event.text
		cardText.MaxVisibleGraphemes = 0
		local myToken = lastTypedId
		task.spawn(function()
			for i = 1, total do
				if lastTypedId ~= myToken then
					return
				end
				cardText.MaxVisibleGraphemes = i
				task.wait(0.02)
			end
		end)
	end

	-- 选项重建
	for _, child in ipairs(choicesFolder:GetChildren()) do
		child:Destroy()
	end
	for i, choice in ipairs(event.choices) do
		local btn = mkButton(choicesFolder, choice.text, function()
			chooseIndex(i)
		end, { bg = C.blue, size = UDim2.new(1, 0, 0, 40), textSize = 14 })
		btn.LayoutOrder = i
	end
end

local function renderEnding()
	local st = store.state
	if not st then
		return
	end
	titleFrame.Visible = false
	hudRoot.Visible = false
	endingFrame.Visible = true
	local ending = GameContent.endings[st.endingId or "forgotten"] or GameContent.endings.forgotten
	endingSub.Text = ending.subtitle
	endingTitle.Text = ending.title
	endingText.Text = ending.text
	endingNew.Visible = store.lastEndingNew
	endingPanel.UIStroke.Color = if ending.isWin then C.gold else C.line

	for _, child in ipairs(endingPortraitHolder:GetChildren()) do
		child:Destroy()
	end
	local spriteContent = spriteImage(ENDING_SPRITE[ending.id] or "smug", 96)
	if spriteContent then
		local img = mk("ImageLabel", {
			BackgroundTransparency = 1,
			ImageContent = spriteContent,
			ResampleMode = Enum.ResamplerMode.Pixelated,
			Size = UDim2.fromOffset(96, 96),
			Position = UDim2.new(0.5, -48, 0, 2),
		}, endingPortraitHolder)
	end

	local scenes = {}
	for _, f in ipairs(st.flags) do
		local label = GameContent.flagLabels[f]
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

local renderedScreen: string? = nil

local function render()
	local screen = getStore().screen
	if renderedScreen ~= screen then
		lastActShown = nil
		lastTypedId = nil
		renderedScreen = screen
	end
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

-- 调试钩子（自动化验证用）
_G.__hype = {
	startNew = startNew,
	continueGame = continueGame,
	chooseIndex = chooseIndex,
	undoGame = undoGame,
	getStore = getStore,
}

-- 云端存档与图鉴加载（异步，完成后刷新）
task.spawn(function()
	if not SaveAPI then
		return
	end
	local ok, payload = pcall(function()
		return SaveAPI:InvokeServer("load", player.UserId)
	end)
	if ok and payload then
		gallery = payload.gallery or {}
		local sv = payload.save
		if sv and sv.currentEventId and GameContent.cards[sv.currentEventId] and not sv.endingId then
			store.savedGame = sv
		elseif sv then
			gallery = payload.gallery or gallery
		end
	end
	render()
end)
