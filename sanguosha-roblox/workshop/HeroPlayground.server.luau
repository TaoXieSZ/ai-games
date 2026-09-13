local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local ServerStorage = game:GetService("ServerStorage")
local Workspace = game:GetService("Workspace")

local REMOTE_NAME = "HeroPlaygroundRemote"
local BOUNDS_RADIUS = 12
local PLAYER_SPAWN = Vector3.new(0, 4.2, 0)
local NPC_SPAWN = CFrame.new(8, 4.2, -5) * CFrame.Angles(0, math.rad(-35), 0)

local HERO_CATALOG = require(ReplicatedStorage:WaitForChild("HeroPlaygroundCatalog"))
local EFFECT_CATALOG = require(ReplicatedStorage:WaitForChild("HeroEffects"))
local HERO_BY_ID = {}
local AVAILABLE_HEROES = {}
for _, hero in ipairs(HERO_CATALOG) do
	HERO_BY_ID[hero.id] = hero
	if hero.available then
		table.insert(AVAILABLE_HEROES, hero)
	end
end

local EFFECT_LIST = EFFECT_CATALOG.effects or EFFECT_CATALOG
local EFFECT_BY_ID = {}
for _, effect in ipairs(EFFECT_LIST) do
	if typeof(effect.id) == "string" then
		EFFECT_BY_ID[effect.id] = effect
	end
end

local COOLDOWNS = {
	Attack = 0.7,
	Dodge = 0.85,
	SwitchHero = 0.45,
	PreviewEffect = 0.1,
	CancelEffect = 0.05,
}

local ALLOWED_ACTIONS = {
	Attack = true,
	Dodge = true,
	SwitchHero = true,
	PreviewEffect = true,
	CancelEffect = true,
}

local remote = ReplicatedStorage:FindFirstChild(REMOTE_NAME)
if not remote then
	remote = Instance.new("RemoteFunction")
	remote.Name = REMOTE_NAME
	remote.Parent = ReplicatedStorage
end

local effectsRemote = ReplicatedStorage:FindFirstChild("HeroPlaygroundEffects")
if not effectsRemote then
	effectsRemote = Instance.new("RemoteEvent")
	effectsRemote.Name = "HeroPlaygroundEffects"
	effectsRemote.Parent = ReplicatedStorage
end

local effectStateFolder = Workspace:FindFirstChild("HeroPlaygroundEffectState")
if not effectStateFolder then
	effectStateFolder = Instance.new("Folder")
	effectStateFolder.Name = "HeroPlaygroundEffectState"
	effectStateFolder.Parent = Workspace
end
effectStateFolder:SetAttribute("ActiveCount", 0)
effectStateFolder:SetAttribute("LastEffectId", "")
effectStateFolder:SetAttribute("LastOwnerUserId", 0)
effectStateFolder:SetAttribute("LastPhase", "idle")

Players.CharacterAutoLoads = false

local templates = ServerStorage:WaitForChild("HeroTemplates")
local playerState: {[Player]: {heroId: string, last: {[string]: number}, action: string, actionStart: number, origin: Vector3, effectUntil: number?, effectSeq: number?}} = {}
local animatedRigs = {}

local function anglesFromDegrees(value)
	if typeof(value) ~= "table" then
		return CFrame.new()
	end
	return CFrame.Angles(math.rad(value[1] or 0), math.rad(value[2] or 0), math.rad(value[3] or 0))
end

local function findMotor(model: Model, name: string): Motor6D?
	local found = model:FindFirstChild(name, true)
	if found and found:IsA("Motor6D") then
		return found
	end
	return nil
end

local function vector(values)
	return Vector3.new(values[1], values[2], values[3])
end
local function secondaryBindings(model, hero)
	local byPart = {}
	for _, weld in model:GetDescendants() do
		if weld:IsA("Weld") and weld.Part1 then byPart[weld.Part1.Name] = {weld=weld,base=weld.C0,size=weld.Part1.Size} end
	end
	local groups = {}
	for _, spec in hero.attachmentMotion or {} do
		local center = vector((hero.boneCenters or {})[spec.bone] or {0,0,0})
		local bindings = {}
		for _, name in spec.parts do if byPart[name] then table.insert(bindings, byPart[name]) end end
		table.insert(groups, {spec=spec,pivot=vector(spec.pivot)-center,bindings=bindings})
	end
	return {groups=groups,byPart=byPart,bow=hero.bowMotion,centers=hero.boneCenters or {}}
