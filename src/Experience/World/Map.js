import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { Reflector } from 'three/examples/jsm/Addons.js';
import Experience from '../Experience';

import waterFregShader from '../Shaders/Water/freg.glsl';
import waterVertShader from '../Shaders/Water/vert.glsl';

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
        this.debug = this.experience.debug

        if (this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Map',
                expanded: false
            })
        }

        this.model = this.resources.items.pillarScapeModel.scene;

        this.chunkLength = 0;
        this.chunkWidth = 0;
        this.chunkCount = 3;

        this.chunks = [];
        this._inverseMatrix = new THREE.Matrix4();

        this.processTemplate();
        this.createInfiniteMap();
    }

    processTemplate()
    {
        const box = new THREE.Box3();

        this.model.traverse((child) =>
        {
            if (child.isMesh)
            {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.name === 'area1')
                {
                    box.setFromObject(child);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    ``
                    this.chunkLength = size.z;
                    this.chunkWidth = size.x;

                    child.geometry.computeBoundsTree();
                    // child.visible = false; // Hide the template collider mesh
                }
            }
        });

        if (this.chunkLength === 0) this.chunkLength = 100;
        if (this.chunkWidth === 0) this.chunkWidth = 100;

        this.waterShaderParams = {
            waveStrength: 0.1,
            waveSpeed: 0.03,
            waterColor: '#000000',
            hoverRadius: 5.0,
            hoverForce: 0.05,
            shipDirX: 0,
            shipDirZ: -1
        };

        const customShader = Reflector.ReflectorShader;
        customShader.vertexShader = waterVertShader;
        customShader.fragmentShader = waterFregShader;

        const dudvTexture = this.resources.items.dudvTexture;
        dudvTexture.wrapS = dudvTexture.wrapT = THREE.RepeatWrapping;

        customShader.uniforms.uDudvTexture = { value: dudvTexture };
        customShader.uniforms.uTime = { value: 0 };
        customShader.uniforms.uWaveStrength = { value: this.waterShaderParams.waveStrength };
        customShader.uniforms.uWaveSpeed = { value: this.waterShaderParams.waveSpeed };
        customShader.uniforms.uHoverPos = { value: new THREE.Vector3(0, 0, 0) };
        customShader.uniforms.uHoverRadius = { value: this.waterShaderParams.hoverRadius };
        customShader.uniforms.uHoverForce = { value: this.waterShaderParams.hoverForce };
        customShader.uniforms.uShipDirection = { value: new THREE.Vector2(this.waterShaderParams.shipDirX, this.waterShaderParams.shipDirZ) };

        this.floorReflector = new Reflector(
            new THREE.PlaneGeometry(this.chunkWidth * 2, this.chunkLength * 2),
            {
                shader: customShader,
                clipBias: 0.003,
                textureWidth: window.innerWidth * window.devicePixelRatio / 4,
                textureHeight: window.innerHeight * window.devicePixelRatio / 4,
                color: new THREE.Color(this.waterShaderParams.waterColor),
            }
        );

        this.floorReflector.rotation.x = - Math.PI * 0.5;
        this.floorReflector.position.y = -0.01;

        this.scene.add(this.floorReflector);

        this.setupDebug();
    }

    setupDebug()
    {
        this.debugPane = this.debugFolder.addFolder({ title: 'Water Shader Controls' });

        this.debugPane.addBinding(this.waterShaderParams, 'waveStrength', {
            min: 0,
            max: 0.5,
            step: 0.001,
            label: 'Wave Strength'
        }).on('change', (ev) =>
        {
            this.floorReflector.material.uniforms.uWaveStrength.value = ev.value;
        });

        this.debugPane.addBinding(this.waterShaderParams, 'waveSpeed', {
            min: 0,
            max: 1,
            step: 0.001,
            label: 'Wave Speed'
        });

        this.debugPane.addBinding(this.waterShaderParams, 'waterColor', {
            label: 'Water Color'
        }).on('change', (ev) =>
        {
            this.floorReflector.material.uniforms.color.value.set(ev.value);
        });

        this.debugPane.addBinding(this.waterShaderParams, 'hoverRadius', {
            min: 0, max: 20, step: 0.1, label: 'Ripple Radius'
        }).on('change', (ev) =>
        {
            this.floorReflector.material.uniforms.uHoverRadius.value = ev.value;
        });

        this.debugPane.addBinding(this.waterShaderParams, 'hoverForce', {
            min: 0, max: 0.5, step: 0.001, label: 'Ripple Force'
        }).on('change', (ev) =>
        {
            this.floorReflector.material.uniforms.uHoverForce.value = ev.value;
        });

        this.debugPane.addBinding(this.waterShaderParams, 'shipDirX', {
            min: -1, max: 1, step: 0.1, label: 'Dir X'
        }).on('change', (ev) =>
        {
            this.floorReflector.material.uniforms.uShipDirection.value.x = ev.value;
        });

        this.debugPane.addBinding(this.waterShaderParams, 'shipDirZ', {
            min: -1, max: 1, step: 0.1, label: 'Dir Z'
        }).on('change', (ev) =>
        {
            this.floorReflector.material.uniforms.uShipDirection.value.y = ev.value;
        });
    }

    createInfiniteMap()
    {
        this.gridColumns = 3;
        this.gridRows = 2;

        this.mapTotalWidth = this.gridColumns * this.chunkWidth;
        this.mapTotalDepth = this.gridRows * this.chunkLength;

        const halfCol = Math.floor(this.gridColumns / 2);

        for (let x = -halfCol; x <= halfCol; x++) 
        {
            for (let z = 0; z < this.gridRows; z++)
            {
                const chunk = this.model.clone();

                chunk.position.x = x * this.chunkWidth;
                chunk.position.z = -(z * this.chunkLength);

                chunk.userData.colliders = [];
                chunk.traverse(child =>
                {
                    if (child.userData.isCollider) chunk.userData.colliders.push(child);
                });

                this.scene.add(chunk);
                this.chunks.push(chunk);
            }
        }
    }

    update(shipVelocity, forwardSpeed)
    {
        this.floorReflector.material.uniforms.uTime.value += this.waterShaderParams.waveSpeed;

        const boundaryX = (this.mapTotalWidth / 2);

        for (const chunk of this.chunks)
        {
            chunk.position.z += forwardSpeed;
            chunk.position.x -= shipVelocity;

            if (chunk.position.z > this.chunkLength) 
            {
                chunk.position.z -= this.mapTotalDepth;
            }

            if (chunk.position.x < -boundaryX) 
            {
                chunk.position.x += this.mapTotalWidth;
            }

            else if (chunk.position.x > boundaryX) 
            {
                chunk.position.x -= this.mapTotalWidth;
            }
        }
    }

    checkCollisions(shipGroup)
    {
        if (!shipGroup) return false;

        let shipCollider = shipGroup.children.find(child => /collider/i.test(child.name));

        if (!shipCollider || !shipCollider.geometry) return false;

        shipCollider.updateMatrixWorld();

        for (const chunk of this.chunks)
        {
            if (chunk.position.z > this.chunkLength || chunk.position.z < -this.chunkLength) continue;

            if (Math.abs(chunk.position.x) > this.chunkWidth) continue;

            const mapColliders = chunk.userData.colliders;

            for (const mapCollider of mapColliders)
            {
                mapCollider.updateMatrixWorld();

                this._inverseMatrix.copy(mapCollider.matrixWorld).invert();
                this._inverseMatrix.multiply(shipCollider.matrixWorld);

                const hit = mapCollider.geometry.boundsTree.intersectsGeometry(
                    shipCollider.geometry,
                    this._inverseMatrix
                );

                if (hit) return true;
            }
        }
        return false;
    }

    reset()
    {
        for (const chunk of this.chunks)
        {
            this.scene.remove(chunk);
        }
        this.chunks = [];

        this.createInfiniteMap();
    }
}