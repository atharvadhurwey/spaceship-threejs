import * as THREE from 'three'
import gsap from 'gsap'
import { createNoise3D } from 'simplex-noise'

export default class HushTheme 
{
  constructor(experience, parentDebugFolder)
  {
    this.name = 'hushTheme'
    this.experience = experience
    this.scene = experience.scene
    this.resources = experience.resources
    this.debug = experience.debug

    this.parentDebugFolder = parentDebugFolder
    this.debugFolders = []

    // 1. Tube Configuration
    this.noise3D = createNoise3D()
    this.tubes = []
    this.numberOfTubes = 50
    this.loopLength = 1000
    this.spreadWidth = 500
    this.speed = 2
    this.time = 0

    // 2. Initialization
    this.setEnvironment()
    this.generateTubes()
  }

  setEnvironment() 
  {
    this.scene.background = new THREE.Color(0xff0000)
  }

  createWindingCurve(startPos, endPos, pointCount, tubeIndex) 
  {
    const points = []
    const noiseScale = 0.005
    const maxDisplacement = 100.0

    for (let i = 0; i <= pointCount; i++)
    {
      const t = i / pointCount
      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, t)
      const taper = Math.sin(t * Math.PI)

      const noiseX = this.noise3D((currentPos.x + tubeIndex * 100) * noiseScale, currentPos.y * noiseScale, currentPos.z * noiseScale)
      const noiseY = this.noise3D(currentPos.x * noiseScale, (currentPos.y + tubeIndex * 100) * noiseScale, currentPos.z * noiseScale)
      const noiseZ = this.noise3D(currentPos.x * noiseScale, currentPos.y * noiseScale, (currentPos.z + tubeIndex * 100) * noiseScale)

      currentPos.x += noiseX * maxDisplacement * taper
      currentPos.y += noiseY * maxDisplacement * taper
      currentPos.z += noiseZ * maxDisplacement * taper

      points.push(currentPos)
    }
    return new THREE.CatmullRomCurve3(points)
  }

  buildTubeMesh(curve) 
  {
    const tubeGeometry = new THREE.TubeGeometry(curve, 150, 3, 12, false)
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1,
    })
    return new THREE.Mesh(tubeGeometry, tubeMaterial)
  }

  generateTubes() 
  {
    const verticalOffset = 300
    const verticalVariance = 150

    for (let i = 0; i < this.numberOfTubes; i++)
    {
      const zSpacing = this.loopLength / this.numberOfTubes
      const initialZ = i * zSpacing - this.loopLength

      const startX = (Math.random() - 0.5) * this.spreadWidth
      const endX = startX + (Math.random() - 0.5) * 30

      const startsHigh = Math.random() > 0.5

      const startY = startsHigh
        ? verticalOffset + Math.random() * verticalVariance
        : -verticalOffset - Math.random() * verticalVariance

      const endY = startsHigh
        ? -verticalOffset - Math.random() * verticalVariance
        : verticalOffset + Math.random() * verticalVariance

      const startPoint = new THREE.Vector3(startX, startY, -100)
      const endPoint = new THREE.Vector3(endX, endY, 50)

      const curve = this.createWindingCurve(startPoint, endPoint, 80, i)
      const tube = this.buildTubeMesh(curve)

      tube.position.z = initialZ

      this.scene.add(tube)
      this.tubes.push(tube)
    }
  }

  update() 
  {
    const { delta } = this.experience.time;
    const { velocity, forwardSpeed } = this.experience.world.movement;

    this.time += delta * 0.001;

    const halfSpread = this.spreadWidth / 2;

    this.tubes.forEach((tube) =>
    {
      tube.position.z += forwardSpeed * delta * this.speed;

      tube.position.x -= velocity * delta * this.speed;

      if (tube.position.z > 300)
      {
        tube.position.z -= this.loopLength;
      }

      if (tube.position.x > halfSpread) 
      {
        tube.position.x -= this.spreadWidth;
      }
      else if (tube.position.x < -halfSpread) 
      {
        tube.position.x += this.spreadWidth;
      }
    })
  }
}