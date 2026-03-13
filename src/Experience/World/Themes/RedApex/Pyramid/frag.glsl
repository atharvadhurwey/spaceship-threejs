varying vec2 vUv;
        
uniform float uAngle;
uniform float uHeightOffset;
uniform float uBaseWidth;
uniform float uSlope;
uniform vec3 uSandColor;
uniform float uSplitLevel;
uniform float uSplitGap;

uniform float uTime;
uniform float uRotationSpeed;
uniform float uRotationAngle;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float getPyramidBase(vec3 p) {
    p.xz *= rot(uAngle); 
    
    vec3 q = p;
    q.xz = abs(q.xz);
    float dBase = -p.y; 
    
    vec2 normal = normalize(vec2(1.0, uSlope));
    float dSide = dot(vec2(max(q.x, q.z), p.y), normal) - uBaseWidth;
    
    return max(dBase, dSide) * 0.5;
}

float sdPyramid(vec3 p) {
    p.y += uHeightOffset; 
    
    float splitY = uSplitLevel;
    
    // 1. Bottom Half: Base shape
    float dBottom = max(getPyramidBase(p), p.y - splitY);
    
    // 2. Top Half: Shift space down
    vec3 pShifted = p;
    pShifted.y -= uSplitGap;
    
    // NEW: Rotate the top half's XZ coordinates based on time and speed
    // We do this before calculating the shape, but because Y is untouched, 
    // the horizontal slice plane remains perfectly aligned.
    pShifted.xz *= rot(uRotationAngle);
    
    // Cut off everything below splitY in the shifted space
    float dTop = max(getPyramidBase(pShifted), -(pShifted.y - splitY));
    
    // 3. Union the two halves
    return min(dBottom, dTop);
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sdPyramid(p + e.xyy) - sdPyramid(p - e.xyy),
        sdPyramid(p + e.yxy) - sdPyramid(p - e.yxy),
        sdPyramid(p + e.yyx) - sdPyramid(p - e.yyx)
    ));
}

void main() {
    // ... [Keep your existing main() function exactly as is] ...
    vec2 uv = (vUv - 0.5) * 2.0;

    vec3 ro = vec3(0.0, 1.0, 6.0);
    vec3 rd = normalize(vec3(uv, -1.0));

    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = sdPyramid(p);
        if(d < 0.001 || t > 20.0) break;
        t += d;
    }

    if(t < 20.0) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        
        vec3 moonLightDir = normalize(vec3(-0.8, 1.0, 0.5));
        vec3 moonColor = vec3(0.4, 0.6, 0.9);
        float diff = max(dot(n, moonLightDir), 0.0);
        
        vec3 ambientColor = vec3(0.02, 0.05, 0.1);
        
        vec3 col = uSandColor * (diff * moonColor + ambientColor);
        
        float rim = 1.0 - max(dot(n, -rd), 0.0);
        col += vec3(0.1, 0.15, 0.3) * pow(rim, 4.0);
        
        gl_FragColor = vec4(col, 1.0);
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}