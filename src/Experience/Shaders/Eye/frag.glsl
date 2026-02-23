uniform float uTime;
uniform float uInnerRadius;
uniform float uInnerRadiusAnimAmp;
uniform float uOuterRadius;
uniform vec3 uBg;
uniform vec3 uEyeBg;
uniform vec3 uEye1;
uniform vec3 uEye2;

in vec2 vUv;
out vec4 fragColor; // WebGL2 output

#define PI acos(-1.)

// -------------------------------------- //
// Animation
#define ANIM

// Remapped macros to use the new uniforms so the rest of your code works as-is
#define INNER_R (uInnerRadius + sin(uTime * PI * 0.5) * uInnerRadiusAnimAmp)
#define OUTER_R uOuterRadius

#define BG     uBg
#define EYE_BG uEyeBg
#define EYE_1  uEye1
#define EYE_2  uEye2

// how many layers of "strings" are rendered
#define LAYERS 4
// -------------------------------------- //

// Antialiasing: Replaced resolution-dependent EPS with a fixed estimate
#define EPS 0.01 / length(p) 

// gamma correction
#define G(a) pow((a), vec3(0.4545))
#define IG(a) pow((a), vec3(2.2))

// hash functions by Dave_Hoskins
#define UI0 1597334673U
#define UI1 3812015801U
#define UI2 uvec2(UI0, UI1)
#define UI3 uvec3(UI0, UI1, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))

float hash11(in float p) {uvec2 n = uint(int(p)) * UI2;uint q = (n.x ^ n.y) * UI0;return float(q) * UIF;}
vec2 hash22(in vec2 p) {uvec2 q = uvec2(ivec2(p))*UI2;q = (q.x ^ q.y) * UI2;return vec2(q) * UIF;}

// simplex noise by iq
float noise(in vec2 p) {
    const float K1 = 0.366025404,K2 = 0.211324865;vec2 i=floor(p+(p.x+p.y)*K1),a=p-i+(i.x+i.y)*K2;float m=step(a.y,a.x);vec2 o=vec2(m,1.-m);
    vec2 b=a-o+K2,c=a-1.+2.*K2;vec3 h=max(0.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.),n=h*h*h*h*vec3(dot(a,hash22(i+0.0)),dot(b,hash22(i+o)),dot(c,hash22(i+1.)));
    return dot(n,vec3(70.0));
}

mat2 rot(in float a) {
    float s = sin(a), c = cos(a);
    return mat2(c,-s,s,c);
}

float iris(in vec2 p) {
    float d = (OUTER_R + INNER_R) * 0.5;
    d = (abs(length(p) - d) - d + INNER_R) / (d - INNER_R); 
    mat2 r;                       
    float s,                       
          a = atan(p.y, p.x),      
          na,                      
          f = exp2(float(LAYERS)), 
          pattern = 0.0, 
          n,                       
          t,                       
          alpha;                   

    #ifdef ANIM
    s = sin(uTime * PI * 0.25) * 0.25;    
    r = rot(uTime * PI * 0.0078125);      
    #endif
    
    for (int i=0; i<LAYERS; i++) {
        // Removed the mouse 'm' offset from this noise calculation
        na = a + noise(p * 1.5 * f * (1. + s / f) * r) * length(p) * 0.5 / f; 
        n = noise(vec2(sin(na),cos(na)) * 2. * f);                                          
        
        t = .75 / f ;                                         
        t += - 1.5 * smoothstep(1.0, 0.0, d + 0.5) + 1.5; 
        t += -.125 * smoothstep(1.0, 0.0, d + 1.);        
        
        pattern -= smoothstep(-0.35,  0.25,  n - t) * 0.5 * pattern; 
        alpha =    smoothstep(-EPS*f, EPS*f, n - t);
        pattern += pow(alpha, 2.) * (1. - pattern);               
    
        f *= 0.5;
    }
    return max(0.0, pattern); 
}

void main() {
    // Map standard Three.js UVs (0.0 to 1.0) to centered coordinates (-1.0 to 1.0)
    vec2 p = vUv * 2.0 - 1.0;
    
    float irisPerimiter_mask = smoothstep(0.1,  -0.1,  length(p) - OUTER_R);
    float irisPupil_mask =     smoothstep(0.05, -0.05, length(p) - INNER_R);
    float iris_mask =          -irisPupil_mask + irisPerimiter_mask;
    
    float iris_pattern = iris(p);
    
    vec3 iris_color = IG(mix(G(EYE_1), G(EYE_2), vec3(sqrt(clamp((length(p) - INNER_R) / (OUTER_R - INNER_R) + 0.01, 0.0, 1.0))))); 
    
    vec3 col = iris_pattern * iris_color + EYE_BG * (1. - iris_pattern); 
    
    // Keep the BG color for the pupil, but apply the mask
    col = col * iris_mask + (1. - iris_mask) * BG;
    
    // Output the color, but use the outer perimeter mask as the alpha channel!
    fragColor = vec4(col, irisPerimiter_mask);
}