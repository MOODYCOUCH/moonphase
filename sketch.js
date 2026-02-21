let moonTex;
let moonShader;
let stars = [];

const vert = `
precision mediump float;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

varying vec3 vN;
varying vec2 vUV;
varying vec3 vPosEye;

void main() {
  vN = normalize(uNormalMatrix * aNormal);
  vUV = aTexCoord;

  vec4 posEye = uModelViewMatrix * vec4(aPosition, 1.0);
  vPosEye = posEye.xyz;

  gl_Position = uProjectionMatrix * posEye;
}
`;

const frag = `
precision mediump float;

uniform sampler2D uTex;
uniform float uPhase;      
uniform float uEdge;       
uniform float uEarth;      
uniform float uDiffuse;    
uniform float uSpec;       
uniform float uShine;      
uniform vec3 uLightDir;   

varying vec3 vN;
varying vec2 vUV;
varying vec3 vPosEye;

void main() {
  vec3 n = normalize(vN);

  float fullness = 1.0 - abs(uPhase - 0.5) * 2.0;
  float threshold = mix(1.0, -1.0, fullness);
  float litMask = smoothstep(threshold, threshold + uEdge, n.x);

  vec3 tex = texture2D(uTex, vUV).rgb;

  vec3 L = normalize(uLightDir);
  vec3 V = normalize(-vPosEye);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(n, L), 0.0);
  float diffuse = NdotL * uDiffuse;

  float specular = 0.0;
  if (NdotL > 0.0) {
    specular = pow(max(dot(n, H), 0.0), uShine) * uSpec;
  }

  float light = mix(uEarth, uEarth + diffuse, litMask);
  vec3 col = tex * light + vec3(specular * litMask);

  gl_FragColor = vec4(col, 1.0);
}
`;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();

  moonTex = createGraphics(512, 512);
  moonTex.noStroke();
  moonTex.background(200);

  moonTex.loadPixels();
  for (let y = 0; y < moonTex.height; y++) {
    for (let x = 0; x < moonTex.width; x++) {
      const n = noise(x * 0.02, y * 0.02);
      const v = 150 + n * 90;
      const idx = 4 * (y * moonTex.width + x);
      moonTex.pixels[idx + 0] = v;
      moonTex.pixels[idx + 1] = v;
      moonTex.pixels[idx + 2] = v;
      moonTex.pixels[idx + 3] = 255;
    }
  }
  moonTex.updatePixels();

  moonTex.fill(0, 35);
  for (let i = 0; i < 170; i++) {
    moonTex.ellipse(random(moonTex.width), random(moonTex.height), random(6, 55));
  }

  regenStars();
  moonShader = createShader(vert, frag);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  regenStars();
}

function regenStars() {
  stars = [];
  for (let i = 0; i < 1600; i++) {
    stars.push({
      x: random(-width * 2.4, width * 2.4),
      y: random(-height * 2.0, height * 2.0),
      z: random(-3200, -900),
      r: random(0.6, 2.0),
      b: random(140, 255)
    });
  }
}

function draw() {
  background(0);

  const mx = map(constrain(mouseX, 0, width), 0, width, -1, 1);
  const my = map(constrain(mouseY, 0, height), 0, height, -1, 1);

  camera(mx * 140, my * 80, 980, 0, 0, 0, 0, 1, 0);

  // stars
  for (const s of stars) {
    push();
    translate(s.x, s.y, s.z);
    const tw = 0.75 + 0.25 * sin(frameCount * 0.02 + s.x * 0.001 + s.y * 0.001);
    emissiveMaterial(s.b * tw);
    sphere(s.r, 6, 6);
    pop();
  }

  const countMoons = 17;
  const baseSize = min(width, height) * 0.10;
  const spacing = baseSize * 1.75;
  const startX = -((countMoons - 1) * spacing) / 2;

  const scrubPhase = map(constrain(mouseX, 0, width), 0, width, 0, 30);

  const lightDir = normalize3([0.9 + mx * 0.2, 0.15 + my * 0.2, 0.6]);
  const mid = (countMoons - 1) / 2;

  for (let i = 0; i < countMoons; i++) {
    const x = startX + i * spacing;
    const phaseOffset = map(i, 0, countMoons - 1, -15, 15);
    let p = scrubPhase + phaseOffset;
    while (p < 0) p += 30;
    while (p > 30) p -= 30;

    const d = abs(i - mid) / mid;
    const bell = exp(-d * d * 1.6);

    push();
    translate(x, -18 * bell, lerp(-340, -60, bell));
    rotateY(0.22 + sin(frameCount * 0.004 + i) * 0.05);
    rotateX(-0.08);

    drawMoon3D(baseSize * lerp(0.78, 1.55, bell), p, lightDir);
    pop();
  }
}

function drawMoon3D(size, phase0to30, lightDir) {
  shader(moonShader);
  moonShader.setUniform("uTex", moonTex);
  moonShader.setUniform("uPhase", constrain(phase0to30 / 30.0, 0, 1));
  moonShader.setUniform("uEdge", 0.018);
  moonShader.setUniform("uEarth", 0.20);
  moonShader.setUniform("uDiffuse", 0.95);
  moonShader.setUniform("uSpec", 0.55);
  moonShader.setUniform("uShine", 28.0);
  moonShader.setUniform("uLightDir", lightDir);

  sphere(size * 0.5, 72, 72);
  resetShader();
}

function normalize3(v) {
  const m = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]) || 1;
  return [v[0]/m, v[1]/m, v[2]/m];
}