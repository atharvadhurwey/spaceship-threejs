import { Pane } from 'tweakpane'

export default class Debug
{
    constructor()
    {
        this.active = window.location.hash === '#debug'
        // this.active = true

        if (this.active)
        {
            this.ui = new Pane({
                title: 'Experience Debug',
                expanded: true
            })
        }
    }
}