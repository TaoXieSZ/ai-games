--!strict
-- 存档服务：DataStore 持久化（客户端通过 SaveAPI RemoteFunction 读写）。
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local store = DataStoreService:GetDataStore("HypeLifeSave_v1")

local remote = Instance.new("RemoteFunction")
remote.Name = "SaveAPI"
remote.Parent = ReplicatedStorage

local pendingSaves: { [number]: any } = {}

local function load(userId: number): any
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

-- 玩家离开与服务器关闭兜底
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
