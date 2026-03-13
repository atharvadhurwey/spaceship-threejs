uniform sampler2D tDiffuse;
uniform float uOpacity;
uniform vec3 uColor; 

uniform vec3 uFresnelColor;
uniform float uFresnelPower;
uniform float uFresnelIntensity;
uniform float uCenterOpacity;

varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    
    // Convert to grayscale and tint it red
    float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 baseColor = brightness * uColor;

    // --- CIRCULAR MASK LOGIC ---
    vec2 center = vec2(0.5, 0.51);
    float radius = 0.34;
    float dist = distance(vUv, center);

    // Cut off everything outside the radius
    float circleMask = 1.0 - smoothstep(radius, radius + 0.005, dist); 

    // --- FAKE SPHERE FRESNEL LOGIC ---
    vec2 nCoords = (vUv - center) / radius;
    
    // Calculate the fake Z normal
    float z = sqrt(max(0.0, 1.0 - dot(nCoords, nCoords)));
    
    // Calculate base Fresnel (0.0 at center, 1.0 at edge)
    float fresnel = 1.0 - z;
    
    // Apply power to curve the falloff
    float fresnelCurve = pow(fresnel, uFresnelPower);
    
    // Apply the glow color to the edges
    vec3 finalColor = baseColor + (uFresnelColor * fresnelCurve * uFresnelIntensity);

    // --- NEW: ALPHA LOGIC ---
    // mix() blends between uCenterOpacity (at the middle) and 1.0 (at the edges)
    // based on the fresnel curve.
    float alphaMultiplier = mix(uCenterOpacity, 1.0, fresnelCurve);

    // Combine the circle mask, our new hollow alpha, and global opacity
    gl_FragColor = vec4(finalColor, circleMask * alphaMultiplier * uOpacity);
}