import { STORAGE_KEYS } from "../utils/constants.js";
import { sanitizeHTML } from "../utils/helpers.js";

export class UploadController {
  constructor({ examModel, uploadView, sessionModel, onSaved }) {
    this.examModel = examModel;
    this.uploadView = uploadView;
    this.sessionModel = sessionModel;
    this.onSaved = onSaved;
  }

  async init() {
    await this.examModel.loadCollections([
      STORAGE_KEYS.slidesHealthy,
      STORAGE_KEYS.slidesSick,
    ]);

    this.uploadView.bindUploadTabs();
    this.uploadView.bindToolbars();
    this.uploadView.bindUploadPreviewLightbox();
    this.uploadView.bindHealthyReferenceLightbox();
    this.uploadView.bindHealthyReferenceFilters(() => this.handleHealthyReferenceFilterChange());
    this.uploadView.bindSlideHealthyReferenceFilters(() => this.handleSlideHealthyReferenceFilterChange());

    ["healthy", "sick", "slideHealthy", "slideSick"].forEach((type) => {
      this.uploadView.setupMultiUploadCanvas(type);
    });

    this.bindForms();
    this.handleHealthyReferenceFilterChange();
    this.handleSlideHealthyReferenceFilterChange();
  }

  bindForms() {
    this.bindSubmit("healthyForm", () => this.handleHealthySubmit());
    this.bindSubmit("sickForm", () => this.handleSickSubmit());
    this.bindSubmit("slideHealthyForm", () => this.handleSlideHealthySubmit());
    this.bindSubmit("slideSickForm", () => this.handleSlideSickSubmit());
  }

  bindSubmit(formId, handler) {
    document.getElementById(formId)?.addEventListener("submit", (event) => {
      event.preventDefault();
      Promise.resolve(handler()).catch((error) => {
        alert(error.message || "Erro ao gravar no banco de dados.");
      });
    });
  }

  handleHealthyReferenceFilterChange() {
    const filters = this.uploadView.getHealthyReferenceFilters();
    const references = this.examModel.getHealthyReferences(filters);
    this.uploadView.renderHealthyReferenceOptions(references, filters);
  }

  handleSlideHealthyReferenceFilterChange() {
    const filters = this.uploadView.getSlideHealthyReferenceFilters();
    const references = this.examModel.getSlideHealthyReferences(filters);
    this.uploadView.renderSlideHealthyReferenceOptions(references, filters);
  }

  async handleHealthySubmit() {
    const images = this.uploadView.getFinalImagesArray("healthy");
    if (images.length === 0) {
      alert("Adicione pelo menos uma imagem antes de gravar o prontuario saudavel.");
      return;
    }

    await this.examModel.addItem(STORAGE_KEYS.healthy, {
      internalRecordId: sanitizeHTML(document.getElementById("healthyInternalId")?.value.trim()),
      weight: sanitizeHTML(document.getElementById("healthyWeight")?.value.trim()),
      species: sanitizeHTML(document.getElementById("healthySpecies")?.value.trim()),
      breed: sanitizeHTML(document.getElementById("healthyBreed")?.value.trim()),
      anatomyRegion: sanitizeHTML(document.getElementById("healthyAnatomyRegion")?.value.trim()),
      age: sanitizeHTML(document.getElementById("healthyAge")?.value.trim()),
      sex: sanitizeHTML(document.getElementById("healthySex")?.value.trim()),
      images,
      author: this.getAuthorName(),
    });

    this.resetForm("healthyForm", "healthy");
    this.handleHealthyReferenceFilterChange();
    alert("Prontuario de lâmina saudavel gravado com sucesso.");
    this.onSaved?.("healthy");
  }

  async handleSickSubmit() {
    const images = this.uploadView.getFinalImagesArray("sick");
    if (images.length === 0) {
      alert("Adicione pelo menos uma imagem antes de gravar o prontuario doente.");
      return;
    }

    const diseaseSelect = document.getElementById("sickDisease");
    const injurySelect = document.getElementById("sickInjury");
    const disease = sanitizeHTML(diseaseSelect?.value.trim());
    const injury = sanitizeHTML(injurySelect?.value.trim());
    const anatomyRegion = sanitizeHTML(diseaseSelect?.selectedOptions?.[0]?.dataset.region ?? "");
    const linkedHealthyReference = this.uploadView.getSelectedHealthyReference();

    await this.examModel.addItem(STORAGE_KEYS.sick, {
      internalRecordId: sanitizeHTML(document.getElementById("sickInternalId")?.value.trim()),
      weight: sanitizeHTML(document.getElementById("sickWeight")?.value.trim()),
      species: sanitizeHTML(document.getElementById("sickSpecies")?.value.trim()),
      breed: sanitizeHTML(document.getElementById("sickBreed")?.value.trim()),
      age: sanitizeHTML(document.getElementById("sickAge")?.value.trim()),
      sex: sanitizeHTML(document.getElementById("sickSex")?.value.trim()),
      disease,
      anatomyRegion,
      injury,
      description: sanitizeHTML(document.getElementById("sickDescription")?.value.trim()),
      severity: sanitizeHTML(document.getElementById("sickSeverity")?.value.trim()) || "Nao especificada",
      linkedHealthyRecordId: linkedHealthyReference.linkedHealthyRecordId,
      linkedHealthyLabel: linkedHealthyReference.linkedHealthyLabel,
      images,
      author: this.getAuthorName(),
    });

    this.resetForm("sickForm", "sick");
    this.handleHealthyReferenceFilterChange();
    alert("Prontuario de lâmina patologico gravado com sucesso.");
    this.onSaved?.("sick");
  }

