local player=game.Players.LocalPlayer
local ui=player.PlayerGui:WaitForChild("HeroPlaygroundGui"):WaitForChild("HeroPlaygroundClientAction")
local remote=game.ReplicatedStorage.HeroPlaygroundRemote
local fx=workspace:WaitForChild("HeroPlaygroundClientEffects")
local specs=remote:InvokeServer("GetState").effects
assert(#specs==43,"catalog count")
local cases={}
for _,s in specs do
 table.insert(cases,{spec=s,mode="trigger"})
 if s.category=="equipment" then table.insert(cases,{spec=s,mode="equip"}) end
end
local rows={}
for index=1,math.min(65,#cases)do
 local c=cases[index];local spec=c.spec
 local response=ui:Invoke({action="PreviewEffect",effectId=spec.id,previewMode=c.mode});assert(response.ok,game.HttpService:JSONEncode(response));task.wait(.12)
 local folder=fx:GetChildren()[1];assert(folder,"no folder")
 assert(folder:GetAttribute("PreviewMode")==c.mode,"mode")
 local cue=folder:FindFirstChild("SkillCue");assert(cue and cue.Adornee==player.Character.Head,"head cue")
 assert(cue:FindFirstChild("CueName",true).Text==spec.label,"name")
 local peak=0;local names={}
 for sample=1,8 do
  task.wait(spec.duration/8)
  local count=0
  for _,p in fx:GetDescendants()do
   if p:IsA("BasePart")then
    count+=1;names[p.Name]=true
    assert(p.Anchored and not p.CanCollide and not p.CanTouch and not p.CanQuery,"physics")
    for _,v in {p.CFrame:GetComponents()}do assert(v==v and math.abs(v)<1000,"finite")end
   end
  end
  peak=math.max(peak,count);assert(count<200,"part budget "..spec.id.." "..count)
 end
 task.wait(.15)
 assert(peak>0,"empty "..spec.id);assert(#fx:GetChildren()==0,"folder retained "..spec.id)
 assert(player.Character.Humanoid.Health==100,"health")
 table.insert(rows,{id=spec.id,mode=c.mode,peakParts=peak,names=names,expired=true})
end
return game.HttpService:JSONEncode({pass=true,rows=rows})