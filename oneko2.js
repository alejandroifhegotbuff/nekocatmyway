// oneko.js — enhanced fork
// Original: https://github.com/adryd325/oneko.js
// Enhancements: smooth lerp movement, easing, touch support, reduced jitter

(function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");

  // Current rendered position (lerped)
  let nekoPosX = 32;
  let nekoPosY = 32;

  // Target position (raw mouse/touch)
  let mousePosX = 0;
  let mousePosY = 0;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;

  // Speed in px per logic frame (10fps logic)
  const nekoSpeed = 12;

  // Lerp factor for smooth trailing (0 = no movement, 1 = instant snap)
  // Applied at 60fps — gives buttery trailing motion
  const LERP = 0.12;

  const spriteSets = {
    idle:        [[-3, -3]],
    alert:       [[-7, -3]],
    scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
    scratchWallN:[[ 0, 0], [ 0,-1]],
    scratchWallS:[[-7,-1], [-6,-2]],
    scratchWallE:[[-2,-2], [-2,-3]],
    scratchWallW:[[-4, 0], [-4,-1]],
    tired:       [[-3,-2]],
    sleeping:    [[-2, 0], [-2,-1]],
    N:  [[-1,-2], [-1,-3]],
    NE: [[ 0,-2], [ 0,-3]],
    E:  [[-3, 0], [-3,-1]],
    SE: [[-5,-1], [-5,-2]],
    S:  [[-6,-3], [-7,-2]],
    SW: [[-5,-3], [-6,-1]],
    W:  [[-4,-2], [-4,-3]],
    NW: [[-1, 0], [-1,-1]],
  };

  // ─── Smooth render position (updated every rAF at ~60fps) ───────────────────
  let renderX = 32;
  let renderY = 32;

  // ─── Logic position (updated at 10fps) ──────────────────────────────────────
  // nekoPosX / nekoPosY track where the logic "thinks" the cat is, used for
  // distance calculations and sprite decisions. renderX/Y are the smooth visual.

  function init() {
    nekoEl.id = "oneko";
    nekoEl.ariaHidden = "true";
    nekoEl.style.cssText = [
      "width:32px",
      "height:32px",
      "position:fixed",
      "pointer-events:none",
      "image-rendering:pixelated",
      `left:${nekoPosX - 16}px`,
      `top:${nekoPosY - 16}px`,
      "z-index:2147483647",
      // Subtle drop-shadow so it pops on any background
      "filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))",
      // GPU-accelerate the element
      "will-change:transform",
      // Use transform instead of left/top for smoother compositing
      "left:0",
      "top:0",
      `transform:translate(${nekoPosX - 16}px,${nekoPosY - 16}px)`,
    ].join(";");

    let nekoFile = "./oneko.gif";
    const curScript = document.currentScript;
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }
    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    document.body.appendChild(nekoEl);

    // Mouse tracking
    document.addEventListener("mousemove", (e) => {
      mousePosX = e.clientX;
      mousePosY = e.clientY;
    });

    // Touch tracking — treats first touch as the "cursor"
    document.addEventListener("touchmove", (e) => {
      mousePosX = e.touches[0].clientX;
      mousePosY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener("touchstart", (e) => {
      mousePosX = e.touches[0].clientX;
      mousePosY = e.touches[0].clientY;
    }, { passive: true });

    // Start both loops
    window.requestAnimationFrame(renderLoop);
    scheduleLogicFrame();
  }

  // ─── Render loop: ~60fps, only moves the element smoothly ───────────────────
  function renderLoop() {
    if (!nekoEl.isConnected) return;

    renderX += (nekoPosX - renderX) * LERP;
    renderY += (nekoPosY - renderY) * LERP;

    nekoEl.style.transform = `translate(${(renderX - 16) | 0}px,${(renderY - 16) | 0}px)`;

    window.requestAnimationFrame(renderLoop);
  }

  // ─── Logic loop: ~10fps, decides sprite & direction ─────────────────────────
  let lastLogicTime = 0;
  const LOGIC_INTERVAL = 100; // ms

  function scheduleLogicFrame() {
    if (!nekoEl.isConnected) return;
    const now = performance.now();
    const elapsed = now - lastLogicTime;
    const delay = Math.max(0, LOGIC_INTERVAL - elapsed);
    setTimeout(() => {
      lastLogicTime = performance.now();
      frame();
      scheduleLogicFrame();
    }, delay);
  }

  function setSprite(name, f) {
    const sprite = spriteSets[name][f % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation == null) {
      const options = ["sleeping", "scratchSelf"];
      if (nekoPosX < 32)                      options.push("scratchWallW");
      if (nekoPosY < 32)                      options.push("scratchWallN");
      if (nekoPosX > window.innerWidth - 32)  options.push("scratchWallE");
      if (nekoPosY > window.innerHeight - 32) options.push("scratchWallS");
      idleAnimation = options[Math.floor(Math.random() * options.length)];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) { setSprite("tired", 0); break; }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdleAnimation();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdleAnimation();
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    frameCount += 1;

    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    if (distance < nekoSpeed || distance < 48) {
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    idleTime = 0;

    // 8-directional sprite selection with smoothed thresholds
    const nx = diffX / distance;
    const ny = diffY / distance;

    let dir = "";
    if (ny >  0.5) dir += "N";
    if (ny < -0.5) dir += "S";
    if (nx >  0.5) dir += "W";
    if (nx < -0.5) dir += "E";

    setSprite(dir || "idle", frameCount);

    nekoPosX -= nx * nekoSpeed;
    nekoPosY -= ny * nekoSpeed;

    // Clamp to viewport with a 16px margin
    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth  - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);
  }

  init();
})();