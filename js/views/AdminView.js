export class AdminView {
  constructor() {
    this.studentsList = document.getElementById("studentsList");
    this.teachersList = document.getElementById("teachersList");
    this.tabs = [...document.querySelectorAll(".tab")];
    this.tabContents = [...document.querySelectorAll(".admin-tab-content")];
    this.studentPermissionSearch = document.getElementById("studentPermissionSearch");
    this.studentPermissionResults = document.getElementById("studentPermissionResults");
    this.studentPermissionPanel = document.getElementById("studentPermissionPanel");
    this.studentPermissionSummary = document.getElementById("studentPermissionSummary");
    this.permissionPassword = document.getElementById("permissionOperatorPassword");
    this.applyStudentPermissionsButton = document.getElementById("applyStudentPermissions");
    this.permissionInputs = {
      deleteComparisonRecords: document.getElementById("permDeleteComparisonRecords"),
      manageSpecies: document.getElementById("permManageSpecies"),
      manageLesions: document.getElementById("permManageLesions"),
      manageAccess: document.getElementById("permManageAccess"),
    };
    this.studentPermissionsTab = document.querySelector('[data-admin-tab="studentPermissions"]');
    this.studentPermissionsContent = document.getElementById("studentPermissionsTab");
  }

  configureStudentPermissionAccess(canManageStudentPermissions) {
    const display = canManageStudentPermissions ? "" : "none";

    if (this.studentPermissionsTab) {
      this.studentPermissionsTab.style.display = display;
    }

    if (this.studentPermissionsContent) {
      this.studentPermissionsContent.style.display = display;
      this.studentPermissionsContent.classList.remove("active");
    }

    if (!canManageStudentPermissions) {
      const firstTab = this.tabs.find((tab) => tab.dataset.adminTab !== "studentPermissions");
      const firstContent = firstTab ? document.getElementById(`${firstTab.dataset.adminTab}Tab`) : null;
      this.tabs.forEach((item) => item.classList.remove("active"));
      this.tabContents.forEach((item) => item.classList.remove("active"));
      firstTab?.classList.add("active");
      firstContent?.classList.add("active");
    }
  }

  bindTabSwitch() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (tab.style.display === "none") {
          return;
        }

        this.tabs.forEach((item) => item.classList.remove("active"));
        this.tabContents.forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");
        const contentId = `${tab.dataset.adminTab}Tab`;
        document.getElementById(contentId)?.classList.add("active");
      });
    });
  }

  bindStudentPermissionSearch(handler) {
    this.studentPermissionSearch?.addEventListener("input", () => {
      handler(this.studentPermissionSearch.value.trim());
    });
  }

  bindStudentPermissionSubmit(handler) {
    this.applyStudentPermissionsButton?.addEventListener("click", () => {
      handler(this.getPermissionFormData());
    });
  }

  renderPendings(pendings, onDecision) {
    [this.studentsList, this.teachersList].forEach((list) => {
      if (list) {
        list.innerHTML = "";
      }
    });

    if (pendings.length === 0) {
      if (this.studentsList) {
        this.studentsList.innerHTML = '<p style="color:var(--muted); padding:20px;">Nenhuma solicitação pendente.</p>';
      }
      if (this.teachersList) {
        this.teachersList.innerHTML = '<p style="color:var(--muted); padding:20px;">Nenhuma solicitação pendente.</p>';
      }
      return;
    }

    pendings.forEach((user) => {
      const list = user.role === "student" ? this.studentsList : this.teachersList;
      if (!list) {
        return;
      }

      const card = document.createElement("div");
      card.className = "approval-item";
      const userInfo = user.role === "student"
        ? `<h4>${user.name} <span style="font-size: 13px; color: var(--vet-primary); margin-left: 8px;">(RGM: ${user.rgm})</span></h4>`
        : `<h4>${user.name}</h4>`;

      card.innerHTML = `
        <div>
          ${userInfo}
          <p>${user.email}</p>
        </div>
        <div class="approval-actions">
          <button class="approve-btn" data-action="approve">Aprovar</button>
          <button class="reject-btn" data-action="reject">Rejeitar</button>
        </div>
      `;

      card.querySelector('[data-action="approve"]').addEventListener("click", () => onDecision(user.id, true));
      card.querySelector('[data-action="reject"]').addEventListener("click", () => onDecision(user.id, false));
      list.appendChild(card);
    });
  }

  renderStudentPermissionSearchResults(users, onSelect) {
    if (!this.studentPermissionResults) {
      return;
    }

    this.studentPermissionResults.innerHTML = "";

    const term = this.studentPermissionSearch?.value.trim() || "";
    if (!term) {
      this.hideStudentPermissionPanel();
      return;
    }

    if (term.length < 2) {
      this.studentPermissionResults.innerHTML =
        '<div class="search-empty" style="padding:15px; color:#64748b; font-size:14px;">Digite pelo menos 2 caracteres do RGM.</div>';
      this.hideStudentPermissionPanel();
      return;
    }

    if (users.length === 0) {
      this.studentPermissionResults.innerHTML =
        '<div class="search-empty" style="padding:15px; color:#64748b; font-size:14px;">Nenhum aluno encontrado.</div>';
      this.hideStudentPermissionPanel();
      return;
    }

    users.forEach((user) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result-item";
      button.innerHTML = `
        <strong>${user.name}</strong>
        <span style="font-size:12px; color:#64748b; margin-top:4px; display:block;">RGM: ${user.rgm || "Nao informado"} • ${user.email}</span>
      `;
      button.addEventListener("click", () => onSelect(user));
      this.studentPermissionResults.appendChild(button);
    });
  }

  renderSelectedStudentPermissions(user) {
    if (!this.studentPermissionPanel || !this.studentPermissionSummary) {
      return;
    }

    this.studentPermissionPanel.hidden = false;
    this.studentPermissionSummary.innerHTML = `
      <strong>${user.name}</strong><br>
      <span>RGM: ${user.rgm || "Nao informado"}</span><br>
      <span>E-mail: ${user.email}</span>
    `;

    const permissions = user.permissions || {};
    Object.entries(this.permissionInputs).forEach(([key, input]) => {
      if (input) {
        input.checked = Boolean(permissions[key]);
      }
    });

    if (this.permissionPassword) {
      this.permissionPassword.value = "";
    }
  }

  hideStudentPermissionPanel() {
    if (this.studentPermissionPanel) {
      this.studentPermissionPanel.hidden = true;
    }
  }

  getPermissionFormData() {
    return {
      password: this.permissionPassword?.value || "",
      permissions: Object.fromEntries(
        Object.entries(this.permissionInputs).map(([key, input]) => [key, Boolean(input?.checked)]),
      ),
    };
  }
}
