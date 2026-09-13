local p=game.Players.LocalPlayer
local gui=p.PlayerGui.HeroPlaygroundGui
local ui=gui.HeroPlaygroundClientAction
local remote=game.ReplicatedStorage.HeroPlaygroundRemote
local fx=workspace.HeroPlaygroundClientEffects
local controls=gui.PreviewEffectControls
local count=0;for _,c in controls.Cards:GetChildren()do if c:IsA("TextButton")then count+=1 end end
assert(count==15,"trick buttons");assert(not controls.Modes.Visible)
assert(controls.Cards.AutomaticCanvasSize==Enum.AutomaticSize.Y)
for _,payload in {{effectId="invalid"},{effectId="tiesuo",previewMode="equip"},{effectId="eight_trigrams",previewMode="wrong"},{effectId="eight_trigrams",previewMode={}}}do
 assert(not remote:InvokeServer("PreviewEffect",payload).ok,"invalid accepted")
end
for _,id in {"tiesuo","shandian","zhuge_crossbow","eight_trigrams","hualiu"}do
 assert(ui:Invoke({action="PreviewEffect",effectId=id}).ok);task.wait(.12)
 local old=fx:GetChildren()[1];assert(old)
 assert(ui:Invoke({action="PreviewEffect",effectId="green_dragon_blade",previewMode="equip"}).ok);task.wait(.18)
 assert(old.Parent==nil and #fx:GetChildren()==1,"replace")
 local next=fx:GetChildren()[1];assert(next:GetAttribute("PreviewMode")=="equip")
 assert(ui:Invoke({action="CancelEffect"}).ok);task.wait(.2);assert(#fx:GetChildren()==0,"cancel")
end
assert(ui:Invoke({action="PreviewEffect",effectId="shandian"}).ok);task.wait(.12)
assert(ui:Invoke({action="SwitchHero",heroId="zhao_yun"}).ok);task.wait(.6);assert(#fx:GetChildren()==0,"switch")
assert(ui:Invoke({action="PreviewEffect",effectId="eight_trigrams",previewMode="equip"}).ok);task.wait(.15)
assert(fx:GetChildren()[1].SkillCue.Adornee==p.Character.Head,"new head")
assert(ui:Invoke({action="CancelEffect"}).ok);task.wait(.2)
assert(ui:Invoke({action="SwitchHero",heroId="sun_shangxiang"}).ok);task.wait(.55)
return game.HttpService:JSONEncode({pass=true,invalidPayloads=4,replacement=5,cancel=5,switch=true,newHead=true,uiTricks=count,scrolling=true})