import * as THREE from 'three';
import gsap from 'gsap';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { Reflector } from 'three/examples/jsm/Addons.js';
import Experience from '../Experience';

import waterFregShader from '../Shaders/Water/freg.glsl';
import waterVertShader from '../Shaders/Water/vert.glsl';

import portalFregShader from '../Shaders/Portal/freg.glsl';
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
            this.debugFolder = this.debug.ui.addFolder({
                title: 'Map',
                expanded: false
            });
        }

        this.map = this.resources.items.pillarScapeModel.scene;

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

        this.portalPoints = [];
        this.collisionPoint = null;

        this.processTemplate();
        this.createInfiniteMap();
        // this.createPortal();
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
            fragmentShader: portalFregShader,
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

            portalFolder.addBinding(this.portalUniforms.uFrequency, 'value', {
                label: 'Frequency', min: 0, max: 10, step: 0.01
            });

            portalFolder.addBinding(this.portalUniforms.uDistortion, 'value', {
                label: 'Distortion', min: 0, max: 0.1, step: 0.001
            });

            portalFolder.addBinding(this.portalUniforms.uNoiseScale, 'value', {
                label: 'Noise Scale', min: 0, max: 10, step: 0.1
            });

            portalFolder.addBinding(this.portalUniforms.uNoiseOffset, 'value', {
                label: 'Noise Offset', min: 0, max: 2, step: 0.01
            });

            portalFolder.addBinding(this.portalUniforms.uBrightness, 'value', {
                label: 'Brightness', min: 0, max: 2, step: 0.01
            });

            portalFolder.addBinding(this.portalUniforms.uFacOffset, 'value', {
                label: 'Factor Offset', min: -2, max: 2, step: 0.01
            });

            portalFolder.addBinding(this.portalUniforms.uColor, 'value', {
                label: 'Color', view: 'color', color: { type: 'float' }
            });
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

        if (this.floorReflector)
        {
            this.scene.remove(this.floorReflector);
            this.floorReflector.material.opacity = 1;
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

    processTemplate()
    {
        const box = new THREE.Box3();
        this.areaTemplates = [];

        const sharedMapMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            vertexColors: true,
        });

        const colorTop = new THREE.Color(0xFEFEFE);
        const colorBottom = new THREE.Color(0xDDDFCB);

        this.map.traverse((child) =>
        {
            if (child.isMesh && (child.name === 'area1' || child.name === 'area2' || child.name === 'area3'))
            {
                child.castShadow = true;
                child.receiveShadow = true;

                if (this.chunkLength === 0)
                {
                    box.setFromObject(child);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    this.chunkLength = size.z;
                    this.chunkWidth = size.x;
                }

                child.updateMatrix();
                child.geometry.applyMatrix4(child.matrix);
                child.position.set(0, 0, 0);
                child.rotation.set(0, 0, 0);
                child.scale.set(1, 1, 1);
                child.updateMatrix();

                child.material = sharedMapMaterial;

                child.geometry.computeBoundingBox();
                const minY = child.geometry.boundingBox.min.y;
                const maxY = child.geometry.boundingBox.max.y;
                const height = maxY - minY;

                const positionAttribute = child.geometry.attributes.position;
                const colors = [];

                for (let i = 0; i < positionAttribute.count; i++)
                {
                    const y = positionAttribute.getY(i);
                    const alpha = Math.max(0.0, Math.min(1.0, (y - minY) / height));
                    const vertexColor = colorBottom.clone().lerp(colorTop, alpha);
                    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
                }

                child.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                child.geometry.computeBoundsTree();

                child.userData.isCollider = true;
                this.areaTemplates.push(child.clone());
            }
        });

        this.areaTemplates.sort((a, b) => a.name.localeCompare(b.name));

        if (this.chunkLength === 0) this.chunkLength = 100;
        if (this.chunkWidth === 0) this.chunkWidth = 100;

        this.waterShaderParams = {
            waveStrength: 0.04,
            waveSpeed: 0.1,
            waterColor: '#005e76',
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

        this.floorReflector = new Reflector(
            new THREE.CircleGeometry(this.chunkWidth * 4, 16),
            {
                shader: customShader,
                clipBias: 0.05,
                textureWidth: 512,
                textureHeight: 512,
                color: new THREE.Color(this.waterShaderParams.waterColor),
            }
        );

        this.floorReflector.rotation.x = -Math.PI * 0.5;
        this.floorReflector.position.z = -this.chunkLength / 4;
        this.floorReflector.position.y = 0.1;
        this.scene.add(this.floorReflector);

        if (this.debug.active)
        {
            const waterFolder = this.debugFolder.addFolder({ title: 'Water Shader Controls' });

            waterFolder.addBinding(this.waterShaderParams, 'waveStrength', {
                min: 0,
                max: 0.5,
                step: 0.001,
                label: 'Wave Strength'
            }).on('change', (ev) =>
            {
                this.floorReflector.material.uniforms.uWaveStrength.value = ev.value;
            });

            waterFolder.addBinding(this.waterShaderParams, 'waveSpeed', {
                min: 0,
                max: 1,
                step: 0.001,
                label: 'Wave Speed'
            });

            waterFolder.addBinding(this.waterShaderParams, 'waterColor', {
                label: 'Water Color'
            }).on('change', (ev) =>
            {
                this.floorReflector.material.uniforms.color.value.set(ev.value);
            });
        }
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
                chunkGroup.position.x = x * this.chunkWidth;
                chunkGroup.position.z = -(z * this.chunkLength) - this.initialSpawnOffset;

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

        if (this.portal)
        {
            this.portal.material.uniforms.uTime.value += deltaTime * 0.02;
        }

        this.floorReflector.material.uniforms.uTime.value += this.waterShaderParams.waveSpeed * deltaTime;

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
                    this.difficultyLevel = Math.min(2, Math.floor(this.rowsPassed / this.rowsPerDifficulty));
                }

                chunk.position.x += sharedRowOffset;

                const templateMesh = this.areaTemplates[this.difficultyLevel];

                const mesh = chunk.children[0];
                mesh.geometry = templateMesh.geometry;

            }

            if (chunk.position.x < -boundaryX)
            {
                chunk.position.x += this.mapTotalWidth;
            } else if (chunk.position.x > boundaryX)
            {
                chunk.position.x -= this.mapTotalWidth;
            }
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

    reset()
    {
        for (const chunk of this.chunks)
        {
            this.scene.remove(chunk);
        }
        this.chunks = [];
        this._shipColliderCache = null;
        this.createInfiniteMap();
    }
}