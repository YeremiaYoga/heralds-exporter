let heraldExporter_currentDialog = null;
let heraldExporter_entries = [];

// ===================== ACCESS BUTTON =====================
async function heraldExporter_renderAccessButton() {
  const existingButton = document.getElementById(
    "heraldExporter-accessButtonContainer"
  );
  if (existingButton) {
    existingButton.remove();
  }

  try {
    const html = await fetch(
      "/modules/heralds-exporter/templates/heraldExporter-accessButton.html"
    ).then((response) => response.text());

    const div = document.createElement("div");
    div.innerHTML = html;
    const exporter = div.firstChild;
    exporter.id = "heraldExporter-accessButtonContainer";

    const accessButton = document.createElement("button");
    accessButton.id = "heraldExporter-accessButton";
    accessButton.classList.add("heraldExporter-accessButton");
    accessButton.innerHTML =
      '<i class="fa-solid fa-file-import" style="margin-left:2px;"></i>';
    accessButton.title = "Open Herald Importer / Exporter";

    accessButton.addEventListener("click", async function () {
      await heraldExporter_showDialog();
    });

    exporter.appendChild(accessButton);
    document.body.appendChild(exporter);
  } catch (err) {
    console.error("Herald Importer: failed to render access button", err);
  }
}

// ===================== MAIN DIALOG =====================
async function heraldExporter_showDialog() {
  const dialogContent = `
    <div id="heraldExporter-dialogContainer" class="heraldExporter-dialogContainer">
      <div id="heraldExporter-dialogTopContainer" class="heraldExporter-dialogTopContainer"></div>
      <div id="heraldExporter-dialogMiddleContainer" class="heraldExporter-dialogMiddleContainer"></div>
      <div id="heraldExporter-dialogBottomContainer" class="heraldExporter-dialogBottomContainer"></div>
    </div>
`;

  const dialog = new Dialog({
    title: "Herald Importer",
    content: dialogContent,
    buttons: {},
    default: "import",
  });

  heraldExporter_currentDialog = dialog;
  dialog.render(true);

  Hooks.once("renderDialog", async (app) => {
    if (app instanceof Dialog && app.title === "Herald Importer") {
      const width = 520;
      const height = 520;

      app.setPosition({
        left: (window.innerWidth - width) / 2,
        top: (window.innerHeight - height) / 2,
        width,
        height,
        scale: 1.0,
      });

      await heraldExporter_renderDialogCoreTop();
      await heraldExporter_renderDialogCoreMiddle();
      await heraldExporter_renderDialogCoreBottom();
    }
  });
}

// ===================== TOP: HEADER =====================
async function heraldExporter_renderDialogCoreTop() {
  const top = document.getElementById("heraldExporter-dialogTopContainer");
  if (!top) return;

  top.innerHTML = `
    <div class="heraldExporter-topHeader">
      <div class="heraldExporter-topTitle">Import from External File</div>
      <div class="heraldExporter-topSubtitle">
        Drop one or more JSON files exported from your PC.
      </div>
    </div>
  `;
}

