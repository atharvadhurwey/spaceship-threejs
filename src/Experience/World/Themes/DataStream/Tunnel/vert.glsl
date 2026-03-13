uniform vec2 uUvScale;
uniform float uFinalSpeed;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vViewZ;

void main() {
vUv = vec2((uv.y * uUvScale.y) - uFinalSpeed, uv.x * uUvScale.x); 

vWorldNormal = normalize(normalMatrix * normal);
vec4 worldPos = modelMatrix * vec4(position, 1.0);
vWorldPosition = worldPos.xyz;

vec4 mvPosition = viewMatrix * worldPos;
vViewZ = -mvPosition.z; 

gl_Position = projectionMatrix * mvPosition;
}