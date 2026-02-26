import * as THREE from 'three'
import Experience from './Experience.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

export default class Camera
{
    constructor()
    {
        this.experience = new Experience()
        this.debug = this.experience.debug
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas

        this.setInstance()
        this.setControls()
    }

    setInstance()
    {
        this.instance = new THREE.PerspectiveCamera(45, this.sizes.width / this.sizes.height, 0.01, 5000)
        this.instance.position.set(0, 6, 22)
        this.scene.add(this.instance)
    }

    rotateUpsideDown(isUpsideDown = true)
    {
        const state = { angle: isUpsideDown ? 0 : Math.PI }
        const targetAngle = isUpsideDown ? Math.PI : 0

        gsap.to(state, {
            angle: targetAngle,
            duration: 4,
            ease: "none",
            onUpdate: () =>
            {
                const x = Math.sin(state.angle) * 0.01
                const y = Math.cos(state.angle)

                this.instance.up.set(x, y, 0)
                this.controls.update()
            },
            onComplete: () =>
            {
                this.instance.up.x = 0
                this.controls.update()
            }
        })
    }

    reset()
    {
        this.instance.position.set(0, 6, 22)
        this.controls.target.set(0, 7, 0)
        this.instance.up.set(0, 1, 0)
        this.controls.update()
    }

    setControls()
    {
        this.controls = new OrbitControls(this.instance, this.canvas)
        this.controls.enableDamping = true
        this.controls.target.set(0, 7, 0)
        if (!this.debug.active)
        {

            this.controls.enablePan = false
            this.controls.enableRotate = false
            this.controls.enableZoom = false
        }
        this.controls.update()
    }

    resize()
    {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    update()
    {
        this.controls.update()
    }
}