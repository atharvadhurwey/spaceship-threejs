import Experience from "../Experience";

export default class Movement
{
    constructor()
    {
        this.experience = new Experience();
        this.velocity = 0;
        this.currentSpeed = 0;
        this.input = { left: false, right: false };

        this.forwardSpeed = 2;
        this.maxSpeed = 1.5
        this.turnSpeed = 0.05;
        this.friction = 0.92;

        this.initEventListeners();
    }

    initEventListeners()
    {
        window.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this.handleKey(e.code, false));
    }

    handleKey(code, isPressed)
    {
        if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = isPressed;
        if (code === 'ArrowRight' || code === 'KeyD') this.input.right = isPressed;
    }

    update()
    {
        const deltaTime = this.experience.time.delta;

        let targetVelocity = 0;
        if (this.input.left) targetVelocity = -this.maxSpeed;
        if (this.input.right) targetVelocity = this.maxSpeed;

        if (targetVelocity !== 0)
        {
            this.velocity += (targetVelocity - this.velocity) * this.turnSpeed * deltaTime;
        } else
        {
            this.velocity *= Math.pow(this.friction, deltaTime);
        }

        if (Math.abs(this.velocity) < 0.001) this.velocity = 0;
    }

    reset()
    {
        this.velocity = 0;
        this.input = { left: false, right: false };
        return this.velocity;
    }
}