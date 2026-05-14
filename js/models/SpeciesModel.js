import { AuthApi } from "../services/AuthApi.js";
import { uniqueCaseInsensitive } from "../utils/helpers.js";

const DEFAULT_SPECIES = {
  canino: ["Golden Retriever", "Labrador", "Poodle", "Pug", "Bulldog Frances", "Shih Tzu", "Pastor Alemao", "SRD"],
  felino: ["Persa", "Siames", "Maine Coon", "Sphynx", "SRD"],
  lagomorfo: ["Mini Lop", "Angora", "Lionhead", "Holandes"],
  roedores: ["Hamster Sirio", "Porquinho da India", "Chinchila", "Rato Twister"],
  aves: ["Calopsita", "Papagaio", "Canario", "Caturrita"],
};

export class SpeciesModel {
  constructor() {
    this.authApi = new AuthApi();
    this.cache = structuredClone(DEFAULT_SPECIES);
  }

  async load() {
    const data = await this.authApi.getCatalog();
    this.cache = data.species || structuredClone(DEFAULT_SPECIES);
    return this.cache;
  }

  getAll() {
    return this.cache;
  }

  async addSpeciesWithBreeds(speciesName, breeds) {
    const result = await this.authApi.addSpeciesWithBreeds(speciesName, breeds);
    this.cache = result.species;
    return this.cache;
  }

  addSpeciesWithBreedsLocal(speciesName, breeds) {
    const key = speciesName.trim().toLowerCase();
    if (!this.cache[key]) {
      this.cache[key] = [];
    }
    this.cache[key] = uniqueCaseInsensitive([...this.cache[key], ...breeds]);
    return this.cache;
  }

  getBreedsBySpecies(speciesName) {
    return this.cache[speciesName.toLowerCase()] ?? [];
  }
}