end
local function motionWave(action, time, phase)
	if action == "Attack" then
		local t = math.clamp(time / .8, 0, 1)
		return 1.25 * math.sin(math.pi*t) * math.sin(8*time+phase)
	elseif action == "Walk" then
		return math.sin(2*math.pi*time+phase)
	end
	return .22*math.sin(math.pi*time+phase)
end
local function lineFrame(a, b)
	local direction = b-a
	local length = math.max(direction.Magnitude, .001)
	local y = if direction.Magnitude > .0001 then direction.Unit else Vector3.yAxis
	local reference = if math.abs(y.Y) < .95 then Vector3.yAxis else Vector3.xAxis
	local x = reference:Cross(y).Unit
	local z = x:Cross(y).Unit
	return CFrame.fromMatrix((a+b)/2,x,y,z),length
end
local function geometryRotation(values)
	return CFrame.Angles(0,0,math.rad(values[3]))*CFrame.Angles(0,math.rad(values[2]),0)*CFrame.Angles(math.rad(values[1]),0,0)
end
local function applySecondary(rig, action, time)
	local secondary = rig.secondary
	for _, group in secondary.groups do
		local spec = group.spec
		local value = motionWave(action,time,spec.phase or 0)
		local amplitude = vector(spec.amplitude)*math.rad(value)
		local delta = CFrame.new(group.pivot)*CFrame.Angles(amplitude.X,amplitude.Y,amplitude.Z)*CFrame.new(-group.pivot)
		for _, binding in group.bindings do binding.weld.C0 = delta*binding.base end
	end
	local bow = secondary.bow
	if typeof(bow) ~= "table" then return end
	local left = rig.motors["Left Shoulder"].motor
	local right = rig.motors["Right Shoulder"].motor
	local center = vector(secondary.centers[bow.bone] or {0,0,0})
	local drawCenter = vector(secondary.centers[bow.drawBone] or {0,0,0})
	-- Siblings share the torso frame. Predict their poses from the new C0 values
	-- so bow strings do not lag one physics frame behind the drawing hand.
	local leftPivot = left.C0*left.C1:Inverse()*CFrame.new(-center)
	local rightPivot = right.C0*right.C1:Inverse()*CFrame.new(-drawCenter)
	local nock = leftPivot:PointToObjectSpace(rightPivot:PointToWorldSpace(vector(bow.drawPoint)))
	local toPart = CFrame.new(-center)
	for index,name in bow.strings do
		local binding = secondary.byPart[name]
		local frame,length = lineFrame(vector(bow.tips[index]),nock)
		binding.weld.C0 = toPart*frame
		binding.weld.Part1.Size = Vector3.new(binding.size.X,length,binding.size.Z)
	end
	local grip = vector(bow.grip)
	local line = lineFrame(nock,grip)
	local arrowFrame = CFrame.fromMatrix(nock,line.XVector,line.YVector,line.ZVector)
	for _, arrow in bow.arrows do
		local binding = secondary.byPart[arrow.part]
		binding.weld.C0 = toPart*arrowFrame*CFrame.new(vector(arrow.offset))*geometryRotation(arrow.rotation)
	end
end

local function registerAnimatedRig(model: Model, mode: string, phase: number, hero)
	local motors = {}
	local ready = hero and hero.ready or {}
	for _, name in ipairs({ "RootJoint", "Neck", "Right Shoulder", "Left Shoulder", "Right Hip", "Left Hip" }) do
		local motor = findMotor(model, name)
		if motor then
			local boneName = ({
				RootJoint = "Torso",
				Neck = "Head",
				["Right Shoulder"] = "RightArm",
				["Left Shoulder"] = "LeftArm",
				["Right Hip"] = "RightLeg",
				["Left Hip"] = "LeftLeg",
			})[name]
			motors[name] = {
				motor = motor,
				baseC0 = motor.C0,
				ready = anglesFromDegrees(boneName and ready[boneName]),
			}
		end
	end
	animatedRigs[model] = {
		model = model,
		motors = motors,
		mode = mode,
		phase = phase,
		secondary = secondaryBindings(model, hero or {}),
		actionType = hero and hero.actionType or "sword",
		actionHand = hero and hero.actionHand or "right",
		action = "Idle",
		actionStart = 0,
	}
end

local function unregisterAnimatedRig(model: Model?)
	if model then
		animatedRigs[model] = nil
	end
