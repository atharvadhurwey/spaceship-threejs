import * as THREE from 'three'

import tunnelVertShader from './Tunnel/vert.glsl'
import tunnelFragShader from './Tunnel/frag.glsl'

const PI2 = Math.PI * 2;
const HALF_PI = Math.PI / 2;

export default class DataStreamTheme
{
  constructor(experience, parentDebugFolder)
  {
    this.name = 'dataStreamTheme';
    this.experience = experience;
    this.scene = experience.scene;
    this.resources = experience.resources;
    this.debug = experience.debug;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.parentDebugFolder = parentDebugFolder;
    this.debugFolders = [];

    this.isPaused = false;
    this.shaderTime = 0;

    this.setTunnel();

    this.activeObstacles = [];
    this.obstaclePool = [];
    this.maxObstacles = 20;
    this.currentMaxObstacles = 10;
    this.elapsedTime = 0;

    this.obstacleSpawnTimer = 100;
    this.lastSpawnAngle = null;

    this.obstacleGeo = new THREE.BoxGeometry(100, 50, 400);
    this.obstacleMat = new THREE.MeshBasicMaterial({ color: 0x0006ff, wireframe: true });

    this.obstacleGroup = new THREE.Group();
    this.obstacleGroup.position.set(0, 350, 0);
    this.group.add(this.obstacleGroup);

    for (let i = 0; i < this.maxObstacles; i++)
    {
      const mesh = new THREE.Mesh(this.obstacleGeo, this.obstacleMat);
      mesh.visible = false;
      mesh.matrixAutoUpdate = false;
      this.obstacleGroup.add(mesh);
      this.obstaclePool.push({ mesh, active: false, type: 'data_block' });
    }

    this._shipBox = new THREE.Box3();
    this._shipCenter = new THREE.Vector3();
    this._shipSize = new THREE.Vector3();
    this._inverseMatrix = new THREE.Matrix4();
    this._localShipCenter = new THREE.Vector3();
    this._localBox = new THREE.Box3();
    this._worldPosition = new THREE.Vector3();

    this._baseMin = new THREE.Vector3(-50, -20, -250);
    this._baseMax = new THREE.Vector3(50, 20, 250);
  }

  setTunnel()
  {
    this.tunnelParams = {
      radius: 400,
      length: 5000,
      lightIntensity: 1.2,
      speed: 0.05,
      depthFade: 0.001,
      showRings: true,
      ringCount: 10.0,
      reflectionStrength: 0.35,
      uvScaleX: 1.0,
      uvScaleY: 0.01,
      ghostIntensity: 1.0,
      matrixIntensity: 5,
      centerColor: '#0006ff',
      edgeColor: '#000000',
      matrixBaseColor: '#ff0000',
      matrixHeadColor: '#ff9000'
    };

    const matrixCanvas = document.createElement('canvas');
    matrixCanvas.width = 512;
    matrixCanvas.height = 512;
    const ctx = matrixCanvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#fff';

    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 24; y < 512; y += 48)
    {
      for (let x = 24; x < 512; x += 48)
      {
        const char = String.fromCharCode(0xFF66 + Math.floor(Math.random() * 55));
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.fillText(char, x, y);
      }
    }

    const matrixTexture = new THREE.CanvasTexture(matrixCanvas);
    matrixTexture.wrapS = THREE.RepeatWrapping;
    matrixTexture.wrapT = THREE.RepeatWrapping;
    matrixTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const tunnelGeometry = new THREE.CylinderGeometry(
      this.tunnelParams.radius,
      this.tunnelParams.radius,
      this.tunnelParams.length,
      64, 1, true
    );
    tunnelGeometry.rotateX(HALF_PI);

    this.tunnelMaterial = new THREE.ShaderMaterial({
      vertexShader: tunnelVertShader,
      fragmentShader: tunnelFragShader,
      uniforms: {
        uTime: { value: 0 },
        uFinalSpeed: { value: 0 },
        uUvScale: { value: new THREE.Vector2(this.tunnelParams.uvScaleX, this.tunnelParams.uvScaleY) },
        uCenterColor: { value: new THREE.Color(this.tunnelParams.centerColor) },
        uEdgeColor: { value: new THREE.Color(this.tunnelParams.edgeColor) },
        uIntensity: { value: this.tunnelParams.lightIntensity },
        uDepthFade: { value: this.tunnelParams.depthFade },
        uReflectionStrength: { value: this.tunnelParams.reflectionStrength },
        uGhostIntensity: { value: this.tunnelParams.ghostIntensity },
        uMatrixTex: { value: matrixTexture },
        uMatrixIntensity: { value: this.tunnelParams.matrixIntensity },
        uMatrixBaseColor: { value: new THREE.Color(this.tunnelParams.matrixBaseColor) },
        uMatrixHeadColor: { value: new THREE.Color(this.tunnelParams.matrixHeadColor) }
      },
      side: THREE.BackSide,
      transparent: false,
      // depthWrite: false
    });

    this.uniforms = this.tunnelMaterial.uniforms;

