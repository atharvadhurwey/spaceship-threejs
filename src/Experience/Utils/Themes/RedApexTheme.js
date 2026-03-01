import * as THREE from 'three'
import gsap from 'gsap';

import redSunVertShader from '../../Shaders/RedSun/vert.glsl';
import redSunFragShader from '../../Shaders/RedSun/frag.glsl';

import mountainVertShader from '../../Shaders/Mountains/vert.glsl';
import mountainFragShader from '../../Shaders/Mountains/frag.glsl';

import pyramidVertShader from '../../Shaders/Pyramid/vert.glsl';
import pyramidFragShader from '../../Shaders/Pyramid/frag.glsl';

import { MAP_THEMES } from '../configFile'

export default class RedApexTheme 
{
  constructor(experience, parentDebugFolder)
  {
    this.name = 'redApexTheme'
    this.experience = experience
    this.scene = experience.scene
    this.resources = experience.resources
    this.debug = experience.debug

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.parentDebugFolder = parentDebugFolder
    this.debugFolders = []

    this.setPlanet()
    this.setMountains()
    this.setPyramid()
  }

  setPlanet()
  {
    this.planetParams = {
      size: 1000, opacity: 1.0, dir: { x: 0, y: 760, z: -1500 },
      color: 0xff2222, fresnelColor: 0xff5555, fresnelPower: 2.0,
      fresnelIntensity: 1.5, centerOpacity: 0.0
    }

    const planetGeo = new THREE.PlaneGeometry(this.planetParams.size, this.planetParams.size);
    const planetMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.resources.items.redApexPlanetTexture },
        uOpacity: { value: this.planetParams.opacity },
        uColor: { value: new THREE.Color(this.planetParams.color) },
        uFresnelColor: { value: new THREE.Color(this.planetParams.fresnelColor) },
        uFresnelPower: { value: this.planetParams.fresnelPower },
        uFresnelIntensity: { value: this.planetParams.fresnelIntensity },
        uCenterOpacity: { value: this.planetParams.centerOpacity }
      },
      vertexShader: redSunVertShader, fragmentShader: redSunFragShader,
      transparent: true, depthWrite: false,
    });

    this.planetBackground = new THREE.Mesh(planetGeo, planetMat);
    this.planetBackground.position.set(this.planetParams.dir.x, this.planetParams.dir.y, this.planetParams.dir.z);
    this.planetBackground.renderOrder = -1;
    this.group.add(this.planetBackground);

    if (this.debug.active && this.parentDebugFolder)
    {
      const planetFolder = this.parentDebugFolder.addFolder({ title: 'Planet', expanded: false })
      this.debugFolders.push(planetFolder)

      planetFolder.addBinding(this.planetParams, 'opacity', { min: 0, max: 1 })
        .on('change', (ev) => planetMat.uniforms.uOpacity.value = ev.value);

      planetFolder.addBinding(this.planetParams, 'dir', { label: 'Direction' })
        .on('change', (ev) => { this.planetBackground.position.set(ev.value.x, ev.value.y, ev.value.z); });

      planetFolder.addBinding(this.planetParams, 'fresnelColor', { view: 'color', label: 'FrColor' })
        .on('change', (ev) => { planetMat.uniforms.uFresnelColor.value.set(ev.value); });

      planetFolder.addBinding(this.planetParams, 'fresnelPower', { min: 0.1, max: 10.0, label: 'FrPower' })
        .on('change', (ev) => { planetMat.uniforms.uFresnelPower.value = ev.value; });

      planetFolder.addBinding(this.planetParams, 'fresnelIntensity', { min: 0.0, max: 5.0, label: 'FrIntensity' })
        .on('change', (ev) => { planetMat.uniforms.uFresnelIntensity.value = ev.value; });

      planetFolder.addBinding(this.planetParams, 'centerOpacity', { min: 0.0, max: 1.0, label: 'CeOpacity' })
        .on('change', (ev) => { planetMat.uniforms.uCenterOpacity.value = ev.value; });

    }
  }

  setMountains()
  {
    this.mountainParams = {
      width: 2700,
      height: 400,
      mountainBaseColor: '#000000',
      mountainPeakColor: '#9c0000',
      dir: { x: 0, y: 220.00, z: -1500 },
      frequency: 10.0,
      amplitude: 0.5,
      offset: 0.365
    };

    const mountainGeo = new THREE.PlaneGeometry(this.mountainParams.width, this.mountainParams.height, 1, 1);
    const mountainMat = new THREE.ShaderMaterial({
      vertexShader: mountainVertShader,
      fragmentShader: mountainFragShader,
      uniforms: {
        uMountainBaseColor: { value: new THREE.Color(this.mountainParams.mountainBaseColor) },
        uMountainPeakColor: { value: new THREE.Color(this.mountainParams.mountainPeakColor) },
        uFrequency: { value: this.mountainParams.frequency },
        uAmplitude: { value: this.mountainParams.amplitude },
        uOffset: { value: this.mountainParams.offset }
      },
      transparent: true,
      depthWrite: false,
    });

    this.backgroundScreen = new THREE.Mesh(mountainGeo, mountainMat);
    this.backgroundScreen.position.set(this.mountainParams.dir.x, this.mountainParams.dir.y, this.mountainParams.dir.z);

    this.group.add(this.backgroundScreen);

    if (this.debug.active)
    {
      const mountainFolder = this.parentDebugFolder.addFolder({ title: 'Mountains', expanded: false });
      this.debugFolders.push(mountainFolder);

      mountainFolder.addBinding(this.mountainParams, 'width', { min: 0, max: 5000, step: 1, label: 'Width' })
        .on('change', () => { updateGeometry(); });

      mountainFolder.addBinding(this.mountainParams, 'height', { min: 10, max: 600, step: 1, label: 'Height' })
        .on('change', () => { updateGeometry(); });

      const updateGeometry = () =>
      {
        this.backgroundScreen.geometry.dispose();
        this.backgroundScreen.geometry = new THREE.PlaneGeometry(this.mountainParams.width, this.mountainParams.height, 1, 1);
      };

      mountainFolder.addBinding(this.mountainParams, 'dir', { label: 'Direction' })
        .on('change', (ev) => { this.backgroundScreen.position.set(ev.value.x, ev.value.y, ev.value.z); });

      mountainFolder.addBinding(this.mountainParams, 'offset', { min: -2.0, max: 2.0, step: 0.001, label: 'HorizontalScroll' })
        .on('change', (ev) => { mountainMat.uniforms.uOffset.value = ev.value; });

      mountainFolder.addBinding(this.mountainParams, 'mountainBaseColor', { view: 'color', label: 'BaseColor' })
        .on('change', (ev) => { mountainMat.uniforms.uMountainBaseColor.value.set(ev.value); });

      mountainFolder.addBinding(this.mountainParams, 'mountainPeakColor', { view: 'color', label: 'PeakColor' })
        .on('change', (ev) => { mountainMat.uniforms.uMountainPeakColor.value.set(ev.value); });

      mountainFolder.addBinding(this.mountainParams, 'frequency', { min: 1.0, max: 50.0, label: 'Frequency' })
        .on('change', (ev) => { mountainMat.uniforms.uFrequency.value = ev.value; });

      mountainFolder.addBinding(this.mountainParams, 'amplitude', { min: 0.0, max: 2.0, label: 'Amplitude' })
        .on('change', (ev) => { mountainMat.uniforms.uAmplitude.value = ev.value; });
    }
  }

  setPyramid()
  {
    this.pyramidParams = {
      angle: 2.1,
      heightOffset: 0.0,
      baseWidth: 1.67,
      slope: 0.4,
      color: '#b40000',
      splitLevel: 1.74,
      splitGap: 0.27,
      dir: { x: 0, y: 17, z: -1450 },
      width: 1000,
      height: 2000,
      rotationSpeed: 0.0
    };

    const pyramidGeo = new THREE.PlaneGeometry(this.pyramidParams.width, this.pyramidParams.height, 1, 1);
    const pyramidMat = new THREE.ShaderMaterial({
      vertexShader: pyramidVertShader,
      fragmentShader: pyramidFragShader,
      uniforms: {
        uAngle: { value: this.pyramidParams.angle },
        uHeightOffset: { value: this.pyramidParams.heightOffset },
        uBaseWidth: { value: this.pyramidParams.baseWidth },
        uSlope: { value: this.pyramidParams.slope },
        uSandColor: { value: new THREE.Color(this.pyramidParams.color) },
        uSplitLevel: { value: this.pyramidParams.splitLevel },
        uSplitGap: { value: this.pyramidParams.splitGap },
        uTime: { value: 0.0 },
        uRotationSpeed: { value: this.pyramidParams.rotationSpeed },
        uRotationAngle: { value: 0.0 }
      },
      transparent: true
    });

    this.pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    this.pyramid.position.set(this.pyramidParams.dir.x, this.pyramidParams.dir.y, this.pyramidParams.dir.z);

    this.group.add(this.pyramid);

    if (this.debug.active)
    {
      const pyramidFolder = this.parentDebugFolder.addFolder({ title: 'Pyramid Shader', expanded: false });
      this.debugFolders.push(pyramidFolder);

      const updateGeometry = () =>
      {
        this.pyramid.geometry.dispose();
        this.pyramid.geometry = new THREE.PlaneGeometry(this.pyramidParams.width, this.pyramidParams.height, 1, 1);
      };

      pyramidFolder.addBinding(this.pyramidParams, 'width', { min: 0, max: 5000, step: 1, label: 'Width' })
        .on('change', () => { updateGeometry(); });

      pyramidFolder.addBinding(this.pyramidParams, 'height', { min: 10, max: 2000, step: 1, label: 'Height' })
        .on('change', () => { updateGeometry(); });

      pyramidFolder.addBinding(this.pyramidParams, 'dir', { label: 'Direction' })
        .on('change', (ev) => { this.pyramid.position.set(ev.value.x, ev.value.y, ev.value.z); });

      pyramidFolder.addBinding(this.pyramidParams, 'angle', {
        min: 0, max: Math.PI * 2, label: 'Angle'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uAngle.value = ev.value; });

      pyramidFolder.addBinding(this.pyramidParams, 'baseWidth', {
        min: 0.1, max: 2.5, label: 'Base Width'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uBaseWidth.value = ev.value; });

      pyramidFolder.addBinding(this.pyramidParams, 'slope', {
        min: 0.0, max: 1.0, label: 'slope'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uSlope.value = ev.value; });

      pyramidFolder.addBinding(this.pyramidParams, 'heightOffset', {
        min: -2.0, max: 2.0, label: 'Y Offset'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uHeightOffset.value = ev.value; });

      pyramidFolder.addBinding(this.pyramidParams, 'splitLevel', {
        min: 0.0, max: 10.0, label: 'Split Level'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uSplitLevel.value = ev.value; });

      pyramidFolder.addBinding(this.pyramidParams, 'splitGap', {
        min: 0.0, max: 5.0, label: 'Split Gap'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uSplitGap.value = ev.value; });

      pyramidFolder.addBinding(this.pyramidParams, 'color', {
        view: 'color', label: 'Sand Color'
      }).on('change', (ev) => { this.pyramid.material.uniforms.uSandColor.value.set(ev.value); });

      pyramidFolder.addBinding(this.pyramidParams, 'rotationSpeed', {
        min: 0, max: 50.0, label: 'Rotation Speed'
      }).on('change', (ev) =>
      {
        this.pyramid.material.uniforms.uRotationSpeed.value = ev.value;
      });
    }
  }

  triggerRedApexEvent(targetSpeed, duration = 2.0)
  {
    const tl = gsap.timeline();

    tl.to(this.pyramidParams, {
      rotationSpeed: targetSpeed,
      duration: duration,
      ease: "none",
      onUpdate: () =>
      {
        this.pyramid.material.uniforms.uRotationSpeed.value = this.pyramidParams.rotationSpeed;
      }
    }, 0);

    if (this.scene && this.scene.fog)
    {
      tl.to(this.scene.fog, {
        far: 200,
        duration: duration,
        ease: "none"
      }, 0);

    }
  }

  resetPyramid()
  {
    gsap.killTweensOf(this.pyramidParams);

    if (this.scene && this.scene.fog)
    {
      gsap.killTweensOf(this.scene.fog);
      this.scene.fog.far = MAP_THEMES.pyramid.fog.far;
    }

    if (this.pyramid)
    {
      this.group.remove(this.pyramid);

      this.pyramid.geometry.dispose();
      this.pyramid.material.dispose();
    }

    this.pyramidParams = {
      angle: 2.1,
      heightOffset: 0.0,
      baseWidth: 1.67,
      slope: 0.4,
      color: '#b40000',
      splitLevel: 1.74,
      splitGap: 0.27,
      dir: { x: 0, y: 17, z: -1450 },
      width: 1000,
      height: 2000,
      rotationSpeed: 0.0
    };

    const pyramidGeo = new THREE.PlaneGeometry(this.pyramidParams.width, this.pyramidParams.height, 1, 1);
    const pyramidMat = new THREE.ShaderMaterial({
      vertexShader: pyramidVertShader,
      fragmentShader: pyramidFragShader,
      uniforms: {
        uAngle: { value: this.pyramidParams.angle },
        uHeightOffset: { value: this.pyramidParams.heightOffset },
        uBaseWidth: { value: this.pyramidParams.baseWidth },
        uSlope: { value: this.pyramidParams.slope },
        uSandColor: { value: new THREE.Color(this.pyramidParams.color) },
        uSplitLevel: { value: this.pyramidParams.splitLevel },
        uSplitGap: { value: this.pyramidParams.splitGap },
        uTime: { value: 0.0 },
        uRotationSpeed: { value: this.pyramidParams.rotationSpeed },
        uRotationAngle: { value: 0.0 }
      },
      transparent: true
    });

    this.pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
    this.pyramid.position.set(this.pyramidParams.dir.x, this.pyramidParams.dir.y, this.pyramidParams.dir.z);
    this.group.add(this.pyramid);

    this.currentAngle = 0;
  }

  update()
  {
    const deltaTime = this.experience.time.delta

    this.currentAngle = (this.currentAngle || 0) + (this.pyramidParams.rotationSpeed * deltaTime * 0.01);
    this.pyramid.material.uniforms.uRotationAngle.value = this.currentAngle;
  }

  dispose()
  {
    this.scene.remove(this.group)

    this.group.traverse((child) =>
    {
      if (child instanceof THREE.Mesh)
      {
        if (child.geometry) child.geometry.dispose()
        if (child.material)
        {
          Array.isArray(child.material)
            ? child.material.forEach(mat => mat.dispose())
            : child.material.dispose()
        }
      }
    })

    if (this.debug.active && this.parentDebugFolder)
    {
      this.debugFolders.forEach(folder => this.parentDebugFolder.remove(folder))
    }
  }
}