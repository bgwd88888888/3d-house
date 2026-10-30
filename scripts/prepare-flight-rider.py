"""Build a skinned flight fairy from VRoid's CC0 HairSample_Female.

Usage: blender -b --python scripts/prepare-flight-rider.py -- HairSample_Female.vrm output.glb
Retains the authored body, dress, face UVs and weights; no VRM runtime is required.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

TAIL_ROOTS = ['HairJoint-e7d28e69-662e-4477-aab0-b5306c3d289e', 'HairJoint-bdda9c05-5e10-4c8a-abe5-be7e2c14be93']
EAR_ROOTS = ['HairJoint-497a97b7-0bdc-4267-b035-69f3756b7131', 'HairJoint-657f1584-c779-4ae9-b57d-5930319d77a4']


def delete_faces(obj, predicate):
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.delete(mesh, geom=[p for p in mesh.faces if predicate(p)], context='FACES')
    bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if not v.link_faces], context='VERTS')
    mesh.to_mesh(obj.data)
    mesh.free()


def bone_family(rig, roots):
    return {b.name for name in roots for b in [rig.data.bones[name], *rig.data.bones[name].children_recursive]}


def connected_parts(obj):
    neighbors = [set() for _ in obj.data.vertices]
    for edge in obj.data.edges:
        a, b = edge.vertices
        neighbors[a].add(b)
        neighbors[b].add(a)
    unseen = set(range(len(neighbors)))
    while unseen:
        part = {unseen.pop()}
        stack = list(part)
        while stack:
            for index in neighbors[stack.pop()]:
                if index in unseen:
                    unseen.remove(index)
                    part.add(index)
                    stack.append(index)
        yield part


def tail_point(point):
    x, y, z = point
    t = max(0, 1.59 - z)
    return Vector((x * (1 - min(0.22, t)), y - t * 0.4, z - t * 1.65))


def skirt_point(point):
    x, y, z = point
    t = max(0, min(1, (1.085 - z) / (1.085 - 0.629)))
    return Vector((x * (1 + t * 0.24), y * (1 + t * 0.24), z - t * 0.52))


def reshape_hair(obj, rig):
    ears = bone_family(rig, EAR_ROOTS)
    ear_groups = {g.index for g in obj.vertex_groups if g.name in ears}
    ear_vertices = {v.index for v in obj.data.vertices if sum(g.weight for g in v.groups if g.group in ear_groups) > 0.05}
    for part in connected_parts(obj):
        if part & ear_vertices or (min(obj.data.vertices[i].co.z for i in part) > 1.56 and max(obj.data.vertices[i].co.z for i in part) > 1.65):
            ear_vertices.update(part)
    delete_faces(obj, lambda p: all(v.index in ear_vertices for v in p.verts) or obj.data.materials[p.material_index].name.endswith('HAIR_02'))
    tails = bone_family(rig, TAIL_ROOTS)
    groups = {g.index for g in obj.vertex_groups if g.name in tails}
    for vertex in obj.data.vertices:
        weight = sum(g.weight for g in vertex.groups if g.group in groups)
        if weight > 0.01:
            vertex.co = vertex.co.lerp(tail_point(vertex.co), min(1, weight))
    return tails


def reshape_dress(obj):
    # Thighs remain driven by the rig but are fully covered by the new long skirt.
    # Omit hidden skin to prevent it leaking through folded fabric during a stride.
    delete_faces(obj, lambda p: 'Body_00_SKIN' in obj.data.materials[p.material_index].name and min(v.co.z for v in p.verts) > 0.26 and max(v.co.z for v in p.verts) < 0.94)
    cloth = {index for index, material in enumerate(obj.data.materials) if 'Tops' in material.name}
    vertices = {i for p in obj.data.polygons if p.material_index in cloth for i in p.vertices if obj.data.vertices[i].co.z < 1.085}
    for index in vertices:
        obj.data.vertices[index].co = skirt_point(obj.data.vertices[index].co)
    # A second open overskirt follows the same authored folds and skeleton weights.
    outer = obj.copy()
    outer.data = obj.data.copy()
    bpy.context.collection.objects.link(outer)
    outer.name = 'FairyOverskirt'
    delete_faces(outer, lambda p: p.material_index not in cloth or max(v.co.z for v in p.verts) > 1.087)
    mesh = bmesh.new()
    mesh.from_mesh(outer.data)
    for side in [-1, 1]:
        bmesh.ops.bisect_plane(mesh, geom=list(mesh.verts)+list(mesh.edges)+list(mesh.faces), dist=0.00001, plane_co=(0,0,0), plane_no=(side*math.cos(0.47),-math.sin(0.47),0))
    bmesh.ops.delete(mesh, geom=[p for p in mesh.faces if abs(math.atan2(p.calc_center_median().x, p.calc_center_median().y)) < 0.4699], context='FACES')
    mesh.to_mesh(outer.data)
    mesh.free()
    for vertex in outer.data.vertices:
        vertex.co.x *= 1.08
        vertex.co.y *= 1.08
        vertex.co.z += max(0, 1.085 - vertex.co.z) * 0.06
    material = obj.data.materials[next(iter(cloth))].copy()
    material.name = 'FairyJadeSilk'
    outer.data.materials.clear()
    outer.data.materials.append(material)
    for polygon in outer.data.polygons:
        polygon.material_index = 0
    return outer


def prepare_face(obj):
    keys = obj.data.shape_keys.key_blocks
    smile = keys['target_2']
    deltas = [smile.data[i].co - keys['Basis'].data[i].co for i in range(len(obj.data.vertices))]
    for key in list(keys):
        if key.name not in {'Basis', 'target_12'}:
            obj.shape_key_remove(key)
    for key in obj.data.shape_keys.key_blocks:
        for index, point in enumerate(key.data):
            point.co += deltas[index] * 0.12
    obj.data.shape_keys.key_blocks['target_12'].name = 'Blink'


def flat_material(name, color, metallic=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = 0.5
    return material


def bind(obj, rig, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('Fairy skeleton', 'ARMATURE')
    modifier.object = rig
    obj.parent = rig


def add_jewelry(rig):
    gold = flat_material('FairyGold', (0.56, 0.39, 0.15), 0.65)
    pearl = flat_material('FairyPearl', (0.92, 0.86, 0.7))
    jade = flat_material('FairyJade', (0.14, 0.48, 0.4))
    pieces = []
    for side in [-1, 1]:
        center = Vector((side * 0.087, -0.027, 1.599))
        for petal in range(5):
            a = petal * math.tau / 5
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1, location=center + Vector((math.cos(a)*0.012, -0.003, math.sin(a)*0.012)))
            obj = bpy.context.object
            obj.scale = (0.009, 0.004, 0.009)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            obj.data.materials.append(pearl)
            bind(obj, rig, 'J_Bip_C_Head')
            pieces.append(obj)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.008, location=center + Vector((0, -0.008, 0)))
        obj = bpy.context.object
        obj.data.materials.append(jade)
        bind(obj, rig, 'J_Bip_C_Head')
        pieces.append(obj)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=(side * 0.09, -0.027, 1.566))
        obj = bpy.context.object
        obj.scale = (0.003, 0.003, 0.025)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(gold)
        bind(obj, rig, 'J_Bip_C_Head')
        pieces.append(obj)
    # Join decorative pieces by material at export, keeping head attachment weights.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces: obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    pieces[0].name = 'FairyHairpins'


def add_ribbons(rig):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for side, sign in [('L', -1), ('R', 1)]:
        parent = rig.data.edit_bones['J_Bip_C_UpperChest']
        for index in range(5):
            bone = rig.data.edit_bones.new(f'FairyRibbon{side}{index}')
            bone.head = (sign * 0.17, -0.08, 1.29 - index * 0.19)
            bone.tail = bone.head + Vector((0, 0, 0.06))
            bone.parent = parent
            parent = bone
    bpy.ops.object.mode_set(mode='OBJECT')
    material = flat_material('FairyRibbonSilk', (0.58, 0.82, 0.75))
    material.use_backface_culling = False
    for side, sign in [('L', -1), ('R', 1)]:
        vertices, faces = [], []
        for index in range(33):
            t = index / 32
            for edge in [-1, 1]:
                vertices.append((sign * 0.17 + edge * 0.035 * (1 - 0.35*t), -0.08 - math.sin(t*math.pi)*0.025, 1.29-t*0.76))
            if index < 32:
                a = index * 2
                faces.append((a, a+1, a+3, a+2))
        mesh = bpy.data.meshes.new('FairyRibbon')
        mesh.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new('FairyRibbon'+side, mesh)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(material)
        groups = [obj.vertex_groups.new(name=f'FairyRibbon{side}{i}') for i in range(5)]
        for index in range(33):
            progress = index/32*4
            root = min(3, int(progress))
            weight = progress - root
            groups[root].add([index*2,index*2+1], 1-weight, 'REPLACE')
            groups[root+1].add([index*2,index*2+1], weight, 'REPLACE')
        modifier = obj.modifiers.new('Fairy skeleton', 'ARMATURE')
        modifier.object = rig
        obj.parent = rig


def main():
    source, destination = sys.argv[sys.argv.index('--')+1:]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
    rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
    for obj in list(bpy.data.objects):
        if obj.type == 'MESH' and obj.name not in {'Face','Body','Hair001'}:
            bpy.data.objects.remove(obj, do_unlink=True)
    face, body, hair = [bpy.data.objects[name] for name in ['Face','Body','Hair001']]
    tails = reshape_hair(hair, rig)
    reshape_dress(body)
    prepare_face(face)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones:
        head = bone.head.copy()
        if 'Skirt' in bone.name and bone.name.endswith('0'):
            bone.parent = rig.data.edit_bones['J_Bip_C_Hips']
        if bone.name in tails:
            shift = tail_point(head) - head
        elif 'Skirt' in bone.name:
            shift = skirt_point(head) - head
        else:
            continue
        bone.head += shift
        bone.tail += shift
    bpy.ops.object.mode_set(mode='OBJECT')
    add_jewelry(rig)
    add_ribbons(rig)
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            for polygon in obj.data.polygons: polygon.use_smooth = True
    for image in bpy.data.images:
        if max(image.size) > 1024:
            ratio = 1024 / max(image.size)
            image.scale(max(1, round(image.size[0]*ratio)), max(1, round(image.size[1]*ratio)))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(Path(destination).resolve()), export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_morph=True, export_morph_normal=False, export_morph_tangent=False)
    print('Fairy model triangles:',sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons))


if __name__ == '__main__': main()
