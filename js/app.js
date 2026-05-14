import { AppController } from "./controllers/AppController.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = new AppController();
  app.init();
});
