import Experience from '../Experience.js'
import Environment from './Environment.js'
import Map from './Map.js'
import Ship from './Ship.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.movement = this.experience.movement
        this.resources = this.experience.resources

        // Wait for resources
        this.resources.on('ready', () =>
        {
            // Setup
            this.map = new Map()
            this.ship = new Ship()
            this.environment = new Environment()

            this.gameActive = true
        })
    }

    update()
    {
        if (this.gameActive && this.ship && this.map && this.environment)
        {
            this.ship.update()
            this.map.update(this.movement.velocity, this.movement.forwardSpeed)
            this.environment.update()

            if (this.map.checkCollisions(this.ship.mesh))
            {
                this.gameActive = false
                this.score.gameOver()
                this.handleCrash()
            }
        }
    }

    handleCrash()
    {
        this.gameActive = false;
        setTimeout(() =>
        {
            this.ship.reset();
            this.map.reset();

            this.gameActive = true;
        }, 500);
    }
}