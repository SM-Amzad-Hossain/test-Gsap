/* ============================================================
   ORCHARD — 3D scroll experience
   Three.js scene + GSAP ScrollTrigger choreography
   ============================================================ */

/* Plain HTML/CSS/JS build — dependencies arrive as globals from index.html:
   - gsap + ScrollTrigger: UMD <script> tags (CDN)
   - THREE + RoomEnvironment: import-map bridge (CDN), may be null offline */
const THREE = window.THREE;
const RoomEnvironment = window.RoomEnvironment;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

if (!gsap || !ScrollTrigger) {
  // CDN failed — reveal the page so it is at least readable/static.
  document.getElementById('loader')?.remove();
  throw new Error('GSAP failed to load from CDN');
}

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/* ------------------------------------------------------------
   DOM choreography (works even if WebGL fails)
   ------------------------------------------------------------ */

// Wrap every character in .char / .word spans while preserving element
// children (e.g. the .grad gradient span in the hero title).
function splitChars(el) {
  const process = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(' '));
          continue;
        }
        const word = document.createElement('span');
        word.className = 'word';
        for (const c of part) {
          const ch = document.createElement('span');
          ch.className = 'char';
          ch.textContent = c;
          word.appendChild(ch);
        }
        frag.appendChild(word);
      }
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of [...node.childNodes]) process(child);
    }
  };
  for (const child of [...el.childNodes]) process(child);
}

// Scroll progress bar
gsap.to('.progress', {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
  },
});

// Nav background on scroll
const nav = document.querySelector('.nav');
const onScrollNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
onScrollNav();
window.addEventListener('scroll', onScrollNav, { passive: true });

// Per-section content reveals
if (!reduceMotion) {
  gsap.utils.toArray('.product .section-content').forEach((content) => {
    gsap.from(content.children, {
      y: 46,
      autoAlpha: 0,
      duration: 0.85,
      stagger: 0.09,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: content,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
  });
}

// Side dots active state
const sections = gsap.utils.toArray('main .section');
const dots = gsap.utils.toArray('.dot');
sections.forEach((section, i) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (self.isActive) {
        dots.forEach((d, j) => d.classList.toggle('is-active', j === i));
      }
    },
  });
});

