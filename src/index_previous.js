import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise2D } from 'simplex-noise'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#FFEECC')

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 0, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize( window.innerWidth, window.innerHeight )
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.useLegacyLights = true
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild( renderer.domElement )

const light = new THREE.PointLight(
  new THREE.Color('#FFFFFF').convertSRGBToLinear(),
  8,
  50,
  2
)
light.position.set(10, 20, 20)

light.castShadow = true
light.shadow.mapSize.width = 512
light.shadow.mapSize.height = 512
light.shadow.camera.near = 0.5
light.shadow.camera.far = 500
scene.add(light)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0, 0)
controls.dampingFactor = 0.05
controls.enableDamping = true

const loader = new GLTFLoader()

let envmap

const MAX_HEIGHT = 10
// const STONE_HEIGHT = MAX_HEIGHT * 0.8
// const DIRT_HEIGHT = MAX_HEIGHT * 0.7
// const GRASS_HEIGHT = MAX_HEIGHT * 0.5
// const SAND_HEIGHT = MAX_HEIGHT * 0.3
// const DIRT2_HEIGHT = MAX_HEIGHT * 0;

;(async function () {
  let pmrem = new THREE.PMREMGenerator(renderer)
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync('assets/envmap.hdr')
  envmap = pmrem.fromEquirectangular(envmapTexture).texture

  let textures = {
    dirt: await new THREE.TextureLoader().loadAsync('assets/dirt.png'),
    dirt2: await new THREE.TextureLoader().loadAsync('assets/dirt2.jpg'),
    grass: await new THREE.TextureLoader().loadAsync('assets/grass.jpg'),
    sand: await new THREE.TextureLoader().loadAsync('assets/sand.jpg'),
    water: await new THREE.TextureLoader().loadAsync('assets/water.jpg'),
    stone: await new THREE.TextureLoader().loadAsync('assets/stone.png'),
    cliff: await new THREE.TextureLoader().loadAsync('assets/models/group1.jpg')
  }

    const modelPath = 'assets/models/sLand_01.gltf';
    const originalModel = await loadModel(modelPath);
    let matt = new THREE.MeshStandardMaterial({
        envMap: envmap,
        envMapIntensity: 0.135,
        flatShading: true,
        map: textures.cliff,
        
      })
      originalModel.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.material = matt;
        }
      })
        
    // scene.add(originalModel.clone())

  createWaterPlane()

  let noise2D = createNoise2D()

  for (let i = -20; i <= 20; i++) {
    for (let j = -20; j <= 20; j++) {
      let position = tileToPosition(i, j)

      // this makes the chunck round
      // if (position.length() > 5) continue

      // output of this function is between -1 and 1 and so we use the normalization factor 0.5 to make it
      // a value between 0 - 1 (check out the perlin noise algo)
      let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5
      noise = Math.pow(noise, 1.5)
      if (noise > 0.2) {
        scene.add(
            createCliff(originalModel.clone(), noise * MAX_HEIGHT, position)
        //   createMesh(getCliff(noise * MAX_HEIGHT, position), textures.stone)
        )
      }
      // makeHex(noise * MAX_HEIGHT, position)
    }
  }

  // let hexagonMesh = new THREE.Mesh(
  //     hexagonGeometries,
  //     new THREE.MeshStandardMaterial({
  //         envMap: envmap,
  //         flatShading: true,
  //     })
  // )
  // scene.add(hexagonMesh)

  // let stoneMesh = hexMesh(stoneGeo, textures.stone)
  // let grassMesh = hexMesh(grassGeo, textures.grass)
  // let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2)
  // let dirtMesh = hexMesh(dirtGeo, textures.dirt)
  // let sandMesh = hexMesh(sandGeo, textures.sand)
  // scene.add(stoneMesh, grassMesh, dirt2Mesh, dirtMesh, sandMesh)

  // let seaMesh = new THREE.Mesh(
  //     new THREE.BoxGeometry(20, 3, 20),
  //     new THREE.MeshPhysicalMaterial({
  //         envMap: envmap,
  //         color: new THREE.Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
  //         ior: 1.4,
  //         transmission: 1,
  //         transparent: true,
  //         thickness: 1.5,
  //         envMapIntensity: 0.2,
  //         roughness: 1,
  //         metalness: 0.025,
  //         roughnessMap: textures.water,
  //         metalnessMap: textures.water,
  //     })
  // )
  // seaMesh.receiveShadow = true;
  // seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0)
  // scene.add(seaMesh)

  // clouds()

  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })
})()

