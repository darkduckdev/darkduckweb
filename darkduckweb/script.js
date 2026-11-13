/* =====================================================
   إعدادات يمكنك تعديلها
   ===================================================== */
const CONFIG = {
  // معرّف حسابك في ديسكورد (أرقام فقط). الإعدادات > متقدم > وضع المطور، ثم انقر بزر الفأرة الأيمن على اسمك > نسخ المعرّف.
  // مهم: انضم إلى سيرفر Lanyard الرسمي حتى تظهر حالتك: https://discord.gg/lanyard
  discordId: "1070354089449377792",

  // الأفيكت (اختياري): يُجلب تلقائياً من ديسكورد، وإن لم يظهر استخدم أحد الخيارين التاليين
  // الأول: ضع صورة الأفيكت في assets/img/decoration.png واكتب المسار هنا
  decorationFile: "",   // مثال: "assets/img/decoration.png"
  // الثاني: ضع قيمة asset من رابط Lanyard (انظر الشرح)
  decorationAsset: "",  // مثال: "a_1234abcd..."

  // اسم مساحة العدّاد (غيّره إلى اسم فريد خاص بك)
  counterNamespace: "H07-2026",
  counterKey: "visits",

  // مستوى صوت الأغنية (0 إلى 1)
  volume: 0.5,

  // المنطقة الزمنية للساعة (ليبيا)
  timezone: "Africa/Tripoli",

  // تصحيح التاريخ الهجري بالأيام: 0 = بدون تغيير، 1 = يوم أكثر، -1 = يوم أقل
  // (التقويم الهجري قد يختلف يوماً حسب رؤية الهلال، عدّل هذه القيمة لتطابق تقويم بلدك)
  hijriOffset: 0,
};

const $ = (id) => document.getElementById(id);

/* =====================================================
   1) المطر
   ===================================================== */
(function rain() {
  const canvas = $("rain");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, drops = [], dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(220, Math.max(70, (w * h) / 9000)));
    drops = Array.from({ length: count }, () => makeDrop(true));
  }

  function makeDrop(randomY) {
    const depth = Math.random();            // 0 بعيد ... 1 قريب
    return {
      x: Math.random() * (w + 80) - 40,
      y: randomY ? Math.random() * h : -20,
      len: 10 + depth * 22,
      speed: 7 + depth * 13,
      alpha: 0.12 + depth * 0.32,
      width: 0.6 + depth * 0.9,
    };
  }

  const wind = 2.2; // ميلان القطرات

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    for (const d of drops) {
      ctx.strokeStyle = `rgba(190, 210, 235, ${d.alpha})`;
      ctx.lineWidth = d.width;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - wind * (d.len / 10), d.y + d.len);
      ctx.stroke();

      d.y += d.speed;
      d.x -= wind * (d.speed / 12);
      if (d.y > h + 20 || d.x < -60) Object.assign(d, makeDrop(false));
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  if (reduce) {
    // بدون حركة: نرسم إطاراً واحداً ثابتاً
    ctx.lineCap = "round";
    for (const d of drops) {
      ctx.strokeStyle = `rgba(190, 210, 235, ${d.alpha})`;
      ctx.lineWidth = d.width;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - wind, d.y + d.len);
      ctx.stroke();
    }
  } else {
    requestAnimationFrame(frame);
  }
})();

/* =====================================================
   2) الأغنية (تشغيل تلقائي + تكرار + طي المشغل)
   ===================================================== */
