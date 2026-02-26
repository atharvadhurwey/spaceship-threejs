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

        // 1. Add a flag to prevent multiple collision triggers
        this.isResetting = false

        this.resources.on('ready', () =>
        {
            // Setup
            this.levelManager = new LevelManager()
            this.map = new Map()
            this.ship = new Ship()
            this.environment = new Environment()
        })
    }

    update()
    {
        if (this.ship && this.map && this.environment)
        {
            this.ship.update()
            if (this.levelManager) { this.levelManager.update() }
            this.map.update(this.movement.velocity, this.movement.forwardSpeed)
            this.environment.update()


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

    reset()
    {
        this.movement.reset();
        this.ship.reset();
        this.map.reset();
        if (this.levelManager) { this.levelManager.reset(); }

        this.isResetting = false;
    }
}