varying vec2 vLocalPosition;
varying mat3 vCustomNormalMatrix;

void main() {
    vLocalPosition = position.xy;
    // 'normalMatrix' is a built-in uniform in Vertex Shaders that 
    // transforms normals from Object Space to View Space.
    vCustomNormalMatrix = normalMatrix; 
}