end

local function setMotor(rig, name: string, transform: CFrame)
	local record = rig.motors[name]
	if record then
		record.motor.Transform = CFrame.new()
		record.motor.C0 = record.baseC0 * record.ready * transform
	end
end

local function poseIdle(rig, localT: number)
	local breathe = math.sin(localT * math.pi * 2) * 0.045
	setMotor(rig, "RootJoint", CFrame.Angles(0, 0, breathe))
	setMotor(rig, "Neck", CFrame.Angles(breathe * 0.7, 0, 0))
	setMotor(rig, "Right Shoulder", CFrame.Angles(-breathe, 0, breathe * 0.5))
	setMotor(rig, "Left Shoulder", CFrame.Angles(breathe, 0, -breathe * 0.5))
	setMotor(rig, "Right Hip", CFrame.new())
	setMotor(rig, "Left Hip", CFrame.new())
end

local function poseWalk(rig, localT: number)
	local swing = math.sin(localT * math.pi * 2)
	local lift = math.abs(swing) * 0.045
	setMotor(rig, "RootJoint", CFrame.new(0, lift, 0) * CFrame.Angles(math.rad(-2), 0, math.rad(swing * 4)))
	setMotor(rig, "Neck", CFrame.Angles(math.rad(2), 0, 0))
	setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(swing * 24), 0, 0))
	setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(swing * -24), 0, 0))
	setMotor(rig, "Right Hip", CFrame.Angles(math.rad(swing * -28), 0, 0))
	setMotor(rig, "Left Hip", CFrame.Angles(math.rad(swing * 28), 0, 0))
end

local function poseAttack(rig, localT: number)
	local clamped = math.clamp(localT, 0, 1)
	local windup = math.sin(math.clamp(clamped / 0.28, 0, 1) * math.pi * 0.5)
	local strike = math.sin(math.clamp((clamped - 0.2) / 0.48, 0, 1) * math.pi)
	local recover = math.clamp((clamped - 0.64) / 0.36, 0, 1)
	local power = math.max(strike, windup * (1 - recover))
	local hand = rig.actionHand or "right"
	local leftPrimary = hand == "left"
	local bothHands = hand == "both"
	if rig.actionType == "spear" then
		local thrust = math.sin(math.clamp((clamped - 0.12) / 0.58, 0, 1) * math.pi)
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-7 * thrust), math.rad(-4 * thrust), math.rad(4 * thrust)))
		setMotor(rig, "Neck", CFrame.Angles(math.rad(3 * thrust), math.rad(-3 * thrust), 0))
		setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-42 * thrust), 0, math.rad(-8 * thrust)))
		setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-30 * thrust), 0, math.rad(10 * thrust)))
		setMotor(rig, "Right Hip", CFrame.Angles(math.rad(-10 * thrust), 0, 0))
		setMotor(rig, "Left Hip", CFrame.Angles(math.rad(8 * thrust), 0, 0))
	elseif rig.actionType == "bow" then
		local draw = if clamped < .5 then windup else math.max(0,1-(clamped-.5)/.14)
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-2 * draw), math.rad(-7 * draw), math.rad(-3 * draw)))
		setMotor(rig, "Neck", CFrame.Angles(0, math.rad(-5 * draw), 0))
		setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-2 * draw), 0, math.rad(3 * draw)))
		setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(6 * draw), 0, math.rad(20 * draw)))
		setMotor(rig, "Right Hip", CFrame.Angles(math.rad(-4 * draw), 0, 0))
		setMotor(rig, "Left Hip", CFrame.Angles(math.rad(5 * draw), 0, 0))
	elseif rig.actionType == "fan-card" then
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-2 * power), math.rad(8 * power), math.rad(if leftPrimary then 5 * power else -5 * power)))
		setMotor(rig, "Neck", CFrame.Angles(math.rad(-3 * power), math.rad(if leftPrimary then -8 * power else 8 * power), 0))
		if leftPrimary then
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-36 * power), 0, math.rad(-42 * power)))
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-12 * power), 0, math.rad(20 * power)))
		elseif bothHands then
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-28 * power), 0, math.rad(-30 * power)))
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-28 * power), 0, math.rad(30 * power)))
		else
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-36 * power), 0, math.rad(42 * power)))
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-12 * power), 0, math.rad(-20 * power)))
		end
		setMotor(rig, "Right Hip", CFrame.Angles(math.rad(3 * power), 0, 0))
		setMotor(rig, "Left Hip", CFrame.Angles(math.rad(-3 * power), 0, 0))
	elseif rig.actionType == "hammer" then
		local slam = math.sin(math.clamp((clamped - 0.08) / 0.68, 0, 1) * math.pi)
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-12 * slam), math.rad(if leftPrimary then -7 * slam else 7 * slam), math.rad(if leftPrimary then 12 * slam else -12 * slam)))
		setMotor(rig, "Neck", CFrame.Angles(math.rad(5 * slam), 0, 0))
		if leftPrimary then
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-92 * slam), 0, math.rad(24 * slam)))
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(16 * slam), 0, math.rad(-18 * slam)))
		else
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-92 * slam), 0, math.rad(-24 * slam)))
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(16 * slam), 0, math.rad(18 * slam)))
		end
		setMotor(rig, "Right Hip", CFrame.Angles(math.rad(-8 * slam), 0, 0))
		setMotor(rig, "Left Hip", CFrame.Angles(math.rad(12 * slam), 0, 0))
	else
		setMotor(rig, "RootJoint", CFrame.Angles(0, math.rad(-8 * power), math.rad(10 * strike)))
		setMotor(rig, "Neck", CFrame.Angles(0, math.rad(-5 * power), 0))
		setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-90 * strike), 0, math.rad(18 * strike)))
		setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(20 * strike), 0, math.rad(-12 * strike)))
		setMotor(rig, "Right Hip", CFrame.Angles(math.rad(-6 * strike), 0, 0))
		setMotor(rig, "Left Hip", CFrame.Angles(math.rad(6 * strike), 0, 0))
	end
