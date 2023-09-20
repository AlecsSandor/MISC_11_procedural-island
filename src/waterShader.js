import * as THREE from 'three'

export function initWaterShader(supportsDepthTextureExtension, renderer, camera, scene, plane) {
    var pixelRatio = renderer.getPixelRatio();
  
    let renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    );
  
    let depthMaterial = new THREE.MeshDepthMaterial();
    depthMaterial.depthPacking = THREE.RGBADepthPacking;
    depthMaterial.blending = THREE.NoBlending;
  
    // textures
  
    var loader = new THREE.TextureLoader();
  
    var noiseMap = loader.load("https://i.imgur.com/gPz7iPX.jpg");
    var dudvMap = loader.load("https://i.imgur.com/hOIsXiZ.png");
  
    noiseMap.wrapS = noiseMap.wrapT = THREE.RepeatWrapping;
    noiseMap.minFilter = THREE.NearestFilter;
    noiseMap.magFilter = THREE.NearestFilter;
    dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;
  
    // water
  
    var waterUniforms = {
      time: {
        value: 0
      },
      threshold: {
        value: 0
      },
      tDudv: {
        value: null
      },
      tDepth: {
        value: null
      },
      cameraNear: {
        value: 0
      },
      cameraFar: {
        value: 0
      },
      resolution: {
        value: new THREE.Vector2()
      },
      foamColor: {
        value: new THREE.Color(0xffffff)
      },
      waterColor: {
        value: new THREE.Color(0xa9c7cc)
      }
    };  
  
    //var waterGeometry = new THREE.PlaneGeometry(100, 100);
    var waterMaterial = new THREE.ShaderMaterial({
      defines: {
        DEPTH_PACKING: supportsDepthTextureExtension === true ? 0 : 1,
        ORTHOGRAPHIC_CAMERA: 0
      },
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib["fog"],
        waterUniforms
      ]),
      vertexShader: document.getElementById("vertexShaderWater").textContent,
      fragmentShader: document.getElementById("fragmentShaderWater").textContent,
      fog: true
    });
  
    waterMaterial.uniforms.cameraNear.value = camera.near;
    waterMaterial.uniforms.cameraFar.value = camera.far;
    waterMaterial.uniforms.resolution.value.set(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    );
    waterMaterial.uniforms.tDudv.value = dudvMap;
    waterMaterial.uniforms.tDepth.value =
      supportsDepthTextureExtension === true
        ? renderTarget.depthTexture
        : renderTarget.texture;
  
    let water = new THREE.Mesh(plane, waterMaterial);
    water.rotation.x = -Math.PI * 0.5;
    scene.add(water);

    let clock = new THREE.Clock()

    animate()

    function animate() {
        requestAnimationFrame(animate);
      
        // depth pass
      
        water.visible = false; // we don't want the depth of the water
        scene.overrideMaterial = depthMaterial;
      
        renderer.setRenderTarget(renderTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      
        scene.overrideMaterial = null;
        water.visible = true;
      
        // beauty pass
      
        var time = clock.getElapsedTime();
      
        water.material.uniforms.time.value = time;
      
        renderer.render(scene, camera);
      }
  }