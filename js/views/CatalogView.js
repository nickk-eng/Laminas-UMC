import { capitalize } from "../utils/helpers.js";

export class CatalogView {
  constructor() {
    this.lesionDatalistSources = {};
    this.suggestionSources = {};
    this.activeSuggestionBox = null;
  }

  bindSpeciesSubmit(handler) {
    document.getElementById("addSpeciesForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      Promise.resolve(handler()).catch((error) => alert(error.message || "Erro ao salvar especie."));
    });
  }

  bindOrganLesionSubmit(handler) {
    document.getElementById("addOrganLesionForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      Promise.resolve(handler()).catch((error) => alert(error.message || "Erro ao salvar lesao."));
    });
  }

  bindBoneLesionSubmit(handler) {
    document.getElementById("addBoneLesionForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      Promise.resolve(handler()).catch((error) => alert(error.message || "Erro ao salvar lesao."));
    });
  }

  bindLesionTabs() {
    const tabs = [...document.querySelectorAll("[data-lesion-tab]")];
    const contents = [...document.querySelectorAll(".lesion-tab-content")];

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.dataset.lesionTab;
        tabs.forEach((item) => item.classList.remove("active"));
        contents.forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tabId)?.classList.add("active");
      });
    });
  }

  bindLesionDrawers() {
    document.querySelectorAll(".lesion-drawer-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const drawer = button.closest(".lesion-drawer");
        const isCollapsed = drawer?.classList.toggle("collapsed");
        drawer?.closest(".grid")?.classList.toggle("lesion-grid-collapsed", Boolean(isCollapsed));

        button.setAttribute("aria-expanded", String(!isCollapsed));
        button.title = isCollapsed ? "Abrir lista" : "Recolher lista";
        button.textContent = isCollapsed ? "›" : "‹";
      });
    });
  }

  getSpeciesFormData() {
    return {
      speciesName: document.getElementById("newSpeciesName")?.value.trim() ?? "",
      breeds: (document.getElementById("newSpeciesBreeds")?.value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  getOrganLesionFormData() {
    return {
      bodyRegion: document.getElementById("organBodyRegion")?.value.trim() ?? "",
      organPart: document.getElementById("organPart")?.value.trim() ?? "",
      affectedOrgan: document.getElementById("affectedOrgan")?.value.trim() ?? "",
      lesionType: document.getElementById("organLesionType")?.value.trim() ?? "",
      lesionName: document.getElementById("organLesionName")?.value.trim() ?? "",
    };
  }

  getBoneLesionFormData() {
    return {
      boneName: document.getElementById("boneName")?.value.trim() ?? "",
      boneRegion: document.getElementById("boneRegion")?.value.trim() ?? "",
      lesionType: document.getElementById("boneLesionType")?.value.trim() ?? "",
      lesionName: document.getElementById("boneLesionName")?.value.trim() ?? "",
    };
  }

  resetSpeciesForm() {
    document.getElementById("addSpeciesForm")?.reset();
  }

  resetOrganLesionForm() {
    document.getElementById("addOrganLesionForm")?.reset();
  }

  resetBoneLesionForm() {
    document.getElementById("addBoneLesionForm")?.reset();
  }

  renderSpecies(speciesDb) {
    const speciesList = Object.keys(speciesDb).sort((a, b) => a.localeCompare(b));
    const optionsHTML = [
      '<option value="">Selecione a espécie</option>',
      ...speciesList.map((species) => `<option value="${species}">${capitalize(species)}</option>`),
    ].join("");

    ["healthySpecies", "sickSpecies", "slideHealthySpecies", "slideSickSpecies"].forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = optionsHTML;
      }
    });

    const speciesDatalist = document.getElementById("speciesDatalist");
    if (speciesDatalist) {
      speciesDatalist.innerHTML = "";
      speciesList.forEach((species) => {
        const option = document.createElement("option");
        option.value = capitalize(species);
        speciesDatalist.appendChild(option);
      });
    }

    this.suggestionSources.speciesDatalist = speciesList.map((species) => capitalize(species));
    this.bindFilteredDatalistInput("speciesDatalist");

    const adminList = document.getElementById("adminSpeciesList");
    if (adminList) {
      adminList.innerHTML = "";
      speciesList.forEach((species) => {
        const item = document.createElement("div");
        item.style.padding = "10px 0";
        item.style.borderBottom = "1px solid var(--border)";
        item.style.fontSize = "14px";
        item.style.color = "var(--text-dark)";
        item.innerHTML = `<strong>${capitalize(species)}</strong><br><span style="font-size:12px; color:var(--muted);">${(speciesDb[species] || []).join(", ") || "Nenhuma raça registada"}</span>`;
        adminList.appendChild(item);
      });
    }
  }

  renderDiseases(lesionCatalog) {
    this.renderRegionSelects(lesionCatalog.getRegionOptions());
    this.renderLesionSelects(lesionCatalog.getLesionOptions());
    this.renderSickLesionSelects(lesionCatalog.getSickLesionOptions());
    this.renderLesionAdminLists(lesionCatalog);
    this.renderLesionDatalists(lesionCatalog.getAll());
  }

  renderLesionDatalists(data) {
    const uniqueValues = (collection, key) => {
      return [...new Set(collection.map((entry) => entry[key]).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right));
    };

    this.lesionDatalistSources = {
      organBodyRegionOptions: uniqueValues(data.organLesions || [], "bodyRegion"),
      organPartOptions: uniqueValues(data.organLesions || [], "organPart"),
      affectedOrganOptions: uniqueValues(data.organLesions || [], "affectedOrgan"),
      organLesionTypeOptions: uniqueValues(data.organLesions || [], "lesionType"),
      organLesionNameOptions: uniqueValues(data.organLesions || [], "lesionName"),
      boneNameOptions: uniqueValues(data.boneLesions || [], "boneName"),
      boneRegionOptions: uniqueValues(data.boneLesions || [], "boneRegion"),
      boneLesionTypeOptions: uniqueValues(data.boneLesions || [], "lesionType"),
      boneLesionNameOptions: uniqueValues(data.boneLesions || [], "lesionName"),
    };
    Object.assign(this.suggestionSources, this.lesionDatalistSources);

    Object.keys(this.lesionDatalistSources).forEach((targetId) => {
      this.bindFilteredDatalistInput(targetId);
    });
  }

  bindFilteredDatalistInput(datalistId) {
    const input = document.querySelector(`input[data-suggestions="${datalistId}"]`);
    if (!input || input.dataset.filteredDatalistBound === "true") {
      return;
    }

    input.dataset.filteredDatalistBound = "true";
    input.addEventListener("input", () => {
      this.showFilteredSuggestions(input, datalistId);
    });
    input.addEventListener("focus", () => {
      this.showFilteredSuggestions(input, datalistId);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.hideSuggestionBox();
      }
    });
    document.addEventListener("click", (event) => {
      if (event.target !== input && !this.activeSuggestionBox?.contains(event.target)) {
        this.hideSuggestionBox();
      }
    });
  }

  showFilteredSuggestions(input, datalistId) {
    const values = this.suggestionSources[datalistId] || this.lesionDatalistSources[datalistId] || [];
    const search = this.normalizeSearchText(input.value);

    if (!search) {
      this.hideSuggestionBox();
      return;
    }

    const matches = values
      .filter((value) => this.normalizeSearchText(value).startsWith(search))
      .slice(0, 12);

    if (matches.length === 0) {
      this.hideSuggestionBox();
      return;
    }

    const box = this.getSuggestionBox();
    const inputRect = input.getBoundingClientRect();

    box.innerHTML = "";
    box.style.left = `${inputRect.left + window.scrollX}px`;
    box.style.top = `${inputRect.bottom + window.scrollY + 4}px`;
    box.style.width = `${inputRect.width}px`;

    matches.forEach((value) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "catalog-suggestion-item";
      option.textContent = value;
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        input.value = value;
        this.hideSuggestionBox();
      });
      box.appendChild(option);
    });

    box.classList.add("active");
  }

  getSuggestionBox() {
    if (!this.activeSuggestionBox) {
      this.activeSuggestionBox = document.createElement("div");
      this.activeSuggestionBox.className = "catalog-suggestions";
      document.body.appendChild(this.activeSuggestionBox);
    }

    return this.activeSuggestionBox;
  }

  hideSuggestionBox() {
    if (this.activeSuggestionBox) {
      this.activeSuggestionBox.classList.remove("active");
      this.activeSuggestionBox.innerHTML = "";
    }
  }

  normalizeSearchText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  renderRegionSelects(regions) {
    const options = [
      '<option value="">Selecione a região anatómica</option>',
      ...regions.map((region) => `<option value="${region}">${region}</option>`),
    ].join("");

    ["healthyAnatomyRegion", "slideHealthyRegion", "slideSickRegion"].forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = options;
      }
    });
  }

  renderLesionSelects(lesionOptions) {
    const grouped = lesionOptions.reduce((accumulator, option) => {
      if (!accumulator[option.group]) {
        accumulator[option.group] = [];
      }
      accumulator[option.group].push(option);
      return accumulator;
    }, {});

    const optionsHTML = ['<option value="">Selecione a lesão</option>'];

    Object.entries(grouped).forEach(([group, options]) => {
      optionsHTML.push(`<optgroup label="${group}">`);
      options.forEach((option) => {
        optionsHTML.push(
          `<option value="${option.value}" data-region="${option.region}" data-structure="${option.structure}" data-type="${option.type}" data-name="${option.name}">${option.value}</option>`,
        );
      });
      optionsHTML.push("</optgroup>");
    });

    [
      "sickDisease",
      "sickInjury",
      "slideSickLesion",
    ].forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = optionsHTML.join("");
      }
    });
  }

  renderLesionAdminLists(model) {
    const data = model.getAll();
    this.renderLesionList("adminOrganLesionList", data.organLesions, (entry) => {
      return `<strong>${entry.bodyRegion}</strong><br><span style="font-size:12px; color:var(--muted);">${entry.organPart} • ${entry.affectedOrgan} • ${entry.lesionType} • ${entry.lesionName}</span>`;
    });

    this.renderLesionList("adminBoneLesionList", data.boneLesions, (entry) => {
      return `<strong>${entry.boneName}</strong><br><span style="font-size:12px; color:var(--muted);">${entry.boneRegion} • ${entry.lesionType} • ${entry.lesionName}</span>`;
    });
  }

  renderLesionList(targetId, collection, formatter) {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.innerHTML = "";

    if (collection.length === 0) {
      target.innerHTML = '<p style="color:var(--muted); padding:20px;">Nenhum cadastro realizado.</p>';
      return;
    }

    collection.forEach((entry) => {
      const item = document.createElement("div");
      item.style.padding = "10px 0";
      item.style.borderBottom = "1px solid var(--border)";
      item.style.fontSize = "14px";
      item.style.color = "var(--text-dark)";
      item.innerHTML = formatter(entry);
      target.appendChild(item);
    });
  }

  setupSpeciesBreedFilter(speciesId, breedId, datalistId, getBreeds) {
    const speciesSelect = document.getElementById(speciesId);
    const breedField = document.getElementById(breedId);
    const datalist = document.getElementById(datalistId);

    if (!speciesSelect || !breedField) {
      return;
    }

    this.resetBreedField(breedField);

    speciesSelect.addEventListener("change", (event) => {
      const selectedSpecies = event.target.value.toLowerCase();
      this.resetBreedField(breedField);

      if (datalist) {
        datalist.innerHTML = "";
      }

      const breeds = getBreeds(selectedSpecies);
      this.suggestionSources[datalistId] = breeds;

      if (selectedSpecies && breeds.length > 0) {
        if (breedField.tagName === "SELECT") {
          breedField.innerHTML = '<option value="">Selecione a raça</option>';
        }

        breeds.forEach((breed) => {
          const option = document.createElement("option");
          option.value = breed;
          option.textContent = breed;

          if (breedField.tagName === "SELECT") {
            breedField.appendChild(option);
          } else {
            datalist?.appendChild(option);
          }
        });
        breedField.disabled = false;
        breedField.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }

      breedField.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  resetBreedField(breedField) {
    breedField.disabled = true;
    breedField.value = "";

    if (breedField.tagName === "SELECT") {
      breedField.innerHTML = '<option value="">Selecione a espécie primeiro</option>';
      return;
    }

    breedField.placeholder = "Selecione a espécie primeiro";
  }

  renderSickLesionSelects(lesionOptions) {
    const lesionInput = document.getElementById("slideSickLesion");
    const typeSelect = document.getElementById("slideSickLesionTypeSelector");
    const organRegionSelect = document.getElementById("slideSickOrganRegion");
    const organPartSelect = document.getElementById("slideSickOrganPart");
    const affectedOrganSelect = document.getElementById("slideSickAffectedOrgan");
    const boneNameSelect = document.getElementById("slideSickBoneName");
    const boneRegionSelect = document.getElementById("slideSickBoneRegion");
    const lesionTypeSelect = document.getElementById("slideSickLesionSubtype");
    const lesionNameSelect = document.getElementById("slideSickLesionName");
    const organFields = [organRegionSelect, organPartSelect, affectedOrganSelect];
    const boneFields = [boneNameSelect, boneRegionSelect];
    const finalFields = [lesionTypeSelect, lesionNameSelect];
    const organTree = lesionOptions.organs || {};
    const boneTree = lesionOptions.bones || {};

    if (
      !lesionInput ||
      !typeSelect ||
      !organRegionSelect ||
      !organPartSelect ||
      !affectedOrganSelect ||
      !boneNameSelect ||
      !boneRegionSelect ||
      !lesionTypeSelect ||
      !lesionNameSelect
    ) {
      return;
    }

    const fillOptions = (select, placeholder, values) => {
      select.innerHTML = "";
      select.appendChild(new Option(placeholder, ""));
      values.forEach((value) => {
        select.appendChild(new Option(value, value));
      });
    };

    const resetSelect = (select, placeholder) => {
      fillOptions(select, placeholder, []);
      select.disabled = true;
    };

    const setFieldsVisible = (fields, isVisible) => {
      fields.forEach((field) => {
        field.hidden = !isVisible;
      });
    };

    const clearFinalValues = () => {
      lesionInput.value = "";
    };

    const resetOrganFields = () => {
      resetSelect(organRegionSelect, "Selecione a região principal");
      resetSelect(organPartSelect, "Selecione a parte da região");
      resetSelect(affectedOrganSelect, "Selecione o órgão afetado");
    };

    const resetBoneFields = () => {
      resetSelect(boneNameSelect, "Selecione o nome do osso");
      resetSelect(boneRegionSelect, "Selecione a região do osso");
    };

    const resetLesionFields = () => {
      resetSelect(lesionTypeSelect, "Selecione o tipo de lesão");
      resetSelect(lesionNameSelect, "Selecione o nome da lesão");
    };

    const getSelectedTreeNode = () => {
      if (typeSelect.value === "Órgãos") {
        return organTree[organRegionSelect.value]?.[organPartSelect.value]?.[affectedOrganSelect.value] || null;
      }

      if (typeSelect.value === "Ósseo") {
        return boneTree[boneNameSelect.value]?.[boneRegionSelect.value]?.["Lesão óssea"] || null;
      }

      return null;
    };

    const fillLesionTypes = () => {
      clearFinalValues();
      resetLesionFields();
      const selectedNode = getSelectedTreeNode();

      if (!selectedNode) {
        return;
      }

      fillOptions(lesionTypeSelect, "Selecione o tipo de lesão", Object.keys(selectedNode));
      lesionTypeSelect.disabled = false;
      setFieldsVisible(finalFields, true);
    };

    fillOptions(typeSelect, "Selecione se a lesão é óssea ou de órgãos", ["Ósseo", "Órgãos"]);
    resetOrganFields();
    resetBoneFields();
    resetLesionFields();
    setFieldsVisible(organFields, false);
    setFieldsVisible(boneFields, false);
    setFieldsVisible(finalFields, false);
    clearFinalValues();

    typeSelect.onchange = () => {
      clearFinalValues();
      resetOrganFields();
      resetBoneFields();
      resetLesionFields();
      setFieldsVisible(organFields, typeSelect.value === "Órgãos");
      setFieldsVisible(boneFields, typeSelect.value === "Ósseo");
      setFieldsVisible(finalFields, false);

      if (typeSelect.value === "Órgãos") {
        fillOptions(organRegionSelect, "Selecione a região principal", Object.keys(organTree));
        organRegionSelect.disabled = false;
      }

      if (typeSelect.value === "Ósseo") {
        fillOptions(boneNameSelect, "Selecione o nome do osso", Object.keys(boneTree));
        boneNameSelect.disabled = false;
      }
    };

    organRegionSelect.onchange = () => {
      clearFinalValues();
      resetSelect(affectedOrganSelect, "Selecione o órgão afetado");
      resetLesionFields();
      setFieldsVisible(finalFields, false);

      if (!organRegionSelect.value || !organTree[organRegionSelect.value]) {
        resetSelect(organPartSelect, "Selecione a parte da região");
        return;
      }

      fillOptions(organPartSelect, "Selecione a parte da região", Object.keys(organTree[organRegionSelect.value]));
      organPartSelect.disabled = false;
    };

    organPartSelect.onchange = () => {
      clearFinalValues();
      resetLesionFields();
      setFieldsVisible(finalFields, false);

      const organs = organTree[organRegionSelect.value]?.[organPartSelect.value];
      if (!organs) {
        resetSelect(affectedOrganSelect, "Selecione o órgão afetado");
        return;
      }

      fillOptions(affectedOrganSelect, "Selecione o órgão afetado", Object.keys(organs));
      affectedOrganSelect.disabled = false;
    };

    affectedOrganSelect.onchange = fillLesionTypes;

    boneNameSelect.onchange = () => {
      clearFinalValues();
      resetLesionFields();
      setFieldsVisible(finalFields, false);

      if (!boneNameSelect.value || !boneTree[boneNameSelect.value]) {
        resetSelect(boneRegionSelect, "Selecione a região do osso");
        return;
      }

      fillOptions(boneRegionSelect, "Selecione a região do osso", Object.keys(boneTree[boneNameSelect.value]));
      boneRegionSelect.disabled = false;
    };

    boneRegionSelect.onchange = fillLesionTypes;

    lesionTypeSelect.onchange = () => {
      clearFinalValues();
      resetSelect(lesionNameSelect, "Selecione o nome da lesão");

      const selectedNode = getSelectedTreeNode();
      if (!lesionTypeSelect.value || !selectedNode?.[lesionTypeSelect.value]) {
        return;
      }

      fillOptions(lesionNameSelect, "Selecione o nome da lesão", selectedNode[lesionTypeSelect.value]);
      lesionNameSelect.disabled = false;
    };

    lesionNameSelect.onchange = () => {
      if (!lesionNameSelect.value) {
        clearFinalValues();
        return;
      }

      if (typeSelect.value === "Órgãos") {
        lesionInput.value = `Órgãos - ${organRegionSelect.value} - ${organPartSelect.value} - ${affectedOrganSelect.value} - ${lesionTypeSelect.value} - ${lesionNameSelect.value}`;
        return;
      }

      lesionInput.value = `Ósseo - ${boneNameSelect.value} - ${boneRegionSelect.value} - ${lesionTypeSelect.value} - ${lesionNameSelect.value}`;
    };
  }
}
