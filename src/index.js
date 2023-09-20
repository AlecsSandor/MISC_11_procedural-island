import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise2D } from 'simplex-noise'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { initWaterShader } from './waterShader.js'
import * as CHARACTER from './characterControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#CCCCCC')

const godCamera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 )
godCamera.position.set(0, 0, 50)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize( window.innerWidth, window.innerHeight )
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.useLegacyLights = true
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild( renderer.domElement )

//#FFCB8E
//#fce8bd
const light = new THREE.PointLight( new THREE.Color('#fff6d4').convertSRGBToLinear(),0.6, 0, 2 )
// const light = new THREE.HemisphereLight( new THREE.Color(0xffffff), new THREE.Color(0xffffff))
light.position.set(10, 20, 20)
light.castShadow = true
light.shadow.mapSize.width = 512
light.shadow.mapSize.height = 512
light.shadow.camera.near = 0.5
light.shadow.camera.far = 500
scene.add(light)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.05)
scene.add(ambientLight)


const controls = new OrbitControls(godCamera, renderer.domElement)
controls.target.set(0, 0, 0)
controls.dampingFactor = 0.05
controls.enableDamping = true

const loader = new GLTFLoader()

let envmap

const MAX_HEIGHT = 10;
// const STONE_HEIGHT = MAX_HEIGHT * 0.8
// const DIRT_HEIGHT = MAX_HEIGHT * 0.7
// const GRASS_HEIGHT = MAX_HEIGHT * 0.5
// const SAND_HEIGHT = MAX_HEIGHT * 0.3
// const DIRT2_HEIGHT = MAX_HEIGHT * 0;

const modelsArray = [
    { 
        title: 'sLand_01',
        path: './src/assets/models/sLand_01.gltf',
        texture: 'cliff',
    },
    { 
        title: 'bLand_01',
        path: './src/assets/models/bLand_01.gltf',
        texture: 'cliff',
    },
    { 
        title: 'sandLand_01',
        path: './src/assets/models/sandLand_01.gltf',
        texture: 'cliff',
    },
    { 
        title: 'tree_01',
        path: './src/assets/models/tree_01.gltf',
        texture: 'tree',
    },
];

const angleArray = [Math.PI / 2, Math.PI, Math.PI * 1.5];

(async function () {
  let pmrem = new THREE.PMREMGenerator(renderer)
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync('./src/assets/envmap.hdr')
  envmap = pmrem.fromEquirectangular(envmapTexture).texture

  let textures = {
    // dirt: await new THREE.TextureLoader().loadAsync('assets/dirt.png'),
    // dirt2: await new THREE.TextureLoader().loadAsync('assets/dirt2.jpg'),
    // grass: await new THREE.TextureLoader().loadAsync('assets/grass.jpg'),
    // sand: await new THREE.TextureLoader().loadAsync('assets/sand.jpg'),
    water: await new THREE.TextureLoader().loadAsync('./src/assets/water.jpg'),
    stone: await new THREE.TextureLoader().loadAsync('./src/assets/stone.png'),
    cliff: await new THREE.TextureLoader().loadAsync('./src/assets/models/group1.jpg'),
  }

  const cliffMaterial = new THREE.MeshStandardMaterial({
    envMap: envmap,
    envMapIntensity: 0.13,
    flatShading: false,
    map: textures.cliff,
  })

  const treeMaterial = new THREE.MeshStandardMaterial({
    envMap: envmap,
    envMapIntensity: 0.63,
    flatShading: false,
    map: textures.cliff,
  })

  let importedModels = []

  for (let i = 0; i < modelsArray.length; i++) {
    let importedModel = await loadModel(modelsArray[i].path)
    importedModel.traverse((node) => {
        if (node instanceof THREE.Mesh) {
            if (modelsArray[i].texture === 'cliff') {
                node.material = cliffMaterial
            } else if (modelsArray[i].texture === 'tree') {
                node.material = treeMaterial
            }
          node.castShadow = true
          node.receiveShadow = true
        }
      })
    importedModels.push(importedModel)
  }

  // Create the actor camera and controls
  const characterCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
let characterControls = new CHARACTER.BasicCharacterController({
  camera: characterCamera,
  scene: scene
})
let thirdPersonCamera = new CHARACTER.ThirdPersonCamera({
  camera: characterCamera,
  target: characterControls,
  renderer: renderer,
})
let mixers = []
let previousRAF = null

function step(timeElapsed) {
  const timeElapsedS = timeElapsed * 0.001;
  if (mixers) {
    mixers.map(m => m.update(timeElapsedS));
  }

  if (characterControls) {
    characterControls.Update(timeElapsedS);
  }

  thirdPersonCamera.Update(timeElapsedS);
}

// Create the world objects and all the stuff
scene.fog = new THREE.Fog( 0xcccccc, 0.1, 45 )
generateChunk(renderer, characterCamera, importedModels)

  // let islandsArray = []
  // for (let i = 0; i < 3; i++) {
  //   let randomnPosition = new THREE.Vector2(randomNoInterval(-30, 30), randomNoInterval(-30, 30))
  //   // Generate individual island
  //   // scene.add(createIsland(importedModels, randomnPosition))
  //   islandsArray.push(createIsland(importedModels, randomnPosition))
  // }

  // islandsArray.forEach(island => {
  //   scene.add(island)
  // });

  renderer.setAnimationLoop((t) => {
    // character.position.copy(characterPosition);
    // characterCamera.rotation.copy(character.rotation);
    renderer.render(scene, characterCamera)
    step(t - previousRAF)
    previousRAF = t
  })
})()








