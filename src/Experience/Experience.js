import * as THREE from 'three'

import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import World from './World/World.js'
import Resources from './Resources.js'
import Movement from './Utils/Movement.js'
import Score from './Utils/Score.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

let instance = null

export default class Experience
{
    constructor(_canvas)
    {
        if (instance) return instance
        instance = this

        window.experience = this

        this.canvas = _canvas

        this.stats = new Stats()
        this.stats.showPanel(0)
        document.body.appendChild(this.stats.dom)

        // Setup
        this.debug = new Debug()
        this.sizes = new Sizes()
        this.time = new Time()
        this.scene = new THREE.Scene()
        this.resources = new Resources()
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.score = new Score()
        this.movement = new Movement()
        this.world = new World()

        this.sizes.on('resize', () =>
        {
            this.resize()
        })

        this.time.on('tick', () =>
        {
            this.update()
        })
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
    }

    update()
    {
        this.stats.begin()

        this.camera.update()
        this.movement.update()
        this.world.update()
        this.renderer.update()

        this.stats.end()
    }

    destroy()
    {
        document.body.removeChild(this.stats.dom)
        this.sizes.off('resize')
        this.time.off('tick')

        this.scene.traverse((child) =>
        {
            if (child instanceof THREE.Mesh)
            {
                child.geometry.dispose()

                for (const key in child.material)
                {
                    const value = child.material[key]

                    if (value && typeof value.dispose === 'function')
                    {
                        value.dispose()
                    }
                }
            }
        })

        this.camera.controls.dispose()
        this.renderer.instance.dispose()

        if (this.debug.active)
            this.debug.ui.destroy()
    }
}