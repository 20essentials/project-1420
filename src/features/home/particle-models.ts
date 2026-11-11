import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const createKleinBottle = () =>
  new ParametricGeometry(
    (u, v, target) => {
      const angle = u * Math.PI * 2;
      const around = v * Math.PI * 2;
      const radius =
        2 + Math.cos(angle / 2) * Math.sin(around) - Math.sin(angle / 2) * Math.sin(2 * around);

      target.set(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        Math.sin(angle / 2) * Math.sin(around) + Math.cos(angle / 2) * Math.sin(2 * around)
      );
      target.multiplyScalar(0.35);
    },
    112,
    56
  );

const createHelix = () => {
  const strandCount = 128;
  const strandCurves = [0, Math.PI].map(
    phase =>
      new THREE.CatmullRomCurve3(
        Array.from({ length: strandCount }, (_, index) => {
          const progress = index / (strandCount - 1);
          const angle = progress * Math.PI * 7 + phase;

          return new THREE.Vector3(Math.cos(angle) * 0.42, (progress - 0.5) * 1.9, Math.sin(angle) * 0.42);
        })
      )
  );
  const geometries: THREE.BufferGeometry[] = strandCurves.map(
    curve => new THREE.TubeGeometry(curve, 192, 0.035, 8, false)
  );

  for (let index = 0; index <= 14; index += 1) {
    const progress = index / 14;
    const angle = progress * Math.PI * 7;
    const first = new THREE.Vector3(Math.cos(angle) * 0.42, (progress - 0.5) * 1.9, Math.sin(angle) * 0.42);
    const second = new THREE.Vector3(
      Math.cos(angle + Math.PI) * 0.42,
      (progress - 0.5) * 1.9,
      Math.sin(angle + Math.PI) * 0.42
    );
    const direction = new THREE.Vector3().subVectors(second, first);
    const rung = new THREE.CylinderGeometry(0.018, 0.018, direction.length(), 6, 1);

    rung.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    );
    rung.translate((first.x + second.x) / 2, first.y, (first.z + second.z) / 2);
    geometries.push(rung);
  }

  const geometry = mergeGeometries(geometries);
  geometries.forEach(item => item.dispose());

  if (!geometry) throw new Error('Could not construct the particle helix geometry.');

  return geometry;
};

const createMobiusBand = () =>
  new ParametricGeometry(
    (u, v, target) => {
      const angle = u * Math.PI * 2;
      const width = (v - 0.5) * 0.62;
      const radius = 0.7 + width * Math.cos(angle / 2);

      target.set(radius * Math.cos(angle), radius * Math.sin(angle), width * Math.sin(angle / 2));
    },
    144,
    28
  );

const createCrystal = () => {
  const geometry = new THREE.IcosahedronGeometry(0.9, 3);
  const positions = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const distortion =
      1 +
      0.14 *
        Math.sin(vertex.x * 11) *
        Math.sin(vertex.y * 11) *
        Math.sin(vertex.z * 11);

    vertex.multiplyScalar(distortion);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  return geometry;
};

export const createParticleModels = () => {
  const geometries = [
    new THREE.TorusKnotGeometry(0.72, 0.2, 240, 16, 2, 3),
    createKleinBottle(),
    createHelix(),
    createMobiusBand(),
    createCrystal(),
    new THREE.TorusKnotGeometry(0.62, 0.18, 256, 14, 3, 5)
  ];
  const material = new THREE.MeshBasicMaterial();

  return geometries.map(geometry => {
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const radius = geometry.boundingSphere?.radius ?? 1;
    geometry.scale(1.05 / radius, 1.05 / radius, 1.05 / radius);

    return new THREE.Mesh(geometry, material);
  });
};
