export class AuthView {
  constructor() {
    this.registerRole = document.getElementById("registerRole");
    this.registerEmail = document.getElementById("registerEmail");
    this.sendRegisterCodeBtn = document.getElementById("sendRegisterCodeBtn");
    this.registerCodeArea = document.getElementById("registerCodeArea");
    this.registerCode = document.getElementById("registerCode");
    this.registerEmailPreview = document.getElementById("registerEmailPreview");
    this.rgmContainer = document.getElementById("rgmContainer");
    this.registerRgm = document.getElementById("registerRgm");
    this.loginRoleRadios = [...document.querySelectorAll('input[name="loginRole"]')];
    this.loginRgmContainer = document.getElementById("loginRgmContainer");
    this.loginRgm = document.getElementById("loginRgm");
    this.registerForm = document.getElementById("registerForm");
    this.loginForm = document.getElementById("loginForm");
    this.registerFeedback = document.getElementById("registerFeedback");
    this.loginFeedback = document.getElementById("loginFeedback");
    this.authTabs = [...document.querySelectorAll(".auth-tab")];
    this.authForms = [...document.querySelectorAll(".auth-form")];
  }

  bindRegisterRoleToggle() {
    this.registerRole?.addEventListener("change", () => {
      this.syncRegisterRoleState();
    });
  }

  bindLoginRoleToggle() {
    this.loginRoleRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.syncLoginRoleState();
      });
    });
  }

  bindRegisterSubmit(handler) {
    this.registerForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      handler();
    });
  }

  bindSendRegisterCode(handler) {
    this.sendRegisterCodeBtn?.addEventListener("click", () => {
      handler();
    });
  }

  bindLoginSubmit(handler) {
    this.loginForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      handler();
    });
  }

  bindTabs() {
    this.authTabs.forEach((tab) => {
      const isNavigationLink =
        tab.tagName.toLowerCase() === "a" && tab.getAttribute("href");

      if (isNavigationLink) {
        return;
      }

      tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;
        if (!targetTab) {
          return;
        }

        this.authTabs.forEach((item) => item.classList.remove("active"));
        this.authForms.forEach((form) => form.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(`${targetTab}Form`)?.classList.add("active");
        this.clearFeedback();
      });
    });
  }

  syncRegisterRoleState() {
    if (!this.registerRole || !this.rgmContainer || !this.registerRgm) {
      return;
    }

    const isStudent = this.registerRole.value === "student";
    this.rgmContainer.style.display = isStudent ? "block" : "none";
    this.registerRgm.required = isStudent;

    if (!isStudent) {
      this.registerRgm.value = "";
    }
  }

  syncLoginRoleState() {
    if (!this.loginRgmContainer || !this.loginRgm) {
      return;
    }

    const selectedRole = document.querySelector('input[name="loginRole"]:checked')?.value;
    const isStudent = selectedRole === "student";

    this.loginRgmContainer.style.display = isStudent ? "block" : "none";
    this.loginRgm.required = isStudent;

    if (!isStudent) {
      this.loginRgm.value = "";
    }
  }

  showFeedback(type, message, target = "login") {
    const element = target === "login" ? this.loginFeedback : this.registerFeedback;
    if (!element) {
      return;
    }

    element.textContent = message;
    element.className = `feedback ${type} active`;
    element.style.display = "block";
  }

  showRegisterCodeArea() {
    this.registerCodeArea?.classList.add("active");
    if (this.registerCode) {
      this.registerCode.required = true;
      this.registerCode.focus();
    }
  }

  showEmailPreview(email, code) {
    if (!this.registerEmailPreview) {
      return;
    }

    const codeLine = code
      ? `O seu codigo de confirmacao e <strong>${code}</strong>.`
      : "Verifique sua caixa de entrada para copiar o codigo recebido.";

    this.registerEmailPreview.innerHTML = `
      <strong>E-mail enviado para ${email}</strong><br>
      Assunto: Codigo de confirmacao - Lâminas UMC<br>
      ${codeLine}
    `;
    this.registerEmailPreview.classList.add("active");
  }

  hideRegisterCodeState() {
    this.registerCodeArea?.classList.remove("active");
    if (this.registerCode) {
      this.registerCode.required = false;
      this.registerCode.value = "";
    }
    if (this.registerEmailPreview) {
      this.registerEmailPreview.classList.remove("active");
      this.registerEmailPreview.innerHTML = "";
    }
  }

  clearFeedback() {
    [this.loginFeedback, this.registerFeedback].forEach((element) => {
      if (!element) {
        return;
      }

      element.className = "feedback";
      element.style.display = "none";
      element.textContent = "";
    });
  }

  resetRegisterForm() {
    this.registerForm?.reset();
    this.hideRegisterCodeState();
    this.syncRegisterRoleState();
  }

  resetLoginForm() {
    this.loginForm?.reset();
    this.syncLoginRoleState();
  }

  setInitialState() {
    this.syncRegisterRoleState();
    this.syncLoginRoleState();
  }

  getRegisterData() {
    const role = document.getElementById("registerRole")?.value ?? "";

    return {
      name: document.getElementById("registerName")?.value.trim() ?? "",
      email: document.getElementById("registerEmail")?.value.trim().toLowerCase() ?? "",
      verificationCode: document.getElementById("registerCode")?.value.trim() ?? "",
      role,
      rgm: role === "student" ? document.getElementById("registerRgm")?.value.trim() ?? "" : null,
      password: document.getElementById("registerPassword")?.value ?? "",
      passwordConfirm: document.getElementById("registerPasswordConfirm")?.value ?? "",
    };
  }

  getLoginData() {
    return {
      selectedRole: document.querySelector('input[name="loginRole"]:checked')?.value ?? "",
      email: document.getElementById("loginEmail")?.value.trim().toLowerCase() ?? "",
      rgm: document.getElementById("loginRgm")?.value.trim() ?? "",
      password: document.getElementById("loginPassword")?.value ?? "",
    };
  }
}
