import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, BVHHelper } from 'three-mesh-bvh';
import Experience from '../Experience';
import TubeTrail from '../Utils/TubeTrail';
import WaterTrail from '../Utils/WaterTrail';
import Explosion from '../Utils/Explosion';

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

        this.explosion = new Explosion(this.scene);
        this.isExploding = false;
        this.isExploding = false;

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
            this.explosion.update(deltaTime);

            if (!this.explosion.isActive)
            {
                this.reset();
                this.experience.world.reset();
            } else
            {
                if (this.trail) this.trail.material.opacity = this.explosion.opacity;
                if (this.waterTrail) this.waterTrail.material.uniforms.globalOpacity.value = this.explosion.opacity;
            }
            return;
        }

        const velocity = this.movement.velocity;
        const forwardSpeed = this.movement.forwardSpeed || 0;

        this.mesh.rotation.z = -velocity * 0.9;

        if (this.debug && this.helpers.length > 0) { for (const helper of this.helpers) helper.update(); }

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
        this.mesh.visible = false;

        const hitPoint = this.experience.world.map?.collisionPoint || this.mesh.position;

        const currentSpeed = (this.movement.forwardSpeed || 0) * -0.01;
        const shipDirection = new THREE.Vector3();
        this.mesh.getWorldDirection(shipDirection);
        const inheritedMomentum = shipDirection.multiplyScalar(currentSpeed);

        this.explosion.trigger(this.mesh.position, hitPoint, inheritedMomentum);
    }

    reset()
    {
        this.movement.reset();
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.visible = true;

        this.isExploding = false;
        this.explosion.reset();

        if (this.trail) this.trail.material.opacity = 1.0;
        if (this.waterTrail) this.waterTrail.material.uniforms.globalOpacity.value = 1.0;
    }
}