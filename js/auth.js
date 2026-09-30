document.querySelectorAll("[data-eye]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  });
});

document.querySelectorAll("form.auth-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (/forgot/.test(location.pathname)) {
      const note = form.querySelector(".auth-note");
      if (note) note.hidden = false;
      return;
    }
    location.href = "portal.html";
  });
});
