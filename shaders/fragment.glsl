uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uScale;
uniform float uAngle;
uniform float uMaxIter;
uniform vec3 uColor;
uniform float uColorSmoothing;
uniform float uColorGradient;
uniform float uColorFrequency;

varying vec2 vUv;

#define PI 3.1415

precision highp float;

vec2 rot(vec2 pos, vec2 pivot, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    pos -= pivot;
    pos = vec2(pos.x*c - pos.y*s, pos.x*s + pos.y*c);
    return pos + pivot;
}

void main() {
    vec3 col = vec3(0.);

    vec2 nUv = vUv - vec2(0.5);

    vec2 scale = uScale * vec2(uAspect, 1);

    vec2 z = vec2(0.);
    float iter = 0.;
    float dist = 0.;
    float escapeRadius = 20.;

    vec2 c = (nUv) * scale + uCenter;
    c = rot(c, uCenter, uAngle);

    for(iter=0.; iter<uMaxIter; iter++) {
        z = vec2(z.x*z.x - z.y*z.y, 2.*z.x*z.y) + c;

        dist = length(z);
        if (dist > escapeRadius) break;
    }

    float fractIter = log2(log(dist) / log(escapeRadius)) * uColorSmoothing;

    float intensity = (iter - fractIter)/uMaxIter;
    intensity = sqrt(intensity);

    col += intensity * uColor * (1. - uColorGradient);
    col += (sin(uColor * intensity * uColorFrequency) * 0.5 + 0.5) * uColorGradient;

    col *= step(iter, uMaxIter - 1.); // turn the set black

    gl_FragColor = vec4(col, 1.);
}