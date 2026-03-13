import * as THREE from "three";
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

        this.isEnabled = false;

        this.keyMap = {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD']
        };

        this._handleKeyDown = (e) => this.handleKey(e.code, true);
        this._handleKeyUp = (e) => this.handleKey(e.code, false);

        this.initEventListeners();
    }

    initEventListeners()
    {
        this.isEnabled = true;
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
    }



    handleKey(code, isPressed)
    {
        if (!this.isEnabled) return;

        if (this.keyMap.left.includes(code)) this.input.left = isPressed;
        if (this.keyMap.right.includes(code)) this.input.right = isPressed;
    }

    update()
    {
        if (!this.isEnabled) return;

        const deltaTime = this.experience.time.delta;
        let targetVelocity = 0;

        if (this.input.left) targetVelocity = -this.maxSpeed;
        if (this.input.right) targetVelocity = this.maxSpeed;

        if (targetVelocity !== 0)
        {
            this.velocity = THREE.MathUtils.lerp(this.velocity, targetVelocity, this.turnSpeed * deltaTime);
        } else
        {
            this.velocity *= Math.pow(this.friction, deltaTime);
        }

        if (Math.abs(this.velocity) < 0.001) this.velocity = 0;
    }

    disable()
    {
        this.isEnabled = false
        this.input = { left: false, right: false };
        this.velocity = 0
        this.forwardSpeed = 0
    }

    reset()
    {
        this.isEnabled = true;
        this.velocity = 0;
        this.input = { left: false, right: false };
        this.forwardSpeed = 2;
    }

    dispose()
    {
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
    }
}