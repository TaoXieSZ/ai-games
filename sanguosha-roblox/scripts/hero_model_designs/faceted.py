"""Planar silhouettes made from native WedgeParts, shared by browser/GLB/Roblox."""
import math


def polygon_parts(name, bone, outline, z, thickness, color, material='Metal'):
    """Triangulate a simple XY polygon and split triangles into right prisms."""
    points = [tuple(p) for p in outline]
    area = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points, points[1:]+points[:1]))
    if area < 0: points.reverse()
    def cross(a,b,c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def inside(p,a,b,c):
        return cross(a,b,p)>=-1e-9 and cross(b,c,p)>=-1e-9 and cross(c,a,p)>=-1e-9
    triangles=[]
    remaining=list(points)
    while len(remaining)>3:
        for i,b in enumerate(remaining):
            a,c=remaining[i-1],remaining[(i+1)%len(remaining)]
            if cross(a,b,c)<=1e-9: continue
            if any(inside(p,a,b,c) for j,p in enumerate(remaining) if j not in {i,(i-1)%len(remaining),(i+1)%len(remaining)}):continue
            triangles.append((a,b,c));remaining.pop(i);break
        else:raise ValueError('Invalid silhouette polygon '+name)
    triangles.append(tuple(remaining))
    parts=[]
    for triangle in triangles:
        # Project onto the longest edge so its altitude lies within that edge.
        a,b,c=max([(triangle[i],triangle[(i+1)%3],triangle[(i+2)%3]) for i in range(3)],key=lambda t:math.dist(t[0],t[1]))
        delta=[b[i]-a[i]for i in range(2)];length=math.hypot(*delta);unit=[v/length for v in delta]
        projection=sum((c[i]-a[i])*unit[i]for i in range(2));foot=[a[i]+unit[i]*projection for i in range(2)]
        height=math.dist(foot,c)
        for end in [a,b]:
            width=math.dist(foot,end)
            if width<1e-7 or height<1e-7:continue
            u=[(end[i]-foot[i])/width for i in range(2)];v=[(c[i]-foot[i])/height for i in range(2)]
            clockwise=u[0]*v[1]-u[1]*v[0]<0
            x=[-t for t in u] if clockwise else u
            angle=math.degrees(math.atan2(x[1],x[0]))
            pos=[(end[i]+c[i])/2 for i in range(2)]+[z]
            parts.append(dict(name=name+str(len(parts)),bone=bone,shape='wedge',position=pos,size=[thickness,height,width],rotation=[0,90 if clockwise else -90,angle],color=color,material=material))
    return parts