// ===================== MIDDLE: DRAG & DROP + LIST =====================
async function heraldExporter_renderDialogCoreMiddle() {
  const middle = document.getElementById(
    "heraldExporter-dialogMiddleContainer"
  );
  if (!middle) return;

  heraldExporter_entries = [];

  middle.innerHTML = `
    <div class="heraldExporter-middleRoot">
      <div class="heraldExporter-dropZone" id="heraldExporter-dropZone">
        <div class="heraldExporter-dropIcon">
          <i class="fa-solid fa-file-arrow-up"></i>
        </div>
        <div class="heraldExporter-dropTitle">Drop JSON Files Here</div>
        <div class="heraldExporter-dropText">
          Drag & drop one or more JSON files,<br>
          or click this area to choose files from your computer.
        </div>
        <button
          type="button"
          class="heraldExporter-btn heraldExporter-btn--secondary heraldExporter-chooseFilesBtn"
          id="heraldExporter-chooseFilesBtn"
        >
          Choose Files…
        </button>
        <input
          id="heraldExporter-fileInput"
          type="file"
          accept=".json,application/json"
          multiple
          style="display:none;"
        />
        <div
          id="heraldExporter-dropInfo"
          class="heraldExporter-dropInfo"
        >
          Nothing selected yet.
        </div>
      </div>

      <div class="heraldExporter-listWrapper" style="display:none">
        <div class="heraldExporter-listHeader">
          <span class="heraldExporter-listTitle">Files to Import</span>
          <span id="heraldExporter-listCount" class="heraldExporter-listCount">0 file(s)</span>
        </div>
        <div id="heraldExporter-listContainer" class="heraldExporter-listContainer">
          <div class="heraldExporter-listEmpty">
            No files selected. Drop JSON files above to see them here.
          </div>
        </div>
      </div>
    </div>
  `;

  const dropZone = document.getElementById("heraldExporter-dropZone");
  const fileInput = document.getElementById("heraldExporter-fileInput");
  const chooseFilesBtn = document.getElementById(
    "heraldExporter-chooseFilesBtn"
  );
  const dropInfo = document.getElementById("heraldExporter-dropInfo");
  const listContainer = document.getElementById("heraldExporter-listContainer");
  const listCount = document.getElementById("heraldExporter-listCount");
  const listWrapper = middle.querySelector(".heraldExporter-listWrapper");

  function renderList() {
    const entries = heraldExporter_entries;
    listCount.textContent = `${entries.length} file(s)`;

    if (!entries.length) {
      dropInfo.textContent = "Nothing selected yet.";
      if (listWrapper) listWrapper.style.display = "none";
      listContainer.innerHTML = `
        <div class="heraldExporter-listEmpty">
          No files selected. Drop JSON files above to see them here.
        </div>
      `;
      return;
    }

    dropInfo.textContent = `${entries.length} file(s) selected.`;
    if (listWrapper) listWrapper.style.display = "block";

    listContainer.innerHTML = entries
      .map((entry, index) => {
        const file = entry.file;
        const sizeKB = Math.max(1, Math.round(file.size / 1024));
        return `
          <div class="heraldExporter-listItem">
            <div class="heraldExporter-listItemType heraldExporter-badgeFile">FILE</div>
            <div class="heraldExporter-listItemContent">
              <div class="heraldExporter-listItemName" title="${file.name}">
                ${file.name}
              </div>
              <div class="heraldExporter-listItemMeta">
                ${file.type || "application/json"} · ${sizeKB} KB
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function addFiles(files) {
    const jsonFiles = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith(".json")
    );

    if (!jsonFiles.length) {
      ui.notifications?.warn("Only .json files are supported for import.");
      return;
    }

    for (const file of jsonFiles) {
      heraldExporter_entries.push({ type: "file", file });
    }

    renderList();
  }

  // Click → open file picker
  chooseFilesBtn.addEventListener("click", () => fileInput.click());

  // File input change
  fileInput.addEventListener("change", (event) => {
    if (!event.target.files?.length) return;
    addFiles(event.target.files);
  });

  // Drag over
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("heraldExporter-dropZone--active");
  });

  dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dropZone.classList.remove("heraldExporter-dropZone--active");
  });

  // Drop
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("heraldExporter-dropZone--active");

    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    } else {
      ui.notifications?.warn("Please drop JSON files from your computer.");
    }
  });
}

// ===================== BOTTOM: IMPORT / EXPORT / CANCEL =====================
async function heraldExporter_renderDialogCoreBottom() {
  const bottom = document.getElementById(
    "heraldExporter-dialogBottomContainer"
  );
  if (!bottom) return;

  bottom.innerHTML = `
    <div class="heraldExporter-bottomBar">
      <div class="heraldExporter-exportSection">
        <div class="heraldExporter-exportTitle">Export from Compendium</div>
        <div class="heraldExporter-exportRow">
          <select
            id="heraldExporter-compendiumSelect"
            class="heraldExporter-select"
          >
            <!-- Filled by JS -->
          </select>
          <button
            id="heraldExporter-exportButton"
            class="heraldExporter-btn heraldExporter-btn--outline"
            type="button"
          >
            Export
          </button>
        </div>
        <div
          id="heraldExporter-exportHint"
          class="heraldExporter-exportHint"
        >
          Choose a compendium and export all documents as a JSON file.
        </div>
      </div>

      <div class="heraldExporter-bottomButtons">
        <button id="heraldExporter-cancelButton" class="heraldExporter-btn heraldExporter-btn--secondary">
          Cancel
        </button>
        <button id="heraldExporter-importButton" class="heraldExporter-btn heraldExporter-btn--primary">
          Import
        </button>
      </div>
    </div>
  `;

  const cancelButton = document.getElementById("heraldExporter-cancelButton");
  const importButton = document.getElementById("heraldExporter-importButton");
  const compendiumSelect = document.getElementById(
    "heraldExporter-compendiumSelect"
  );
  const exportButton = document.getElementById("heraldExporter-exportButton");
  const exportHint = document.getElementById("heraldExporter-exportHint");

  // Populate compendium select
  if (compendiumSelect) {
    const packs = Array.from(game.packs || []).sort((a, b) =>
      a.metadata.label.localeCompare(b.metadata.label)
    );

    if (!packs.length) {
      compendiumSelect.innerHTML = `<option value="">No compendiums available</option>`;
      compendiumSelect.disabled = true;
      if (exportButton) exportButton.disabled = true;
      if (exportHint)
        exportHint.textContent = "No compendiums found in this world/system.";
    } else {
      compendiumSelect.innerHTML = packs
        .map((p) => {
          const label = p.metadata.label || p.collection || p.metadata.name;
          const docName = p.documentName || "";
          return `<option value="${p.collection}">
            ${label}${docName ? ` (${docName})` : ""}
          </option>`;
        })
        .join("");
    }
  }

  // Cancel
  cancelButton.addEventListener("click", () => {
    if (heraldExporter_currentDialog) {
      heraldExporter_currentDialog.close();
      heraldExporter_currentDialog = null;
    }
  });

  // Import
  importButton.addEventListener("click", async () => {
    if (!heraldExporter_entries.length) {
      ui.notifications?.warn("No files selected for import.");
      return;
    }

    try {
      await heraldExporter_handleImportMultiple();
      ui.notifications?.info("Import finished.");
    } catch (err) {
      console.error("Herald Importer: import failed", err);
      ui.notifications?.error("Import failed. Check console for details.");
    }

    if (heraldExporter_currentDialog) {
      heraldExporter_currentDialog.close();
      heraldExporter_currentDialog = null;
    }
  });

  // Export compendium
  exportButton.addEventListener("click", async () => {
    const collectionId = compendiumSelect?.value;
    if (!collectionId) {
      ui.notifications?.warn("Please choose a compendium to export.");
      return;
    }

    const pack = game.packs.get(collectionId);
    if (!pack) {
      ui.notifications?.error("Could not find the selected compendium.");
      return;
    }

    exportButton.disabled = true;
    exportButton.textContent = "Exporting…";

    try {
      const docs = await pack.getDocuments();
      const entries = docs.map((doc) => ({
        documentType: doc.documentName || doc.constructor.name,
        raw: doc.toObject(),
      }));

      const meta = pack.metadata || {};
      const payload = {
        packId: meta.id || pack.collection,
        name: meta.name || pack.collection,
        label: meta.label || pack.collection,
        documentType: pack.documentName || null,
        entries,
      };

      const json = JSON.stringify(payload, null, 2);
      const safeLabel = (payload.label || "compendium")
        .replace(/[\\\/:*?"<>|]+/g, "_")
        .trim();
      const docType = payload.documentType || "Documents";
      const filename = `herald-${safeLabel}-${docType}.json`;

      saveDataToFile(json, "application/json", filename);
      ui.notifications?.info(
        `Exported ${entries.length} document(s) from "${payload.label}".`
      );
    } catch (err) {
      console.error("Herald Exporter: failed to export compendium", err);
      ui.notifications?.error(
        "Failed to export selected compendium. See console for details."
      );
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = "Export";
    }
  });
}

// ===================== IMPORT MULTIPLE FILES =====================
async function heraldExporter_handleImportMultiple() {
  const fileEntries = heraldExporter_entries.filter((e) => e.type === "file");

  if (!fileEntries.length) {
    ui.notifications?.warn("Please drop at least one JSON file to import.");
    return;
  }

  for (const entry of fileEntries) {
    await heraldExporter_importFromFile(entry.file);
  }
}

// ===================== IMPORT FROM FILE =====================
async function heraldExporter_importFromFile(file) {
  let text;
  try {
    text = await file.text();
  } catch (err) {
    console.error("Herald Importer: failed to read file", file.name, err);
    ui.notifications?.error(`Failed to read file: ${file.name}`);
    return;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.error("Herald Importer: invalid JSON in", file.name, err);
    ui.notifications?.error(`Invalid JSON in file: ${file.name}`);
    return;
  }

  let entries = [];

  if (Array.isArray(json.entries)) {
    entries = json.entries;
  } else if (Array.isArray(json)) {
    entries = json;
  } else {
    entries = [json];
  }

  let successCount = 0;
  for (const entry of entries) {
    const created = await heraldExporter_importSingleEntry(entry);
    if (created) successCount++;
  }

  ui.notifications?.info(
    `Imported ${successCount} document(s) from: ${file.name}`
  );
}

// ===================== IMPORT SINGLE ENTRY → CREATE DOCUMENT =====================
async function heraldExporter_importSingleEntry(entry) {
  let documentType =
    entry.documentType ||
    entry.document_type ||
    entry.docType ||
    entry.collection ||
    entry.entity ||
    entry.document ||
    null;

  let rawData = entry.raw || entry.data || entry;

  if (!documentType) {
    if (rawData.type && rawData.name) {
      documentType = "Item";
    } else {
      console.warn(
        "Herald Importer: could not determine documentType for entry",
        entry
      );
      return null;
    }
  }

  documentType = String(documentType).trim();
  documentType = documentType.replace(/s$/i, "");
  documentType = documentType.charAt(0).toUpperCase() + documentType.slice(1);

  const DocumentClass = CONFIG[documentType]?.documentClass;
  if (!DocumentClass) {
    console.warn(
      `Herald Importer: unsupported documentType "${documentType}"`,
      entry
    );
    ui.notifications?.warn(`Unsupported document type: ${documentType}`);
    return null;
  }

  const clean =
    typeof structuredClone === "function"
      ? structuredClone(rawData)
      : JSON.parse(JSON.stringify(rawData));

  delete clean._id;
  delete clean.id;
  delete clean._key;

  try {
    const created = await DocumentClass.create(clean, {
      renderSheet: false,
    });
    console.log("Herald Importer: created document", created);
    return created;
  } catch (err) {
    console.error(
      `Herald Importer: failed to create ${documentType} from entry`,
      err,
      entry
    );
    ui.notifications?.error(`Failed to import ${documentType}.`);
    return null;
  }
}

export { heraldExporter_renderAccessButton };
