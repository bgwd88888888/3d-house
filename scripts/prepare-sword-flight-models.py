"""Run with Blender --background --python this_file -- SOURCE_DIRECTORY OUTPUT_DIRECTORY.

Inputs: Poly Haven CC0 pine_sapling_small and rock_moss_set_01 1K glTFs.
The pine input must include the twig alpha map in its diffuse texture.
No source assets are overwritten; only the named optimized GLBs are exported.
"""
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector


def simplify_pine_needles(obj):
    """Retain every needle; simplify its cross-section instead of deleting foliage."""
    source = obj.data
    parents = list(range(len(source.vertices)))

    def root(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    for face in source.polygons:
        if face.material_index != 1:
            continue
        first = root(face.vertices[0])
        for vertex in face.vertices:
            parents[root(vertex)] = first
    groups = {}
    solid_faces = []
    for face in source.polygons:
        if face.material_index == 1:
            groups.setdefault(root(face.vertices[0]), []).append(face)
        else:
            solid_faces.append(face)
    needle_positions, needle_faces, needle_uvs = [], [], []
    for faces in groups.values():
        if sum(len(face.vertices) - 2 for face in faces) > 24:
            solid_faces.extend(faces)
            continue
        uv_by_vertex = {source.loops[loop].vertex_index: tuple(source.uv_layers.active.data[loop].uv)
                        for face in faces for loop in face.loop_indices}
        points = np.array([tuple(source.vertices[index].co) for index in uv_by_vertex])
        center = points.mean(axis=0)
        _, _, axes = np.linalg.svd(points - center, full_matrices=False)
        plane = (points - center) @ axes[:2].T
        lo, hi = plane.min(axis=0), plane.max(axis=0)
        corners = np.array([[lo[0], lo[1]], [hi[0], lo[1]], [hi[0], hi[1]], [lo[0], hi[1]]])
        source_uvs = np.array(list(uv_by_vertex.values()))
        mapping = np.linalg.lstsq(np.column_stack([plane, np.ones(len(plane))]), source_uvs, rcond=None)[0]
        uvs = np.column_stack([corners, np.ones(4)]) @ mapping
        uvs = np.clip(uvs, source_uvs.min(axis=0), source_uvs.max(axis=0))
        start = len(needle_positions)
        needle_positions.extend((center + corners @ axes[:2]).tolist())
        needle_faces.extend([(start, start + 1, start + 2), (start, start + 2, start + 3)])
        needle_uvs.extend([uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]])

    vertex_map = {}
    positions, faces, uvs, materials = [], [], [], []
    for face in solid_faces:
        indices = []
        for loop in face.loop_indices:
            index = source.loops[loop].vertex_index
            if index not in vertex_map:
                vertex_map[index] = len(positions)
                positions.append(tuple(source.vertices[index].co))
            indices.append(vertex_map[index])
            uvs.append(tuple(source.uv_layers.active.data[loop].uv))
        faces.append(indices)
        materials.append(face.material_index)
    solid = bpy.data.meshes.new("Pine branches")
    solid.from_pydata(positions, [], faces)
    for material in source.materials:
        solid.materials.append(material)
    layer = solid.uv_layers.new()
    for index, uv in enumerate(uvs):
        layer.data[index].uv = uv
    for face, material in zip(solid.polygons, materials):
        face.material_index = material
        face.use_smooth = True
    obj.data = solid
    modifier = obj.modifiers.new("Branch simplification", "DECIMATE")
    modifier.ratio = min(1, 3000 / sum(len(face.vertices) - 2 for face in solid.polygons))
    bpy.ops.object.modifier_apply(modifier=modifier.name)

    needles = bpy.data.meshes.new("Preserved needle silhouettes")
    needles.from_pydata(needle_positions, [], needle_faces)
    needles.materials.append(source.materials[1])
    layer = needles.uv_layers.new()
    for index, uv in enumerate(needle_uvs):
        layer.data[index].uv = uv
    needle_object = bpy.data.objects.new("Needles", needles)
    bpy.context.collection.objects.link(needle_object)
    needle_object.select_set(True)
    bpy.ops.object.join()
    print(f"Preserved {len(needle_positions) // 4} individual needles", flush=True)


def prepare_model(source, object_name, destination, height=None, width=None, budget=12000):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    chosen = bpy.data.objects.get(object_name)
    if chosen is None:
        raise ValueError(f"Missing model {object_name}")
    for obj in list(bpy.context.scene.objects):
        if obj != chosen:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.objects.active = chosen
    chosen.select_set(True)
    chosen.location = (0, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    triangles = sum(len(poly.vertices) - 2 for poly in chosen.data.polygons)
    if "pine_sapling" in object_name:
        simplify_pine_needles(chosen)
    elif triangles > budget:
        modifier = chosen.modifiers.new("Flight triangle budget", "DECIMATE")
        modifier.ratio = budget / triangles
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    bounds = [Vector(corner) for corner in chosen.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in bounds) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in bounds) for axis in range(3)))
    center = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z))
    factor = height / (maximum.z - minimum.z) if height else width / max(maximum.x - minimum.x, maximum.y - minimum.y)
    for vertex in chosen.data.vertices:
        vertex.co = (vertex.co - center) * factor
    chosen.name = destination.stem
    # Geometry and textures are shared across all runtime instances.
    for material in chosen.data.materials:
        if not material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                node.inputs["Metallic"].default_value = 0
                if "Specular IOR Level" in node.inputs:
                    node.inputs["Specular IOR Level"].default_value = 0.25
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", use_selection=True,
                             export_animations=False, export_yup=True, export_image_format="AUTO")
    result = {"file": destination.name, "triangles": sum(len(poly.vertices) - 2 for poly in chosen.data.polygons),
              "bytes": destination.stat().st_size, "materials": len(chosen.data.materials)}
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    source_dir, output_dir = map(Path, sys.argv[sys.argv.index("--") + 1:])
    output_dir.mkdir(parents=True, exist_ok=True)
    prepare_model(source_dir / "pine_sapling_small/pine-with-alpha.gltf", "pine_sapling_small_a",
                  output_dir / "pine.glb", height=6.2, budget=12000)
    prepare_model(source_dir / "rock_moss_set_01/rock_moss_set_01.gltf", "rock_moss_set_01_rock01",
                  output_dir / "moss-rock.glb", width=2.8, budget=3000)
