uniform float uEnterProgress; // Our new GSAP-driven uniform

varying vec2 vUv;

void main() {
    vUv = uv;
    vec3 pos = position;

    // 1. Calculate distance from the center of the plane
    float distToCenter = distance(uv, vec2(0.5));

    // 2. Create a "funnel" curve 
    // smoothstep(0.5, 0.0, distToCenter) means:
    // Center (dist 0.0) = 1.0 (Maximum push)
    // Edges (dist 0.5+) = 0.0 (No push, stays anchored)
    float funnel = smoothstep(0.5, 0.0, distToCenter);

    // 3. Stretch the Z-axis backwards
    // Multiply by a depth factor (e.g., 20.0 or 50.0). Adjust this to taste!
    float depthFactor = 25.0; 
    pos.z -= funnel * uEnterProgress * depthFactor;

    // 4. Optional: Add a subtle twist effect as you enter
    // float angle = uEnterProgress * funnel * 3.14; 
    // float s = sin(angle);
    // float c = cos(angle);
    // mat2 rotation = mat2(c, -s, s, c);
    // pos.xy = rotation * pos.xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}