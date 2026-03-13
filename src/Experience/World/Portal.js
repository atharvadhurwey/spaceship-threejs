import * as THREE from 'three';
import gsap from 'gsap';

import portalFragShader from '../Shaders/Portal/frag.glsl';
import portalVertShader from '../Shaders/Portal/vert.glsl';

export default class Portal 
{
  constructor(experience, map) 
  {
    this.experience = experience;
    this.map = map;
    this.scene = this.experience.scene;
    this.camera = this.experience.camera.instance;
    this.debug = this.experience.debug;
    this.world = this.experience.world;

    this.canExitPortal = false;
    this.isGameEnding = false;
    this.isEntering = false;

    this.onEnterCheat = () => this.enter();

    this.init();
  }

  init() 
  {
    this.uniforms = {
      uTime: { value: 0 },
      uFrequency: { value: 1.4 },
      uDistortion: { value: 0.01 },
      uNoiseScale: { value: 2.0 },
      uNoiseOffset: { value: 0.1 },
      uBrightness: { value: 0.4 },
      uFacOffset: { value: 0.1 },
      uColor: { value: new THREE.Color(0.961, 0.592, 0.078) },
      uEnterProgress: { value: 0.0 },
      uOpacity: { value: 0.0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: portalVertShader,
      fragmentShader: portalFragShader,
      uniforms: this.uniforms,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 64, 64), material);
    this.mesh.position.set(0, 5, -5);
    this.mesh.scale.set(0, 0, 0);
    this.scene.add(this.mesh);

    this.experience.input.on('portalCheatPressed', this.onEnterCheat);

    if (this.debug.active) 
    {
      this.debugFolder = (this.map.debugFolder || this.debug.ui).addFolder({ title: 'Portal' });
      this.debugFolder.addBinding(this.uniforms.uFrequency, 'value', { label: 'Frequency', min: 0, max: 10, step: 0.01 });
      this.debugFolder.addBinding(this.uniforms.uDistortion, 'value', { label: 'Distortion', min: 0, max: 0.1, step: 0.001 });
      this.debugFolder.addBinding(this.uniforms.uNoiseScale, 'value', { label: 'Noise Scale', min: 0, max: 10, step: 0.1 });
      this.debugFolder.addBinding(this.uniforms.uNoiseOffset, 'value', { label: 'Noise Offset', min: 0, max: 2, step: 0.01 });
      this.debugFolder.addBinding(this.uniforms.uBrightness, 'value', { label: 'Brightness', min: 0, max: 2, step: 0.01 });
      this.debugFolder.addBinding(this.uniforms.uFacOffset, 'value', { label: 'Factor Offset', min: -2, max: 2, step: 0.01 });
      this.debugFolder.addBinding(this.uniforms.uColor, 'value', { label: 'Color', view: 'color', color: { type: 'float' } });
    }
  }

  update(deltaTime) 
  {
    this.uniforms.uTime.value += deltaTime * 0.02;
  }

