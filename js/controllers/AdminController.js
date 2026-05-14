import { AuthApi } from "../services/AuthApi.js";

export class AdminController {
  constructor({ userModel, adminView, sessionModel }) {
    this.userModel = userModel;
    this.adminView = adminView;
    this.sessionModel = sessionModel;
    this.authApi = new AuthApi();
    this.selectedStudent = null;
    this.searchTimer = null;
  }

  init() {
    this.adminView.configureStudentPermissionAccess(this.canManageStudentPermissions());
    this.adminView.bindTabSwitch();
    this.adminView.bindStudentPermissionSearch((rgm) => this.handleStudentPermissionSearch(rgm));
    this.adminView.bindStudentPermissionSubmit((data) => this.handleStudentPermissionApply(data));
  }

  async render() {
    try {
      const result = await this.authApi.getPendingUsers();
      this.adminView.renderPendings(result.users, (userId, isApproved) => this.handleDecision(userId, isApproved));
    } catch (error) {
      this.adminView.renderPendings([], () => {});
      alert(error.message);
    }
  }

  async handleDecision(userId, isApproved) {
    try {
      const result = await this.authApi.updateUserStatus(userId, isApproved ? "approved" : "rejected");
      await this.render();
      alert(isApproved ? `Acesso liberado para ${result.user.name}.` : "Solicitacao rejeitada.");
    } catch (error) {
      alert(error.message);
    }
  }

  handleStudentPermissionSearch(rgm) {
    if (!this.canManageStudentPermissions()) {
      return;
    }

    window.clearTimeout(this.searchTimer);

    if (!rgm || rgm.length < 2) {
      this.selectedStudent = null;
      this.adminView.renderStudentPermissionSearchResults([], () => {});
      return;
    }

    this.searchTimer = window.setTimeout(async () => {
      try {
        const result = await this.authApi.searchStudentsByRgm(rgm);
        this.adminView.renderStudentPermissionSearchResults(result.users || [], (student) => {
          this.selectedStudent = student;
          this.adminView.renderSelectedStudentPermissions(student);
        });
      } catch (error) {
        this.selectedStudent = null;
        this.adminView.renderStudentPermissionSearchResults([], () => {});
        alert(error.message);
      }
    }, 250);
  }

  async handleStudentPermissionApply(data) {
    if (!this.canManageStudentPermissions()) {
      alert("Apenas professores podem alterar permissoes de alunos.");
      return;
    }

    if (!this.selectedStudent) {
      alert("Selecione um aluno antes de aplicar permissoes.");
      return;
    }

    if (!data.password) {
      alert("Digite a senha da sua conta para confirmar a alteracao.");
      return;
    }

    try {
      const result = await this.authApi.updateStudentPermissions(
        this.selectedStudent.id,
        data.permissions,
        data.password,
      );
      this.selectedStudent = result.user;
      this.adminView.renderSelectedStudentPermissions(result.user);
      alert(`Permissoes atualizadas para ${result.user.name}.`);
    } catch (error) {
      alert(error.message);
    }
  }

  canManageStudentPermissions() {
    return this.sessionModel?.getRole() !== "student";
  }
}
