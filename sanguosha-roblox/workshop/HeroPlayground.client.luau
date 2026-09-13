local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("HeroPlaygroundRemote") :: RemoteFunction

local catalog = {}
local currentHeroId = "guan_yu"
local radius = 12
local selectedFaction = "all"
local listExpanded = not UserInputService.TouchEnabled

local FACTION_LABELS = {
	all = "全部",
	wei = "魏",
	shu = "蜀",
	wu = "吴",
	qun = "群",
}

local function invokeServer(action: string, payload)
	local ok, result = pcall(function()
		return remote:InvokeServer(action, payload)
	end)
	if not ok then
		return { ok = false, error = "remote-error" }
	end
	return result
end

local function syncCamera()
	local character = player.Character
	if not character then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		local camera = Workspace.CurrentCamera
		camera.CameraType = Enum.CameraType.Custom
		camera.CameraSubject = humanoid
		player.CameraMinZoomDistance = 7
		player.CameraMaxZoomDistance = 18
	end
end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HeroPlaygroundGui"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = false
screenGui.Parent = player:WaitForChild("PlayerGui")

local panel = Instance.new("Frame")
panel.Name = "HeroPanel"
panel.AnchorPoint = Vector2.new(0, 0.5)
panel.Position = UDim2.fromOffset(16, 260)
panel.Size = UDim2.fromOffset(260, 420)
panel.BackgroundColor3 = Color3.fromRGB(24, 26, 30)
panel.BackgroundTransparency = 0.08
panel.BorderSizePixel = 0
panel.Parent = screenGui

local title = Instance.new("TextLabel")
title.Name = "Title"
title.Position = UDim2.fromOffset(14, 10)
title.Size = UDim2.new(1, -28, 0, 34)
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBold
title.TextSize = 20
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(245, 230, 194)
title.Text = "武将试演场"
title.Parent = panel

local toggleList = Instance.new("TextButton")
toggleList.Name = "ToggleList"
toggleList.AnchorPoint = Vector2.new(1, 0)
toggleList.Position = UDim2.new(1, -10, 0, 12)
toggleList.Size = UDim2.fromOffset(34, 28)
toggleList.BackgroundColor3 = Color3.fromRGB(57, 70, 92)
toggleList.BorderSizePixel = 0
toggleList.Font = Enum.Font.GothamBold
toggleList.TextSize = 15
toggleList.TextColor3 = Color3.fromRGB(252, 246, 232)
toggleList.Text = if listExpanded then "−" else "+"
toggleList.Parent = panel

local status = Instance.new("TextLabel")
status.Name = "Status"
status.Position = UDim2.fromOffset(14, 42)
status.Size = UDim2.new(1, -28, 0, 44)
status.BackgroundTransparency = 1
status.Font = Enum.Font.Gotham
status.TextSize = 13
status.TextWrapped = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.TextColor3 = Color3.fromRGB(205, 210, 216)
status.Text = "WASD 移动，F 攻击，Q 闪避，活动半径 12"
status.Parent = panel

local filterBar = Instance.new("Frame")
filterBar.Name = "FactionFilters"
filterBar.Position = UDim2.fromOffset(12, 92)
filterBar.Size = UDim2.new(1, -24, 0, 34)
filterBar.BackgroundTransparency = 1
filterBar.Parent = panel

local filterLayout = Instance.new("UIListLayout")
filterLayout.FillDirection = Enum.FillDirection.Horizontal
filterLayout.SortOrder = Enum.SortOrder.LayoutOrder
filterLayout.Padding = UDim.new(0, 5)
filterLayout.Parent = filterBar

local list = Instance.new("ScrollingFrame")
list.Name = "HeroList"
list.Position = UDim2.fromOffset(12, 134)
list.Size = UDim2.new(1, -24, 1, -146)
list.BackgroundColor3 = Color3.fromRGB(16, 18, 22)
list.BackgroundTransparency = 0.15
list.BorderSizePixel = 0
list.ScrollBarThickness = 5
list.CanvasSize = UDim2.fromOffset(0, 0)
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.Parent = panel

local listLayout = Instance.new("UIListLayout")
listLayout.SortOrder = Enum.SortOrder.LayoutOrder
listLayout.Padding = UDim.new(0, 6)
listLayout.Parent = list

local controls = Instance.new("Frame")
controls.Name = "ActionControls"
controls.AnchorPoint = Vector2.new(1, 1)
controls.Position = UDim2.new(1, -18, 1, -18)
controls.Size = UDim2.fromOffset(260, 88)
controls.BackgroundTransparency = 1
controls.Parent = screenGui

local controlsLayout = Instance.new("UIListLayout")
controlsLayout.FillDirection = Enum.FillDirection.Horizontal
controlsLayout.SortOrder = Enum.SortOrder.LayoutOrder
controlsLayout.Padding = UDim.new(0, 10)
controlsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
controlsLayout.Parent = controls

local bindable = Instance.new("BindableFunction")
bindable.Name = "HeroPlaygroundClientAction"
bindable.Parent = screenGui

