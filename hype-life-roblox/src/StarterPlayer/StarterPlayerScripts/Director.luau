--!strict
-- 导演系统：运镜、角色传送、场景光照、反馈特效、幕间标题卡。
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local SceneSpecs = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("SceneSpecs"))

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local Director = {}
Director.currentSceneName = nil

local fxGui: ScreenGui? = nil
local flashFrame: Frame? = nil
local actLabel: TextLabel? = nil
local actToken = 0

local function ensureFx()
	if fxGui then
		return
	end
	local gui = Instance.new("ScreenGui")
	gui.Name = "HypeLifeFx"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = true
	gui.DisplayOrder = 5
	gui.Parent = player:WaitForChild("PlayerGui")
	flashFrame = Instance.new("Frame")
	flashFrame.Size = UDim2.fromScale(1, 1)
	flashFrame.BackgroundColor3 = Color3.new(1, 1, 1)
	flashFrame.BackgroundTransparency = 1
	flashFrame.BorderSizePixel = 0
	flashFrame.Parent = gui
	actLabel = Instance.new("TextLabel")
	actLabel.Size = UDim2.fromScale(1, 1)
	actLabel.BackgroundTransparency = 1
	actLabel.TextColor3 = Color3.fromRGB(255, 205, 117)
	actLabel.TextSize = 40
	actLabel.Font = Enum.Font.ArimoBold
	actLabel.TextWrapped = true
	actLabel.Visible = false
	actLabel.Parent = gui
	fxGui = gui
end

local function setCamera(cf: CFrame, instant: boolean)
	camera.CameraType = Enum.CameraType.Scriptable
	if instant then
		camera.CFrame = cf
	else
		local tween = TweenService:Create(
			camera,
			TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{ CFrame = cf }
		)
		tween:Play()
	end
end

local function teleportTo(pos: Vector3)
	local char = player.Character
	if char then
		char:PivotTo(CFrame.new(pos + Vector3.new(0, 3.5, 0)))
	end
end

player.CharacterAdded:Connect(function(char)
	local scene = Director.currentSceneName
	if not scene then
		return
	end
	task.wait(0.6)
	local model = workspace:FindFirstChild("Scenes") and workspace.Scenes:FindFirstChild("Scene_" .. scene)
	if model and char then
		char:PivotTo(CFrame.new(model:GetAttribute("PlayerSpawn") + Vector3.new(0, 3.5, 0)))
	end
end)

-- 切换到某摄影棚：传送 + 光照 + 运镜（instant = 无运镜直切）
function Director.showScene(sceneName: string, instant: boolean?)
	-- 场景是服务器开局才建造的，等待复制完成（最多 20 秒）
	local scenesFolder = workspace:WaitForChild("Scenes", 20)
	if not scenesFolder then
		return false
	end
	local sceneModel = scenesFolder:WaitForChild("Scene_" .. sceneName, 20)
	if not sceneModel then
		return false
	end
	local camPos = sceneModel:GetAttribute("CamPos") :: Vector3
	local camLook = sceneModel:GetAttribute("CamLook") :: Vector3
	local spawnPos = sceneModel:GetAttribute("PlayerSpawn") :: Vector3
	Lighting.ClockTime = sceneModel:GetAttribute("Sky") or 14
	teleportTo(spawnPos)
	setCamera(CFrame.lookAt(camPos, camLook), instant == true)
	Director.currentSceneName = sceneName
	return true
end

-- 选择反馈闪光
function Director.flash(color: Color3)
	ensureFx()
	local frame = flashFrame :: Frame
	frame.BackgroundColor3 = color
	frame.BackgroundTransparency = 0.55
	local tween = TweenService:Create(frame, TweenInfo.new(0.5), { BackgroundTransparency = 1 })
	tween:Play()
end

-- 震屏（大事件）
function Director.shake(intensity: number)
	task.spawn(function()
		local orig = camera.CFrame
		for _ = 1, 8 do
			camera.CFrame = orig
				* CFrame.new(
					(math.random() - 0.5) * intensity,
					(math.random() - 0.5) * intensity,
					0
				)
			task.wait(0.03)
		end
		camera.CFrame = orig
	end)
end

-- 幕间标题卡：淡入 → 停留 → 淡出
function Director.actCard(act: number)
	ensureFx()
	actToken += 1
	local token = actToken
	local label = actLabel :: TextLabel
	label.Text = SceneSpecs.ACT_NAMES[act] or (`第{act}幕`)
	label.Visible = true
	label.TextTransparency = 1
	local fadeIn = TweenService:Create(label, TweenInfo.new(0.4), { TextTransparency = 0 })
	fadeIn:Play()
	task.delay(1.6, function()
		if token ~= actToken then
			return
		end
		local fadeOut = TweenService:Create(label, TweenInfo.new(0.5), { TextTransparency = 1 })
		fadeOut:Play()
		fadeOut.Completed:Connect(function()
			if token == actToken then
				label.Visible = false
			end
		end)
	end)
end

return Director
