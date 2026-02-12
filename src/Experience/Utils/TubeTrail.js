import * as THREE from 'three';

export default class TubeTrail
{
    constructor(scene, target, offset = new THREE.Vector3(0, 0, 1), length = 20, maxRadius = 0.2, color = 0x00ffff)
    {
        this.scene = scene;
        this.target = target;
        this.offset = offset;
        this.length = length;
        this.maxRadius = maxRadius;
        this.radialSegments = 5;

        this.path = [];

        const startPos = this.getEmissionPosition();
        for (let i = 0; i < this.length; i++)
        {
            let p = startPos.clone();
            p.z += i * 0.5;
            this.path.push(p);
        }

        this.geometry = new THREE.BufferGeometry();
        const vertexCount = this.length * (this.radialSegments + 1);
        this.positions = new Float32Array(vertexCount * 3);
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

        this.geometry.setIndex(this.indices);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        this.material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }

    getEmissionPosition()
    {
        const worldPos = this.offset.clone();
        worldPos.applyMatrix4(this.target.matrixWorld);
        return worldPos;
    }

    update(zShift = 0, xShift = 0)
    {
        const currentPos = this.getEmissionPosition();

        for (let i = 0; i < this.path.length; i++)
        {
            this.path[i].z += zShift;
            this.path[i].x -= xShift;
        }

        this.path.pop();
        this.path.unshift(currentPos);

        this.updateGeometry();
    }

    updateGeometry()
    {
        const pArray = this.geometry.attributes.position.array;

        for (let i = 0; i < this.length; i++)
        {
            const indexOffset = i * (this.radialSegments + 1);
            const center = this.path[i];

            const targetPoint = (i < this.length - 1) ? this.path[i + 1] : this.path[i - 1];
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
        this.geometry.attributes.position.needsUpdate = true;
    }
}