// Cart micro-interaction
let cartCount = 2;
document.querySelectorAll('[data-add]').forEach((btn) => {
  btn.addEventListener('click', () => {
    cartCount += 1;
    const el = document.getElementById('cart-count');
    el.textContent = String(cartCount);
    gsap.fromTo(
      el,
      { scale: 1.7 },
      { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' }
    );
    if (!reduceMotion) {
      gsap.fromTo(
        btn,
        { scale: 0.93 },
        { scale: 1, duration: 0.45, ease: 'back.out(3.5)' }
      );
    }
  });
});

/* ------------------------------------------------------------
   Three.js scene
   ------------------------------------------------------------ */

let three = null;

function initThree() {
  const canvas = document.getElementById('webgl');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();

  // Soft studio environment so the fruit materials read as real
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(
    window.innerWidth < 768 ? 52 : 42,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  // camBase is tweened by the scroll timeline; parallax + intro offset on top
  const camBase = { x: 0, y: 0.35, z: 9 };
  const camIntro = { y: 1.2, z: 5 };
  const lookTarget = new THREE.Vector3(0, 0, 0);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  // Lights (env map provides most of the base lighting)
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(5, 8, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffe3c4, 0.65);
  fill.position.set(-6, 2, -4);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9f2c9, 0.5));

  /* ---------- Fruit builders ---------- */

  function buildOrange() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshStandardMaterial({
        color: '#ff7a1a',
        roughness: 0.55,
        metalness: 0.02,
      })
    );
    body.scale.set(1, 0.94, 1);
    group.add(body);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.06, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: '#6b4a24', roughness: 0.9 })
    );
    stem.position.y = 0.95;
    group.add(stem);

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 16),
      new THREE.MeshStandardMaterial({ color: '#2f9e44', roughness: 0.65 })
    );
    leaf.scale.set(1, 0.12, 0.45);
    leaf.position.set(0.24, 1.0, 0.06);
    leaf.rotation.set(0.15, 0.3, -0.35);
    group.add(leaf);

    return group;
  }

  const strawRadius = (t) =>
    Math.sin(Math.pow(Math.max(t, 0), 0.75) * Math.PI * 0.92) * 0.8;

  function buildStrawberry() {
    const group = new THREE.Group();

    // Body: lathe profile — pointed tip, broad shoulders, closed top
    const profile = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = -1.05 + t * 2.1;
      profile.push(new THREE.Vector2(Math.max(strawRadius(t), 0.0001), y));
    }
    profile.push(new THREE.Vector2(0.001, 1.12)); // close the top under the calyx

    const body = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 48),
      new THREE.MeshStandardMaterial({
        color: '#e63950',
        roughness: 0.32,
        metalness: 0.02,
      })
    );
    group.add(body);

    // Seeds as one InstancedMesh
    const rings = [0.28, 0.46, 0.64, 0.84];
    const placements = [];
    for (const t of rings) {
      const count = Math.round(6 + t * 9);
      const y = -1.05 + t * 2.1;
      const r = strawRadius(t);
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + t * 2.6; // spiral twist
        placements.push({
          x: Math.cos(a) * r * 0.995,
          y,
          z: Math.sin(a) * r * 0.995,
        });
      }
    }
    const seedMat = new THREE.MeshStandardMaterial({
      color: '#ffe08a',
      roughness: 0.5,
    });
    const seeds = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      seedMat,
      placements.length
    );
    const dummy = new THREE.Object3D();
    placements.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(1.1, 1.5, 0.5);
      dummy.lookAt(p.x * 2, p.y * 2, p.z * 2); // face outward
      dummy.updateMatrix();
      seeds.setMatrixAt(i, dummy.matrix);
    });
    seeds.instanceMatrix.needsUpdate = true;
    group.add(seeds);

    // Green crown
    const calyxMat = new THREE.MeshStandardMaterial({
      color: '#3faa56',
      roughness: 0.7,
    });
    const leafGeo = new THREE.SphereGeometry(0.24, 12, 8);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(leafGeo, calyxMat);
      leaf.scale.set(1, 0.1, 0.35);
      leaf.position.set(Math.cos(a) * 0.26, 1.04, Math.sin(a) * 0.26);
      leaf.rotation.y = -a;
      leaf.rotation.z = 0.28;
      group.add(leaf);
    }
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.085, 0.15, 8),
      calyxMat
    );
    crown.position.y = 1.1;
    group.add(crown);

    group.rotation.z = 0.08;
    return group;
  }

  function buildKiwi() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: '#9a6b3f',
      roughness: 0.95,
    });
    const fleshMat = new THREE.MeshStandardMaterial({
      color: '#a3d95a',
      roughness: 0.5,
    });

    // Cylinder material groups: [side, top, bottom]
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.42, 64, 1, false),
      [skinMat, fleshMat, skinMat]
    );
    group.add(body);

    // Pale core on the cut face
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: '#f4f7e8', roughness: 0.6 })
    );
    core.position.y = 0.215;
    group.add(core);

    // Seed ring on the cut face
    const seedMat = new THREE.MeshStandardMaterial({
      color: '#1c1a17',
      roughness: 0.4,
    });
    const seedCount = 22;
    const seeds = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      seedMat,
      seedCount
    );
    const dummy = new THREE.Object3D();
    for (let k = 0; k < seedCount; k++) {
      const a = (k / seedCount) * Math.PI * 2;
      const r = 0.5 + Math.sin(k * 2.7) * 0.04;
      dummy.position.set(Math.cos(a) * r, 0.21, Math.sin(a) * r);
      dummy.scale.set(0.9, 0.55, 1.4);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      seeds.setMatrixAt(k, dummy.matrix);
    }
    seeds.instanceMatrix.needsUpdate = true;
    group.add(seeds);

    // Tilt the cut face toward the camera (kept on the group so the idle
    // spin around Y leaves the face aimed at the viewer)
    group.rotation.x = 0.45;
    group.rotation.z = 0.1;
    return group;
  }

  /* ---------- Fruit wrappers ----------
     The timeline tweens wrapper.pos / wrapper.scl / wrapper.spin;
     the render loop composes those with bobbing + idle spin.        */

  function wrapFruit(mesh, { pos, scl = 1, spin = 0, bob = 0.1, phase = 0, idle = 0.18 }) {
    mesh.position.set(0, 0, 0);
    const root = new THREE.Group();
    root.add(mesh);
    root.position.set(pos.x, pos.y, pos.z);
    scene.add(root);
    return {
      root,
      pos: { ...pos },
      scl,
      intro: { v: reduceMotion ? 1 : 0 },
      spin: { y: spin },
      bobAmp: reduceMotion ? 0 : bob,
      phase,
      idle: reduceMotion ? 0 : idle,
    };
  }

  const orange = wrapFruit(buildOrange(), {
    pos: { x: -1.8, y: 0.7, z: 0.1 },
    spin: 0.4,
    bob: 0.12,
    phase: 0,
    idle: 0.16,
  });

  const strawberry = wrapFruit(buildStrawberry(), {
    pos: { x: 1.7, y: -0.25, z: 0.5 },
    spin: -0.5,
    bob: 0.1,
    phase: 2.1,
    idle: 0.2,
  });

  const kiwi = wrapFruit(buildKiwi(), {
    pos: { x: 0.15, y: -1.35, z: -0.5 },
    spin: 0.8,
    bob: 0.08,
    phase: 4.2,
    idle: 0.1,
  });

  const fruits = [orange, strawberry, kiwi];

  /* ---------- Ambient particles ---------- */

  const particles = [];
  const pGroup = new THREE.Group();
  const pGeo = new THREE.SphereGeometry(1, 8, 8);
  const pMats = ['#ff9f43', '#f4436c', '#9bcf5a', '#ffd166'].map(
    (c) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0 })
  );
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(pGeo, pMats[i % pMats.length]);
    const s = 0.03 + Math.random() * 0.06;
    m.scale.setScalar(s);
    m.position.set(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 9,
      -1 - Math.random() * 5
    );
    pGroup.add(m);
    particles.push({
      mesh: m,
      baseY: m.position.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
    });
  }
  scene.add(pGroup);

  /* ---------- Scroll choreography ----------
     5 equal-height sections → 4 transitions of duration 1 on a master
     timeline scrubbed over `main`, so state N lands exactly when
     section N reaches the top of the viewport.                       */

  if (!reduceMotion) {
    const master = gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: 'main',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.1,
      },
    });

    // Seg 1 — blood orange spotlight (card left, fruit right of centre)
    master
      .to(camBase, { x: 0, y: 0.1, z: 7.8 }, 0)
      .to(orange.pos, { x: 1.6, y: 0.1, z: 2.3 }, 0)
      .to(orange, { scl: 1.45 }, 0)
      .to(orange.spin, { y: Math.PI * 0.9 }, 0)
      .to(strawberry.pos, { x: 3.4, y: -1.2, z: -1.4 }, 0)
      .to(strawberry, { scl: 0.85 }, 0)
      .to(kiwi.pos, { x: -3.4, y: 1.4, z: -1.8 }, 0)
      .to(kiwi, { scl: 0.85 }, 0)

      // Seg 2 — strawberry spotlight (card right, fruit left of centre)
      .to(camBase, { x: 0, y: -0.05, z: 7.6 }, 1)
      .to(strawberry.pos, { x: -1.7, y: 0.05, z: 2.4 }, 1)
      .to(strawberry, { scl: 1.5 }, 1)
      .to(strawberry.spin, { y: -Math.PI * 1.1 }, 1)
      .to(orange.pos, { x: -3.5, y: 1.3, z: -1.6 }, 1)
      .to(orange, { scl: 0.85 }, 1)
      .to(kiwi.pos, { x: 3.5, y: -1.3, z: -1.5 }, 1)
      .to(kiwi, { scl: 0.85 }, 1)

      // Seg 3 — golden kiwi spotlight (card left, fruit right of centre)
      .to(camBase, { x: 0, y: 0, z: 7.6 }, 2)
      .to(kiwi.pos, { x: 1.7, y: 0.05, z: 2.4 }, 2)
      .to(kiwi, { scl: 1.45 }, 2)
      .to(kiwi.spin, { y: Math.PI * 1.5 }, 2)
      .to(orange.pos, { x: -3.4, y: -1.3, z: -1.4 }, 2)
      .to(orange, { scl: 0.9 }, 2)
      .to(strawberry.pos, { x: 3.4, y: 1.4, z: -1.5 }, 2)
      .to(strawberry, { scl: 0.9 }, 2)

      // Seg 4 — the Alive Box (card right, fruit cluster left)
      .to(camBase, { x: 0.3, y: 0.35, z: 9.2 }, 3)
      .to(orange.pos, { x: -3.0, y: 0.7, z: 0.4 }, 3)
      .to(orange, { scl: 1.05 }, 3)
      .to(strawberry.pos, { x: -1.5, y: -0.7, z: 1.1 }, 3)
      .to(strawberry, { scl: 1.1 }, 3)
      .to(kiwi.pos, { x: -3.6, y: -0.9, z: -0.6 }, 3)
      .to(kiwi, { scl: 1.0 }, 3);
  }

  /* ---------- Pointer parallax ---------- */

  if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }

  /* ---------- Render loop ---------- */

  const clock = new THREE.Clock();

  function render() {
    const t = clock.getElapsedTime();

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    camera.position.set(
      camBase.x + pointer.x * 0.35,
      camBase.y - pointer.y * 0.25 + camIntro.y,
      camBase.z + camIntro.z
    );
    camera.lookAt(lookTarget);

    for (const f of fruits) {
      f.root.position.set(
        f.pos.x,
        f.pos.y + Math.sin(t * 0.9 + f.phase) * f.bobAmp,
        f.pos.z
      );
      f.root.scale.setScalar(f.scl * f.intro.v);
      f.root.rotation.y = f.spin.y + t * f.idle;
    }

    pGroup.rotation.y = t * 0.02;
    for (const p of particles) {
      p.mesh.position.y = p.baseY + Math.sin(t * p.speed + p.phase) * 0.45;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  /* ---------- Resize ---------- */

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = window.innerWidth < 768 ? 52 : 42;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    ScrollTrigger.refresh();
  });

  return { camIntro, fruits };
}

