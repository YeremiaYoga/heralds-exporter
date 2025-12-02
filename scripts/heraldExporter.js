// ===================== GLOBAL STATE =====================
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
    accessButton.title = "Open Herald Importer";

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

  function renderList() {
    const entries = heraldExporter_entries;
    listCount.textContent = `${entries.length} file(s)`;

    if (!entries.length) {
      dropInfo.textContent = "Nothing selected yet.";
      listContainer.innerHTML = `
        <div class="heraldExporter-listEmpty">
          No files selected. Drop JSON files above to see them here.
        </div>
      `;
      return;
    }

    dropInfo.textContent = `${entries.length} file(s) selected.`;

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

// ===================== BOTTOM: IMPORT / CANCEL =====================
async function heraldExporter_renderDialogCoreBottom() {
  const bottom = document.getElementById(
    "heraldExporter-dialogBottomContainer"
  );
  if (!bottom) return;

  bottom.innerHTML = `
    <div class="heraldExporter-bottomBar">
      
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

  cancelButton.addEventListener("click", () => {
    if (heraldExporter_currentDialog) {
      heraldExporter_currentDialog.close();
      heraldExporter_currentDialog = null;
    }
  });

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
}

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
