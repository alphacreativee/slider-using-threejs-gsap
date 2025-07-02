import { slides } from "../../libs/slides.js";
import { vertexShader, fragmentShader } from "../../libs/shaders.js";
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
gsap.registerPlugin(SplitText);

gsap.config({
  nullTargetWarn: false,
});

let currentSlideIndex = 0;
let isTransitioning = false;
let slideTextures = [];
let shaderMaterial;
let renderer;

const createCharacterElements = (element) => {
  if (element.querySelectorAll(".char").length > 0) return;

  const words = element.textContent.split(" ");
  element.innerHTML = "";
  words.forEach((word, index) => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "word";
    [...word].forEach((char) => {
      const charDiv = document.createElement("div");
      charDiv.className = "char";
      charDiv.innerHTML = `<span>${char}</span>`;
      wordDiv.appendChild(charDiv);
    });
    element.appendChild(wordDiv);

    if (index < words.length - 1) {
      const spaceChar = document.createElement("div");
      spaceChar.className = "word";
      spaceChar.innerHTML = `<div class="char">
        <span> </span></div>`;

      element.appendChild(spaceChar);
    }
  });
};
const createLineElements = (element) => {
  new SplitText(element, {
    type: "lines",
    linesClass: "line",
  });
  element.querySelectorAll(".line").forEach((line) => {
    line.innerHTML = `<span>${line.textContent}</span>`;
  });
};
const processTextElements = (container) => {
  const title = container.querySelector(".slide-title h1");
  if (title) createCharacterElements(title);

  container
    .querySelectorAll(".slide-description p")
    .forEach(createLineElements);
};
const createSlideElements = (slideData) => {
  const content = document.createElement("div");
  content.className = "slider-content";
  content.style.opacity = "0";
  content.innerHTML = `
    <div class="slide-title">
      <h1>${slideData.title}</h1>
    </div>
    <div class="slide-description">
      <p>${slideData.description}</p>
      <div class="slide-info">
        <p>Type. ${slideData.type}</p>
        <p>Field. ${slideData.field}</p>
        <p>Date. ${slideData.date}</p>
      </div>
    </div>
  `;
  // processTextElements(content);
  return content;
};

const animateSlideTransition = (nextIndex) => {
  const currentContent = document.querySelector(".slider-content");
  const slider = document.querySelector(".slider");
  const tl = gsap.timeline();

  tl.to([...currentContent.querySelectorAll(".char span")], {
    y: "-100%",
    duration: 0.6,
    stagger: 0.025,
    ease: "power2.inOut",
  })
    .to(
      [...currentContent.querySelectorAll(".line span")],
      {
        y: "-100%",
        duration: 0.6,
        stagger: 0.025,
        ease: "power2.inOut",
      },
      0.1
    )
    .call(
      () => {
        const newContent = createSlideElements(slides[nextIndex]);
        tl.kill();
        currentContent.remove();
        slider.appendChild(newContent);
        gsap.set(newContent.querySelectorAll("span"), {
          y: "100%",
        });
        setTimeout(() => {
          processTextElements(newContent);
          const newChars = newContent.querySelectorAll(".char span");
          const newLines = newContent.querySelectorAll(".line span");
          gsap.set([newChars, newLines], {
            y: "100%",
          });
          gsap.set(newContent, {
            opacity: 1,
          });

          gsap
            .timeline({
              onComplete: () => {
                isTransitioning = false;
                currentSlideIndex = nextIndex;
              },
            })
            .to(newChars, {
              y: "0%",
              duration: 0.6,
              stagger: 0.025,
              ease: "power2.inOut",
            })
            .to(
              newLines,
              {
                y: "0%",
                duration: 0.6,
                stagger: 0.025,
                ease: "power2.inOut",
              },
              0.3
            );
        }, 100);
      },
      null,
      0.5
    );
};

const setupInitialSlide = () => {
  const content = document.querySelector(".slider-content");
  processTextElements(content);

  const chars = content.querySelectorAll(".char span");
  const lines = content.querySelectorAll(".line span");
  gsap.fromTo(
    chars,
    {
      y: "100%",
    },
    {
      y: "0%",
      duration: 0.8,
      stagger: 0.025,
      ease: "pơwer2.out",
    }
  );
  gsap.fromTo(
    lines,
    {
      y: "100%",
    },
    {
      y: "0%",
      duration: 0.8,
      stagger: 0.025,
      ease: "pơwer2.out",
      delay: 0.2,
    }
  );
};

const intializeRenderer = async () => {
  const scene = new THREE.Scene();
  const camere = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("canvas"),
    antialias: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);

  shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture1: { value: null },
      uTexture2: { value: null },
      uProgress: { value: 0.0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      uTexture1Size: { value: new THREE.Vector2(1, 1) },
      uTexture2Size: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader,
    fragmentShader,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMaterial));
  const loader = new THREE.TextureLoader();
  for (const slide of slides) {
    const texture = await new Promise((resolve) =>
      loader.load(slide.image, resolve)
    );
    console.log(slides);

    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.userData = {
      size: new THREE.Vector2(texture.image.width, texture.image.height),
    };
    slideTextures.push(texture);
  }
  shaderMaterial.uniforms.uTexture1.value = slideTextures[0];
  shaderMaterial.uniforms.uTexture2.value = slideTextures[1];
  shaderMaterial.uniforms.uTexture1Size.value = slideTextures[0].userData.size;
  shaderMaterial.uniforms.uTexture2Size.value = slideTextures[1].userData.size;

  const render = () => {
    requestAnimationFrame(render);
    renderer.render(scene, camere);
  };
  render();
};
const handleSlideChange = () => {
  if (isTransitioning) return;
  isTransitioning = true;
  const nextIndex = (currentSlideIndex + 1) % slides.length;
  shaderMaterial.uniforms.uTexture1.value = slideTextures[currentSlideIndex];
  shaderMaterial.uniforms.uTexture2.value = slideTextures[nextIndex];
  shaderMaterial.uniforms.uTexture1Size.value =
    slideTextures[currentSlideIndex].userData.size;
  shaderMaterial.uniforms.uTexture2Size.value =
    slideTextures[nextIndex].userData.size;
  animateSlideTransition(nextIndex);
  gsap.fromTo(
    shaderMaterial.uniforms.uProgress,
    {
      value: 0,
    },
    {
      value: 1,
      duration: 2.5,
      ease: "power2.inOut",
      onComplete: () => {
        shaderMaterial.uniforms.uProgress.value = 0;
        shaderMaterial.uniforms.uTexture1.value = slideTextures[nextIndex];

        shaderMaterial.uniforms.uTexture1Size.value =
          slideTextures[nextIndex].userData.size;
      },
    }
  );
};
const handleResize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  shaderMaterial.uniforms.uResolution.value.set(
    window.innerWidth,
    window.innerHeight
  );
};
window.addEventListener("load", () => {
  setupInitialSlide();
  intializeRenderer();
});
document.addEventListener("click", handleSlideChange);
window.addEventListener("resize", handleResize);
