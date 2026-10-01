const COUNTRIES = window.CK_COUNTRIES || [];

function setupSignupPickers() {
  if (!document.querySelector(".is-signup")) return;
  const countryMenu = document.querySelector("[data-menu=country]");
  const countryInput = document.querySelector("[name=country]");
  const codeInput = document.querySelector("[name=code]");
  if (!countryMenu || !countryInput) return;

  function showList(query) {
    const text = query.trim().toLowerCase();
    countryMenu.innerHTML = "";
    COUNTRIES.forEach(([name, code]) => {
      if (text && name.toLowerCase().indexOf(text) === -1) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.name = name;
      button.dataset.code = code;
      button.textContent = name;
      if (name.toLowerCase() === countryInput.value.trim().toLowerCase()) button.classList.add("is-on");
      countryMenu.appendChild(button);
    });
    countryMenu.hidden = countryMenu.children.length === 0;
  }

  countryInput.addEventListener("focus", () => showList(""));
  countryInput.addEventListener("input", () => showList(countryInput.value));
  countryMenu.addEventListener("mousedown", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    event.preventDefault();
    countryInput.value = button.dataset.name;
    if (codeInput) codeInput.value = button.dataset.code;
    countryMenu.hidden = true;
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-menu=country]") && event.target !== countryInput) {
      countryMenu.hidden = true;
    }
  });
}

setupSignupPickers();

document.querySelectorAll("[data-eye]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  });
});

function showNote(form, text) {
  const note = form.querySelector(".auth-note");
  if (!note) return;
  note.hidden = false;
  note.textContent = text;
}

document.querySelectorAll("form.auth-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (/forgot/.test(location.pathname)) {
      const step = form.querySelector(".reset-step");
      const data = Object.fromEntries(new FormData(form).entries());
      const submit = form.querySelector(".auth-submit");
      if (step && step.hidden) {
        fetch("api/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email })
        }).then(function (response) {
          return response.json().then(function (body) {
            return { ok: response.ok, body: body };
          });
        }).then(function (result) {
          if (!result.ok) {
            showNote(form, result.body.error || "This email is not registered.");
            return;
          }
          form.querySelector("[name=token]").value = result.body.token;
          step.hidden = false;
          if (submit) submit.textContent = "Save Password";
          showNote(form, "Choose a new password. Nothing is sent to CK Capital.");
        }).catch(function () {
          showNote(form, "Could not start the reset.");
        });
        return;
      }
      fetch("api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token, password: data.password, confirm: data.confirm })
      }).then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      }).then(function (result) {
        if (!result.ok) {
          showNote(form, result.body.error || "Could not update the password.");
          return;
        }
        showNote(form, "Password updated. Sign in with the new password.");
        window.setTimeout(function () { location.href = "signin.html"; }, 900);
      }).catch(function () {
        showNote(form, "Could not update the password.");
      });
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    if (/signup/.test(location.pathname)) {
      const missing = ["firstName", "lastName", "nickName", "code", "contact", "email", "confirmEmail", "country", "city", "password"].some(function (name) {
        return !String(data[name] || "").trim();
      });
      if (missing || !form.querySelector("[name=robot]").checked) {
        showNote(form, "Fill every field before signing up.");
        return;
      }
      fetch("api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      }).then(function (result) {
        if (!result.ok) {
          showNote(form, result.body.error || "Could not save this account.");
          return;
        }
        showNote(form, result.body.emailSent ? "Welcome email sent. Opening your portal." : "Account saved. Welcome email could not be sent.");
        window.setTimeout(function () { location.href = "portal.html"; }, 900);
      }).catch(function () {
        showNote(form, "Could not save this account.");
      });
      return;
    }
    fetch("api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password })
    }).then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, body: body };
      });
    }).then(function (result) {
      if (!result.ok) {
        showNote(form, result.body.error || "This email is not registered.");
        return;
      }
      location.href = "portal.html";
    }).catch(function () {
      showNote(form, "Could not sign in.");
    });
  });
});
