import Experience from '../Experience.js';

export default class LevelManager
{
  constructor()
  {
    this.experience = new Experience();
    this.time = this.experience.time;

    this.survivalTimes = {
      'pillarScape': 3000,
      'redApex': 4500,
      'voidEye': 6000
    }

    this.currentMapName = 'pillarScape';
    this.targetSurvivalTime = this.survivalTimes[this.currentMapName];

    this.elapsedTime = 0;
    this.isTransitioning = false;

    this.timerElement = document.getElementById('timer-display');

    this.hasFiredRedApexEvent = false;
  }

  setTimerForMap(mapName)
  {
    this.currentMapName = mapName;

    if (mapName == 'pillarScape')
    {
      this.targetSurvivalTime = this.survivalTimes['pillarScape'];
    } else if (mapName == 'redApex')
    {
      this.targetSurvivalTime = this.survivalTimes['redApex'];
    } else if (mapName == 'voidEye')
    {
      this.targetSurvivalTime = this.survivalTimes['voidEye'];
    }
  }

  update()
  {
    if (this.isTransitioning)
    {
      if (this.timerElement) this.timerElement.innerText = " ";
      return;
    }

    this.elapsedTime += this.time.delta;

    let remainingTime = this.targetSurvivalTime - this.elapsedTime;
    if (remainingTime < 0) remainingTime = 0;

    const currentDisplayTime = Math.ceil(remainingTime / 100);

    if (this.currentMapName === 'redApex' && currentDisplayTime === 25 && !this.hasFiredRedApexEvent) 
    {
      this.redApexEvent();
      this.hasFiredRedApexEvent = true;
    }

    this.updateTimerUI(remainingTime);

    if (this.elapsedTime >= this.targetSurvivalTime)
    {
      this.triggerPortal();
    }
  }

  redApexEvent()
  {
    this.experience.world.environment.currentThemeInstance.triggerRedApexEvent(5, 10);
  }

  updateTimerUI(timeInMs)
  {
    if (!this.timerElement) return;
    const totalSeconds = Math.ceil(timeInMs / 100);

    this.timerElement.innerText = totalSeconds.toString();
  }

  triggerPortal()
  {
    this.isTransitioning = true;

    const portal = this.experience.world.map.portal;
    if (portal && !portal.canExitPortal)
    {
      portal.enter();
    }
  }

  onTransitionComplete()
  {
    this.isTransitioning = false;
    this.elapsedTime = 0;

    this.hasFiredRedApexEvent = false;
  }

  stop()
  {
    this.isTransitioning = false;
    this.elapsedTime = 0;
    this.isTransitioning = true;

    this.updateTimerUI(this.targetSurvivalTime);
  }

  reset()
  {
    this.elapsedTime = 0;
    this.isTransitioning = false;

    if (this.hasFiredRedApexEvent) this.experience.world.environment.currentThemeInstance.resetPyramid()
    this.hasFiredRedApexEvent = false;

    this.updateTimerUI(this.targetSurvivalTime);
  }
}