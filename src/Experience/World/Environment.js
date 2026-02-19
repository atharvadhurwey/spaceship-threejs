import * as THREE from 'three'
import Experience from '../Experience.js'

import redSunVertShader from '../Shaders/RedSun/vert.glsl';
import redSunFragShader from '../Shaders/RedSun/frag.glsl';

import mountainVertShader from '../Shaders/Mountains/vert.glsl';
import mountainFragShader from '../Shaders/Mountains/frag.glsl';

import pyramidVertShader from '../Shaders/Pyramid/vert.glsl';
import pyramidFragShader from '../Shaders/Pyramid/frag.glsl';

import { MAP_THEMES } from '../Utils/configFile'

export default class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.time = this.experience.time

        this.themeGroup = null;

        if (this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder({ title: 'Environment', expanded: true })
        }

        this.setSunLight()
        this.setEnvironmentMap()
        this.setGradientBackground()
        this.setFog()

        this.switchTheme('pillar')

        if (this.debug.active)
        {
            const debugObject = {
                Map: 'pillar'
            }

            this.debugFolder.addBinding(debugObject, 'Map', {
                options: {
                    pillarScape: 'pillar',
                    redApex: 'pyramid',
                }
            }).on('change', (ev) => { this.switchTheme(ev.value) })
        }
    }


    clearThemeObjects()
    {
        if (this.themeGroup)
        {
            this.scene.remove(this.themeGroup)

            this.themeGroup.traverse((child) =>
            {
                if (child instanceof THREE.Mesh)
                {
                    if (child.geometry) child.geometry.dispose()

                    if (child.material)
                    {
                        if (Array.isArray(child.material)) 
                        {
                            child.material.forEach(mat => mat.dispose())
                        }
                        else
                        {
                            child.material.dispose()
                        }
                    }
                }
            })

            this.themeGroup = null
            this.clouds = null
            this.pyramid = null

            if (this.debug.active)
            {
                if (this.planetFolder) this.debugFolder.remove(this.planetFolder)
                if (this.mountainFolder) this.debugFolder.remove(this.mountainFolder)
                if (this.pyramidFolder) this.debugFolder.remove(this.pyramidFolder)
            }
        }
    }

    setRedApexEnviornment()
    {
        this.themeGroup = new THREE.Group()
        this.scene.add(this.themeGroup)

        this.planetParams = {
            size: 1000,
            opacity: 1.0,
            dir: { x: 0, y: 760, z: -1500 },
            color: 0xff2222,
            fresnelColor: 0xff5555,
            fresnelPower: 2.0,
            fresnelIntensity: 1.5,
            centerOpacity: 0.0
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
            vertexShader: redSunVertShader,
            fragmentShader: redSunFragShader,
            transparent: true,
            depthWrite: false,
        });

        const planetBackground = new THREE.Mesh(planetGeo, planetMat);
        planetBackground.position.set(this.planetParams.dir.x, this.planetParams.dir.y, this.planetParams.dir.z);
        planetBackground.renderOrder = -1;

        this.themeGroup.add(planetBackground);

        if (this.debug.active)
        {
            this.planetFolder = this.debugFolder.addFolder({ title: 'Planet', expanded: false })

            this.planetFolder.addBinding(this.planetParams, 'opacity', { min: 0, max: 1, label: 'Opacity' })
                .on('change', (ev) => { planetMat.uniforms.uOpacity.value = ev.value; });

            this.planetFolder.addBinding(this.planetParams, 'dir', { label: 'Direction' })
                .on('change', (ev) => { planetBackground.position.set(ev.value.x, ev.value.y, ev.value.z); });

            this.planetFolder.addBinding(this.planetParams, 'fresnelColor', { view: 'color', label: 'FrColor' })
                .on('change', (ev) => { planetMat.uniforms.uFresnelColor.value.set(ev.value); });

            this.planetFolder.addBinding(this.planetParams, 'fresnelPower', { min: 0.1, max: 10.0, label: 'FrPower' })
                .on('change', (ev) => { planetMat.uniforms.uFresnelPower.value = ev.value; });

            this.planetFolder.addBinding(this.planetParams, 'fresnelIntensity', { min: 0.0, max: 5.0, label: 'FrIntensity' })
                .on('change', (ev) => { planetMat.uniforms.uFresnelIntensity.value = ev.value; });

            this.planetFolder.addBinding(this.planetParams, 'centerOpacity', { min: 0.0, max: 1.0, label: 'CeOpacity' })
                .on('change', (ev) => { planetMat.uniforms.uCenterOpacity.value = ev.value; });
        }

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

        const backgroundScreen = new THREE.Mesh(mountainGeo, mountainMat);
        backgroundScreen.position.set(this.mountainParams.dir.x, this.mountainParams.dir.y, this.mountainParams.dir.z);

        this.themeGroup.add(backgroundScreen);

        if (this.debug.active)
        {
            this.mountainFolder = this.debugFolder.addFolder({ title: 'Mountains', expanded: false });

            this.mountainFolder.addBinding(this.mountainParams, 'width', { min: 0, max: 5000, step: 1, label: 'Width' })
                .on('change', () => { updateGeometry(); });

            this.mountainFolder.addBinding(this.mountainParams, 'height', { min: 10, max: 600, step: 1, label: 'Height' })
                .on('change', () => { updateGeometry(); });

            const updateGeometry = () =>
            {
                backgroundScreen.geometry.dispose();
                backgroundScreen.geometry = new THREE.PlaneGeometry(this.mountainParams.width, this.mountainParams.height, 1, 1);
            };

            this.mountainFolder.addBinding(this.mountainParams, 'dir', { label: 'Direction' })
                .on('change', (ev) => { backgroundScreen.position.set(ev.value.x, ev.value.y, ev.value.z); });

            this.mountainFolder.addBinding(this.mountainParams, 'offset', { min: -2.0, max: 2.0, step: 0.001, label: 'HorizontalScroll' })
                .on('change', (ev) => { mountainMat.uniforms.uOffset.value = ev.value; });

            this.mountainFolder.addBinding(this.mountainParams, 'mountainBaseColor', { view: 'color', label: 'BaseColor' })
                .on('change', (ev) => { mountainMat.uniforms.uMountainBaseColor.value.set(ev.value); });

            this.mountainFolder.addBinding(this.mountainParams, 'mountainPeakColor', { view: 'color', label: 'PeakColor' })
                .on('change', (ev) => { mountainMat.uniforms.uMountainPeakColor.value.set(ev.value); });

            this.mountainFolder.addBinding(this.mountainParams, 'frequency', { min: 1.0, max: 50.0, label: 'Frequency' })
                .on('change', (ev) => { mountainMat.uniforms.uFrequency.value = ev.value; });

            this.mountainFolder.addBinding(this.mountainParams, 'amplitude', { min: 0.0, max: 2.0, label: 'Amplitude' })
                .on('change', (ev) => { mountainMat.uniforms.uAmplitude.value = ev.value; });
        }

        this.pyramidParams = {
            angle: 2.1,
            heightOffset: 0.0,
            baseWidth: 1.5,
            slope: 0.5,
            color: '#b40000',
            splitLevel: 1.5,
            splitGap: 0.27,
            dir: { x: 0, y: 17, z: -1450 },
            width: 1000,
            height: 2000
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
                uSplitGap: { value: this.pyramidParams.splitGap }
            },
            transparent: true
        });

        this.pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
        this.pyramid.position.set(this.pyramidParams.dir.x, this.pyramidParams.dir.y, this.pyramidParams.dir.z);

        this.themeGroup.add(this.pyramid);

        if (this.debug.active)
        {
            this.pyramidFolder = this.debugFolder.addFolder({ title: 'Pyramid Shader', expanded: false });

            this.pyramidFolder.addBinding(this.pyramidParams, 'width', { min: 0, max: 5000, step: 1, label: 'Width' })
                .on('change', () => { updateGeometry(); });

            this.pyramidFolder.addBinding(this.pyramidParams, 'height', { min: 10, max: 2000, step: 1, label: 'Height' })
                .on('change', () => { updateGeometry(); });

            const updateGeometry = () =>
            {
                this.pyramid.geometry.dispose();
                this.pyramid.geometry = new THREE.PlaneGeometry(this.pyramidParams.width, this.pyramidParams.height, 1, 1);
            };


            this.pyramidFolder.addBinding(this.pyramidParams, 'dir', { label: 'Direction' })
                .on('change', (ev) => { this.pyramid.position.set(ev.value.x, ev.value.y, ev.value.z); });

            this.pyramidFolder.addBinding(this.pyramidParams, 'angle', {
                min: 0, max: Math.PI * 2, label: 'Angle'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uAngle.value = ev.value; });

            this.pyramidFolder.addBinding(this.pyramidParams, 'baseWidth', {
                min: 0.1, max: 2.5, label: 'Base Width'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uBaseWidth.value = ev.value; });

            this.pyramidFolder.addBinding(this.pyramidParams, 'slope', {
                min: 0.0, max: 1.0, label: 'Steepness'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uSlope.value = ev.value; });

            this.pyramidFolder.addBinding(this.pyramidParams, 'heightOffset', {
                min: -2.0, max: 2.0, label: 'Y Offset'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uHeightOffset.value = ev.value; });

            // Bindings for the new split parameters
            this.pyramidFolder.addBinding(this.pyramidParams, 'splitLevel', {
                min: 0.0, max: 10.0, label: 'Split Level'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uSplitLevel.value = ev.value; });

            this.pyramidFolder.addBinding(this.pyramidParams, 'splitGap', {
                min: 0.0, max: 5.0, label: 'Split Gap'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uSplitGap.value = ev.value; });

            this.pyramidFolder.addBinding(this.pyramidParams, 'color', {
                view: 'color', label: 'Sand Color'
            }).on('change', (ev) => { this.pyramid.material.uniforms.uSandColor.value.set(ev.value); });
        }
    }

    setPillarScapeEnviornment()
    {
        this.themeGroup = new THREE.Group()
        this.scene.add(this.themeGroup)

        const cloudTextures = [
            this.resources.items.cloud1, this.resources.items.cloud2, this.resources.items.cloud3,
            this.resources.items.cloud4, this.resources.items.cloud5, this.resources.items.cloud6,
            this.resources.items.cloud7, this.resources.items.cloud8, this.resources.items.cloud9,
            this.resources.items.cloud10
        ].filter(tex => tex !== undefined)

        if (cloudTextures.length > 0)
        {
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

                this.themeGroup.add(cloudMesh)
                this.clouds.push(cloudMesh)
            }
        }

        this.planetParams = {
            size: 1000,
            opacity: 0.4,
            dir: { x: 0, y: 500, z: -1500 },
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

        if (this.debug.active)
        {
            this.planetFolder = this.debugFolder.addFolder({ title: 'Planet', expanded: false })
            this.planetFolder.addBinding(this.planetParams, 'opacity', { min: 0, max: 1, label: 'Opacity' })
                .on('change', (ev) =>
                {
                    material.uniforms.uOpacity.value = ev.value;
                });

            this.planetFolder.addBinding(this.planetParams, 'dir', { label: 'Direction' })
                .on('change', (ev) =>
                {
                    planetBackground.position.set(ev.value.x, ev.value.y, ev.value.z);
                });
        }

        this.themeGroup.add(planetBackground);
    }

    switchTheme(themeKey)
    {
        const theme = MAP_THEMES[themeKey]
        if (!theme) return console.warn(`Theme ${themeKey} not found`)

        this.clearThemeObjects()

        this.currentTheme = themeKey

        if (this.scene.fog)
        {
            this.scene.fog.color.setHex(theme.fog.color)
            this.scene.fog.near = theme.fog.near
            this.scene.fog.far = theme.fog.far

            if (this.fogParams)
            {
                this.fogParams.color = theme.fog.color;
                this.fogParams.near = theme.fog.near;
                this.fogParams.far = theme.fog.far;
            }
        }

        if (this.bgColors)
        {
            this.bgColors.top = theme.background.top
            this.bgColors.bottom = theme.background.bottom
            this.updateBackgroundGradient()
        }

        if (this.sunLight)
        {
            this.sunLight.color.setHex(theme.directionalLight.color)
            this.sunLight.intensity = theme.directionalLight.intensity
            this.sunLight.position.set(
                theme.directionalLight.position.x,
                theme.directionalLight.position.y,
                theme.directionalLight.position.z
            )

            if (this.sunLightParams)
            {
                this.sunLightParams.color = theme.directionalLight.color;
                this.sunLightParams.intensity = theme.directionalLight.intensity;
                this.sunLightParams.dir = {
                    x: theme.directionalLight.position.x,
                    y: theme.directionalLight.position.y,
                    z: theme.directionalLight.position.z
                };
            }
        }

        if (this.environmentMap)
        {
            this.environmentMap.intensity = theme.env.intensity
            this.environmentMap.updateMaterials()
        }

        if (themeKey === 'pillar')
        {
            this.setPillarScapeEnviornment()
        }
        else if (themeKey === 'pyramid')
        {
            this.setRedApexEnviornment()
        }

        if (this.experience.world.map && this.experience.world.map.updateTheme)
        {
            this.experience.world.map.updateTheme(theme)
        }

        if (this.debug.active && this.debugFolder)
        {
            this.debugFolder.refresh();
        }
    }

    setSunLight()
    {
        this.sunLightParams = {
            color: MAP_THEMES.pyramid.directionalLight.color || 0x000000,
            intensity: MAP_THEMES.pyramid.directionalLight.intensity || 1.0,
            normalBias: 0.5,
            width: 256,
            height: 256,
            far: 1600,
            near: 750,
            dir: MAP_THEMES.pyramid.directionalLight.position || { x: 520, y: 900, z: -650 },
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
        this.sunLight.position.set(this.sunLightParams.dir.x, this.sunLightParams.dir.y, this.sunLightParams.dir.z);



        this.scene.add(this.sunLight);

        if (this.debug.active)
        {
            const sunFolder = this.debugFolder.addFolder({ title: 'Sun Light', expanded: false });

            sunFolder.addBinding(this.sunLightParams, 'color', { view: 'color', label: 'Color' }).on('change', (ev) =>
            {
                this.sunLight.color.set(ev.value);
            });

            sunFolder.addBinding(this.sunLight, 'intensity', { min: 0, max: 10, step: 0.001, label: 'Intensity' })

            sunFolder.addBinding(this.sunLightParams, 'dir', { label: 'Direction' }).on('change', (ev) =>
            {
                this.sunLight.position.set(ev.value.x, ev.value.y, ev.value.z);
            });

            sunFolder.addBinding(this.sunLight.shadow.camera, 'far', { min: 500, max: 5000, label: 'Far' })
                .on('change', (ev) =>
                {
                    this.sunLight.shadow.camera.far = ev.value;
                    this.sunLight.shadow.camera.updateProjectionMatrix();
                    this.sunLightHelper.update();
                });

            sunFolder.addBinding(this.sunLight.shadow.camera, 'near', { min: 0, max: 1000, label: 'Near' })
                .on('change', (ev) =>
                {
                    this.sunLight.shadow.camera.near = ev.value;
                    this.sunLight.shadow.camera.updateProjectionMatrix();
                    this.sunLightHelper.update();
                });

            this.sunLightHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
            this.scene.add(this.sunLightHelper);
            sunFolder.addBinding(this.sunLightHelper, 'visible', { label: 'Helper' })
        }
    }

    setEnvironmentMap()
    {
        this.environmentMap = {}
        this.environmentMap.intensity = MAP_THEMES.pyramid.env.intensity || 0.4

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
            const envFolder = this.debugFolder.addFolder({ title: 'Env Map', expanded: false })
            envFolder.addBinding(this.environmentMap, 'intensity', { min: 0, max: 1, step: 0.01, label: 'Intensity' })
                .on('change', () =>
                {
                    this.environmentMap.updateMaterials()
                })
        }
    }

    setGradientBackground()
    {
        this.bgColors = {
            top: MAP_THEMES.pyramid.background.top || '#1a5b8c',
            bottom: MAP_THEMES.pyramid.background.bottom || '#87ceeb'
        };

        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = 2;
        this.bgCanvas.height = 512;
        this.bgContext = this.bgCanvas.getContext('2d');

        this.bgTexture = new THREE.CanvasTexture(this.bgCanvas);
        this.bgTexture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = this.bgTexture;

        this.updateBackgroundGradient = () =>
        {
            const gradient = this.bgContext.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, this.bgColors.top);
            gradient.addColorStop(1, this.bgColors.bottom);

            this.bgContext.fillStyle = gradient;
            this.bgContext.fillRect(0, 0, 2, 512);

            this.bgTexture.needsUpdate = true;
        };

        this.updateBackgroundGradient();

        if (this.debug.active) 
        {
            const bgFolder = this.debugFolder.addFolder({ title: 'Background', expanded: false });

            bgFolder.addBinding(this.bgColors, 'top', {
                label: 'SkyTop',
                view: 'color',
            }).on('change', () =>
            {
                this.updateBackgroundGradient();
            });

            bgFolder.addBinding(this.bgColors, 'bottom', {
                label: 'SkyHorizon',
                view: 'color',
            }).on('change', () =>
            {
                this.updateBackgroundGradient();
            });
        }
    }


    setFog()
    {
        this.fogParams = {
            color: MAP_THEMES.pyramid.fog.color || 0x1d0000,
            near: MAP_THEMES.pyramid.fog.near || 200,
            far: MAP_THEMES.pyramid.fog.far || 2000
        }

        this.scene.fog = new THREE.Fog(this.fogParams.color, this.fogParams.near, this.fogParams.far);

        this.scene.fog.exclude = [this.clouds]

        if (this.debug.active)
        {
            const fogFolder = this.debugFolder.addFolder({ title: 'Fog', expanded: false })
            fogFolder.addBinding(this.fogParams, 'color', {
                view: 'color',
                label: 'Fog Color'
            }).on('change', (ev) =>
            {
                this.scene.fog.color.set(ev.value);
            });

            fogFolder.addBinding(this.fogParams, 'near', { min: 0, max: 1000, label: 'FogNear' })
                .on('change', (ev) =>
                {
                    this.scene.fog.near = ev.value;
                });

            fogFolder.addBinding(this.fogParams, 'far', { min: 100, max: 5000, label: 'FogFar' })
                .on('change', (ev) =>
                {
                    this.scene.fog.far = ev.value;
                });
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
}