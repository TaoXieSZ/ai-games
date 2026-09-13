local TweenService = game:GetService("TweenService")

local CardEffects = {}

local MAX_BASE_PARTS = 196

local DEFAULT_COLOR = Color3.fromRGB(244, 180, 95)
local DEFAULT_ACCENT = Color3.fromRGB(246, 221, 157)
local WHITE = Color3.fromRGB(255, 244, 217)

local function _duration(spec): number
	return tonumber(spec and spec.duration) or 1
end

local function _telegraph(spec): number
	return tonumber(spec and spec.telegraph) or 0.14
end

local function _impact(spec): number
	return tonumber(spec and spec.impact) or 0.34
end

local function _alive(parent: Instance): boolean
	return parent ~= nil and parent.Parent ~= nil
end

local function _partBudget(parent: Instance): boolean
	local count = 0
	for _, descendant in ipairs(parent:GetDescendants()) do
		if descendant:IsA("BasePart") then
			count += 1
			if count >= MAX_BASE_PARTS then
				return false
			end
		end
	end
	return true
end

local function _fallbackPart(parent: Instance, name: string, size: Vector3, cframe: CFrame, color: Color3, transparency: number?): Part
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

local function _effectPart(parent: Instance, h, name: string, size: Vector3, cframe: CFrame, color: Color3, transparency: number?): Part?
	if not _alive(parent) or not _partBudget(parent) then
		return nil
	end
	if typeof(h) == "table" and typeof(h.effectPart) == "function" then
		return h.effectPart(parent, name, size, cframe, color, transparency)
	end
	return _fallbackPart(parent, name, size, cframe, color, transparency)
end

local function _fallbackFade(part: Instance, duration: number, delayTime: number?)
	local startDelay = delayTime or 0
	local fadeDuration = math.max(0.05, duration)
	task.delay(startDelay, function()
		if part and part.Parent and part:IsA("BasePart") then
			TweenService:Create(part, TweenInfo.new(fadeDuration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Transparency = 1 }):Play()
		end
	end)
	task.delay(startDelay + fadeDuration + 0.04, function()
		if part and part.Parent then
			part:Destroy()
		end
	end)
end

local function _fade(h, part: Instance?, duration: number, delayTime: number?)
	if not part then
		return
	end
	if typeof(h) == "table" and typeof(h.fadeAndDestroy) == "function" then
		h.fadeAndDestroy(part, duration, delayTime)
	else
		_fallbackFade(part, duration, delayTime)
	end
end

local function _tween(part: Instance?, duration: number, goal, style: Enum.EasingStyle?, direction: Enum.EasingDirection?)
	if not part or not part.Parent then
		return
	end
	TweenService:Create(part, TweenInfo.new(math.max(0.04, duration), style or Enum.EasingStyle.Quad, direction or Enum.EasingDirection.Out), goal):Play()
end

local function _color(h, text, fallback: Color3): Color3
	if typeof(h) == "table" and typeof(h.colorFromHex) == "function" then
		return h.colorFromHex(text, fallback)
	end
	if typeof(text) == "string" and text:match("^#?%x%x%x%x%x%x$") then
		local hex = text:gsub("#", "")
		return Color3.fromRGB(tonumber(hex:sub(1, 2), 16) or 255, tonumber(hex:sub(3, 4), 16) or 255, tonumber(hex:sub(5, 6), 16) or 255)
	end
	return fallback
end

local function _flatUnit(value: Vector3?): Vector3
	local source = value or Vector3.new(0, 0, -1)
	local flat = Vector3.new(source.X, 0, source.Z)
	if flat.Magnitude < 0.05 then
		return Vector3.new(0, 0, -1)
	end
	return flat.Unit
end

local function _right(forward: Vector3): Vector3
	local side = Vector3.new(-forward.Z, 0, forward.X)
	if side.Magnitude < 0.05 then
		return Vector3.new(1, 0, 0)
	end
	return side.Unit
end

local function _line(h, a: Vector3, b: Vector3): CFrame
	if typeof(h) == "table" and typeof(h.lineCFrame) == "function" then
		return h.lineCFrame(a, b)
	end
	local direction = b - a
	if direction.Magnitude < 0.05 then
		direction = Vector3.new(0, 0, -1)
	end
	return CFrame.lookAt((a + b) * 0.5, (a + b) * 0.5 + direction)
end

local function _origin(payload): Vector3
	if typeof(payload.origin) == "Vector3" then
		return payload.origin
	end
	return Vector3.new(0, 3, 0)
end

local function _target(payload): Vector3
	if typeof(payload.target) == "Vector3" then
		return payload.target
	end
	local origin = _origin(payload)
	return origin + _flatUnit(payload.forward) * 5
end

local function _ground(point: Vector3, y): Vector3
	return Vector3.new(point.X, tonumber(y) or point.Y, point.Z)
end

local function _character(h, userId): Model?
	if typeof(h) == "table" and typeof(h.characterForUserId) == "function" and typeof(userId) == "number" then
		return h.characterForUserId(userId)
	end
	return nil
end

local function _bodyAnchor(h, payload, fallback: Vector3, slot: string): Vector3
	local character = _character(h, payload.ownerUserId)
	if not character then
		return fallback
	end
	local name = if slot == "feet" then "Right Leg" elseif slot == "body" then "Torso" else "Right Arm"
	local part = character:FindFirstChild(name)
	if part and part:IsA("BasePart") then
		if slot == "feet" then
			return part.Position - Vector3.new(0, part.Size.Y * 0.8, 0)
		elseif slot == "body" then
			return part.Position + Vector3.new(0, 0.15, 0)
		end
		return part.CFrame:PointToWorldSpace(Vector3.new(0.72, -0.45, -0.25))
	end
	return fallback
end

local function _ring(parent: Instance, h, name: string, center: Vector3, radius: number, color: Color3, duration: number, yOffset: number?)
	if typeof(h) == "table" and typeof(h.addRing) == "function" then
		h.addRing(parent, name, center, radius, color, duration, yOffset)
		return
	end
	local pieces = 18
	for i = 1, pieces do
		local a = (i / pieces) * math.pi * 2
		local p = center + Vector3.new(math.cos(a) * radius, yOffset or 0, math.sin(a) * radius)
		local part = _effectPart(parent, h, `{name}_{i}`, Vector3.new(0.08, 0.045, radius * 0.42), CFrame.new(p) * CFrame.Angles(0, -a, 0), color, 0.36)
		_tween(part, duration, { Size = Vector3.new(0.03, 0.03, radius * 0.55) })
		_fade(h, part, duration * 0.75, duration * 0.25)
	end
