import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/Addons.js';
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

import waterFragShader from '../Shaders/Water/frag.glsl';
import waterVertShader from '../Shaders/Water/vert.glsl';
import desertFragShader from '../Shaders/Desert/frag.glsl'
import desertVertShader from '../Shaders/Desert/vert.glsl'

export class SandFloor
{
  constructor(scene, debug, chunkWidth)
  {
    this.scene = scene;
    this.debug = debug;
    this.chunkWidth = chunkWidth;
    this.name = 'SandFloor';

    this.params = {
      windSpeed: 1.0,
      windAngle: 90,
      duneScale: 0.1,
      duneHeight: 1.0,
      baseColor: '#3d3d3d',
      shadowColor: '#000000',
    };

    this.init();
  }

  init()
  {
    const initialWindRad = THREE.MathUtils.degToRad(this.params.windAngle);

    this.uniforms = {
      uTime: { value: 0 },
      uWindSpeed: { value: this.params.windSpeed },
      uWindDirection: { value: new THREE.Vector2(Math.cos(initialWindRad), Math.sin(initialWindRad)) },
      uDuneScale: { value: this.params.duneScale },
      uDuneHeight: { value: this.params.duneHeight },
      uBaseColor: { value: new THREE.Color(this.params.baseColor) },
      uShadowColor: { value: new THREE.Color(this.params.shadowColor) },
      uOffset: { value: new THREE.Vector2(0, 0) }
    };

    const material = new CustomShaderMaterial({
      baseMaterial: THREE.MeshStandardMaterial,
      vertexShader: desertVertShader,
      fragmentShader: desertFragShader,
      uniforms: this.uniforms,
      roughness: 0.8,
      metalness: 0.0,
    });

    const geometry = new THREE.PlaneGeometry(this.chunkWidth * 4, this.chunkWidth * 4, 32, 32);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.z = -this.chunkWidth / 3;
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.1;
    this.mesh.receiveShadow = true;

    this.scene.add(this.mesh);

    if (this.debug.active)
    {
      this.debugFolder = this.debug.ui.addFolder({ title: 'Desert Shader' });
      this.debugFolder.addBinding(this.params, 'duneScale', { min: 0.1, max: 2.0, step: 0.01 }).on('change', (ev) => this.uniforms.uDuneScale.value = ev.value);
      this.debugFolder.addBinding(this.params, 'duneHeight', { min: 0.0, max: 10, step: 0.01 }).on('change', (ev) => this.uniforms.uDuneHeight.value = ev.value);
      this.debugFolder.addBinding(this.params, 'baseColor', { view: 'color' }).on('change', (ev) => this.uniforms.uBaseColor.value.set(ev.value));
      this.debugFolder.addBinding(this.params, 'shadowColor', { view: 'color' }).on('change', (ev) => this.uniforms.uShadowColor.value.set(ev.value));
    }
  }

  update(deltaTime, forwardSpeed, velocity)
  {
    this.uniforms.uTime.value += forwardSpeed * deltaTime;
    this.uniforms.uOffset.value.x += velocity * deltaTime;
  }

  destroy()
  {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.debugFolder) this.debugFolder.dispose();
  }
}

export class WaterFloor
{
  constructor(scene, debug, resources, chunkWidth, chunkLength)
  {
    this.scene = scene;
    this.debug = debug;
    this.resources = resources;
    this.chunkWidth = chunkWidth;
    this.chunkLength = chunkLength;
    this.name = 'WaterFloor';

    this.params = {
      waveStrength: 0.04,
      waveSpeed: 0.1,
      waterColor: '#005e76',
      opacity: 1.0,
    };

    this.init();
  }

  init()
  {
    const customShader = Reflector.ReflectorShader;
    customShader.vertexShader = waterVertShader;
    customShader.fragmentShader = waterFragShader;

    const dudvTexture = this.resources.items.dudvTexture;
    dudvTexture.wrapS = dudvTexture.wrapT = THREE.RepeatWrapping;

    customShader.uniforms.uDudvTexture = { value: dudvTexture };
    customShader.uniforms.uTime = { value: 0 };
    customShader.uniforms.uWaveStrength = { value: this.params.waveStrength };
    customShader.uniforms.uWaveSpeed = { value: this.params.waveSpeed };

    customShader.uniforms.uOpacity = { value: this.params.opacity };

    this.mesh = new Reflector(
      new THREE.CircleGeometry(this.chunkWidth * 4, 16),
      {
        shader: customShader,
        clipBias: 0.05,
        textureWidth: 512 * 2,
        textureHeight: 512 * 2,
        color: new THREE.Color(this.params.waterColor),
      }
    );

    this.mesh.material.transparent = true;
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.z = -this.chunkLength / 4;
    this.mesh.position.y = 0.1;
    this.scene.add(this.mesh);

    if (this.debug.active)
    {
      this.debugFolder = this.debug.ui.addFolder({ title: 'Water Shader' });
      this.debugFolder.addBinding(this.params, 'waveStrength', { min: 0, max: 0.5, step: 0.001 }).on('change', (ev) => this.mesh.material.uniforms.uWaveStrength.value = ev.value);
      this.debugFolder.addBinding(this.params, 'waveSpeed', { min: 0, max: 1, step: 0.001 });
      this.debugFolder.addBinding(this.params, 'waterColor', { view: 'color' }).on('change', (ev) => this.mesh.material.uniforms.color.value.set(ev.value));
      this.debugFolder.addBinding(this.params, 'opacity', { min: 0, max: 1, step: 0.01 }).on('change', (ev) => this.mesh.material.uniforms.uOpacity.value = ev.value);
    }
  }

  update(deltaTime)
  {
    this.mesh.material.uniforms.uTime.value += this.params.waveSpeed * deltaTime;
  }

  destroy()
  {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (typeof this.mesh.dispose === 'function') this.mesh.dispose();
    else if (this.mesh.getRenderTarget) this.mesh.getRenderTarget().dispose();
    if (this.debugFolder) this.debugFolder.dispose();
  }
}