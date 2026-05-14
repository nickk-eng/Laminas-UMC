import { SESSION_KEYS } from "../utils/constants.js";

export class SessionModel {
  getSession() {
    return {
      token: sessionStorage.getItem(SESSION_KEYS.token),
      user: sessionStorage.getItem(SESSION_KEYS.user),
      role: sessionStorage.getItem(SESSION_KEYS.role),
      permissions: this.getPermissions(),
    };
  }

  start(user, token) {
    sessionStorage.setItem(SESSION_KEYS.token, token);
    sessionStorage.setItem(SESSION_KEYS.user, user.name);
    sessionStorage.setItem(SESSION_KEYS.role, user.role);
    sessionStorage.setItem(SESSION_KEYS.permissions, JSON.stringify(user.permissions || {}));
  }

  clear() {
    Object.values(SESSION_KEYS).forEach((key) => sessionStorage.removeItem(key));
  }

  isAuthenticated() {
    return Boolean(sessionStorage.getItem(SESSION_KEYS.token));
  }

  getRole() {
    return sessionStorage.getItem(SESSION_KEYS.role);
  }

  getUserName() {
    return sessionStorage.getItem(SESSION_KEYS.user);
  }

  getPermissions() {
    const value = sessionStorage.getItem(SESSION_KEYS.permissions);
    if (!value) {
      return {};
    }

    try {
      return JSON.parse(value) || {};
    } catch {
      return {};
    }
  }
}