  enter() 
  {
    if (this.isEntering || this.canExitPortal) return;
    this.isEntering = true;

    const { ship, levelManager, audioManager, environment } = this.world;

    if (ship) ship.toggleCollisions();
    if (audioManager) audioManager.suppressVolume(0.5);

    if (levelManager)
    {
      levelManager.isTransitioning = true;
      levelManager.hide(true);
    }

    const floor = this.map.activeFloor;
    this.isGameEnding = floor?.name === 'VoidFloor';

    const tl = gsap.timeline({
      onComplete: () =>
      {
        this.canExitPortal = true;
        if (!this.isGameEnding) setTimeout(() => this.exit(), 2000);
      }
    });

    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" }, 0)
      .to(this.uniforms.uOpacity, { value: 1.0, duration: 0.5, ease: "power2.out" }, 0)
      .fromTo(this.uniforms.uFacOffset, { value: 2.0 }, { value: 0.1, duration: 0.1, ease: "power2.out" }, 0);

    this.originalFov = this.camera.fov;

    for (const chunk of this.map.chunks)
    {
      chunk.visible = false;
    }

    if (floor) 
    {
      const currentThemeInst = environment.currentThemeInstance;
      if (typeof currentThemeInst.hide === 'function') currentThemeInst.hide();

      const floorColors = {
        WaterFloor: '#a20000',
        SandFloor: '#0000ff',
        DataStreamFloor: '#ff0000',
        HushFloor: '#ffffff'
      };

      this.mesh.material.uniforms.uColor.value.set(floorColors[floor.name] || '#000000');

      floor.mesh.material.depthTest = false;
      if (floor.mesh.material.uniforms?.uOpacity)
      {
        tl.fromTo(floor.mesh.material.uniforms.uOpacity, { value: 1 }, { value: 0.0, duration: 0.5, ease: "power2.outIn" }, 0);
      }

      if (this.isGameEnding)
      {
        floor.destroy();
        this.map.clearCurrentEnvironment();
      }
    }

    const updateCamera = () => this.camera.updateProjectionMatrix();

    tl.to(this.mesh.scale, { x: 50, y: 50, z: 50, duration: 2.0, ease: "power2.outIn" }, 0)
      .to(this.mesh.position, { z: 100, duration: 1.0, ease: "power2.outIn" }, 0)
      .to(this.uniforms.uEnterProgress, { value: 1.0, duration: 2.0, ease: "power2.outIn" }, 0)
      .to(this.camera, { fov: 90, duration: 2.0, ease: "power2.outIn", onUpdate: updateCamera }, 0)
      .to(this.uniforms.uFacOffset, { value: 0.0, duration: 0.8, ease: "power2.outIn" }, 0);

    if (this.isGameEnding)
    {
      const creditsScreen = document.querySelector('.end-credits-screen');
      if (creditsScreen)
      {
        tl.fromTo(creditsScreen, { opacity: 0, display: 'none' }, { opacity: 1, display: 'flex', duration: 2.0, ease: 'power2.inOut' }, 1.0);
      }
    }
  }

  exit() 
  {
    if (!this.canExitPortal) return;

    const { ship, levelManager, audioManager, environment } = this.world;

    if (audioManager) audioManager.restoreVolume(0.5);

    const themeTransitions = {
      pillarScape: 'redApex',
      redApex: 'dataStream',
      dataStream: 'hush',
      hush: 'voidEye'
    };
    if (themeTransitions[environment.currentTheme])
    {
      environment.switchTheme(themeTransitions[environment.currentTheme]);
    }

    const tl = gsap.timeline({
      onComplete: () =>
      {
        this.mesh.scale.set(0, 0, 0);
        this.mesh.position.set(0, 5, -5);
        this.canExitPortal = false;
        this.isEntering = false;

        if (ship) ship.toggleCollisions();
        if (levelManager) levelManager.onTransitionComplete();
      }
    });

    const uniqueMaterials = new Set();

    for (const chunk of this.map.chunks)
    {
      tl.set(chunk, { visible: true }, 0);
      chunk.traverse((child) =>
      {
        if (child.isMesh && child.material)
        {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => uniqueMaterials.add(mat));
        }
      });
    }

    uniqueMaterials.forEach(mat =>
    {
      mat.transparent = true;
      tl.fromTo(mat, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "power2.outIn" }, 0);
    });

    const floor = this.map.activeFloor;
    if (floor && (floor.name === 'WaterFloor' || floor.name === 'SandFloor')) 
    {
      tl.fromTo(floor.mesh.material.uniforms.uOpacity, { value: 0 }, { value: 1.0, duration: 0.5, ease: "power2.outIn" }, 0);
      environment.currentThemeInstance.appear(2.0);
    }

    const updateCamera = () => this.camera.updateProjectionMatrix();

    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: "power2.outIn" }, 0)
      .to(this.mesh.position, { z: 0, duration: 2.0, ease: "power2.outIn" }, 0)
      .to(this.uniforms.uEnterProgress, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0)
      .to(this.uniforms.uFacOffset, { value: -1.0, duration: 2.0, ease: "power2.outIn" }, 0)
      .to(this.camera, { fov: this.originalFov || 45, duration: 2.0, ease: "power2.outIn", onUpdate: updateCamera }, 0)
      .to(this.uniforms.uOpacity, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
  }

  dispose() 
  {
    if (this.experience.input)
    {
      this.experience.input.off('portalCheatPressed', this.onEnterCheat);
    }

    if (this.debugFolder)
    {
      this.debugFolder.dispose();
    }

    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.scene.remove(this.mesh);
  }
}