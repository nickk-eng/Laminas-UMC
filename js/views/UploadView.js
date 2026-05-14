export class UploadView {
  constructor() {
    this.currentTool = "rect";
    this.uploadSessionData = {
      healthy: { imagesBase64: [], originalBase64: [], activeIndex: -1 },
      sick: { imagesBase64: [], originalBase64: [], activeIndex: -1 },
      slideHealthy: { imagesBase64: [], originalBase64: [], activeIndex: -1 },
      slideSick: { imagesBase64: [], originalBase64: [], activeIndex: -1 },
    };
  }

  bindUploadTabs() {
    const tabs = [...document.querySelectorAll("[data-upload-tab]")];
    const healthyPanel = document.getElementById("uploadHealthyTab");
    const sickPanel = document.getElementById("uploadSickTab");

    if (!tabs.length || !healthyPanel || !sickPanel) {
      return;
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const selectedTab = tab.dataset.uploadTab;

        tabs.forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");

        healthyPanel.classList.toggle("active", selectedTab === "healthy");
        sickPanel.classList.toggle("active", selectedTab === "sick");
      });
    });
  }

  bindToolbars() {
    this.ensureCircleToolButtons();

    document.querySelectorAll(".tool-btn").forEach((button) => {
      button.addEventListener("click", function () {
        if (this.id.includes("Clear")) {
          return;
        }

        this.closest(".toolbar")
          ?.querySelectorAll(".tool-btn:not(.danger)")
          .forEach((item) => item.classList.remove("active"));

        this.classList.add("active");
      });

      button.addEventListener("click", () => {
        if (!button.id.includes("Clear")) {
          this.currentTool = button.dataset.tool;
        }
      });
    });
  }

  bindAdvancedToggle() {
    const trigger = document.getElementById("toggleAdvancedSick");
    const panel = document.getElementById("advancedSickOptions");
    trigger?.addEventListener("click", () => panel?.classList.toggle("show"));
  }

  bindHealthyReferenceLightbox() {
    const lightbox = document.getElementById("healthyReferenceLightbox");
    const closeButton = document.getElementById("healthyReferenceLightboxClose");

    if (!lightbox) {
      return;
    }

    lightbox.addEventListener("click", (event) => {
      if (event.target.dataset.closeLightbox === "true") {
        this.closeHealthyReferenceLightbox();
      }
    });

    closeButton?.addEventListener("click", () => {
      this.closeHealthyReferenceLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeHealthyReferenceLightbox();
        this.closeUploadPreviewLightbox();
      }
    });
  }

  bindUploadPreviewLightbox() {
    const lightbox = document.getElementById("uploadPreviewLightbox");
    const closeButton = document.getElementById("uploadPreviewLightboxClose");

    if (!lightbox) {
      return;
    }

    lightbox.addEventListener("click", (event) => {
      if (event.target.dataset.closeUploadLightbox === "true") {
        this.closeUploadPreviewLightbox();
      }
    });

    closeButton?.addEventListener("click", () => {
      this.closeUploadPreviewLightbox();
    });
  }

  bindHealthyReferenceFilters(handler) {
    [
      document.getElementById("sickSpecies"),
      document.getElementById("sickBreed"),
      document.getElementById("sickDisease"),
    ].forEach((element) => {
      element?.addEventListener("change", handler);
      element?.addEventListener("input", handler);
    });
  }

  bindSlideHealthyReferenceFilters(handler) {
    [
      document.getElementById("slideSickSpecies"),
      document.getElementById("slideSickRegion"),
      document.getElementById("slideSickCategory"),
    ].forEach((element) => {
      element?.addEventListener("change", handler);
      element?.addEventListener("input", handler);
    });
  }

  getHealthyReferenceFilters() {
    const species = document.getElementById("sickSpecies")?.value.trim() ?? "";
    const breed = document.getElementById("sickBreed")?.value.trim() ?? "";
    const selectedOption = document.getElementById("sickDisease")?.selectedOptions?.[0];
    const anatomyRegion = selectedOption?.dataset.region ?? "";

    return {
      species,
      breed,
      anatomyRegion,
    };
  }

  getSlideHealthyReferenceFilters() {
    const species = document.getElementById("slideSickSpecies")?.value.trim() ?? "";
    const anatomyRegion = document.getElementById("slideSickRegion")?.value.trim() ?? "";
    const specimenType = document.getElementById("slideSickCategory")?.value.trim() ?? "";

    return {
      species,
      anatomyRegion,
      specimenType,
    };
  }

  renderHealthyReferenceOptions(references, filters = {}) {
    this.renderReferenceOptions({
      references,
      filters,
      gridId: "healthyReferenceGrid",
      hiddenInputId: "sickLinkedHealthyId",
      displayId: "selectedHealthyReferenceDisplay",
      emptyStateText: "Selecione a espécie do caso doente para listar referências saudáveis compatíveis.",
      noResultsText: (currentFilters) => {
        const breedText = currentFilters.breed ? `, raça ${currentFilters.breed}` : "";
        const anatomyText = currentFilters.anatomyRegion ? ` e região ${currentFilters.anatomyRegion}` : "";
        return `Nenhum lâmina saudável encontrado para a espécie ${currentFilters.species}${breedText}${anatomyText}.`;
      },
      selectedPrefix: "Lâmina saudável vinculado: ",
      anatomyLabel: "Região",
    });
  }

  renderSlideHealthyReferenceOptions(references, filters = {}) {
    this.renderReferenceOptions({
      references,
      filters,
      gridId: "slideHealthyReferenceGrid",
      hiddenInputId: "slideSickLinkedHealthyId",
      displayId: "selectedSlideHealthyReferenceDisplay",
      emptyStateText: "Selecione a espécie da lâmina doente para listar referências saudáveis compatíveis.",
      noResultsText: (currentFilters) => {
        const anatomyText = currentFilters.anatomyRegion ? ` e local ${currentFilters.anatomyRegion}` : "";
        const categoryText = currentFilters.specimenType ? ` do tipo ${currentFilters.specimenType}` : "";
        return `Nenhuma lâmina saudável encontrada para a espécie ${currentFilters.species}${anatomyText}${categoryText}.`;
      },
      selectedPrefix: "Lâmina saudável vinculada: ",
      anatomyLabel: "Local",
    });
  }

  renderReferenceOptions({
    references,
    filters,
    gridId,
    hiddenInputId,
    displayId,
    emptyStateText,
    noResultsText,
    selectedPrefix,
    anatomyLabel = "Região",
  }) {
    const grid = document.getElementById(gridId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const display = document.getElementById(displayId);

    if (!grid || !hiddenInput || !display) {
      return;
    }

    const previousValue = hiddenInput.value;
    grid.innerHTML = "";

    if (!filters.species) {
      grid.innerHTML = `<div class="info-box">${emptyStateText}</div>`;
      this.clearReferenceSelection(hiddenInputId, displayId, gridId);
      return;
    }

    if (references.length === 0) {
      grid.innerHTML = `<div class="info-box">${noResultsText(filters)}</div>`;
      this.clearReferenceSelection(hiddenInputId, displayId, gridId);
      return;
    }

    references.forEach((reference) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "healthy-reference-card";
      card.dataset.recordId = reference.recordId;
      card.setAttribute("aria-label", `Vincular exame saudável ${reference.id}`);

      if (previousValue && previousValue === reference.recordId) {
        card.classList.add("active");
      }

      const hasImage = Boolean(reference.previewImage);
      const imageHtml = hasImage
        ? `<img class="healthy-reference-thumb" src="${reference.previewImage}" alt="${reference.label}">`
        : `<div class="healthy-reference-thumb empty">Sem imagem</div>`;

      const anatomyText = reference.anatomyRegion
        ? `${anatomyLabel}: ${reference.anatomyRegion}`
        : `${anatomyLabel} não informado`;

      card.innerHTML = `
        <div class="healthy-reference-code">ID ${reference.id}</div>
        ${imageHtml}
        <div class="healthy-reference-meta">
          <div class="healthy-reference-title">${reference.species || "Espécie não informada"}</div>
          <div class="healthy-reference-subtitle">${reference.breed ? `Raça: ${reference.breed}` : "Raça não informada"}</div>
          <div class="healthy-reference-subtitle">${anatomyText}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        this.selectReference(reference, hiddenInputId, displayId, gridId, selectedPrefix, anatomyLabel);
      });

      card.addEventListener("dblclick", () => {
        this.openHealthyReferenceLightbox(reference);
      });

      grid.appendChild(card);
    });

    if (previousValue) {
      const selectedReference = references.find((reference) => reference.recordId === previousValue);
      if (selectedReference) {
        this.updateReferenceDisplay(selectedReference, displayId, selectedPrefix, anatomyLabel);
        return;
      }
    }

    this.clearReferenceSelection(hiddenInputId, displayId, gridId);
  }

  selectHealthyReference(reference) {
    this.selectReference(
      reference,
      "sickLinkedHealthyId",
      "selectedHealthyReferenceDisplay",
      "healthyReferenceGrid",
      "Lâmina saudável vinculado: ",
      "Região",
    );
  }

  updateHealthyReferenceDisplay(reference) {
    this.updateReferenceDisplay(reference, "selectedHealthyReferenceDisplay", "Lâmina saudável vinculado: ", "Região");
  }

  selectSlideHealthyReference(reference) {
    this.selectReference(
      reference,
      "slideSickLinkedHealthyId",
      "selectedSlideHealthyReferenceDisplay",
      "slideHealthyReferenceGrid",
      "Lâmina saudável vinculada: ",
      "Local",
    );
  }

  updateSlideHealthyReferenceDisplay(reference) {
    this.updateReferenceDisplay(reference, "selectedSlideHealthyReferenceDisplay", "Lâmina saudável vinculada: ", "Local");
  }

  selectReference(reference, hiddenInputId, displayId, gridId, selectedPrefix, anatomyLabel = "Região") {
    const hiddenInput = document.getElementById(hiddenInputId);
    const grid = document.getElementById(gridId);

    if (!hiddenInput || !grid) {
      return;
    }

    hiddenInput.value = reference.recordId;
    grid.querySelectorAll(".healthy-reference-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.recordId === reference.recordId);
    });

    this.updateReferenceDisplay(reference, displayId, selectedPrefix, anatomyLabel);
  }

  updateReferenceDisplay(reference, displayId, selectedPrefix, anatomyLabel = "Região") {
    const display = document.getElementById(displayId);
    if (!display) {
      return;
    }

    const anatomyText = reference.anatomyRegion ? ` • ${anatomyLabel}: ${reference.anatomyRegion}` : "";
    display.textContent = `${selectedPrefix}#${reference.id}${anatomyText}`;
    display.style.display = "block";
  }

  openHealthyReferenceLightbox(reference) {
    const lightbox = document.getElementById("healthyReferenceLightbox");
    const image = document.getElementById("healthyReferenceLightboxImage");
    const caption = document.getElementById("healthyReferenceLightboxCaption");

    if (!lightbox || !image || !caption || !reference.previewImage) {
      return;
    }

    image.src = reference.previewImage;
    image.alt = reference.label;
    const anatomyLabel = reference.breed ? "Região" : "Local";
    caption.textContent = `${reference.label}${reference.anatomyRegion ? ` • ${anatomyLabel}: ${reference.anatomyRegion}` : ""}`;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  closeHealthyReferenceLightbox() {
    const lightbox = document.getElementById("healthyReferenceLightbox");
    const image = document.getElementById("healthyReferenceLightboxImage");
    const caption = document.getElementById("healthyReferenceLightboxCaption");

    if (!lightbox || !lightbox.classList.contains("open")) {
      return;
    }

    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");

    if (image) {
      image.src = "";
      image.alt = "";
    }

    if (caption) {
      caption.textContent = "";
    }

    document.body.style.overflow = "";
  }

  openUploadPreviewLightbox(type, index) {
    const lightbox = document.getElementById("uploadPreviewLightbox");
    const image = document.getElementById("uploadPreviewLightboxImage");
    const caption = document.getElementById("uploadPreviewLightboxCaption");
    const source = this.uploadSessionData[type]?.imagesBase64?.[index];

    if (!lightbox || !image || !caption || !source) {
      return;
    }

    image.src = source;
    image.alt = `Imagem ${index + 1}`;
    caption.textContent = `Pré-visualização ampliada • ${this.getTypeLabel(type)} • Imagem ${index + 1}`;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  closeUploadPreviewLightbox() {
    const lightbox = document.getElementById("uploadPreviewLightbox");
    const image = document.getElementById("uploadPreviewLightboxImage");
    const caption = document.getElementById("uploadPreviewLightboxCaption");

    if (!lightbox || !lightbox.classList.contains("open")) {
      return;
    }

    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");

    if (image) {
      image.src = "";
      image.alt = "";
    }

    if (caption) {
      caption.textContent = "";
    }

    document.body.style.overflow = "";
  }

  getTypeLabel(type) {
    const labels = {
      healthy: "Lâmina Saudável",
      sick: "Lâmina Doente",
      slideHealthy: "Lâmina Saudável",
      slideSick: "Lâmina Doente",
    };

    return labels[type] || type;
  }

  getSelectedHealthyReference() {
    const hiddenInput = document.getElementById("sickLinkedHealthyId");
    const display = document.getElementById("selectedHealthyReferenceDisplay");

    if (!hiddenInput || !hiddenInput.value) {
      return {
        linkedHealthyRecordId: null,
        linkedHealthyLabel: null,
      };
    }

    return {
      linkedHealthyRecordId: hiddenInput.value,
      linkedHealthyLabel: display?.textContent.replace("Lâmina saudável vinculado: ", "") ?? null,
    };
  }

  clearHealthyReferenceSelection() {
    this.clearReferenceSelection("sickLinkedHealthyId", "selectedHealthyReferenceDisplay", "healthyReferenceGrid");
  }

  getSelectedSlideHealthyReference() {
    const hiddenInput = document.getElementById("slideSickLinkedHealthyId");
    const display = document.getElementById("selectedSlideHealthyReferenceDisplay");

    if (!hiddenInput || !hiddenInput.value) {
      return {
        linkedHealthyRecordId: null,
        linkedHealthyLabel: null,
      };
    }

    return {
      linkedHealthyRecordId: hiddenInput.value,
      linkedHealthyLabel: display?.textContent.replace("Lâmina saudável vinculada: ", "") ?? null,
    };
  }

  clearSlideHealthyReferenceSelection() {
    this.clearReferenceSelection(
      "slideSickLinkedHealthyId",
      "selectedSlideHealthyReferenceDisplay",
      "slideHealthyReferenceGrid",
    );
  }

  clearReferenceSelection(hiddenInputId, displayId, gridId) {
    const hiddenInput = document.getElementById(hiddenInputId);
    const display = document.getElementById(displayId);
    const grid = document.getElementById(gridId);

    if (hiddenInput) {
      hiddenInput.value = "";
    }

    if (display) {
      display.style.display = "none";
      display.textContent = "";
    }

    grid?.querySelectorAll(".healthy-reference-card").forEach((card) => {
      card.classList.remove("active");
    });
  }

  setupMultiUploadCanvas(type) {
    const fileInput = document.getElementById(`${type}File`);
    const area = document.getElementById(`${type}PreviewArea`);
    const canvas = document.getElementById(`${type}UploadCanvas`);

    if (!fileInput || !canvas || !area) {
      return;
    }

    const context = canvas.getContext("2d");
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let snapshot = null;

    fileInput.addEventListener("change", (event) => {
      const files = [...event.target.files].filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) {
        return;
      }

      area.style.display = "block";

      if (this.uploadSessionData[type].activeIndex !== -1 && canvas.width > 0) {
        this.uploadSessionData[type].imagesBase64[this.uploadSessionData[type].activeIndex] =
          canvas.toDataURL("image/jpeg", 0.8);
      }

      let processedCount = 0;

      files.forEach((file) => {
        const reader = new FileReader();

        reader.onload = (loadEvent) => {
          const base64 = loadEvent.target.result;
          this.uploadSessionData[type].imagesBase64.push(base64);
          this.uploadSessionData[type].originalBase64.push(base64);
          processedCount += 1;

          if (processedCount === files.length) {
            this.renderGallery(type);

            if (this.uploadSessionData[type].activeIndex === -1) {
              this.loadImageOnCanvas(type, 0);
            }
          }
        };

        reader.readAsDataURL(file);
      });

      fileInput.value = "";
    });

    canvas.addEventListener("mousedown", (event) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = event.clientX - rect.left;
      startY = event.clientY - rect.top;
      snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    });

    canvas.addEventListener("mousemove", (event) => {
      if (!isDrawing) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;

      context.putImageData(snapshot, 0, 0);
      context.strokeStyle = "#ef4444";
      context.lineWidth = 3;
      context.fillStyle = "#ef4444";

      if (this.currentTool === "rect") {
        context.strokeRect(startX, startY, currentX - startX, currentY - startY);
        return;
      }

      if (this.currentTool === "circle") {
        this.drawCircle(context, startX, startY, currentX, currentY);
        return;
      }

      if (this.currentTool === "arrow") {
        this.drawArrow(context, startX, startY, currentX, currentY);
      }
    });

    ["mouseup", "mouseout"].forEach((eventName) => {
      canvas.addEventListener(eventName, () => {
        isDrawing = false;
      });
    });

    document.getElementById(`${type}Clear`)?.addEventListener("click", () => {
      const index = this.uploadSessionData[type].activeIndex;

      if (index === -1) {
        return;
      }

      const originalBase64 = this.uploadSessionData[type].originalBase64[index];
      const image = new Image();

      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      };

      image.src = originalBase64;
    });
  }

  renderGallery(type) {
    const gallery = document.getElementById(`${type}Gallery`);
    if (!gallery) {
      return;
    }

    gallery.innerHTML = "";

    this.uploadSessionData[type].imagesBase64.forEach((base64, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "thumbnail-wrapper";

      const image = document.createElement("img");
      image.src = base64;
      image.className = "thumbnail-img";

      if (index === this.uploadSessionData[type].activeIndex) {
        image.classList.add("active");
      }

      image.addEventListener("click", () => {
        if (this.uploadSessionData[type].activeIndex !== -1) {
          const currentCanvas = document.getElementById(`${type}UploadCanvas`);
          if (currentCanvas && currentCanvas.width > 0) {
            this.uploadSessionData[type].imagesBase64[this.uploadSessionData[type].activeIndex] =
              currentCanvas.toDataURL("image/jpeg", 0.8);
          }
        }

        this.loadImageOnCanvas(type, index);
      });

      image.addEventListener("dblclick", () => {
        this.openUploadPreviewLightbox(type, index);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "thumb-del-btn";
      deleteButton.textContent = "×";

      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.deleteImage(type, index);
      });

      wrapper.appendChild(image);
      wrapper.appendChild(deleteButton);
      gallery.appendChild(wrapper);
    });
  }

  deleteImage(type, index) {
    this.uploadSessionData[type].imagesBase64.splice(index, 1);
    this.uploadSessionData[type].originalBase64.splice(index, 1);

    if (this.uploadSessionData[type].imagesBase64.length === 0) {
      this.resetUploadSession(type);
      return;
    }

    if (this.uploadSessionData[type].activeIndex === index) {
      this.uploadSessionData[type].activeIndex = 0;
      this.loadImageOnCanvas(type, 0);
      return;
    }

    if (this.uploadSessionData[type].activeIndex > index) {
      this.uploadSessionData[type].activeIndex -= 1;
    }

    this.renderGallery(type);
  }

  loadImageOnCanvas(type, index) {
    const canvas = document.getElementById(`${type}UploadCanvas`);
    const title = document.getElementById(`${type}EditorTitle`);
    const previewArea = document.getElementById(`${type}PreviewArea`);

    if (!canvas || !this.uploadSessionData[type].imagesBase64[index]) {
      return;
    }

    if (previewArea) {
      previewArea.style.display = "block";
    }

    const context = canvas.getContext("2d");
    const image = new Image();

    image.onload = () => {
      const parentWidth = canvas.parentElement?.clientWidth || 600;
      const safeWidth = Math.max(parentWidth - 2, 320);
      const ratio = image.width / image.height || 1;

      canvas.width = safeWidth;
      canvas.height = safeWidth / ratio;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      this.uploadSessionData[type].activeIndex = index;

      if (title) {
        title.textContent = `A editar imagem ${index + 1}`;
      }

      this.renderGallery(type);
    };

    image.src = this.uploadSessionData[type].imagesBase64[index];
  }

  getFinalImagesArray(type) {
    const canvas = document.getElementById(`${type}UploadCanvas`);
    const index = this.uploadSessionData[type].activeIndex;

    if (index !== -1 && canvas && canvas.width > 0) {
      this.uploadSessionData[type].imagesBase64[index] = canvas.toDataURL("image/jpeg", 0.8);
    }

    return [...this.uploadSessionData[type].imagesBase64];
  }

  resetUploadSession(type) {
    this.uploadSessionData[type] = { imagesBase64: [], originalBase64: [], activeIndex: -1 };

    const previewArea = document.getElementById(`${type}PreviewArea`);
    const gallery = document.getElementById(`${type}Gallery`);

    if (previewArea) {
      previewArea.style.display = "none";
    }

    if (gallery) {
      gallery.innerHTML = "";
    }
  }

  ensureCircleToolButtons() {
    document.querySelectorAll(".toolbar").forEach((toolbar) => {
      if (toolbar.querySelector('[data-tool="circle"]')) {
        return;
      }

      const arrowButton = toolbar.querySelector('[data-tool="arrow"]');
      if (!arrowButton) {
        return;
      }

      const circleButton = document.createElement("button");
      circleButton.type = "button";
      circleButton.className = "tool-btn";
      circleButton.dataset.tool = "circle";
      circleButton.title = "Circular achado";
      circleButton.textContent = "O";

      toolbar.insertBefore(circleButton, arrowButton);
    });
  }

  drawCircle(context, startX, startY, currentX, currentY) {
    const centerX = (startX + currentX) / 2;
    const centerY = (startY + currentY) / 2;
    const radiusX = Math.abs(currentX - startX) / 2;
    const radiusY = Math.abs(currentY - startY) / 2;

    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.stroke();
  }

  drawArrow(context, startX, startY, currentX, currentY) {
    const headLength = 16;
    const angle = Math.atan2(currentY - startY, currentX - startX);

    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(currentX, currentY);
    context.stroke();

    context.beginPath();
    context.moveTo(currentX, currentY);
    context.lineTo(
      currentX - headLength * Math.cos(angle - Math.PI / 6),
      currentY - headLength * Math.sin(angle - Math.PI / 6),
    );
    context.lineTo(
      currentX - headLength * Math.cos(angle + Math.PI / 6),
      currentY - headLength * Math.sin(angle + Math.PI / 6),
    );
    context.closePath();
    context.fill();
  }
}
