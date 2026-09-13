local player=game.Players.LocalPlayer
local ui=player.PlayerGui:WaitForChild("HeroPlaygroundGui"):WaitForChild("HeroPlaygroundClientAction")
local remote=game.ReplicatedStorage.HeroPlaygroundRemote
local fx=workspace:WaitForChild("HeroPlaygroundClientEffects")
local specs=remote:InvokeServer("GetState").effects
local rows={}
assert(ui:Invoke({action="SwitchHero",heroId="sun_shangxiang"}).ok);task.wait(.6)
for _,spec in specs do
 assert(ui:Invoke({action="PreviewEffect",effectId=spec.id}).ok);task.wait(.12)
 local folder=fx:GetChildren()[1];assert(folder,"no folder")
 local cue=folder:FindFirstChild("SkillCue");assert(cue and cue:IsA("BillboardGui"),"no cue "..spec.id)
 assert(cue.Adornee==player.Character.Head,"wrong head");assert(not cue.AlwaysOnTop,"cue through walls");assert(cue.MaxDistance==85)
 local text=cue:FindFirstChild("CueName",true);assert(text and text.Text==spec.label,"wrong name")
 local offset=cue.StudsOffsetWorldSpace.Y;local peak=0
 for sample=1,20 do
  task.wait(spec.duration/20)
  local count=0
  for _,p in fx:GetDescendants()do
   if p:IsA("BasePart")then
    count+=1;assert(p.Anchored and not p.CanCollide and not p.CanTouch and not p.CanQuery)
    for _,v in {p.CFrame:GetComponents()}do assert(v==v and math.abs(v)<1000)end
   end
  end
  peak=math.max(peak,count);assert(count<200,"part budget "..spec.id.." "..count)
 end
 assert(cue.Parent==nil,"cue retained");assert(#fx:GetChildren()==0,"folder retained")
 assert(player.Character.Humanoid.Health==100)
 table.insert(rows,{id=spec.id,label=text.Text,headBound=true,initialHeight=offset,peakParts=peak,expired=true})
end
for _,hero in {"lu_bu","guo_jia","sun_shangxiang"}do
 assert(ui:Invoke({action="SwitchHero",heroId=hero}).ok);task.wait(.55)
 assert(ui:Invoke({action="PreviewEffect",effectId="heal"}).ok);task.wait(.15)
 local old=fx:GetChildren()[1];assert(old.SkillCue.Adornee==player.Character.Head)
 assert(ui:Invoke({action="PreviewEffect",effectId="arrows"}).ok);task.wait(.15)
 assert(old.Parent==nil and #fx:GetChildren()==1,"replacement retained")
 assert(ui:Invoke({action="CancelEffect"}).ok);task.wait(.15);assert(#fx:GetChildren()==0,"cancel retained")
end
assert(ui:Invoke({action="PreviewEffect",effectId="arrows"}).ok);task.wait(.15)
assert(ui:Invoke({action="SwitchHero",heroId="zhao_yun"}).ok);task.wait(.6);assert(#fx:GetChildren()==0,"switch retained")
assert(ui:Invoke({action="SwitchHero",heroId="sun_shangxiang"}).ok)
return game.HttpService:JSONEncode({pass=true,effects=rows,replacement=true,cancel=true,switch=true})