/* ------------------------------------------------------------
   Boot: init3D → loader out → intro timeline
   ------------------------------------------------------------ */

try {
  three = initThree();
} catch (err) {
  // Graceful fallback: hide the canvas, keep the DOM experience
  console.warn('WebGL unavailable, falling back to DOM-only experience:', err);
  document.getElementById('webgl').style.display = 'none';
  three = null;
}

const heroTitle = document.querySelector('.hero-title');
splitChars(heroTitle);

const intro = gsap.timeline({ paused: true });

if (three) {
  intro
    .to('#loader', { autoAlpha: 0, duration: 0.55, ease: 'power2.out' })
    .to(
      three.camIntro,
      { y: 0, z: 0, duration: 1.5, ease: 'power3.out' },
      0.1
    )
    .to(
      three.fruits.map((f) => f.intro),
      {
        v: 1,
        duration: 1.2,
        stagger: 0.13,
        ease: 'elastic.out(1, 0.6)',
      },
      0.3
    );
} else {
  intro.to('#loader', { autoAlpha: 0, duration: 0.4 });
}

if (reduceMotion) {
  intro.progress(1).pause();
} else {
  intro
    .from('.nav', { y: -28, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.35)
    .from(
      '.hero-badge',
      { y: 18, autoAlpha: 0, duration: 0.6, ease: 'power3.out' },
      0.55
    )
    .from(
      '.hero .char',
      { yPercent: 115, duration: 0.9, stagger: 0.024, ease: 'power4.out' },
      0.65
    )
    .from(
      '.hero-sub, .hero-actions',
      { y: 22, autoAlpha: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' },
      1.05
    )
    .from(
      '.scroll-hint, .dots',
      { autoAlpha: 0, duration: 0.7, ease: 'power2.out' },
      1.4
    );
}

let started = false;
function start() {
  if (started) return;
  started = true;
  intro.play();
  ScrollTrigger.refresh();
}

if (document.readyState === 'complete') {
  setTimeout(start, 350);
} else {
  window.addEventListener('load', () => setTimeout(start, 350));
  // Safety: never leave the loader stuck
  setTimeout(start, 2500);
}
