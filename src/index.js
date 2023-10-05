import { ACESFilmicToneMapping, EquirectangularReflectionMapping, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector3, WebGLRenderer } from "three";
import { EXRLoader } from "./dependencies/EXRLoader";
import { OrbitControls } from "./dependencies/OrbitControls";
import RAPIER from "@dimforge/rapier3d";

import vertexShader from "./raytrace.vert";
import fragmentShader from "./raytrace.frag";

const renderer = new WebGLRenderer({
  antialias: false,
})
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new Scene();

const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(-3, 0, -6);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, document.body);
controls.enableDamping = true;

new EXRLoader()
  .loadAsync("/brown_photostudio_02_4k.exr")
  .then(texture => {
    texture.mapping = EquirectangularReflectionMapping;
    scene.background = texture;
    raytrace.material.uniforms.envMap.value = texture;
  })



const count = 13;
const centers = new Array(count).fill(0).map(_ => new Vector3(
  Math.random() * 5 - 2.5,
  Math.random() * 5 - 2.5,
  Math.random() * 5 - 2.5,
));
const radiuses = new Array(count).fill(0).map(_ => Math.random() + 0.5);



const world = new RAPIER.World(new Vector3());
const bodies = centers.map((center, i) => {
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(center.x, center.y, center.z);
  const body = world.createRigidBody(bodyDesc);
  body.mass = 4/3 * Math.PI * radiuses[i] ** 3;

  const colliderDesc = RAPIER.ColliderDesc.ball(radiuses[i]);
  world.createCollider(colliderDesc, body);

  return body;
})



// const meshes = centers.map((center, i) => {
//   const mesh = new Mesh(
//     new SphereGeometry(radiuses[i], 64, 32),
//     new MeshStandardMaterial({
//       roughness: 0,
//       metalness: 1,
//     })
//   )
//   mesh.position.copy(center);
//   scene.add(mesh);
//   return mesh;
// })



const raytrace = new Mesh(
  new PlaneGeometry(1, 1, 1, 1),
  new ShaderMaterial({
    defines: {
      count
    },
    uniforms: {
      projectionMatrixInverse: { value: camera.projectionMatrixInverse },
      cameraMatrixWorld: { value: camera.matrixWorld },
      centers: { value: centers },
      radiuses: { value: radiuses },
      envMap: { value: null },
    },
    vertexShader,
    fragmentShader,
  })
);
scene.add(raytrace);



let sign = -1;
function tick(time) {

  world.step();

  bodies.forEach((body, i) => {
    centers[i].copy(body.translation());
    body.applyImpulse(centers[i].clone().multiplyScalar(sign * .1));
  })

  controls.update();

  renderer.render(scene, camera);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);


window.addEventListener("keydown", () => sign = 1);
window.addEventListener("keyup", () => sign = -1);


window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
})