(function music() {
  const audio = $("audio");
  const playBtn = $("plPlay");
  const foldBtn = $("plFold");
  const player = $("player");
  const seek = $("seek");
  const timeNow = $("timeNow");
  const timeEnd = $("timeEnd");
  const gate = $("gate");

  audio.volume = CONFIG.volume;
  audio.loop = true;

  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  function setIcon(isPlaying) {
    playBtn.innerHTML = `<i class="fa-solid ${isPlaying ? "fa-pause" : "fa-play"}"></i>`;
    player.classList.toggle("playing", isPlaying);
  }

  audio.addEventListener("play", () => setIcon(true));
  audio.addEventListener("pause", () => setIcon(false));

  audio.addEventListener("loadedmetadata", () => {
    timeEnd.textContent = fmt(audio.duration);
  });

  let dragging = false;
  audio.addEventListener("timeupdate", () => {
    if (dragging || !audio.duration) return;
    const p = (audio.currentTime / audio.duration) * 1000;
    seek.value = p;
    seek.style.setProperty("--p", p / 10 + "%");
    timeNow.textContent = fmt(audio.currentTime);
  });

  seek.addEventListener("input", () => {
    dragging = true;
    seek.style.setProperty("--p", seek.value / 10 + "%");
    if (audio.duration) timeNow.textContent = fmt((seek.value / 1000) * audio.duration);
  });
  seek.addEventListener("change", () => {
    if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
    dragging = false;
  });

  // ---- الصوت يتلاشى عند مغادرة Home ويعود عند الرجوع ----
  let section = "home";      // القسم الحالي
  let userPaused = false;    // هل أوقفه المستخدم بنفسه؟
  let started = false;       // هل بدأ التشغيل فعلاً مرة واحدة؟
  let fadeRaf = 0;

  function fadeTo(target, ms, done) {
    cancelAnimationFrame(fadeRaf);
    const from = audio.volume;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / ms);
      try { audio.volume = from + (target - from) * p; } catch (e) {} // بعض الأجهزة (iOS) تمنع تغيير الصوت
      if (p < 1) fadeRaf = requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  }

  function syncSound() {
    const want = section === "home" && !userPaused;
    if (want) {
      if (audio.paused && started) {
        audio.volume = 0;
        audio.play().then(() => fadeTo(CONFIG.volume, 900)).catch(() => {});
      } else if (!audio.paused) {
        fadeTo(CONFIG.volume, 900);
      }
    } else if (!audio.paused) {
      fadeTo(0, 700, () => {
        if (section !== "home" || userPaused) audio.pause();
      });
    }
  }

  audio.addEventListener("playing", () => {
    started = true;
    if (section !== "home") syncSound();
  });
  document.addEventListener("sectionchange", (e) => {
    section = e.detail;
    syncSound();
  });

  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      userPaused = false;
      audio.volume = CONFIG.volume;
      audio.play().catch(() => {});
    } else {
      userPaused = true;
      audio.pause();
    }
  });

  foldBtn.addEventListener("click", () => {
    const folded = player.classList.toggle("folded");
    foldBtn.setAttribute("aria-expanded", String(!folded));
    foldBtn.setAttribute("aria-label", folded ? "فتح المشغل" : "طي المشغل");
  });

  // محاولة التشغيل التلقائي، وإن منعها المتصفح تظهر شاشة "اضغط للدخول"
  // يبدأ أنيميشن دخول البطاقة والشريط (إزالة الصنف preload من body)
  const enter = () => document.body.classList.remove("preload");

  function leave() {
    gate.classList.add("leaving");
    enter();
    setTimeout(() => (gate.hidden = true), 500);
  }
  audio.play().then(() => {
    gate.hidden = true;
    enter();
  }).catch(() => {
    gate.hidden = false;
    gate.addEventListener("click", () => {
      audio.play().catch(() => {});
      leave();
    }, { once: true });
  });
})();

/* =====================================================
   3) حالة ديسكورد (عبر Lanyard)
   ===================================================== */
