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

    window.addEventListener('dblclick', () => this.enter());

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

    if (this.experience.world.ship) { this.experience.world.ship.toggleCollisions() } // Disable Ship Collisions

    const tl = gsap.timeline({
      onComplete: () =>
      {
        this.canExitPortal = true;
        setTimeout(() =>
        {
          this.exit();
        }, 2000);
      }
    });

    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" }, 0);
    tl.to(this.uniforms.uOpacity, { value: 1.0, duration: 0.5, ease: "power2.out" }, 0);
    tl.fromTo(this.uniforms.uFacOffset, { value: 2.0 }, { value: 0.1, duration: 0.1, ease: "power2.out" }, 0);

    this.originalFov = this.camera.fov;

    // Hide Map Chunks
    for (const chunk of this.map.chunks)
    {
      chunk.traverse((child) =>
      {
        chunk.visible = false;
        if (child.isMesh && child.material)
        {
          child.material.opacity = 1;
          child.material.transparent = false;
        }
      });
    }

    // Hide specific floor elements
    if (this.map.activeFloor)
    {
      const currentThemeInst = this.experience.world.environment.currentThemeInstance;

      if (this.map.activeFloor.name === 'WaterFloor')
      {
        this.map.activeFloor.mesh.material.uniforms.uOpacity.value = 0;
        this.map.activeFloor.mesh.material.depthTest = false;
        currentThemeInst.planetBackground.visible = false;
        currentThemeInst.cloudMesh.visible = false;
      } else if (this.map.activeFloor.name === 'SandFloor')
      {
        currentThemeInst.planetBackground.visible = false;
        currentThemeInst.backgroundScreen.visible = false;
        currentThemeInst.pyramid.visible = false;
        this.map.activeFloor.mesh.visible = false;
      }
    }

    tl.to(this.mesh.scale, { x: 50, y: 50, z: 50, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.mesh.position, { x: this.mesh.position.x, y: this.mesh.position.y, z: 100, duration: 1.0, ease: "power2.outIn" }, 0);
    tl.to(this.uniforms.uEnterProgress, { value: 1.0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.camera, {
      fov: 90, duration: 2.0, ease: "power2.outIn",
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 0);
    tl.to(this.uniforms.uFacOffset, { value: 0.0, duration: 1.2, ease: "power2.outIn" }, 0);
  }

  exit() 
  {
    if (!this.canExitPortal) return;

    if (this.experience.world.ship) { this.experience.world.ship.toggleCollisions() } // Enable Ship Collisions

    if (this.experience.world.environment.currentTheme === 'pillar')
    {
      this.experience.world.environment.switchTheme('pyramid');
    } else
    {
      this.experience.world.environment.switchTheme('pillar');
    }

    const tl = gsap.timeline({
      onComplete: () =>
      {
        this.mesh.scale.set(0, 0, 0);
        this.mesh.position.set(0, 5, -5);
        this.canExitPortal = false;
      }
    });

    tl.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.mesh.position, { x: this.mesh.position.x, y: this.mesh.position.y, z: 0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.uniforms.uEnterProgress, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.uniforms.uFacOffset, { value: -1.0, duration: 2.0, ease: "power2.outIn" }, 0);
    tl.to(this.camera, {
      fov: this.originalFov || 45, duration: 2.0, ease: "power2.outIn",
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 0);
    tl.to(this.uniforms.uOpacity, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
  }
}