"""Convert a local Mai source asset for /kungfu.

Run: blender -b -Y --python scripts/prepare-kungfu-mai.py -- /path/to/DOA_-_Mai_Shiranui.blend
Source and license notes: public/models/kungfu/README.md.
"""
from pathlib import Path
import sys
import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]

PRIMARY={'Hips':'DEF-spine','Spine':'abdomenLower','Spine1':'abdomenUpper','Spine2':'chestLower','Neck':'neckLower','Neck1':'neckUpper','Head':'head neck upper','MaiSash':'Tail_1'}
PRIMARY['MaiSkirt']='Skirt_front_1'
ALIASES={'hip':'Hips','pelvis':'Hips','chestUpper':'Spine2','Breast.L':'Spine2','Breast.R':'Spine2','Butt.L':'Hips','Butt.R':'Hips','Genitals':'Hips'}
for prefix,side in [('l','Left'),('r','Right')]:
    for suffix,target in [('Collar','Shoulder'),('ShldrBend','Arm'),('ForearmBend','ForeArm'),('Hand','Hand'),('ThighBend','UpLeg'),('Shin','Leg'),('Foot','Foot'),('Toe','ToeBase')]:
        PRIMARY[side+target]=prefix+suffix
    for suffix,target in [('ShldrTwist','Arm'),('ForearmTwist','ForeArm'),('ThighTwist','UpLeg'),('Metatarsals','Foot')]:
        ALIASES[prefix+suffix]=side+target
    for source,target in [('Thumb','Thumb'),('Index','Index'),('Mid','Middle'),('Ring','Ring'),('Pinky','Pinky')]:
        for i in range(1,4): PRIMARY[f'{side}Hand{target}{i}']=f'{prefix}{source}{i}'
    for i in range(1,5):ALIASES[f'{prefix}Carpal{i}']=side+'Hand'
ALIASES.update({v:k for k,v in PRIMARY.items()})


def group_target(name):
    if name in ALIASES:return ALIASES[name]
    if name.startswith(('head ', 'hair ', 'Ponytail')):return 'Head'
    if name.startswith('Tail_'):return 'MaiSash'
    if name.startswith('Skirt_front_'):return 'MaiSkirt'
    if name.startswith(('Skirt_', 'Genital', 'Butt')):return 'Hips'
    if name.startswith(('lSmallToe','lBigToe')):return 'LeftToeBase'
    if name.startswith(('rSmallToe','rBigToe')):return 'RightToeBase'
    if 'breast' in name.lower():return 'Spine2'
    if name.startswith(('lPectoral','rPectoral')):return 'Spine2'
    return None


def offset_front_skirt(mesh):
    """Keep the waistband fixed and give the lower panel clearance from the thighs."""
    top=max(v.co.z for v in mesh.vertices)
    height=top-min(v.co.z for v in mesh.vertices)
    for vertex in mesh.vertices:
        distance=max(0.0,min(1.0,((top-vertex.co.z)/height-.15)/.85))
        vertex.co.y-=.045*distance*distance*(3-2*distance)


def rebind(source,meshes):
    scale=1.65/1.8982
    source_heads={key:(source.matrix_world@source.data.bones[name].head_local)*scale for key,name in PRIMARY.items()}
    source_tails={key:(source.matrix_world@source.data.bones[name].tail_local)*scale for key,name in PRIMARY.items()}
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/realistic-characters/man-avatarsdk.glb'))
    imported=set(bpy.data.objects)-before
    rig=next(o for o in imported if o.type=='ARMATURE')
    for o in imported:
        if o!=rig:bpy.data.objects.remove(o,do_unlink=True)
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    sash=rig.data.edit_bones.new('MaiSash');sash.head=source_heads['MaiSash'];sash.tail=sash.head+Vector((0,0,.1));sash.parent=rig.data.edit_bones['Hips']
    skirt=rig.data.edit_bones.new('MaiSkirt');skirt.head=source_heads['MaiSkirt'];skirt.tail=skirt.head+Vector((0,0,.1));skirt.parent=rig.data.edit_bones['Hips']
    bpy.ops.object.mode_set(mode='OBJECT')
    reference={b.name:(b.head_local.copy(),b.tail_local.copy(),b.parent.name if b.parent else None) for b in rig.data.bones}
    source_heads['Neck2']=source_heads['Neck1'].lerp(source_heads['Head'],.5)
    new_heads={};rotations={}
    next_joint={}
    for side in ['Left','Right']:
        next_joint.update({side+'Arm':side+'ForeArm',side+'ForeArm':side+'Hand',side+'UpLeg':side+'Leg',side+'Leg':side+'Foot',side+'Foot':side+'ToeBase'})
    for name,(head,tail,parent) in reference.items():
        point=source_heads.get(name)
        rotation=Quaternion()
        if point is not None and name.startswith(('Left','Right')) and 'Shoulder' not in name and name in source_tails:
            child=next_joint.get(name)
            source_vector=(source_heads[child] if child else source_tails[name])-point
            reference_vector=(reference[child][0] if child else tail)-head
            if source_vector.length>1e-5 and reference_vector.length>1e-5:
                rotation=source_vector.rotation_difference(reference_vector)
        rotations[name]=rotation
        if point is None:
            new_heads[name]=new_heads[parent]+(head-reference[parent][0]) if parent else head.copy()
        elif parent in source_heads:
            new_heads[name]=new_heads[parent]+rotations[parent]@(point-source_heads[parent])
        else:new_heads[name]=point.copy()
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for obj in meshes:
        for mod in obj.modifiers:mod.show_viewport=False;mod.show_render=False
        bpy.context.view_layer.update()
        mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph),preserve_all_data_layers=True,depsgraph=depsgraph)
        names={g.index:g.name for g in obj.vertex_groups}
        weights=[]
        fallback='Head' if obj.name.startswith(('Hair','Body_eye','Body_teeth')) else 'Hips'
        for v in mesh.vertices:
            mapped={}
            for group in v.groups:
                target=group_target(names[group.group])
                if target:mapped[target]=mapped.get(target,0)+group.weight
            if not mapped:mapped={fallback:1.0}
            total=sum(mapped.values());mapped={k:v/total for k,v in mapped.items() if v>0}
            point=(obj.matrix_world@v.co)*scale
            v.co=sum((weight*(new_heads[name]+rotations[name]@(point-source_heads[name])) for name,weight in mapped.items()),Vector())
            weights.append(mapped)
        if obj.name=='Classic_Costume1_6':offset_front_skirt(mesh)
        obj.modifiers.clear();obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.data=mesh
        obj.vertex_groups.clear()
        groups={name:obj.vertex_groups.new(name=name) for name in set(k for w in weights for k in w)}
        for index,weights in enumerate(weights):
            for name,weight in weights.items():groups[name].add([index],weight,'REPLACE')
        mod=obj.modifiers.new('KungfuRig','ARMATURE');mod.object=rig;obj.parent=rig
        for polygon in mesh.polygons:polygon.use_smooth=True
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones:
        offset=bone.tail-bone.head;bone.head=new_heads[bone.name];bone.tail=bone.head+offset
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.data.objects.remove(source,do_unlink=True)
    rig.name='Mai_Kungfu_Rig'
    return rig