local function makeButton(parent: Instance, text: string, size: UDim2, callback)
	local button = Instance.new("TextButton")
	button.Size = size
	button.BackgroundColor3 = Color3.fromRGB(57, 70, 92)
	button.BorderSizePixel = 0
	button.Font = Enum.Font.GothamBold
	button.TextSize = 15
	button.TextColor3 = Color3.fromRGB(252, 246, 232)
	button.Text = text
	button.AutoButtonColor = true
	button.Parent = parent
	button.Activated:Connect(callback)
	return button
end

local function setStatus(text: string)
	status.Text = text
end

local renderList

local function applyPanelState()
	toggleList.Text = if listExpanded then "−" else "+"
	filterBar.Visible = listExpanded
	list.Visible = listExpanded
	if UserInputService.TouchEnabled then
		panel.Size = if listExpanded then UDim2.fromOffset(230, 350) else UDim2.fromOffset(210, 94)
	else
		panel.Size = if listExpanded then UDim2.fromOffset(260, 420) else UDim2.fromOffset(240, 94)
	end
end

toggleList.Activated:Connect(function()
	listExpanded = not listExpanded
	applyPanelState()
end)

local function requestAction(request)
	local action = typeof(request) == "table" and request.action or request
	local payload = typeof(request) == "table" and request.payload or nil
	if action == "SwitchHero" and request and request.heroId then
		payload = { heroId = request.heroId }
	end
	local result = invokeServer(action, payload)
	if result and result.ok then
		if result.heroId then
			currentHeroId = result.heroId
		end
		if renderList then
			renderList()
		end
		setStatus(`当前：{currentHeroId} · 半径 {radius} · {action}`)
	else
		setStatus(`操作未生效：{result and result.error or "unknown"}`)
	end
	return result
end

bindable.OnInvoke = function(request)
	return requestAction(request)
end

local function clearList()
	for _, child in ipairs(list:GetChildren()) do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
end

function renderList()
	clearList()
	for index, hero in ipairs(catalog) do
		if selectedFaction == "all" or hero.faction == selectedFaction then
			local available = hero.available == true
			local label = `{hero.name}  {FACTION_LABELS[hero.faction] or hero.faction or "-"}`
			local button = makeButton(list, label, UDim2.new(1, -8, 0, 38), function()
				if available then
					requestAction({ action = "SwitchHero", heroId = hero.id })
				else
					setStatus(`{hero.name} 的 3D 模板还没导入`)
				end
			end)
			button.LayoutOrder = index
			button.TextXAlignment = Enum.TextXAlignment.Left
			button.Text = if available then label else `{label}  · 待生成`
			button.BackgroundColor3 = if hero.id == currentHeroId then Color3.fromRGB(121, 75, 44) elseif available then Color3.fromRGB(44, 52, 68) else Color3.fromRGB(35, 36, 40)
			button.TextColor3 = if available then Color3.fromRGB(248, 239, 220) else Color3.fromRGB(132, 138, 148)
		end
	end
end

local function renderFilters()
	for _, child in ipairs(filterBar:GetChildren()) do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
	for order, faction in ipairs({ "all", "wei", "shu", "wu", "qun" }) do
		local button = makeButton(filterBar, FACTION_LABELS[faction], UDim2.fromOffset(44, 30), function()
			selectedFaction = faction
			renderFilters()
			renderList()
		end)
		button.LayoutOrder = order
		button.TextSize = 13
		button.BackgroundColor3 = if selectedFaction == faction then Color3.fromRGB(132, 78, 42) else Color3.fromRGB(44, 48, 58)
	end
end

makeButton(controls, "攻击 F", UDim2.fromOffset(80, 58), function()
	requestAction("Attack")
end)
makeButton(controls, "闪避 Q", UDim2.fromOffset(80, 58), function()
	requestAction("Dodge")
end)
makeButton(controls, "换将 R", UDim2.fromOffset(80, 58), function()
	requestAction("SwitchHero")
end)

ContextActionService:BindAction("HeroPlaygroundAttack", function(_, state)
	if state == Enum.UserInputState.Begin then
		requestAction("Attack")
	end
	return Enum.ContextActionResult.Sink
end, false, Enum.KeyCode.F)

ContextActionService:BindAction("HeroPlaygroundDodge", function(_, state)
	if state == Enum.UserInputState.Begin then
		requestAction("Dodge")
	end
	return Enum.ContextActionResult.Sink
end, false, Enum.KeyCode.Q)

ContextActionService:BindAction("HeroPlaygroundSwitch", function(_, state)
	if state == Enum.UserInputState.Begin then
		requestAction("SwitchHero")
	end
	return Enum.ContextActionResult.Sink
end, false, Enum.KeyCode.R)

local function refreshState()
	local state = invokeServer("GetState")
	if state and state.ok then
		currentHeroId = state.heroId
		radius = state.radius
		catalog = state.catalog or catalog
		renderFilters()
		renderList()
		setStatus(`WASD 移动，F 攻击，Q 闪避，R 换将，半径 {radius}`)
	end
end

player.CharacterAdded:Connect(function()
	task.wait(0.1)
	syncCamera()
	refreshState()
end)

if UserInputService.TouchEnabled then
	panel.Position = UDim2.fromOffset(10, 220)
	controls.Size = UDim2.fromOffset(250, 78)
end

applyPanelState()
refreshState()
syncCamera()
