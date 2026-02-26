import Experience from '../Experience.js'
import Environment from './Environment.js'
import Map from './Map.js'
import Ship from './Ship.js'
import LevelManager from '../Utils/LevelManager.js'

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

        if (startButton)
        {
            startButton.disabled = false
            startButton.innerText = 'Start Game'

            startButton.addEventListener('click', () => 
            {
                instructionScreen.classList.add('hidden')
                this.isStarted = true
            })
        }
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
                    this.movement.disable();
                    this.levelManager.stop();

                    setTimeout(() => 
                    {
                        this.reset();
                    }, 3000);
                }
            }
        }
    }

    reset()
    {
        this.movement.reset();
        this.ship.reset();
        this.map.reset();
        if (this.levelManager) { this.levelManager.reset(); }

        this.isResetting = false;
    }
}