function createCliff(model, height, position) {
    let scaleFactor = height / 3
  // if ( height < 6 ) scaleFactor = height/6
  model.scale.set(
    0.4 * scaleFactor,
    0.4 * scaleFactor,
    0.4 * scaleFactor
  )
//   model.translateX(position.x)
//   model.translateY(position.y)
//   model.translateZ(0)
  model.position.set(position.x, 0, position.y)
//   model.translate(position.x, 0 /*height * 0.5*/, position.y)

model.castShadow = true
model.receiveShadow = true

  return model
}

function createMesh(geo, map) {
  let mat = new THREE.MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map,
  })

  let mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

function getCliff(height, position) {
  let scaleFactor = height / 3
  // if ( height < 6 ) scaleFactor = height/6
  let geo = new THREE.BoxGeometry(
    1 * scaleFactor,
    2 * scaleFactor,
    1 * scaleFactor
  )
  geo.translate(position.x, 0 /*height * 0.5*/, position.y)

  return geo
}

function getBase(height, position) {
  let scaleFactor = height / 1
  let geo = new THREE.BoxGeometry(
    5 * scaleFactor,
    1 * scaleFactor,
    5 * scaleFactor
  )
  //geo.translate(position.x, 0 /*height * 0.5*/, position.y)
  return geo
}

function tileToPosition(tileX, tileY) {
  let distorsion = Math.random() * (0.8 - 0.4) + 0.4
  return new THREE.Vector2(
    (tileX + (tileY % 2) * 0.5) * (1.77 + distorsion),
    tileY * (1.535 + distorsion)
  )
}

function createWaterPlane() {
  const geometry = new THREE.PlaneGeometry(100, 100)
  const material = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    envMap: envmap,
    color: new THREE.Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
    ior: 1.4,
    transmission: 1,
    transparent: true,
    thickness: 1.5,
    envMapIntensity: 0.2,
    roughness: 1,
    metalness: 0.025,
})
  const plane = new THREE.Mesh(geometry, material)
  plane.rotation.x = Math.PI / 2
  plane.position.z = 0
  plane.receiveShadow = true;
  scene.add(plane)
}

// let hexagonGeometries = new THREE.BoxGeometry(0, 0, 0)
let stoneGeo = new THREE.BoxGeometry(0, 0, 0)
let dirtGeo = new THREE.BoxGeometry(0, 0, 0)
let grassGeo = new THREE.BoxGeometry(0, 0, 0)
let dirt2Geo = new THREE.BoxGeometry(0, 0, 0)
let sandGeo = new THREE.BoxGeometry(0, 0, 0)

function hexGeometry(height, position) {
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false)
  geo.translate(position.x, height * 0.5, position.y)

  return geo
}

