import * as THREE from "three";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import { Pane } from "tweakpane";
import Stats from "stats.js";

class Sketch {
  constructor() {
    this.container = document.getElementById("sketch");
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.scene = new THREE.Scene();
    window.addEventListener("resize", this.resize.bind(this));

    this.settings = {
      scale: 4,
      center: new THREE.Vector2(),
      angle: 0,
      maxIter: 256,
      color: new THREE.Color("#ffffff"),
      controllerSensitivity: 0.01,
      isPlaying: true,
      isColorSmoothing: true,
      isColorGradient: true,
    };

    this.animationSettings = {
      isAnimating: false,
      startPosition: new THREE.Vector2(),
      endPosition: new THREE.Vector2(0.36543658919, 0.3628325534),
      startScale: 4,
      endScale: 0.00057680794,
      numRotation: 1,
      startRotation: 0,
    };

    this.controller = {
      w: false,
      s: false,
      a: false,
      d: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };
    this.dir = new THREE.Vector2();

    this.init();
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  init() {
    this.setCamera();
    this.setRenderer();
    this.setClock();
    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.setController();
    this.setDebug();
    this.render();
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize(this.width, this.height);

    this.camera.aspect = this.width / this.height;
    this.camera.fov =
      2 * Math.atan((this.height * 0.5) / 600) * (180 / Math.PI);
    this.camera.updateProjectionMatrix();

    this.mesh.scale.set(this.width, this.height, 1);
    this.material.uniforms.uAspect.value = this.width / this.height;
  }

  setCamera() {
    this.camera = new THREE.PerspectiveCamera(
      2 * Math.atan((this.height * 0.5) / 600) * (180 / Math.PI),
      this.width / this.height,
      599,
      601
    );
    this.camera.position.z = 600;
  }

  setRenderer() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(0x999999);
  }

  setClock() {
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
  }

  setGeometry() {
    this.geometry = new THREE.PlaneGeometry(1, 1, 10, 10);
  }

  setMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector2(0, 0) },
        uScale: { value: 4 },
        uAngle: { value: 0 },
        uMaxIter: { value: this.settings.maxIter },
        uAspect: { value: this.width / this.height },
        uColor: { value: this.settings.color },
        uColorSmoothing: { value: 1 },
        uColorGradient: { value: 1 },
        uColorFrequency: { value: 10 },
      },
    });
  }

  setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.set(this.width, this.height, 1);
    this.scene.add(this.mesh);
  }

  setController() {
    window.addEventListener("keydown", (e) => {
      this.controller !== undefined && (this.controller[e.key] = true);
      if (e.code === "Space") {
        this.debug.hidden = !this.debug.hidden;
        const opacity = Number(!Number(this.stats.dom.style.opacity));
        this.stats.dom.style.opacity = opacity;
        document.querySelector("img").style.opacity = opacity;
      }
    });
    window.addEventListener("keyup", (e) => {
      this.controller !== undefined && (this.controller[e.key] = false);
    });
  }

  updateCenterAndScale() {
    this.controller.ArrowUp &&
      (this.settings.scale *= 1 - this.settings.controllerSensitivity);
    this.controller.ArrowDown &&
      (this.settings.scale *= 1 + this.settings.controllerSensitivity);
    this.controller.ArrowLeft &&
      (this.settings.angle -= 3 * this.settings.controllerSensitivity);
    this.controller.ArrowRight &&
      (this.settings.angle += 3 * this.settings.controllerSensitivity);
    // this.settings.angle %= Math.PI;
    const mag = this.settings.controllerSensitivity * this.settings.scale;
    this.dir.set(
      mag * Math.cos(this.settings.angle),
      mag * Math.sin(this.settings.angle)
    );
    this.controller.a && this.settings.center.sub(this.dir);
    this.controller.d && this.settings.center.add(this.dir);
    // rotate dir by pi/2
    this.dir.set(-this.dir.y, this.dir.x);
    this.controller.w && this.settings.center.add(this.dir);
    this.controller.s && this.settings.center.sub(this.dir);
  }

  updateUniforms() {
    this.material.uniforms.uScale.value = this.lerp(
      this.material.uniforms.uScale.value,
      this.settings.scale,
      0.05
    );

    this.material.uniforms.uAngle.value = this.lerp(
      this.material.uniforms.uAngle.value,
      this.settings.angle,
      0.05
    );

    this.material.uniforms.uCenter.value.lerp(this.settings.center, 0.05);

    this.material.uniforms.uTime.value = this.elapsedTime;
  }

  update() {
    this.updateCenterAndScale();
    this.updateUniforms();
  }

  render() {
    this.stats.begin();
    this.settings.isPlaying &&
      window.requestAnimationFrame(this.render.bind(this));
    this.update();
    this.elapsedTime = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }

  animate() {
    this.material.uniforms.uCenter.value.set(
      ...this.animationSettings.startPosition
    );
    this.material.uniforms.uScale.value = this.animationSettings.startScale;

    this.material.uniforms.uAngle.value = this.settings.angle =
      this.animationSettings.startRotation;

    this.settings.isPlaying = false;

    window.setTimeout(() => {
      this.settings.center.set(...this.animationSettings.endPosition);
      this.settings.scale = this.animationSettings.endScale;
      this.settings.angle += this.animationSettings.numRotation * 2 * Math.PI;
      this.settings.isPlaying = true;
      this.render();
    }, 1000);
  }

  setDebug() {
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(this.stats.dom);

    this.debug = new Pane();
    this.debug.containerElem_.style.width = "16vw";
    this.debug.containerElem_.style.minWidth = "320px";

    this.tab = this.debug.addTab({
      pages: [{ title: "settings" }, { title: "animation" }],
    });

    this.tab.pages[0].addInput(this.material.uniforms.uMaxIter, "value", {
      min: 0,
      max: 512,
      step: 1,
      label: "iterations",
    });

    this.tab.pages[0].addMonitor(this.settings.center, "x", {
      label: "positionX",
    });

    this.tab.pages[0].addMonitor(this.settings.center, "y", {
      label: "positionY",
    });

    this.tab.pages[0].addMonitor(this.settings, "scale", {
      label: "scale",
    });

    this.tab.pages[0].addMonitor(this.settings, "angle", {
      label: "rotation",
    });

    this.tab.pages[0]
      .addButton({ title: "copy current state to clipboard" })
      .on("click", () => {
        const state = `Position: {x: ${this.settings.center.x}, y: ${this.settings.center.y}}\nScale: ${this.settings.scale}\nRotation: ${this.settings.angle}`;
        navigator.clipboard.writeText(state);
      });

    this.tab.pages[0].addSeparator();

    this.tab.pages[0]
      .addInput(this.settings, "color", {
        view: "color",
        expanded: true,
        picker: "inline",
      })
      .on("change", () => {
        const rgbChannels = this.settings.color
          .toArray()
          .map((channel) => channel / 255);
        this.material.uniforms.uColor.value.setRGB(...rgbChannels);
      });

    this.tab.pages[0]
      .addInput(this.settings, "isColorGradient", {
        label: "use a color gradient",
      })
      .on("change", () => {
        this.material.uniforms.uColorGradient.value = Number(
          this.settings.isColorGradient
        );
        this.tab.pages[0].children[9].hidden = !this.settings.isColorGradient;
      });

    this.tab.pages[0].addInput(
      this.material.uniforms.uColorFrequency,
      "value",
      {
        label: "color frequency",
        hidden: !this.settings.isColorGradient,
        min: 0,
        max: 60,
        step: 0.001,
      }
    );

    this.tab.pages[0]
      .addInput(this.settings, "isColorSmoothing", { label: "smooth colors" })
      .on(
        "change",
        () =>
          (this.material.uniforms.uColorSmoothing.value = Number(
            this.settings.isColorSmoothing
          ))
      );

    this.tab.pages[0].addInput(this.settings, "controllerSensitivity", {
      label: "controller sensitivity",
      min: 0,
      max: 0.05,
      step: 0.001,
    });

    this.tab.pages[1].addInput(this.animationSettings, "startPosition", {
      picker: "inline",
      expanded: true,
      label: "set start-position",
      x: { min: -2, max: 2, step: 0.00001 },
      y: { min: -2, max: 2, step: 0.00001 },
    });

    this.tab.pages[1].addInput(this.animationSettings, "startScale", {
      label: "set start-scale",
      min: 0.0000001,
      max: 4,
      step: 0.00000001,
    });

    this.tab.pages[1]
      .addButton({
        title: "set start-location to current location",
      })
      .on("click", () => {
        this.animationSettings.startPosition.set(...this.settings.center);
        this.animationSettings.startScale = this.settings.scale;
        this.debug.refresh();
      });

    this.tab.pages[1].addInput(this.animationSettings, "startRotation", {
      label: "set starting rotation",
      min: -Math.PI,
      max: Math.PI,
      step: Math.PI / 4,
    });

    this.tab.pages[1].addSeparator();

    this.tab.pages[1].addInput(this.animationSettings, "endPosition", {
      picker: "inline",
      expanded: true,
      label: "set end-position",
      x: { min: -2, max: 2, step: 0.00001 },
      y: { min: -2, max: 2, step: 0.00001 },
    });
    this.tab.pages[1].addInput(this.animationSettings, "endScale", {
      label: "set end-scale",
      min: 0.0000001,
      max: 4,
      step: 0.00000001,
    });

    this.tab.pages[1]
      .addButton({
        title: "set end-location to current location",
      })
      .on("click", () => {
        this.animationSettings.endPosition.set(...this.settings.center);
        this.animationSettings.endScale = this.settings.scale;
        this.debug.refresh();
      });

    this.tab.pages[1].addInput(this.animationSettings, "numRotation", {
      label: "set number of rotation",
      min: 0,
      max: 10,
      step: 0.001,
    });

    this.tab.pages[1].addSeparator();

    this.tab.pages[1]
      .addButton({
        title: "animate",
      })
      .on("click", () => {
        this.animate();
      });

    this.tab.pages[0].addSeparator();
    this.tab.pages[1].addSeparator();

    this.debug
      .addButton({
        title: "reset location",
      })
      .on("click", () => {
        this.settings.center.set(0, 0);
        this.settings.scale = 4;
        this.settings.angle = 0;
      });

    this.debug.addSeparator();
    this.controlsFolder = this.debug.addFolder({
      title: "controls",
      expanded: true,
    });

    const controls = {
      controls: ` Move:        |W|
            |A| |D|
              |S|

  Zoom:       |⬆|
              |⬇|
  
  Rotate:   |⬅| |➡|

  Show/Hide
            |Space|
  Settings:
  `,
    };
    this.controlsFolder.addMonitor(controls, "controls", {
      multiline: true,
      lineCount: 12,
      expanded: false,
    });
  }
}

new Sketch();
