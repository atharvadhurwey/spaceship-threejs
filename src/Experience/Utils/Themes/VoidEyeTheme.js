import * as THREE from 'three'

import voidEyeFragShader from '../../Shaders/Eye/frag.glsl'
import voidEyeVertShader from '../../Shaders/Eye/vert.glsl'

import starFragShader from '../../Shaders/Stars/frag.glsl'
import starVertShader from '../../Shaders/Stars/vert.glsl'

export default class VoidEyeTheme 
{
  constructor(experience, parentDebugFolder)
  {
    this.experience = experience
    this.scene = experience.scene
    this.resources = experience.resources
    this.debug = experience.debug

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.parentDebugFolder = parentDebugFolder
    this.debugFolders = []

    this.dummy = new THREE.Object3D()

    this.setEye()
    this.setStars()
    this.setCubes()
  }

  setCubes()
  {
    this.cubesParams = {
      count: 200,
      width: 15,
      height: 30,
      depth: 8,
      speed: 200,
      minRadius: 200,
      maxRadius: 500,
      zStart: -1500,
      zEnd: 100,
      fadeDistance: 400,
      color: '#4b4b4b'
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1)

    this.alphas = new Float32Array(this.cubesParams.count)
    geometry.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(this.alphas, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.cubesParams.color) }
      },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          // Standard transform for instanced meshes
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uColor, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false
    })

    this.instancedCubes = new THREE.InstancedMesh(geometry, material, this.cubesParams.count)
    this.group.add(this.instancedCubes)

    this.cubesData = []

    for (let i = 0; i < this.cubesParams.count; i++)
    {
      const pos = this.getSpawnXY();

      const data = {
        x: pos.x,
        y: pos.y,
        z: this.cubesParams.zStart + Math.random() * (this.cubesParams.zEnd - this.cubesParams.zStart),
        speedMod: 0.5 + Math.random() * 1.0,
      }
      this.cubesData.push(data)

      this.dummy.position.set(data.x, data.y, data.z)
      this.dummy.rotation.set(0, 0, 0)
      this.dummy.scale.set(this.cubesParams.width, this.cubesParams.height, this.cubesParams.depth)
      this.dummy.updateMatrix()
      this.instancedCubes.setMatrixAt(i, this.dummy.matrix)

      this.alphas[i] = Math.min((data.z - this.cubesParams.zStart) / this.cubesParams.fadeDistance, 1.0)
    }

    this.instancedCubes.instanceMatrix.needsUpdate = true

    if (this.debug.active)
    {
      const cubesFolder = this.parentDebugFolder.addFolder({ title: 'Warp Rectangles', expanded: false })
      this.debugFolders.push(cubesFolder)

      cubesFolder.addBinding(this.cubesParams, 'speed', { min: 0, max: 2000, label: 'Speed' })
      cubesFolder.addBinding(this.cubesParams, 'fadeDistance', { min: 50, max: 1500, label: 'Fade Dist' })
      cubesFolder.addBinding(this.cubesParams, 'width', { min: 0.1, max: 30, label: 'Width' })
      cubesFolder.addBinding(this.cubesParams, 'height', { min: 0.1, max: 30, label: 'Height' })
      cubesFolder.addBinding(this.cubesParams, 'depth', { min: 1, max: 100, label: 'Length' })
      cubesFolder.addBinding(this.cubesParams, 'minRadius', { min: 0, max: 1000, label: 'Min Radius' })
      cubesFolder.addBinding(this.cubesParams, 'maxRadius', { min: 100, max: 2000, label: 'Max Radius' })
      cubesFolder.addBinding(this.cubesParams, 'color', { label: 'Color' })
        .on('change', (ev) => { material.uniforms.uColor.value.set(ev.value) })
    }
  }

  getSpawnXY() 
  {
    const angle = Math.random() * Math.PI * 2;

    const minSq = this.cubesParams.minRadius * this.cubesParams.minRadius;
    const maxSq = this.cubesParams.maxRadius * this.cubesParams.maxRadius;
    const radius = Math.sqrt(Math.random() * (maxSq - minSq) + minSq);

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }

  setStars()
  {
    this.starsParams = {
      size: 3000,
      position: { x: 0, y: 0, z: -1510 },
      threshold: 8.0,
      exposure: 200.0,
      noiseScale: 500.0,
      twinkleScale: 100.0
    };

    const uniforms = {
      uTime: { value: 0 },
      uThreshold: { value: this.starsParams.threshold },
      uExposure: { value: this.starsParams.exposure },
      uNoiseScale: { value: this.starsParams.noiseScale },
      uTwinkleScale: { value: this.starsParams.twinkleScale }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: starVertShader,
      fragmentShader: starFragShader
    });

    const geometry = new THREE.PlaneGeometry(this.starsParams.size, this.starsParams.size);
    this.stars = new THREE.Mesh(geometry, material);
    this.stars.position.set(this.starsParams.position.x, this.starsParams.position.y, this.starsParams.position.z);
    this.scene.add(this.stars);

    if (this.debug.active)
    {
      const starsFolder = this.parentDebugFolder.addFolder({ title: 'Stars Shader', expanded: false });
      this.debugFolders.push(starsFolder);

      const updateGeometry = () =>
      {
        this.stars.geometry.dispose();
        this.stars.geometry = new THREE.PlaneGeometry(this.starsParams.size, this.starsParams.size, 1, 1);
      };

      starsFolder.addBinding(this.starsParams, 'size', { min: 100, max: 5000, step: 10, label: 'PlaneSize' })
        .on('change', () => { updateGeometry(); });

      starsFolder.addBinding(this.starsParams, 'position', { label: 'Position' })
        .on('change', (ev) =>
        {
          this.stars.position.set(ev.value.x, ev.value.y, ev.value.z);
        });

      starsFolder.addBinding(this.starsParams, 'threshold', { min: 1.0, max: 20.0, step: 0.1, label: 'Threshold' })
        .on('change', (ev) => { material.uniforms.uThreshold.value = ev.value; });

      starsFolder.addBinding(this.starsParams, 'exposure', { min: 10.0, max: 1000.0, step: 1.0, label: 'Exposure' })
        .on('change', (ev) => { material.uniforms.uExposure.value = ev.value; });

      starsFolder.addBinding(this.starsParams, 'noiseScale', { min: 10.0, max: 1000.0, step: 1.0, label: 'StarScale' })
        .on('change', (ev) => { material.uniforms.uNoiseScale.value = ev.value; });

      starsFolder.addBinding(this.starsParams, 'twinkleScale', { min: 10.0, max: 500.0, step: 1.0, label: 'TwinkleScale' })
        .on('change', (ev) => { material.uniforms.uTwinkleScale.value = ev.value; });
    }
  }

  setEye()
  {
    this.eyeParams = {
      size: 1000,
      position: { x: 0, y: 300, z: -1500 },
      innerRadius: 0.25,
      innerRadiusAnimAmp: 0.02,
      outerRadius: 1.0,
      bg: { r: 0.00, g: 0.00, b: 0.00 },
      eyeBg: { r: 0.00, g: 0.00, b: 0.00 },
      eye1: { r: 0.00, g: 0.00, b: 0.00 },
      eye2: { r: 1.00, g: 1.00, b: 1.00 }
    };

    const uniforms = {
      uTime: { value: 0 },
      uInnerRadius: { value: this.eyeParams.innerRadius },
      uInnerRadiusAnimAmp: { value: this.eyeParams.innerRadiusAnimAmp },
      uOuterRadius: { value: this.eyeParams.outerRadius },
      uBg: { value: new THREE.Color(this.eyeParams.bg.r, this.eyeParams.bg.g, this.eyeParams.bg.b) },
      uEyeBg: { value: new THREE.Color(this.eyeParams.eyeBg.r, this.eyeParams.eyeBg.g, this.eyeParams.eyeBg.b) },
      uEye1: { value: new THREE.Color(this.eyeParams.eye1.r, this.eyeParams.eye1.g, this.eyeParams.eye1.b) },
      uEye2: { value: new THREE.Color(this.eyeParams.eye2.r, this.eyeParams.eye2.g, this.eyeParams.eye2.b) }
    };

    const vertexShader = voidEyeVertShader;
    const fragmentShader = voidEyeFragShader;

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      glslVersion: THREE.GLSL3,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(this.eyeParams.size, this.eyeParams.size);
    this.eye = new THREE.Mesh(geometry, material);

    this.eye.position.set(
      this.eyeParams.position.x,
      this.eyeParams.position.y,
      this.eyeParams.position.z
    );

    this.scene.add(this.eye);

    if (this.debug.active)
    {
      const eyeFolder = this.parentDebugFolder.addFolder({ title: 'Eye Shader', expanded: false });
      this.debugFolders.push(eyeFolder);

      const updateGeometry = () =>
      {
        this.eye.geometry.dispose();
        this.eye.geometry = new THREE.PlaneGeometry(this.eyeParams.size, this.eyeParams.size, 1, 1);
      };

      eyeFolder.addBinding(this.eyeParams, 'size', { min: 10, max: 2000, step: 1, label: 'Size' })
        .on('change', () => { updateGeometry(); });

      eyeFolder.addBinding(this.eyeParams, 'position', { label: 'Position' })
        .on('change', (ev) =>
        {
          this.eye.position.set(ev.value.x, ev.value.y, ev.value.z);
        });

      eyeFolder.addBinding(this.eyeParams, 'innerRadius', { min: 0.0, max: 1.0, label: 'PupilSize' })
        .on('change', (ev) => { material.uniforms.uInnerRadius.value = ev.value; });

      eyeFolder.addBinding(this.eyeParams, 'innerRadiusAnimAmp', { min: 0.0, max: 0.2, label: 'PupilBeatAmp' })
        .on('change', (ev) => { material.uniforms.uInnerRadiusAnimAmp.value = ev.value; });

      eyeFolder.addBinding(this.eyeParams, 'outerRadius', { min: 0.1, max: 1.5, label: 'IrisSize' })
        .on('change', (ev) => { material.uniforms.uOuterRadius.value = ev.value; });

      eyeFolder.addBinding(this.eyeParams, 'bg', { color: { type: 'float' }, label: 'Background' })
        .on('change', (ev) => { material.uniforms.uBg.value.setRGB(ev.value.r, ev.value.g, ev.value.b); });

      eyeFolder.addBinding(this.eyeParams, 'eyeBg', { color: { type: 'float' }, label: 'EyeBase' })
        .on('change', (ev) => { material.uniforms.uEyeBg.value.setRGB(ev.value.r, ev.value.g, ev.value.b); });

      eyeFolder.addBinding(this.eyeParams, 'eye1', { color: { type: 'float' }, label: 'IrisColor1' })
        .on('change', (ev) => { material.uniforms.uEye1.value.setRGB(ev.value.r, ev.value.g, ev.value.b); });

      eyeFolder.addBinding(this.eyeParams, 'eye2', { color: { type: 'float' }, label: 'IrisColor2' })
        .on('change', (ev) => { material.uniforms.uEye2.value.setRGB(ev.value.r, ev.value.g, ev.value.b); });
    }
  }

  update()
  {
    const deltaTime = this.experience.time.delta

    if (this.eye)
    {
      this.eye.material.uniforms.uTime.value += deltaTime * 0.01;
    }

    if (this.stars)
    {
      this.stars.material.uniforms.uTime.value += deltaTime * 0.01;
    }

    if (this.instancedCubes && this.cubesData)
    {
      for (let i = 0; i < this.cubesParams.count; i++)
      {
        const data = this.cubesData[i]

        data.z += this.cubesParams.speed * data.speedMod * (deltaTime * 0.001)

        if (data.z > this.cubesParams.zEnd)
        {
          data.z = this.cubesParams.zStart
          const pos = this.getSpawnXY();
          data.x = pos.x;
          data.y = pos.y;
        }

        this.dummy.position.set(data.x, data.y, data.z)
        this.dummy.scale.set(this.cubesParams.width, this.cubesParams.height, this.cubesParams.depth)
        this.dummy.rotation.set(0, 0, 0)
        this.dummy.updateMatrix()
        this.instancedCubes.setMatrixAt(i, this.dummy.matrix)

        const distanceTraveled = data.z - this.cubesParams.zStart
        this.alphas[i] = Math.min(distanceTraveled / this.cubesParams.fadeDistance, 1.0)
      }

      this.instancedCubes.instanceMatrix.needsUpdate = true

      this.instancedCubes.geometry.attributes.aAlpha.needsUpdate = true
    }
  }

  dispose()
  {
    this.scene.remove(this.group)
    if (this.eye) this.scene.remove(this.eye)
    if (this.stars) this.scene.remove(this.stars)

    const disposeMesh = (mesh) =>
    {
      if (!mesh) return

      if (mesh.geometry) mesh.geometry.dispose()

      if (mesh.material)
      {
        if (Array.isArray(mesh.material))
        {
          mesh.material.forEach(mat => mat.dispose())
        }
        else
        {
          mesh.material.dispose()
        }
      }
    }

    disposeMesh(this.instancedCubes)
    disposeMesh(this.eye)
    disposeMesh(this.stars)

    if (this.debug.active && this.parentDebugFolder)
    {
      this.debugFolders.forEach(folder =>
      {
        if (typeof this.parentDebugFolder.remove === 'function')
        {
          this.parentDebugFolder.remove(folder)
        } else if (typeof folder.dispose === 'function')
        {
          folder.dispose()
        }
      })
    }

    this.debugFolders = []
    this.cubesData = []
    this.alphas = null
  }
}