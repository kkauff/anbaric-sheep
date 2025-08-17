import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Bot } from "./AutomataUtils";
import styles from "./App.module.scss";

interface ThreeBoidsRendererProps {
  bots: Bot[];
  width: number;
  height: number;
  xRange: number;
  yRange: number;
  showTrails?: boolean;
}

export const ThreeBoidsRenderer: React.FC<ThreeBoidsRendererProps> = ({
  bots,
  width,
  height,
  xRange,
  yRange,
  showTrails = false,
}) => {
  // Don't render if dimensions are invalid, but use fallback dimensions
  const hasValidDimensions =
    width > 0 && height > 0 && xRange > 0 && yRange > 0;

  if (!hasValidDimensions) {
    console.log("Invalid dimensions, using fallback:", {
      width,
      height,
      xRange,
      yRange,
    });
    // Return empty div but don't block rendering completely
    return (
      <div
        className={styles.threeContainer}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const boidsGroupRef = useRef<THREE.Group>();
  const trailsGroupRef = useRef<THREE.Group>();
  const animationIdRef = useRef<number>();

  // Store boid meshes and trail data
  const boidMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const trailDataRef = useRef<Map<number, THREE.Vector3[]>>(new Map());

  // Get theme colors from CSS custom properties
  const getThemeColors = () => {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      background:
        computedStyle.getPropertyValue("--background-color").trim() ||
        "#ffffff",
      boid: computedStyle.getPropertyValue("--bot-color").trim() || "#d9822b",
      trail: computedStyle.getPropertyValue("--bot-color").trim() || "#d9822b",
    };
  };

  const [themeColors, setThemeColors] = useState(getThemeColors);

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      setThemeColors(getThemeColors());
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);

    // Also listen for manual theme changes (if you implement theme switching)
    window.addEventListener("themechange", updateTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
      window.removeEventListener("themechange", updateTheme);
    };
  }, []);

  // Initialize Three.js scene (only once)
  useEffect(() => {
    if (!mountRef.current) return;

    console.log("Initializing Three.js scene");

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeColors.background);
    sceneRef.current = scene;

    // Camera (orthographic for 2D-like view) - will be updated separately
    const camera = new THREE.OrthographicCamera(
      -100,
      100,
      100,
      -100,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer - will be resized separately
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Groups for organizing objects
    const boidsGroup = new THREE.Group();
    const trailsGroup = new THREE.Group();
    scene.add(boidsGroup);
    scene.add(trailsGroup);
    boidsGroupRef.current = boidsGroup;
    trailsGroupRef.current = trailsGroup;

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []); // Only initialize once

  // Update scene background when theme changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(themeColors.background);
    }
  }, [themeColors.background]);

  // Update camera when dimensions change
  useEffect(() => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.left = -xRange;
      cameraRef.current.right = xRange;
      cameraRef.current.top = yRange;
      cameraRef.current.bottom = -yRange;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    }
  }, [width, height, xRange, yRange]);

  // Create boid geometry (clean triangle shape)
  const createBoidGeometry = () => {
    const geometry = new THREE.BufferGeometry();

    // Simple clean triangle
    const vertices = new Float32Array([
      0,
      8,
      0, // tip
      -4,
      -4,
      0, // left base
      4,
      -4,
      0, // right base
    ]);

    const indices = new Uint16Array([
      0,
      1,
      2, // triangle
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    return geometry;
  };

  // Create or update boid meshes
  useEffect(() => {
    if (!boidsGroupRef.current) return;

    console.log("Updating boids:", {
      botsCount: bots.length,
      width,
      height,
      xRange,
      yRange,
      firstBot: bots[0],
    });

    const boidsGroup = boidsGroupRef.current;
    const boidMeshes = boidMeshesRef.current;

    // Create geometry and material
    const geometry = createBoidGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: themeColors.boid,
      transparent: true,
      opacity: 0.9,
    });

    // Update existing boids and create new ones
    const currentBoidIds = new Set(bots.map((bot) => bot.id));

    // Remove boids that no longer exist
    for (const [id, mesh] of boidMeshes.entries()) {
      if (!currentBoidIds.has(id)) {
        boidsGroup.remove(mesh);
        boidMeshes.delete(id);
        trailDataRef.current.delete(id);
      }
    }

    // Update or create boids
    bots.forEach((bot) => {
      let mesh = boidMeshes.get(bot.id);

      if (!mesh) {
        // Create new boid
        mesh = new THREE.Mesh(geometry, material.clone());
        boidsGroup.add(mesh);
        boidMeshes.set(bot.id, mesh);
        trailDataRef.current.set(bot.id, []);
        console.log(`Created new boid ${bot.id} at position:`, {
          x: bot.xPos,
          y: bot.yPos,
        });
      }

      // Update position
      mesh.position.set(bot.xPos, bot.yPos, 0);

      // Update rotation based on velocity
      const angle = Math.atan2(-bot.yVel, bot.xVel);
      mesh.rotation.z = angle - Math.PI / 2; // Adjust for boid pointing up by default

      // Update color based on theme
      (mesh.material as THREE.MeshBasicMaterial).color.setStyle(
        themeColors.boid
      );

      // Update trail data
      if (showTrails) {
        const trailData = trailDataRef.current.get(bot.id)!;
        trailData.push(new THREE.Vector3(bot.xPos, bot.yPos, 0));

        // Keep only last 50 points
        if (trailData.length > 50) {
          trailData.shift();
        }
      }
    });

    console.log("Boids group children count:", boidsGroup.children.length);

    // Update trails
    if (showTrails && trailsGroupRef.current) {
      // Clear existing trails
      trailsGroupRef.current.clear();

      // Create new trails
      trailDataRef.current.forEach((trailData, botId) => {
        if (trailData.length > 1) {
          const points = trailData.slice();
          const geometry = new THREE.BufferGeometry().setFromPoints(points);

          // Create gradient material for fading effect
          const material = new THREE.LineBasicMaterial({
            color: themeColors.trail,
            transparent: true,
            opacity: 0.6,
          });

          const line = new THREE.Line(geometry, material);
          trailsGroupRef.current!.add(line);
        }
      });
    }
  }, [bots, themeColors, showTrails]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={styles.threeContainer}
      style={{ width: "100%", height: "100%" }}
    />
  );
};
