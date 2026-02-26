import * as THREE from 'three';
import gsap from 'gsap';
import Experience from '../Experience';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Inject BVH methods into THREE
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export default class VoidEyeAttacks
{
  constructor(scene, chunkWidth, chunkLength)
  {
    this.experience = new Experience();
    this.floor = this.experience.world.map.activeFloor;
    this.handModel = this.experience.resources.items.hand;
    this.scene = scene;
    this.chunkWidth = chunkWidth / 2;
    this.chunkLength = chunkLength;

    this.activeAttacks = [];
    this.activeTimers = [];

    // Reusable materials/geometries
    this.cubeGeo = new THREE.BoxGeometry(10, 10, 10);
    this.cubeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });

    this.sphereGeo = new THREE.SphereGeometry(6, 32, 32);
    this.sphereMat = new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0x440000 });

    this.wallGeo = new THREE.BoxGeometry(30, 60, 5);
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9, metalness: 0.2 });
    this.wallMat.castShadow = true;

    this.energyGeo = new THREE.SphereGeometry(2, 16, 16);
    this.energyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.laserGeo = new THREE.CylinderGeometry(6, 6, 1000, 16);
    this.laserGeo.rotateX(Math.PI / 2);
    this.laserMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.spikeGeo = new THREE.ConeGeometry(8, 120, 16);
    this.spikeGeo.computeBoundsTree();
    this.spikeMat = new THREE.MeshStandardMaterial({ color: 0x550000, roughness: 0.3, metalness: 0.8 });

    this.box3 = new THREE.Box3();

    this.isDestroyed = false;
    this.isUpsideDown = true;
    this.isAttacking = false;
    this.lastAttackType = null;

    this.createHand();

    window.addEventListener('keydown', (e) =>
    {
      switch (e.key)
      {
        case '1':
          this.spawnBatch([
            { type: 'wall', x: -75, z: -this.chunkLength * 0.45 },
            { type: 'wall', x: -25, z: -this.chunkLength * 0.45 },
            { type: 'wall', x: 25, z: -this.chunkLength * 0.45 },
            { type: 'wall', x: 75, z: -this.chunkLength * 0.45 },

            { type: 'wall', x: -50, z: -this.chunkLength * 0.5 },
            { type: 'wall', x: 0, z: -this.chunkLength * 0.5 },
            { type: 'wall', x: 50, z: -this.chunkLength * 0.5 },

            { type: 'wall', x: -75, z: -this.chunkLength * 0.55 },
            { type: 'wall', x: -25, z: -this.chunkLength * 0.55 },
            { type: 'wall', x: 25, z: -this.chunkLength * 0.55 },
            { type: 'wall', x: 75, z: -this.chunkLength * 0.55 },

            { type: 'wall', x: -50, z: -this.chunkLength * 0.6 },
            { type: 'wall', x: 0, z: -this.chunkLength * 0.6 },
            { type: 'wall', x: 50, z: -this.chunkLength * 0.6 },

            { type: 'wall', x: -75, z: -this.chunkLength * 0.65 },
            { type: 'wall', x: -25, z: -this.chunkLength * 0.65 },
            { type: 'wall', x: 25, z: -this.chunkLength * 0.65 },
            { type: 'wall', x: 75, z: -this.chunkLength * 0.65 },

          ]);
          break;

        case '2':
          this.spawnBatch([
            { type: 'beam' },
          ]);
          break;
        case '3':
          this.spawnBatch([
            { type: 'spike', x: 0, z: -this.chunkLength * 0.4 },
            { type: 'spike', x: 50, z: -this.chunkLength * 0.45 },
            { type: 'spike', x: -50, z: -this.chunkLength * 0.45 },
            { type: 'spike', x: 0, z: -this.chunkLength * 0.5 },
            { type: 'spike', x: 50, z: -this.chunkLength * 0.55 },
            { type: 'spike', x: -50, z: -this.chunkLength * 0.55 },
            { type: 'spike', x: 0, z: -this.chunkLength * 0.6 },
            { type: 'spike', x: 50, z: -this.chunkLength * 0.65 },
            { type: 'spike', x: -50, z: -this.chunkLength * 0.65 },
            { type: 'spike', x: 0, z: -this.chunkLength * 0.7 },
            { type: 'spike', x: 50, z: -this.chunkLength * 0.75 },
            { type: 'spike', x: -50, z: -this.chunkLength * 0.75 },
          ])
          break;
        case '4':
          this.upSideDownAttack();
          break;
      }
    });
  }

  startAttacking()
  {
    this.isAttacking = true;
    this.triggerRandomAttack();
  }

  stopAttacking()
  {
    this.isAttacking = false;
    if (this.nextAttackTimer) 
    {
      this.nextAttackTimer.kill();
      this.nextAttackTimer = null;
    }
  }

  triggerRandomAttack()
  {
    if (this.isDestroyed || !this.isAttacking) return;


    const attacks = [
      { type: 'walls', delayAfter: 5.5 },
      { type: 'beams', delayAfter: 4.0 },
      { type: 'spikes', delayAfter: 6.5 },
      // { type: 'upSideDown', delayAfter: 3.5 }
    ];

    const availableAttacks = attacks.filter(attack => attack.type !== this.lastAttackType);

    const randomAttack = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];

    this.lastAttackType = randomAttack.type;

    // Execute the chosen attack
    switch (randomAttack.type)
    {
      case 'walls':
        this.spawnBatch([
          { type: 'wall', x: -75, z: -this.chunkLength * 0.4 },
          { type: 'wall', x: -25, z: -this.chunkLength * 0.4 },
          { type: 'wall', x: 25, z: -this.chunkLength * 0.4 },
          { type: 'wall', x: 75, z: -this.chunkLength * 0.4 },
          { type: 'wall', x: -50, z: -this.chunkLength * 0.45 },
          { type: 'wall', x: 0, z: -this.chunkLength * 0.45 },
          { type: 'wall', x: 50, z: -this.chunkLength * 0.45 },
          { type: 'wall', x: -75, z: -this.chunkLength * 0.5 },
          { type: 'wall', x: -25, z: -this.chunkLength * 0.5 },
          { type: 'wall', x: 25, z: -this.chunkLength * 0.5 },
          { type: 'wall', x: 75, z: -this.chunkLength * 0.5 },
          { type: 'wall', x: -50, z: -this.chunkLength * 0.55 },
          { type: 'wall', x: 0, z: -this.chunkLength * 0.55 },
          { type: 'wall', x: 50, z: -this.chunkLength * 0.55 },
          { type: 'wall', x: -75, z: -this.chunkLength * 0.6 },
          { type: 'wall', x: -25, z: -this.chunkLength * 0.6 },
          { type: 'wall', x: 25, z: -this.chunkLength * 0.6 },
          { type: 'wall', x: 75, z: -this.chunkLength * 0.6 },
        ]);
        break;

      case 'beams':
        this.spawnBatch([{ type: 'beam' }]);
        break;

      case 'spikes':
        this.spawnBatch([
          { type: 'spike', x: 0, z: -this.chunkLength * 0.4 },
          { type: 'spike', x: 50, z: -this.chunkLength * 0.45 },
          { type: 'spike', x: -50, z: -this.chunkLength * 0.45 },
          { type: 'spike', x: 0, z: -this.chunkLength * 0.5 },
          { type: 'spike', x: 50, z: -this.chunkLength * 0.55 },
          { type: 'spike', x: -50, z: -this.chunkLength * 0.55 },
          { type: 'spike', x: 0, z: -this.chunkLength * 0.6 },
          { type: 'spike', x: 50, z: -this.chunkLength * 0.65 },
          { type: 'spike', x: -50, z: -this.chunkLength * 0.65 },
          { type: 'spike', x: 0, z: -this.chunkLength * 0.7 },
          { type: 'spike', x: 50, z: -this.chunkLength * 0.75 },
          { type: 'spike', x: -50, z: -this.chunkLength * 0.75 },
        ]);
        break;

      case 'upSideDown':
        this.upSideDownAttack();
        break;
    }

    // Schedule the next attack using the current attack's specific delay
    this.nextAttackTimer = gsap.delayedCall(randomAttack.delayAfter, () => 
    {
      this.triggerRandomAttack();
    });
  }

  createHand()
  {
    this.wallUpAction = null;
    this.gunSignAction = null;
    this.spikeUpAction = null;
    this.upSideDownAction = null;
    this.currentAction = null;

    if (this.handModel.animations && this.handModel.animations.length > 0)
    {
      this.mixer = new THREE.AnimationMixer(this.handModel.scene);

      for (let i = 0; i < this.handModel.animations.length; i++)
      {
        if (this.handModel.animations[i].name == 'gunSign')
        {
          this.gunSignAction = this.mixer.clipAction(this.handModel.animations[i]);
          this.gunSignAction.setLoop(THREE.LoopOnce);
          this.gunSignAction.clampWhenFinished = true;
        }

        if (this.handModel.animations[i].name == 'wallUpSign')
        {
          this.wallUpAction = this.mixer.clipAction(this.handModel.animations[i]);
          this.wallUpAction.setLoop(THREE.LoopOnce);
          this.wallUpAction.clampWhenFinished = true;
        }

        if (this.handModel.animations[i].name == 'spikeUpSign')
        {
          this.spikeUpAction = this.mixer.clipAction(this.handModel.animations[i]);
          this.spikeUpAction.setLoop(THREE.LoopOnce);
          this.spikeUpAction.clampWhenFinished = true;
        }

        if (this.handModel.animations[i].name == 'upSideDownSign')
        {
          this.upSideDownAction = this.mixer.clipAction(this.handModel.animations[i]);
          this.upSideDownAction.setLoop(THREE.LoopOnce);
          this.upSideDownAction.clampWhenFinished = true;
        }
      }
    }

    this.handModel.scene.position.set(0, 120, -600);
    this.scene.add(this.handModel.scene);
  }

  playHandAnimation(type) 
  {
    if (!this.mixer) return;

    let nextAction = null;
    if (type === 'wall') nextAction = this.wallUpAction;
    else if (type === 'gun') nextAction = this.gunSignAction;
    else if (type === 'spike') nextAction = this.spikeUpAction;
    else if (type === 'upSideDown') nextAction = this.upSideDownAction;

    if (!nextAction) return;

    nextAction.reset().play();

    if (this.currentAction && this.currentAction !== nextAction) 
    {
      this.currentAction.crossFadeTo(nextAction, 0.3, true);
    }

    this.currentAction = nextAction;

    gsap.killTweensOf(this.handModel.scene.rotation);
    gsap.killTweensOf(this.handModel.scene.position);

    if (type === 'wall' || type === 'spike') 
    {
      gsap.to(this.handModel.scene.rotation, {
        y: Math.PI,
        x: Math.PI / 3,
        duration: 1,
        ease: "power2.inOut"
      });

      gsap.to(this.handModel.scene.position, {
        y: 120,
        duration: 1,
        ease: "power2.inOut"
      });
    }
    else if (type === 'gun') 
    {
      gsap.to(this.handModel.scene.rotation, {
        y: Math.PI / 2,
        x: Math.PI / 1.75,
        duration: 1,
        ease: "power2.inOut"
      });

      gsap.to(this.handModel.scene.position, {
        y: 120,
        duration: 1,
        ease: "power2.inOut"
      });
    } else if (type === 'upSideDown') 
    {
      gsap.to(this.handModel.scene.rotation, {
        y: 0,
        x: 0,
        duration: 1,
        ease: "power2.inOut"
      });

      gsap.to(this.handModel.scene.position, {
        y: 120,
        duration: 1,
        ease: "power2.inOut"
      });
    }
  }

  spawnSpikes(centerX, centerZ)
  {
    this.playHandAnimation('spike');

    const numSpikes = 6;
    const spacing = 18;
    const startX = centerX - ((numSpikes - 1) * spacing) / 2;

    for (let i = 0; i < numSpikes; i++) 
    {
      const mesh = new THREE.Mesh(this.spikeGeo, this.spikeMat);

      const x = startX + (i * spacing) + (Math.random() * 15 - 7.5);
      const z = centerZ + (Math.random() * 20 - 10);

      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.x = (Math.random() - 0.5) * 0.5;
      mesh.rotation.z = (Math.random() - 0.5) * 0.5;

      mesh.position.set(x, -100, z);

      this.scene.add(mesh);
      this.activeAttacks.push({ mesh, type: 'spike' });

      const baseDelay = 1.5;
      const delay = baseDelay + (i * 0.08);

      const spikeTimer = gsap.delayedCall(delay, () => 
      {
        if (this.isDestroyed || !mesh.parent) return;
        const targetY = 20 + (Math.random() * 20);

        gsap.to(mesh.position, {
          y: targetY,
          duration: 0.25,
          ease: "back.out(1.2)"
        });
      });
      this.activeTimers.push(spikeTimer);
    }
  }

  spawnWall(x, z)
  {
    this.playHandAnimation('wall');
    const mesh = new THREE.Mesh(this.wallGeo, this.wallMat);

    mesh.position.set(x, -60, z);

    this.scene.add(mesh);
    this.activeAttacks.push({ mesh, type: 'wall' });

    const wallTimer = gsap.delayedCall(1.5, () =>
    {
      if (this.isDestroyed || !mesh.parent) return;
      gsap.to(mesh.position, { y: 30, duration: 1.5, ease: "power2.out" });
    });
    this.activeTimers.push(wallTimer);
  }

  spawnBeams()
  {
    this.playHandAnimation('gun');

    const handPos = this.handModel.scene.position;
    const totalShots = 4;
    const shotDelay = 0.5;
    const trackingWarningTime = 0.5;
    const chargeDuration = 2.5;

    const offsets = [
      new THREE.Vector3(-150, -5, 0),
      new THREE.Vector3(0, 150, 0),
      new THREE.Vector3(150, -5, 0),
      new THREE.Vector3(0, -50, 0)
    ];

    for (let i = 0; i < totalShots; i++) 
    {
      const startPos = new THREE.Vector3(
        handPos.x + offsets[i].x,
        handPos.y + offsets[i].y,
        handPos.z + offsets[i].z
      );

      const chargeOrb = new THREE.Mesh(this.energyGeo, this.energyMat);
      chargeOrb.position.copy(startPos);
      chargeOrb.scale.set(0, 0, 0);
      this.scene.add(chargeOrb);

      const chargeTimer = gsap.delayedCall(i * shotDelay, () => 
      {
        if (this.isDestroyed) return;
        gsap.to(chargeOrb.scale, { x: 12, y: 12, z: 12, duration: chargeDuration, ease: "power2.in" });
      });
      this.activeTimers.push(chargeTimer);

      const shotTimer = gsap.delayedCall(chargeDuration + (i * shotDelay), () => 
      {
        if (this.isDestroyed) return;

        const tracker = new THREE.Object3D();
        tracker.position.set(0, 0, -50);
        this.scene.add(tracker);

        const trackerObj = { mesh: tracker, type: 'tracker' };
        this.activeAttacks.push(trackerObj);

        const trackingTimer = gsap.delayedCall(trackingWarningTime, () => 
        {
          if (this.isDestroyed) return;

          const target = tracker.position.clone();

          this.scene.remove(tracker);
          const index = this.activeAttacks.indexOf(trackerObj);
          if (index > -1) this.activeAttacks.splice(index, 1);

          this.scene.remove(chargeOrb);

          if (target.z > 50) return;

          gsap.to(this.handModel.scene.rotation, {
            x: Math.PI / 2.5,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power1.out",
          });

          const beamMat = this.laserMat.clone();
          const laser = new THREE.Mesh(this.laserGeo, beamMat);

          laser.position.copy(startPos).lerp(target, 0.5);
          laser.lookAt(target);

          this.scene.add(laser);
          const attackObj = { mesh: laser, type: 'laser' };
          this.activeAttacks.push(attackObj);

          gsap.to(laser.scale, { x: 0.1, y: 0.1, duration: 0.4, delay: 0.2, ease: "power2.out" });
          gsap.to(beamMat, {
            opacity: 0,
            duration: 0.4,
            delay: 0.2,
            onComplete: () => 
            {
              if (this.isDestroyed) return;
              this.scene.remove(laser);
              beamMat.dispose();
              const laserIndex = this.activeAttacks.indexOf(attackObj);
              if (laserIndex > -1) this.activeAttacks.splice(laserIndex, 1);
            }
          });
        });
        this.activeTimers.push(trackingTimer);
      });
      this.activeTimers.push(shotTimer);

    }
  }

  upSideDownAttack()
  {
    this.playHandAnimation('upSideDown');

    this.experience.camera.rotateUpsideDown(this.isUpsideDown);

    this.isUpsideDown = !this.isUpsideDown;

  }

  spawnBatch(attacksData)
  {
    const floorX = this.experience.world.map.activeFloor?.mesh.position.x || 0;
    attacksData.forEach(attack =>
    {
      const zPos = attack.z ?? -this.chunkLength * 0.5;
      const xPos = (attack.x ?? 0) + floorX;

      if (attack.type === 'wall') this.spawnWall(xPos, zPos);
      else if (attack.type === 'beam') this.spawnBeams();
      else if (attack.type === 'spike') this.spawnSpikes(xPos, zPos);
    });
  }

  update(deltaTime, shipVelocity, forwardSpeed)
  {
    if (this.mixer) this.mixer.update(deltaTime * 0.01);

    for (let i = this.activeAttacks.length - 1; i >= 0; i--)
    {
      const attack = this.activeAttacks[i];

      attack.mesh.position.x -= shipVelocity * deltaTime;
      if (attack.type == 'tracker') continue
      attack.mesh.position.z += forwardSpeed * deltaTime;

      if (attack.mesh.position.z > 50)
      {
        this.scene.remove(attack.mesh);
        this.activeAttacks.splice(i, 1);
      }
    }
  }

  checkCollisions(shipCollider)
  {
    if (!shipCollider) return false;

    shipCollider.updateMatrixWorld();
    const shipBox = new THREE.Box3().setFromObject(shipCollider);

    const shipCenter = new THREE.Vector3();
    shipBox.getCenter(shipCenter);
    const shipSize = new THREE.Vector3();
    shipBox.getSize(shipSize);

    const shipHitRadius = Math.max(shipSize.x, shipSize.y, shipSize.z) * 0.4;

    for (const attack of this.activeAttacks)
    {
      if (attack.type === 'tracker') continue;

      attack.mesh.updateMatrixWorld();

      if (attack.type === 'laser') 
      {
        const start = new THREE.Vector3(0, 0, -500).applyMatrix4(attack.mesh.matrixWorld);
        const end = new THREE.Vector3(0, 0, 500).applyMatrix4(attack.mesh.matrixWorld);

        const line = new THREE.Line3(start, end);
        const closestPoint = new THREE.Vector3();
        line.closestPointToPoint(shipCenter, true, closestPoint);

        const distance = closestPoint.distanceTo(shipCenter);
        const laserRadius = 6;

        if (distance < (shipHitRadius + laserRadius)) return attack.mesh.position.clone();
      }
      else if (attack.type === 'spike')
      {
        const inverseMatrix = new THREE.Matrix4().copy(attack.mesh.matrixWorld).invert();

        const localCenter = shipCenter.clone().applyMatrix4(inverseMatrix);
        const localSphere = new THREE.Sphere(localCenter, shipHitRadius);

        if (attack.mesh.geometry.boundsTree.intersectsSphere(localSphere))
        {
          return attack.mesh.position.clone();
        }
      }
      else 
      {
        this.box3.setFromObject(attack.mesh);
        if (shipBox.intersectsBox(this.box3))
        {
          return attack.mesh.position.clone();
        }
      }
    }
    return null;
  }

  destroy()
  {
    this.stopAttacking();
    this.isDestroyed = true;
    this.clearAllTimers()

    if (this.mixer) 
    {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }

    gsap.killTweensOf(this.handModel.scene.position);
    gsap.killTweensOf(this.handModel.scene.rotation);
    this.scene.remove(this.handModel.scene);

    for (const attack of this.activeAttacks)
    {
      gsap.killTweensOf(attack.mesh.position);
      gsap.killTweensOf(attack.mesh.scale);

      if (attack.mesh.material) 
      {
        gsap.killTweensOf(attack.mesh.material);

        if (attack.type === 'laser')
        {
          attack.mesh.material.dispose();
        }
      }

      this.scene.remove(attack.mesh);
    }
    this.activeAttacks = [];

    for (let i = this.scene.children.length - 1; i >= 0; i--)
    {
      const child = this.scene.children[i];
      if (child.geometry === this.energyGeo)
      {
        gsap.killTweensOf(child.scale);
        this.scene.remove(child);
      }
    }

    this.cubeGeo.dispose();
    this.cubeMat.dispose();
    this.sphereGeo.dispose();
    this.sphereMat.dispose();
    this.wallGeo.dispose();
    this.wallMat.dispose();
    this.energyGeo.dispose();
    this.energyMat.dispose();
    this.laserGeo.dispose();
    this.laserMat.dispose();

    if (this.spikeGeo.boundsTree)
    {
      this.spikeGeo.disposeBoundsTree();
    }
    this.spikeGeo.dispose();
    this.spikeMat.dispose();
  }

  reset()
  {
    this.stopAttacking();
    this.isDestroyed = false;
    this.lastAttackType = null;
    this.clearAllTimers()

    this.experience.camera.reset();

    if (this.mixer) 
    {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }

    gsap.killTweensOf(this.handModel.scene.position);
    gsap.killTweensOf(this.handModel.scene.rotation);
    this.handModel.scene.position.set(0, 120, -600);
    this.handModel.scene.rotation.set(0, 0, 0);

    for (const attack of this.activeAttacks)
    {
      gsap.killTweensOf(attack.mesh.position);
      gsap.killTweensOf(attack.mesh.scale);

      if (attack.mesh.material) 
      {
        gsap.killTweensOf(attack.mesh.material);

        if (attack.type === 'laser')
        {
          attack.mesh.material.dispose();
        }
      }

      this.scene.remove(attack.mesh);
    }
    this.activeAttacks = [];

    for (let i = this.scene.children.length - 1; i >= 0; i--)
    {
      const child = this.scene.children[i];
      if (child.geometry === this.energyGeo)
      {
        gsap.killTweensOf(child.scale);
        this.scene.remove(child);
      }
    }

    setTimeout(() =>
    {
      this.startAttacking();
    }, 3000);
  }

  clearAllTimers()
  {
    if (this.nextAttackTimer)
    {
      this.nextAttackTimer.kill();
      this.nextAttackTimer = null;
    }

    for (const timer of this.activeTimers)
    {
      timer.kill();
    }

    this.activeTimers = [];
  }
}