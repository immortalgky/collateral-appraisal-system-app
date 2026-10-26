import {
  type BufferGeometry,
  type InstancedMesh,
  Line,
  LineSegments,
  type Material,
  Matrix4,
  Mesh,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface FlatPart {
  geometry: BufferGeometry;
  material: Material;
}

/**
 * Collapse a built object, however many meshes it has, into ONE geometry per material, in the
 * object's own space. Drawing N copies of it as instances is then a handful of draw calls instead
 * of N times its mesh count: what makes a 300-house village affordable.
 *
 * Outlines (edge lines) are left out; instanced parts are expanded, one copy per instance.
 */
export function flatten(root: Object3D): FlatPart[] {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<Material, BufferGeometry[]>();
  const add = (geometry: BufferGeometry, material: Material, matrix: Matrix4) => {
    const g = geometry.clone().applyMatrix4(matrix);
    // Merging needs every geometry indexed the same way.
    const flat = g.index ? g.toNonIndexed() : g;
    const list = byMaterial.get(material) ?? [];
    list.push(flat);
    byMaterial.set(material, list);
  };
  const m = new Matrix4();
  root.traverse(o => {
    if (o instanceof Line || o instanceof LineSegments || !(o instanceof Mesh)) return;
    if (Array.isArray(o.material)) return;
    const inst = o as InstancedMesh;
    if (inst.isInstancedMesh) {
      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, m);
        add(o.geometry, o.material, new Matrix4().multiplyMatrices(o.matrixWorld, m));
      }
    } else {
      add(o.geometry, o.material, o.matrixWorld);
    }
  });
  const out: FlatPart[] = [];
  for (const [material, geoms] of byMaterial) {
    const merged = mergeGeometries(geoms, false);
    if (merged) out.push({ geometry: merged, material });
  }
  return out;
}
