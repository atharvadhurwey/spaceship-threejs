uniform float uTime;
uniform float uWindSpeed;
uniform vec2 uWindDirection;
uniform float uDuneScale;
uniform float uDuneHeight;
uniform vec2 uOffset;
uniform float uOpacity; // Added uOpacity uniform

// Simple 2D Hash
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// 2D Value Noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
            mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

// FBM
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// Evaluate dune height
float getElevation(vec2 pos) {
    vec2 movingUv = pos + uOffset + uWindDirection * uTime * uWindSpeed;
    float dune = 1.0 - abs(fbm(movingUv * uDuneScale) * 2.0 - 1.0);
    return pow(dune, 2.0) * uDuneHeight;
}

varying vec2 vLocalPosition;
varying mat3 vCustomNormalMatrix; // Received from VS

uniform vec3 uBaseColor;
uniform vec3 uShadowColor;

void main() {
    // --- BUMP MAPPING ---
    float e = 0.01; 
    float h  = getElevation(vLocalPosition);
    float hx = getElevation(vLocalPosition + vec2(e, 0.0));
    float hy = getElevation(vLocalPosition + vec2(0.0, e));

    // Calculate slopes
    vec3 tX = vec3(e, 0.0, hx - h);
    vec3 tY = vec3(0.0, e, hy - h);
    
    // Calculate normal in Object Space
    vec3 objectNormal = normalize(cross(tX, tY));

    // CSM Hook: Update Normal
    // We transform Object Space Normal -> View Space using our passed matrix
    csm_FragNormal = normalize(vCustomNormalMatrix * objectNormal);

    // --- COLOR MIXING ---
    float mixFactor = smoothstep(0.0, uDuneHeight, h);
    vec3 finalColor = mix(uShadowColor, uBaseColor, mixFactor);

    // CSM Hook: Update Color
    // Applied uOpacity to the alpha channel here
    csm_DiffuseColor = vec4(finalColor, uOpacity);
}