(function discord() {
  const el = {
    name: $("dcName"),
    status: $("dcStatus"),
    activity: $("dcActivity"),
    dot: $("dcDot"),
    avatar: $("dcAvatar"),
    mainDecor: $("avatarDecor"),
  };

  // صورة حسابك في ديسكورد تظهر داخل مستطيل ديسكورد فقط (تتحدث تلقائياً). صورة البروفايل الكبيرة تبقى من اختيارك: assets/img/avatar.jpg
  function showAvatar(user) {
    if (!user || !user.avatar) return;
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
    [el.avatar].forEach((img) => {
      if (img.dataset.src === url) return;
      const test = new Image();
      test.onload = () => { img.src = url; img.dataset.src = url; };
      test.src = url;
    });
  }

  const LABELS = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    offline: "Offline",
  };

  function setStatus(status) {
    const s = LABELS[status] ? status : "offline";
    el.dot.dataset.status = s;
    el.status.textContent = LABELS[s];
  }

  function decorUrl(user) {
    if (CONFIG.decorationFile) return CONFIG.decorationFile;
    const d = user && user.avatar_decoration_data;
    const asset = (d && d.asset) || (user && user.avatar_decoration) || CONFIG.decorationAsset;
    if (!asset) return "";
    return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=160&passthrough=true`;
  }

  function showDecor(imgEl, user) {
    const url = decorUrl(user);
    if (!url) { imgEl.hidden = true; return; }
    if (imgEl.dataset.src === url) { imgEl.hidden = false; return; }
    imgEl.onerror = () => {
      // محاولة ثانية بدون إعدادات الحجم، ثم الإخفاء
      const plain = url.split("?")[0];
      if (imgEl.src.split("?")[0] !== plain || imgEl.src.includes("?")) imgEl.src = plain;
      else imgEl.hidden = true;
    };
    imgEl.src = url;
    imgEl.dataset.src = url;
    imgEl.hidden = false;
  }

  function describeActivity(data) {
    if (data.listening_to_spotify && data.spotify) {
      return `Listening to ${data.spotify.song}`;
    }
    const act = (data.activities || []).find((a) => a.type !== 4);
    if (act) return act.type === 0 ? `Playing ${act.name}` : act.name;
    const custom = (data.activities || []).find((a) => a.type === 4);
    return custom && custom.state ? custom.state : "";
  }

  function render(data) {
    const user = data.discord_user || {};
    el.name.textContent = user.global_name || user.username || "Discord";
    setStatus(data.discord_status);

    showAvatar(user);
    if (!decorUrl(user)) {
      console.info("[الأفيكت] لم يرسل Lanyard أفيكت لحسابك. بيانات المستخدم:", user);
    }
    showDecor(el.mainDecor, user);

    const text = describeActivity(data);
    el.activity.textContent = text;
    el.activity.hidden = !text;
  }

  if (!CONFIG.discordId) {
    el.name.textContent = "HuSsEiN07";
    setStatus("offline");
    el.status.textContent = "Add your Discord ID in script.js";
    showDecor(el.mainDecor, null);
    return;
  }

  async function load() {
    try {
      const res = await fetch(`https://api.lanyard.rest/v1/users/${CONFIG.discordId}`);
      const json = await res.json();
      if (json.success) render(json.data);
      else {
        setStatus("offline");
        el.status.textContent = "Join the Lanyard server to show status";
      }
    } catch (e) {
      setStatus("offline");
    }
  }
  load();
  setInterval(load, 20000);
})();

/* =====================================================
   4) عدد الزيارات (مرة واحدة لكل متصفح)
   ===================================================== */
(function views() {
  const out = $("viewCount");
  const base = "https://abacus.jasoncameron.dev";
  const path = `${CONFIG.counterNamespace}/${CONFIG.counterKey}`;
  const FLAG = "hussein07_visited";

  let seen = false;
  try { seen = localStorage.getItem(FLAG) === "1"; } catch (e) {}

  const show = (n) => (out.textContent = Number(n).toLocaleString("en"));

  async function call(op) {
    const res = await fetch(`${base}/${op}/${path}`);
    if (!res.ok) throw new Error(res.status);
    return (await res.json()).value;
  }

  (async () => {
    try {
      let value;
      if (seen) {
        try { value = await call("get"); }
        catch (e) { value = await call("hit"); }
      } else {
        value = await call("hit");
        try { localStorage.setItem(FLAG, "1"); } catch (e) {}
      }
      show(value);
    } catch (e) {
      out.textContent = "—";
    }
  })();
})();

/* =====================================================
   5) شريط التنقل (تمييز القسم الحالي أثناء التمرير)
   ===================================================== */
