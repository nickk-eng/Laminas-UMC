import { BaseStorage } from "./BaseStorage.js";
import { STORAGE_KEYS } from "../utils/constants.js";

const DEFAULT_USERS = [
  {
    id: "admin_001",
    name: "Coordenação Veterinária",
    email: "admin@umc.br",
    rgm: null,
    password: "admin",
    role: "admin",
    status: "approved",
  },
];

export class UserModel extends BaseStorage {
  ensureSeed() {
    const users = this.get(STORAGE_KEYS.users, null);
    if (!users) {
      this.set(STORAGE_KEYS.users, DEFAULT_USERS);
      return [...DEFAULT_USERS];
    }
    return users;
  }

  getAll() {
    return this.ensureSeed();
  }

  saveAll(users) {
    return this.set(STORAGE_KEYS.users, users);
  }

  findByEmailAndPassword(email, password) {
    return this.getAll().find((user) => user.email === email && user.password === password);
  }

  findDuplicate(email, rgm, role) {
    return this.getAll().find(
      (user) => user.email === email || (role === "student" && rgm && user.rgm === rgm),
    );
  }

  add(user) {
    const users = this.getAll();
    users.push(user);
    this.saveAll(users);
    return user;
  }

  updateStatus(userId, status) {
    const users = this.getAll();
    const index = users.findIndex((user) => String(user.id) === String(userId));
    if (index === -1) {
      return null;
    }
    users[index].status = status;
    this.saveAll(users);
    return users[index];
  }

  getPendings() {
    return this.getAll().filter((user) => user.status === "pending");
  }
}
