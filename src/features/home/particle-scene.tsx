import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { R3FPointsFX, type R3FPointsFXRefType } from 'r3f-points-fx';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createParticleModels } from '@/features/home/particle-models';

const particleColor = new THREE.Color('#d3ff4a');

const desktopPositionPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.32, 0.12, 0),
  new THREE.Vector3(-0.86, 0.34, 0),
  new THREE.Vector3(0.82, -0.26, 0),
  new THREE.Vector3(-1.05, 0.26, 0),
  new THREE.Vector3(0.72, -0.18, 0),
  new THREE.Vector3(-0.3, 0.04, 0)
]);
const mobilePositionPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.2, 0.05, 0),
  new THREE.Vector3(-0.13, 0.12, 0),
  new THREE.Vector3(0.15, -0.1, 0),
  new THREE.Vector3(-0.16, 0.1, 0),
  new THREE.Vector3(0.12, -0.08, 0),
  new THREE.Vector3(-0.04, 0.02, 0)
]);
const rotationPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.08, 0, 0),
  new THREE.Vector3(0.22, -0.48, 0.42),
  new THREE.Vector3(-0.32, 0.55, -0.56),
  new THREE.Vector3(0.34, -0.58, 0.32),
  new THREE.Vector3(-0.28, 0.42, -0.45),
  new THREE.Vector3(0.1, -0.3, 0.2)
]);
const mobileRotationPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.08, 0, 0),
  new THREE.Vector3(0.16, -0.34, 0.28),
  new THREE.Vector3(-0.24, 0.38, -0.36),
  new THREE.Vector3(0.26, -0.4, 0.24),
  new THREE.Vector3(-0.2, 0.3, -0.3),
  new THREE.Vector3(0.08, -0.2, 0.14)
]);

const MorphingParticles = () => {
  const pointsRef = useRef<R3FPointsFXRefType>(null);
  const groupRef = useRef<THREE.Group>(null);
  const activeModel = useRef(0);
  const smoothProgress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const motionPosition = useRef(new THREE.Vector3());
  const motionRotation = useRef(new THREE.Vector3());
  const models = useMemo(createParticleModels, []);
  const { size } = useThree();
  const isMobile = size.width < 640;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2
      };
    };

    window.addEventListener('pointermove', updatePointer, { passive: true });

    return () => {
      window.removeEventListener('pointermove', updatePointer);
      models.forEach(model => model.geometry.dispose());
      models[0].material.dispose();
    };
  }, [models]);

  useFrame(({ clock }, delta) => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress =
      !reducedMotion && scrollableHeight > 0
        ? (window.scrollY / scrollableHeight) * (models.length - 1)
        : 0;
    const smoothing = 1 - Math.exp(-delta * 2.2);

    smoothProgress.current += (scrollProgress - smoothProgress.current) * smoothing;

    const modelIndex = Math.min(Math.floor(smoothProgress.current), models.length - 2);
    const transitionProgress = Math.max(
      0,
      Math.min(1, smoothProgress.current - modelIndex)
    );
    const easedProgress = transitionProgress ** 2 * (3 - 2 * transitionProgress);
    const focusProgress = Math.sin(Math.PI * transitionProgress) ** 2;
    const baseScale = isMobile ? 0.78 : 1.12;
    const pathProgress = THREE.MathUtils.clamp(smoothProgress.current / (models.length - 1), 0, 1);
    (isMobile ? mobilePositionPath : desktopPositionPath).getPoint(pathProgress, motionPosition.current);
    (isMobile ? mobileRotationPath : rotationPath).getPoint(pathProgress, motionRotation.current);

    if (modelIndex !== activeModel.current) {
      pointsRef.current?.setModelA(modelIndex);
      pointsRef.current?.setModelB(modelIndex + 1);
      activeModel.current = modelIndex;
    }

    pointsRef.current?.updateProgress(easedProgress);
    pointsRef.current?.updateTime(clock.elapsedTime);

    if (groupRef.current && !reducedMotion) {
      groupRef.current.position.x = motionPosition.current.x;
      groupRef.current.position.y = motionPosition.current.y;
      groupRef.current.position.z = focusProgress * 0.35;
      groupRef.current.scale.setScalar(baseScale * (1 + focusProgress * 1.15));
      groupRef.current.rotation.set(
        motionRotation.current.x + pointer.current.y * 0.12,
        motionRotation.current.y + Math.sin(clock.elapsedTime * 0.24) * 0.12 + pointer.current.x * 0.18,
        motionRotation.current.z + pointer.current.x * 0.04
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={isMobile ? [0.2, 0.05, 0] : [1.32, 0.12, 0]}
      scale={isMobile ? 0.78 : 1.12}
    >
      <R3FPointsFX
        ref={pointsRef}
        models={models}
        modelA={0}
        modelB={1}
        pointsCount={isMobile ? 2800 : 8100}
        pointSize={0.024}
        baseColor={particleColor}
        alpha={0.72}
        sizeAttenutation
      />
    </group>
  );
};

export const ParticleScene = () => {
  const [visible, setVisible] = useState(!document.hidden);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    const updateViewport = () => setIsMobile(window.innerWidth < 640);

    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('resize', updateViewport, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  return (
    <div className="particle-scene" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, isMobile ? 5.3 : 4.2], fov: 40 }}
        dpr={[1, 1.35]}
        frameloop={visible && !reducedMotion ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      >
        <MorphingParticles />
      </Canvas>
    </div>
  );
};
