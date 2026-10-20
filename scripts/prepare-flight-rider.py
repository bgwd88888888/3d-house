"""Bake the project's existing AvatarSDK head/hands for the local flight scene.

Usage: blender --background --python scripts/prepare-flight-rider.py -- source.glb output.glb
The source model's terms still apply; this is not a CC0 asset.
"""
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


def bake_mesh(obj):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    transform = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world.identity()
    for vertex in obj.data.vertices:
        vertex.co = transform @ vertex.co
    obj.select_set(False)


def reduce_mesh(obj, triangles):
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("Flight detail budget", "DECIMATE")
    current = sum(len(face.vertices) - 2 for face in obj.data.polygons)
    modifier.ratio = min(1, triangles / max(1, current))
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def main():
    source, output = sys.argv[sys.argv.index("--") + 1:]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
    keep = []
    for obj in list(bpy.data.objects):
        if obj.name not in {"AvatarHead", "AvatarLeftEyeball", "AvatarRightEyeball", "AvatarBody"}:
            continue
        bake_mesh(obj)
        if obj.name == "AvatarBody":
            mesh = bmesh.new()
            mesh.from_mesh(obj.data)
            bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if abs(v.co.x) < 0.66], context="VERTS")
            mesh.to_mesh(obj.data)
            mesh.free()
            for vertex in obj.data.vertices:
                x, y, _ = vertex.co
                side = 1 if x > 0 else -1
                reach = abs(x) - 0.66
                vertex.co = Vector((side * (0.48 + reach * 0.3), -(y + 0.034) + 0.02, 1.27 - reach * 0.96))
            obj.name = "FlightHands"
            reduce_mesh(obj, 1600)
        else:
            for vertex in obj.data.vertices:
                x, y, z = vertex.co
                vertex.co = Vector((-x * 1.073, -y * 1.073, (z - 1.433) * 1.073 + 1.91))
            reduce_mesh(obj, 6000 if obj.name == "AvatarHead" else 500)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        # Baked pose: morph targets, bones and animation tracks are unnecessary.
        if obj.data.shape_keys:
            obj.shape_key_clear()
        keep.append(obj)
    for obj in list(bpy.data.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for image in bpy.data.images:
        if image.size[0] > 512:
            image.scale(512, round(image.size[1] * 512 / image.size[0]))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(Path(output).resolve()), export_format="GLB",
        use_selection=True, export_animations=False, export_skins=False,
        export_morph=False, export_image_format="AUTO",
    )
    print("Flight anatomy triangles:", sum(len(p.vertices) - 2 for obj in keep for p in obj.data.polygons))


if __name__ == "__main__":
    main()
