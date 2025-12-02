import * as he from "./heraldExporter.js";

Hooks.on("ready", () => {
  setTimeout(async () => {
    if (game.user.isGM) {
      he.heraldExporter_renderAccessButton();
    }
  }, 1000);
});
