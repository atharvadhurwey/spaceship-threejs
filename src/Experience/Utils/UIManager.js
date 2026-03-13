// src/Utils/UIManager.js
import EventEmitter from './EventEmitter.js'; // Adjust path as needed

export default class UIManager extends EventEmitter
{
  constructor()
  {
    super();

    this.instructionScreen = document.getElementById('instruction-screen');
    this.startButton = document.getElementById('start-button');
    this.volumeSlider = document.getElementById('volume-slider');

    // this.init();
  }

  init()
  {
    if (this.startButton)
    {
      this.startButton.disabled = false;
      this.startButton.innerText = 'Start Game';

      this.startButton.addEventListener('click', () =>
      {
        this.hideInstructions();
        this.trigger('startGame');
      });
    }

    if (this.volumeSlider)
    {
      this.volumeSlider.addEventListener('input', (event) =>
      {
        this.trigger('volumeChanged', [event.target.value]);
      });
    }
  }

  hideInstructions()
  {
    if (this.instructionScreen) this.instructionScreen.classList.add('hidden');
  }

  showInstructions(text = 'Continue')
  {
    if (this.instructionScreen && this.startButton)
    {
      this.startButton.innerText = text;
      this.instructionScreen.classList.remove('hidden');
    }
  }

  isInstructionHidden()
  {
    return this.instructionScreen ? this.instructionScreen.classList.contains('hidden') : true;
  }
}