let heraldExporter_currentDialog = null;
let heraldExporter_entries = [];

const HERALDS_EXPORTER_MODULE_ID = "heralds-exporter";

async function heraldExporter_ensureJsZip() {
  if (typeof JSZip !== "undefined") return JSZip;

  const src = `modules/${HERALDS_EXPORTER_MODULE_ID}/lib/jszip.min.js`;

  const existing = document.querySelector('script[data-herald-jszip="1"]');
  if (existing) {
    await new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
  } else {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.dataset.heraldJszip = "1";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  if (typeof JSZip === "undefined") {
    throw new Error("JSZip failed to load from " + src);
  }

  return JSZip;
}

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

    // 🔹 UPDATED: wrapper class supaya bisa di-fix di pojok kanan atas
    exporter.classList.add("heraldExporter-accessButtonWrapper");

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
    title: "Herald Importer / Exporter",
    content: dialogContent,
    buttons: {},
    default: "import",
  });

  heraldExporter_currentDialog = dialog;
  dialog.render(true);

  Hooks.once("renderDialog", async (app) => {
    if (app instanceof Dialog && app.title === "Herald Importer / Exporter") {
      const width = 520;
      const height = 580;

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
      <div class="heraldExporter-topTitle">Import JSON & Export Compendiums</div>
      <div class="heraldExporter-topSubtitle">
        Import from external JSON files, or export all entries from a Compendium into JSON.
      </div>
    </div>
  `;
}

// ===================== MIDDLE: IMPORT + COMPENDIUM LIST =====================
async function heraldExporter_renderDialogCoreMiddle() {
  const middle = document.getElementById(
    "heraldExporter-dialogMiddleContainer"
  );
  if (!middle) return;

  heraldExporter_entries = [];

  middle.innerHTML = `
    <div class="heraldExporter-middleRoot">
      <!-- IMPORT: DROP ZONE -->
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

      <!-- IMPORT: FILE LIST -->
      <div class="heraldExporter-listWrapper" id="heraldExporter-fileListWrapper" style="display:none">
        <div class="heraldExporter-listHeader">
          <span class="heraldExporter-listTitle">Files to Import</span>
          <span id="heraldExporter-listCount" class="heraldExporter-listCount">0 file(s)</span>
        </div>
        <div id="heraldExporter-listContainer" class="heraldExporter-listContainer heraldExporter-listContainer--files">
          <div class="heraldExporter-listEmpty">
            No files selected. Drop JSON files above to see them here.
          </div>
        </div>

        <!-- Import button di bawah list -->
        <div class="heraldExporter-importActionBar">
          <button
            id="heraldExporter-importButton"
            class="heraldExporter-btn heraldExporter-btn--primary"
          >
            Import Selected Files
          </button>
        </div>
      </div>

      <!-- EXPORT: COMPENDIUM LIST -->
      <div class="heraldExporter-compendiumWrapper">
        <div class="heraldExporter-listHeader">
          <span class="heraldExporter-listTitle">Compendiums</span>
          <span id="heraldExporter-compendiumCount" class="heraldExporter-listCount"></span>
        </div>
        <div id="heraldExporter-compendiumContainer" class="heraldExporter-listContainer">
          <div class="heraldExporter-listEmpty">
            Loading compendiums…
          </div>
        </div>
      </div>
    </div>
  `;

  // ---------- IMPORT: FILE HANDLING ----------
  const dropZone = document.getElementById("heraldExporter-dropZone");
  const fileInput = document.getElementById("heraldExporter-fileInput");
  const chooseFilesBtn = document.getElementById(
    "heraldExporter-chooseFilesBtn"
  );
  const dropInfo = document.getElementById("heraldExporter-dropInfo");
  const listContainer = document.getElementById("heraldExporter-listContainer");
  const listCount = document.getElementById("heraldExporter-listCount");
  const fileListWrapper = document.getElementById(
    "heraldExporter-fileListWrapper"
  );
  const importButton = document.getElementById("heraldExporter-importButton");

  function renderFileList() {
    const entries = heraldExporter_entries;
    listCount.textContent = `${entries.length} file(s)`;

    if (!entries.length) {
      dropInfo.textContent = "Nothing selected yet.";
      if (fileListWrapper) fileListWrapper.style.display = "none";
      listContainer.innerHTML = `
        <div class="heraldExporter-listEmpty">
          No files selected. Drop JSON files above to see them here.
        </div>
      `;
      return;
    }

    dropInfo.textContent = `${entries.length} file(s) selected.`;
    if (fileListWrapper) fileListWrapper.style.display = "block";

    listContainer.innerHTML = entries
      .map((entry) => {
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

    renderFileList();
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

  // 🔹 UPDATED: IMPORT BUTTON HANDLER DI SINI (DEKAT AREA IMPORT)
  if (importButton) {
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

  // ---------- EXPORT: COMPENDIUM LIST ----------
  const compendiumContainer = document.getElementById(
    "heraldExporter-compendiumContainer"
  );
  const compendiumCount = document.getElementById(
    "heraldExporter-compendiumCount"
  );

  async function renderCompendiumList() {
    if (!game.packs) {
      compendiumContainer.innerHTML = `
        <div class="heraldExporter-listEmpty">
          No compendiums available in this world/system.
        </div>
      `;
      compendiumCount.textContent = "0 compendium(s)";
      return;
    }

    const packs = Array.from(game.packs);
    if (!packs.length) {
      compendiumContainer.innerHTML = `
        <div class="heraldExporter-listEmpty">
          No compendiums available in this world/system.
        </div>
      `;
      compendiumCount.textContent = "0 compendium(s)";
      return;
    }

    const sorted = packs.sort((a, b) =>
      a.metadata.label.localeCompare(b.metadata.label)
    );

    // Preload index to get approximate counts
    const indexes = await Promise.all(
      sorted.map((p) =>
        typeof p.getIndex === "function" ? p.getIndex() : p.index || []
      )
    );

    compendiumCount.textContent = `${sorted.length} compendium(s)`;

    compendiumContainer.innerHTML = sorted
      .map((pack, idx) => {
        const meta = pack.metadata || {};
        const label = meta.label || pack.collection || meta.name || "Unnamed";
        const docType = pack.documentName || meta.type || "Document";
        const index = indexes[idx] || [];
        const count =
          typeof index.size === "number"
            ? index.size
            : Array.isArray(index)
            ? index.length
            : 0;

        return `
          <div class="heraldExporter-listItem">
            <div class="heraldExporter-listItemType heraldExporter-badgeCompendium">PACK</div>
            <div class="heraldExporter-listItemContent">
              <div class="heraldExporter-listItemName" title="${label}">
                ${label}
              </div>
              <div class="heraldExporter-listItemMeta">
                ${docType} · ${count} entr${count === 1 ? "y" : "ies"}
              </div>
            </div>
            <div class="heraldExporter-listItemActions">
              <button
                type="button"
                class="heraldExporter-btn heraldExporter-btn--tiny heraldExporter-exportBtn"
                data-pack="${pack.collection}"
              >
                Export
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach click handlers for each Export button
    compendiumContainer.querySelectorAll("button[data-pack]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const collectionId = event.currentTarget.dataset.pack;
        await heraldExporter_exportCompendiumById(
          collectionId,
          event.currentTarget
        );
      });
    });
  }

  await renderCompendiumList();
}

