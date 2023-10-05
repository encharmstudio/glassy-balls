varying vec4 vNDC;

#define pi 3.141592653589793
#define opticalDensity 1.5
#define R0 (opticalDensity - 1.) / (opticalDensity + 1.) * (opticalDensity - 1.) / (opticalDensity + 1.)


uniform mat4 projectionMatrixInverse;
uniform mat4 cameraMatrixWorld;
uniform vec3 centers[count];
uniform float radiuses[count];
uniform sampler2D envMap;

float sphIntersect(vec3 ro, vec3 rd, vec3 ce, float ra) {
  vec3 oc = ro - ce;
  float b = dot(oc, rd);
  vec3 qc = oc - b * rd;
  float h = ra * ra - dot(qc, qc);
  if (h < 0.) return 1e10; // no intersection
  h = sqrt( h );
  return -b - h;
}

vec3 getEnv(vec3 dir) {
  vec2 uv = vec2(
    atan(dir.z, dir.x) / pi * 0.5 + 0.5,
    asin(dir.y) / pi + 0.5
  );
  return texture2D(envMap, uv).rgb;
}

struct Ray {
  vec3 ori;
  vec3 dir;
  float power;
};

Ray noRay = Ray(vec3(0.), vec3(0.), 0.);

struct TraceResult {
  Ray one;
  Ray two;
  bool ok;
};

TraceResult raytrace(Ray ray) {
  if (ray.power == 0.) {
    return TraceResult(noRay, noRay, false);
  }

  float minD = 1e10;
  vec3 center;
  float radius;
  for (int i = 0; i < count; i++) {
    float d = sphIntersect(ray.ori, ray.dir, centers[i], radiuses[i]);
    if (d < minD && d > 1e-5) {
      minD = d;
      center = centers[i];
      radius = radiuses[i];
    }
  }
  if (minD > 1e9) {
    return TraceResult(ray, noRay, false);
  }

  vec3 hit = ray.ori + ray.dir * minD;
  vec3 n = normalize(hit - center);

  vec3 reflection = reflect(ray.dir, n);
  vec3 refraction = refract(ray.dir, n, 1. / opticalDensity);

  float reflectionPower = R0 + (1. - R0) * pow(1. - abs(dot(ray.dir, n)), 5.);

  vec3 newO = hit + refraction * 10.;
  float d = sphIntersect(newO, -refraction, center, radius);
  vec3 outHit = newO - refraction * d;
  vec3 outN = normalize(center - outHit);
  vec3 outRefraction = refract(refraction, outN, opticalDensity / 1.);
  if (dot(outRefraction, outRefraction) == 0.) {
    reflectionPower = 1.;
  }

  float refractionPower = 1. - reflectionPower;

  ray.power *= 0.96;
  float decay = exp(-0.75 * distance(hit, outHit));

  Ray one = Ray(hit, reflection, reflectionPower * ray.power);
  Ray two = Ray(outHit, outRefraction, refractionPower * ray.power * decay);

  return TraceResult(one, two, true);
}

void main() {
  vec3 ro = cameraPosition;
  vec4 target = cameraMatrixWorld * projectionMatrixInverse * vNDC;
  vec3 rd = normalize(target.xyz / target.w - ro);

  TraceResult res = raytrace(Ray(ro, rd, 1.));
  if (!res.ok) discard;

  TraceResult res1 = raytrace(res.one);
  TraceResult res2 = raytrace(res.two);

  TraceResult res11 = raytrace(res1.one);
  TraceResult res12 = raytrace(res1.two);
  TraceResult res21 = raytrace(res2.one);
  TraceResult res22 = raytrace(res2.two);

  vec3 color = 
    getEnv(res11.one.dir) * res11.one.power + 
    getEnv(res11.two.dir) * res11.two.power +
    getEnv(res12.one.dir) * res12.one.power + 
    getEnv(res12.two.dir) * res12.two.power +
    getEnv(res21.one.dir) * res21.one.power + 
    getEnv(res21.two.dir) * res21.two.power +
    getEnv(res22.one.dir) * res22.one.power + 
    getEnv(res22.two.dir) * res22.two.power;

  gl_FragColor = vec4(color, 1.);

	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
