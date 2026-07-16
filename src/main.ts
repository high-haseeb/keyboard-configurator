import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

// Parameters
const baseUrl = 'keyboard-configurator/';
const modelPath = `${baseUrl}models/keyboard.glb`;
const hdriPath = `${baseUrl}hdri/studio_1k.hdr`;
let upperBody: THREE.Mesh|undefined;
let lowerBody: THREE.Mesh|undefined;
let keysInner: THREE.Mesh|undefined;
let keysOuter: THREE.Mesh|undefined;
let totalPrice = 0.0;

type CaseMaterialProps = {
    color: string;
    roughness: number;
    metalness: number;
};

type KeyMaterialProps = {
    keyColor: string;
    textColor: string;
    roughness: number;
    metalness: number;
};

type EditionConfig = {
    price: number;
    upperBody: CaseMaterialProps;
    lowerBody: CaseMaterialProps;
    keysInner: KeyMaterialProps;
    keysOuter: KeyMaterialProps;
};

const editions: Record<string, EditionConfig> = {
    "Black Sesame": {
        price: 99,
        upperBody: { color: "#1C1E1D", roughness: 0.85, metalness: 0.1 },
        lowerBody: { color: "#393A36", roughness: 0.8, metalness: 0.15 },
        // Dark gray keys with subtle light gray legends
        keysInner: { keyColor: "#2A2A2A", textColor: "#888888", roughness: 0.8, metalness: 0.0 },
        keysOuter: { keyColor: "#111111", textColor: "#666666", roughness: 0.8, metalness: 0.0 },
    },
    "Forest Mocha": {
        price: 99,
        upperBody: { color: "#5E4B41", roughness: 0.7, metalness: 0.1 },
        lowerBody: { color: "#353C35", roughness: 0.8, metalness: 0.05 },
        // Cream keys with brown legends
        keysInner: { keyColor: "#E5D9C5", textColor: "#4A3B32", roughness: 0.8, metalness: 0.0 },
        keysOuter: { keyColor: "#4A3B32", textColor: "#E5D9C5", roughness: 0.8, metalness: 0.0 },
    },
    "Golden Beige": {
        price: 99,
        upperBody: { color: "#B0946E", roughness: 0.35, metalness: 0.6 },
        lowerBody: { color: "#A6A296", roughness: 0.75, metalness: 0.1 },
        // Warm white alphas with beige legends, beige modifiers with white legends
        keysInner: { keyColor: "#F4F0E6", textColor: "#A6A296", roughness: 0.8, metalness: 0.0 },
        keysOuter: { keyColor: "#C2B8A3", textColor: "#F4F0E6", roughness: 0.8, metalness: 0.0 },
    },
    "Studio Light": {
        price: 99,
        upperBody: { color: "#D1D1CD", roughness: 0.4, metalness: 0.3 },
        lowerBody: { color: "#8B8D8A", roughness: 0.6, metalness: 0.2 },
        // Pure white alphas with dark gray legends, light gray modifiers
        keysInner: { keyColor: "#FFFFFF", textColor: "#555555", roughness: 0.8, metalness: 0.0 },
        keysOuter: { keyColor: "#E0E0E0", textColor: "#333333", roughness: 0.8, metalness: 0.0 },
    },
    "Steel Mushroom": {
        price: 99,
        upperBody: { color: "#756C61", roughness: 0.8, metalness: 0.05 },
        lowerBody: { color: "#454644", roughness: 0.4, metalness: 0.75 },
        // Mushroom alphas with dark text, dark taupe modifiers with light text
        keysInner: { keyColor: "#9A9388", textColor: "#3A3836", roughness: 0.8, metalness: 0.0 },
        keysOuter: { keyColor: "#595651", textColor: "#D5D1C8", roughness: 0.8, metalness: 0.0 },
    },
};
const currentEdition = editions["Black Sesame"];

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color("#EDE6D9");
const canvas = document.getElementById("web3d") as HTMLCanvasElement;
const width = canvas.clientWidth;
const height = canvas.clientHeight;
const camera = new THREE.PerspectiveCamera(30, width/height, 0.01, 10.0);
camera.position.set(-0.2, 0.5, 0.2);
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.type = THREE.PCFShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxDistance = 1.0;
controls.minDistance = 0.2;
controls.minPolarAngle = -Math.PI/2.0;
controls.maxPolarAngle = Math.PI/2.0;

