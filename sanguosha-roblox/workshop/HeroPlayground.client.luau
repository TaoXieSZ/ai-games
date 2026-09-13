local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("HeroPlaygroundRemote") :: RemoteFunction
local effectsRemote = ReplicatedStorage:WaitForChild("HeroPlaygroundEffects") :: RemoteEvent

local catalog = {}
local effectCatalog = {}
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

local effectsFolder = Workspace:FindFirstChild("HeroPlaygroundClientEffects")
if not effectsFolder then
	effectsFolder = Instance.new("Folder")
	effectsFolder.Name = "HeroPlaygroundClientEffects"
	effectsFolder.Parent = Workspace
end
effectsFolder:SetAttribute("ActiveCount", 0)
effectsFolder:SetAttribute("LastEffectId", "")
effectsFolder:SetAttribute("LastOwnerUserId", 0)
effectsFolder:SetAttribute("LastPhase", "idle")
effectsFolder:SetAttribute("LastSequence", 0)

local activeEffectFolders = {}

local function colorFromHex(value: string?, fallback: Color3): Color3
	local text = if typeof(value) == "string" then value:gsub("#", "") else ""
	if #text ~= 6 then
		return fallback
	end
	local r = tonumber(text:sub(1, 2), 16)
	local g = tonumber(text:sub(3, 4), 16)
	local b = tonumber(text:sub(5, 6), 16)
	if not r or not g or not b then
		return fallback
	end
	return Color3.fromRGB(r, g, b)
end

local function flatUnit(value: Vector3): Vector3
	local flat = Vector3.new(value.X, 0, value.Z)
	if flat.Magnitude < 0.05 then
		return Vector3.new(0, 0, -1)
	end
	return flat.Unit
end

local function rightFromForward(forward: Vector3): Vector3
	return Vector3.new(-forward.Z, 0, forward.X).Unit
end

local function lineCFrame(a: Vector3, b: Vector3): CFrame
	local direction = b - a
	if direction.Magnitude < 0.05 then
		direction = Vector3.new(0, 0, -1)
	end
	return CFrame.lookAt((a + b) * 0.5, (a + b) * 0.5 + direction)
end

local function effectPart(parent: Instance, name: string, size: Vector3, cframe: CFrame, color: Color3, transparency: number?): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Massless = true
	part.CastShadow = false
	part.Material = Enum.Material.Neon
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Transparency = transparency or 0.18
	part.Parent = parent
	return part
end

local function fadeAndDestroy(part: Instance, duration: number, delayTime: number?)
	task.delay(delayTime or 0, function()
		if part and part.Parent and part:IsA("BasePart") then
			TweenService:Create(part, TweenInfo.new(math.max(0.05, duration), Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Transparency = 1 }):Play()
		end
	end)
end

local function addRing(parent: Instance, name: string, center: Vector3, radiusValue: number, color: Color3, duration: number, yOffset: number?)
	local pieces = 18
	for i = 1, pieces do
		local a = (i / pieces) * math.pi * 2
		local p = center + Vector3.new(math.cos(a) * radiusValue, yOffset or 0, math.sin(a) * radiusValue)
		local part = effectPart(parent, `{name}_{i}`, Vector3.new(0.08, 0.045, radiusValue * 0.42), CFrame.new(p) * CFrame.Angles(0, -a, 0), color, 0.36)
		TweenService:Create(part, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = Vector3.new(0.03, 0.03, radiusValue * 0.55) }):Play()
		fadeAndDestroy(part, duration * 0.75, duration * 0.25)
	end
end

local function addTargetMarker(parent: Instance, center: Vector3, color: Color3, accent: Color3, duration: number)
	addRing(parent, "TargetRing", center, 0.62, color, duration, 0.02)
	local crossA = effectPart(parent, "TargetSlashA", Vector3.new(0.06, 0.04, 1.25), CFrame.new(center + Vector3.new(0, 0.05, 0)) * CFrame.Angles(0, math.rad(45), 0), accent, 0.2)
	local crossB = effectPart(parent, "TargetSlashB", Vector3.new(0.06, 0.04, 1.25), CFrame.new(center + Vector3.new(0, 0.06, 0)) * CFrame.Angles(0, math.rad(-45), 0), accent, 0.2)
	fadeAndDestroy(crossA, duration)
	fadeAndDestroy(crossB, duration)
