import Experience from '../Experience.js'
import Environment from './Environment.js'
import Map from './Map.js'
import Ship from './Ship.js'
import LevelManager from '../Utils/LevelManager.js'
import AudioManager from './AudioManager.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.movement = this.experience.movement
        this.resources = this.experience.resources

        this.isResetting = false
        this.isStarted = false

        this.audioManager = new AudioManager()

        this.resources.on('ready', () =>
        {
            // Setup
            this.levelManager = new LevelManager()
            this.map = new Map()
            this.ship = new Ship()
            this.environment = new Environment()
            this.setupInstructions()
        })
    }

    setupInstructions()
    {
        const instructionScreen = document.getElementById('instruction-screen')
        const startButton = document.getElementById('start-button')
        const volumeSlider = document.getElementById('volume-slider')

        if (startButton)
        {
            startButton.disabled = false
            startButton.innerText = 'Start Game'

            startButton.addEventListener('click', () => 
            {
                instructionScreen.classList.add('hidden')
                this.audioManager.play()
                this.isStarted = true
                if (this.map.voidEyeAttacks) { this.map.voidEyeAttacks.resume() }
            })
        }

        if (volumeSlider) 
        {
            volumeSlider.addEventListener('input', (event) => 
            {
                this.audioManager.play()
                this.audioManager.setVolume(event.target.value)
            })
        }

        window.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Escape' && instructionScreen.classList.contains('hidden'))
            {
                startButton.innerText = 'Continue'
                instructionScreen.classList.remove('hidden')
                this.isStarted = false
                if (this.map.voidEyeAttacks) { this.map.voidEyeAttacks.pause() }

            }
        })
    }

    update()
    {
        if (this.ship && this.map && this.environment)
        {
            this.ship.update()
            this.environment.update()

            if (this.isStarted) 
            {
                if (this.levelManager) { this.levelManager.update() }
                this.map.update(this.movement.velocity, this.movement.forwardSpeed)

                if (!this.isResetting && this.ship.collisionsEnabled && this.map.checkCollisions(this.ship.mesh))
                {
                    this.isResetting = true

                    this.ship.explode()
                    this.movement.disable()
                    this.levelManager.stop()

                    this.audioManager.suppressVolume(0.2)

                    setTimeout(() => 
                    {
                        this.reset()
                    }, 3000)
                }
            }
        }
    }

    reset()
    {
        this.movement.reset()
        this.ship.reset()
        this.map.reset()
        if (this.levelManager) { this.levelManager.reset() }

        this.isResetting = false

        this.audioManager.restoreVolume(1.0)
    }
}