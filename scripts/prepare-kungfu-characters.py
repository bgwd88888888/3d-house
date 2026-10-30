"""Normalize the three Mixamo fighters for the existing Kung Fu animation rig.

Run: blender -b -Y --python scripts/prepare-kungfu-characters.py -- SOURCE_DIRECTORY
Source filenames and attribution: public/models/kungfu/README.md.
"""
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = [
    ("Akai_E_Espiritu", "akai", 1.72),
    ("Ninja", "ninja", 1.74),
    ("Kachujin_G_Rosales", "kachujin", 1.70),
]


def prepare_character(source, destination, height):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"
              and any(mod.type == "ARMATURE" and mod.object == rig for mod in obj.modifiers)]
    objects = [rig, *meshes]
    for obj in list(bpy.data.objects):
        if obj not in objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    minimum = min(point.z for point in points)
    factor = height / (max(point.z for point in points) - minimum)
    hips = rig.matrix_world @ rig.data.bones["mixamorig:Hips"].head_local
    transform = Matrix.Translation(Vector((-hips.x, -hips.y, -minimum)) * factor) @ Matrix.Scale(factor, 4)
    matrices = {obj: transform @ obj.matrix_world for obj in objects}
    for obj in objects:
        obj.matrix_world = matrices[obj]
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for bone in rig.data.bones:
        bone.name = bone.name.removeprefix("mixamorig:")
    for image in bpy.data.images:
        width, image_height = image.size
        if max(width, image_height) > 2048:
            ratio = 2048 / max(width, image_height)
            image.scale(round(width * ratio), round(image_height * ratio))
    bpy.ops.export_scene.gltf(
        filepath=str(destination), export_format="GLB", use_selection=True,
        export_animations=False, export_morph=False, export_yup=True, export_extras=False,
    )
    print(f"Prepared {destination.name}: {height:.2f} m, {destination.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    source_directory = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
    for source_name, name, height in CHARACTERS:
        prepare_character(source_directory / f"{source_name}.glb", ROOT / f"public/models/kungfu/{name}.glb", height)
