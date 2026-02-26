import * as THREE from 'three'

import cloudsFragShader from '../../Shaders/Clouds/frag.glsl'
import cloudsVertShader from '../../Shaders/Clouds/vert.glsl'
export default class PillarScapeTheme 
{
  constructor(experience, parentDebugFolder)
  {
    this.name = 'pillarScapeTheme'
    this.experience = experience
    this.scene = experience.scene
    this.resources = experience.resources
    this.debug = experience.debug

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.debugFolders = []
    this.parentDebugFolder = parentDebugFolder

    this.setPlanet()
    this.setClouds()
  }

  setClouds()
  {
    this.cloudsParams = {
      cloudscale: 5,
      speed: 0.01,
      windAngle: 19,
      clouddark: 0.7,
      cloudlight: 0.3,
      cloudcover: 0,
      cloudalpha: 8.0,
      position: { x: 0, y: 500, z: -1510 },
      scale: { x: 300, y: 300, z: 300 }
    };

    const getWindDir = (angleDegrees) =>
    {
      const rad = angleDegrees * (Math.PI / 180);
      return new THREE.Vector2(Math.cos(rad), Math.sin(rad));
    };

    const uniforms = {
      uTime: { value: 0.0 },
      uCloudscale: { value: this.cloudsParams.cloudscale },
      uSpeed: { value: this.cloudsParams.speed },
      uWindDir: { value: getWindDir(this.cloudsParams.windAngle) },
      uClouddark: { value: this.cloudsParams.clouddark },
      uCloudlight: { value: this.cloudsParams.cloudlight },
      uCloudcover: { value: this.cloudsParams.cloudcover },
      uCloudalpha: { value: this.cloudsParams.cloudalpha }
    };

    const material = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: cloudsVertShader,
      fragmentShader: cloudsFragShader,
      uniforms: uniforms
    });

    const geometry = new THREE.PlaneGeometry(10, 10);
    this.clouds = new THREE.Mesh(geometry, material);

    this.clouds.position.set(this.cloudsParams.position.x, this.cloudsParams.position.y, this.cloudsParams.position.z);
    this.clouds.scale.set(this.cloudsParams.scale.x, this.cloudsParams.scale.y, this.cloudsParams.scale.z);

    this.scene.add(this.clouds);

    if (this.debug.active && this.parentDebugFolder)
    {
      const skyFolder = this.parentDebugFolder.addFolder({ title: 'Sky', expanded: false });
      if (this.debugFolders) this.debugFolders.push(skyFolder);

      skyFolder.addBinding(this.cloudsParams, 'position', { label: 'Position' })
        .on('change', (ev) => this.clouds.position.set(ev.value.x, ev.value.y, ev.value.z));

      skyFolder.addBinding(this.cloudsParams, 'scale', { label: 'Scale' })
        .on('change', (ev) => this.clouds.scale.set(ev.value.x, ev.value.y, ev.value.z));

      skyFolder.addFolder({ title: 'Shader Settings' });

      skyFolder.addBinding(this.cloudsParams, 'cloudscale', { min: 0, max: 10, label: 'CloudScale' })
        .on('change', (ev) => material.uniforms.uCloudscale.value = ev.value);

      skyFolder.addBinding(this.cloudsParams, 'speed', { min: 0, max: 0.1, label: 'Speed' })
        .on('change', (ev) => material.uniforms.uSpeed.value = ev.value);

      skyFolder.addBinding(this.cloudsParams, 'windAngle', { min: 0, max: 360, label: 'WindDirection' })
        .on('change', (ev) => material.uniforms.uWindDir.value.copy(getWindDir(ev.value)));

      skyFolder.addBinding(this.cloudsParams, 'clouddark', { min: 0, max: 1, label: 'CloudDark' })
        .on('change', (ev) => material.uniforms.uClouddark.value = ev.value);

      skyFolder.addBinding(this.cloudsParams, 'cloudlight', { min: 0, max: 1, label: 'CloudLight' })
        .on('change', (ev) => material.uniforms.uCloudlight.value = ev.value);

      skyFolder.addBinding(this.cloudsParams, 'cloudcover', { min: 0, max: 1, label: 'CloudCover' })
        .on('change', (ev) => material.uniforms.uCloudcover.value = ev.value);

      skyFolder.addBinding(this.cloudsParams, 'cloudalpha', { min: 0, max: 20, label: 'CloudAlpha' })
        .on('change', (ev) => material.uniforms.uCloudalpha.value = ev.value);
    }
  }

  setPlanet()
  {
    this.planetParams = { size: 1000, opacity: 0.6, dir: { x: 0, y: 500, z: -1500 } }

    const geometry = new THREE.PlaneGeometry(this.planetParams.size, this.planetParams.size);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.resources.items.pillarScapePlanetTexture },
        uOpacity: { value: this.planetParams.opacity }
      },
      vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uOpacity;
                varying vec2 vUv;
                void main() {
                    vec4 texColor = texture2D(tDiffuse, vUv);
                    float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
                    float alpha = smoothstep(0.1, 0.9, brightness); 
                    gl_FragColor = vec4(texColor.rgb, alpha * uOpacity);
                }
            `,
      transparent: true,
      depthWrite: false,
    });

    this.planetBackground = new THREE.Mesh(geometry, material);
    this.planetBackground.position.set(this.planetParams.dir.x, this.planetParams.dir.y, this.planetParams.dir.z);
    this.planetBackground.renderOrder = -1;
    this.group.add(this.planetBackground);

    if (this.debug.active && this.parentDebugFolder)
    {
      const planetFolder = this.parentDebugFolder.addFolder({ title: 'Planet', expanded: false })
      this.debugFolders.push(planetFolder)

      planetFolder.addBinding(this.planetParams, 'opacity', { min: 0, max: 1, label: 'Opacity' })
        .on('change', (ev) => material.uniforms.uOpacity.value = ev.value);
      planetFolder.addBinding(this.planetParams, 'dir', { label: 'Direction' })
        .on('change', (ev) => this.planetBackground.position.set(ev.value.x, ev.value.y, ev.value.z));
    }
  }

  update()
  {
    if (this.clouds)
    {
      this.clouds.material.uniforms.uTime.value += 0.01
    }
  }

  dispose()
  {
    if (this.clouds) 
    {
      this.scene.remove(this.clouds)
      if (this.clouds.geometry) this.clouds.geometry.dispose()
      if (this.clouds.material) this.clouds.material.dispose()
    }

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

    this.group.clear()

    if (this.debug.active && this.parentDebugFolder)
    {
      this.debugFolders.forEach(folder => this.parentDebugFolder.remove(folder))
    }

    if (this.scene.fog && this.scene.fog.exclude)
    {
      this.scene.fog.exclude = []
    }
  }
}