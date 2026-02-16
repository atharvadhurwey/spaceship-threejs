import * as THREE from 'three';

export default class DualTubeTrail
{
    constructor(scene, target, leftOffset = new THREE.Vector3(-1, 0, 1), rightOffset = new THREE.Vector3(1, 0, 1), length = 20, maxRadius = 0.2, color = 0x00ffff)
    {
        this.scene = scene;
        this.target = target;

        this.leftOffset = leftOffset;
        this.rightOffset = rightOffset;

        this.length = length;
        this.maxRadius = maxRadius;
        this.radialSegments = 5;

        this.leftPath = [];
        this.rightPath = [];

        const startPosLeft = this.getEmissionPosition(this.leftOffset);
        const startPosRight = this.getEmissionPosition(this.rightOffset);

        for (let i = 0; i < this.length; i++)
        {
            let pL = startPosLeft.clone();
            pL.z += i * 0.5;
            this.leftPath.push(pL);

            let pR = startPosRight.clone();
            pR.z += i * 0.5;
            this.rightPath.push(pR);
        }

        this.indices = [];
        for (let j = 0; j < this.length - 1; j++)
        {
            for (let i = 0; i < this.radialSegments; i++)
            {
                const a = j * (this.radialSegments + 1) + (i);
                const b = j * (this.radialSegments + 1) + (i + 1);
                const c = (j + 1) * (this.radialSegments + 1) + (i);
                const d = (j + 1) * (this.radialSegments + 1) + (i + 1);
                this.indices.push(a, b, d);
                this.indices.push(a, d, c);
            }
        }

        this.material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
        });

        const vertexCount = this.length * (this.radialSegments + 1);

        this.leftGeometry = new THREE.BufferGeometry();
        this.leftPositions = new Float32Array(vertexCount * 3);
        this.leftGeometry.setIndex(this.indices);
        this.leftGeometry.setAttribute('position', new THREE.BufferAttribute(this.leftPositions, 3));

        this.leftMesh = new THREE.Mesh(this.leftGeometry, this.material);
        this.leftMesh.frustumCulled = false;
        this.scene.add(this.leftMesh);

        this.rightGeometry = new THREE.BufferGeometry();
        this.rightPositions = new Float32Array(vertexCount * 3);
        this.rightGeometry.setIndex(this.indices);
        this.rightGeometry.setAttribute('position', new THREE.BufferAttribute(this.rightPositions, 3));

        this.rightMesh = new THREE.Mesh(this.rightGeometry, this.material);
        this.rightMesh.frustumCulled = false;
        this.scene.add(this.rightMesh);
    }

    getEmissionPosition(offset)
    {
        const worldPos = offset.clone();
        worldPos.applyMatrix4(this.target.matrixWorld);
        return worldPos;
    }

    update(zShift = 0, xShift = 0)
    {
        const currentPosLeft = this.getEmissionPosition(this.leftOffset);
        const currentPosRight = this.getEmissionPosition(this.rightOffset);

        for (let i = 0; i < this.length; i++)
        {
            this.leftPath[i].z += zShift;
            this.leftPath[i].x -= xShift;

            this.rightPath[i].z += zShift;
            this.rightPath[i].x -= xShift;
        }

        this.leftPath.pop();
        this.leftPath.unshift(currentPosLeft);

        this.rightPath.pop();
        this.rightPath.unshift(currentPosRight);

        this.updateGeometry(this.leftPath, this.leftGeometry);
        this.updateGeometry(this.rightPath, this.rightGeometry);
    }

    updateGeometry(path, geometry)
    {
        const pArray = geometry.attributes.position.array;

        for (let i = 0; i < this.length; i++)
        {
            const indexOffset = i * (this.radialSegments + 1);
            const center = path[i];

            const targetPoint = (i < this.length - 1) ? path[i + 1] : path[i - 1];
            let dir = new THREE.Vector3().subVectors(targetPoint, center).normalize();
            if (i === this.length - 1) dir.negate();

            if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);

            const axis = new THREE.Vector3(0, 1, 0);
            if (Math.abs(dir.y) > 0.99) axis.set(1, 0, 0);

            const right = new THREE.Vector3().crossVectors(dir, axis).normalize();
            const up = new THREE.Vector3().crossVectors(right, dir).normalize();

            const radius = this.maxRadius * (1 - (i / this.length));

            for (let j = 0; j <= this.radialSegments; j++)
            {
                const angle = (j / this.radialSegments) * Math.PI * 2;
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                const vx = center.x + (right.x * cos + up.x * sin) * radius;
                const vy = center.y + (right.y * cos + up.y * sin) * radius;
                const vz = center.z + (right.z * cos + up.z * sin) * radius;

                pArray[(indexOffset + j) * 3] = vx;
                pArray[(indexOffset + j) * 3 + 1] = vy;
                pArray[(indexOffset + j) * 3 + 2] = vz;
            }
        }
        geometry.attributes.position.needsUpdate = true;
    }
}