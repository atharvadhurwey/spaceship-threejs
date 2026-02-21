import * as THREE from 'three';

export default class ParticlesTrail 
{
  constructor(scene, target, leftOffset = new THREE.Vector3(-2, 0, 1), rightOffset = new THREE.Vector3(2, 0, 1), lifeTime = 100, maxRadius = 0.2, color = 0x00ffff) 
  {
    this.scene = scene;
    this.target = target;
    this.leftOffset = leftOffset;
    this.rightOffset = rightOffset;

    this.spawnRate = 8;
    this.lifeTime = lifeTime;
    this.maxRadius = maxRadius;
    this.particleCount = this.lifeTime * this.spawnRate;
    this.currentIndex = 0;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.lives = new Float32Array(this.particleCount);
    this.velocities = [];

    for (let i = 0; i < this.particleCount; i++) 
    {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = 0;
      this.lives[i] = 0.0;

      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04
      ));
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('life', new THREE.BufferAttribute(this.lives, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        maxSize: { value: this.maxRadius * 60.0 },
        globalOpacity: { value: 1.0 }
      },
      vertexShader: `
        attribute float life;
        varying float vLife;
        uniform float maxSize;
        void main() {
            vLife = life;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (maxSize * life) * (10.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
      fragmentShader: `
        uniform vec3 color;
        uniform float globalOpacity;
        varying float vLife;
        void main() {
            if (vLife <= 0.0) discard; 
            
            vec2 xy = gl_PointCoord.xy - vec2(0.5);
            float distance = length(xy);
            if(distance > 0.5) discard;
            
            float alpha = (0.5 - distance) * 2.0 * vLife;
            
            gl_FragColor = vec4(color, alpha * globalOpacity); 
        }
    `,
      transparent: true,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  getEmissionPosition(localOffset) 
  {
    const worldPos = localOffset.clone();
    worldPos.applyMatrix4(this.target.matrixWorld);
    return worldPos;
  }

  update(zShift = 0, xShift = 0) 
  {
    const pArray = this.geometry.attributes.position.array;
    const lArray = this.geometry.attributes.life.array;

    for (let i = 0; i < this.particleCount; i++) 
    {
      if (lArray[i] > 0) 
      {
        pArray[i * 3 + 2] += zShift;
        pArray[i * 3] -= xShift;

        pArray[i * 3] += this.velocities[i].x;
        pArray[i * 3 + 1] += this.velocities[i].y;
        pArray[i * 3 + 2] += this.velocities[i].z;

        lArray[i] -= 1.0 / this.lifeTime;
      }
    }

    const rollAngle = this.target.rotation.z;
    const hitThreshold = 0.8;

    let activeOffset = null;

    if (rollAngle > hitThreshold) 
    {
      activeOffset = this.leftOffset;
    }
    else if (rollAngle < -hitThreshold) 
    {
      activeOffset = this.rightOffset;
    }

    if (activeOffset !== null)
    {
      const currentPos = this.getEmissionPosition(activeOffset);

      for (let i = 0; i < this.spawnRate; i++) 
      {
        this.currentIndex = (this.currentIndex + 1) % this.particleCount;
        const idx = this.currentIndex;

        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * this.maxRadius * 0.5;

        pArray[idx * 3] = currentPos.x + Math.cos(angle) * r;
        pArray[idx * 3 + 1] = currentPos.y + (Math.random() - 0.5) * r;
        pArray[idx * 3 + 2] = currentPos.z + Math.sin(angle) * r;

        lArray[idx] = 1.0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.life.needsUpdate = true;
  }
}