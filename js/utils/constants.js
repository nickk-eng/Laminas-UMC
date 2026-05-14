export const STORAGE_KEYS = {
  users: "vetumc_users",
  species: "vetumc_species",
  diseases: "vetumc_diseases",
  healthy: "vetumc_healthy",
  sick: "vetumc_sick",
  slidesHealthy: "vetumc_slides_healthy",
  slidesSick: "vetumc_slides_sick",
};

export const SESSION_KEYS = {
  token: "vetumc_jwt_token",
  user: "vetumc_user",
  role: "vetumc_role",
  permissions: "vetumc_permissions",
};

export const PERMISSION_KEYS = {
  deleteComparisonRecords: "deleteComparisonRecords",
  manageSpecies: "manageSpecies",
  manageLesions: "manageLesions",
  manageAccess: "manageAccess",
};

export const PROTECTED_PAGES = ["admin", "upload", "compare", "anatomy", "species"];
export const ADMIN_PAGES = ["admin", "anatomy", "species"];

export const EXAM_TYPES = {
  healthy: "healthy",
  sick: "sick",
  slideHealthy: "slideHealthy",
  slideSick: "slideSick",
};

export const PAGE_ROUTES = {
  login: "login.html",
  register: "register.html",
  home: "home.html",
  species: "species.html",
  anatomy: "anatomy.html",
  admin: "admin.html",
  upload: "upload.html",
  compare: "compare.html",
};
