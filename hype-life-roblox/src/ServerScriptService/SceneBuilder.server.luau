--!strict
-- 场景搭建：服务器启动时按 SceneSpecs 程序化建造全部摄影棚，
-- 每个棚以 400 studs 间距排开，相机/出生点坐标存为 Attributes 供客户端运镜。
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SceneSpecs = require(ReplicatedStorage:WaitForChild("Game"):WaitForChild("SceneSpecs"))

local SHAPES = {
	Block = Enum.PartType.Block,
	Ball = Enum.PartType.Ball,
	Cylinder = Enum.PartType.Cylinder,
	Wedge = Enum.PartType.Wedge,
}

local function c3(t): Color3
	return Color3.fromRGB(t[1], t[2], t[3])
end

-- 复用同名文件夹（模块被重复加载时避免出现多个空副本）
local folder = workspace:FindFirstChild("Scenes")
if not folder then
	folder = Instance.new("Folder")
	folder.Name = "Scenes"
	folder.Parent = workspace
end
folder:ClearAllChildren()

local names = {}
for name in pairs(SceneSpecs.BUILDS) do
	table.insert(names, name)
end
table.sort(names)

local HOT_LINES = {
	"1  热搜人生·连续剧..........爆",
	"2  前女友下场开撕...........沸",
	"3  万字长文逐条打假.........热",
	"4  三千万彩礼诉讼立案.......新",
	"5  女方回应：姐姐清醒.......沸",
	"6  上市首日暴涨647%.........爆",
	"7  突发肾结石取消午餐.......热",
}

for i, name in ipairs(names) do
	local spec = SceneSpecs.BUILDS[name]
	local origin = Vector3.new((i - 1) * 400, 0, 0)
	local model = Instance.new("Model")
	model.Name = "Scene_" .. name

	local function cfAt(pos): any
		return CFrame.new(origin + Vector3.new(pos[1], pos[2], pos[3]))
	end

	local function addPart(shape, size, pos, color): Part
		local p = Instance.new("Part")
		p.Shape = SHAPES[shape] or Enum.PartType.Block
		p.Size = Vector3.new(size[1], size[2], size[3])
		p.Color = c3(color)
		p.Anchored = true
		p.Material = Enum.Material.SmoothPlastic
		p.TopSurface = Enum.SurfaceType.Smooth
		p.BottomSurface = Enum.SurfaceType.Smooth
		p.CFrame = cfAt(pos)
		p.Parent = model
		return p
	end

	-- 地板 / 背墙
	addPart("Block", { 60, 1, 60 }, { 0, -0.5, 0 }, spec.floor)
	if spec.wall then
		addPart("Block", { 60, 22, 1 }, { 0, 11, -15.5 }, spec.wall)
	end

	-- 道具
	for _, prop in ipairs(spec.props) do
		local p = addPart(prop[1], prop[2], prop[3], prop[4])
		if prop[1] == "Cylinder" then
			p.CFrame = p.CFrame * CFrame.Angles(0, 0, math.rad(90))
		end
	end

	-- 热搜巨幕（SurfaceGui 文字）
	if spec.screen then
		local p = addPart("Block", spec.screen.part, spec.screen.pos, { 10, 12, 20 })
		p.CFrame = cfAt(spec.screen.pos)
		local sg = Instance.new("SurfaceGui")
		sg.Face = Enum.NormalId.Front
		sg.CanvasSize = Vector2.new(900, 500)
		sg.Parent = p
		local title = Instance.new("TextLabel")
		title.Size = UDim2.fromScale(1, 0.2)
		title.BackgroundTransparency = 1
		title.TextColor3 = Color3.fromRGB(255, 205, 117)
		title.TextSize = 34
		title.Font = Enum.Font.ArimoBold
		title.TextXAlignment = Enum.TextXAlignment.Center
		title.Text = "# " .. spec.screen.title
		title.Parent = sg
		local list = Instance.new("TextLabel")
		list.Size = UDim2.fromScale(1, 0.78)
		list.Position = UDim2.fromScale(0, 0.2)
		list.BackgroundTransparency = 1
		list.TextColor3 = Color3.fromRGB(240, 240, 250)
		list.TextSize = 22
		list.Font = Enum.Font.Arimo
		list.TextXAlignment = Enum.TextXAlignment.Left
		list.TextYAlignment = Enum.TextYAlignment.Top
		list.Text = table.concat(HOT_LINES, "\n")
		list.Parent = sg
	end

	-- 相机与出生点（客户端运镜读取）
	model:SetAttribute("CamPos", origin + Vector3.new(spec.cam.pos[1], spec.cam.pos[2], spec.cam.pos[3]))
	model:SetAttribute("CamLook", origin + Vector3.new(spec.cam.look[1], spec.cam.look[2], spec.cam.look[3]))
	model:SetAttribute("PlayerSpawn", origin + Vector3.new(spec.spawn[1], spec.spawn[2], spec.spawn[3]))
	model:SetAttribute("Sky", spec.sky or 14)
	model:SetAttribute("SceneName", name)
end

print(string.format("[HypeLife] 已建造 %d 个摄影棚", #names))