end

local function addSpark(parent: Instance, center: Vector3, color: Color3, accent: Color3, count: number, duration: number)
	for i = 1, count do
		local a = (i / count) * math.pi * 2
		local spark = effectPart(parent, `ImpactSpark_{i}`, Vector3.new(0.08, 0.08, 0.34), CFrame.new(center + Vector3.new(0, 0.1, 0)) * CFrame.Angles(0, -a, 0), if i % 2 == 0 then accent else color, 0.08)
		TweenService:Create(spark, TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { CFrame = spark.CFrame + Vector3.new(math.cos(a) * 0.75, 0.35, math.sin(a) * 0.75), Transparency = 1 }):Play()
	end
end

local function characterForUserId(userId: number): Model?
	for _, otherPlayer in ipairs(Players:GetPlayers()) do
		if otherPlayer.UserId == userId then
			return otherPlayer.Character
		end
	end
	return nil
end

local function handPosition(payload, fallback: Vector3): Vector3
	local character = characterForUserId(payload.ownerUserId)
	if not character then
		return fallback
	end
	local hand = payload.actionHand == "left" and "Left Arm" or "Right Arm"
	if payload.actionType == "bow" then
		local shaft = character:FindFirstChild("ArrowShaft", true)
		if shaft and shaft:IsA("BasePart") then
			return shaft.Position - shaft.CFrame.UpVector * shaft.Size.Y / 2
		end
		hand = "Right Arm"
	elseif payload.actionHand == "both" then
		hand = "Right Arm"
	end
	local arm = character:FindFirstChild(hand)
	if arm and arm:IsA("BasePart") then
		return arm.CFrame:PointToWorldSpace(Vector3.new(0, -0.85, -0.45))
	end
	return fallback
end

