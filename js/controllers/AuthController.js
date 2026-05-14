import { AuthApi } from "../services/AuthApi.js";
import { sanitizeHTML } from "../utils/helpers.js";

export class AuthController {
  constructor({ userModel, sessionModel, authView, onLoginSuccess }) {
    this.userModel = userModel;
    this.sessionModel = sessionModel;
    this.authView = authView;
    this.onLoginSuccess = onLoginSuccess;
    this.authApi = new AuthApi();
  }

  init() {
    this.authView.bindRegisterRoleToggle();
    this.authView.bindLoginRoleToggle();
    this.authView.bindTabs();
    this.authView.bindSendRegisterCode(() => this.handleSendRegisterCode());
    this.authView.bindRegisterSubmit(() => this.handleRegister());
    this.authView.bindLoginSubmit(() => this.handleLogin());
    this.authView.setInitialState();
  }

  async handleSendRegisterCode() {
    this.authView.clearFeedback();
    const formData = this.authView.getRegisterData();
    const email = sanitizeHTML(formData.email);

    if (!email) {
      this.authView.showFeedback("error", "Erro: Informe o e-mail institucional antes de enviar o codigo.", "register");
      return;
    }

    if (!this.isUmcEmail(email)) {
      this.authView.showFeedback("error", "Erro: Use um e-mail que contenha a palavra umc.", "register");
      return;
    }

    try {
      const result = await this.authApi.sendRegisterCode(email);
      this.authView.showRegisterCodeArea();
      this.authView.showEmailPreview(email);
      this.authView.showFeedback("success", result.message || "Codigo de confirmacao enviado para seu email.", "register");
    } catch (error) {
      this.authView.showFeedback("error", error.message, "register");
    }
  }

  async handleRegister() {
    this.authView.clearFeedback();
    const formData = this.authView.getRegisterData();

    const name = sanitizeHTML(formData.name);
    const email = sanitizeHTML(formData.email);
    const role = sanitizeHTML(formData.role);
    const rgm = formData.rgm ? sanitizeHTML(formData.rgm) : null;
    const password = sanitizeHTML(formData.password);
    const passwordConfirm = sanitizeHTML(formData.passwordConfirm);
    const verificationCode = sanitizeHTML(formData.verificationCode);

    if (!name || !email || !role || !password || !passwordConfirm) {
      this.authView.showFeedback("error", "Erro: Preencha todos os campos obrigatorios.", "register");
      return;
    }

    if (password !== passwordConfirm) {
      this.authView.showFeedback("error", "Erro: As senhas digitadas nao conferem.", "register");
      return;
    }

    if (!this.isUmcEmail(email)) {
      this.authView.showFeedback("error", "Erro: Registo permitido apenas para e-mails que contenham a palavra umc.", "register");
      return;
    }

    if (role === "student" && !rgm) {
      this.authView.showFeedback("error", "Erro: O campo RGM e obrigatorio para Aluno.", "register");
      return;
    }

    if (!verificationCode) {
      this.authView.showFeedback("error", "Erro: Digite o codigo de confirmacao enviado para o seu email.", "register");
      return;
    }

    try {
      const result = await this.authApi.register({
        name,
        email,
        rgm,
        password,
        role,
        verificationCode,
      });

      this.authView.showFeedback("success", result.message || "Registo efetuado com sucesso! A sua conta esta sob analise da coordenacao.", "register");
      this.authView.resetRegisterForm();
    } catch (error) {
      this.authView.showFeedback("error", error.message, "register");
    }
  }

  async handleLogin() {
    this.authView.clearFeedback();
    const data = this.authView.getLoginData();

    const selectedRole = data.selectedRole;
    const email = sanitizeHTML(data.email);
    const rgm = sanitizeHTML(data.rgm);
    const password = sanitizeHTML(data.password);

    if (!selectedRole || !email || !password) {
      this.authView.showFeedback("error", "Erro: Preencha todos os campos obrigatorios.");
      return;
    }

    if (!this.isUmcEmail(email)) {
      this.authView.showFeedback("error", "Acesso Negado: Insira um e-mail que contenha a palavra umc.");
      return;
    }

    if (selectedRole === "student" && !rgm) {
      this.authView.showFeedback("error", "Acesso Negado: O RGM e obrigatorio para Aluno.");
      return;
    }

    try {
      const result = await this.authApi.login({
        selectedRole,
        email,
        rgm,
        password,
      });

      this.sessionModel.start(result.user, result.token);
      this.authView.resetLoginForm();
      this.onLoginSuccess(result.user);
    } catch (error) {
      this.authView.showFeedback("error", error.message);
    }
  }

  isUmcEmail(email) {
    return email.toLowerCase().includes("umc");
  }
}
