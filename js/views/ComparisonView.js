export class ComparisonView {
  constructor() {
    this.sickSearch = document.getElementById("sickSearch");
    this.sickResults = document.getElementById("sickResults");
    this.healthyPanel = document.getElementById("healthyPanel");
    this.sickPanel = document.getElementById("sickPanel");
    this.comparisonArea = document.getElementById("comparisonArea");
    this.modeButtons = [...document.querySelectorAll("[data-compare-mode]")];
    this.quickFilters = [];
    this.sickSearchLabel = document.getElementById("sickSearchLabel");
    this.sickPanelTitle = document.getElementById("sickPanelTitle");
    this.healthyPanelTitle = document.getElementById("healthyPanelTitle");
    this.comparisonLightbox = document.getElementById("comparisonLightbox");
    this.comparisonLightboxImage = document.getElementById("comparisonLightboxImage");
    this.comparisonLightboxCaption = document.getElementById("comparisonLightboxCaption");
    this.comparisonLightboxClose = document.getElementById("comparisonLightboxClose");
    this.canDeleteRecords = false;
    this.bindComparisonLightbox();
  }

  setCanDeleteRecords(canDeleteRecords) {
    this.canDeleteRecords = Boolean(canDeleteRecords);
  }

  bindModeSwitch(handler) {
    this.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.modeButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        handler(button.dataset.compareMode);
      });
    });
  }

  bindQuickFilters(handler) {
    this.quickFilters.forEach((tag) => tag.addEventListener("click", handler));
  }

  bindSearch(onSickSearch) {
    this.sickSearch?.addEventListener("input", () => {
      this.quickFilters.forEach((item) => item.classList.remove("active"));
      onSickSearch();
    });
  }

  setCompareMode(mode) {
    if (this.sickSearchLabel) {
      this.sickSearchLabel.textContent = "Selecionar Caso Patológico (Lâmina)";
    }

    if (this.sickSearch) {
      this.sickSearch.placeholder = "🔍 Ex: HE, biópsia, citologia, hepática...";
      this.sickSearch.value = "";
    }

    if (this.sickPanelTitle) {
      this.sickPanelTitle.textContent = "Achado Microscópico (Patológico)";
    }

    if (this.healthyPanelTitle) {
      this.healthyPanelTitle.textContent = "Lâmina de Referência (Saudável)";
    }

    this.clearResults();
    this.toggleHealthyPanel(false);
  }

  getSickSearchTerm() {
    return this.sickSearch?.value.trim() ?? "";
  }

  renderSickResults(filteredItems, selectedData, onSelect) {
    if (!this.sickResults) {
      return;
    }

    const searchValue = this.getSickSearchTerm();
    this.sickResults.innerHTML = "";

    if (!searchValue) {
      return;
    }

    if (filteredItems.length === 0) {
      this.sickResults.innerHTML =
        '<div class="search-empty" style="padding:15px; color:#64748b; font-size:14px;">Nenhum resultado encontrado.</div>';
      return;
    }

    filteredItems.forEach((data) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result-item";

      const isSelected = selectedData && selectedData.type === data.type && selectedData.index === data.index;
      if (isSelected) {
        button.classList.add("active");
      }

      button.innerHTML = `
        <strong>${data.title}</strong>
        <span style="font-size:12px; color:#64748b; margin-top:4px; display:block;">${data.subtext}</span>
      `;

      button.addEventListener("click", () => onSelect(data));
      this.sickResults.appendChild(button);
    });
  }

  renderExamInfo(selectionData, side, onDelete) {
    const preview = document.getElementById(`${side}Preview`);
    const infoBox = document.getElementById(`${side}Info`);
    const gallery = document.getElementById(`${side}CompareGallery`);

    if (!preview || !infoBox || !gallery) {
      return;
    }

    gallery.innerHTML = "";

    if (!selectionData) {
      infoBox.innerHTML = "<strong>Nenhum exame selecionado.</strong>";
      preview.style.backgroundImage = "none";
      preview.textContent = side === "healthy" ? "A aguardar vínculo automático" : "A aguardar seleção";
      preview.onclick = null;
      preview.classList.remove("is-clickable");
      return;
    }

    const { item } = selectionData;
    const typeName = "Lâmina / Citologia";

    let content = `<strong>ID:</strong> ${item.id}<br>`;
    if (item.internalRecordId) {
      content += `<strong>ID da Coleta:</strong> ${item.internalRecordId}<br>`;
    }
    content += `<span class="badge" style="margin: 8px 0; display:inline-block;">Módulo: ${typeName}</span><br>`;
    content += `<span style="color: var(--vet-primary); font-weight: 600; font-size: 13px;">Registado por: ${item.author || "Sistema Base"}</span><br>`;
    const registeredAt = this.formatExamDateTime(item.createdAt);
    if (registeredAt) {
      content += `<span style="color: var(--muted); font-size: 13px;">Data e hora do registro: ${registeredAt}</span><br>`;
    }
    if (item.authorRole === "student") {
      content += `<span style="color: var(--muted); font-size: 13px;">Conta do aluno: ${item.author || "Nao informada"}</span><br>`;
      content += `<span style="color: var(--muted); font-size: 13px;">RGM: ${item.authorRgm || "Nao informado"}</span><br>`;
    }
    content += `<div class="divider" style="margin: 12px 0;"></div>`;

    content += `<strong>Espécie:</strong> <span style="text-transform: capitalize;">${item.species || "N/A"}</span><br>`;
    content += `<strong>Local da Coleta:</strong> ${item.region || "Não informado"}<br>`;
    content += `<strong>Tipo:</strong> ${item.specimenType || "Não informado"}<br>`;
    content += `<strong>Pigmentação:</strong> ${item.pigmentation || "Não informada"}<br>`;

    if (side === "healthy") {
      content += `<strong>Aumento:</strong> ${item.zoom}`;
    } else {
      content += `<strong>Lesão:</strong> ${item.lesion || item.disease || "Não informada"}<br>`;
      content += `<strong>Aumento:</strong> ${item.zoom || "Não informado"}<br>`;
      content += `<strong>Lâmina de Referência:</strong> ${item.linkedHealthyLabel || "Não vinculada"}<br><br>`;
      content += `<strong>Laudo Microscópico:</strong><br>${item.description}`;
    }

    infoBox.innerHTML = content;

    if (this.canDeleteRecords) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn-outline mt-4 block";
      deleteButton.innerHTML = "🗑️ Excluir Prontuário";
      deleteButton.style.borderColor = "#ef4444";
      deleteButton.style.color = "#ef4444";
      deleteButton.addEventListener("click", () => {
        Promise.resolve(onDelete(selectionData, side)).catch((error) => {
          alert(error.message || "Erro ao excluir prontuario.");
        });
      });
      infoBox.appendChild(deleteButton);
    }

    if (item.images?.length > 0) {
      preview.style.backgroundImage = `url(${item.images[0]})`;
      preview.style.backgroundSize = "contain";
      preview.style.backgroundRepeat = "no-repeat";
      preview.style.backgroundPosition = "center";
      preview.textContent = "";
      preview.classList.add("is-clickable");
      preview.onclick = () => {
        this.openComparisonLightbox(item.images[0], `${typeName} • Exame #${item.id}`);
      };

      item.images.forEach((base64, index) => {
        const image = document.createElement("img");
        image.src = base64;

        if (index === 0) {
          image.classList.add("active");
        }

        image.addEventListener("click", () => {
          preview.style.backgroundImage = `url(${base64})`;
          gallery.querySelectorAll("img").forEach((itemImage) => itemImage.classList.remove("active"));
          image.classList.add("active");
          preview.onclick = () => {
            this.openComparisonLightbox(base64, `${typeName} • Exame #${item.id} • Imagem ${index + 1}`);
          };
        });

        image.addEventListener("dblclick", () => {
          this.openComparisonLightbox(base64, `${typeName} • Exame #${item.id} • Imagem ${index + 1}`);
        });

        gallery.appendChild(image);
      });

      return;
    }

    preview.style.backgroundImage = "none";
    preview.textContent = `Exame #${item.id} (Sem Imagens)`;
    preview.onclick = null;
    preview.classList.remove("is-clickable");
  }

  toggleHealthyPanel(visible) {
    this.healthyPanel?.classList.toggle("hidden", !visible);
    this.comparisonArea?.classList.toggle("comparison-area-single", !visible);
    this.comparisonArea?.classList.toggle("comparison-area-double", visible);
  }

  clearResults() {
    if (this.sickResults) {
      this.sickResults.innerHTML = "";
    }
  }

  getSeverityBadge(severity) {
    if (!severity || severity === "Não especificada") {
      return "";
    }

    return `<span class="severity-badge ${severity.toLowerCase().replace("í", "i")}">${severity}</span>`;
  }

  formatExamDateTime(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  bindComparisonLightbox() {
    if (!this.comparisonLightbox) {
      return;
    }

    this.comparisonLightbox.addEventListener("click", (event) => {
      if (event.target.dataset.closeComparisonLightbox === "true") {
        this.closeComparisonLightbox();
      }
    });

    this.comparisonLightboxClose?.addEventListener("click", () => {
      this.closeComparisonLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeComparisonLightbox();
      }
    });
  }

  openComparisonLightbox(source, caption) {
    if (!this.comparisonLightbox || !this.comparisonLightboxImage || !source) {
      return;
    }

    this.comparisonLightboxImage.src = source;
    this.comparisonLightboxImage.alt = caption || "Visualização ampliada";

    if (this.comparisonLightboxCaption) {
      this.comparisonLightboxCaption.textContent = caption || "";
    }

    this.comparisonLightbox.classList.add("open");
    this.comparisonLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  closeComparisonLightbox() {
    if (!this.comparisonLightbox || !this.comparisonLightbox.classList.contains("open")) {
      return;
    }

    this.comparisonLightbox.classList.remove("open");
    this.comparisonLightbox.setAttribute("aria-hidden", "true");

    if (this.comparisonLightboxImage) {
      this.comparisonLightboxImage.src = "";
      this.comparisonLightboxImage.alt = "";
    }

    if (this.comparisonLightboxCaption) {
      this.comparisonLightboxCaption.textContent = "";
    }

    document.body.style.overflow = "";
  }
}
