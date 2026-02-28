import * as THREE from 'three'
import Experience from '../Experience.js'

import music from '../../../static/music/backgroundMusicCompressed.mp3'

export default class AudioManager 
{
  constructor() 
  {
    this.experience = new Experience()
    this.camera = this.experience.camera.instance

    this.listener = new THREE.AudioListener()
    this.camera.add(this.listener)
    this.backgroundMusic = new THREE.Audio(this.listener)

    this.userVolume = 0.1
    this.isSuppressed = false

    this.loadMusic()
  }

  loadMusic() 
  {
    const audioLoader = new THREE.AudioLoader()
    audioLoader.load(music, (buffer) => 
    {
      this.backgroundMusic.setBuffer(buffer)
      this.backgroundMusic.setLoop(true)
      this.backgroundMusic.setVolume(this.userVolume)
    })
  }

  play() 
  {
    if (this.backgroundMusic.buffer && !this.backgroundMusic.isPlaying) 
    {
      this.backgroundMusic.play()
    }
  }

  pause() 
  {
    if (this.backgroundMusic.isPlaying) 
    {
      this.backgroundMusic.pause()
    }
  }

  setVolume(value) 
  {
    this.userVolume = parseFloat(value)

    if (!this.isSuppressed && this.backgroundMusic.isPlaying) 
    {
      const gainNode = this.backgroundMusic.gain
      const context = this.backgroundMusic.context

      gainNode.gain.cancelScheduledValues(context.currentTime)
      gainNode.gain.setValueAtTime(this.userVolume, context.currentTime)
    }
  }

  suppressVolume(duration = 1.0) 
  {
    this.isSuppressed = true

    if (this.backgroundMusic.isPlaying) 
    {
      const gainNode = this.backgroundMusic.gain
      const context = this.backgroundMusic.context

      const targetVolume = this.userVolume * 0.3

      gainNode.gain.cancelScheduledValues(context.currentTime)
      gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime)
      gainNode.gain.linearRampToValueAtTime(targetVolume, context.currentTime + duration)
    }
  }

  restoreVolume(duration = 1.5) 
  {
    this.isSuppressed = false

    if (this.backgroundMusic.isPlaying) 
    {
      const gainNode = this.backgroundMusic.gain
      const context = this.backgroundMusic.context

      const targetVolume = this.userVolume

      gainNode.gain.cancelScheduledValues(context.currentTime)
      gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime)
      gainNode.gain.linearRampToValueAtTime(targetVolume, context.currentTime + duration)
    }
  }
}