// PostProcessing
// const size = renderer.getDrawingBufferSize(new THREE.Vector2());
// const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 4 });
// renderTarget.depthTexture = new THREE.DepthTexture(width, height, THREE.UnsignedIntType);
// renderTarget.depthTexture.format = THREE.DepthFormat;
// const composer = new EffectComposer(renderer, renderTarget);
//
// const renderPass = new RenderPass(scene, camera);
// composer.addPass(renderPass);
//
// const outputPass = new OutputPass();
// composer.addPass(outputPass);

// Environment
const hdriLoader = new HDRLoader();
hdriLoader.load(hdriPath, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.environmentIntensity = 0.6;
});

function CreateDirLight(color: string, intensity: number,
                        position: THREE.Vector3, castShadow = false,
                        debug = false)
{
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.copy(position);
    if (castShadow)
    {
        light.castShadow = true;
        const d = 0.3;
        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;
        light.shadow.camera.near = 0.01;
        light.shadow.camera.far = 1.5;
        light.shadow.mapSize.width = 2048*2;
        light.shadow.mapSize.height = 2048*2;
        light.shadow.bias = -0.001;

    }
    scene.add(light);

    if (debug)
    {
        const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
        scene.add(shadowHelper);
        const helper = new THREE.DirectionalLightHelper(light, 0.1);
        scene.add(helper);
    }
}

// Three point product showcase lighting system
CreateDirLight("white", 2.0, new THREE.Vector3(0.5, 0.6, -0.5), true);
CreateDirLight("white", 1.0, new THREE.Vector3(0.4, 0.2, 0.1), true);
// CreateDirLight("white", 2.0, new THREE.Vector3(-0.2, 0.1, 0.0), false);

// Scene
const loader = new GLTFLoader();

function createKeycapMaterial(config: KeyMaterialProps, legendMap: THREE.Texture|any):
    THREE.MeshStandardMaterial
{
    const material = new THREE.MeshStandardMaterial({
        roughness: config.roughness,
        metalness: config.metalness,
    });

    // CRITICAL: Force Three.js to compile UV coordinates into the shader
    // even though we aren't using the native .map property.
    material.defines = { USE_UV: '' };
    material.onBeforeCompile = (shader) => {
        material.userData.shader = shader;
        shader.uniforms.uKeyColor = { value: new THREE.Color(config.keyColor) };
        shader.uniforms.uTextColor = { value: new THREE.Color(config.textColor) };
        shader.uniforms.uLegendMap = { value: legendMap };
        shader.fragmentShader = `
            uniform vec3 uKeyColor;
            uniform vec3 uTextColor;
            uniform sampler2D uLegendMap;
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            // Sample the red channel of the black and white mask
            float mask = texture2D(uLegendMap, vUv).r;
            // Mix the base key color and the text color based on the mask
            diffuseColor.rgb = mix(uKeyColor, uTextColor, mask);
            `
        );
    };

    return material;
}

