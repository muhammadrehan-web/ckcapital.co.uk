(function () {
  const home = document.getElementById("helpHome");
  const intro = document.getElementById("homeIntro");
  const hero = document.querySelector(".help-hero");
  const results = document.getElementById("searchResults");
  const views = [...document.querySelectorAll("[data-view]")];
  const input = document.querySelector(".help-search input");
  document.querySelector(".help-search")?.addEventListener("submit", (event) => event.preventDefault());

  function openHome() {
    if (home) home.hidden = false;
    if (intro) intro.hidden = false;
    views.forEach((view) => { view.hidden = true; });
    if (results) {
      results.hidden = true;
      results.innerHTML = "";
    }
    if (hero) hero.classList.remove("is-collection");
  }

  function openView(id) {
    const view = document.getElementById(id);
    if (!view) return;
    if (home) home.hidden = true;
    if (intro) intro.hidden = true;
    if (results) results.hidden = true;
    views.forEach((item) => { item.hidden = item.id !== id; });
    if (hero) hero.classList.add("is-collection");
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-open]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (input) input.value = "";
      openView(link.dataset.open);
      history.replaceState(null, "", "#" + link.dataset.open);
    });
  });

  document.querySelectorAll("[data-home]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (input) input.value = "";
      openHome();
      history.replaceState(null, "", location.pathname);
      window.scrollTo(0, 0);
    });
  });

  if (results) {
    results.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      event.preventDefault();
      if (input) input.value = "";
      openView(href.slice(1));
      history.replaceState(null, "", href);
    });
  }

  const index = [...document.querySelectorAll("[data-article]")].map((node) => ({
    title: node.dataset.article,
    href: node.dataset.href || ("#" + (node.closest("[data-view]") ? node.closest("[data-view]").id : ""))
  }));

  input?.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!home) {
      document.querySelectorAll(".article").forEach((row) => {
        row.hidden = query.length > 0 && !row.textContent.toLowerCase().includes(query);
      });
      return;
    }
    if (!query) {
      openHome();
      return;
    }
    if (home) home.hidden = true;
    if (intro) intro.hidden = false;
    views.forEach((view) => { view.hidden = true; });
    if (hero) hero.classList.remove("is-collection");
    const hits = index.filter((item) => item.title.toLowerCase().includes(query));
    results.hidden = false;
    results.innerHTML = hits.length
      ? `<div class="articles">${hits.map((hit) => `<a class="article" href="${hit.href}">${hit.title}</a>`).join("")}</div>`
      : `<p class="empty">No articles found.</p>`;
  });

  const hash = location.hash.slice(1);
  if (hash && document.getElementById(hash)?.hasAttribute("data-view")) openView(hash);
})();
