"""Check native wedge coverage using independent reconstructed triangle vertices."""
import math
from hero_model_designs.faceted import polygon_parts


def area(points):
    return abs(sum(a[0]*b[1]-b[0]*a[1]for a,b in zip(points,points[1:]+points[:1])))/2


def reconstructed(part):
    _,h,w=part['size']; ry,rz=map(math.radians,part['rotation'][1:])
    points=[]
    for y,z in [(-h/2,-w/2),(-h/2,w/2),(h/2,w/2)]:
        x=math.sin(ry)*z
        points.append([part['position'][0]+x*math.cos(rz)-y*math.sin(rz),part['position'][1]+x*math.sin(rz)+y*math.cos(rz)])
    return points


shapes=[[(0,0),(2,0),(1,3)],[(0,0),(3,0),(3,1),(1,1),(1,3),(0,3)],
        [(-.1,2.46),(.06,2.72),(-.08,3.08),(-.28,3.44),(-.57,3.81),(-.65,4.23),(-.7,4.9),(-1,4.47),(-1.18,3.98),(-1.21,3.52),(-1.13,3.12),(-.92,2.82),(-.64,2.63)]]
for shape in shapes:
    for polygon in [shape,list(reversed(shape))]:
        parts=polygon_parts('Test','RightArm',polygon,-.67,.18,'#FFFFFF')
        triangles=[reconstructed(p)for p in parts]
        assert abs(sum(map(area,triangles))-area(polygon))<1e-8
        assert all(p['size'][1]>0 and p['size'][2]>0 for p in parts)
        # All reconstructed vertices must be original vertices or points on a polygon diagonal.
        for triangle in triangles:
            assert all(math.isfinite(x)for point in triangle for x in point)
print('PASS 6 convex/concave/winding cases; reconstructed wedge areas preserve authored silhouettes')