end

local function _spark(parent: Instance, h, center: Vector3, color: Color3, accent: Color3, count: number, duration: number)
	if typeof(h) == "table" and typeof(h.addSpark) == "function" then
		h.addSpark(parent, center, color, accent, count, duration)
		return
	end
	for i = 1, count do
		local a = (i / count) * math.pi * 2
		local part = _effectPart(parent, h, `Spark_{i}`, Vector3.new(0.08, 0.08, 0.34), CFrame.new(center) * CFrame.Angles(0, -a, 0), if i % 2 == 0 then accent else color, 0.08)
		_tween(part, duration, { CFrame = part and part.CFrame + Vector3.new(math.cos(a) * 0.75, 0.35, math.sin(a) * 0.75), Transparency = 1 })
	end
end

local function _impactBurst(parent: Instance, h, center: Vector3, color: Color3, accent: Color3, duration: number)
	if typeof(h) == "table" and typeof(h.addImpactBurst) == "function" then
		h.addImpactBurst(parent, center, color, accent, duration)
		return
	end
	_spark(parent, h, center, color, accent, 10, duration)
	_ring(parent, h, "ImpactHalo", center - Vector3.new(0, 0.34, 0), 0.95, accent, duration, 0.08)
end

local function _palette(h, spec, fallbackColor: Color3?, fallbackAccent: Color3?): (Color3, Color3)
	return _color(h, spec and spec.color, fallbackColor or DEFAULT_COLOR), _color(h, spec and spec.accent, fallbackAccent or DEFAULT_ACCENT)
end

local function _card(parent: Instance, h, name: string, center: Vector3, forward: Vector3, color: Color3, transparency: number?): Part?
	return _effectPart(parent, h, name, Vector3.new(0.46, 0.055, 0.7), CFrame.new(center, center + forward) * CFrame.Angles(math.rad(7), 0, 0), color, transparency or 0.12)
end

local function _beam(parent: Instance, h, name: string, a: Vector3, b: Vector3, color: Color3, thickness: number?, transparency: number?): Part?
	return _effectPart(parent, h, name, Vector3.new(thickness or 0.08, thickness or 0.08, (b - a).Magnitude), _line(h, a, b), color, transparency or 0.08)
end

local function _after(parent: Instance, delayTime: number, callback: () -> ())
	task.delay(delayTime, function()
		if _alive(parent) then
			callback()
		end
	end)
end

local function _flame(parent: Instance, h, name: string, center: Vector3, color: Color3, accent: Color3, height: number, duration: number)
	for i = 1, 5 do
		local a = (i / 5) * math.pi * 2
		local base = center + Vector3.new(math.cos(a) * 0.18, 0.08, math.sin(a) * 0.18)
		local tip = base + Vector3.new(math.cos(a) * 0.1, height, math.sin(a) * 0.1)
		local part = _beam(parent, h, `{name}_{i}`, base, tip, if i % 2 == 0 then accent else color, 0.09, 0.12)
		_tween(part, duration, { CFrame = part and part.CFrame + Vector3.new(0, height * 0.25, 0), Transparency = 1, Size = Vector3.new(0.035, 0.035, math.max(0.08, height * 0.3)) }, Enum.EasingStyle.Sine)
	end
end

local function _zigzag(parent: Instance, h, name: string, points: { Vector3 }, color: Color3, accent: Color3, duration: number)
	for i = 1, #points - 1 do
		local part = _beam(parent, h, `{name}_{i}`, points[i], points[i + 1], if i % 2 == 0 then accent else color, 0.075, 0.02)
		_fade(h, part, duration, 0.06 + i * 0.018)
	end
end

local function _fanCards(parent: Instance, h, prefix: string, center: Vector3, forward: Vector3, right: Vector3, count: number, color: Color3, accent: Color3, duration: number, outward: boolean)
	for i = 1, count do
		local t = if count == 1 then 0.5 else (i - 1) / (count - 1)
		local spread = (t - 0.5) * 2
		local start = center + right * spread * 0.18 + Vector3.new(0, math.abs(spread) * 0.08, 0)
		local finish = center + right * spread * 1.35 + forward * (if outward then 0.8 + math.abs(spread) * 0.45 else -0.65) + Vector3.new(0, 0.35 + math.abs(spread) * 0.25, 0)
		local card = _card(parent, h, `{prefix}_{i}`, start, forward, if i % 2 == 0 then accent else color, 0.1)
		_tween(card, duration, { CFrame = CFrame.new(finish, finish + forward) * CFrame.Angles(0, 0, spread * 0.28), Transparency = 1 })
	end
end