def keep_classic_outfit():
    names = {'Body', 'Body_eyelashes', 'Body_eyes', 'Body_teeth',
             'Hair_Back', 'Hair_Base', 'Hair_Front', 'Hair_Ribbon', 'Mai_rig'}
    names.update(f'Classic_Costume1_{index}' for index in range(1,7))
    for obj in list(bpy.data.objects):
        if obj.name not in names:
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            obj.hide_set(False)
            obj.hide_viewport = False
            obj.hide_render = False
    return [o for o in bpy.data.objects if o.type == 'MESH']


def read_source(path):
    bpy.ops.wm.open_mainfile(filepath=str(path), use_scripts=False)
    meshes = keep_classic_outfit()
    rig = bpy.data.objects['Mai_rig']
    rig.animation_data_clear()
    rig.data.pose_position = 'REST'
    for mesh in meshes:
        for modifier in list(mesh.modifiers):
            if modifier.type != 'ARMATURE':
                mesh.modifiers.remove(modifier)
        mesh.animation_data_clear()
    bpy.context.view_layer.update()
    return rig, meshes



def prepare_materials(meshes):
    for material in {m for o in meshes for m in o.data.materials}:
        nodes=material.node_tree.nodes
        texture=nodes.get('Изображение-текстура.001') if material.name=='24_face_0.6_1_1' else nodes.get('Изображение-текстура')
        image=texture.image if texture else None
        assert image, material.name
        material.node_tree.nodes.clear()
        shader=nodes.new('ShaderNodeBsdfPrincipled');out=nodes.new('ShaderNodeOutputMaterial');out.is_active_output=True
        tex=nodes.new('ShaderNodeTexImage');tex.image=image
        links=material.node_tree.links;links.new(tex.outputs['Color'],shader.inputs['Base Color']);links.new(shader.outputs['BSDF'],out.inputs['Surface'])
        shader.inputs['Roughness'].default_value=.55
        if material.name.startswith(('Mai_hair','25_alpha')):
            links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
            material.surface_render_method='DITHERED'
        material.use_backface_culling=False


def create_body_collider():
    """A skinned collision surface; runtime hides it and refits its spatial index."""
    body=bpy.data.objects['Body']
    collider=body.copy();collider.data=body.data.copy();collider.name='MaiBodyCollider'
    bpy.context.collection.objects.link(collider)
    material=collider.data.materials[0]
    collider.data.materials.clear();collider.data.materials.append(material)
    for polygon in collider.data.polygons:polygon.material_index=0
    bpy.context.view_layer.objects.active=collider
    collider.select_set(True)
    modifier=collider.modifiers.new('CollisionSurface','DECIMATE');modifier.ratio=.08
    bpy.ops.object.modifier_move_up(modifier=modifier.name)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def main():
    source_path = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
    source, meshes = read_source(source_path)
    prepare_materials(meshes)
    rebind(source, meshes)
    create_body_collider()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(ROOT / 'public/models/kungfu/mai-shiranui.glb'),
        export_format='GLB', export_animations=False, export_morph=False,
        export_yup=True, use_selection=True, export_extras=False,
    )


if __name__ == '__main__':
    main()
