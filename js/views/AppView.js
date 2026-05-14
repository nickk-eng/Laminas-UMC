import { PAGE_ROUTES } from "../utils/constants.js";

export class AppView {
  constructor() {
    this.navItems = [...document.querySelectorAll(".nav-item, .nav-item-sub")];
    this.goButtons = [...document.querySelectorAll("[data-go]")];
    this.logoutBtn = document.getElementById("logoutBtn");
    this.landingView = document.getElementById("landingView");
    this.appView = document.getElementById("appView");
    this.loggedUserName = document.getElementById("loggedUserName");
    this.logoHomeBtn = document.getElementById("logoHomeBtn");
    this.adminNavBtn = document.getElementById("navAdmin");
    this.speciesNavBtn = document.getElementById("navSpecies");
    this.anatomyNavBtn = document.getElementById("navAnatomy");
    this.currentPage = document.body.dataset.page || "login";
  }

  bindNavigation(handler) {
    this.navItems.forEach((item) => {
      if (item.dataset.page) {
        item.addEventListener("click", () => handler(item.dataset.page));
      }
    });

    this.goButtons.forEach((button) => {
      button.addEventListener("click", () => handler(button.dataset.go));
    });

    this.logoHomeBtn?.addEventListener("click", () => handler("upload"));
  }

  bindLogout(handler) {
    this.logoutBtn?.addEventListener("click", handler);
  }

  showPage(pageId) {
    const route = PAGE_ROUTES[pageId];
    if (!route) {
      return;
    }
    if (!window.location.pathname.endsWith(`/${route}`) && !window.location.pathname.endsWith(route)) {
      window.location.href = `./${route}`;
      return;
    }
    this.setActiveNavigation(pageId);
  }

  setActiveNavigation(pageId = this.currentPage) {
    this.navItems.forEach((item) => {
      if (item.dataset.page) {
        item.classList.toggle("active", item.dataset.page === pageId);
      }
    });
  }

  showApp(user) {
    if (this.landingView) {
      this.landingView.style.display = "none";
    }
    if (this.appView) {
      this.appView.style.display = "flex";
    }
    if (this.loggedUserName) {
      this.loggedUserName.textContent = user.name.split(" ")[0];
    }
    this.setActiveNavigation();
  }

  showLanding() {
    window.location.href = "./login.html";
  }

  toggleAdminNavigation(access = {}) {
    this.setNavVisibility(this.adminNavBtn, access.manageAccess);
    this.setNavVisibility(this.speciesNavBtn, access.manageSpecies);
    this.setNavVisibility(this.anatomyNavBtn, access.manageLesions);
  }

  setNavVisibility(element, isVisible) {
    if (element) {
      element.style.display = isVisible ? "block" : "none";
    }
  }
}
