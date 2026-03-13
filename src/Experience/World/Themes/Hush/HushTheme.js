import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'

import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Do this once at the top of your file or in the constructor
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export default class HushTheme 
{
  constructor(experience, parentDebugFolder)
  {
    this.name = 'hushTheme'
    this.experience = experience
    this.scene = experience.scene
    this.resources = experience.resources
    this.debug = experience.debug

    // State management
    this.isPaused = false
    this.isDestroyed = false

    this.parentDebugFolder = parentDebugFolder
    this.debugFolders = []

    // Tube Configuration
    this.noise3D = createNoise3D(() => 200)
    this.tubes = []
    this.numberOfTubes = 50
    this.loopLength = 1000
    this.spreadWidth = 500
    this.speed = 2
    this.time = 0
    this.spawnBuffer = 800
    this.oldBackground = null

    // Reusable math objects
    this._shipBox = new THREE.Box3();
    this._shipCenter = new THREE.Vector3();
    this._shipSize = new THREE.Vector3();
    this._inverseMatrix = new THREE.Matrix4();
    this._localShipCenter = new THREE.Vector3();
    this._closestPointOnCurve = new THREE.Vector3();

    this.setEnvironment()
    this.generateTubes()
  }

  setEnvironment() 
  {
    this.oldBackground = this.scene.background
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
    const tubeGeometry = new THREE.TubeGeometry(curve, 150, 5, 12, false);

    tubeGeometry.computeBoundsTree();

    const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    return new THREE.Mesh(tubeGeometry, tubeMaterial);
  }

  generateTubes() 
  {
    const stripOffsets = [-1, 0, 1]
    stripOffsets.forEach((offsetMultiplier) => 
    {
      const stripOffsetX = offsetMultiplier * this.spreadWidth
      for (let i = 0; i < this.numberOfTubes; i++)
      {
        const zSpacing = this.loopLength / this.numberOfTubes
        const initialZ = (i * zSpacing - this.loopLength) - this.spawnBuffer
        const startXLocal = (Math.random() - 0.5) * this.spreadWidth
        const initialX = stripOffsetX + startXLocal

        const curve = this.createLocalCurve(i)
        const tube = this.buildTubeMesh(curve)
        tube.position.x = initialX
        tube.position.z = initialZ

        this.scene.add(tube)
        this.tubes.push(tube)
      }
    })
  }

  createLocalCurve(seed) 
  {
    const verticalOffset = 300
    const verticalVariance = 150
    const startX = 0
    const endX = (Math.random() - 0.5) * 30

    const startsHigh = Math.random() > 0.5
    const startY = startsHigh
      ? verticalOffset + Math.random() * verticalVariance
      : -verticalOffset - Math.random() * verticalVariance
    const endY = startsHigh
      ? -verticalOffset - Math.random() * verticalVariance
      : verticalOffset + Math.random() * verticalVariance

    const startPoint = new THREE.Vector3(startX, startY, -100)
    const endPoint = new THREE.Vector3(endX, endY, 50)

    return this.createWindingCurve(startPoint, endPoint, 80, seed)
  }

  regenerateTube(tube) 
  {
    if (this.isDestroyed) return;

    if (tube.geometry.boundsTree) tube.geometry.disposeBoundsTree();
    tube.geometry.dispose();

    const randomSeed = Math.random() * 1000;
    const newCurve = this.createLocalCurve(randomSeed);
    const newGeo = new THREE.TubeGeometry(newCurve, 150, 5, 12, false);
    newGeo.computeBoundsTree();

    tube.geometry = newGeo;
  }

  // PAUSE / RESUME LOGIC
  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }

  update() 
  {
    if (this.isPaused || this.isDestroyed) return;

    const { delta } = this.experience.time;
    const { velocity, forwardSpeed } = this.experience.world.movement;

    this.time += delta * 0.001;

    const totalWidth = this.spreadWidth * 3;
    const halfTotalWidth = totalWidth / 2;

    this.tubes.forEach((tube) =>
    {
      tube.position.z += forwardSpeed * delta * this.speed;
      tube.position.x -= velocity * delta * this.speed;

      if (tube.position.z > 300)
      {
        tube.position.z -= this.loopLength;
        this.regenerateTube(tube);
      }

      if (tube.position.x > halfTotalWidth) 
      {
        tube.position.x -= totalWidth;
        this.regenerateTube(tube);
      }
      else if (tube.position.x < -halfTotalWidth) 
      {
        tube.position.x += totalWidth;
        this.regenerateTube(tube);
      }
    })
  }

  checkCollisions(shipCollider)
  {
    if (!shipCollider || this.isDestroyed || this.isPaused) return null;

    shipCollider.updateMatrixWorld();
    this._shipBox.setFromObject(shipCollider);
    this._shipBox.getCenter(this._shipCenter);
    this._shipBox.getSize(this._shipSize);

    const shipRadius = Math.max(this._shipSize.x, this._shipSize.y) * 0.5;

    for (let i = 0; i < this.tubes.length; i++)
    {
      const tube = this.tubes[i];
      this._inverseMatrix.copy(tube.matrixWorld).invert();
      this._localShipCenter.copy(this._shipCenter).applyMatrix4(this._inverseMatrix);

      let hit = false;
      // Using optional chaining just in case a tube is mid-regeneration
      tube.geometry.boundsTree?.shapecast({
        intersectsBounds: (box) =>
        {
          const localSphere = { center: this._localShipCenter, radius: shipRadius };
          return box.intersectsSphere(localSphere);
        },
        intersectsTriangle: (tri) =>
        {
          if (tri.closestPointToPoint(this._localShipCenter, this._closestPointOnCurve).distanceTo(this._localShipCenter) < shipRadius)
          {
            hit = true;
            return true;
          }
        }
      });

      if (hit) return tube.position.clone();
    }
    return null;
  }

  hide() 
  {
    this.tubes.forEach(tube => tube.visible = false);
    this.destroy();
  }

  destroy() 
  {
    this.isDestroyed = true;
    this.dispose();
  }

  dispose()
  {
    this.scene.background = this.oldBackground
    this.tubes.forEach((tube) =>
    {
      this.scene.remove(tube);
      if (tube.geometry)
      {
        if (tube.geometry.boundsTree) tube.geometry.disposeBoundsTree();
        tube.geometry.dispose();
      }
      if (tube.material) tube.material.dispose();
    });

    this.tubes = [];

    if (this.debugFolders)
    {
      this.debugFolders.forEach(folder =>
      {
        if (folder.dispose) folder.dispose();
        else if (folder.destroy) folder.destroy();
      });
      this.debugFolders = [];
    }
  }

  reset() 
  {
    this.isDestroyed = false;
    this.isPaused = false;
    this.time = 0;

    const stripOffsets = [-1, 0, 1];
    let tubeIndex = 0;

    stripOffsets.forEach((offsetMultiplier) =>
    {
      const stripOffsetX = offsetMultiplier * this.spreadWidth;
      for (let i = 0; i < this.numberOfTubes; i++)
      {
        const tube = this.tubes[tubeIndex];
        if (!tube) return;

        const zSpacing = this.loopLength / this.numberOfTubes;
        const initialZ = (i * zSpacing - this.loopLength) - this.spawnBuffer;
        const startXLocal = (Math.random() - 0.5) * this.spreadWidth;

        tube.position.set(stripOffsetX + startXLocal, 0, initialZ);
        tube.visible = true;
        this.regenerateTube(tube);
        tubeIndex++;
      }
    });
  }
}