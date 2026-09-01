--!strict
-- 存档服务：DataStore 持久化（客户端通过 SaveAPI RemoteFunction 读写）。
-- 注意：SaveAPI 必须无条件创建——地形未发布/无 DataStore 权限时降级为不存档，
-- 否则客户端 WaitForChild 会无限等待导致 UI 永不出现。
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local remote = Instance.new("RemoteFunction")
remote.Name = "SaveAPI"
remote.Parent = ReplicatedStorage

local store: any = nil
local okStore = pcall(function()
	store = DataStoreService:GetDataStore("HypeLifeSave_v1")
end)
if not okStore then
	warn("[HypeLife] DataStore 不可用（地形未发布或权限不足），存档功能已禁用")
end

local pendingSaves: { [number]: any } = {}

local function load(userId: number): any
	if not store then
		return nil
	end
	local ok, data = pcall(function()
		return store:GetAsync("p_" .. userId)
	end)
	if ok then
		return data
	end
	warn("[HypeLife] 存档读取失败：", data)
	return nil
end

local function save(userId: number, payload: any): boolean
	if not store then
		return false
	end
	local ok, err = pcall(function()
		store:SetAsync("p_" .. userId, payload)
	end)
	if not ok then
		warn("[HypeLife] 存档写入失败：", err)
	end
	return ok
end

remote.OnServerInvoke = function(player, action: string, payload)
	local userId = player.UserId
	if action == "load" then
		return load(userId)
	end
	if action == "save" then
		pendingSaves[userId] = payload
		return save(userId, payload)
	end
	return nil
end

Players.PlayerRemoving:Connect(function(player)
	local payload = pendingSaves[player.UserId]
	if payload then
		save(player.UserId, payload)
		pendingSaves[player.UserId] = nil
	end
end)

game:BindToClose(function()
	for userId, payload in pairs(pendingSaves) do
		task.spawn(function()
			save(userId, payload)
		end)
	end
	task.wait(2)
end)
