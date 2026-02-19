import * as THREE from 'three'

export default class PillarScapeTheme 
{
  constructor(experience, parentDebugFolder)
  {
    this.experience = experience
    this.scene = experience.scene
    this.resources = experience.resources
    this.debug = experience.debug

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this.clouds = []
    this.debugFolders = []
    this.parentDebugFolder = parentDebugFolder

    this.setPlanet()
    this.setClouds()

    if (this.scene.fog) { this.scene.fog.exclude = [this.clouds] }
  }

  setClouds()
  {
    const cloudTextures = [
      this.resources.items.cloud1, this.resources.items.cloud2, this.resources.items.cloud3,
      this.resources.items.cloud4, this.resources.items.cloud5, this.resources.items.cloud6,
      this.resources.items.cloud7, this.resources.items.cloud8, this.resources.items.cloud9,
      this.resources.items.cloud10
    ].filter(tex => tex !== undefined)

    if (cloudTextures.length === 0) return;

    const cloudCount = 3

    for (let i = 0; i < cloudCount; i++)
    {
      const randomTexture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)]
      const cloudGeometry = new THREE.PlaneGeometry(600, 300)
      const cloudMaterial = new THREE.MeshBasicMaterial({
        map: randomTexture,
        transparent: true,
        opacity: Math.random() * 0.5 + 0.5,
        fog: false,
        depthWrite: false
      })

      const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
      cloudMesh.position.set((Math.random() - 0.5) * 800, 200 + Math.random() * 100, -500 - Math.random() * 500)

      const randomScale = Math.random() * 0.8 + 0.5
      cloudMesh.scale.set(randomScale, randomScale, randomScale)
      cloudMesh.userData.speed = Math.random() * 0.05 + 0.02

      this.group.add(cloudMesh)
      this.clouds.push(cloudMesh)
    }
  }

  setPlanet()
  {
    this.planetParams = { size: 1000, opacity: 0.4, dir: { x: 0, y: 500, z: -1500 } }

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

    const planetBackground = new THREE.Mesh(geometry, material);
    planetBackground.position.set(this.planetParams.dir.x, this.planetParams.dir.y, this.planetParams.dir.z);
    planetBackground.renderOrder = -1;
    this.group.add(planetBackground);

    if (this.debug.active && this.parentDebugFolder)
    {
      const planetFolder = this.parentDebugFolder.addFolder({ title: 'Planet', expanded: false })
      this.debugFolders.push(planetFolder)

      planetFolder.addBinding(this.planetParams, 'opacity', { min: 0, max: 1, label: 'Opacity' })
        .on('change', (ev) => material.uniforms.uOpacity.value = ev.value);
      planetFolder.addBinding(this.planetParams, 'dir', { label: 'Direction' })
        .on('change', (ev) => planetBackground.position.set(ev.value.x, ev.value.y, ev.value.z));
    }
  }

  update()
  {
    if (this.clouds && this.clouds.length > 0)
    {
      for (const cloud of this.clouds)
      {
        cloud.position.x -= cloud.userData.speed
        if (cloud.position.x < -3000)
        {
          cloud.position.x = 3000
          cloud.position.y = 200 + Math.random() * 400
        }
      }
    }
  }

  dispose()
  {
    this.scene.remove(this.group)

    // Traverse and dispose materials/geometries
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

    // Clean up debug UI specific to this theme
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