import * as THREE from 'three';
import gsap from 'gsap';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import Experience from '../Experience';

import TerrainGenerator from '../Utils/TerrainGenerator';
import { WaterFloor, SandFloor } from '../Utils/Floor';

import portalFragShader from '../Shaders/Portal/frag.glsl';
import portalVertShader from '../Shaders/Portal/vert.glsl';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export default class Map
{
    constructor()
    {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.debug = this.experience.debug;
        this.camera = this.experience.camera.instance;

        if (this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder({ title: 'Map', expanded: false });
        }

        this.areaTemplates = [];
        this.difficultyLevel = 0;
        this.rowsPassed = 0;
        this.rowsPerDifficulty = 2;

        this.chunkLength = 0;
        this.chunkWidth = 0;
        this.chunks = [];

        this._shipToMapMatrix = new THREE.Matrix4();
        this._inverseShipToMapMatrix = new THREE.Matrix4();
        this._localShipBox = new THREE.Box3();
        this._shipColliderCache = null;

        this.activeFloor = null;
        this.terrainDebugFolder = null;
        this.collisionPoint = null;
    }

    updateTheme(theme)
    {
        this.clearCurrentEnvironment();

        if (theme.modelKey === 'pillarScapeModel')
        {
            const terrainData = TerrainGenerator.build(
                this.resources.items.pillarScapeModel.scene,
                ['area1', 'area2', 'area3'],
                { top: '#FEFEFE', bottom: '#DDDFCB' },
                this.debugFolder
            );
            this._applyTerrainData(terrainData);
            this.activeFloor = new WaterFloor(this.scene, this.debug, this.resources, this.chunkWidth, this.chunkLength);
        }
        else if (theme.modelKey === 'redApexModel')
        {
            const terrainData = TerrainGenerator.build(
                this.resources.items.redApexModel.scene,
                ['area1001'],
                { top: '#790000', bottom: '#494949' },
                this.debugFolder
            );
            this._applyTerrainData(terrainData);
            this.activeFloor = new SandFloor(this.scene, this.debug, this.chunkWidth);
        }

        this.reset();
    }

    _applyTerrainData(data)
    {
        this.areaTemplates = data.areaTemplates;
        this.chunkLength = data.chunkLength;
        this.chunkWidth = data.chunkWidth;
        this.terrainDebugFolder = data.debugFolder;
    }

    clearCurrentEnvironment()
    {
        // Clear Chunks
        for (const chunk of this.chunks)
        {
            this.scene.remove(chunk);
            chunk.traverse(child =>
            {
                if (child.geometry) child.geometry.dispose();
                if (child.material) Array.isArray(child.material) ? child.material.forEach(m => m.dispose()) : child.material.dispose();
            });
        }
        this.chunks = [];

        // Clear Templates
        for (const template of this.areaTemplates)
        {
            if (template.geometry) template.geometry.dispose();
            if (template.material) template.material.dispose();
        }
        this.areaTemplates = [];
        this.chunkLength = 0;
        this.chunkWidth = 0;

        // Clear Floor
        if (this.activeFloor)
        {
            this.activeFloor.destroy();
            this.activeFloor = null;
        }

        // Clear Terrain Debug
        if (this.terrainDebugFolder)
        {
            this.terrainDebugFolder.dispose();
            this.terrainDebugFolder = null;
        }
    }

    reset()
    {
        for (const chunk of this.chunks) this.scene.remove(chunk);
        this.chunks = [];
        this._shipColliderCache = null;
        this.createInfiniteMap();
    }

    createInfiniteMap()
    {
        this.gridColumns = 3;
        this.gridRows = 2;
        this.mapTotalWidth = this.gridColumns * this.chunkWidth;
        this.mapTotalDepth = this.gridRows * this.chunkLength;
        this.initialSpawnOffset = 500;
        const halfCol = Math.floor(this.gridColumns / 2);

        this.difficultyLevel = 0;
        this.rowsPassed = 0;

        for (let x = -halfCol; x <= halfCol; x++)
        {
            for (let z = 0; z < this.gridRows; z++)
            {
                const chunkGroup = new THREE.Group();
                chunkGroup.position.set(x * this.chunkWidth, 0, -(z * this.chunkLength) - this.initialSpawnOffset);

                const areaMesh = this.areaTemplates[this.difficultyLevel].clone();
                chunkGroup.add(areaMesh);

                chunkGroup.userData.colliders = [];
                chunkGroup.traverse(child =>
                {
                    if (child.userData.isCollider) chunkGroup.userData.colliders.push(child);
                });

                this.scene.add(chunkGroup);
                this.chunks.push(chunkGroup);
            }
        }
    }

    update(shipVelocity, forwardSpeed)
    {
        const deltaTime = this.experience.time.delta;

        if (this.portal) this.portal.material.uniforms.uTime.value += deltaTime * 0.02;

        if (this.activeFloor)
        {
            this.activeFloor.update(deltaTime, forwardSpeed, shipVelocity); // Delegated update logic!
        }

        const boundaryX = (this.mapTotalWidth / 2);
        const maxXOffset = this.chunkWidth * 0.9;
        let sharedRowOffset = null;

        for (const chunk of this.chunks)
        {
            chunk.position.z += forwardSpeed * deltaTime;
            chunk.position.x -= shipVelocity * deltaTime;

            if (chunk.position.z > this.chunkLength)
            {
                chunk.position.z -= this.mapTotalDepth;

                if (sharedRowOffset === null)
                {
                    sharedRowOffset = (Math.random() - 0.5) * maxXOffset;
                    this.rowsPassed++;
                    this.difficultyLevel = Math.min(this.areaTemplates.length - 1, Math.floor(this.rowsPassed / this.rowsPerDifficulty));
                }

                chunk.position.x += sharedRowOffset;
                const templateMesh = this.areaTemplates[this.difficultyLevel] || this.areaTemplates[0];
                chunk.children[0].geometry = templateMesh.geometry;
            }

            if (chunk.position.x < -boundaryX) chunk.position.x += this.mapTotalWidth;
            else if (chunk.position.x > boundaryX) chunk.position.x -= this.mapTotalWidth;
        }
    }

    checkCollisions(shipGroup)
    {
        if (!shipGroup) return false;

        if (!this._shipColliderCache)
        {
            this._shipColliderCache = shipGroup.children.find(child => /collider/i.test(child.name));
        }

        const shipCollider = this._shipColliderCache;
        if (!shipCollider || !shipCollider.geometry) return false;

        shipCollider.updateMatrixWorld();
        if (!shipCollider.geometry.boundingBox) shipCollider.geometry.computeBoundingBox();

        for (const chunk of this.chunks)
        {
            if (Math.abs(chunk.position.z) > this.chunkLength) continue;
            if (Math.abs(chunk.position.x) > this.chunkWidth) continue;

            const mapColliders = chunk.userData.colliders;

            for (const mapCollider of mapColliders)
            {
                mapCollider.updateMatrixWorld();

                this._shipToMapMatrix.copy(mapCollider.matrixWorld).invert().multiply(shipCollider.matrixWorld);
                this._inverseShipToMapMatrix.copy(this._shipToMapMatrix).invert();

                let collisionPoint = null;

                mapCollider.geometry.boundsTree.shapecast({
                    intersectsBounds: (box) =>
                    {
                        this._localShipBox.copy(shipCollider.geometry.boundingBox).applyMatrix4(this._shipToMapMatrix);
                        return box.intersectsBox(this._localShipBox);
                    },

                    intersectsTriangle: (tri) =>
                    {
                        const hit = shipCollider.geometry.boundsTree.intersectsGeometry(
                            mapCollider.geometry,
                            this._inverseShipToMapMatrix,
                            tri
                        );

                        if (hit)
                        {
                            collisionPoint = tri.a.clone().applyMatrix4(mapCollider.matrixWorld);
                            return true;
                        }
                    }
                });

                if (collisionPoint)
                {
                    this.collisionPoint = collisionPoint;
                    return true;
                }
            }
        }
        return false;
    }

    createPortal()
    {
        this.portalUniforms = {
            uTime: { value: 0 },
            uFrequency: { value: 1.4 },
            uDistortion: { value: 0.01 },
            uNoiseScale: { value: 2.0 },
            uNoiseOffset: { value: 0.1 },
            uBrightness: { value: 0.4 },
            uFacOffset: { value: 0.1 },
            uColor: { value: new THREE.Color(0.961, 0.592, 0.078) },
            uEnterProgress: { value: 0.0 },
            uOpacity: { value: 1.0 }
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: portalVertShader,
            fragmentShader: portalFragShader,
            uniforms: this.portalUniforms,
            transparent: true,
        });

        const geometry = new THREE.PlaneGeometry(10, 10, 64, 64);

        this.portal = new THREE.Mesh(geometry, material);
        this.portal.position.set(0, 5, -5);
        this.scene.add(this.portal);

        window.addEventListener('dblclick', () => this.enterPortal());
        window.addEventListener('contextmenu', () => this.exitPortal());

        if (this.debug.active) 
        {
            const portalFolder = this.debugFolder.addFolder({ title: 'Portal' });

            portalFolder.addBinding(this.portalUniforms.uFrequency, 'value', { label: 'Frequency', min: 0, max: 10, step: 0.01 });

            portalFolder.addBinding(this.portalUniforms.uDistortion, 'value', { label: 'Distortion', min: 0, max: 0.1, step: 0.001 });

            portalFolder.addBinding(this.portalUniforms.uNoiseScale, 'value', { label: 'Noise Scale', min: 0, max: 10, step: 0.1 });

            portalFolder.addBinding(this.portalUniforms.uNoiseOffset, 'value', { label: 'Noise Offset', min: 0, max: 2, step: 0.01 });

            portalFolder.addBinding(this.portalUniforms.uBrightness, 'value', { label: 'Brightness', min: 0, max: 2, step: 0.01 });

            portalFolder.addBinding(this.portalUniforms.uFacOffset, 'value', { label: 'Factor Offset', min: -2, max: 2, step: 0.01 });

            portalFolder.addBinding(this.portalUniforms.uColor, 'value', { label: 'Color', view: 'color', color: { type: 'float' } });
        }
    }

    enterPortal()
    {
        this.originalFov = this.camera.fov;

        const tl = gsap.timeline({
            onComplete: () => console.log("Portal transition complete!")
        });

        for (const chunk of this.chunks)
        {
            this.scene.remove(chunk);
            chunk.traverse((child) =>
            {
                if (child.isMesh && child.material)
                {
                    child.material.opacity = 1;
                    child.material.transparent = false;
                }
            });
        }
        this.chunks = [];

        if (this.waterFloor)
        {
            this.scene.remove(this.waterFloor);
            this.waterFloor.material.opacity = 1;
        }

        tl.to(this.portal.scale, { x: 50, y: 50, z: 50, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.portal.position, { x: this.portal.position.x, y: this.portal.position.y, z: 100, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.portalUniforms.uEnterProgress, { value: 1.0, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.camera, {
            fov: 90, duration: 2.0, ease: "power2.outIn",
            onUpdate: () => this.camera.updateProjectionMatrix()
        }, 0);
        tl.to(this.portalUniforms.uFacOffset, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
    }

    exitPortal()
    {
        const tl = gsap.timeline({
            onComplete: () =>
            {
                console.log("Portal exit transition complete!");
                this.portal.visible = false;
            }
        });

        tl.to(this.portal.scale, { x: 1, y: 1, z: 1, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.portal.position, { x: this.portal.position.x, y: this.portal.position.y, z: 0, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.portalUniforms.uEnterProgress, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.portalUniforms.uFacOffset, { value: -1.0, duration: 2.0, ease: "power2.outIn" }, 0);
        tl.to(this.camera, {
            fov: this.originalFov || 45, duration: 2.0, ease: "power2.outIn",
            onUpdate: () => this.camera.updateProjectionMatrix()
        }, 0);
        tl.to(this.portalUniforms.uOpacity, { value: 0.0, duration: 2.0, ease: "power2.outIn" }, 0);
    }
}