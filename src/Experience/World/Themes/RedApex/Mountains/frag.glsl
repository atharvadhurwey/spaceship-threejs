uniform vec3 uMountainBaseColor;
uniform vec3 uMountainPeakColor;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uOffset;

varying vec2 vUv;

// 1D Random function
float hash(float n) { 
    return fract(sin(n) * 1e4); 
}

// 1D Noise function
float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    // Smooth interpolation
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}

// 1D Fractal Brownian Motion (FBM)
float fbm(float x) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(x);
        x = x * 2.0 + 100.0; // Shift and scale for the next octave
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    float mountainHeight = fbm((vUv.x + uOffset) * uFrequency) * uAmplitude + 0.1;
    float mountainMask = smoothstep(mountainHeight + 0.005, mountainHeight - 0.005, vUv.y);
    vec3 mountainColor = mix(uMountainBaseColor, uMountainPeakColor, vUv.y / mountainHeight);

    gl_FragColor = vec4(mountainColor, mountainMask);
}