(function nav() {
  const tabs = [...document.querySelectorAll(".tab")];
  if (!tabs.length) return;

  let current = null;
  function setActive(id) {
    if (id !== current) {
      current = id;
      document.body.dataset.section = id;  // يغيّر الخلفية (CSS)
      document.dispatchEvent(new CustomEvent("sectionchange", { detail: id })); // يتحكم بالصوت
    }
    tabs.forEach((t) => {
      const on = t.dataset.target === id;
      t.classList.toggle("active", on);
      if (on) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
  }

  tabs.forEach((t) => t.addEventListener("click", () => setActive(t.dataset.target)));

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  tabs.forEach((t) => {
    const sec = document.getElementById(t.dataset.target);
    if (sec) io.observe(sec);
  });
})();

/* =====================================================
   6) الساعة (24 ساعة)
   ===================================================== */
(function clock() {
  const h = $("clkH"), m = $("clkM"), s = $("clkS");
  if (!h) return;

  let fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: CONFIG.timezone,
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    });
  } catch (e) {
    // منطقة زمنية غير صحيحة: نستخدم توقيت جهاز الزائر
    fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
  }

  // التاريخ الميلادي والهجري
  const gEl = $("dateG"), hEl = $("dateH");
  let gFmt = null, hFmt = null;
  try {
    gFmt = new Intl.DateTimeFormat("ar-LY-u-ca-gregory-nu-latn", {
      timeZone: CONFIG.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch (e) {}
  try {
    hFmt = new Intl.DateTimeFormat("ar-LY-u-ca-islamic-umalqura-nu-latn", {
      timeZone: CONFIG.timezone, day: "numeric", month: "long", year: "numeric",
    });
  } catch (e) {}

  let lastDay = "";
  function updateDates(now) {
    if (!gFmt || !gEl) return;
    const g = gFmt.format(now);
    if (g === lastDay) return;          // لا نعيد الحساب إلا عند تغيّر اليوم
    lastDay = g;
    gEl.textContent = g;
    if (hFmt && hEl) {
      const shifted = new Date(now.getTime() + CONFIG.hijriOffset * 86400000);
      hEl.textContent = hFmt.format(shifted);
    }
  }

  function tick() {
    const now = new Date();
    const parts = fmt.formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t).value;
    h.textContent = get("hour");
    m.textContent = get("minute");
    s.textContent = get("second");
    updateDates(now);
  }

  // نحدّث مع بداية كل ثانية تماماً
  (function loop() {
    tick();
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
  })();
})();

/* =====================================================
   7) قطرات تنزلق على زجاج بطاقة البروفايل
   ===================================================== */
(function glassDrops() {
  const canvas = $("glassDrops");
  if (!canvas) return;
  const card = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  let w = 0, h = 0, dpr = 1;
  let layer = null;          // طبقة القطرات الثابتة (تُرسم مرة واحدة)
  let runners = [];          // القطرات المنزلقة
  let running = false;

  // رسم قطرة واحدة: حافة داكنة، وبريق في الأعلى
  function drawDrop(c, x, y, r) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.40)");
    g.addColorStop(0.4, "rgba(200,220,240,0.10)");
    g.addColorStop(1, "rgba(8,10,16,0.32)");
    c.beginPath();
    c.ellipse(x, y, r * 0.88, r, 0, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
    c.lineWidth = 0.6;
    c.strokeStyle = "rgba(255,255,255,0.14)";
    c.stroke();
  }

  function buildLayer() {
    layer = document.createElement("canvas");
    layer.width = w * dpr;
    layer.height = h * dpr;
    const lc = layer.getContext("2d");
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 8500);
    for (let i = 0; i < n; i++) drawDrop(lc, rand(0, w), rand(0, h), rand(1.2, 3.6));
  }

  function resize() {
    w = card.clientWidth;
    h = card.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    runners = [];
    buildLayer();
    if (reduce || !running) paint();
  }

  function spawn() {
    if (runners.length >= 3) return;
    runners.push({
      x: rand(16, w - 16),
      y: rand(-6, h * 0.3),
      r: rand(3, 5.2),
      v: 0,
      stall: 0,
      trail: [],
    });
  }

  function step(r) {
    if (r.stall > 0) {
      r.stall--;
      r.v += (0.05 - r.v) * 0.2;
    } else {
      r.v += (rand(1.2, 2.6) - r.v) * 0.08;
      if (Math.random() < 0.025) r.stall = Math.round(rand(12, 45)); // تتوقف قليلاً ثم تكمل
    }
    r.x += rand(-0.15, 0.15);
    r.y += r.v;
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 46) r.trail.shift();
  }

  function paint() {
    ctx.clearRect(0, 0, w, h);
    if (layer) ctx.drawImage(layer, 0, 0, w, h);
    for (const r of runners) {
      // الأثر خلف القطرة
      ctx.lineCap = "round";
      for (let i = 1; i < r.trail.length; i++) {
        const a = (i / r.trail.length) * 0.16;
        ctx.strokeStyle = `rgba(200,220,240,${a})`;
        ctx.lineWidth = r.r * 0.5 * (i / r.trail.length) + 0.4;
        ctx.beginPath();
        ctx.moveTo(r.trail[i - 1].x, r.trail[i - 1].y);
        ctx.lineTo(r.trail[i].x, r.trail[i].y);
        ctx.stroke();
      }
      drawDrop(ctx, r.x, r.y, r.r);
    }
  }

  function frame() {
    if (!running) return;
    if (Math.random() < 0.014) spawn();
    runners.forEach(step);
    runners = runners.filter((r) => r.y < h + 12);
    paint();
    requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (reduce || on === running) return;
    running = on;
    if (on) requestAnimationFrame(frame);
  }

  // لا نرسم إلا والبطاقة ظاهرة في الشاشة
  new IntersectionObserver((e) => setRunning(e[0].isIntersecting), { threshold: 0.05 }).observe(card);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden));
  new ResizeObserver(resize).observe(card);
  resize();
})();

