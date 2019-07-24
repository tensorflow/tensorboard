import { enableProdMode } from "@angular/core";
import { platformBrowser } from "@angular/platform-browser";
import { AppModuleNgFactory } from "./app.module.ngfactory";
import "zone.js/dist/zone.js"; // Angular runtime dep

enableProdMode();

// Bootstrap needs to happen after body is ready but we cannot reliably
// controls the order in which script gets loaded (Vulcanization inlines
// the script in <head>).
window.addEventListener("DOMContentLoaded", () => {
  platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
});