function tileToPosition(tileX, tileY) {
    let distorsion = Math.random() * (1.0 - 0.97) + 0.97
    return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * (1.77 * distorsion * distorsion ), tileY * (1.535 * distorsion * distorsion))
}

function generateChunk(renderer, characterCamera, importedModels) {
  let waterGeometry = new THREE.PlaneGeometry(50, 50)
  let supportsDepthTextureExtension = !!renderer.extensions.get(
    "WEBGL_depth_texture")
  initWaterShader(supportsDepthTextureExtension, renderer, characterCamera, scene, waterGeometry)

  scene.add(createIsland(importedModels, new THREE.Vector2(0, 0)))
}
 
function createIsland(importedModels, positionVector) {

    let noise2D = createNoise2D()

    let base = importedModels[2].clone()
    base.scale.set(0.8, 1, 0.8)
    base.position.set(0,0,0)
    base.rotation.set(0, getRandomValueFromArray(angleArray), 0)

    const boundingBase = new THREE.Box3().setFromObject(base); 
    
    for (let i = -5; i <= 5; i++) {
        for (let j = -5; j <= 5; j++) {
          // output of this function is between -1 and 1 and so we use the normalization factor 0.5 to make it
          // a value between 0 - 1 (check out the perlin noise algo)
          let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5
          noise = Math.pow(noise, 1.5)
  
        //   if (noise <= 0.2) {
        //     let position = tileToPosition(i, j)
        //     let tree = importedModels[3].clone()
        //     tree.scale.set(0.17, 0.17, 0.17)
        //     tree.position.set(position.x + (Math.random()*2), 0, position.y + (Math.random()*2))
        //     // console.log(isPositionValid(tree.position, base))
        //     // if (isPositionValid(tree.position, base)) {
        //     //     base.add(tree)
        //     // }
        //     const boundingTree = new THREE.Box3().setFromObject(tree);
        //     if (boundingTree.intersectsBox(boundingBase)) {
        //         base.add(tree)
        //     }
        //   }
          if (noise > 0.7 && noise < 0.9) {
            let position = tileToPosition(i, j)
            base.add(
              createCliff(
                importedModels[0].clone(),
                noise * MAX_HEIGHT,
                position,
                'large'
              )
            )
          } else if (0.5 < noise && noise <= 0.7) {
            let position = tileToPosition(i, j)
            base.add(
              createCliff(
                importedModels[0].clone(),
                noise * MAX_HEIGHT,
                position,
                'medium'
              )
            )
          } else if (0.2 < noise && noise <= 0.5) {
            let position = tileToPosition(i, j)
            base.add(
              createCliff(
                importedModels[0].clone(),
                noise * MAX_HEIGHT,
                position,
                'small'
              )
            )
          } 
          if (noise <= 0.2) {
            let position = tileToPosition(i, j)
            let tree = createTrees(importedModels[3].clone(), position, boundingBase)
            if (tree) base.add(tree)
            // base.add(createTrees(importedModels[3].clone, position, boundingBase))
            
          }
        }
      }
      base.position.set(positionVector.x, 0, positionVector.y)
    return(base)
}

function createTrees(tree, position, boundingBase) {
    tree.scale.set(0.17, 0.17, 0.17)
    tree.position.set(position.x + (Math.random()*2), 0, position.y + (Math.random()*2))
    const boundingTree = new THREE.Box3().setFromObject(tree)
    if (boundingTree.intersectsBox(boundingBase)) { 
        let randomSize = Math.random() * (1.0 - 0.3) + 0.3
        tree.scale.set(0.17 * randomSize, 0.17 * randomSize, 0.17 * randomSize)
        tree.rotation.set(0, getRandomValueFromArray(angleArray), 0)
        return tree
    }
}

function createCliff(mesh, height, position, size) {
    let scaleFactor = 0
    let randomSize = Math.random() * (1.0 - 0.3) + 0.3
    if (size === 'large') {
        scaleFactor = height / 3
        mesh.scale.set(
            0.4 * scaleFactor,
            randomSize * scaleFactor,
            0.4 * scaleFactor
        )
    } else if (size === 'small') {
        scaleFactor = height / 7
        mesh.scale.set(
            0.4 * scaleFactor,
            randomSize * scaleFactor,
            0.4 * scaleFactor
        )
    } else if (size === 'medium') {
        scaleFactor = height / 4
        mesh.scale.set(
            0.4 * scaleFactor,
            0.5 * scaleFactor,
            0.4 * scaleFactor
        )
    }
   
    mesh.position.set(position.x + (Math.random()*2), 0, position.y + (Math.random()*2))
    mesh.rotation.set(0, getRandomValueFromArray(angleArray), 0)

    return mesh
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

function getRandomValueFromArray(arr) {
    if (arr.length === 0) {
      // Handle the case where the array is empty
      return undefined; // Or any other appropriate value
    }
    
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  }

function randomNoInterval(max, min) {
    return Math.random() * (max - min) + min
}