local function playSlash(parent: Instance, payload, spec)
	local origin = payload.origin :: Vector3
	local target = payload.target :: Vector3
	local forward = flatUnit(payload.forward :: Vector3)
	local right = rightFromForward(forward)
	local color = colorFromHex(spec.color, Color3.fromRGB(244, 180, 95))
	local accent = colorFromHex(spec.accent, Color3.fromRGB(246, 109, 88))
	local actionType = payload.actionType or "sword"
	local targetPoint = Vector3.new(target.X, (payload.targetGroundY or target.Y) + 1.4, target.Z)
	local groundTarget = Vector3.new(target.X, payload.targetGroundY or target.Y, target.Z)
	addTargetMarker(parent, groundTarget, color, accent, math.max(0.35, spec.duration * 0.55))
	task.delay(spec.telegraph or 0.18, function()
		if not parent.Parent then
			return
		end
		parent:SetAttribute("Phase", "release")
		effectsFolder:SetAttribute("LastPhase", "release")
		local startPoint = handPosition(payload, origin + Vector3.new(0, 2.1, 0))
		if actionType == "spear" then
			for i = 1, 3 do
				local start = startPoint + right * ((i - 2) * 0.12)
				local finish = targetPoint + right * ((i - 2) * 0.06)
				local streak = effectPart(parent, `SpearThrust_{i}`, Vector3.new(0.09, 0.09, math.min(1.4, (finish - start).Magnitude)), lineCFrame(start, start + (finish - start).Unit * math.min(1.4, (finish - start).Magnitude)), if i == 2 then accent else color, 0.08)
				TweenService:Create(streak, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { CFrame = lineCFrame(finish - forward * 1.3, finish) }):Play()
				fadeAndDestroy(streak, 0.22, 0.18)
			end
		elseif actionType == "bow" then
			local finish = targetPoint
			local arrowLength = 1.05
			local direction = (finish - startPoint).Unit
			local arrow = effectPart(parent, "BowArrowStreak", Vector3.new(0.07, 0.07, arrowLength), lineCFrame(startPoint, startPoint + direction * arrowLength), accent, 0.04)
			TweenService:Create(arrow, TweenInfo.new(0.2, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { CFrame = lineCFrame(finish - direction * arrowLength, finish) }):Play()
			fadeAndDestroy(arrow, 0.18, 0.2)
		elseif actionType == "hammer" then
			addRing(parent, "HammerImpact", groundTarget, 1.25, accent, 0.55, 0.08)
			addSpark(parent, groundTarget + Vector3.new(0, 0.25, 0), color, accent, 8, 0.42)
		elseif actionType == "fan-card" then
			for i = 1, 3 do
				local offset = right * ((i - 2) * 0.34)
				local card = effectPart(parent, `EnergyCard_{i}`, Vector3.new(0.42, 0.08, 0.72), CFrame.new(startPoint + offset, targetPoint + offset), if i == 2 then accent else color, 0.14)
				TweenService:Create(card, TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { CFrame = CFrame.new(targetPoint + offset, targetPoint + offset + forward) }):Play()
				fadeAndDestroy(card, 0.22, 0.28)
			end
		else
			for i = 1, 7 do
				local angle = math.rad(-60 + i * 17)
				local pos = startPoint + forward * (0.55 + i * 0.18) + right * math.sin(angle) * 0.95 + Vector3.new(0, math.cos(angle) * 0.28, 0)
				local arc = effectPart(parent, `SlashArc_{i}`, Vector3.new(0.11, 0.08, 0.9), CFrame.new(pos, pos + forward) * CFrame.Angles(0, 0, angle), if i % 2 == 0 then accent else color, 0.06 + i * 0.035)
				TweenService:Create(arc, TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { CFrame = arc.CFrame + forward * 1.15 }):Play()
				fadeAndDestroy(arc, 0.28, 0.12)
			end
		end
	end)
	task.delay(spec.impact or 0.35, function()
		if parent.Parent then
			addSpark(parent, targetPoint, color, accent, 8, 0.35)
		end
	end)
end

local function playDodge(parent: Instance, payload, spec)
	local origin = payload.origin :: Vector3
	local forward = flatUnit(payload.forward :: Vector3)
	local right = rightFromForward(forward)
	local color = colorFromHex(spec.color, Color3.fromRGB(120, 221, 235))
	local accent = colorFromHex(spec.accent, Color3.fromRGB(216, 251, 255))
	local ground = Vector3.new(origin.X, payload.originGroundY or origin.Y, origin.Z)
	for i = 1, 3 do
		local offset = right * (i * 0.45)
		local ghost = effectPart(parent, `DodgeAfterimage_{i}`, Vector3.new(1.35, 2.5, 0.55), CFrame.new(origin + Vector3.new(0, 1.45, 0) - offset, origin + Vector3.new(0, 1.45, 0) - offset + forward), color, 0.62)
		TweenService:Create(ghost, TweenInfo.new(0.32 + i * 0.08), { CFrame = ghost.CFrame - offset * 0.55, Transparency = 1 }):Play()
	end
	addRing(parent, "DodgeRing", ground, 1.05, accent, 0.52, 0.09)
end

local function playHeal(parent: Instance, payload, spec)
	local origin = payload.origin :: Vector3
	local ground = Vector3.new(origin.X, payload.originGroundY or origin.Y, origin.Z)
	local color = colorFromHex(spec.color, Color3.fromRGB(117, 227, 161))
	local accent = colorFromHex(spec.accent, Color3.fromRGB(246, 188, 189))
	addRing(parent, "PeachGround", ground, 1.45, color, spec.duration, 0.1)
	for i = 1, 14 do
		local a = i / 14 * math.pi * 2
		local start = ground + Vector3.new(math.cos(a) * 0.45, 0.35 + (i % 3) * 0.08, math.sin(a) * 0.45)
		local petal = effectPart(parent, `PeachPetal_{i}`, Vector3.new(0.12, 0.05, 0.22), CFrame.new(start) * CFrame.Angles(0, a, math.rad(18)), if i % 2 == 0 then accent else color, 0.16)
		TweenService:Create(petal, TweenInfo.new(spec.duration * 0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), { CFrame = petal.CFrame + Vector3.new(math.cos(a) * 0.55, 1.45, math.sin(a) * 0.55), Transparency = 1 }):Play()
	end
end

local function playArrows(parent: Instance, payload, spec)
	local target = payload.target :: Vector3
	local forward = flatUnit(payload.forward :: Vector3)
	local right = rightFromForward(forward)
	local radiusValue = payload.radius or spec.radius or 2.6
	local ground = Vector3.new(target.X, payload.targetGroundY or target.Y, target.Z)
	local color = colorFromHex(spec.color, Color3.fromRGB(244, 180, 95))
	local accent = colorFromHex(spec.accent, Color3.fromRGB(246, 109, 88))
	addRing(parent, "ArrowTelegraph", ground, radiusValue, color, spec.telegraph, 0.08)
	local points = {
		ground + forward * 0.85,
		ground - forward * 0.65 + right * 0.85,
		ground - forward * 0.65 - right * 0.85,
	}
	for index, point in ipairs(points) do
		addTargetMarker(parent, point, color, accent, spec.telegraph + 0.3)
		task.delay((spec.telegraph or 0.55) + index * 0.12, function()
			if not parent.Parent then
				return
			end
			parent:SetAttribute("Phase", "release")
			effectsFolder:SetAttribute("LastPhase", "release")
			for arrowIndex = 1, 4 do
				local scatter = right * ((arrowIndex - 2.5) * 0.28) + forward * (((arrowIndex % 2) - 0.5) * 0.38)
				local top = point + scatter + Vector3.new(0, 6.2 + arrowIndex * 0.18, 0)
				local bottom = point + scatter * 0.25 + Vector3.new(0, 0.45, 0)
				local direction = (bottom - top).Unit
				local arrowLength = 0.85 + arrowIndex * 0.08
				local arrow = effectPart(parent, `ArrowRain_{index}_{arrowIndex}`, Vector3.new(0.065, 0.065, arrowLength), lineCFrame(top, top + direction * arrowLength), if arrowIndex == 2 then accent else color, 0.06)
				TweenService:Create(arrow, TweenInfo.new(0.32, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { CFrame = lineCFrame(bottom - direction * arrowLength, bottom) }):Play()
				fadeAndDestroy(arrow, 0.18, 0.32)
			end
			task.delay(0.34, function()
				if parent.Parent then
					addRing(parent, `ArrowSpark_{index}`, point, 0.42, accent, 0.35, 0.08)
					addSpark(parent, point + Vector3.new(0, 0.35, 0), color, accent, 5, 0.3)
				end
			end)
		end)
	end
end

local function clearClientEffect(ownerUserId: number?)
	if ownerUserId then
		local existing = activeEffectFolders[ownerUserId]
		if existing then
			existing:Destroy()
			activeEffectFolders[ownerUserId] = nil
		end
	else
		for userId, folder in pairs(activeEffectFolders) do
			folder:Destroy()
			activeEffectFolders[userId] = nil
		end
	end
	local count = 0
	for _ in pairs(activeEffectFolders) do
		count += 1
	end
	effectsFolder:SetAttribute("ActiveCount", count)
end

local function playClientEffect(payload)
	local spec = payload.effect
	if typeof(spec) ~= "table" or typeof(payload.ownerUserId) ~= "number" then
		return
	end
	clearClientEffect(payload.ownerUserId)
	local folder = Instance.new("Folder")
	folder.Name = `Effect_{payload.sequence or 0}_{payload.effectId}`
	folder:SetAttribute("EffectId", payload.effectId)
	folder:SetAttribute("OwnerUserId", payload.ownerUserId)
	folder:SetAttribute("HeroId", payload.heroId or "")
	folder:SetAttribute("Sequence", payload.sequence or 0)
	folder:SetAttribute("Duration", spec.duration or 1)
	folder:SetAttribute("Phase", "telegraph")
	folder.Parent = effectsFolder
	activeEffectFolders[payload.ownerUserId] = folder
	effectsFolder:SetAttribute("LastEffectId", payload.effectId)
	effectsFolder:SetAttribute("LastOwnerUserId", payload.ownerUserId)
	effectsFolder:SetAttribute("LastSequence", payload.sequence or 0)
	effectsFolder:SetAttribute("LastPhase", "telegraph")
	local activeCount = 0
	for _ in pairs(activeEffectFolders) do activeCount += 1 end
	effectsFolder:SetAttribute("ActiveCount", activeCount)
	task.delay(spec.telegraph or 0.1, function()
		if folder.Parent then
			folder:SetAttribute("Phase", "release")
			effectsFolder:SetAttribute("LastPhase", "release")
		end
	end)
	task.delay(spec.impact or 0.35, function()
		if folder.Parent then
			folder:SetAttribute("Phase", "impact")
			effectsFolder:SetAttribute("LastPhase", "impact")
		end
	end)
	if payload.effectId == "dodge" then
		playDodge(folder, payload, spec)
	elseif payload.effectId == "heal" then
		playHeal(folder, payload, spec)
	elseif payload.effectId == "arrows" then
		playArrows(folder, payload, spec)
	else
		playSlash(folder, payload, spec)
	end
	task.delay((spec.duration or 1) + 0.12, function()
		local isCurrent = activeEffectFolders[payload.ownerUserId] == folder
		if isCurrent then
			activeEffectFolders[payload.ownerUserId] = nil
		end
		if folder.Parent then
			folder:Destroy()
		end
		local count = 0
		for _ in pairs(activeEffectFolders) do
			count += 1
		end
		effectsFolder:SetAttribute("ActiveCount", count)
		if isCurrent then effectsFolder:SetAttribute("LastPhase", "ended") end
	end)
end

effectsRemote.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then
		return
	end
	if payload.kind == "clear" then
		clearClientEffect(payload.ownerUserId)
		effectsFolder:SetAttribute("LastPhase", payload.reason or "clear")
	elseif payload.kind == "play" then
		playClientEffect(payload)
	end
end)

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
controls.Size = UDim2.fromOffset(350, 88)
controls.BackgroundTransparency = 1
controls.Parent = screenGui

local controlsLayout = Instance.new("UIListLayout")
controlsLayout.FillDirection = Enum.FillDirection.Horizontal
controlsLayout.SortOrder = Enum.SortOrder.LayoutOrder
controlsLayout.Padding = UDim.new(0, 10)
controlsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
controlsLayout.Parent = controls

local effectControls = Instance.new("Frame")
effectControls.Name = "PreviewEffectControls"
effectControls.AnchorPoint = Vector2.new(1, 1)
effectControls.Position = UDim2.new(1, -18, 1, -112)
effectControls.Size = UDim2.fromOffset(420, 48)
effectControls.BackgroundTransparency = 1
effectControls.Parent = screenGui

local effectControlsLayout = Instance.new("UIListLayout")
effectControlsLayout.FillDirection = Enum.FillDirection.Horizontal
effectControlsLayout.SortOrder = Enum.SortOrder.LayoutOrder
effectControlsLayout.Padding = UDim.new(0, 8)
effectControlsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Right
effectControlsLayout.Parent = effectControls

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
	elseif action == "PreviewEffect" and request and request.effectId then
		payload = { effectId = request.effectId }
	end
	local result = invokeServer(action, payload)
	if result and result.ok then
		if result.heroId then
			currentHeroId = result.heroId
		end
		if renderList then
			renderList()
		end
		local heroLabel = currentHeroId
		for _, hero in ipairs(catalog) do if hero.id == currentHeroId then heroLabel = hero.name; break end end
		local actionLabel = ({ Attack = "杀 · 出招", Dodge = "闪 · 躲闪", SwitchHero = "已换将", CancelEffect = "特效已停止" })[action]
		if action == "PreviewEffect" then actionLabel = `{result.effectLabel or "技能"} · 特效试播` end
		setStatus(`{heroLabel} · {actionLabel or "操作完成"}`)
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

local function requestEffect(effectId: string)
	return requestAction({ action = "PreviewEffect", effectId = effectId })
end

local function clearEffectButtons()
	for _, child in ipairs(effectControls:GetChildren()) do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
end

local function renderEffectButtons()
	clearEffectButtons()
	local orderById = { slash = 1, dodge = 2, heal = 3, arrows = 4 }
	table.sort(effectCatalog, function(a, b)
		return (orderById[a.id] or 99) < (orderById[b.id] or 99)
	end)
	for index, effect in ipairs(effectCatalog) do
		local key = tostring(index)
		local label = if UserInputService.TouchEnabled then (effect.label or effect.id) else `{key} {effect.label or effect.id}`
		local size = if UserInputService.TouchEnabled then UDim2.new(0.25, -6, 0, 44) else UDim2.fromOffset(if effect.id == "arrows" then 112 else 78, 44)
		local button = makeButton(effectControls, label, size, function()
			requestEffect(effect.id)
		end)
		button.LayoutOrder = index
		button.TextSize = if effect.id == "arrows" then 14 else 18
		button.BackgroundColor3 = colorFromHex(effect.color, Color3.fromRGB(57, 70, 92))
		button.TextColor3 = Color3.fromRGB(22, 23, 26)
	end
end

makeButton(controls, "攻击 F", UDim2.fromOffset(76, 58), function()
	requestAction("Attack")
end)
makeButton(controls, "闪避 Q", UDim2.fromOffset(76, 58), function()
	requestAction("Dodge")
end)
makeButton(controls, "换将 R", UDim2.fromOffset(76, 58), function()
	requestAction("SwitchHero")
end)
makeButton(controls, "停止 Esc", UDim2.fromOffset(86, 58), function()
	requestAction("CancelEffect")
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

ContextActionService:BindAction("HeroPlaygroundCancelEffect", function(_, state)
	if state == Enum.UserInputState.Begin then
		requestAction("CancelEffect")
	end
	return Enum.ContextActionResult.Sink
end, false, Enum.KeyCode.Escape)

local EFFECT_KEYS = { Enum.KeyCode.One, Enum.KeyCode.Two, Enum.KeyCode.Three, Enum.KeyCode.Four }
for index, keyCode in ipairs(EFFECT_KEYS) do
	ContextActionService:BindAction(`HeroPlaygroundPreviewEffect{index}`, function(_, state)
		if state == Enum.UserInputState.Begin then
			local effect = effectCatalog[index]
			if effect then
				requestEffect(effect.id)
			end
		end
		return Enum.ContextActionResult.Sink
	end, false, keyCode)
end

local function refreshState()
	local state = invokeServer("GetState")
	if state and state.ok then
		currentHeroId = state.heroId
		radius = state.radius
		catalog = state.catalog or catalog
		effectCatalog = state.effects or effectCatalog
		renderFilters()
		renderList()
		renderEffectButtons()
		setStatus(`WASD 移动，F 攻击，Q 闪避，R 换将，Esc 停止，1-4 预览特效，半径 {radius}`)
	end
end

player.CharacterAdded:Connect(function()
	task.wait(0.1)
	syncCamera()
	refreshState()
end)

if UserInputService.TouchEnabled then
	panel.AnchorPoint = Vector2.zero
	panel.Position = UDim2.fromOffset(10, 10)
	controls.Size = UDim2.new(1, -24, 0, 44)
	controls.Position = UDim2.new(1, -12, 1, -112)
	for _, button in ipairs(controls:GetChildren()) do
		if button:IsA("TextButton") then
			button.Size = UDim2.new(0.25, -7.5, 0, 44)
			button.Text = button.Text:match("^%S+") or button.Text
		end
	end
	effectControls.Size = UDim2.new(1, -24, 0, 44)
	effectControls.Position = UDim2.new(1, -12, 1, -166)
end

applyPanelState()
refreshState()
syncCamera()