// ===================== BOTTOM: HANYA CANCEL =====================
async function heraldExporter_renderDialogCoreBottom() {
  const bottom = document.getElementById(
    "heraldExporter-dialogBottomContainer"
  );
  if (!bottom) return;

  // 🔹 UPDATED: Import button dihapus dari bawah, tinggal Cancel
  bottom.innerHTML = `
    <div class="heraldExporter-bottomBar">
      <div class="heraldExporter-bottomButtons">
        <button id="heraldExporter-cancelButton" class="heraldExporter-btn heraldExporter-btn--secondary">
          Cancel
        </button>
      </div>
    </div>
  `;

  const cancelButton = document.getElementById("heraldExporter-cancelButton");

  cancelButton.addEventListener("click", () => {
    if (heraldExporter_currentDialog) {
      heraldExporter_currentDialog.close();
      heraldExporter_currentDialog = null;
    }
  });
}

// ===================== EXPORT: COMPENDIUM → ZIP (MIRROR FOLDER, 1 ITEM = 1 JSON) =====================
async function heraldExporter_exportCompendiumById(collectionId, buttonEl) {
  const pack = game.packs.get(collectionId);
  console.log(pack);
  if (!pack) {
    ui.notifications?.error("Could not find the selected compendium.");
    return;
  }

  // Pastikan JSZip sudah ke-load
  let JSZipLib;
  try {
    JSZipLib = await heraldExporter_ensureJsZip();
  } catch (e) {
    console.error("Herald Exporter: JSZip failed to load", e);
    ui.notifications?.error("JSZip failed to load. Check console for details.");
    return;
  }

  let restoreLabel;
  if (buttonEl) {
    buttonEl.disabled = true;
    restoreLabel = buttonEl.textContent;
    buttonEl.textContent = "Exporting…";
  }

  try {
    const docs = await pack.getDocuments();
    const sourcesSet = new Set();
    console.log(docs);
    const meta = pack.metadata || {};
    const baseLabel =
      meta.label || pack.collection || meta.name || "compendium";

    const entries = docs.map((doc) => {
      const raw = doc.toObject();

      let src =
        raw.system?.source ||
        raw.data?.source ||
        raw.flags?.ddbimporter?.source ||
        raw.source ||
        null;

      if (Array.isArray(src)) src = src.join(" + ");
      if (typeof src === "string") {
        src = src.trim();
        if (src) sourcesSet.add(src);
      }

      const folderChain = [];
      let f = doc.folder;
      while (f) {
        folderChain.unshift(f.name);
        f = f.parent;
      }

      return { raw, folderChain };
    });

    let sourceLabel = "";
    if (sourcesSet.size === 1) sourceLabel = [...sourcesSet][0];
    else if (sourcesSet.size > 1) sourceLabel = "multi-source";

    const safeCompendiumLabel = String(baseLabel || "compendium")
      .replace(/[\\\/:*?"<>|]+/g, "_")
      .trim();

    let safeSourcePart = "";
    if (sourceLabel) {
      safeSourcePart =
        "-" +
        String(sourceLabel)
          .replace(/[\\\/:*?"<>|]+/g, "_")
          .replace(/\s+/g, "_")
          .trim();
    }

    const zip = new JSZipLib();
    const rootFolder = zip.folder(safeCompendiumLabel) || zip;

    entries.forEach((entry, index) => {
      const raw = entry.raw || {};
      const name =
        raw.name || raw.system?.name || raw.data?.name || `entry-${index + 1}`;

      const safeName = String(name)
        .replace(/[\\\/:*?"<>|]+/g, "_")
        .replace(/\s+/g, "_")
        .trim();

      let currentFolder = rootFolder;

      if (entry.folderChain && entry.folderChain.length) {
        for (const part of entry.folderChain) {
          const safePart = String(part)
            .replace(/[\\\/:*?"<>|]+/g, "_")
            .trim();
          if (!safePart) continue;
          currentFolder =
            currentFolder.folder(safePart) || currentFolder.folder(safePart);
        }
      }

      const filename = `${safeName}.json`;

      currentFolder.file(filename, JSON.stringify(raw, null, 2));
    });

    const zipFilename = `herald-${safeCompendiumLabel}${safeSourcePart}.zip`;
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveDataToFile(zipBlob, "application/zip", zipFilename);

    ui.notifications?.info(
      `Exported ${entries.length} document(s) from "${baseLabel}" as ZIP (folder tree mirrors compendium).`
    );
  } catch (err) {
    console.error("Herald Exporter: failed to export compendium", err);
    ui.notifications?.error(
      "Failed to export selected compendium. See console for details."
    );
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = restoreLabel || "Export";
    }
  }
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
