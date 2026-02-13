import * as THREE from 'three'
import Experience from '../Experience.js'

export default class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug

        this.time = this.experience.time

        if (this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Environment',
                expanded: false
            })
        }


        this.setSunLight()
        this.setEnvironmentMap()
        this.setGradientBackground()
        this.setClouds()
        this.setFog()
    }

    setSunLight()
    {
        this.sunLightParams = {
            color: 0xf2f2f2,
            intensity: 5,
            normalBias: 0.5,
            width: 256,
            height: 256,
            far: 1600,
            near: 750,
            x: 520, y: 900, z: -650
        }

        this.sunLight = new THREE.DirectionalLight(this.sunLightParams.color, this.sunLightParams.intensity)
        this.sunLight.castShadow = true

        this.sunLight.shadow.camera.left = -this.sunLightParams.width;
        this.sunLight.shadow.camera.right = this.sunLightParams.width;
        this.sunLight.shadow.camera.top = this.sunLightParams.height;
        this.sunLight.shadow.camera.bottom = -this.sunLightParams.height;
        this.sunLight.shadow.camera.near = this.sunLightParams.near;
        this.sunLight.shadow.camera.far = this.sunLightParams.far;

        this.sunLight.shadow.mapSize.set(1024 * 2, 1024 * 2);
        this.sunLight.shadow.normalBias = this.sunLightParams.normalBias;
        this.sunLight.position.set(this.sunLightParams.x, this.sunLightParams.y, this.sunLightParams.z);



        this.scene.add(this.sunLight);

        if (this.debug.active)
        {
            const sunFolder = this.debugFolder.addFolder({ title: 'Sun Light' })

            sunFolder.addBinding(this.sunLightParams, 'color', {
                view: 'color',
                label: 'Sun Color'
            }).on('change', (ev) =>
            {
                this.sunLight.color.set(ev.value);
            });

            sunFolder.addBinding(this.sunLight, 'intensity', { min: 0, max: 10, step: 0.001, label: 'Intensity' })

            sunFolder.addBinding(this.sunLight.position, 'x', { min: -1500, max: 1500, label: 'PosX' })
            sunFolder.addBinding(this.sunLight.position, 'y', { min: 0, max: 1000, label: 'PosY' })
            sunFolder.addBinding(this.sunLight.position, 'z', { min: -1500, max: 1500, label: 'PosZ' })

            sunFolder.addBinding(this.sunLight.shadow.camera, 'far', { min: 500, max: 5000, label: 'Shadow Far' })
                .on('change', (ev) =>
                {
                    this.sunLight.shadow.camera.far = ev.value;
                    this.sunLight.shadow.camera.updateProjectionMatrix();
                    this.sunLightHelper.update();
                });

            sunFolder.addBinding(this.sunLight.shadow.camera, 'near', { min: 0, max: 1000, label: 'Shadow Near' })
                .on('change', (ev) =>
                {
                    this.sunLight.shadow.camera.near = ev.value;
                    this.sunLight.shadow.camera.updateProjectionMatrix();
                    this.sunLightHelper.update();
                });

            this.sunLightHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
            // this.sunLightHelper.visible = false
            this.scene.add(this.sunLightHelper);
            sunFolder.addBinding(this.sunLightHelper, 'visible', { label: 'Show Shadow Helper' })
        }
    }

    setEnvironmentMap()
    {
        this.environmentMap = {}
        this.environmentMap.intensity = 0.4

        this.environmentMap.texture = this.resources.items.pillarScapeEMTexture

        if (!this.environmentMap.texture)
        {
            console.warn('Environment texture not found in resources.')
            return
        }

        this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace

        this.scene.environment = this.environmentMap.texture

        this.environmentMap.updateMaterials = () =>
        {
            this.scene.traverse((child) =>
            {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
                {
                    child.material.envMap = this.environmentMap.texture
                    child.material.envMapIntensity = this.environmentMap.intensity
                    child.material.needsUpdate = true
                }
            })
        }
        this.environmentMap.updateMaterials()

        if (this.debug.active)
        {
            const envFolder = this.debugFolder.addFolder({ title: 'Env Map' })
            envFolder.addBinding(this.environmentMap, 'intensity', {
                min: 0,
                max: 1,
                step: 0.01,
                label: 'Env Intensity'
            })
                .on('change', () =>
                {
                    this.environmentMap.updateMaterials()
                })
        }
    }

    setGradientBackground()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 2
        canvas.height = 512

        const context = canvas.getContext('2d')
        const gradient = context.createLinearGradient(0, 0, 0, 512)

        gradient.addColorStop(0, '#1a5b8c')
        gradient.addColorStop(1, '#87ceeb')

        context.fillStyle = gradient
        context.fillRect(0, 0, 2, 512)

        const bgTexture = new THREE.CanvasTexture(canvas)
        bgTexture.colorSpace = THREE.SRGBColorSpace

        this.scene.background = bgTexture
    }

    setClouds()
    {
        const cloudTextures = [
            this.resources.items.cloud1,
            this.resources.items.cloud2,
            this.resources.items.cloud3,
            this.resources.items.cloud4,
            this.resources.items.cloud5,
            this.resources.items.cloud6,
            this.resources.items.cloud7,
            this.resources.items.cloud8,
            this.resources.items.cloud9,
            this.resources.items.cloud10
        ].filter(tex => tex !== undefined)

        if (cloudTextures.length === 0)
        {
            console.warn('No cloud textures found! Check your resources.')
            return
        }

        this.clouds = []
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

            const startX = (Math.random() - 0.5) * 800
            const startY = 200 + Math.random() * 100
            const startZ = -500 - Math.random() * 500

            cloudMesh.position.set(startX, startY, startZ)

            const randomScale = Math.random() * 0.8 + 0.5
            cloudMesh.scale.set(randomScale, randomScale, randomScale)

            cloudMesh.userData.speed = Math.random() * 0.05 + 0.02

            this.scene.add(cloudMesh)
            this.clouds.push(cloudMesh)
        }



        this.planetParams = {
            size: 1000,
            opacity: 0.4,
            x: 0,
            y: 550,
            z: -1500,
        }

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
                    
                    // Calculate "brightness" (Luminance)
                    float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

                    // FILTER LOGIC:
                    // If brightness is low (dark), make it invisible.
                    // We use smoothstep for a soft edge, or step() for a hard cut.
                    float alpha = smoothstep(0.1, 0.9, brightness); 

                    // Combine the texture color with the calculated alpha and your global low opacity
                    gl_FragColor = vec4(texColor.rgb, alpha * uOpacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            // depthTest: false
        });

        const planetBackground = new THREE.Mesh(geometry, material);

        //         const startX = (Math.random() - 0.5) * 800
        //         const startY = 200 + Math.random() * 400
        //         const startZ = -500 - Math.random() * 500

        planetBackground.position.set(this.planetParams.x, this.planetParams.y, this.planetParams.z);

        planetBackground.renderOrder = -1;

        this.scene.add(planetBackground);

        if (this.debug.active)
        {
            const planetFolder = this.debugFolder.addFolder({ title: 'Planet' })
            planetFolder.addBinding(this.planetParams, 'opacity', { min: 0, max: 1, label: 'Opacity' })
                .on('change', (ev) =>
                {
                    material.uniforms.uOpacity.value = ev.value;
                });

            planetFolder.addBinding(this.planetParams, 'x', { min: -1000, max: 1000, label: 'X' })
                .on('change', (ev) =>
                {
                    planetBackground.position.set(ev.value, this.planetParams.y, this.planetParams.z);
                });

            planetFolder.addBinding(this.planetParams, 'y', { min: -1000, max: 1000, label: 'Y' })
                .on('change', (ev) =>
                {
                    planetBackground.position.set(this.planetParams.x, ev.value, this.planetParams.z);
                });

            planetFolder.addBinding(this.planetParams, 'z', { min: -2000, max: 0, label: 'Z' })
                .on('change', (ev) =>
                {
                    planetBackground.position.set(this.planetParams.x, this.planetParams.y, ev.value);
                });


        }
    }

    setFog()
    {
        this.fogParams = {
            color: 0xa0d1ff,
            near: 200,
            far: 2000
        }

        this.scene.fog = new THREE.Fog(this.fogParams.color, this.fogParams.near, this.fogParams.far);

        this.scene.fog.exclude = [this.clouds]

        if (this.debug.active)
        {
            const fogFolder = this.debugFolder.addFolder({ title: 'Fog' })
            fogFolder.addBinding(this.fogParams, 'color', {
                view: 'color',
                label: 'Fog Color'
            }).on('change', (ev) =>
            {
                this.scene.fog.color.set(ev.value);
            });

            fogFolder.addBinding(this.fogParams, 'near', { min: 0, max: 1000, label: 'Fog Near' })
                .on('change', (ev) =>
                {
                    this.scene.fog.near = ev.value;
                });

            fogFolder.addBinding(this.fogParams, 'far', { min: 500, max: 5000, label: 'Fog Far' })
                .on('change', (ev) =>
                {
                    this.scene.fog.far = ev.value;
                });
        }
    }

    update()
    {
        if (this.clouds)
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
}