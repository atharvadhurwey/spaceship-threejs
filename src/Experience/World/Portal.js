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

    this.canExitPortal = false;
    this.isGameEnding = false;

    this._handlePortalCheat = this.enter.bind(this);
    this._updateCameraProjection = () => this.camera.updateProjectionMatrix();

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

    const geometry = new THREE.PlaneGeometry(10, 10, 64, 64);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 5, -5);
    this.mesh.scale.set(0, 0, 0);
    this.scene.add(this.mesh);

    window.addEventListener('keydown', (event) => { if (event.key === 'p') { this._handlePortalCheat() } });

    if (this.debug.active) 
    {
      const portalFolder = (this.map.debugFolder || this.debug.ui).addFolder({ title: 'Portal' });
      portalFolder.addBinding(this.uniforms.uFrequency, 'value', { label: 'Frequency', min: 0, max: 10, step: 0.01 });
      portalFolder.addBinding(this.uniforms.uDistortion, 'value', { label: 'Distortion', min: 0, max: 0.1, step: 0.001 });
      portalFolder.addBinding(this.uniforms.uNoiseScale, 'value', { label: 'Noise Scale', min: 0, max: 10, step: 0.1 });
      portalFolder.addBinding(this.uniforms.uNoiseOffset, 'value', { label: 'Noise Offset', min: 0, max: 2, step: 0.01 });
      portalFolder.addBinding(this.uniforms.uBrightness, 'value', { label: 'Brightness', min: 0, max: 2, step: 0.01 });
      portalFolder.addBinding(this.uniforms.uFacOffset, 'value', { label: 'Factor Offset', min: -2, max: 2, step: 0.01 });
      portalFolder.addBinding(this.uniforms.uColor, 'value', { label: 'Color', view: 'color', color: { type: 'float' } });
    }
  }

  update(deltaTime) 
  {
    if (this.uniforms)
    {
      this.uniforms.uTime.value += deltaTime * 0.02;
    }
  }

  enter() 
  {
    if (this.canExitPortal) return;

    if (this.experience.world.ship) { this.experience.world.ship.toggleCollisions() }

    if (this.experience.world.levelManager) { this.experience.world.levelManager.isTransitioning = true; }

    this.isGameEnding = this.map.activeFloor && this.map.activeFloor.name === 'VoidFloor';

    const tl = gsap.timeline({
      onComplete: () =>
      {
        this.canExitPortal = true;
        if (!this.isGameEnding)
        {
          setTimeout(() => this.exit(), 2000);
        }
      }
    });

    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" }, 0);
    tl.to(this.uniforms.uOpacity, { value: 1.0, duration: 0.5, ease: "power2.out" }, 0);
    tl.fromTo(this.uniforms.uFacOffset, { value: 2.0 }, { value: 0.1, duration: 0.1, ease: "power2.out" }, 0);

    this.originalFov = this.camera.fov;

    for (const chunk of this.map.chunks)
    {
      chunk.visible = false;
    }

    if (this.map.activeFloor)
    {
      const currentThemeInst = this.experience.world.environment.currentThemeInstance;
      const isWater = this.map.activeFloor.name === 'WaterFloor';
      const isSand = this.map.activeFloor.name === 'SandFloor';

      if (this.isGameEnding)
      {
        this.map.activeFloor.destroy();
        this.map.clearCurrentEnvironment();
      }

      this.mesh.material.uniforms.uColor.value.set('#000000');

      if (isWater || isSand)
      {
        currentThemeInst.planetBackground.visible = false;

        if (isWater)
        {
          currentThemeInst.clouds.visible = false;
          this.mesh.material.uniforms.uColor.value.set('#ff0000');
        }
        if (isSand)
        {
          currentThemeInst.backgroundScreen.visible = false;
          currentThemeInst.pyramid.visible = false;
          this.mesh.material.uniforms.uColor.value.set('#ffffff');
        }

        this.map.activeFloor.mesh.material.depthTest = false;
        tl.fromTo(this.map.activeFloor.mesh.material.uniforms.uOpacity, { value: 1 }, { value: 0.0, duration: 0.5, ease: "power2.outIn" }, 0);
      }
    }

    tl.to(this.mesh.scale, { x: 50, y: 50, z: 50, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.mesh.position, { z: 100, duration: 1.0, ease: "power2.outIn" }, 0);
    tl.to(this.uniforms.uEnterProgress, { value: 1.0, duration: 2.0, ease: "power2.outIn" }, 0);

    tl.to(this.camera, {
      fov: 90, duration: 2.0, ease: "power2.outIn",
      onUpdate: this._updateCameraProjection
    }, 0);
    tl.to(this.uniforms.uFacOffset, { value: 0.0, duration: 0.8, ease: "power2.outIn" }, 0);

    if (this.isGameEnding) 
    {
      const creditsScreen = document.querySelector('.end-credits-screen');
      if (creditsScreen) 
      {
        tl.fromTo(creditsScreen,
          { opacity: 0, display: 'none' },
          { opacity: 1, display: 'flex', duration: 2.0, ease: 'power2.inOut' },
          1.0
        );
      }
    }
  }

  exit() 
  {
    if (!this.canExitPortal) return;

    if (this.experience.world.ship) { this.experience.world.ship.toggleCollisions() }

    const env = this.experience.world.environment;
    if (env.currentTheme === 'pillar') env.switchTheme('pyramid');
    else if (env.currentTheme === 'pyramid') env.switchTheme('eye');

    const tl = gsap.timeline({
      onComplete: () =>
      {
        this.mesh.scale.set(0, 0, 0);
        this.mesh.position.set(0, 5, -5);
        this.canExitPortal = false;

        if (this.experience.world.levelManager) { this.experience.world.levelManager.onTransitionComplete(); }
      }
    });

    const fadeInTarget = (target, duration = 2.0) =>
    {
      if (!target) return;

      tl.set(target, { visible: true }, 0);

      const uniqueMaterials = new Set();

      target.traverse((child) =>
      {
        if (child.isMesh && child.material)
        {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => uniqueMaterials.add(mat));
        }
      });

      uniqueMaterials.forEach(mat =>
      {
        mat.transparent = true;
        tl.fromTo(mat, { opacity: 0 }, { opacity: 1, duration: duration, ease: "power2.outIn" }, 0);
      });
    };

    for (const chunk of this.map.chunks)
    {
      fadeInTarget(chunk, 1.0);
    }

    if (this.map.activeFloor)
    {
      const currentThemeInst = this.experience.world.environment.currentThemeInstance;
      const isWater = this.map.activeFloor.name === 'WaterFloor';
      const isSand = this.map.activeFloor.name === 'SandFloor';

      if (isWater || isSand)
      {
        tl.fromTo(this.map.activeFloor.mesh.material.uniforms.uOpacity, { value: 0 }, { value: 1.0, duration: 0.5, ease: "power2.outIn" }, 0);
        fadeInTarget(currentThemeInst.planetBackground, 2.0);

        if (isWater) fadeInTarget(currentThemeInst.clouds, 2.0);
        if (isSand)
        {
          fadeInTarget(currentThemeInst.backgroundScreen, 2.0);
          fadeInTarget(currentThemeInst.pyramid, 2.0);
        }
      }
    }

    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.mesh.position, { z: 0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.uniforms.uEnterProgress, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.uniforms.uFacOffset, { value: -1.0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.camera, {
      fov: this.originalFov || 45, duration: 2.0, ease: "power2.outIn",
      onUpdate: this._updateCameraProjection
    }, 0);
    tl.to(this.uniforms.uOpacity, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
  }

  dispose() 
  {
    window.removeEventListener('keydown', (event) => { if (event.key === 'p') { this._handlePortalCheat() } });
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.scene.remove(this.mesh);
  }
}