function makeHex(height, position) {
  let geo = hexGeometry(height, position)
  // hexagonGeometries = BufferGeometryUtils.mergeGeometries([hexagonGeometries, geo])

  if (height > STONE_HEIGHT) {
    stoneGeo = BufferGeometryUtils.mergeGeometries([geo, stoneGeo])

    if (Math.random() > 0.8) {
      stoneGeo = BufferGeometryUtils.mergeGeometries([
        stoneGeo,
        stone(height, position),
      ])
    }
  } else if (height > DIRT_HEIGHT) {
    dirtGeo = BufferGeometryUtils.mergeGeometries([geo, dirtGeo])

    if (Math.random() > 0.8) {
      grassGeo = BufferGeometryUtils.mergeGeometries([
        grassGeo,
        tree(height, position),
      ])
    }
  } else if (height > GRASS_HEIGHT) {
    grassGeo = BufferGeometryUtils.mergeGeometries([geo, grassGeo])
  } else if (height > SAND_HEIGHT) {
    sandGeo = BufferGeometryUtils.mergeGeometries([geo, sandGeo])

    if (Math.random() > 0.8) {
      stoneGeo = BufferGeometryUtils.mergeGeometries([
        stoneGeo,
        stone(height, position),
      ])
    }
  } else if (height > DIRT2_HEIGHT) {
    dirt2Geo = BufferGeometryUtils.mergeGeometries([geo, dirt2Geo])
  }
}

function hexMesh(geo, map) {
  let mat = new THREE.MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map,
  })

  let mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

function stone(height, position) {
  const px = Math.random() * 0.4
  const pz = Math.random() * 0.4

  const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7)
  geo.translate(position.x + px, height, position.y + pz)

  return geo
}

function tree(height, position) {
  const treeHeight = Math.random() * 1 + 1.25

  const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3)
  geo.translate(position.x, height + treeHeight * 0 + 1, position.y)

  const geo2 = new THREE.CylinderGeometry(0, 1.15, treeHeight, 3)
  geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y)

  const geo3 = new THREE.CylinderGeometry(0, 0.8, treeHeight, 3)
  geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y)

  return BufferGeometryUtils.mergeGeometries([geo, geo2, geo3])
}

function clouds() {
  let geo = new THREE.SphereGeometry(0, 0, 0)
  let count = Math.floor(Math.pow(Math.random(), 0.45 * 4))

  for (let i = 0; i < count; i++) {
    const puff1 = new THREE.SphereGeometry(1.2, 7, 7)
    const puff2 = new THREE.SphereGeometry(1.5, 7, 7)
    const puff3 = new THREE.SphereGeometry(0.9, 7, 7)

    puff1.translate(-1.85, Math.random() * 0.3, 0)
    puff2.translate(0, Math.random() * 0.3, 0)
    puff3.translate(1.85, Math.random() * 0.3, 0)

    const cloudGeo = BufferGeometryUtils.mergeGeometries([puff1, puff2, puff3])
    cloudGeo.translate(
      Math.random() * 20 - 10,
      Math.random() * 7 + 7,
      Math.random() * 20 - 10
    )
    cloudGeo.rotateY(Math.random() * Math.PI * 2)

    geo = BufferGeometryUtils.mergeGeometries([geo, cloudGeo])
  }

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      envMap: envmap,
      envMapIntensity: 0.75,
      flatShading: true,
    })
  )

  scene.add(mesh)
}

function loadModell() {
    const loader = new GLTFLoader();

    let jer

    // Load the model
    loader.load('assets/models/sLand_01.gltf', (gltf) => {
      // Called when the model is loaded
      const model = gltf.scene; // The loaded 3D model
      model.position.set()
    //   model.scale.set(2, 2, 2)
      model.position.set(0, 0, 0)
      let matt = new THREE.MeshPhysicalMaterial({
        envMap: envmap,
        envMapIntensity: 0.135,
        flatShading: true,
        
      })
    
      model.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.material = matt;
        }
      });
      jer = model.geometry.clone()
    //   scene.add(model); 
    });

    return(jer)
}

async function loadModel(modelPath) {
    const loader = new GLTFLoader();
  
    return new Promise((resolve, reject) => {
      loader.load(modelPath, (gltf) => {
        const loadedModel = gltf.scene;
        // loadedModel.scale.set(0.02, 0.02, 0.02)
        resolve(loadedModel);
      }, undefined, (error) => {
        reject(error);
      });
    });
  }