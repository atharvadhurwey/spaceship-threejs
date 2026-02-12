export default class Score
{
  constructor()
  {
    this.currentDistance = 0;
    this.highScore = localStorage.getItem('breakneck_highscore') || 0;
    this.isGameOver = false;

    this.createUI();
  }

  createUI()
  {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '20px';
    this.container.style.left = '20px';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '24px';
    this.container.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    this.container.innerHTML = `
            <div>DISTANCE: <span id="dist">000000</span>m</div>
            <div style="font-size: 14px; opacity: 0.7;">BEST: <span id="best">${this.highScore}</span>m</div>
        `;
    document.body.appendChild(this.container);

    this.distElement = document.getElementById('dist');
  }

  update(forwardSpeed)
  {
    if (this.isGameOver) return;

    this.currentDistance += forwardSpeed;

    const formatted = Math.floor(this.currentDistance).toString().padStart(6, '0');
    this.distElement.innerText = formatted;
  }

  reset()
  {
    if (this.currentDistance > this.highScore)
    {
      this.highScore = Math.floor(this.currentDistance);
      localStorage.setItem('breakneck_highscore', this.highScore);
      document.getElementById('best').innerText = this.highScore;
    }

    this.currentDistance = 0;
    this.isGameOver = false;
  }

  gameOver()
  {
    this.isGameOver = true;
  }
}