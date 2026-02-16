import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, BVHHelper } from 'three-mesh-bvh';
import Experience from '../Experience';
import TubeTrail from '../Utils/TubeTrail';
import WaterTrail from '../Utils/WaterTrail';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export default class Ship
{
    constructor()
    {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.movement = this.experience.movement;
        this.resources = this.experience.resources.items;

        this.debug = false;
        this.helpers = [];

        this.trail = null;
        this.trailOffsets = [];

        this.waterTrail = null;
        this.waterTrailOffsets = [];

        this.model = this.resources.spaceship1.scene;

        this.isExploding = false;
        this.explosionAge = 0;
        this.explosionDuration = 200;

        this.setupModel();
        this.setupTrails();
        this.setupExplosion();
    }

    setupModel()
    {
        this.mesh = this.model;

        this.mesh.traverse((child) => 
        {
            if (child.name.includes('collider'))
            {
                child.geometry.scale(0.7, 0.7, 0.7);
                child.geometry.computeBoundsTree();
                child.raycast = acceleratedRaycast;

                if (this.debug)
                {
                    const helper = new BVHHelper(child, 20);
                    helper.color.set(0x00ff00);
                    this.scene.add(helper);
                    this.helpers.push(helper);

                    child.material.wireframe = true;
                    child.material.opacity = 0.5;
                    child.material.transparent = true;
                } else
                {
                    child.visible = false;
                }
            }

            if (child.name.includes('trail'))
            {
                this.trailOffsets.push(child.position.clone());

                if (child.isMesh)
                {
                    child.visible = false;
                }
            }

            if (child.name.includes('wing'))
            {
                this.waterTrailOffsets.push(child.position.clone());
                if (child.isMesh)
                {
                    child.visible = false;
                }
            }
        });

        this.mesh.position.y += 2;
        this.scene.add(this.mesh);
    }

    setupTrails()
    {
        if (this.trailOffsets.length === 0)
        {
            console.warn("No trail markers found in the ship model!");
            return;
        }

        this.trail = new TubeTrail(
            this.scene,
            this.mesh,
            this.trailOffsets[0],
            this.trailOffsets[1],
            50,
            0.19,
            0x00ffff
        );

        this.waterTrail = new WaterTrail(
            this.scene,
            this.mesh,
            this.waterTrailOffsets[0],
            this.waterTrailOffsets[1],
            100,
            0.19,
            0xffffff
        );
    }

    update()
    {
        const deltaTime = this.experience.time.delta;

        if (this.isExploding)
        {
            this.explosionAge += deltaTime;

            if (this.explosionAge < this.explosionDuration)
            {
                const progress = this.explosionAge / this.explosionDuration;

                const easeOut = 1 - Math.pow(1 - progress, 3);
                const easeOutOpacity = (1 - easeOut) * 2;

                const maxScale = 5;
                const scale = 1 + (easeOut * maxScale);
                this.explosionSphere.scale.set(scale, scale, scale);

                this.explosionSphere.material.opacity = easeOutOpacity;

                if (this.trail) { this.trail.material.opacity = easeOutOpacity; }
                if (this.waterTrail) { this.waterTrail.material.uniforms.globalOpacity.value = easeOutOpacity; }

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
                        }
                        else 
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
            else
            {

                this.reset()
                this.experience.world.reset();
            }
            return;
        }

        const velocity = this.movement.velocity;
        const forwardSpeed = this.movement.forwardSpeed || 0;

        this.mesh.rotation.z = -velocity * 0.9;

        if (this.debug && this.helpers.length > 0)
        {
            for (const helper of this.helpers) helper.update();
        }

        if (this.trail)
        {
            const zShift = forwardSpeed * deltaTime;
            const xShift = velocity * 0.1 * deltaTime;

            this.trail.update(zShift, xShift);
        }

        if (this.waterTrail)
        {
            const zShift = forwardSpeed * 0.2 * deltaTime;
            const xShift = velocity * 0.1 * deltaTime;

            this.waterTrail.update(zShift, xShift);
        }
    }

    setupExplosion()
    {
        const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0x474747,
            transparent: true,
            opacity: 0,
        });

        this.explosionSphere = new THREE.Mesh(sphereGeo, sphereMat);
        this.explosionSphere.visible = false;
        this.scene.add(this.explosionSphere);

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
        this.smokeLifespan = this.explosionDuration;
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

    explode()
    {
        if (this.isExploding) return;

        this.isExploding = true;
        this.explosionAge = 0;
        this.mesh.visible = false;

        const hitPoint = this.experience.world.map?.collisionPoint || this.mesh.position;
        this.explosionSphere.position.copy(this.mesh.position);

        const burstDirection = new THREE.Vector3().subVectors(this.mesh.position, hitPoint).normalize();
        if (burstDirection.lengthSq() === 0) burstDirection.set(0, 1, 0);

        const currentSpeed = (this.movement.forwardSpeed || 0) * -0.01;
        const shipDirection = new THREE.Vector3();
        this.mesh.getWorldDirection(shipDirection);
        const inheritedMomentum = shipDirection.multiplyScalar(currentSpeed);

        const positions = this.debrisParticles.geometry.attributes.position.array;

        // Fire out the debris
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

        this.explosionSphere.scale.set(1, 1, 1);
        this.explosionSphere.material.opacity = 1;
        this.explosionSphere.visible = true;
    }

    reset()
    {
        // 1. Reset Ship State & Movement
        this.movement.reset();
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.visible = true;
        this.isExploding = false;
        this.explosionAge = 0;

        // 2. Hide Explosion Visuals
        if (this.explosionSphere) this.explosionSphere.visible = false;

        // 3. Reset Debris Positions
        if (this.debrisParticles)
        {
            this.debrisParticles.visible = false;
            const positions = this.debrisParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i++)
            {
                positions[i] = 0;
            }
            this.debrisParticles.geometry.attributes.position.needsUpdate = true;
        }

        // 4. Reset Smoke Data
        if (this.smokeParticles)
        {
            this.smokeParticles.visible = false;

            // Reset ages and velocities
            this.smokeAges.fill(999);
            this.smokeVelocities.fill(0);
            this.smokeIndex = 0;

            // Clear smoke positions and colors
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

        this.trail.material.opacity = 1.0;
        this.waterTrail.material.uniforms.globalOpacity.value = 1.0;
    }
}