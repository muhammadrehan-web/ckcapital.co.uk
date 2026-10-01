(function () {
  const banner = document.getElementById("promoTopBanner");
  document.querySelector(".promoBannerClose")?.addEventListener("click", () => {
    banner.style.display = "none";
    document.body.style.paddingTop = "0";
  });
  document.getElementById("promoCopyButton")?.addEventListener("click", async () => {
    const code = "10KFOR19";
    try { await navigator.clipboard.writeText(code); } catch (e) {}
    const btn = document.getElementById("promoCopyButton");
    const prev = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("promoCodeBadgeCopied");
    setTimeout(() => { btn.textContent = prev; btn.classList.remove("promoCodeBadgeCopied"); }, 1500);
  });

  document.getElementById("discordClose")?.addEventListener("click", () => {
    document.getElementById("discordPopup").classList.remove("show");
  });
  setTimeout(() => document.getElementById("discordPopup")?.classList.add("show"), 6000);

  const burger = document.getElementById("burger");
  const drawer = document.getElementById("drawer");
  burger?.addEventListener("click", () => drawer.classList.add("open"));
  drawer?.addEventListener("click", (e) => { if (e.target === drawer) drawer.classList.remove("open"); });
  document.getElementById("drawerClose")?.addEventListener("click", () => drawer.classList.remove("open"));

  window.closeWin100kPopup = function () {
    const overlay = document.getElementById("popup-overlay-win100k");
    const backdrop = document.getElementById("popup-backdrop");
    if (overlay) overlay.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.closeWin100kPopup();
  });
  window.doSubscribeWin100k = function () {
    const input = document.getElementById("emailInput");
    const err = document.getElementById("errMsg");
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    err.style.opacity = ok ? "0" : "1";
    if (!ok) return;
    document.getElementById("popup-main-view").style.display = "none";
    document.getElementById("popup-success-view").style.display = "block";
  };

  const track = document.getElementById("sliderTrack");
  if (track) {
    track.innerHTML += track.innerHTML;
    let position = 0;
    let paused = false;
    track.parentElement.addEventListener("mouseenter", () => { paused = true; });
    track.parentElement.addEventListener("mouseleave", () => { paused = false; });
    function animate() {
      if (!paused) {
        position -= 0.6;
        const first = track.children[0];
        const w = first.offsetWidth + 20;
        if (-position >= w) { position += w; track.appendChild(first); }
        track.style.transform = "translateX(" + position + "px)";
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  let selectedPrice = "$5000";
  let currentStep = "2step";
  let currentPreference = "standard";

  function formatPrice(price) {
    const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
    if (n % 1 === 0) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function selectedPlatform() {
    const name = currentStep === "1step" ? "platform-1step" : currentStep === "instant" ? "platform-instant" : "platform-2step";
    const radio = document.querySelector('input[name="' + name + '"]:checked');
    return radio && radio.value === "mt5" ? "mt5" : "tradelocker";
  }
  function selectedPlan() {
    if (currentStep === "1step") return "onestep";
    if (currentStep === "instant") return "instant";
    if (currentPreference === "middle") return "middle";
    if (currentPreference === "lite") return "light";
    return "standard";
  }
  function sizeLabel(price) {
    const n = parseInt(String(price).replace(/\D/g, ""), 10);
    return n ? String(n / 1000) + "K" : "";
  }
  function updateCheckout() {
    const btn = document.querySelector('.sizes[data-step="' + currentStep + '"] .size-btn.active');
    const checkout = document.getElementById("checkout-btn");
    if (!btn || !checkout) return;
    checkout.onclick = () => {
      sessionStorage.setItem("ck_checkout", JSON.stringify({
        plan: selectedPlan(),
        size: sizeLabel(btn.dataset.price),
        platform: selectedPlatform()
      }));
      location.href = "portal.html#checkout";
    };
  }
  function sale(priceNum, table) {
    const map = table === "instant"
      ? { 5000: [48, 160], 10000: [78, 260], 25000: [139, 463.33], 50000: [274.5, 915], 100000: [549, 1830], 200000: [1098, 3660] }
      : { 5000: [19.2, 64], 10000: [39, 193], 25000: [68.4, 228], 50000: [108.24, 360.8], 100000: [229, 763.33], 200000: [634.5, 2115], 300000: [984.5, 3281.67] };
    return map[priceNum] || (table === "instant" ? [108, 180] : [53, 88]);
  }
  function priceHtml(now, old) {
    return '<span class="price-now">' + formatPrice(now) + '</span> <del class="price-old">' + formatPrice(old) + "</del>";
  }
  function showBadge() {
    document.querySelectorAll(".promo-badge-10k-always").forEach((el) => el.remove());
    if (currentStep !== "1step" && currentStep !== "2step") return;
    const box = document.querySelector('.sizes[data-step="' + currentStep + '"]');
    const ten = box?.querySelector('[data-price="$10000"]');
    if (!box || !ten) return;
    const b = document.createElement("div");
    b.className = "promo-badge-10k-always";
    b.textContent = "$39-limited only";
    const br = ten.getBoundingClientRect();
    const cr = box.getBoundingClientRect();
    b.style.left = (br.left - cr.left + br.width / 2) + "px";
    b.style.top = (br.bottom - cr.top - 10) + "px";
    box.appendChild(b);
  }
  function update1(priceNum) {
    const ratio = priceNum / 5000;
    const [now, old] = sale(priceNum);
    document.getElementById("profit-target").textContent = formatPrice(ratio * 500);
    document.getElementById("max-daily-loss").textContent = formatPrice(ratio * 200);
    document.getElementById("max-loss-1a").textContent = formatPrice(ratio * 300);
    document.getElementById("max-daily-loss-1b").textContent = formatPrice(ratio * 200);
    document.getElementById("max-loss-1b").textContent = formatPrice(ratio * 300);
    document.getElementById("price").innerHTML = priceHtml(now, old);
    setTimeout(showBadge, 10);
  }
  function update2(pref) {
    currentPreference = pref;
    const priceNum = parseInt(selectedPrice.replace(/\D/g, ""), 10);
    const ratio = priceNum / 5000;
    const [now, old] = sale(priceNum);
    const header = document.getElementById("step-1-header");
    header.innerHTML = pref === "middle" ? "STEP 1<br>MIDDLE CHALLENGE" : pref === "lite" ? "STEP 1<br>LITE CHALLENGE" : "STEP 1<br>STANDARD CHALLENGE";
    const p1 = pref === "standard" ? 500 : pref === "middle" ? 400 : 300;
    const p2 = pref === "lite" ? 300 : pref === "middle" ? 250 : 250;
    const loss = pref === "middle" ? 600 : 400;
    const cons = pref === "standard" ? "x" : pref === "middle" ? "30%" : "50%";
    document.getElementById("profit-target-step1").textContent = formatPrice(ratio * p1);
    document.getElementById("max-daily-loss-step1").textContent = formatPrice(ratio * 200);
    document.getElementById("max-loss-step1").textContent = formatPrice(ratio * loss);
    document.getElementById("consistency-step1").textContent = cons;
    document.getElementById("profit-target-step2").textContent = formatPrice(ratio * p2);
    document.getElementById("max-daily-loss-step2").textContent = formatPrice(ratio * 200);
    document.getElementById("max-loss-step2").textContent = formatPrice(ratio * loss);
    document.getElementById("consistency-step2").textContent = cons;
    document.getElementById("max-daily-loss-step3").textContent = formatPrice(ratio * 200);
    document.getElementById("max-loss-step3").textContent = formatPrice(ratio * loss);
    document.getElementById("consistency-step3").textContent = pref === "lite" ? "40%" : pref === "middle" ? "25%" : "x";
    document.getElementById("price-step1").innerHTML = priceHtml(now, old);
    updateCheckout();
    setTimeout(showBadge, 10);
  }
  function updateInstant() {
    const priceNum = parseInt(selectedPrice.replace(/\D/g, ""), 10);
    const ratio = priceNum / 5000;
    const [now, old] = sale(priceNum, "instant");
    document.getElementById("instant-max-daily-loss").textContent = formatPrice(Math.round(ratio * 150));
    document.getElementById("instant-max-loss").textContent = formatPrice(Math.round(ratio * 250));
    document.getElementById("instant-price").innerHTML = priceHtml(now, old);
  }
  function showStep(step) {
    currentStep = step;
    selectedPrice = "$5000";
    document.querySelectorAll(".radio-group, .sizes, .obj").forEach((el) => { el.style.display = "none"; });
    document.querySelectorAll(".tab-group button").forEach((b) => b.classList.remove("active"));
    document.getElementById("btn-" + step).classList.add("active");
    document.querySelector('.radio-group[data-step="' + step + '"]').style.display = "flex";
    const sizes = document.querySelector('.sizes[data-step="' + step + '"]');
    sizes.style.display = "flex";
    sizes.querySelectorAll(".size-btn").forEach((b) => b.classList.toggle("active", b.dataset.price === "$5000"));
    if (step === "1step") { document.getElementById("step-1-table").style.display = "table"; update1(5000); }
    if (step === "2step") { document.getElementById("step-2-table").style.display = "table"; update2(document.querySelector('input[name="preference-2step"]:checked').value); }
    if (step === "instant") { document.getElementById("instant-table").style.display = "table"; updateInstant(); }
    updateCheckout();
    setTimeout(showBadge, 10);
  }
  window.toggleStep = showStep;
  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = btn.parentElement.dataset.step;
      btn.parentElement.querySelectorAll(".size-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedPrice = btn.dataset.price;
      currentStep = step;
      const n = parseInt(selectedPrice.replace(/\D/g, ""), 10);
      if (step === "1step") update1(n);
      if (step === "2step") update2(document.querySelector('input[name="preference-2step"]:checked').value);
      if (step === "instant") updateInstant();
      updateCheckout();
    });
  });
  document.querySelectorAll('input[name="preference-2step"]').forEach((r) => {
    r.addEventListener("change", () => { if (currentStep === "2step" && !r.disabled) update2(r.value); });
  });
  document.querySelectorAll('input[name^="platform"]').forEach((r) => r.addEventListener("change", updateCheckout));
  window.addEventListener("resize", () => setTimeout(showBadge, 20));
  showStep("2step");

  document.querySelectorAll(".info-btn").forEach((btn) => {
    const pop = btn.querySelector(".popup");
    if (!pop) return;
    const place = () => {
      pop.style.position = "fixed";
      pop.style.transform = "none";
      pop.style.right = "auto";
      pop.style.bottom = "auto";
      const br = btn.getBoundingClientRect();
      pop.style.left = Math.round(br.left) + "px";
      pop.style.top = Math.round(br.bottom + 6) + "px";
      const r = pop.getBoundingClientRect();
      if (r.right > innerWidth - 8) pop.style.left = Math.round(innerWidth - r.width - 8) + "px";
      if (r.left < 8) pop.style.left = "8px";
      if (r.bottom > innerHeight - 84) pop.style.top = Math.round(br.top - r.height - 6) + "px";
    };
    btn.addEventListener("mouseenter", place);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !btn.classList.contains("open");
      document.querySelectorAll(".info-btn.open").forEach((b) => b.classList.remove("open"));
      if (!willOpen) return;
      btn.classList.add("open");
      place();
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".info-btn.open").forEach((b) => b.classList.remove("open"));
  });

  const pod = document.getElementById("podTrack");
  const originals = [...pod.children];
  const count = originals.length;
  originals.forEach((node) => pod.appendChild(node.cloneNode(true)));
  originals.forEach((node) => pod.appendChild(node.cloneNode(true)));
  const slides = [...pod.children];
  let podIndex = count;
  function renderPod(animate) {
    const slide = slides[0];
    const stage = pod.parentElement.clientWidth;
    const wide = innerWidth > 1024;
    let offset = 0;
    if (!wide) {
      slides.forEach((s) => { s.style.marginRight = ""; });
      const cs = getComputedStyle(slide);
      const ml = parseFloat(cs.marginLeft) || 0;
      const mr = parseFloat(cs.marginRight) || 0;
      const step = slide.offsetWidth + ml + mr;
      offset = stage / 2 - (ml + slide.offsetWidth / 2) - podIndex * step;
    } else {
      const margin = innerWidth >= 2560 ? 80 : 60;
      const itemW = (stage - margin) / 2;
      const step = itemW + margin;
      const inset = slide.offsetWidth * 0.05;
      const gap = Math.max(0, step - slide.offsetWidth) + "px";
      slides.forEach((s) => { if (s.style.marginRight !== gap) s.style.marginRight = gap; });
      const visualLeft = (stage - itemW) / 2 + margin + inset;
      offset = visualLeft - inset - podIndex * step;
    }
    if (!animate) pod.style.transition = "none";
    pod.style.transform = "translateX(" + offset + "px)";
    if (!animate) {
      void pod.offsetWidth;
      pod.style.transition = "";
    }
    slides.forEach((s, i) => s.classList.toggle("is-center", i === podIndex));
  }
  function wrapIndex() {
    if (podIndex >= count * 2) podIndex -= count;
    else if (podIndex < count) podIndex += count;
    else return;
    renderPod(false);
  }
  pod.addEventListener("transitionend", (e) => {
    if (e.target !== pod || e.propertyName !== "transform") return;
    wrapIndex();
  });
  document.querySelector(".custom-nav.next")?.addEventListener("click", () => { podIndex += 1; renderPod(true); });
  document.querySelector(".custom-nav.prev")?.addEventListener("click", () => { podIndex -= 1; renderPod(true); });
  window.addEventListener("resize", () => renderPod(false));
  renderPod(false);
})();
