import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

const createPetalTorus = () =>
  new ParametricGeometry(
    (u, v, target) => {
      const angle = u * Math.PI * 2;
      const around = v * Math.PI * 2;
      const majorRadius = 0.58 + Math.cos(angle * 5) * 0.12;
      const tubeRadius = 0.2 + Math.sin(angle * 5 + around * 2) * 0.05;
      const radius = majorRadius + tubeRadius * Math.cos(around);

      target.set(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        tubeRadius * Math.sin(around) + Math.sin(angle * 3) * 0.08
      );
    },
    128,
    48
  );

export const createScrollMorphModels = () => {
  const geometries = [
    new THREE.SphereGeometry(0.9, 64, 48),
    new THREE.TorusGeometry(0.62, 0.26, 48, 112),
    new THREE.DodecahedronGeometry(0.92, 1),
    createPetalTorus(),
    new THREE.ConeGeometry(0.82, 1.5, 64, 36),
    new THREE.CylinderGeometry(0.68, 0.68, 1.35, 64, 32, true)
  ];
  const material = new THREE.MeshBasicMaterial();

  return geometries.map(geometry => {
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const bounds = geometry.boundingBox;

    if (bounds) {
      const center = bounds.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);
    }

    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere?.radius ?? 1;

    geometry.scale(1.05 / radius, 1.05 / radius, 1.05 / radius);

    return new THREE.Mesh(geometry, material);
  });
};
