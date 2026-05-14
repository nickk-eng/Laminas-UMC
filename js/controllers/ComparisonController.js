export class ComparisonController {
  constructor({ examModel, comparisonView, sessionModel }) {
    this.examModel = examModel;
    this.comparisonView = comparisonView;
    this.sessionModel = sessionModel;
    this.selectedHealthyData = null;
    this.selectedSickData = null;
    this.currentMode = "lamina";
  }

  async init() {
    this.comparisonView.setCanDeleteRecords(this.canDeleteRecords());
    await this.examModel.loadCollections([
      this.examModel.keys.slidesHealthy,
      this.examModel.keys.slidesSick,
    ]);

    this.comparisonView.bindModeSwitch((mode) => this.changeMode(mode));
    this.comparisonView.bindSearch(() => this.refreshSickResults());
    this.comparisonView.bindQuickFilters(() => this.refreshSickResults());
    this.changeMode(this.currentMode);
  }

  changeMode(mode) {
    this.currentMode = mode;
    this.selectedHealthyData = null;
    this.selectedSickData = null;
    this.comparisonView.setCompareMode(mode);
    this.renderComparison();
  }

  refreshSickResults() {
    const items = this.getFilteredSick(this.comparisonView.getSickSearchTerm());

    this.comparisonView.renderSickResults(items, this.selectedSickData, (data) => {
      this.selectedSickData = data;
      this.applyLinkedHealthyReference(data);
      this.renderComparison();
      this.refreshSickResults();
    });
  }

  applyLinkedHealthyReference(sickSelection) {
    if (!sickSelection) {
      this.selectedHealthyData = null;
      return;
    }

    this.selectedHealthyData = this.examModel.findSlideHealthyByRecordId(
      sickSelection.item.linkedHealthyRecordId,
    );
  }

  renderComparison() {
    this.comparisonView.toggleHealthyPanel(Boolean(this.selectedHealthyData));

    this.comparisonView.renderExamInfo(
      this.selectedHealthyData,
      "healthy",
      (selection, side) => this.deleteSelection(selection, side),
    );

    this.comparisonView.renderExamInfo(
      this.selectedSickData,
      "sick",
      (selection, side) => this.deleteSelection(selection, side),
    );
  }

  async deleteSelection(selectionData, side) {
    const typeName = "Lâmina / Citologia";

    if (!confirm(`Tem a certeza que deseja excluir este exame (${typeName}) do sistema?`)) {
      return;
    }

    await this.examModel.removeItem(selectionData.key, selectionData.index);

    if (side === "healthy") {
      this.selectedHealthyData = null;
    } else {
      this.selectedSickData = null;
      this.selectedHealthyData = null;
      this.refreshSickResults();
    }

    this.renderComparison();
  }

  handleSaved() {
    this.refreshSickResults();
    this.renderComparison();
  }

  canDeleteRecords() {
    const role = this.sessionModel?.getRole();
    const permissions = this.sessionModel?.getPermissions?.() || {};
    return role !== "student" || Boolean(permissions.deleteComparisonRecords);
  }

  getFilteredSick(term) {
    if (!term) {
      return [];
    }

    const normalizedTerm = term.toLowerCase();

    return this.examModel
      .getAllSick()
      .filter((data) => this.matchesCurrentMode(data))
      .filter((data) => this.buildSearchText(data).includes(normalizedTerm))
      .map((data) => ({
        ...data,
        title: this.formatSickTitle(data),
        subtext: this.getSickSubtext(data),
      }));
  }

  matchesCurrentMode(data) {
    return data.type === "lamina";
  }

  buildSearchText(data) {
    const parts = [this.formatSickTitle(data)];

    if (data.item.description) parts.push(data.item.description);
    if (data.item.injury) parts.push(data.item.injury);
    if (data.item.symptoms) parts.push(data.item.symptoms);
    if (data.item.region) parts.push(data.item.region);
    if (data.item.species) parts.push(data.item.species);
    if (data.item.specimenType) parts.push(data.item.specimenType);
    if (data.item.pigmentation) parts.push(data.item.pigmentation);
    if (data.item.zoom) parts.push(data.item.zoom);
    if (data.item.lesion) parts.push(data.item.lesion);
    if (data.item.disease) parts.push(data.item.disease);
    if (data.item.internalRecordId) parts.push(data.item.internalRecordId);
    if (data.item.linkedHealthyLabel) parts.push(data.item.linkedHealthyLabel);

    return parts.join(" ").toLowerCase();
  }

  formatSickTitle(data) {
    const { item } = data;

    return `[LÂMINA] ID: ${item.id} | ${item.lesion || item.disease || item.specimenType || "Sem lesão"}`;
  }

  getSickSubtext(data) {
    const { item } = data;

    const linkedText = item.linkedHealthyLabel ? ` | Ref: ${item.linkedHealthyLabel}` : "";
    return `${item.species || ""} ${item.region || ""} ${item.specimenType || ""}${linkedText}`.trim();
  }
}
