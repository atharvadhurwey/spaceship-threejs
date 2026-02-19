uniform vec3 color;
uniform sampler2D tDiffuse;
uniform sampler2D uDudvTexture;
uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveSpeed;

varying vec4 vUv;
#include <logdepthbuf_pars_fragment>

void main() 
{
  #include <logdepthbuf_fragment>

  vec2 distortedUv = texture2D(uDudvTexture, vec2(vUv.x + uTime * uWaveSpeed, vUv.y)).rg * uWaveStrength;
  distortedUv = vUv.xy + vec2(distortedUv.x, distortedUv.y + uTime * uWaveSpeed);
  vec2 distortion = (texture2D(uDudvTexture, distortedUv).rg * 2.0 - 1.0) * uWaveStrength;

  vec4 uv = vec4(vUv);
  uv.xy += distortion;

  vec4 base = texture2DProj(tDiffuse, uv);
  gl_FragColor = vec4(mix(base.rgb, color, 0.3), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