/* =====================================================
   8) ظهور الأقسام تدريجياً عند التمرير
   ===================================================== */
(function reveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  items.forEach((el) => io.observe(el));
})();

/* =====================================================
   9) بطاقة الرئيسية بمقاس ثابت يناسب الشاشة
   تُصغَّر تلقائياً إذا كانت الشاشة قصيرة، فلا تنزل الصفحة إلى أسفل
   ===================================================== */
(function fitHome() {
  const home = $("home");
  const card = $("card");
  if (!home || !card) return;

  const OVERHANG = 62;   // ارتفاع صورة البروفايل البارزة فوق البطاقة
  const MIN_ZOOM = 0.62; // لا نصغّر أكثر من هذا حتى تبقى القراءة ممكنة
  let current = 1;
  let queued = false;

  function fit() {
    queued = false;
    card.style.zoom = "1";                          // نقيس بالحجم الطبيعي
    const natural = card.offsetHeight + OVERHANG;
    const cs = getComputedStyle(home);
    const viewH = Math.min(window.innerHeight, document.documentElement.clientHeight);
    const avail = viewH - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const z = Math.max(MIN_ZOOM, Math.min(1, avail / natural));
    current = z;
    card.style.zoom = z < 0.999 ? String(z) : "1";
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(fit);
  }

  window.addEventListener("resize", queue);
  window.addEventListener("orientationchange", queue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  // يتغير ارتفاع البطاقة عند وصول حالة ديسكورد أو طي المشغل
  new ResizeObserver(queue).observe(card);
  queue();
})();

/* =====================================================
   10) قفل التمرير على الحاسوب (التنقل من الشريط فقط)
   ===================================================== */
(function lockDesktop() {
  const root = document.documentElement;
  const mq = window.matchMedia("(hover: hover) and (pointer: fine)");

  function apply() { root.classList.toggle("lock", mq.matches); }
  if (mq.addEventListener) mq.addEventListener("change", apply);
  apply();

  // عند تغيير حجم النافذة نعيد القسم الحالي إلى موضعه حتى لا ينزلق بين قسمين
  window.addEventListener("resize", () => {
    if (!root.classList.contains("lock")) return;
    const sec = document.getElementById(document.body.dataset.section);
    if (sec) sec.scrollIntoView({ behavior: "instant", block: "start" });
  });
})();
