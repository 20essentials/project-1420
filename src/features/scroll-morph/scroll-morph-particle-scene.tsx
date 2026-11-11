import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { R3FPointsFX, type R3FPointsFXRefType } from 'r3f-points-fx';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createScrollMorphModels } from '@/features/scroll-morph/scroll-morph-models';

const particleColor = new THREE.Color('#ffffff');
const rainbowFragmentModifier = `
vec3 hsvToRgb(vec3 hsv) {
  vec3 rgb = clamp(
    abs(mod(hsv.x * 6.0 + vec3(0.0, 4.0, 2.0), vec3(6.0)) - vec3(3.0)) - vec3(1.0),
    vec3(0.0),
    vec3(1.0)
  );
  rgb = rgb * rgb * (vec3(3.0) - vec3(2.0) * rgb);
  return hsv.z * mix(vec3(1.0), rgb, hsv.y);
}

vec4 modifier(int index) {
  float radius = length(gl_PointCoord - vec2(0.5));
  float pointAlpha = 1.0 - smoothstep(0.28, 0.5, radius);
  vec3 depthAxis = normalize(vec3(0.32, 0.58, 0.75));
  float localDepth = dot(normalize(vPosition), depthAxis) * 0.5 + 0.5;
  float cameraDepth = clamp((1.0 - gl_FragCoord.z) * 4.0, 0.0, 1.0);
  float depth = clamp(localDepth * 0.82 + cameraDepth * 0.18, 0.0, 1.0);
  float angle = atan(vPosition.y, vPosition.x) / 6.28318530718 + 0.5;
  float hue = fract(angle * 0.72 + depth * 0.46 + float(index) * 0.035 + uTime * 0.018);
  vec3 color = hsvToRgb(vec3(hue, 0.82, 1.0));
  float highlight = pow(max(dot(normalize(vPosition), depthAxis), 0.0), 6.0) * 0.55;
  color = color * (0.68 + depth * 0.52) + vec3(highlight);

  return vec4(color, uAlpha * pointAlpha * (0.72 + depth * 0.28));
}
`;

const ScrollMorphParticles = () => {
  const pointsRef = useRef<R3FPointsFXRefType>(null);
  const groupRef = useRef<THREE.Group>(null);
  const activeModel = useRef(0);
  const smoothProgress = useRef(0);
  const models = useMemo(createScrollMorphModels, []);
  const { size } = useThree();
  const isMobile = size.width < 640;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    return () => {
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
    const smoothing = 1 - Math.exp(-delta * 2.4);

    smoothProgress.current += (scrollProgress - smoothProgress.current) * smoothing;

    const modelIndex = Math.min(Math.floor(smoothProgress.current), models.length - 2);
    const transitionProgress = Math.max(
      0,
      Math.min(1, smoothProgress.current - modelIndex)
    );
    const easedProgress = transitionProgress ** 2 * (3 - 2 * transitionProgress);
    const focusProgress = Math.sin(Math.PI * transitionProgress) ** 2;
    const scrollPosition = THREE.MathUtils.clamp(
      smoothProgress.current / (models.length - 1),
      0,
      1
    );

    if (modelIndex !== activeModel.current) {
      pointsRef.current?.setModelA(modelIndex);
      pointsRef.current?.setModelB(modelIndex + 1);
      activeModel.current = modelIndex;
    }

    pointsRef.current?.updateProgress(easedProgress);
    pointsRef.current?.updateTime(clock.elapsedTime);

    if (groupRef.current && !reducedMotion) {
      groupRef.current.position.x = Math.sin(scrollPosition * Math.PI * 2) * 0.1;
      groupRef.current.position.y = Math.sin(scrollPosition * Math.PI) * 0.08;
      groupRef.current.position.z = focusProgress * 0.22;
      groupRef.current.scale.setScalar(
        (isMobile ? 0.82 : 1.12) * (1 + focusProgress * 0.7)
      );
      groupRef.current.rotation.set(
        0.14 + Math.sin(scrollPosition * Math.PI * 2) * 0.08,
        scrollPosition * Math.PI * 2,
        Math.cos(scrollPosition * Math.PI * 2) * 0.1
      );
    }
  });

  return (
    <group ref={groupRef} scale={isMobile ? 0.82 : 1.12}>
      <R3FPointsFX
        ref={pointsRef}
        models={models}
        modelA={0}
        modelB={1}
        pointsCount={isMobile ? 6400 : 18225}
        pointSize={0.034}
        baseColor={particleColor}
        alpha={0.96}
        sizeAttenutation
        fragmentModifier={rainbowFragmentModifier}
      />
    </group>
  );
};

export const ScrollMorphParticleScene = () => {
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
    <div className='particle-scene' aria-hidden='true'>
      <Canvas
        camera={{ position: [0, 0, isMobile ? 5.3 : 4.2], fov: 40 }}
        dpr={[1, 1.35]}
        frameloop={visible && !reducedMotion ? 'always' : 'demand'}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      >
        <ScrollMorphParticles />
      </Canvas>
    </div>
  );
};
