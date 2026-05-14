import { sanitizeHTML } from "../utils/helpers.js";

export class CatalogController {
  constructor({ speciesModel, diseaseModel, catalogView }) {
    this.speciesModel = speciesModel;
    this.diseaseModel = diseaseModel;
    this.catalogView = catalogView;
  }

  async init() {
    await Promise.all([
      this.speciesModel.load(),
      this.diseaseModel.load(),
    ]);

    this.catalogView.bindSpeciesSubmit(() => this.handleSpeciesSubmit());
    this.catalogView.bindOrganLesionSubmit(() => this.handleOrganLesionSubmit());
    this.catalogView.bindBoneLesionSubmit(() => this.handleBoneLesionSubmit());
    this.catalogView.bindLesionTabs();
    this.catalogView.bindLesionDrawers();

    [
      ["healthySpecies", "healthyBreed", "healthyBreedList"],
      ["sickSpecies", "sickBreed", "sickBreedList"],
      ["discHealthySpecies", "discHealthyBreed", "discHealthyBreedList"],
      ["discSickSpecies", "discSickBreed", "discSickBreedList"],
    ].forEach(([speciesId, breedId, datalistId]) => {
      this.catalogView.setupSpeciesBreedFilter(
        speciesId,
        breedId,
        datalistId,
        (species) => this.speciesModel.getBreedsBySpecies(species),
      );
    });

    this.renderAll();
  }

  renderAll() {
    this.catalogView.renderSpecies(this.speciesModel.getAll());
    this.catalogView.renderDiseases(this.diseaseModel);
  }

  async handleSpeciesSubmit() {
    const data = this.catalogView.getSpeciesFormData();
    await this.speciesModel.addSpeciesWithBreeds(
      sanitizeHTML(data.speciesName),
      data.breeds.map((breed) => sanitizeHTML(breed)),
    );
    this.renderAll();
    this.catalogView.resetSpeciesForm();
    alert("Espécie e raças atualizadas com sucesso.");
  }

  async handleOrganLesionSubmit() {
    const data = this.catalogView.getOrganLesionFormData();
    await this.diseaseModel.addOrganLesion({
      bodyRegion: sanitizeHTML(data.bodyRegion),
      organPart: sanitizeHTML(data.organPart),
      affectedOrgan: sanitizeHTML(data.affectedOrgan),
      lesionType: sanitizeHTML(data.lesionType),
      lesionName: sanitizeHTML(data.lesionName),
    });
    this.renderAll();
    this.catalogView.resetOrganLesionForm();
    alert("Lesão de órgão cadastrada com sucesso.");
  }

  async handleBoneLesionSubmit() {
    const data = this.catalogView.getBoneLesionFormData();
    await this.diseaseModel.addBoneLesion({
      boneName: sanitizeHTML(data.boneName),
      boneRegion: sanitizeHTML(data.boneRegion),
      lesionType: sanitizeHTML(data.lesionType),
      lesionName: sanitizeHTML(data.lesionName),
    });
    this.renderAll();
    this.catalogView.resetBoneLesionForm();
    alert("Lesão óssea cadastrada com sucesso.");
  }
}
