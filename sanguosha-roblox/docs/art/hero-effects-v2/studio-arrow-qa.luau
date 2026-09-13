local ui=game.Players.LocalPlayer.PlayerGui.HeroPlaygroundGui.HeroPlaygroundClientAction
local fx=workspace.HeroPlaygroundClientEffects
local rows={}
for _,id in {"slash","arrows"}do
 assert(ui:Invoke({action="PreviewEffect",effectId=id}).ok)
 local peak=0;local samples=0
 for i=1,50 do
  task.wait(.028)
  for _,p in fx:GetDescendants()do
   if p:IsA("BasePart")and(p.Name=="BowArrowStreak"or p.Name:match("^ArrowRain_%d+_%d+$"))then
    local prefix=if p.Name=="BowArrowStreak"then"BowArrowHead"else p.Name:gsub("ArrowRain_","ArrowRainHead_")
    local tip=p.Position+p.CFrame.LookVector*p.Size.Z/2
    for _,sign in {-1,1}do
     local h=p.Parent:FindFirstChild(prefix.."_"..sign)
     if h then local a=h.Position+h.CFrame.LookVector*h.Size.Z/2;local b=h.Position-h.CFrame.LookVector*h.Size.Z/2;local error=math.min((tip-a).Magnitude,(tip-b).Magnitude);assert(error<.15,"head detached "..p.Name.." "..error);peak=math.max(peak,error);samples+=1 end
    end
   end
  end
 end
 assert(samples>0,"no samples "..id);table.insert(rows,{id=id,samples=samples,maxTipError=peak});assert(ui:Invoke({action="CancelEffect"}).ok);task.wait(.15)
end
return game.HttpService:JSONEncode({pass=true,rows=rows})