loader.load(modelPath, (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    scene.traverse((child) => {
        if (child instanceof THREE.Mesh)
        {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    const ground = model.getObjectByName("Ground") as THREE.Mesh;
    if (ground)
    {
        const groundMaterial = new THREE.ShadowMaterial();
        groundMaterial.opacity = 0.2;
        ground.material = groundMaterial;
    }

    upperBody = model.getObjectByName("CaseUpper") as THREE.Mesh;
    if (upperBody)
    {
        upperBody.material = new THREE.MeshStandardMaterial({
            color: currentEdition.upperBody.color,
            roughness: currentEdition.upperBody.roughness,
            metalness: currentEdition.upperBody.metalness,
        });
    }

    lowerBody = model.getObjectByName("CaseLower") as THREE.Mesh;
    if (lowerBody)
    {
        lowerBody.material = new THREE.MeshStandardMaterial({
            color: currentEdition.lowerBody.color,
            roughness: currentEdition.lowerBody.roughness,
            metalness: currentEdition.lowerBody.metalness,
        });
    }

    keysInner = model.getObjectByName("KeysInner") as THREE.Mesh;
    const legendTexture = (keysInner.material as THREE.MeshStandardMaterial).map;
    if (keysInner) {
        keysInner.material = createKeycapMaterial(currentEdition.keysInner, legendTexture);
    }

    keysOuter = model.getObjectByName("KeysOuter") as THREE.Mesh;
    if (keysOuter) {
        keysOuter.material = createKeycapMaterial(currentEdition.keysOuter, legendTexture);
    }
});


// UI
const updatePrice = () => {
    const priceEl = document.getElementById("totalPrice") as HTMLDivElement;
    if (priceEl == undefined) return;
    priceEl.innerText =
        totalPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
updatePrice();

function SetupUI<T extends { price?: number }>(containerId: string,
                                               options: Record<string, T>,
                                               callback: (value: T) => void): void
{
    const container = document.getElementById(containerId) as HTMLDivElement;
    if (!container) return;
    container.innerHTML = '';

    for (const [name, value] of Object.entries(options)) {
        const buttonEl = document.createElement("button");
        buttonEl.classList.add("brButton");

        const nameEl = document.createElement("span");
        nameEl.innerText = name;

        const priceEl = document.createElement("span");
        priceEl.innerText = (value.price !== undefined)
            ? value.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
            : "Sold Out";

        buttonEl.onclick = () => {
            const optionButtons = container.querySelectorAll('button[data-active="true"]');

            optionButtons.forEach((button) => {
                const btn = button as HTMLButtonElement;
                btn.dataset.active = "false";

                if (btn.dataset.price !== undefined) {
                    totalPrice -= Number(btn.dataset.price);
                }
            });

            callback(value);

            buttonEl.dataset.active = "true";

            if (value.price !== undefined) {
                totalPrice += value.price;
            }
            updatePrice();
        };

        buttonEl.dataset.active = "false";
        if (name == "Black Sesame")
            buttonEl.dataset.active = "true";
        buttonEl.dataset.price = (value.price || 0).toString();

        buttonEl.appendChild(nameEl);
        buttonEl.appendChild(priceEl);
        container.appendChild(buttonEl);
    }
}

SetupUI<EditionConfig>("editions-container", editions, (ed) => {
    if (upperBody)
    {
        const upMat = upperBody.material as THREE.MeshStandardMaterial;
        upMat.color.set(ed.upperBody.color);
        upMat.roughness = ed.upperBody.roughness;
        upMat.metalness = ed.upperBody.metalness;
        upMat.needsUpdate = true;
    }

    if (lowerBody)
    {
        const lowMat = lowerBody.material as THREE.MeshStandardMaterial;
        lowMat.color.set(ed.lowerBody.color);
        lowMat.roughness = ed.lowerBody.roughness;
        lowMat.metalness = ed.lowerBody.metalness;
        lowMat.needsUpdate = true;
    }

    if (keysInner)
    {
        const innerMat = keysInner.material as THREE.MeshStandardMaterial;
        innerMat.roughness = ed.keysInner.roughness;
        innerMat.metalness = ed.keysInner.metalness;
        if (innerMat.userData.shader) {
            innerMat.userData.shader.uniforms.uKeyColor.value.set(ed.keysInner.keyColor);
            innerMat.userData.shader.uniforms.uTextColor.value.set(ed.keysInner.textColor);
        }
    }

    if (keysOuter)
    {
        const outerMat = keysOuter.material as THREE.MeshStandardMaterial;
        outerMat.roughness = ed.keysOuter.roughness;
        outerMat.metalness = ed.keysOuter.metalness;
        if (outerMat.userData.shader) {
            outerMat.userData.shader.uniforms.uKeyColor.value.set(ed.keysOuter.keyColor);
            outerMat.userData.shader.uniforms.uTextColor.value.set(ed.keysOuter.textColor);
        }
    }
});

// Event Handlers
function animate()
{
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
});
