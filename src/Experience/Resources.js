import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/Addons.js'
import EventEmitter from './Utils/EventEmitter.js'

export default class Resources extends EventEmitter
{
    constructor()
    {
        super()

        this.sources = [
            { name: 'pillarScapeEMTexture', type: 'cubeTexture', path: ['textures/environmentMaps/pillarScape/px.jpg', 'textures/environmentMaps/pillarScape/nx.jpg', 'textures/environmentMaps/pillarScape/py.jpg', 'textures/environmentMaps/pillarScape/ny.jpg', 'textures/environmentMaps/pillarScape/pz.jpg', 'textures/environmentMaps/pillarScape/nz.jpg'] },
            { name: 'pillarScapeModel', type: 'gltfModel', path: 'models/Regions/pillarScape.glb' },
            { name: 'redApexModel', type: 'gltfModel', path: 'models/Regions/redApex.glb' },
            { name: 'spaceship1', type: 'gltfModel', path: 'models/Spaceships/spaceship1.glb' },
            { name: 'cloud1', type: 'texture', path: 'textures/clouds/01.png' },
            { name: 'cloud2', type: 'texture', path: 'textures/clouds/02.png' },
            { name: 'cloud3', type: 'texture', path: 'textures/clouds/03.png' },
            { name: 'cloud4', type: 'texture', path: 'textures/clouds/04.png' },
            { name: 'cloud5', type: 'texture', path: 'textures/clouds/05.png' },
            { name: 'cloud6', type: 'texture', path: 'textures/clouds/06.png' },
            { name: 'cloud7', type: 'texture', path: 'textures/clouds/07.png' },
            { name: 'cloud8', type: 'texture', path: 'textures/clouds/08.png' },
            { name: 'cloud9', type: 'texture', path: 'textures/clouds/09.png' },
            { name: 'cloud10', type: 'texture', path: 'textures/clouds/10.png' },
            { name: 'dudvTexture', type: 'texture', path: 'textures/waterdudv.jpg' },
            { name: 'pillarScapePlanetTexture', type: 'texture', path: 'textures/planet.png' },
            { name: 'redApexPlanetTexture', type: 'texture', path: 'textures/bluePlanet.jpg' }
        ]

        this.items = {}
        this.toLoad = this.sources.length
        this.loaded = 0

        this.setLoaders()
        this.startLoading()
    }

    setLoaders()
    {
        this.loaders = {}
        this.loaders.dracoLoader = new DRACOLoader()
        this.loaders.dracoLoader.setDecoderPath('draco/')
        this.loaders.dracoLoader.setDecoderConfig({ type: 'js' })
        this.loaders.gltfLoader = new GLTFLoader()
        this.loaders.gltfLoader.setDRACOLoader(this.loaders.dracoLoader)
        this.loaders.textureLoader = new THREE.TextureLoader()
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
    }

    startLoading()
    {
        // Load each source
        for (const source of this.sources)
        {
            if (source.type === 'gltfModel')
            {
                this.loaders.gltfLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if (source.type === 'texture')
            {
                this.loaders.textureLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
            else if (source.type === 'cubeTexture')
            {
                this.loaders.cubeTextureLoader.load(
                    source.path,
                    (file) =>
                    {
                        this.sourceLoaded(source, file)
                    }
                )
            }
        }
    }

    sourceLoaded(source, file)
    {
        this.items[source.name] = file

        this.loaded++

        if (this.loaded === this.toLoad)
        {
            this.trigger('ready')
        }
    }
}