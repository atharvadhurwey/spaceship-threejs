export default class Movement
{
    constructor()
    {
        this.velocity = 0;
        this.currentSpeed = 0;
        this.input = { left: false, right: false };

        this.forwardSpeed = 0.8;
        this.maxSpeed = 0.8
        this.turnSpeed = 0.02;
        this.friction = 0.96;

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
        let targetVelocity = 0;
        if (this.input.left) targetVelocity = -this.maxSpeed;
        if (this.input.right) targetVelocity = this.maxSpeed;

        if (targetVelocity !== 0)
        {
            this.velocity += (targetVelocity - this.velocity) * this.turnSpeed;
        } else
        {
            this.velocity *= this.friction;
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