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

        this.trails = [];
        this.trailOffsets = [];

        this.waterTrails
        this.waterTrailOffsets = [];

        this.model = this.resources.spaceship1.scene;

        this.setupModel();
        this.setupTrails();
    }

    setupModel()
    {
        this.mesh = this.model;

        this.mesh.traverse((child) => 
        {
            if (child.name.includes('collider'))
            {
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

        for (const offset of this.trailOffsets)
        {
            const engineTrail = new TubeTrail(
                this.scene,
                this.mesh,
                offset,       // The specific offset for this engine
                50,           // Length (segments)
                0.19,          // Radius (thickness)
                0x00ffff      // Color
            );

            this.trails.push(engineTrail);
        }

        this.waterTrail = new WaterTrail(
            this.scene,
            this.mesh,
            this.waterTrailOffsets[0],
            this.waterTrailOffsets[1],
            100,           // Length (segments)
            0.19,          // Radius (thickness)
            0xffffff      // Color
        );
    }

    update()
    {
        const deltaTime = this.experience.time.delta;
        const velocity = this.movement.velocity;
        const forwardSpeed = this.movement.forwardSpeed || 0;

        this.mesh.rotation.z = -velocity * 0.9;

        if (this.debug && this.helpers.length > 0)
        {
            for (const helper of this.helpers) helper.update();
        }

        if (this.trails.length > 0)
        {
            const zShift = forwardSpeed * deltaTime;
            const xShift = velocity * 0.1 * deltaTime;

            for (const trail of this.trails)
            {
                trail.update(zShift, xShift);
            }
        }

        if (this.waterTrail)
        {
            const zShift = forwardSpeed * 0.2 * deltaTime;
            const xShift = velocity * 0.1 * deltaTime;

            this.waterTrail.update(zShift, xShift);
        }
    }

    reset()
    {
        this.movement.reset();
        this.mesh.rotation.set(0, 0, 0);
    }
}