// src/Utils/InputManager.js
import EventEmitter from './EventEmitter.js';

export default class InputManager extends EventEmitter
{
  constructor()
  {
    super();

    window.addEventListener('keydown', (event) =>
    {
      // this.trigger('keydown', [event.key]);

      if (event.key === 'Escape')
      {
        this.trigger('escapePressed');
      }
      if (event.key === 'p')
      {
        this.trigger('portalCheatPressed');
      }
    });
  }
}