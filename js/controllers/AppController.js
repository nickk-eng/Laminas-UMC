import { PROTECTED_PAGES, ADMIN_PAGES, PERMISSION_KEYS } from "../utils/constants.js";
import { UserModel } from "../models/UserModel.js";
import { SessionModel } from "../models/SessionModel.js";
import { SpeciesModel } from "../models/SpeciesModel.js";
import { DiseaseModel } from "../models/DiseaseModel.js";
import { ExamModel } from "../models/ExamModel.js";
import { AppView } from "../views/AppView.js";
import { AuthView } from "../views/AuthView.js";
import { CatalogView } from "../views/CatalogView.js";
import { AdminView } from "../views/AdminView.js";
import { UploadView } from "../views/UploadView.js";
import { ComparisonView } from "../views/ComparisonView.js";
import { AuthApi } from "../services/AuthApi.js";
import { AuthController } from "./AuthController.js";
import { CatalogController } from "./CatalogController.js";
import { AdminController } from "./AdminController.js";
import { UploadController } from "./UploadController.js";
import { ComparisonController } from "./ComparisonController.js";

export class AppController {
  constructor() {
    this.userModel = new UserModel();
    this.sessionModel = new SessionModel();
    this.speciesModel = new SpeciesModel();
    this.diseaseModel = new DiseaseModel();
    this.examModel = new ExamModel();
    this.authApi = new AuthApi();

    this.appView = new AppView();
    this.authView = new AuthView();
    this.catalogView = new CatalogView();
    this.adminView = new AdminView();
    this.uploadView = new UploadView();
    this.comparisonView = new ComparisonView();

    this.currentPage = document.body.dataset.page || "login";

    this.authController = new AuthController({
      userModel: this.userModel,
      sessionModel: this.sessionModel,
      authView: this.authView,
      onLoginSuccess: (user) => this.startSystem(user),
    });

    this.catalogController = new CatalogController({
      speciesModel: this.speciesModel,
      diseaseModel: this.diseaseModel,
      catalogView: this.catalogView,
    });

    this.adminController = new AdminController({
      userModel: this.userModel,
      adminView: this.adminView,
      sessionModel: this.sessionModel,
    });

    this.comparisonController = new ComparisonController({
      examModel: this.examModel,
      comparisonView: this.comparisonView,
      sessionModel: this.sessionModel,
    });

    this.uploadController = new UploadController({
      examModel: this.examModel,
      uploadView: this.uploadView,
      sessionModel: this.sessionModel,
      onSaved: (source) => this.comparisonController.handleSaved(source),
    });
  }

  async init() {
    this.bindCoreNavigation();

    let session = this.sessionModel.getSession();
    session = await this.refreshSessionUser(session);

    if (this.isAuthPage()) {
      await this.safeRun("authController.init", () => this.authController.init());

      if (session.user && session.token && session.role) {
        await this.startSystem({ name: session.user, role: session.role, permissions: session.permissions });
      }

      return;
    }

    if (this.requiresAuth() && !this.sessionModel.isAuthenticated()) {
      alert("Acesso Negado: Por favor, inicie sessao para aceder aos recursos da clinica.");
      this.appView.showLanding();
      return;
    }

    if (this.requiresAdmin() && !this.canAccessRestrictedPage(this.currentPage, session)) {
      alert("Acesso Restrito: A sua conta nao possui permissao para aceder a esta funcionalidade.");
      this.showPage("upload");
      return;
    }

    if (session.user && session.token && session.role) {
      await this.startSystem({ name: session.user, role: session.role, permissions: session.permissions });
    }

    await this.initPageModules();
  }

  bindCoreNavigation() {
    this.safeRun("bindNavigation", () => {
      this.appView.bindNavigation((pageId) => this.showPage(pageId));
    });

    this.safeRun("bindLogout", () => {
      this.appView.bindLogout(() => this.logout());
    });
  }

  async initPageModules() {
    await this.safeRun("catalogController.init", () => this.catalogController.init());

    if (this.currentPage === "upload") {
      await this.safeRun("uploadController.init", () => this.uploadController.init());
      return;
    }

    if (this.currentPage === "compare") {
      await this.safeRun("comparisonController.init", () => this.comparisonController.init());
      return;
    }

    if (this.currentPage === "admin") {
      await this.safeRun("adminController.init", () => this.adminController.init());
      await this.safeRun("adminController.render", () => this.adminController.render());
      return;
    }

    if (["species", "anatomy"].includes(this.currentPage)) {
      return;
    }
  }

  showPage(pageId) {
    if (PROTECTED_PAGES.includes(pageId) && !this.sessionModel.isAuthenticated()) {
      alert("Acesso Negado: Por favor, inicie sessao para aceder aos recursos da clinica.");
      this.appView.showLanding();
      return;
    }

    if (ADMIN_PAGES.includes(pageId) && !this.canAccessRestrictedPage(pageId)) {
      alert("Acesso Restrito: A sua conta nao possui permissao para aceder a esta funcionalidade.");
      return;
    }

    this.appView.showPage(pageId);
  }

  async startSystem(user) {
    const access = this.getAccessMap(user);

    this.safeRun("appView.showApp", () => this.appView.showApp(user));
    this.safeRun("appView.toggleAdminNavigation", () => this.appView.toggleAdminNavigation(access));

    if (["login", "register"].includes(this.currentPage)) {
      this.showPage("upload");
      return;
    }

    if (access.manageAccess) {
      await this.safeRun("adminController.render", () => this.adminController.render());
    }

    await this.safeRun("appView.setActiveNavigation", () => this.appView.setActiveNavigation(this.currentPage));
  }

  logout() {
    this.sessionModel.clear();
    this.appView.showLanding();
  }

  isAuthPage() {
    return ["login", "register"].includes(this.currentPage);
  }

  requiresAuth() {
    return PROTECTED_PAGES.includes(this.currentPage);
  }

  requiresAdmin() {
    return ADMIN_PAGES.includes(this.currentPage);
  }

  async refreshSessionUser(session) {
    if (!session.token) {
      return session;
    }

    try {
      const result = await this.authApi.getCurrentUser();
      this.sessionModel.start(result.user, session.token);
      return this.sessionModel.getSession();
    } catch {
      return session;
    }
  }

  canAccessRestrictedPage(pageId, session = this.sessionModel.getSession()) {
    const access = this.getAccessMap({
      role: session.role,
      permissions: session.permissions,
    });

    const pagePermission = {
      admin: "manageAccess",
      species: "manageSpecies",
      anatomy: "manageLesions",
    };

    return Boolean(access[pagePermission[pageId]]);
  }

  getAccessMap(user = {}) {
    const role = user.role || this.sessionModel.getRole();
    const permissions = user.permissions || this.sessionModel.getPermissions();
    const isProfessorAccount = role && role !== "student";

    return {
      manageAccess: isProfessorAccount || Boolean(permissions[PERMISSION_KEYS.manageAccess]),
      manageSpecies: isProfessorAccount || Boolean(permissions[PERMISSION_KEYS.manageSpecies]),
      manageLesions: isProfessorAccount || Boolean(permissions[PERMISSION_KEYS.manageLesions]),
    };
  }

  async safeRun(label, callback) {
    try {
      await callback();
    } catch (error) {
      console.error(`[AppController] Erro em ${label}:`, error);
      alert(error.message || "Erro ao carregar dados do sistema.");
    }
  }
}