end

local function poseDodge(rig, localT: number)
	local slip = math.sin(math.clamp(localT, 0, 1) * math.pi)
	setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-4 * slip), 0, math.rad(-18 * slip)))
	setMotor(rig, "Neck", CFrame.Angles(0, math.rad(10 * slip), math.rad(8 * slip)))
	setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(16 * slip), 0, math.rad(12 * slip)))
	setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-16 * slip), 0, math.rad(-12 * slip)))
	setMotor(rig, "Right Hip", CFrame.Angles(math.rad(10 * slip), 0, 0))
	setMotor(rig, "Left Hip", CFrame.Angles(math.rad(-10 * slip), 0, 0))
end

local function prepCharacter(model: Model, anchoredRoot: boolean)
	local root = model:FindFirstChild("HumanoidRootPart")
	model.PrimaryPart = if root and root:IsA("BasePart") then root else model.PrimaryPart
	for _, descendant in ipairs(model:GetDescendants()) do
		if descendant:IsA("BasePart") then
			descendant.Anchored = false
			descendant.CanCollide = descendant.Name == "Torso" or descendant.Name == "Head"
			descendant.CanTouch = false
			descendant.Massless = descendant.Name ~= "HumanoidRootPart"
		end
	end
	if root and root:IsA("BasePart") then
		root.Anchored = anchoredRoot
		root.CanCollide = false
	end
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = if anchoredRoot then 0 else 14
		humanoid.JumpPower = if anchoredRoot then 0 else 46
		humanoid.AutoRotate = not anchoredRoot
		humanoid.BreakJointsOnDeath = false
	end
end

local function defaultHero()
	if HERO_BY_ID.guan_yu and HERO_BY_ID.guan_yu.available then
		return HERO_BY_ID.guan_yu
	end
	return AVAILABLE_HEROES[1] or HERO_CATALOG[1]
end