  async handleSlideHealthySubmit() {
    const images = this.uploadView.getFinalImagesArray("slideHealthy");
    if (images.length === 0) {
      alert("Adicione pelo menos uma imagem antes de gravar a lamina saudavel.");
      return;
    }

    await this.examModel.addItem(STORAGE_KEYS.slidesHealthy, {
      internalRecordId: sanitizeHTML(document.getElementById("slideHealthyCollectionId")?.value.trim()),
      zoom: sanitizeHTML(document.getElementById("slideHealthyZoom")?.value.trim()),
      species: sanitizeHTML(document.getElementById("slideHealthySpecies")?.value.trim()),
      region: sanitizeHTML(document.getElementById("slideHealthyRegion")?.value.trim()),
      specimenType: sanitizeHTML(document.getElementById("slideHealthyCategory")?.value.trim()),
      pigmentation: sanitizeHTML(document.getElementById("slideHealthyPigmentation")?.value.trim()),
      images,
      author: this.getAuthorName(),
    });

    this.resetForm("slideHealthyForm", "slideHealthy");
    alert("Lamina saudavel gravada com sucesso.");
    this.onSaved?.("slideHealthy");
  }

  async handleSlideSickSubmit() {
    const images = this.uploadView.getFinalImagesArray("slideSick");
    if (images.length === 0) {
      alert("Adicione pelo menos uma imagem antes de gravar a lamina patologica.");
      return;
    }

    await this.examModel.addItem(STORAGE_KEYS.slidesSick, {
      internalRecordId: sanitizeHTML(document.getElementById("slideSickCollectionId")?.value.trim()),
      zoom: sanitizeHTML(document.getElementById("slideSickZoom")?.value.trim()),
      lesion: sanitizeHTML(document.getElementById("slideSickLesion")?.value.trim()),
      species: sanitizeHTML(document.getElementById("slideSickSpecies")?.value.trim()),
      region: sanitizeHTML(document.getElementById("slideSickRegion")?.value.trim()),
      specimenType: sanitizeHTML(document.getElementById("slideSickCategory")?.value.trim()),
      pigmentation: sanitizeHTML(document.getElementById("slideSickPigmentation")?.value.trim()),
      description: sanitizeHTML(document.getElementById("slideSickDescription")?.value.trim()),
      linkedHealthyRecordId: this.uploadView.getSelectedSlideHealthyReference().linkedHealthyRecordId,
      linkedHealthyLabel: this.uploadView.getSelectedSlideHealthyReference().linkedHealthyLabel,
      images,
      author: this.getAuthorName(),
    });

    this.resetForm("slideSickForm", "slideSick");
    this.handleSlideHealthyReferenceFilterChange();
    alert("Lamina patologica gravada com sucesso.");
    this.onSaved?.("slideSick");
  }

  getAuthorName() {
    return this.sessionModel.getUserName() || "Sistema Base";
  }

  resetForm(formId, uploadType) {
    document.getElementById(formId)?.reset();
    this.uploadView.resetUploadSession(uploadType);

    if (uploadType === "healthy") {
      this.resetBreedInput("healthyBreed");
      return;
    }

    if (uploadType === "sick") {
      this.resetBreedInput("sickBreed");
      this.uploadView.clearHealthyReferenceSelection();
      this.resetSickDiseaseState();
      return;
    }

    if (uploadType === "slideSick") {
      this.uploadView.clearSlideHealthyReferenceSelection();
      this.resetSlideSickLesionState();
    }
  }

  resetBreedInput(inputId) {
    const breedInput = document.getElementById(inputId);
    if (!breedInput) {
      return;
    }

    breedInput.value = "";
    breedInput.disabled = true;

    if (breedInput.tagName === "SELECT") {
      breedInput.innerHTML = '<option value="">Selecione a especie primeiro</option>';
      return;
    }

    breedInput.placeholder = "Selecione a especie primeiro";
  }

  resetSickDiseaseState() {
    const diagnosisSelect = document.getElementById("sickDisease");
    const injurySelect = document.getElementById("sickInjury");

    if (diagnosisSelect) {
      diagnosisSelect.value = "";
    }

    if (injurySelect) {
      injurySelect.value = "";
    }

  }

  resetSlideSickLesionState() {
    const lesionInput = document.getElementById("slideSickLesion");
    const typeSelect = document.getElementById("slideSickLesionTypeSelector");
    const organRegionSelect = document.getElementById("slideSickOrganRegion");
    const organPartSelect = document.getElementById("slideSickOrganPart");
    const affectedOrganSelect = document.getElementById("slideSickAffectedOrgan");
    const boneNameSelect = document.getElementById("slideSickBoneName");
    const boneRegionSelect = document.getElementById("slideSickBoneRegion");
    const lesionTypeSelect = document.getElementById("slideSickLesionSubtype");
    const lesionNameSelect = document.getElementById("slideSickLesionName");

    if (lesionInput) lesionInput.value = "";
    if (typeSelect) typeSelect.value = "";
    if (organRegionSelect) organRegionSelect.value = "";
    if (organPartSelect) organPartSelect.value = "";
    if (affectedOrganSelect) affectedOrganSelect.value = "";
    if (boneNameSelect) boneNameSelect.value = "";
    if (boneRegionSelect) boneRegionSelect.value = "";
    if (lesionTypeSelect) lesionTypeSelect.value = "";
    if (lesionNameSelect) lesionNameSelect.value = "";
  }
}
