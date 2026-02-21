import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, BVHHelper } from 'three-mesh-bvh';
import Experience from '../Experience';
import TubeTrail from '../Utils/TubeTrail';
import particlesTrail from '../Utils/ParticlesTrail';
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
        this.debug = this.experience.debug;

        if (this.debug.active)
        {
            this.helpers = [];
            this.debugFolder = this.debug.ui.addFolder({ title: 'Ship', expanded: true });
        }

        this.collisionsEnabled = true;
        if (this.debug?.active && this.debugFolder)
        {
            this.debugFolder.addBinding(this, 'collisionsEnabled', { label: 'Collisions' });
        }

        this.trail = null;
        this.trailOffsets = [];

        this.particlesTrail = null;
        this.particlesTrailOffsets = [];

        this.model = this.resources.spaceship1.scene;

        this.explosion = new Explosion(this.scene);
        this.isExploding = false;

        this.setupModel();
        this.setupTrails();
    }

    toggleCollisions()
    {
        this.collisionsEnabled = !this.collisionsEnabled;
        if (this.debug.active) { this.debugFolder.refresh() };
    }

    setupModel()
    {
        this.mesh = this.model;

        this.mesh.traverse((child) => 
        {
            if (child.name.includes('collider'))
            {
                child.geometry.scale(0.7, 0.4, 0.7);
                child.geometry.computeBoundsTree();
                child.raycast = acceleratedRaycast;

                if (this.debug.active)
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
                this.particlesTrailOffsets.push(child.position.clone());
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

        this.particlesTrail = new particlesTrail(
            this.scene,
            this.mesh,
            this.particlesTrailOffsets[0],
            this.particlesTrailOffsets[1],
            100,
            0.19,
            0xB2BEB5
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
                if (this.particlesTrail) this.particlesTrail.material.uniforms.globalOpacity.value = this.explosion.opacity;
            }
            return;
        }

        const velocity = this.movement.velocity;
        const forwardSpeed = this.movement.forwardSpeed || 0;

        this.mesh.rotation.z = -velocity * 0.9;

        if (this.debug.active && this.helpers.length > 0) { for (const helper of this.helpers) helper.update(); }

        if (this.trail)
        {
            const zShift = forwardSpeed * deltaTime;
            const xShift = velocity * 0.1 * deltaTime;

            this.trail.update(zShift, xShift);
        }

        if (this.particlesTrail)
        {
            const zShift = forwardSpeed * 0.2 * deltaTime;
            const xShift = velocity * 0.1 * deltaTime;

            this.particlesTrail.update(zShift, xShift);
        }
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
        if (this.particlesTrail) this.particlesTrail.material.uniforms.globalOpacity.value = 1.0;
    }
}