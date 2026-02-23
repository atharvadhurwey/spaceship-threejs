uniform float uTime;
uniform float uThreshold;
uniform float uExposure;
uniform float uNoiseScale;
uniform float uTwinkleScale;

varying vec2 vUv;

vec3 hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
}

float noise(in vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}

void main() {
    vec2 uv = vUv;
    vec3 stars_direction = normalize(vec3(uv * 2.0 - 1.0, 1.0));
    
    float baseNoise = max(noise(stars_direction * uNoiseScale), 0.0);
    float stars = pow(baseNoise, uThreshold) * uExposure;
    
    if (stars > 0.001) {
        float twinkleNoise = noise(stars_direction * uTwinkleScale + vec3(uTime));
        stars *= mix(0.4, 1.4, twinkleNoise); 
    } else {
        stars = 0.0; // Ensure the background remains pure black
    }
    
    gl_FragColor = vec4(vec3(stars), 1.0);
}