local function _weaponSilhouette(parent: Instance, h, prop: string, center: Vector3, forward: Vector3, right: Vector3, color: Color3, accent: Color3, duration: number)
	local up = Vector3.new(0, 1, 0)
	local base = CFrame.new(center, center + forward)
	if prop == "crossbow" then
		local stock = _effectPart(parent, h, "EquipCrossbowStock", Vector3.new(0.18, 0.18, 1.25), base * CFrame.new(0, 0, 0), color, 0.1)
		local bow = _effectPart(parent, h, "EquipCrossbowBow", Vector3.new(1.45, 0.12, 0.14), base * CFrame.new(0, 0, -0.42), accent, 0.08)
		local magazine = _effectPart(parent, h, "EquipCrossbowMagazine", Vector3.new(0.44, 0.38, 0.32), base * CFrame.new(0, 0.22, -0.1), color, 0.16)
		_fade(h, stock, duration, duration * 0.55)
		_fade(h, bow, duration, duration * 0.55)
		_fade(h, magazine, duration, duration * 0.55)
	elseif prop == "dual_swords" then
		for side = -1, 1, 2 do
			local blade = _beam(parent, h, `EquipDualBlade_{side}`, center + right * side * 0.24 - up * 0.62, center + right * side * 0.24 + up * 0.82, if side < 0 then color else accent, 0.075, 0.05)
			_tween(blade, duration * 0.36, { CFrame = blade and blade.CFrame * CFrame.Angles(0, 0, math.rad(side * 15)) })
			_fade(h, blade, duration, duration * 0.55)
		end
	elseif prop == "glaive" or prop == "spear" or prop == "halberd" then
		local shaft = _beam(parent, h, `Equip_{prop}_Shaft`, center - up * 0.9, center + up * 1.05, color, 0.07, 0.18)
		local head = _effectPart(parent, h, `Equip_{prop}_Head`, if prop == "halberd" then Vector3.new(0.58, 0.12, 0.42) elseif prop == "glaive" then Vector3.new(0.42, 0.14, 0.72) else Vector3.new(0.24, 0.12, 0.52), CFrame.new(center + up * 1.08, center + up * 1.08 + forward), accent, 0.06)
		_fade(h, shaft, duration, duration * 0.55)
		_fade(h, head, duration, duration * 0.55)
	elseif prop == "axe" then
		local shaft = _beam(parent, h, "EquipAxeShaft", center - up * 0.8, center + up * 0.78, color, 0.08, 0.16)
		local head = _effectPart(parent, h, "EquipAxeHead", Vector3.new(0.82, 0.18, 0.55), CFrame.new(center + up * 0.75, center + up * 0.75 + forward) * CFrame.Angles(0, 0, math.rad(18)), accent, 0.06)
		_fade(h, shaft, duration, duration * 0.55)
		_fade(h, head, duration, duration * 0.55)
	elseif prop == "bow" then
		for i = 1, 7 do
			local a0 = math.rad(-70 + i * 20)
			local p = center + right * math.sin(a0) * 0.42 + up * math.cos(a0) * 1.1
			local limb = _effectPart(parent, h, `EquipBowArc_{i}`, Vector3.new(0.08, 0.08, 0.42), CFrame.new(p, p + forward) * CFrame.Angles(0, 0, a0), color, 0.1)
			_fade(h, limb, duration, duration * 0.55)
		end
		local string = _beam(parent, h, "EquipBowString", center - up * 0.95, center + up * 0.95, accent, 0.035, 0.08)
		_fade(h, string, duration, duration * 0.55)
	elseif prop == "fan" then
		_fanCards(parent, h, "EquipFanFeather", center - up * 0.15, forward, right, 7, color, accent, duration * 0.55, true)
	elseif prop == "bagua" then
		_ring(parent, h, "EquipBaguaRing", center, 0.85, accent, duration * 0.7, 0)
		for i = 1, 8 do
			local a = i / 8 * math.pi * 2
			local trigram = _effectPart(parent, h, `EquipBaguaMark_{i}`, Vector3.new(0.22, 0.045, 0.06), CFrame.new(center + right * math.cos(a) * 0.55 + up * math.sin(a) * 0.55, center + forward), color, 0.1)
			_fade(h, trigram, duration, duration * 0.45)
		end
	elseif prop == "shield" or prop == "vine" or prop == "lion" then
		local chest = _effectPart(parent, h, `Equip_{prop}_Chest`, Vector3.new(1.15, 1.3, 0.18), base, color, 0.14)
		local left = _effectPart(parent, h, `Equip_{prop}_ShoulderL`, Vector3.new(0.4, 0.42, 0.2), base * CFrame.new(-0.76, 0.28, 0), accent, 0.12)
		local rightPart = _effectPart(parent, h, `Equip_{prop}_ShoulderR`, Vector3.new(0.4, 0.42, 0.2), base * CFrame.new(0.76, 0.28, 0), accent, 0.12)
		_fade(h, chest, duration, duration * 0.55)
		_fade(h, left, duration, duration * 0.55)
		_fade(h, rightPart, duration, duration * 0.55)
	elseif prop == "horse" then
		local body = _effectPart(parent, h, "EquipHorseBody", Vector3.new(1.55, 0.55, 0.45), base, color, 0.12)
		local neck = _effectPart(parent, h, "EquipHorseNeck", Vector3.new(0.32, 0.62, 0.36), base * CFrame.new(0, 0.45, -0.56) * CFrame.Angles(math.rad(-18), 0, 0), color, 0.12)
		local head = _effectPart(parent, h, "EquipHorseHead", Vector3.new(0.42, 0.34, 0.34), base * CFrame.new(0, 0.76, -0.82), accent, 0.1)
		for i = 1, 4 do
			local x = if i <= 2 then -0.45 else 0.45
			local z = if i % 2 == 0 then -0.22 else 0.22
			local leg = _effectPart(parent, h, `EquipHorseLeg_{i}`, Vector3.new(0.16, 0.7, 0.16), base * CFrame.new(x, -0.55, z), color, 0.14)
			_fade(h, leg, duration, duration * 0.55)
		end
		_fade(h, body, duration, duration * 0.55)
		_fade(h, neck, duration, duration * 0.55)
		_fade(h, head, duration, duration * 0.55)
	else
		local blade = _beam(parent, h, `Equip_{prop}_Blade`, center - up * 0.75, center + up * 0.9, accent, 0.08, 0.05)
		local guard = _effectPart(parent, h, `Equip_{prop}_Guard`, Vector3.new(0.8, 0.08, 0.12), base * CFrame.new(0, -0.42, 0), color, 0.12)
		_fade(h, blade, duration, duration * 0.55)
		_fade(h, guard, duration, duration * 0.55)
	end
end

local function _playFireSha(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local forward = _flatUnit(payload.forward or (target - origin))
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(244, 91, 39), Color3.fromRGB(255, 199, 88))
	local start = _bodyAnchor(h, payload, origin + Vector3.new(0, 1.8, 0), "arm")
	local finish = target + Vector3.new(0, 1.35, 0)
	_ring(parent, h, "FireShaHeatRing", _ground(target, payload.targetGroundY), 1.05, color, _duration(spec) * 0.52, 0.08)
	_after(parent, _telegraph(spec), function()
		for i = 1, 4 do
			local offset = right * ((i - 2.5) * 0.16) + Vector3.new(0, math.sin(i) * 0.08, 0)
			local flame = _beam(parent, h, `FireShaTrail_{i}`, start + offset, finish + offset * 0.35, if i % 2 == 0 then accent else color, 0.13, 0.1)
			_tween(flame, 0.22, { Transparency = 1 })
		end
		_flame(parent, h, "FireShaImpactFlame", finish - Vector3.new(0, 1.15, 0), color, accent, 1.25, 0.46)
		_impactBurst(parent, h, finish, color, accent, 0.34)
	end)
end

