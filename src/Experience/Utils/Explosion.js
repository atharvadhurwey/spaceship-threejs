import * as THREE from 'three';

export default class Explosion 
{
  constructor(scene) 
  {
    this.scene = scene;
    this.duration = 200;
    this.age = 0;
    this.isActive = false;
    this.opacity = 1;

    this.setupVisuals();
  }

  setupVisuals() 
  {
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x474747,
      transparent: true,
      opacity: 0,
    });

    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.sphere.visible = false;
    this.scene.add(this.sphere);

    this.debrisCount = 40;
    this.debrisPhysics = [];

    const debrisGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.debrisCount * 3);

    for (let i = 0; i < this.debrisCount; i++)
    {
      this.debrisPhysics.push({ velocity: new THREE.Vector3() });
      positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0;
    }

    debrisGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const debrisMat = new THREE.PointsMaterial({
      size: 0.8,
      color: 0xf9b64e,
      transparent: true,
      depthWrite: false,
    });

    this.debrisParticles = new THREE.Points(debrisGeo, debrisMat);
    this.debrisParticles.visible = false;
    this.scene.add(this.debrisParticles);

    this.smokeCount = 1000;
    this.smokeLifespan = this.duration;
    this.smokeDropTimer = 0;
    this.smokeIndex = 0;

    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(this.smokeCount * 3);
    const smokeCol = new Float32Array(this.smokeCount * 3);
    this.smokeVelocities = new Float32Array(this.smokeCount * 3);
    this.smokeAges = new Float32Array(this.smokeCount).fill(999);

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    smokeGeo.setAttribute('color', new THREE.BufferAttribute(smokeCol, 3));

    const smokeMat = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });

    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.smokeParticles.visible = false;
    this.scene.add(this.smokeParticles);
  }

  trigger(position, hitPoint, inheritedMomentum) 
  {
    if (this.isActive) return;

    this.isActive = true;
    this.age = 0;

    this.sphere.position.copy(position);

    const burstDirection = new THREE.Vector3().subVectors(position, hitPoint).normalize();

    // Prevent explosion from going into the ground
    if (burstDirection.y < 0)
    {
      burstDirection.y = 0.1;
      burstDirection.normalize();
    }

    if (burstDirection.lengthSq() === 0) burstDirection.set(0, 1, 0);

    const positions = this.debrisParticles.geometry.attributes.position.array;

    for (let i = 0; i < this.debrisCount; i++)
    {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const randomSpread = new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0
      ).normalize();

      const finalDirection = new THREE.Vector3().copy(burstDirection).add(randomSpread).normalize();
      const burstSpeed = 0.01 + Math.random() * 0.5;

      this.debrisPhysics[i].velocity.copy(finalDirection).multiplyScalar(burstSpeed).add(inheritedMomentum);
    }

    this.smokeAges.fill(999);
    this.smokeVelocities.fill(0);
    const smokeCol = this.smokeParticles.geometry.attributes.color.array;
    for (let i = 0; i < smokeCol.length; i++) smokeCol[i] = 0;

    this.debrisParticles.geometry.attributes.position.needsUpdate = true;
    this.debrisParticles.material.opacity = 1.0;
    this.debrisParticles.visible = true;

    this.smokeParticles.geometry.attributes.color.needsUpdate = true;
    this.smokeParticles.visible = true;

    this.sphere.scale.set(1, 1, 1);
    this.sphere.material.opacity = 1;
    this.sphere.visible = true;
  }

  update(deltaTime) 
  {
    if (!this.isActive) return;

    this.age += deltaTime;

    if (this.age >= this.duration)
    {
      this.isActive = false;
      return;
    }

    const progress = this.age / this.duration;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    this.opacity = (1 - easeOut) * 2;

    const maxScale = 5;
    const scale = 1 + (easeOut * maxScale);
    this.sphere.scale.set(scale, scale, scale);
    this.sphere.material.opacity = this.opacity;

    const gravity = 0.001;

    const positions = this.debrisParticles.geometry.attributes.position.array;
    const smokePos = this.smokeParticles.geometry.attributes.position.array;
    const smokeCol = this.smokeParticles.geometry.attributes.color.array;

    this.smokeDropTimer += deltaTime;
    const shouldDropSmoke = this.smokeDropTimer > 0.5;

    for (let i = 0; i < this.debrisCount; i++)
    {
      const physics = this.debrisPhysics[i];

      physics.velocity.y -= gravity * deltaTime;

      positions[i * 3] += physics.velocity.x * deltaTime;
      positions[i * 3 + 1] += physics.velocity.y * deltaTime;
      positions[i * 3 + 2] += physics.velocity.z * deltaTime;

      if (shouldDropSmoke)
      {
        const sIdx = this.smokeIndex;
        smokePos[sIdx * 3] = positions[i * 3] + (Math.random() - 0.5) * 0.2;
        smokePos[sIdx * 3 + 1] = positions[i * 3 + 1] + (Math.random() - 0.5) * 0.2;
        smokePos[sIdx * 3 + 2] = positions[i * 3 + 2] + (Math.random() - 0.5) * 0.2;

        this.smokeVelocities[sIdx * 3] = physics.velocity.x * 0.3;
        this.smokeVelocities[sIdx * 3 + 1] = physics.velocity.y * 0.3;
        this.smokeVelocities[sIdx * 3 + 2] = physics.velocity.z * 0.3;

        this.smokeAges[sIdx] = 0;
        this.smokeIndex = (this.smokeIndex + 1) % this.smokeCount;
      }
    }

    if (shouldDropSmoke) this.smokeDropTimer = 0;

    for (let i = 0; i < this.smokeCount; i++)
    {
      if (this.smokeAges[i] < this.smokeLifespan)
      {
        this.smokeAges[i] += deltaTime;
        const t = this.smokeAges[i] / this.smokeLifespan;

        if (t >= 1.0)
        {
          smokeCol[i * 3] = 0; smokeCol[i * 3 + 1] = 0; smokeCol[i * 3 + 2] = 0;
        } else
        {
          smokePos[i * 3] += this.smokeVelocities[i * 3] * deltaTime;
          smokePos[i * 3 + 1] += this.smokeVelocities[i * 3 + 1] * deltaTime;
          smokePos[i * 3 + 2] += this.smokeVelocities[i * 3 + 2] * deltaTime;

          this.smokeVelocities[i * 3] *= 0.95;
          this.smokeVelocities[i * 3 + 1] *= 0.95;
          this.smokeVelocities[i * 3 + 2] *= 0.95;

          const fadeOut = t > 0.8 ? (1.0 - t) / 0.2 : 1.0;

          const r = Math.max(0.15, 0.8 - (t * 4.0));
          const g = Math.max(0.15, 0.5 - (t * 3.0));
          const b = Math.max(0.15, 0.3 - (t * 2.0));

          smokeCol[i * 3] = r * fadeOut;
          smokeCol[i * 3 + 1] = g * fadeOut;
          smokeCol[i * 3 + 2] = b * fadeOut;
        }
      }
    }

    this.debrisParticles.material.opacity = 1.0 - (progress * 2.0);
    this.debrisParticles.geometry.attributes.position.needsUpdate = true;
    this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    this.smokeParticles.geometry.attributes.color.needsUpdate = true;
  }

  reset() 
  {
    this.isActive = false;
    this.age = 0;
    this.opacity = 1;

    if (this.sphere) this.sphere.visible = false;

    if (this.debrisParticles)
    {
      this.debrisParticles.visible = false;
      const positions = this.debrisParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i++) positions[i] = 0;
      this.debrisParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.smokeParticles)
    {
      this.smokeParticles.visible = false;
      this.smokeAges.fill(999);
      this.smokeVelocities.fill(0);
      this.smokeIndex = 0;

      const smokePos = this.smokeParticles.geometry.attributes.position.array;
      const smokeCol = this.smokeParticles.geometry.attributes.color.array;

      for (let i = 0; i < smokePos.length; i++)
      {
        smokePos[i] = 0;
        smokeCol[i] = 0;
      }

      this.smokeParticles.geometry.attributes.position.needsUpdate = true;
      this.smokeParticles.geometry.attributes.color.needsUpdate = true;
    }
  }
}