import * as THREE from 'three'
import Experience from '../Experience.js'

import PillarScapeTheme from '../Utils/Themes/PillarScapeTheme.js';
import RedApexTheme from '../Utils/Themes/RedApexTheme.js';

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

        this.currentThemeInstance = null;

        if (this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder({ title: 'Environment', expanded: true })
            this.themeDebugFolder = this.debugFolder.addFolder({ title: 'Current Theme', expanded: true })
        }

        this.setSunLight()
        this.setEnvironmentMap()
        this.setGradientBackground()
        this.setFog()

        this.switchTheme('pillar')

        if (this.debug.active)
        {
            const debugObject = { Map: 'pillar' }
            this.debugFolder.addBinding(debugObject, 'Map', {
                options: {
                    pillarScape: 'pillar',
                    redApex: 'pyramid',
                }
            }).on('change', (ev) => { this.switchTheme(ev.value) })
        }
    }

    switchTheme(themeKey)
    {
        const theme = MAP_THEMES[themeKey]
        if (!theme) return console.warn(`Theme ${themeKey} not found`)

        if (this.currentThemeInstance)
        {
            this.currentThemeInstance.dispose();
            this.currentThemeInstance = null;
        }

        this.currentTheme = themeKey
        this.updateGlobalSettings(theme)

        if (themeKey === 'pillar')
        {
            this.currentThemeInstance = new PillarScapeTheme(this.experience, this.themeDebugFolder)
        }
        else if (themeKey === 'pyramid')
        {
            this.currentThemeInstance = new RedApexTheme(this.experience, this.themeDebugFolder)
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

    updateGlobalSettings(theme)
    {
        // Update Fog
        if (this.scene.fog)
        {
            this.scene.fog.color.setHex(theme.fog.color)
            this.scene.fog.near = theme.fog.near
            this.scene.fog.far = theme.fog.far
            if (this.fogParams) Object.assign(this.fogParams, theme.fog)
        }

        // Update Gradient Background
        if (this.bgColors)
        {
            this.bgColors.top = theme.background.top
            this.bgColors.bottom = theme.background.bottom
            this.updateBackgroundGradient()
        }

        // Update Sun Light
        if (this.sunLight)
        {
            this.sunLight.color.setHex(theme.directionalLight.color)
            this.sunLight.intensity = theme.directionalLight.intensity
            this.sunLight.position.copy(theme.directionalLight.position)
            if (this.sunLightParams)
            {
                this.sunLightParams.color = theme.directionalLight.color;
                this.sunLightParams.intensity = theme.directionalLight.intensity;
                this.sunLightParams.dir = { ...theme.directionalLight.position };
            }
        }

        // Update Env Map
        if (this.environmentMap)
        {
            this.environmentMap.intensity = theme.env.intensity
            this.environmentMap.updateMaterials()
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
        if (this.currentThemeInstance && typeof this.currentThemeInstance.update === 'function')
        {
            this.currentThemeInstance.update();
        }
    }
}