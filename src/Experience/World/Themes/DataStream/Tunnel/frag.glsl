// Optimization: Force mediump precision for variables that don't need highp
precision mediump float;

uniform float uTime;
uniform vec3 uCenterColor;
uniform vec3 uEdgeColor;
uniform float uIntensity;
uniform float uDepthFade;
uniform float uReflectionStrength;

uniform sampler2D uMatrixTex;
uniform float uMatrixIntensity;
uniform vec3 uMatrixBaseColor; 
uniform vec3 uMatrixHeadColor;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying float vViewZ;

// Vectorized random function for massive performance boost
vec4 rand4(vec4 n) { return fract(sin(n) * 43758.5453123); }
float rand(float n) { return fract(sin(n) * 43758.5453123); }

vec3 addSegmentedLine(vec3 color, float uvPrimary, float targetPrimary, float width, float uvSecondary, float id, float time, float speedMult) {
// OPTIMIZATION: Process 4 random values at once in the GPU instead of 4 separate calls
vec4 r1 = rand4(id * vec4(8.2, 4.5, 1.0, 2.1));
vec4 r2 = rand4(id * vec4(1.3, 1.7, 3.4, 5.2));
float r3 = rand(id * 2.2);

float shiftedTarget = targetPrimary + (r1.x - 0.5) * 0.12; 
float actualWidth = width * (0.1 + r1.y * 6.0); 

float diff = fract(uvPrimary - shiftedTarget + 0.5) - 0.5;
diff *= actualWidth;

float weight = step(abs(diff), 1.0);

// Early exit: if this pixel isn't in the line, don't calculate the moving dashes
if (weight == 0.0) return vec3(0.0);

float speed = (0.5 + r1.z * 4.0) * speedMult;
float dir = r1.w > 0.5 ? 1.0 : -1.0;

float scale = 0.05 + r2.x * 30.0;
float phase = r2.y * 20.0;

float movingCoord = uvSecondary * scale + time * speed * dir + phase;
float dashPos = fract(movingCoord);
float dashLen = 0.01 + r2.z * 0.93; 

float mask = step(0.0, dashPos) * step(dashPos, dashLen);

float baseScale = scale * (0.02 + r2.w * 0.3); 
float baseSpeed = speed * 0.1; 
float baseCoord = uvSecondary * baseScale + time * baseSpeed * dir + phase * 2.0;
float basePos = fract(baseCoord);
float baseLen = 0.1 + r3 * 0.8; 

float baseMask = step(0.0, basePos) * step(basePos, baseLen);

return color * (0.25 * baseMask + 0.85 * mask);
}

vec3 addParticleDot(vec3 color, float uvPrimary, float targetPrimary, float width, float uvSecondary, float id, float time, float speedMult) {
vec4 r1 = rand4(id * vec4(6.1, 1.0, 2.1, 1.3));
vec3 r2 = rand4(vec4(id * 1.7, id * 3.4, 0.0, 0.0)).xyz;

float actualWidth = width * (0.5 + r1.x * 3.0);
float diff = fract(uvPrimary - targetPrimary + 0.5) - 0.5;
diff *= actualWidth;

float weight = step(abs(diff), 1.0);
if (weight == 0.0) return vec3(0.0);

float speed = (2.0 + r1.y * 4.0) * speedMult; 
float dir = r1.z > 0.5 ? 1.0 : -1.0;

float scale = 10.0 + r1.w * 80.0;
float phase = r2.x * 10.0;

float movingCoord = uvSecondary * scale + time * speed * dir + phase;
float dashPos = fract(movingCoord);
float dashLen = 0.001 + r2.y * 0.015; 

float mask = step(0.0, dashPos) * step(dashPos, dashLen);
return color * mask * 2.0; 
}

