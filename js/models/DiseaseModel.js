import { AuthApi } from "../services/AuthApi.js";

const DEFAULT_LESIONS = {
  organLesions: [],
  boneLesions: [],
};

export class DiseaseModel {
  constructor() {
    this.authApi = new AuthApi();
    this.cache = structuredClone(DEFAULT_LESIONS);
  }

  async load() {
    const data = await this.authApi.getCatalog();
    this.cache = data.diseases || structuredClone(DEFAULT_LESIONS);
    return this.cache;
  }

  getAll() {
    return {
      organLesions: [...(this.cache.organLesions || [])],
      boneLesions: [...(this.cache.boneLesions || [])],
    };
  }

  async addOrganLesion(entry) {
    const result = await this.authApi.addOrganLesion(entry);
    this.cache = result.diseases;
    return this.cache;
  }

  async addBoneLesion(entry) {
    const result = await this.authApi.addBoneLesion(entry);
    this.cache = result.diseases;
    return this.cache;
  }

  getRegionOptions() {
    const data = this.getAll();
    const values = new Set();

    data.organLesions.forEach((entry) => {
      [entry.bodyRegion, entry.organPart, entry.affectedOrgan].forEach((value) => {
        if (value) values.add(value);
      });
    });

    data.boneLesions.forEach((entry) => {
      [entry.boneRegion, entry.boneName].forEach((value) => {
        if (value) values.add(value);
      });
    });

    return [...values].sort((left, right) => left.localeCompare(right));
  }

  getLesionOptions() {
    const data = this.getAll();

    const organOptions = data.organLesions.map((entry) => ({
      group: "Lesoes de Orgao",
      region: entry.bodyRegion,
      area: entry.organPart,
      structure: entry.affectedOrgan,
      type: entry.lesionType,
      name: entry.lesionName,
      value: this.buildLesionLabel({
        region: entry.bodyRegion,
        structure: entry.affectedOrgan || entry.organPart,
        lesionType: entry.lesionType,
        lesionName: entry.lesionName,
      }),
    }));

    const boneOptions = data.boneLesions.map((entry) => ({
      group: "Lesoes Osseas",
      region: entry.boneRegion,
      area: entry.boneRegion,
      structure: entry.boneName,
      type: entry.lesionType,
      name: entry.lesionName,
      value: this.buildLesionLabel({
        region: entry.boneRegion,
        structure: entry.boneName,
        lesionType: entry.lesionType,
        lesionName: entry.lesionName,
      }),
    }));

    return [...organOptions, ...boneOptions].sort((left, right) => left.value.localeCompare(right.value));
  }

  buildLesionLabel({ region, structure, lesionType, lesionName }) {
    return `${region} - ${structure} - ${lesionType} - ${lesionName}`;
  }

  getSickLesionOptions() {
    const data = this.getAll();
    const organTree = {};
    const boneTree = {};

    const addLesionPath = (target, first, second, third, lesionType, lesionName) => {
      if (!first || !second || !third || !lesionType || !lesionName) {
        return;
      }

      target[first] ??= {};
      target[first][second] ??= {};
      target[first][second][third] ??= {};
      target[first][second][third][lesionType] ??= new Set();
      target[first][second][third][lesionType].add(lesionName);
    };

    data.organLesions.forEach((entry) => {
      addLesionPath(
        organTree,
        entry.bodyRegion,
        entry.organPart,
        entry.affectedOrgan,
        entry.lesionType,
        entry.lesionName,
      );
    });

    data.boneLesions.forEach((entry) => {
      addLesionPath(
        boneTree,
        entry.boneName,
        entry.boneRegion,
        "Lesão óssea",
        entry.lesionType,
        entry.lesionName,
      );
    });

    return {
      organs: this.sortNestedLesionTree(organTree),
      bones: this.sortNestedLesionTree(boneTree),
    };
  }

  sortNestedLesionTree(tree) {
    return Object.fromEntries(
      Object.entries(tree)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([first, secondLevel]) => [
          first,
          Object.fromEntries(
            Object.entries(secondLevel)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([second, thirdLevel]) => [
                second,
                Object.fromEntries(
                  Object.entries(thirdLevel)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([third, typeLevel]) => [
                      third,
                      Object.fromEntries(
                        Object.entries(typeLevel)
                          .sort(([left], [right]) => left.localeCompare(right))
                          .map(([type, names]) => [type, [...names].sort((left, right) => left.localeCompare(right))]),
                      ),
                    ]),
                ),
              ]),
          ),
        ]),
    );
  }
}