local function nextAvailableHero(currentHeroId: string): string
	if #AVAILABLE_HEROES == 0 then
		return defaultHero().id
	end
	for index, hero in ipairs(AVAILABLE_HEROES) do
		if hero.id == currentHeroId then
			return AVAILABLE_HEROES[(index % #AVAILABLE_HEROES) + 1].id
		end
	end
	return AVAILABLE_HEROES[1].id
end

local function templateFor(heroId: string): Model
	local hero = HERO_BY_ID[heroId] or defaultHero()
	return templates:WaitForChild(hero.template) :: Model
end

local function placeModel(model: Model, cframe: CFrame)
	if model.PrimaryPart then
		model:PivotTo(cframe)
	end
end

local clearEffect: ((Player, string) -> ())?

local function spawnPlayerHero(player: Player, heroId: string)
	local state = playerState[player]
	local last = state and state.last or {}
	if state then
		if clearEffect then
			clearEffect(player, "switch")
		end
	end
	if state and player.Character then
		unregisterAnimatedRig(player.Character)
		player.Character:Destroy()
	end
	local hero = HERO_BY_ID[heroId] or defaultHero()
	if not hero.available then
		hero = defaultHero()
	end
	local model = templateFor(hero.id):Clone()
	model.Name = player.Name
	model:SetAttribute("HeroId", hero.id)
	model:SetAttribute("HeroName", hero.name)
	model:SetAttribute("PlaygroundCenter", PLAYER_SPAWN)
	prepCharacter(model, false)
	model.Parent = Workspace
	placeModel(model, CFrame.new(PLAYER_SPAWN))
	player.Character = model
	playerState[player] = {
		heroId = hero.id,
		last = last,
		action = "Idle",
		actionStart = os.clock(),
		origin = PLAYER_SPAWN,
		effectUntil = 0,
		effectSeq = state and state.effectSeq or 0,
	}
	registerAnimatedRig(model, "player", player.UserId % 9 * 0.11, hero)
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Died:Connect(function()
			if clearEffect then
				clearEffect(player, "death")
			end
			task.delay(1.2, function()
				if player.Parent then
					spawnPlayerHero(player, playerState[player] and playerState[player].heroId or defaultHero().id)
				end
			end)
		end)
	end
end

local function spawnNpc()
	local old = Workspace:FindFirstChild("HeroPlaygroundNPC")
	if old and old:IsA("Model") then
		unregisterAnimatedRig(old)
		old:Destroy()
	end
	local npcHero = HERO_BY_ID.zhao_yun
	if not npcHero or not npcHero.available then
		npcHero = AVAILABLE_HEROES[2] or AVAILABLE_HEROES[1] or defaultHero()
	end
	local model = templateFor(npcHero.id):Clone()
	model.Name = "HeroPlaygroundNPC"
	model:SetAttribute("HeroId", npcHero.id)
	model:SetAttribute("HeroName", npcHero.name)
	prepCharacter(model, true)
	model.Parent = Workspace
	placeModel(model, NPC_SPAWN)
	registerAnimatedRig(model, "npc", 0.35, npcHero)
end

local function withinBounds(player: Player): boolean
	local state = playerState[player]
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not state or not root or not root:IsA("BasePart") then
		return false
	end
	local offset = root.Position - state.origin
	local flat = Vector3.new(offset.X, 0, offset.Z)
	if flat.Magnitude > BOUNDS_RADIUS then
		local clamped = state.origin + flat.Unit * BOUNDS_RADIUS + Vector3.new(0, offset.Y, 0)
		root.AssemblyLinearVelocity = Vector3.zero
		character:PivotTo(CFrame.new(clamped, clamped + root.CFrame.LookVector))
	end
	return true
end

local function cooldownReady(player: Player, action: string): boolean
	local state = playerState[player]
	if not state then
		return false
	end
	local now = os.clock()
	local needed = COOLDOWNS[action] or 0.2
	if now - (state.last[action] or 0) < needed then
		return false
	end
	state.last[action] = now
	return true
end

local function setAction(player: Player, action: string)
	local state = playerState[player]
	local character = player.Character
	if not state or not character then
		return
	end
	state.action = action
	state.actionStart = os.clock()
	local rig = animatedRigs[character]
	if rig then
		rig.action = action
		rig.actionStart = state.actionStart
	end
end

local function flatForwardFrom(root: BasePart): Vector3
	local forward = Vector3.new(root.CFrame.LookVector.X, 0, root.CFrame.LookVector.Z)
	if forward.Magnitude < 0.05 then
		return Vector3.new(0, 0, -1)
	end
	return forward.Unit
end

local function clampPointToArena(state, point: Vector3, radius: number?): Vector3
	local offset = point - state.origin
	local flat = Vector3.new(offset.X, 0, offset.Z)
	local maxRadius = math.max(0, BOUNDS_RADIUS - (radius or 0))
	if flat.Magnitude > maxRadius then
		return state.origin + flat.Unit * maxRadius + Vector3.new(0, offset.Y, 0)
	end
	return point
end

local function activeEffectCount(now: number): number
	local count = 0
	for _, state in pairs(playerState) do
		if state.effectUntil and state.effectUntil > now then
			count += 1
		end
	end
	return count
end

local function updateActiveEffectCount()
	effectStateFolder:SetAttribute("ActiveCount", activeEffectCount(os.clock()))
end

clearEffect = function(player: Player, reason: string)
	local state = playerState[player]
	if state then
		state.effectUntil = 0
	end
	updateActiveEffectCount()
	effectStateFolder:SetAttribute("LastPhase", reason)
	effectsRemote:FireAllClients({ kind = "clear", ownerUserId = player.UserId, reason = reason })
end

local function effectActionFor(effectId: string): string?
	if effectId == "slash" or effectId == "arrows" then
		return "Attack"
	elseif effectId == "dodge" then
		return "Dodge"
	end
	return nil
end

local function groundYAt(point: Vector3, ignore: Instance?): number
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	local excluded = {}
	if ignore then
		table.insert(excluded, ignore)
	end
	for _, otherPlayer in ipairs(Players:GetPlayers()) do
		if otherPlayer.Character then
			table.insert(excluded, otherPlayer.Character)
		end
	end
	local npc = Workspace:FindFirstChild("HeroPlaygroundNPC")
	if npc then
		table.insert(excluded, npc)
	end
	table.insert(excluded, effectStateFolder)
	params.FilterDescendantsInstances = excluded
	params.IgnoreWater = true
	local result = Workspace:Raycast(point + Vector3.new(0, 24, 0), Vector3.new(0, -80, 0), params)
	if result then
		return result.Position.Y + 0.08
	end
	return 0.46
end

local function previewEffect(player: Player, effectId: string, automatic: boolean)
	local effect = EFFECT_BY_ID[effectId]
	local state = playerState[player]
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not effect or not state or not root or not root:IsA("BasePart") then
		return false, "bad-effect"
	end
	local now = os.clock()
	if state.effectUntil and now < state.effectUntil and clearEffect then
		clearEffect(player, "replace")
	end
	local forward = flatForwardFrom(root)
	local origin = root.Position
	local radius = tonumber(effect.radius) or 0
	local reach = if radius > 0 then 6.4 else 5.8
	local target = clampPointToArena(state, origin + forward * reach, radius)
	local originGroundY = groundYAt(origin, character)
	local targetGroundY = groundYAt(target, character)
	state.effectSeq = (state.effectSeq or 0) + 1
	state.effectUntil = now + (tonumber(effect.duration) or 1)
	updateActiveEffectCount()
	effectStateFolder:SetAttribute("LastEffectId", effectId)
	effectStateFolder:SetAttribute("LastOwnerUserId", player.UserId)
	effectStateFolder:SetAttribute("LastHeroId", state.heroId)
	effectStateFolder:SetAttribute("LastPhase", "start")
	effectStateFolder:SetAttribute("LastSequence", state.effectSeq)
	effectsRemote:FireAllClients({
		kind = "play",
		effectId = effectId,
		effect = effect,
		ownerUserId = player.UserId,
		heroId = state.heroId,
		heroName = (HERO_BY_ID[state.heroId] and HERO_BY_ID[state.heroId].name) or state.heroId,
		actionType = (HERO_BY_ID[state.heroId] and HERO_BY_ID[state.heroId].actionType) or "sword",
		actionHand = (HERO_BY_ID[state.heroId] and HERO_BY_ID[state.heroId].actionHand) or "right",
		origin = origin,
		forward = forward,
		target = target,
		originGroundY = originGroundY,
		targetGroundY = targetGroundY,
		radius = radius,
		sequence = state.effectSeq,
		automatic = automatic,
	})
	local sequence = state.effectSeq
	task.delay(tonumber(effect.duration) or 1, function()
		if player.Parent and playerState[player] == state and state.effectSeq == sequence then
			state.effectUntil = 0
			updateActiveEffectCount()
			effectStateFolder:SetAttribute("LastPhase", "ended")
		end
	end)
	return true, nil, effect
end

remote.OnServerInvoke = function(player: Player, action: string, payload)
	if typeof(action) ~= "string" then
		return { ok = false, error = "bad-action" }
	end
	if action == "GetState" then
		local state = playerState[player]
		return {
			ok = true,
			heroId = state and state.heroId or defaultHero().id,
			radius = BOUNDS_RADIUS,
			catalog = HERO_CATALOG,
			effects = EFFECT_LIST,
		}
	end
	if not ALLOWED_ACTIONS[action] then
		return { ok = false, error = "unknown-action" }
	end
	if not withinBounds(player) then
		return { ok = false, error = "no-character" }
	end
	local requestedEffectId = nil
	if action == "PreviewEffect" then
		requestedEffectId = if typeof(payload) == "table" and typeof(payload.effectId) == "string" then payload.effectId else nil
		if not requestedEffectId or not EFFECT_BY_ID[requestedEffectId] then
			return { ok = false, error = "invalid-effect" }
		end
	end
	local requestedHeroId = nil
	if action == "SwitchHero" then
		requestedHeroId = if typeof(payload) == "table" and typeof(payload.heroId) == "string" then payload.heroId else nil
		if requestedHeroId and (not HERO_BY_ID[requestedHeroId] or not HERO_BY_ID[requestedHeroId].available) then
			return { ok = false, error = "invalid-hero" }
		end
	end
	if not cooldownReady(player, action) then
		return { ok = false, error = "cooldown" }
	end
	if action == "CancelEffect" then
		if clearEffect then
			clearEffect(player, "cancel")
		end
		setAction(player, "Idle")
		return { ok = true, action = action }
	elseif action == "Attack" then
		setAction(player, "Attack")
		previewEffect(player, "slash", true)
		return { ok = true, action = action, effectId = "slash" }
	elseif action == "Dodge" then
		setAction(player, "Dodge")
		previewEffect(player, "dodge", true)
		return { ok = true, action = action, effectId = "dodge" }
	elseif action == "PreviewEffect" then
		local played, effectError, effect = previewEffect(player, requestedEffectId, false)
		if not played then
			return { ok = false, error = effectError or "effect-failed" }
		end
		local poseAction = effectActionFor(requestedEffectId)
		if poseAction then
			setAction(player, poseAction)
		end
		return { ok = true, action = action, effectId = requestedEffectId, effectLabel = effect.label }
	elseif action == "SwitchHero" then
		local nextHero = requestedHeroId
		if not nextHero then
			local current = playerState[player] and playerState[player].heroId or "guan_yu"
			nextHero = nextAvailableHero(current)
		end
		spawnPlayerHero(player, nextHero)
		return { ok = true, action = action, heroId = nextHero }
	end
	return { ok = false, error = "unknown-action" }
end

local function onPlayerAdded(player: Player)
	task.defer(function()
		if player.Parent and not playerState[player] then
			spawnPlayerHero(player, defaultHero().id)
		end
	end)
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in ipairs(Players:GetPlayers()) do
	onPlayerAdded(player)
end

Players.PlayerRemoving:Connect(function(player)
	if clearEffect then
		clearEffect(player, "remove")
	end
	if player.Character then
		unregisterAnimatedRig(player.Character)
	end
	playerState[player] = nil
end)

spawnNpc()

RunService.Heartbeat:Connect(function()
	local now = os.clock()
	for player in pairs(playerState) do
		withinBounds(player)
	end
	for model, rig in pairs(animatedRigs) do
		if not model.Parent then
			animatedRigs[model] = nil
		else
			local t = now + rig.phase
			local action = rig.action
			local root = model:FindFirstChild("HumanoidRootPart")
			if rig.mode == "npc" then
				local cycle = t % 6
				action = if cycle < 2 then "Idle" elseif cycle < 4 then "Walk" else "Attack"
				rig.actionStart = now - (cycle % 2)
			elseif action ~= "Idle" and now - rig.actionStart > 0.8 then
				rig.action = "Idle"
				action = "Idle"
			elseif action == "Idle" and root and root:IsA("BasePart") then
				local speed = Vector3.new(root.AssemblyLinearVelocity.X, 0, root.AssemblyLinearVelocity.Z).Magnitude
				if speed > 0.75 then
					action = "Walk"
				end
			end
				if action == "Attack" then
					poseAttack(rig, math.clamp((now - rig.actionStart) / 0.8, 0, 1))
				elseif action == "Dodge" then
					poseDodge(rig, math.clamp((now - rig.actionStart) / 0.7, 0, 1))
				elseif action == "Walk" then
					poseWalk(rig, (now - rig.actionStart + rig.phase) % 1)
				else
					poseIdle(rig, (now + rig.phase) % 1.8 / 1.8)
				end
			applySecondary(rig, action, if action == "Attack" then math.clamp(now-rig.actionStart,0,.8) else now+rig.phase)
		end
	end
end)
