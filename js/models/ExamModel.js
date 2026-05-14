import { STORAGE_KEYS } from "../utils/constants.js";
import { AuthApi } from "../services/AuthApi.js";

export class ExamModel {
  constructor() {
    this.keys = STORAGE_KEYS;
    this.authApi = new AuthApi();
    this.cache = new Map();
  }

  async loadCollections(keys) {
    await Promise.all(keys.map((key) => this.loadCollection(key)));
  }

  async loadCollection(key) {
    const result = await this.authApi.getExamCollection(key);
    this.cache.set(key, result.items || []);
    return this.cache.get(key);
  }

  getCollection(key) {
    return this.cache.get(key) || [];
  }

  async addItem(key, item) {
    const result = await this.authApi.addExam(key, item);
    const collection = this.getCollection(key);
    collection.unshift(result.item);
    this.cache.set(key, collection);
    return result.item;
  }

  async removeItem(key, index) {
    const collection = this.getCollection(key);
    const item = collection[index];
    if (!item) {
      return;
    }
    await this.authApi.removeExam(item.recordId);
    collection.splice(index, 1);
    this.cache.set(key, collection);
  }

  getHealthyReferences(filters = {}) {
    const { species = "", breed = "", anatomyRegion = "" } = filters;

    return this.getCollection(STORAGE_KEYS.healthy)
      .filter((item) => {
        const speciesMatch = !species || this.isSameText(item.species, species);
        const breedMatch = !breed || this.isSameText(item.breed, breed);
        const anatomyMatch = !anatomyRegion || this.isSameText(item.anatomyRegion, anatomyRegion);
        return speciesMatch && breedMatch && anatomyMatch;
      })
      .map((item, index) => ({
        recordId: item.recordId,
        index,
        id: item.id,
        species: item.species,
        breed: item.breed,
        anatomyRegion: item.anatomyRegion || "",
        previewImage: item.images?.[0] || "",
        label: `#${item.id} | ${item.species} - ${item.breed}`,
      }));
  }

  getSlideHealthyReferences(filters = {}) {
    const { species = "", anatomyRegion = "", specimenType = "" } = filters;

    return this.getCollection(STORAGE_KEYS.slidesHealthy)
      .filter((item) => {
        const speciesMatch = !species || this.isSameText(item.species, species);
        const anatomyMatch = !anatomyRegion || this.isSameText(item.region, anatomyRegion);
        const categoryMatch = !specimenType || this.isSameText(item.specimenType, specimenType);
        return speciesMatch && anatomyMatch && categoryMatch;
      })
      .map((item, index) => ({
        recordId: item.recordId,
        index,
        id: item.id,
        species: item.species,
        anatomyRegion: item.region || "",
        specimenType: item.specimenType || "",
        previewImage: item.images?.[0] || "",
        label: `#${item.id} | ${item.species} - ${item.region || "Sem regiao"}`,
      }));
  }

  findHealthyByRecordId(recordId) {
    return this.findSlideHealthyByRecordId(recordId);
  }

  findSlideHealthyByRecordId(recordId) {
    return this.findByRecordId(STORAGE_KEYS.slidesHealthy, recordId, "lamina");
  }

  findByRecordId(key, recordId, type) {
    if (!recordId) {
      return null;
    }

    const collection = this.getCollection(key);
    const index = collection.findIndex((item) => item.recordId === recordId);
    if (index === -1) {
      return null;
    }

    return {
      item: collection[index],
      index,
      type,
      key,
    };
  }

  getAllHealthy() {
    return [
      ...this.getCollection(STORAGE_KEYS.slidesHealthy).map((item, index) => ({
        item,
        index,
        type: "lamina",
        key: STORAGE_KEYS.slidesHealthy,
      })),
    ];
  }

  getAllSick() {
    return [
      ...this.getCollection(STORAGE_KEYS.slidesSick).map((item, index) => ({
        item,
        index,
        type: "lamina",
        key: STORAGE_KEYS.slidesSick,
      })),
    ];
  }

  isSameText(left, right) {
    if (!left || !right) {
      return false;
    }

    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }
}
