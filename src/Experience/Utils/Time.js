import EventEmitter from './EventEmitter.js'

export default class Time extends EventEmitter
{
    constructor()
    {
        super()

        this.start = window.performance.now()
        this.current = this.start
        this.elapsed = 0
        this.delta = 16

        this.animationFrameId = null

        document.addEventListener('visibilitychange', () =>
        {
            if (document.hidden)
            {
                window.cancelAnimationFrame(this.animationFrameId)
            } else
            {
                this.current = window.performance.now()
                this.tick()
            }
        })

        this.tick()
    }

    tick()
    {
        const currentTime = window.performance.now()
        const actualDelta = currentTime - this.current

        this.current = currentTime
        this.elapsed = this.current - this.start
        this.delta = actualDelta / (1000 / 60)

        this.trigger('tick')

        this.animationFrameId = window.requestAnimationFrame(() => this.tick())
    }
}