    this.tunnel = new THREE.Mesh(tunnelGeometry, this.tunnelMaterial);
    this.tunnel.position.set(0, 350, -2500);
    this.group.add(this.tunnel);

    const capGeometry = new THREE.CircleGeometry(this.tunnelParams.radius, 64);
    capGeometry.rotateY(Math.PI);

    this.tunnelCap = new THREE.Mesh(capGeometry, this.tunnelMaterial);
    this.tunnelCap.position.set(0, 350, -this.tunnelParams.length / 1.1);
    this.group.add(this.tunnelCap);

    if (this.debug.active)
    {
      const tunnelFolder = this.parentDebugFolder.addFolder({ title: 'Tunnel Shader', expanded: true });
      this.debugFolders.push(tunnelFolder);

      const updateGeometry = () =>
      {
        this.tunnel.geometry.dispose();
        const newGeo = new THREE.CylinderGeometry(
          this.tunnelParams.radius,
          this.tunnelParams.radius,
          this.tunnelParams.length,
          64, 1, true
        );
        newGeo.rotateX(HALF_PI);
        this.tunnel.geometry = newGeo;

        this.tunnelCap.geometry.dispose();
        const newCapGeo = new THREE.CircleGeometry(this.tunnelParams.radius, 64);
        newCapGeo.rotateY(Math.PI);
        this.tunnelCap.geometry = newCapGeo;
      };

      tunnelFolder.addBinding(this.tunnelParams, 'radius', { min: 20, max: 500, step: 1, label: 'Radius' }).on('change', updateGeometry);
      tunnelFolder.addBinding(this.tunnelParams, 'centerColor', { view: 'color', label: 'CenterColor' }).on('change', (ev) => this.uniforms.uCenterColor.value.set(ev.value));
      tunnelFolder.addBinding(this.tunnelParams, 'edgeColor', { view: 'color', label: 'EdgeColor' }).on('change', (ev) => this.uniforms.uEdgeColor.value.set(ev.value));
      tunnelFolder.addBinding(this.tunnelParams, 'lightIntensity', { min: 0.0, max: 3.0, step: 0.1, label: 'LightIntensity' }).on('change', (ev) => this.uniforms.uIntensity.value = ev.value);
      tunnelFolder.addBinding(this.tunnelParams, 'speed', { min: 0.0, max: 0.5, step: 0.001, label: 'ScrollSpeed' });
      tunnelFolder.addBinding(this.tunnelParams, 'uvScaleY', { min: 0.0, max: 0.2, label: 'StretchLength' }).on('change', (ev) => this.uniforms.uUvScale.value.y = ev.value);
      tunnelFolder.addBinding(this.tunnelParams, 'depthFade', { min: 0.0, max: 0.01, label: 'DepthShadows' }).on('change', (ev) => this.uniforms.uDepthFade.value = ev.value);
      tunnelFolder.addBinding(this.tunnelParams, 'matrixIntensity', { min: 0.0, max: 10.0, label: 'MatrixData' }).on('change', (ev) => this.uniforms.uMatrixIntensity.value = ev.value);
      tunnelFolder.addBinding(this.tunnelParams, 'matrixBaseColor', { view: 'color', label: 'MatrixBaseColor' }).on('change', (ev) => this.uniforms.uMatrixBaseColor.value.set(ev.value));
      tunnelFolder.addBinding(this.tunnelParams, 'matrixHeadColor', { view: 'color', label: 'MatrixHeadColor' }).on('change', (ev) => this.uniforms.uMatrixHeadColor.value.set(ev.value));
    }
  }

  spawnObstacle()
  {
    let obs = null;
    for (let i = 0; i < this.maxObstacles; i++)
    {
      if (!this.obstaclePool[i].active)
      {
        obs = this.obstaclePool[i];
        break;
      }
    }
    if (!obs) return;

    const spawnZ = -(this.tunnelParams.length * 0.5) + 500;
    const activeCount = this.activeObstacles.length;
    let angle = 0;
    let radiusOffset = 0;
    let isValid = false;
    let attempts = 0;

    while (!isValid && attempts < 20)
    {
      if (Math.random() < 0.05)
      {
        const localShipAngle = -HALF_PI - this.obstacleGroup.rotation.z;
        angle = localShipAngle + (Math.random() - 0.5) * 0.2;
      } else
      {
        angle = Math.random() * PI2;
      }

      radiusOffset = this.tunnelParams.radius - (40 * Math.random());

      const proposedX = Math.cos(angle) * radiusOffset;
      const proposedY = Math.sin(angle) * radiusOffset;

      isValid = true;

      for (let i = 0; i < activeCount; i++)
      {
        const activeObs = this.activeObstacles[i];
        if (Math.abs(activeObs.mesh.position.z - spawnZ) < 450)
        {
          const dx = activeObs.mesh.position.x - proposedX;
          const dy = activeObs.mesh.position.y - proposedY;
          if ((dx * dx + dy * dy) < 22500)
          {
            isValid = false;
            break;
          }
        }
      }
      attempts++;
    }

    this.lastSpawnAngle = angle;

    obs.mesh.position.set(
      Math.cos(angle) * radiusOffset,
      Math.sin(angle) * radiusOffset,
      spawnZ
    );

    obs.mesh.rotation.z = angle;
    obs.mesh.visible = true;
    obs.active = true;
    obs.mesh.updateMatrix();

    this.activeObstacles.push(obs);
  }

  update()
  {
    if (this.isPaused) return;

    const { delta } = this.experience.time;
    const { velocity, forwardSpeed } = this.experience.world.movement;
    const activeLen = this.activeObstacles.length;

    this.shaderTime += delta * forwardSpeed * 0.0005;
    this.elapsedTime += delta;
    this.currentMaxObstacles = Math.min(25, 10 + (15 * (this.elapsedTime * 0.0005)));

    if (this.uniforms)
    {
      this.uniforms.uTime.value = this.shaderTime;
      this.uniforms.uFinalSpeed.value = this.shaderTime * this.tunnelParams.speed;

      this.tunnel.rotation.z -= velocity * 0.02 * delta;
      this.obstacleGroup.rotation.z = this.tunnel.rotation.z;
    }

    if (!this.isDestroyed)
    {
      this.obstacleSpawnTimer -= delta;
      if (this.obstacleSpawnTimer <= 0)
      {
        if (activeLen < (this.currentMaxObstacles | 0))
        {
          this.spawnObstacle();
        }
        this.obstacleSpawnTimer = 3.5 + (Math.random() * 2.5);
      }
    }

    const moveSpeed = delta * forwardSpeed * 10;

    for (let i = activeLen - 1; i >= 0; i--)
    {
      const obs = this.activeObstacles[i];
      obs.mesh.position.z += moveSpeed;
      obs.mesh.updateMatrix();

      if (obs.mesh.position.z > 200)
      {
        obs.mesh.visible = false;
        obs.active = false;

        const lastIdx = this.activeObstacles.length - 1;
        if (i !== lastIdx)
        {
          this.activeObstacles[i] = this.activeObstacles[lastIdx];
        }
        this.activeObstacles.pop();
      }
    }
  }

  checkCollisions(shipCollider)
  {
    if (!shipCollider || this.isDestroyed) return null;

    shipCollider.updateMatrixWorld();
    this._shipBox.setFromObject(shipCollider);
    this._shipBox.getCenter(this._shipCenter);
    this._shipBox.getSize(this._shipSize);

    const shipHitRadius = Math.max(this._shipSize.x, this._shipSize.y, this._shipSize.z) * 0.4;
    const len = this.activeObstacles.length;

    for (let i = 0; i < len; i++)
    {
      const obs = this.activeObstacles[i];
      obs.mesh.updateMatrixWorld();

      this._inverseMatrix.copy(obs.mesh.matrixWorld).invert();
      this._localShipCenter.copy(this._shipCenter).applyMatrix4(this._inverseMatrix);

      this._localBox.set(this._baseMin, this._baseMax);
      this._localBox.expandByScalar(shipHitRadius);

      if (this._localBox.containsPoint(this._localShipCenter))
      {
        obs.mesh.getWorldPosition(this._worldPosition);
        return this._worldPosition.clone();
      }
    }

    return null;
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }

  reset()
  {
    this.isDestroyed = false;
    this.isPaused = false;
    this.obstacleSpawnTimer = 100;
    this.shaderTime = 0;
    this.lastSpawnAngle = null;
    this.elapsedTime = 0;
    this.currentMaxObstacles = 10;

    if (this.uniforms)
    {
      this.uniforms.uTime.value = 0;
      this.uniforms.uFinalSpeed.value = 0;
    }

    if (this.tunnel) this.tunnel.rotation.z = 0;
    if (this.tunnelCap) this.tunnelCap.rotation.z = 0;

    for (let i = 0; i < this.maxObstacles; i++)
    {
      const obs = this.obstaclePool[i];
      obs.active = false;
      obs.mesh.visible = false;
    }
    this.activeObstacles.length = 0;
  }

  hide() {
    this.tunnel.visible = false
    this.tunnelCap.visible = false
    this.destroy();
  }

  destroy()
  {
    this.isDestroyed = true;

    for (let i = 0; i < this.maxObstacles; i++)
    {
      this.obstacleGroup.remove(this.obstaclePool[i].mesh);
    }
    this.activeObstacles.length = 0;
    this.obstaclePool.length = 0;

    if (this.obstacleGeo) this.obstacleGeo.dispose();
    if (this.obstacleMat) this.obstacleMat.dispose();

    this.dispose();
  }

  dispose()
  {
    if (this.group) this.scene.remove(this.group);
    if (this.tunnel) this.tunnel.geometry.dispose();
    if (this.tunnelCap) this.tunnelCap.geometry.dispose();

    if (this.tunnelMaterial)
    {
      if (this.uniforms.uMatrixTex?.value)
      {
        this.uniforms.uMatrixTex.value.dispose();
      }
      this.tunnelMaterial.dispose();
    }

    if (this.debugFolders && this.debugFolders.length > 0)
    {
      for (let i = 0; i < this.debugFolders.length; i++)
      {
        this.debugFolders[i].dispose();
      }
      this.debugFolders.length = 0;
    }
  }
}