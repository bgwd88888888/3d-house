import { Bone, Euler, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Quaternion, SkinnedMesh, Vector3, type Material } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { sampleRiderPose, type RiderMotion } from "./flightRiderPose";

export const FAIRY_SCALE = 1.35;
export const FAIRY_MODEL_URL = "/models/sword-flight/fairy-rider.glb";

function createFairyMaterial(source: Material) {
  const material = source.clone();
  if ((material as MeshBasicMaterial).isMeshBasicMaterial || (material as MeshStandardMaterial).isMeshStandardMaterial) {
    const surface = material as MeshBasicMaterial | MeshStandardMaterial;
    if (surface.name === "FairyJadeSilk") surface.color.set("#9acac3");
    if (surface.name.includes("Shoes")) surface.color.set("#cbdedb");
    if (surface.name.includes("EyeIris")) surface.color.set("#97c5b6");
    if ((surface as MeshStandardMaterial).isMeshStandardMaterial) {
      const lit = surface as MeshStandardMaterial;
      lit.envMapIntensity = 0.35;
      lit.roughness = Math.max(0.5, lit.roughness);
    }
  }
  return material;
}

export function createFlightFairy(source: Object3D) {
  const model = clone(source);
  const materials = new Map<Material, Material>();
  const bones = new Map<string, { bone: Bone; rest: Quaternion; parent: Quaternion; inverseParent: Quaternion }>();
  const blink: { mesh: Mesh; index: number }[] = [];
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if ((object as Mesh).isMesh) {
      const mesh = object as Mesh;
      const owned = (material: Material) => {
        if (!materials.has(material)) materials.set(material, createFairyMaterial(material));
        return materials.get(material)!;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(owned) : owned(mesh.material);
      mesh.castShadow = mesh.receiveShadow = false;
      if (mesh.morphTargetDictionary?.Blink !== undefined) blink.push({ mesh, index: mesh.morphTargetDictionary.Blink });
      if ((mesh as SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
    }
    if ((object as Bone).isBone) {
      const parent = object.parent!.getWorldQuaternion(new Quaternion());
      bones.set(object.name, { bone: object as Bone, rest: object.quaternion.clone(), parent, inverseParent: parent.clone().invert() });
    }
  });
  const hips = bones.get("J_Bip_C_Hips")!.bone;
  const restHip = hips.position.clone();
  const hipUp = new Vector3(0, 1, 0).applyQuaternion(bones.get("J_Bip_C_Hips")!.inverseParent);
  const rotation = new Quaternion();
  const euler = new Euler();
  const hair = [...bones].filter(([name]) => name.startsWith("HairJoint") && !name.includes("end"));
  const skirt = [...bones].filter(([name]) => name.includes("Skirt") && name.endsWith("0"))
    .map(([, entry]) => ({ bone: entry.bone, rest: entry.bone.position.clone(), up: new Vector3(0, 1, 0).applyQuaternion(entry.inverseParent) }));
  const apply = (name: string, x: number, y: number, z: number) => {
    const entry = bones.get(name);
    if (!entry) return;
    rotation.setFromEuler(euler.set(x, y, z, "XYZ"));
    entry.bone.quaternion.copy(entry.inverseParent).multiply(rotation).multiply(entry.parent).multiply(entry.rest);
  };
  return {
    model, bones,
    apply(motion: RiderMotion) {
      const pose = sampleRiderPose(motion);
      for (const [name, angles] of Object.entries(pose.joints)) apply(name, ...angles);
      hips.position.copy(restHip).addScaledVector(hipUp, -pose.drop);
      for (const part of skirt) part.bone.position.copy(part.rest).addScaledVector(part.up, Math.max(0, pose.drop - 0.045));
      hair.forEach(([name], index) => apply(name, -pose.flight * 0.035 + pose.hairSway * Math.sin(index + 1), pose.bank * 0.08, pose.hairSway * 0.4));
      for (const target of blink) target.mesh.morphTargetInfluences![target.index] = pose.blink;
    },
    dispose() { materials.forEach((material) => material.dispose()); },
  };
}