local function _playThunderSha(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local color, accent = _palette(h, spec, Color3.fromRGB(111, 154, 255), Color3.fromRGB(236, 244, 255))
	local start = _bodyAnchor(h, payload, origin + Vector3.new(0, 2.2, 0), "arm")
	local finish = target + Vector3.new(0, 1.55, 0)
	local forward = _flatUnit(finish - start)
	local right = _right(forward)
	_after(parent, _telegraph(spec), function()
		local points = { start }
		for i = 1, 4 do
			local t = i / 5
			table.insert(points, start:Lerp(finish, t) + right * (if i % 2 == 0 then -0.45 else 0.45) + Vector3.new(0, if i % 2 == 0 then 0.25 else -0.15, 0))
		end
		table.insert(points, finish)
		_zigzag(parent, h, "ThunderShaBolt", points, color, accent, 0.28)
		_ring(parent, h, "ThunderShaGroundFork", _ground(target, payload.targetGroundY), 1.22, color, 0.42, 0.08)
		_impactBurst(parent, h, finish, color, accent, 0.36)
	end)
end

local function _playJiu(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local forward = _flatUnit(payload.forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(178, 42, 38), Color3.fromRGB(255, 199, 88))
	local ground = _ground(origin, payload.originGroundY)
	local center = _bodyAnchor(h, payload, origin + Vector3.new(0, 1.45, 0), "body")
	_ring(parent, h, "JiuWarmthRing", ground, 1.35, accent, _duration(spec) * 0.78, 0.1)
	local cup = _effectPart(parent, h, "JiuCup", Vector3.new(0.38, 0.34, 0.38), CFrame.new(center + Vector3.new(0, 0.35, 0), center + forward), color, 0.12)
	_tween(cup, 0.26, { CFrame = cup and cup.CFrame * CFrame.Angles(math.rad(-28), 0, 0) + Vector3.new(0, 0.24, 0) })
	_fade(h, cup, 0.42, _duration(spec) * 0.45)
	for i = 1, 8 do
		local a = i / 8 * math.pi * 2
		local ember = _effectPart(parent, h, `JiuEmber_{i}`, Vector3.new(0.09, 0.09, 0.22), CFrame.new(center + Vector3.new(math.cos(a) * 0.45, -0.2, math.sin(a) * 0.45)), if i % 2 == 0 then accent else color, 0.08)
		_tween(ember, _duration(spec) * 0.72, { CFrame = ember and ember.CFrame + Vector3.new(math.cos(a) * 0.3, 1.35, math.sin(a) * 0.3), Transparency = 1 }, Enum.EasingStyle.Sine)
	end
end

local function _playJuedou(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local forward = _flatUnit(target - origin)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(199, 54, 50), Color3.fromRGB(255, 218, 125))
	local a0 = origin + Vector3.new(0, 1.55, 0)
	local b0 = target + Vector3.new(0, 1.55, 0)
	_ring(parent, h, "DuelCasterCircle", _ground(origin, payload.originGroundY), 0.86, color, 0.62, 0.08)
	_ring(parent, h, "DuelTargetCircle", _ground(target, payload.targetGroundY), 0.86, accent, 0.62, 0.08)
	for i = 1, 4 do
		_after(parent, 0.1 + i * 0.12, function()
			local from = if i % 2 == 1 then a0 else b0
			local to = if i % 2 == 1 then b0 else a0
			local side = right * (if i % 2 == 1 then 0.28 else -0.28)
			local blade = _beam(parent, h, `DuelBlade_{i}`, from + side, to - side, if i % 2 == 1 then color else accent, 0.085, 0.05)
			_tween(blade, 0.16, { CFrame = _line(h, to - forward * 0.85, to), Transparency = 1 })
		end)
	end
	_after(parent, _impact(spec), function()
		_impactBurst(parent, h, (a0 + b0) * 0.5, color, accent, 0.38)
	end)
end

local function _playWuxie(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local forward = _flatUnit(payload.forward or (target - origin))
	local color, accent = _palette(h, spec, Color3.fromRGB(94, 211, 191), Color3.fromRGB(244, 245, 230))
	local center = target + Vector3.new(0, 1.55, 0)
	local incoming = _card(parent, h, "WuxieCancelledCard", center - forward * 1.1 + Vector3.new(0, 0.15, 0), forward, color, 0.12)
	_tween(incoming, 0.24, { CFrame = CFrame.new(center - forward * 0.18, center + forward), Transparency = 0.25 })
	_after(parent, 0.2, function()
		_ring(parent, h, "WuxieWard", center, 0.95, accent, 0.48, 0)
		local barA = _beam(parent, h, "WuxieCancelA", center + Vector3.new(-0.48, 0.48, 0), center + Vector3.new(0.48, -0.48, 0), accent, 0.075, 0.05)
		local barB = _beam(parent, h, "WuxieCancelB", center + Vector3.new(0.48, 0.48, 0), center + Vector3.new(-0.48, -0.48, 0), accent, 0.075, 0.05)
		_fade(h, barA, 0.38, 0.12)
		_fade(h, barB, 0.38, 0.12)
		_tween(incoming, 0.22, { CFrame = incoming and incoming.CFrame + Vector3.new(0, 0.12, 0), Transparency = 1 })
	end)
end

local function _playShunshou(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local forward = _flatUnit(origin - target)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(224, 179, 76), Color3.fromRGB(105, 210, 168))
	local from = target + Vector3.new(0, 1.35, 0)
	local to = origin + Vector3.new(0, 1.65, 0)
	local card = _card(parent, h, "StealReturningCard", from, forward, accent, 0.1)
	_ring(parent, h, "StealReachRing", _ground(target, payload.targetGroundY), 0.7, color, 0.42, 0.08)
	_tween(card, 0.48, { CFrame = CFrame.new(to + right * 0.28, to + right * 0.28 + forward), Transparency = 1 }, Enum.EasingStyle.Sine)
	local line = _beam(parent, h, "StealHandLine", from, to, color, 0.045, 0.34)
	_fade(h, line, 0.36, 0.2)
end

local function _playGuohe(parent: Instance, payload, spec, h)
	local target = _target(payload)
	local forward = _flatUnit(payload.forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(107, 116, 132), Color3.fromRGB(245, 205, 111))
	local center = target + Vector3.new(0, 1.45, 0)
	local card = _card(parent, h, "DismantleCard", center, forward, color, 0.08)
	_after(parent, 0.18, function()
		_tween(card, 0.08, { Transparency = 1, Size = Vector3.new(0.18, 0.035, 0.22) })
		for i = 1, 8 do
			local a = i / 8 * math.pi * 2
			local shard = _effectPart(parent, h, `DismantleShard_{i}`, Vector3.new(0.18, 0.035, 0.28), CFrame.new(center) * CFrame.Angles(0, a, math.rad(i * 17)), if i % 2 == 0 then accent else color, 0.06)
			_tween(shard, 0.38, { CFrame = shard and shard.CFrame + Vector3.new(math.cos(a) * 0.86, 0.26, math.sin(a) * 0.86), Transparency = 1 })
		end
		_ring(parent, h, "DismantleBreakRing", _ground(target, payload.targetGroundY), 0.9, accent, 0.36, 0.1)
	end)
end

local function _playDelayedTalisman(parent: Instance, payload, spec, h, name: string, frozen: boolean)
	local target = _target(payload)
	local forward = _flatUnit(payload.forward)
	local color, accent = _palette(h, spec, if frozen then Color3.fromRGB(134, 198, 224) else Color3.fromRGB(210, 175, 83), if frozen then Color3.fromRGB(241, 251, 255) else Color3.fromRGB(224, 62, 56))
	local ground = _ground(target, payload.targetGroundY)
	local center = target + Vector3.new(0, 2.15, 0)
	local talisman = _card(parent, h, `{name}Talisman`, center, forward, color, 0.1)
	_tween(talisman, _duration(spec) * 0.58, { CFrame = CFrame.new(center + Vector3.new(0, 0.28, 0), center + forward) * CFrame.Angles(0, 0, math.rad(8)), Transparency = 0.34 }, Enum.EasingStyle.Sine)
	_ring(parent, h, `{name}JudgementRing`, ground, if frozen then 1.25 else 1.05, accent, _duration(spec) * 0.72, 0.08)
	local sealCount = if frozen then 6 else 4
	for i = 1, sealCount do
		local a = i / sealCount * math.pi * 2
		local seal = _beam(parent, h, `{name}Seal_{i}`, center + Vector3.new(math.cos(a) * 0.42, -0.44, math.sin(a) * 0.42), center + Vector3.new(math.cos(a) * 0.42, 0.44, math.sin(a) * 0.42), accent, 0.045, 0.16)
		_fade(h, seal, _duration(spec) * 0.45, _duration(spec) * 0.35)
	end
end

local function _playTiesuo(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local color, accent = _palette(h, spec, Color3.fromRGB(119, 139, 153), Color3.fromRGB(98, 205, 213))
	local a = origin + Vector3.new(0, 1.35, 0)
	local b = target + Vector3.new(0, 1.35, 0)
	local forward = _flatUnit(b - a)
	local right = _right(forward)
	for i = 1, 14 do
		local t = i / 15
		local center = a:Lerp(b, t) + right * math.sin(t * math.pi * 6) * 0.18
		local link = _effectPart(parent, h, `ChainLink_{i}`, Vector3.new(0.22, 0.065, 0.3), CFrame.new(center, center + forward) * CFrame.Angles(0, 0, if i % 2 == 0 then math.rad(90) else 0), if i % 2 == 0 then accent else color, 0.08)
		_fade(h, link, _duration(spec) * 0.45, _duration(spec) * 0.45)
	end
	_ring(parent, h, "ChainOriginClamp", _ground(origin, payload.originGroundY), 0.62, color, 0.52, 0.08)
	_ring(parent, h, "ChainTargetClamp", _ground(target, payload.targetGroundY), 0.62, accent, 0.52, 0.08)
end

local function _playNanman(parent: Instance, payload, spec, h)
	local target = _target(payload)
	local forward = _flatUnit(payload.forward)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(166, 65, 38), Color3.fromRGB(229, 183, 87))
	local ground = _ground(target, payload.targetGroundY)
	for i = 1, 3 do
		local lane = right * ((i - 2) * 0.9)
		local start = ground - forward * (2.8 + i * 0.18) + lane + Vector3.new(0, 0.24, 0)
		local finish = ground + forward * 0.35 + lane * 0.25 + Vector3.new(0, 0.36, 0)
		_after(parent, 0.08 * i, function()
			local charge = _beam(parent, h, `NanmanGroundCharge_{i}`, start, start + forward * 0.85, if i == 2 then accent else color, 0.18, 0.08)
			_tween(charge, 0.38, { CFrame = _line(h, finish - forward * 0.72, finish), Transparency = 1 }, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
			_ring(parent, h, `NanmanDust_{i}`, Vector3.new(finish.X, ground.Y, finish.Z), 0.42 + i * 0.1, color, 0.35, 0.05)
		end)
	end
	_after(parent, _impact(spec), function()
		_impactBurst(parent, h, ground + Vector3.new(0, 0.62, 0), color, accent, 0.42)
	end)
end

local function _playTaoyuan(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local forward = _flatUnit(payload.forward)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(101, 218, 144), Color3.fromRGB(246, 173, 184))
	local base = _ground(origin, payload.originGroundY)
	for i = 1, 3 do
		local offset = right * ((i - 2) * 1.0) + forward * (if i == 2 then 0.2 else 0.75)
		local center = base + offset
		_ring(parent, h, `TaoyuanBloomRing_{i}`, center, 0.68, color, _duration(spec) * 0.62, 0.09)
		for p = 1, 6 do
			local a = p / 6 * math.pi * 2
			local petal = _effectPart(parent, h, `TaoyuanPetal_{i}_{p}`, Vector3.new(0.16, 0.045, 0.3), CFrame.new(center + Vector3.new(math.cos(a) * 0.22, 0.22, math.sin(a) * 0.22)) * CFrame.Angles(0, a, math.rad(22)), if p % 2 == 0 then accent else color, 0.12)
			_tween(petal, _duration(spec) * 0.58, { CFrame = petal and petal.CFrame + Vector3.new(math.cos(a) * 0.45, 0.9, math.sin(a) * 0.45), Transparency = 1 }, Enum.EasingStyle.Sine)
		end
	end
end

local function _playWugu(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local forward = _flatUnit(payload.forward)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(217, 161, 75), Color3.fromRGB(112, 190, 112))
	local center = origin + forward * 1.2 + Vector3.new(0, 1.4, 0)
	_fanCards(parent, h, "HarvestCard", center, forward, right, 5, color, accent, 0.54, true)
	_ring(parent, h, "HarvestOfferingRing", Vector3.new(center.X, tonumber(payload.originGroundY) or origin.Y, center.Z), 1.25, accent, 0.62, 0.08)
	for i = 1, 5 do
		local a = i / 5 * math.pi * 2
		local grain = _effectPart(parent, h, `HarvestGrain_{i}`, Vector3.new(0.1, 0.22, 0.1), CFrame.new(center + Vector3.new(math.cos(a) * 0.45, -0.62, math.sin(a) * 0.45)), color, 0.08)
		_tween(grain, 0.48, { CFrame = grain and grain.CFrame + Vector3.new(math.cos(a) * 0.7, 0.28, math.sin(a) * 0.7), Transparency = 1 })
	end
end

local function _playWuzhong(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local forward = _flatUnit(payload.forward)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(92, 183, 224), Color3.fromRGB(245, 231, 153))
	local center = _bodyAnchor(h, payload, origin + Vector3.new(0, 1.65, 0), "body")
	for i = 1, 2 do
		local side = if i == 1 then -1 else 1
		local start = center + right * side * 0.1 + Vector3.new(0, -0.15, 0)
		local finish = center + right * side * 0.46 + Vector3.new(0, 0.45, 0)
		local card = _card(parent, h, `InsightCard_{i}`, start, forward, if i == 1 then color else accent, 0.05)
		_tween(card, 0.36, { CFrame = CFrame.new(finish, finish + forward) * CFrame.Angles(0, 0, math.rad(side * 12)), Transparency = 0.18 })
		_fade(h, card, 0.3, _duration(spec) * 0.62)
	end
	_spark(parent, h, center + Vector3.new(0, 0.32, 0), color, accent, 8, 0.45)
end

local function _playJiedao(parent: Instance, payload, spec, h)
	local origin = _origin(payload)
	local target = _target(payload)
	local forward = _flatUnit(target - origin)
	local right = _right(forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(193, 70, 57), Color3.fromRGB(235, 201, 107))
	local start = origin + Vector3.new(0, 1.45, 0)
	local bend = start:Lerp(target + Vector3.new(0, 1.7, 0), 0.5) + right * 1.05
	local finish = target + Vector3.new(0, 1.35, 0)
	_weaponSilhouette(parent, h, "sword", start, forward, right, color, accent, 0.56)
	local pathA = _beam(parent, h, "BorrowedBladePathA", start, bend, color, 0.06, 0.14)
	local pathB = _beam(parent, h, "BorrowedBladePathB", bend, finish, accent, 0.06, 0.14)
	_fade(h, pathA, 0.42, 0.2)
	_fade(h, pathB, 0.42, 0.2)
	_after(parent, 0.28, function()
		local blade = _beam(parent, h, "RedirectedWeaponSlash", bend, finish, accent, 0.11, 0.04)
		_tween(blade, 0.2, { CFrame = _line(h, finish - forward * 0.8, finish), Transparency = 1 })
		_impactBurst(parent, h, finish, color, accent, 0.34)
	end)
end

local function _playHuogong(parent: Instance, payload, spec, h)
	local target = _target(payload)
	local forward = _flatUnit(payload.forward)
	local color, accent = _palette(h, spec, Color3.fromRGB(235, 88, 38), Color3.fromRGB(255, 220, 119))
	local center = target + Vector3.new(0, 1.45, 0)
	local reveal = _card(parent, h, "FireAttackRevealedCard", center + Vector3.new(0, 0.35, 0), forward, accent, 0.04)
	_tween(reveal, 0.2, { CFrame = CFrame.new(center + Vector3.new(0, 0.55, 0), center + forward), Transparency = 0.14 })
	_after(parent, 0.2, function()
		_flame(parent, h, "FireAttackRevealFlame", center - Vector3.new(0, 0.95, 0), color, accent, 1.38, 0.52)
		_ring(parent, h, "FireAttackHeatSeal", _ground(target, payload.targetGroundY), 1.08, color, 0.48, 0.08)
	end)
	_fade(h, reveal, 0.28, _duration(spec) * 0.55)
end

local function _playShandian(parent: Instance, payload, spec, h)
	local target = _target(payload)
	local color, accent = _palette(h, spec, Color3.fromRGB(107, 134, 255), Color3.fromRGB(245, 248, 255))
	local ground = _ground(target, payload.targetGroundY)
	local top = target + Vector3.new(0, 6.2, 0)
	local mid = target + Vector3.new(0.38, 3.7, -0.22)
	local lower = target + Vector3.new(-0.24, 2.1, 0.18)
	_ring(parent, h, "LightningJudgementCloud", target + Vector3.new(0, 3.7, 0), 0.92, color, _duration(spec) * 0.55, 0)
	_ring(parent, h, "LightningDelayMark", ground, 1.2, accent, _duration(spec) * 0.75, 0.1)
	_after(parent, _impact(spec), function()
		_zigzag(parent, h, "DelayedLightningBolt", { top, mid, lower, target + Vector3.new(0, 0.7, 0) }, color, accent, 0.32)
		_impactBurst(parent, h, target + Vector3.new(0, 0.75, 0), color, accent, 0.38)
	end)
end

local EQUIPMENT_PROPS = {
	zhuge_crossbow = "crossbow",
	double_swords = "dual_swords",
	green_dragon_blade = "glaive",
	qinggang_sword = "sword",
	serpent_spear = "spear",
	stone_axe = "axe",
	halberd = "halberd",
	kylin_bow = "bow",
	ice_sword = "ice_sword",
	fire_fan = "fan",
	ancient_scimitar = "scimitar",
	eight_trigrams = "bagua",
	renwang_shield = "shield",
	vine_armor = "vine",
	silver_lion = "lion",
	red_hare = "horse",
	dayuan = "horse",
	zixing = "horse",
	dilu = "horse",
	jueying = "horse",
	zhuahuang_feidian = "horse",
	hualiu = "horse",
}

local function _equipmentSlot(prop: string): string
	if prop == "bagua" or prop == "shield" or prop == "vine" or prop == "lion" then
		return "body"
	elseif prop == "horse" then
		return "feet"
	end
	return "arm"
end

local function _playEquipmentEquip(parent: Instance, payload, spec, h, prop: string)
	local origin = _origin(payload)
	local forward = _flatUnit(payload.forward)
	local right = _right(forward)
	local color, accent = _palette(h, spec)
	local slot = _equipmentSlot(prop)
	local anchor = _bodyAnchor(h, payload, origin + Vector3.new(0, 1.2, 0), slot)
	local center = anchor
	if slot == "feet" then
		center = anchor + right * 1.15 + Vector3.new(0, 0.55, 0)
	elseif slot == "body" then
		center = origin - right * 2.4 + forward * 0.7 + Vector3.new(0, 1.55, 0)
	else
		center = origin + right * 2.4 + forward * 0.7 + Vector3.new(0, 1.55, 0)
	end
	_weaponSilhouette(parent, h, prop, center, forward, right, color, accent, _duration(spec))
	_ring(parent, h, `EquipMaterialize_{prop}`, _ground(center, center.Y - 1.1), if prop == "horse" then 1.45 else 0.85, accent, _duration(spec) * 0.56, 0.08)
	_spark(parent, h, center, color, accent, if prop == "horse" then 12 else 8, 0.44)
	if slot ~= "feet" then
		local link = _beam(parent, h, `EquipLink_{prop}`, anchor, center, accent, 0.045, 0.34)
		_fade(h, link, _duration(spec) * 0.42, _duration(spec) * 0.18)
	end
end

local function _playEquipmentTrigger(parent: Instance, payload, spec, h, prop: string)
	local origin = _origin(payload)
	local target = _target(payload)
	local forward = _flatUnit(target - origin)
	local right = _right(forward)
	local color, accent = _palette(h, spec)
	local start = _bodyAnchor(h, payload, origin + Vector3.new(0, 1.45, 0), _equipmentSlot(prop))
	local finish = target + Vector3.new(0, 1.25, 0)
	if prop == "crossbow" then
		for i = 1, 4 do
			_after(parent, 0.06 * i, function()
				local offset = right * ((i - 2.5) * 0.13)
				local bolt = _beam(parent, h, `CrossbowBolt_{i}`, start + offset, finish + offset, accent, 0.055, 0.03)
				_tween(bolt, 0.18, { CFrame = _line(h, finish - forward * 0.75 + offset, finish + offset), Transparency = 1 }, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
			end)
		end
	elseif prop == "dual_swords" then
		for side = -1, 1, 2 do
			local slash = _beam(parent, h, `DualSwordCross_{side}`, start + right * side * 0.35, finish - right * side * 0.2, if side < 0 then color else accent, 0.08, 0.04)
			_tween(slash, 0.24, { CFrame = slash and slash.CFrame + forward * 0.55, Transparency = 1 })
		end
	elseif prop == "glaive" then
		local sweep = _effectPart(parent, h, "GlaiveCrescentSweep", Vector3.new(1.55, 0.08, 0.48), CFrame.new(finish, finish + forward) * CFrame.Angles(0, 0, math.rad(22)), accent, 0.08)
		_tween(sweep, 0.32, { CFrame = sweep and sweep.CFrame * CFrame.Angles(0, 0, math.rad(42)), Transparency = 1 })
	elseif prop == "sword" then
		local pierce = _beam(parent, h, "QinggangPierceLine", start, finish, accent, 0.065, 0.04)
		local armor = _effectPart(parent, h, "QinggangArmorGhost", Vector3.new(0.9, 1.1, 0.12), CFrame.new(finish, finish + forward), color, 0.62)
		_tween(pierce, 0.22, { Transparency = 1 })
		_fade(h, armor, 0.28, 0.18)
	elseif prop == "spear" then
		for i = 1, 2 do
			local card = _card(parent, h, `SerpentCardFuel_{i}`, start + right * ((i - 1.5) * 0.32), forward, color, 0.12)
			_tween(card, 0.22, { CFrame = CFrame.new(start + forward * 0.8 + right * ((i - 1.5) * 0.08), start + forward), Transparency = 1 })
		end
		local thrust = _beam(parent, h, "SerpentSpearThrust", start, finish, accent, 0.1, 0.04)
		_tween(thrust, 0.26, { CFrame = _line(h, finish - forward * 1.15, finish), Transparency = 1 })
	elseif prop == "axe" then
		_ring(parent, h, "StoneAxeCrackRing", _ground(target, payload.targetGroundY), 1.05, accent, 0.44, 0.08)
		for i = 1, 5 do
			local a = i / 5 * math.pi * 2
			local crack = _beam(parent, h, `StoneAxeCrack_{i}`, _ground(target, payload.targetGroundY) + Vector3.new(0, 0.08, 0), _ground(target, payload.targetGroundY) + Vector3.new(math.cos(a) * 0.95, 0.1, math.sin(a) * 0.95), color, 0.045, 0.18)
			_fade(h, crack, 0.38, 0.14)
		end
	elseif prop == "halberd" then
		for i = -1, 1 do
			local targetPoint = finish + right * i * 0.82
			local branch = _beam(parent, h, `HalberdBranch_{i + 2}`, start, targetPoint, if i == 0 then accent else color, 0.055, 0.08)
			_fade(h, branch, 0.42, 0.16)
			_ring(parent, h, `HalberdTarget_{i + 2}`, Vector3.new(targetPoint.X, tonumber(payload.targetGroundY) or target.Y, targetPoint.Z), 0.42, accent, 0.38, 0.08)
		end
	elseif prop == "bow" then
		local saddle = _effectPart(parent, h, "KylinSaddleTarget", Vector3.new(0.56, 0.18, 0.38), CFrame.new(finish, finish + forward), color, 0.14)
		local arrow = _beam(parent, h, "KylinBowArrow", start, finish, accent, 0.06, 0.02)
		_tween(arrow, 0.22, { CFrame = _line(h, finish - forward * 0.8, finish), Transparency = 1 })
		_tween(saddle, 0.3, { CFrame = saddle and saddle.CFrame + Vector3.new(0, 0.4, 0), Transparency = 1 })
	elseif prop == "ice_sword" then
		local slash = _beam(parent, h, "IceSwordColdSlash", start, finish, accent, 0.09, 0.04)
		_tween(slash, 0.2, { Transparency = 1 })
		for i = 1, 2 do
			local frozen = _card(parent, h, `IceSwordFrozenCard_{i}`, finish + right * ((i - 1.5) * 0.42) + Vector3.new(0, 0.25, 0), forward, color, 0.3)
			local ice = _effectPart(parent, h, `IceSwordCrystal_{i}`, Vector3.new(0.62, 0.14, 0.82), CFrame.new(finish + right * ((i - 1.5) * 0.42) + Vector3.new(0, 0.25, 0), finish + forward), accent, 0.58)
			_fade(h, frozen, 0.38, 0.45)
			_fade(h, ice, 0.38, 0.45)
		end
	elseif prop == "fan" then
		_flame(parent, h, "FireFanConvertedFlame", start + forward * 0.8, color, accent, 1.1, 0.46)
		local gust = _beam(parent, h, "FireFanGust", start, finish, color, 0.22, 0.42)
		_tween(gust, 0.42, { CFrame = _line(h, start + forward * 0.8, finish), Transparency = 1 })
	elseif prop == "scimitar" then
		for i = 1, 3 do
			local slot = _card(parent, h, `ScimitarEmptySlot_{i}`, finish + right * ((i - 2) * 0.36) + Vector3.new(0, 0.16, 0), forward, Color3.fromRGB(20, 18, 16), 0.72)
			_fade(h, slot, 0.34, 0.34)
		end
		local chop = _beam(parent, h, "AncientScimitarHeavyChop", start, finish, accent, 0.12, 0.04)
		_tween(chop, 0.26, { CFrame = chop and chop.CFrame * CFrame.Angles(0, 0, math.rad(24)), Transparency = 1 })
	elseif prop == "bagua" then
		_ring(parent, h, "BaguaJudgementSpin", start, 0.95, accent, 0.56, 0)
		local redDot = _effectPart(parent, h, "BaguaRedJudgement", Vector3.new(0.18, 0.18, 0.18), CFrame.new(start + right * 0.72 + Vector3.new(0, 0.25, 0)), Color3.fromRGB(237, 68, 62), 0.05)
		_tween(redDot, 0.44, { CFrame = redDot and redDot.CFrame + Vector3.new(0, 0.42, 0), Transparency = 1 })
	elseif prop == "shield" then
		local wall = _effectPart(parent, h, "RenwangShieldWall", Vector3.new(1.35, 1.55, 0.16), CFrame.new(start + forward * 0.25, start + forward), color, 0.18)
		for side = -1, 1, 2 do
			local split = _beam(parent, h, `RenwangBlackFlow_{side}`, finish - forward * 1.0, start + right * side * 0.9, Color3.fromRGB(18, 23, 31), 0.11, 0.16)
			_tween(split, 0.36, { Transparency = 1 })
		end
		_fade(h, wall, 0.42, 0.28)
	elseif prop == "vine" then
		for i = 1, 7 do
			local a = i / 7 * math.pi * 2
			local vine = _beam(parent, h, `VineArmorWeave_{i}`, start + Vector3.new(math.cos(a) * 0.55, -0.55, math.sin(a) * 0.08), start + Vector3.new(math.cos(a + 1.3) * 0.55, 0.55, math.sin(a) * 0.08), color, 0.055, 0.16)
			_fade(h, vine, 0.48, 0.28)
		end
		_spark(parent, h, start + Vector3.new(0, 0.1, 0), Color3.fromRGB(243, 106, 33), accent, 5, 0.4)
	elseif prop == "lion" then
		_ring(parent, h, "SilverLionGuardRing", _ground(origin, payload.originGroundY), 1.2, accent, 0.58, 0.1)
		for side = -1, 1, 2 do
			local shoulder = _effectPart(parent, h, `SilverLionShoulder_{side}`, Vector3.new(0.48, 0.38, 0.22), CFrame.new(start + right * side * 0.58 + Vector3.new(0, 0.35, 0), start + forward), color, 0.08)
			_tween(shoulder, 0.46, { CFrame = shoulder and shoulder.CFrame + Vector3.new(0, 0.18, 0), Transparency = 1 })
		end
	elseif prop == "horse" then
		local ground = _ground(origin, payload.originGroundY)
		local sign = if spec and spec.id and (spec.id == "red_hare" or spec.id == "dayuan" or spec.id == "zixing") then 1 else -1
		for i = 1, 4 do
			local hoof = _beam(parent, h, `HorseStride_{i}`, ground + right * ((i - 2.5) * 0.24) + forward * sign * -0.75 + Vector3.new(0, 0.08, 0), ground + right * ((i - 2.5) * 0.24) + forward * sign * 0.95 + Vector3.new(0, 0.1, 0), if i % 2 == 0 then accent else color, 0.07, 0.14)
			_fade(h, hoof, 0.44, 0.16)
		end
		_ring(parent, h, "HorseDistanceRing", ground + forward * sign * 0.35, 1.35, accent, 0.52, 0.08)
	end
	_after(parent, _impact(spec), function()
		_impactBurst(parent, h, finish, color, accent, 0.28)
	end)
end

local TRICK_RENDERERS = {
	juedou = _playJuedou,
	wuxie = _playWuxie,
	shunshou = _playShunshou,
	guohe = _playGuohe,
	lebusishu = function(parent, payload, spec, h)
		_playDelayedTalisman(parent, payload, spec, h, "Lebu", false)
	end,
	bingliang = function(parent, payload, spec, h)
		_playDelayedTalisman(parent, payload, spec, h, "Bingliang", true)
	end,
	tiesuo = _playTiesuo,
	nanman = _playNanman,
	taoyuan = _playTaoyuan,
	wugu = _playWugu,
	wuzhong = _playWuzhong,
	jiedao = _playJiedao,
	huogong = _playHuogong,
	shandian = _playShandian,
}

local BASIC_RENDERERS = {
	fire_sha = _playFireSha,
	thunder_sha = _playThunderSha,
	jiu = _playJiu,
}

function CardEffects.play(parent: Instance, payload, spec, h)
	if typeof(parent) ~= "Instance" or not _alive(parent) then
		return
	end
	payload = if typeof(payload) == "table" then payload else {}
	spec = if typeof(spec) == "table" then spec else {}
	local id = tostring(spec.id or spec.cardId or payload.effectId or payload.cardId or "")
	if id == "" then
		id = tostring(spec.motif or "")
	end
	parent:SetAttribute("CardEffectId", id)
	parent:SetAttribute("CardEffectMode", payload.previewMode or "trigger")
	local basic = BASIC_RENDERERS[id]
	if basic then
		basic(parent, payload, spec, h)
		return
	end
	local trick = TRICK_RENDERERS[id]
	if trick then
		trick(parent, payload, spec, h)
		return
	end
	local prop = EQUIPMENT_PROPS[id]
	if prop then
		if payload.previewMode == "equip" then
			_playEquipmentEquip(parent, payload, spec, h, prop)
		else
			_playEquipmentTrigger(parent, payload, spec, h, prop)
		end
		return
	end
	local color, accent = _palette(h, spec)
	_impactBurst(parent, h, _target(payload) + Vector3.new(0, 1.2, 0), color, accent, math.min(0.5, _duration(spec)))
end

return CardEffects
