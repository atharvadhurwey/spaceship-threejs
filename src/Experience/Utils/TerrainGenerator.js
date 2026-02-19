import * as THREE from 'three';

export default class TerrainGenerator
{
  static build(mapScene, targetNames, colors, debugFolder)
  {
    const box = new THREE.Box3();
    const areaTemplates = [];
    let chunkLength = 0;
    let chunkWidth = 0;

    const sharedMapMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const mapUniforms = {
      uColorTop: { value: new THREE.Color(colors.top) },
      uColorBottom: { value: new THREE.Color(colors.bottom) },
      uMaxY: { value: colors.maxY || 100 },
      uMinY: { value: colors.minY || 0 },
    };

    sharedMapMaterial.onBeforeCompile = (shader) =>
    {
      shader.uniforms.uColorTop = mapUniforms.uColorTop;
      shader.uniforms.uColorBottom = mapUniforms.uColorBottom;
      shader.uniforms.uMinY = mapUniforms.uMinY;
      shader.uniforms.uMaxY = mapUniforms.uMaxY;

      shader.vertexShader = shader.vertexShader.replace('#include <common>',
        `
          #include <common>
          varying float vHeight;
        `
      );
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        `
          #include <begin_vertex>
          vHeight = position.y;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
        `
          #include <common>
          uniform vec3 uColorTop;
          uniform vec3 uColorBottom;
          uniform float uMinY;
          uniform float uMaxY;
          varying float vHeight;
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        `
          #include <color_fragment>
          float gradientFactor = smoothstep(uMinY, uMaxY, vHeight);
          vec3 gradientColor = mix(uColorBottom, uColorTop, gradientFactor);
          diffuseColor.rgb *= gradientColor;
        `
      );
    };

    mapScene.traverse((child) =>
    {
      if (child.isMesh && targetNames.includes(child.name))
      {
        child.castShadow = true;
        child.receiveShadow = true;

        if (chunkLength === 0)
        {
          box.setFromObject(child);
          const size = new THREE.Vector3();
          box.getSize(size);
          chunkLength = size.z;
          chunkWidth = size.x;
        }

        child.updateMatrix();
        child.geometry.applyMatrix4(child.matrix);
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.scale.set(1, 1, 1);
        child.updateMatrix();

        child.material = sharedMapMaterial;
        child.geometry.computeBoundsTree();

        child.userData.isCollider = true;

        areaTemplates.push(child.clone());
      }
    });

    areaTemplates.sort((a, b) => a.name.localeCompare(b.name));

    if (chunkLength === 0) chunkLength = 100;
    if (chunkWidth === 0) chunkWidth = 100;

    let activeDebugFolder = null;
    if (debugFolder)
    {
      activeDebugFolder = debugFolder.addFolder({ title: 'Map Colors' });
      activeDebugFolder.addBinding(colors, 'top', { label: 'TopColor', view: 'color' }).on('change', (ev) => mapUniforms.uColorTop.value.set(ev.value));
      activeDebugFolder.addBinding(colors, 'bottom', { label: 'BottomColor', view: 'color' }).on('change', (ev) => mapUniforms.uColorBottom.value.set(ev.value));
      activeDebugFolder.addBinding(mapUniforms.uMaxY, 'value', { label: 'MaxHeight', min: 0, max: 200, step: 0.1 });
      activeDebugFolder.addBinding(mapUniforms.uMinY, 'value', { label: 'MinHeight', min: 0, max: 50, step: 0.1 });
    }

    return { areaTemplates, chunkLength, chunkWidth, debugFolder: activeDebugFolder };
  }
}