vec3 getUniformTunnelColor(float uvY, float uvX, float time) {
vec3 c = vec3(0.0);
float hw = uvY + sin(uvX * 120.0) * 0.003;

c += addSegmentedLine(vec3(0.2, 0.4, 1.0), hw, 0.05, 100.0, uvX * 100.0, 10.0, time, 2.0); 
c += addSegmentedLine(vec3(1.0, 0.6, 0.1), hw, 0.25, 120.0, uvX * 100.0, 12.0, time, 2.0); 
c += addSegmentedLine(vec3(0.0, 0.8, 1.0), hw, 0.35, 140.0, uvX * 100.0, 13.0, time, 2.0); 
c += addSegmentedLine(vec3(1.0, 0.9, 0.2), hw, 0.45, 250.0, uvX * 100.0, 14.0, time, 2.0); 
c += addSegmentedLine(vec3(0.1, 0.9, 0.3), hw, 0.55, 150.0, uvX * 100.0, 15.0, time, 2.0); 
c += addSegmentedLine(vec3(1.0, 0.4, 0.0), hw, 0.65, 180.0, uvX * 100.0, 16.0, time, 2.0); 
c += addSegmentedLine(vec3(1.0, 0.1, 0.1), hw, 0.75, 220.0, uvX * 100.0, 17.0, time, 2.0); 
c += addSegmentedLine(vec3(0.2, 0.9, 0.4), hw, 0.95, 150.0, uvX * 100.0, 19.0, time, 2.0); 

c += addSegmentedLine(vec3(1.0), hw, 0.10, 300.0, uvX * 100.0, 20.0, time, 2.5) * 0.5;
c += addSegmentedLine(vec3(1.0), hw, 0.40, 450.0, uvX * 100.0, 21.0, time, 2.5) * 0.5;
c += addSegmentedLine(vec3(1.0), hw, 0.70, 350.0, uvX * 100.0, 22.0, time, 2.5) * 0.5;
c += addSegmentedLine(vec3(0.8, 0.9, 1.0), hw, 0.90, 400.0, uvX * 100.0, 23.0, time, 2.5) * 0.6;

c += addParticleDot(vec3(1.0, 0.5, 1.0), hw, 0.12, 400.0, uvX * 100.0, 80.0, time, 1.5);
c += addParticleDot(vec3(0.5, 1.0, 1.0), hw, 0.38, 350.0, uvX * 100.0, 81.0, time, 2.5);
c += addParticleDot(vec3(1.0, 1.0, 0.5), hw, 0.62, 450.0, uvX * 100.0, 82.0, time, 2.0);
c += addParticleDot(vec3(1.0, 0.2, 0.2), hw, 0.88, 300.0, uvX * 100.0, 83.0, time, 3.0);

return c;
}

void main() {
    float y = fract(vUv.y); 

    vec3 bgColor = mix(uEdgeColor, uCenterColor, 0.5);
    vec3 streakColor = getUniformTunnelColor(y, vUv.x, uTime);
    vec3 finalColor = bgColor + (streakColor * uIntensity);

    if (uMatrixIntensity > 0.0) {
        vec2 texUv = vec2(vUv.x * 250.0, y * 14.0);
        float textVal = texture2D(uMatrixTex, texUv).r;
        
        float streamId = floor(texUv.y);
        
        // OPTIMIZATION: Vectorize matrix stream random generation
        vec3 mRand = rand4(streamId * vec4(1.5, 7.1, 3.3, 0.0)).xyz;
        float speed = 0.5 + mRand.x * 1.5;
        float phase = mRand.y * 10.0;
        float dir = mRand.z > 0.5 ? 1.0 : -1.0; 
        
        float trailCoord = vUv.x * 8.0 + uTime * speed * dir + phase;
        float trailPos = fract(trailCoord);
        
        float trailMask = smoothstep(0.0, 0.8, trailPos) * smoothstep(1.0, 0.95, trailPos);
        float headMask = smoothstep(0.95, 1.0, trailPos);
        
        float cellId = floor(texUv.x) + streamId * 100.0;
        float flicker = sin(uTime * 15.0 + rand(cellId) * 20.0) * 0.5 + 0.5;
        
        float matrixVisibility = (trailMask * 0.6 + headMask * 2.0) * (0.3 + 0.7 * flicker);

        vec3 mColor = mix(uMatrixBaseColor, uMatrixHeadColor, headMask);
        finalColor += mColor * textVal * matrixVisibility * uMatrixIntensity * uIntensity;
    }

    float fogFactor = exp(-vViewZ * uDepthFade);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = max(0.0, dot(-vWorldNormal, viewDir));
    float cavityShadow = mix(0.5, 1.0, smoothstep(0.0, 0.8, fresnel)); 

    finalColor *= cavityShadow; 
    finalColor = mix(uEdgeColor, finalColor, fogFactor); 

    gl_FragColor = vec4(finalColor, 1.0);
}