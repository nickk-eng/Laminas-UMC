import { SESSION_KEYS } from "../utils/constants.js";

const isLocalFrontend = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const DEFAULT_API_BASE =
  window.location.protocol === "file:" || (isLocalFrontend && window.location.port !== "3000")
    ? "http://127.0.0.1:3000/api"
    : `${window.location.origin}/api`;

export class AuthApi {
  constructor(apiBase = window.LAMINAS_API_URL || DEFAULT_API_BASE) {
    this.apiBase = apiBase.replace(/\/$/, "");
  }

  sendRegisterCode(email) {
    return this.request("/auth/send-code", {
      method: "POST",
      body: { email },
    });
  }

  register(data) {
    return this.request("/auth/register", {
      method: "POST",
      body: data,
    });
  }

  login(data) {
    return this.request("/auth/login", {
      method: "POST",
      body: data,
    });
  }

  getCurrentUser() {
    return this.request("/auth/me", {
      token: this.getToken(),
    });
  }

  getPendingUsers() {
    return this.request("/admin/pending-users", {
      token: this.getToken(),
    });
  }

  updateUserStatus(userId, status) {
    return this.request(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      token: this.getToken(),
      body: { status },
    });
  }

  searchStudentsByRgm(rgm) {
    return this.request(`/admin/students/search?rgm=${encodeURIComponent(rgm)}`, {
      token: this.getToken(),
    });
  }

  updateStudentPermissions(userId, permissions, password) {
    return this.request(`/admin/students/${encodeURIComponent(userId)}/permissions`, {
      method: "PATCH",
      token: this.getToken(),
      body: { permissions, password },
    });
  }

  getCatalog() {
    return this.request("/catalog", {
      token: this.getToken(),
    });
  }

  addSpeciesWithBreeds(speciesName, breeds) {
    return this.request("/catalog/species", {
      method: "POST",
      token: this.getToken(),
      body: { speciesName, breeds },
    });
  }

  addOrganLesion(entry) {
    return this.request("/catalog/organ-lesions", {
      method: "POST",
      token: this.getToken(),
      body: entry,
    });
  }

  addBoneLesion(entry) {
    return this.request("/catalog/bone-lesions", {
      method: "POST",
      token: this.getToken(),
      body: entry,
    });
  }

  getExamCollection(collection) {
    return this.request(`/exams?collection=${encodeURIComponent(collection)}`, {
      token: this.getToken(),
    });
  }

  addExam(collection, item) {
    return this.request(`/exams/${encodeURIComponent(collection)}`, {
      method: "POST",
      token: this.getToken(),
      body: item,
    });
  }

  removeExam(recordId) {
    return this.request(`/exams/${encodeURIComponent(recordId)}`, {
      method: "DELETE",
      token: this.getToken(),
    });
  }

  getToken() {
    return sessionStorage.getItem(SESSION_KEYS.token);
  }

  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    let response;
    try {
      response = await fetch(`${this.apiBase}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new Error("Nao foi possivel conectar ao backend. Inicie o servidor com npm run dev.");
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallbackMessages = {
        400: "Verifique os dados preenchidos.",
        401: "E-mail ou palavra-passe incorretos.",
        403: "Acesso negado para este perfil.",
        404: "Rota do servidor nao encontrada.",
        500: "Erro interno do servidor.",
      };

      throw new Error(payload.message || fallbackMessages[response.status] || "Erro ao comunicar com o servidor.");
    }

    return payload;
  }
}
