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
            { name: 'hand', type: 'gltfModel', path: 'models/Regions/hand.glb' },
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