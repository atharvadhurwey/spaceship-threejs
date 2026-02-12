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
    }

    setSunLight()
    {
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.5)
        this.sunLight.castShadow = true

        const shadowSize = 150;
        this.sunLight.shadow.camera.left = -shadowSize;
        this.sunLight.shadow.camera.right = shadowSize;
        this.sunLight.shadow.camera.top = 10;
        this.sunLight.shadow.camera.bottom = -shadowSize;
        this.sunLight.shadow.camera.near = 600;
        this.sunLight.shadow.camera.far = 1200;

        this.sunLight.shadow.mapSize.set(1024 * 2, 1024 * 2);
        this.sunLight.shadow.normalBias = 0.15;
        this.sunLight.position.set(0, 400, -1000);

        this.scene.add(this.sunLight);

        if (this.debug.active)
        {
            const sunFolder = this.debugFolder.addFolder({ title: 'Sun Light' })

            sunFolder.addBinding(this.sunLight, 'color', {
                view: 'color',
                label: 'Sun Color'
            }).on('change', (ev) =>
            {
                this.sunLight.color.set(ev.value);
            });

            sunFolder.addBinding(this.sunLight, 'intensity', { min: 0, max: 2, step: 0.001, label: 'Intensity' })

            sunFolder.addBinding(this.sunLight.position, 'x', { min: -1500, max: 1500, label: 'PosX' })
            sunFolder.addBinding(this.sunLight.position, 'y', { min: 0, max: 1000, label: 'PosY' })
            sunFolder.addBinding(this.sunLight.position, 'z', { min: -1500, max: 1500, label: 'PosZ' })

            this.sunLightHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
            this.sunLightHelper.visible = false
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
                max: 4,
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
        const cloudCount = 8

        for (let i = 0; i < cloudCount; i++)
        {
            const randomTexture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)]

            const cloudGeometry = new THREE.PlaneGeometry(600, 300)
            const cloudMaterial = new THREE.MeshBasicMaterial({
                map: randomTexture,
                transparent: true,
                // opacity: Math.random() * 0.5 + 0.3, 
                depthWrite: false
            })

            const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial)

            const startX = (Math.random() - 0.5) * 5000
            const startY = 200 + Math.random() * 400
            const startZ = -2000 - Math.random() * 500

            cloudMesh.position.set(startX, startY, startZ)

            const randomScale = Math.random() * 0.8 + 0.5
            cloudMesh.scale.set(randomScale, randomScale, randomScale)

            cloudMesh.userData.speed = Math.random() * 0.05 + 0.02

            this.scene.add(cloudMesh)
            this.clouds.push(cloudMesh)
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