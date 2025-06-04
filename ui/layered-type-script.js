
//  Copyright 2025 Måns Grebäck
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  http://www.apache.org/licenses/LICENSE-2.0

//  Layered Type is a font packaging format that combines multiple font 
//  styles into a single file (LTF) with customizable visual presets. 
//  More information, samples, and demo at 
//  https://github.com/mansgreback/layered-type

// UI Elements
const preview = document.getElementById('preview');
const previewText = document.getElementById('previewText');
const fontUpload = document.getElementById('fontUpload');
const fontDropArea = document.getElementById('fontDropArea');
const layerList = document.getElementById('layerList');
const presetsDropdown = document.getElementById('presetsDropdown');
const familyNameInput = document.getElementById('familyNameInput');
const newPresetBtn = document.getElementById('newPresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');
const downloadPackageBtn = document.getElementById('downloadPackageBtn');
const presetNameInput = document.getElementById('presetNameInput');
const savePresetBtn = document.getElementById('savePresetBtn');
const addLayerBtn = document.getElementById('addLayerBtn');
const metadataInput = document.getElementById('metadataInput');
const randomizeOrderChk = document.getElementById('randomizeOrderChk');
const randomizeColorChk = document.getElementById('randomizeColorChk');
const randomizeOpacityChk = document.getElementById('randomizeOpacityChk');
const randomizeStylesChk = document.getElementById('randomizeStylesChk');
const randomizeXOffsetChk = document.getElementById('randomizeXOffsetChk');
const randomizeYOffsetChk = document.getElementById('randomizeYOffsetChk');
const randomizeBtn = document.getElementById('randomizeBtn');
const notifBar = document.getElementById('notifBar');

// Duplicate font modal elements
const duplicateFontModal = document.getElementById('duplicateFontModal');
const duplicateFontMsg = document.getElementById('duplicateFontMsg');
const replaceFontBtn = document.getElementById('replaceFontBtn');
const addFontBtn = document.getElementById('addFontBtn');
const cancelFontBtn = document.getElementById('cancelFontBtn');
let pendingFontAction = null;

let layers = [];
let allPresets = {
  group: "",
  metadata: { description: "" },
  presets: {}
};
let currentPresetName = "";
let fontFilesByBase = {};
let originalPresets = null;
let isLoaded = false;
let styles = []; // { filename, displayName }

function showNotif(msg, ms=1800) {
  notifBar.innerText = msg;
  notifBar.style.display = 'block';
  notifBar.style.opacity = 0.99;
  notifBar.style.pointerEvents = "auto";
  setTimeout(() => {
    notifBar.style.opacity = '0';
    notifBar.style.pointerEvents = "none";
    setTimeout(() => { notifBar.style.display = 'none'; }, 310);
  }, ms);
}

// --- Utility functions ---
function normalizeHex(val) {
  val = val.trim().replace(/^#+/, '');
  if (/^[0-9A-Fa-f]{3}$/.test(val)) {
    val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2];
  } else if (/^[0-9A-Fa-f]{4}$/.test(val)) {
    val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2]+val[3]+val[3];
  }
  if (!val.startsWith('#')) val = '#' + val;
  return val.toUpperCase();
}
function isValidHex(val) {
  val = val.trim().replace(/^#+/, '');
  return /^[0-9A-Fa-f]{3}$/.test(val) ||
    /^[0-9A-Fa-f]{4}$/.test(val) ||
    /^[0-9A-Fa-f]{6}$/.test(val) ||
    /^[0-9A-Fa-f]{8}$/.test(val);
}
function getUniqueFilename(base, ext) {
  let name = base, i = 2;
  while (fontFilesByBase[name + ext]) {
    name = base + '-' + i;
    i++;
  }
  return name + ext;
}
function getStyleOptions() {
  return styles
    .map(s => ({
      filename: s.filename,
      displayName: s.displayName
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
function deepCopyLayers(layersArr) {
  return layersArr.map(l => Object.assign({}, l));
}
function setFamilyNameInput(name) {
  familyNameInput.value = name || "";
  allPresets.group = name || "";
}
familyNameInput.addEventListener('input', e => {
  allPresets.group = familyNameInput.value.trim();
});
function setPresetNameInput(name) {
  presetNameInput.value = name || "";
}
presetNameInput.addEventListener('input', e => {});
function setMetadataInput(val) {
  metadataInput.value = val || "";
  allPresets.metadata.description = val || "";
}
metadataInput.addEventListener('input', e => {
  allPresets.metadata.description = metadataInput.value;
});

savePresetBtn.addEventListener('click', () => {
  const name = presetNameInput.value.trim();
  if (!name) {
    alert('Please enter a name for the preset.');
    presetNameInput.focus();
    return;
  }
  const presetLayers = layers.map(l => ({
    font: l.filename,
    color: l.color,
    opacity: (typeof l.opacity === "number" && l.opacity <= 1) ? Math.round(l.opacity * 100) / 100 : l.opacity,
    offset: { x: l.offsetX || 0, y: l.offsetY || 0 },
    name: l.alias || ""
    // Allow future extensibility: just copy all other non-standard fields if needed
  }));
  allPresets.presets[name] = presetLayers;
  currentPresetName = name;
  updatePresetsDropdown();
  presetsDropdown.value = name;
  showNotif('Preset saved');
});

presetsDropdown.addEventListener('change', () => {
  const name = presetsDropdown.value;
  if (allPresets.presets[name]) {
    loadPresetOption(name, /*isPresetSwitch=*/true);
    setPresetNameInput(name);
  }
});

deletePresetBtn.addEventListener('click', () => {
  const name = presetsDropdown.value;
  if (!name || !allPresets.presets[name]) return;
  if (!confirm("Are you sure you want to delete this preset?")) return;
  delete allPresets.presets[name];
  updatePresetsDropdown();
  const keys = Object.keys(allPresets.presets);
  if (keys.length > 0) {
    presetsDropdown.value = keys[0];
    loadPresetOption(keys[0], true);
    setPresetNameInput(keys[0]);
    currentPresetName = keys[0];
  } else {
    layers = [];
    setPresetNameInput("");
    updateLayerList();
    renderPreview();
    currentPresetName = "";
  }
  showNotif('Preset deleted');
});

newPresetBtn.addEventListener('click', async () => {
  layers = [];
  let aliasCounter = 1;
  for (const style of styles) {
    let fileUrl = undefined;
    const entry = fontFilesByBase[style.filename];
    if (entry) {
      if (entry.isRuntime && entry.url) {
        fileUrl = entry.url;
      } else if (typeof entry.async === "function") {
        let blob = await entry.async('blob');
        fileUrl = URL.createObjectURL(blob);
      }
    }
    const fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    if (fileUrl) {
      try {
        const fontFace = new FontFace(fontName, `url(${fileUrl})`);
        fontFace.load().then(loaded => document.fonts.add(loaded));
      } catch(e) {}
    }
    layers.unshift({
      id: Math.random().toString(36).substr(2, 9),
      fontName,
      displayName: style.displayName,
      filename: style.filename,
      color: getRandomColor(),
      opacity: 1,
      offsetX: 0,
      offsetY: 0,
      alias: "Layer " + (aliasCounter++),
      fileUrl
    });
  }
  updateLayerList();
  renderPreview();
  presetsDropdown.value = "";
  setPresetNameInput("");
  currentPresetName = "";
  showNotif('Created new preset');
});

function updateRandomizeButtonState() {
  const anyChecked =
    randomizeOrderChk.checked ||
    randomizeColorChk.checked ||
    randomizeOpacityChk.checked ||
    randomizeStylesChk.checked ||
    randomizeXOffsetChk.checked ||
    randomizeYOffsetChk.checked;
  randomizeBtn.disabled = !anyChecked;
}
[
  randomizeOrderChk,
  randomizeColorChk,
  randomizeOpacityChk,
  randomizeStylesChk,
  randomizeXOffsetChk,
  randomizeYOffsetChk
].forEach(el => {
  if (el) el.addEventListener('change', updateRandomizeButtonState);
});
window.addEventListener('DOMContentLoaded', updateRandomizeButtonState);

randomizeBtn.addEventListener('click', async () => {
  const order = randomizeOrderChk.checked;
  const color = randomizeColorChk.checked;
  const opacity = randomizeOpacityChk.checked;
  const stylesChecked = randomizeStylesChk.checked;
  const xOffset = randomizeXOffsetChk.checked;
  const yOffset = randomizeYOffsetChk.checked;

  // Order
  if (order) {
    for (let i = layers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [layers[i], layers[j]] = [layers[j], layers[i]];
    }
  }

  // Color
  if (color) {
    layers.forEach(l => { l.color = getRandomColor(); });
  }

  // Opacity
  if (opacity) {
    layers.forEach(l => {
      if (Math.random() < 0.5) {
        l.opacity = 1;
      } else {
        l.opacity = Math.round((10 + Math.random() * 80)) / 100;
      }
    });
  }

  // Styles (async)
  if (stylesChecked && getStyleOptions().length > 0) {
    let availableStyles = getStyleOptions();
    let n = Math.max(2, Math.floor(Math.random() * (availableStyles.length - 1)) + 2);
    n = Math.min(n, availableStyles.length);

    // Shuffle and select n
    let shuffled = availableStyles.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let chosen = shuffled.slice(0, n);

    // Assign chosen styles to layers, wrapping if needed
    for (let i = 0; i < layers.length; i++) {
      const styleObj = chosen[i % chosen.length];
      layers[i].filename = styleObj.filename;
      layers[i].displayName = styleObj.displayName;

      const entry = fontFilesByBase[styleObj.filename];
      let fileUrl, fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (entry) {
        if (entry.isRuntime && entry.url) {
          fileUrl = entry.url;
        } else if (typeof entry.async === "function") {
          const blob = await entry.async('blob');
          fileUrl = URL.createObjectURL(blob);
        }
        try {
          const fontFace = new FontFace(fontName, `url(${fileUrl})`);
          await fontFace.load();
          document.fonts.add(fontFace);
        } catch (e) {}
      }
      layers[i].fontName = fontName;
      layers[i].fileUrl = fileUrl;
    }
  }

  // X Offset
  if (xOffset) {
    layers.forEach(l => {
      if (Math.random() < 0.5) {
        l.offsetX = 0;
      } else {
        l.offsetX = Math.floor(Math.random() * 11) - 5; 
      }
    });
  }

  // Y Offset
  if (yOffset) {
    layers.forEach(l => {
      if (Math.random() < 0.5) {
        l.offsetY = 0;
      } else {
        l.offsetY = Math.floor(Math.random() * 11) - 5; 
      }
    });
  }

  updateLayerList();
  renderPreview();
  showNotif('Randomized');
});

fontDropArea.addEventListener('click', () => fontUpload.click());
fontDropArea.addEventListener('dragover', e => {
  e.preventDefault();
  fontDropArea.classList.add('dragover');
});
fontDropArea.addEventListener('dragleave', () => fontDropArea.classList.remove('dragover'));
fontDropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fontDropArea.classList.remove('dragover');
  handleFontFiles(e.dataTransfer.files);
});
fontUpload.addEventListener('change', (e) => {
  handleFontFiles(e.target.files);
  e.target.value = '';
});

downloadPackageBtn.addEventListener('click', async () => {
  const JSZipRef = window.JSZip;
  if (!JSZipRef) {
    alert('JSZip is not loaded');
    return;
  }
  const zip = new JSZipRef();
  const presetsContent = buildPresetsFile(allPresets);
  zip.file("presets.json", presetsContent);
  const fontFilenames = new Set();
  for (const preset of Object.values(allPresets.presets)) {
    for (const layer of preset) {
      if (layer.font) fontFilenames.add(layer.font);
    }
  }
  const fontPromises = Array.from(fontFilenames).map(async filename => {
    const entry = fontFilesByBase[filename];
    if (!entry) return;
    let blob;
    if (entry.isRuntime && entry.url) {
      blob = await fetch(entry.url).then(r => r.blob());
    } else if (typeof entry.async === "function") {
      blob = await entry.async('blob');
    }
    if (blob) {
      zip.file(filename, blob);
    }
  });
  await Promise.all(fontPromises);
  let fname = (allPresets.group || "layered-type").replace(/\s+/g, "");
  if (!fname) fname = "layered-type";
  fname += ".ltf";
  zip.generateAsync({type: "blob"}).then(content => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotif('Font downloaded');
  });
});

function updatePresetsDropdown() {
  presetsDropdown.innerHTML = '';
  Object.keys(allPresets.presets).forEach(name => {
    let o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    presetsDropdown.appendChild(o);
  });
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function buildPresetsFile(presetsObj) {
  const out = {
    group: presetsObj.group || "",
    metadata: { description: presetsObj.metadata?.description || "" },
    presets: {}
  };
  for (const presetName in presetsObj.presets) {
    out.presets[presetName] = presetsObj.presets[presetName].map(layer => {
      return Object.assign({}, layer);
    });
  }
  return JSON.stringify(out, null, 2);
}

function updateStylesFromFonts() {
  styles = [];
  Object.keys(fontFilesByBase).forEach(fname => {
    styles.push({
      filename: fname,
      displayName: fname.replace(/\.[^/.]+$/, "")
    });
  });
}

addLayerBtn.addEventListener('click', async () => {
  if (!styles.length) {
    alert("Please upload at least one font style before adding a layer.");
    return;
  }
  const present = layers.map(l => l.filename);
  const missing = styles.filter(s => !present.includes(s.filename));
  let styleToAdd;
  if (missing.length > 0) {
    styleToAdd = missing[0];
  } else {
    let topIdx = styles.findIndex(s => s.filename === layers[0]?.filename);
    styleToAdd = styles[(topIdx + 1) % styles.length];
  }
  const entry = fontFilesByBase[styleToAdd.filename];
  let fileUrl = undefined;
  let fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  if (entry) {
    if (entry.isRuntime && entry.url) {
      fileUrl = entry.url;
    } else if (typeof entry.async === "function") {
      let blob = await entry.async('blob');
      fileUrl = URL.createObjectURL(blob);
    }
    try {
      const fontFace = new FontFace(fontName, `url(${fileUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch(e) {}
  }
  layers.unshift({
    id: Math.random().toString(36).substr(2, 9),
    fontName,
    displayName: styleToAdd.displayName,
    filename: styleToAdd.filename,
    color: getRandomColor(),
    opacity: 1,
    offsetX: 0,
    offsetY: 0,
    alias: "",
    fileUrl
  });
  updateLayerList();
  renderPreview();
  showNotif('Added layer');
});

async function addFontAsLayer(style) {
  const entry = fontFilesByBase[style.filename];
  let fileUrl = undefined;
  let fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  if (entry) {
    if (entry.isRuntime && entry.url) {
      fileUrl = entry.url;
    } else if (typeof entry.async === "function") {
      let blob = await entry.async('blob');
      fileUrl = URL.createObjectURL(blob);
    }
    try {
      const fontFace = new FontFace(fontName, `url(${fileUrl})`);
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch(e) {}
  }
  layers.unshift({
    id: Math.random().toString(36).substr(2, 9),
    fontName,
    displayName: style.displayName,
    filename: style.filename,
    color: getRandomColor(),
    opacity: 1,
    offsetX: 0,
    offsetY: 0,
    alias: "",
    fileUrl
  });
}

function updateLayerList() {
  layerList.innerHTML = '';
  layers.forEach((layer, idx) => {
    const div = document.createElement('div');
    div.className = 'layer-controls';
    div.setAttribute('data-id', layer.id);

    const dragHandle = document.createElement('span');
    dragHandle.textContent = '☰';
    dragHandle.className = 'drag-handle';

    const styleSelect = document.createElement('select');
    styleSelect.className = 'style-select';
    const options = getStyleOptions();
    styleSelect.innerHTML = "";
    options.forEach(style => {
      const opt = document.createElement('option');
      opt.value = style.filename;
      opt.textContent = style.displayName;
      if (style.filename === layer.filename) opt.selected = true;
      styleSelect.appendChild(opt);
    });
    styleSelect.addEventListener('change', async function() {
      const selectedFilename = styleSelect.value;
      layer.filename = selectedFilename;
      const styleObj = styles.find(s => s.filename === selectedFilename);
      layer.displayName = styleObj ? styleObj.displayName : selectedFilename.replace(/\.[^/.]+$/, "");
      let entry = fontFilesByBase[selectedFilename], fileUrl = undefined;
      let fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (entry) {
        if (entry.isRuntime && entry.url) {
          fileUrl = entry.url;
        } else if (typeof entry.async === "function") {
          let blob = await entry.async('blob');
          fileUrl = URL.createObjectURL(blob);
        }
        try {
          const fontFace = new FontFace(fontName, `url(${fileUrl})`);
          await fontFace.load();
          document.fonts.add(fontFace);
        } catch(e) {}
      }
      layer.fontName = fontName;
      layer.fileUrl = fileUrl;
      updateLayerList();
      renderPreview();
    });

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input';
    let colorForInput = layer.color;
    if (isValidHex(colorForInput)) colorForInput = normalizeHex(colorForInput);
    let inputColor = "#000000";
    if (/^#[0-9A-Fa-f]{6}$/.test(colorForInput)) {
      inputColor = colorForInput;
    } else if (/^#[0-9A-Fa-f]{3}$/.test(colorForInput)) {
      inputColor = normalizeHex(colorForInput).slice(0,7);
    } else if (/^#[0-9A-Fa-f]{8}$/.test(colorForInput)) {
      inputColor = colorForInput.slice(0,7);
    }
    colorInput.value = inputColor;

    colorInput.addEventListener('input', e => {
      layer.color = e.target.value.toUpperCase();
      hexInput.value = layer.color;
      hexInput.style.background = '#eaf4ff';
      renderPreview();
    });

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'color-hex';
    hexInput.value = layer.color.toUpperCase();
    hexInput.readOnly = false;
    hexInput.maxLength = 9;
    hexInput.spellcheck = false;
    hexInput.title = "Enter a HEX color (e.g. #FAE000 or #FAE)";
    hexInput.autocomplete = "off";
    hexInput.addEventListener('input', () => {
      let val = hexInput.value.trim().replace(/^#+/, '');
      if (isValidHex(val)) {
        let norm = normalizeHex(val);
        layer.color = norm;
        if (/^#[0-9A-Fa-f]{6}$/.test(norm)) {
          colorInput.value = norm;
        } else if (/^#[0-9A-Fa-f]{3}$/.test(norm)) {
          colorInput.value = normalizeHex(norm).slice(0,7);
        } else if (/^#[0-9A-Fa-f]{8}$/.test(norm)) {
          colorInput.value = norm.slice(0,7);
        }
        hexInput.style.background = '#eaf4ff';
        renderPreview();
      } else {
        hexInput.style.background = '#ffeaea';
      }
    });
    hexInput.addEventListener('blur', () => {
      let val = hexInput.value.trim().replace(/^#+/, '');
      if (!isValidHex(val)) {
        hexInput.value = layer.color.toUpperCase();
        hexInput.style.background = '';
      }
    });

    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.className = 'opacity-slider';
    opacitySlider.min = '0';
    opacitySlider.max = '1';
    opacitySlider.step = '0.01';
    opacitySlider.value = typeof layer.opacity === 'number' ? layer.opacity : 1;
    opacitySlider.addEventListener('input', e => {
      layer.opacity = parseFloat(e.target.value);
      renderPreview();
      opacityValueLabel.textContent = Math.round(layer.opacity * 100) + '%';
    });

    const opacityValueLabel = document.createElement('span');
    opacityValueLabel.className = 'opacity-label';
    opacityValueLabel.textContent = Math.round((typeof layer.opacity === 'number' ? layer.opacity : 1) * 100) + '%';

    const offsetX = document.createElement('input');
    offsetX.type = 'number';
    offsetX.className = 'offset-input';
    offsetX.value = layer.offsetX;
    offsetX.addEventListener('input', e => {
      layer.offsetX = parseFloat(e.target.value);
      renderPreview();
    });

    const offsetY = document.createElement('input');
    offsetY.type = 'number';
    offsetY.className = 'offset-input';
    offsetY.value = layer.offsetY;
    offsetY.addEventListener('input', e => {
      layer.offsetY = parseFloat(e.target.value);
      renderPreview();
    });

    const previewGlyph = document.createElement('span');
    previewGlyph.className = 'glyph-preview';
    previewGlyph.textContent = layer.fileUrl ? 'ABC' : '[missing]';
    previewGlyph.style.fontFamily = layer.fontName;

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'duplicate-btn green';
    duplicateBtn.title = 'Duplicate Layer';
    duplicateBtn.innerHTML = '⧉';
    duplicateBtn.onclick = () => duplicateLayer(layer, idx);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn red';
    removeBtn.title = 'Remove Layer';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => {
      const index = layers.findIndex(l => l.id === layer.id);
      if (index !== -1) layers.splice(index, 1);
      updateLayerList();
      renderPreview();
      showNotif('Layer removed');
    };

    const aliasInput = document.createElement('input');
    aliasInput.type = 'text';
    aliasInput.className = 'alias-input';
    aliasInput.value = layer.alias || '';
    aliasInput.placeholder = 'Alias';
    aliasInput.addEventListener('input', e => {
      layer.alias = e.target.value;
    });

    div.appendChild(dragHandle);
    div.appendChild(styleSelect);
    div.appendChild(colorInput);
    div.appendChild(hexInput);
    div.appendChild(opacitySlider);
    div.appendChild(opacityValueLabel);
    div.appendChild(offsetX);
    div.appendChild(offsetY);
    div.appendChild(previewGlyph);
    div.appendChild(duplicateBtn);
    div.appendChild(removeBtn);
    div.appendChild(aliasInput);
    layerList.appendChild(div);
  });

  if (!layerList.dataset.sortableInitialized) {
    Sortable.create(layerList, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: () => {
        const orderedIds = Array.from(layerList.children).map(child => child.getAttribute('data-id'));
        layers.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
        renderPreview();
      }
    });
    layerList.dataset.sortableInitialized = 'true';
  }
}

function duplicateLayer(layer, idx) {
  const newLayer = { ...layer, id: Math.random().toString(36).substr(2, 9) };
  layers.unshift(newLayer);
  updateLayerList();
  renderPreview();
  showNotif('Layer duplicated');
}

function updatePreviewContainerPadding() {
  let yOffsets = layers.map(l => l.offsetY || 0);
  if (!yOffsets.length) {
    document.getElementById('preview-container').style.padding = '12px 0 12px 0';
    return;
  }
  let minY = Math.min(...yOffsets), maxY = Math.max(...yOffsets);
  let padTop    = 12 + Math.max(0, maxY - 10);
  let padBottom = 12 + Math.max(0, -10 - minY);
  document.getElementById('preview-container').style.padding =
    `${padTop}px 0 ${padBottom}px 0`;
}

function renderPreview() {
  preview.innerHTML = '';
  let text = previewText.value || '';

  if (layers.length > 0) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const span = document.createElement('span');
      span.className = 'layer' + (i === layers.length - 1 ? ' base-layer' : '');
      span.textContent = text;
      span.style.fontFamily = layer.fontName;
      span.style.color = layer.color;
      span.style.opacity = typeof layer.opacity === 'number' ? layer.opacity : 1;
      span.style.transform = `translate(${layer.offsetX}px, ${-layer.offsetY}px)`;
      preview.appendChild(span);
    }
  }

  updatePreviewContainerPadding();
}

previewText.addEventListener('input', () => {
  renderPreview();
});
previewText.addEventListener('keydown', e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
  }
});

function handleFontFiles(files) {
  Array.from(files).forEach(file => {
    if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.ltf')) {
      const reader = new FileReader();
      reader.onload = function (e) {
        JSZip.loadAsync(e.target.result).then(async zip => {
          await Promise.all(Object.values(zip.files).map(async zipEntry => {
            if (!zipEntry.dir && /\.(ttf|otf|ltf)$/i.test(zipEntry.name)) {
              const basename = zipEntry.name.replace(/.*[\\/]/, '');
              fontFilesByBase[basename] = zipEntry;
            }
          }));
          updateStylesFromFonts();
          const presetsEntry = Object.values(zip.files).find(f => f.name.match(/^presets(\.json)?$/i));
          if (presetsEntry) {
            let text = await presetsEntry.async('string');
            let jsonData = null;
            try {
              jsonData = JSON.parse(text);
              allPresets = validateAndNormalizeJsonPresets(jsonData);
              setFamilyNameInput(allPresets.group || "");
              setMetadataInput(allPresets.metadata.description || "");
              updatePresetsDropdown();
              originalPresets = JSON.parse(JSON.stringify(allPresets));
              const keys = Object.keys(allPresets.presets);
              if (keys.length > 0) {
                presetsDropdown.value = keys[0];
                loadPresetOption(keys[0], false);
                setPresetNameInput(keys[0]);
                currentPresetName = keys[0];
              }
              isLoaded = true;
              updateStylesFromFonts();
              updateLayerList();
              renderPreview();
              showNotif('Font loaded');
              return;
            } catch (err) {
              showNotif('Malformed JSON in preset file.');
              return;
            }
          }
          loadAllFontsFromZipObject(zip);
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (/\.(ttf|otf|ltf|json)$/i.test(file.name)) {
      if (file.name.toLowerCase().endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = function (e) {
          let text = e.target.result;
          let jsonData = null;
          try {
            jsonData = JSON.parse(text);
            allPresets = validateAndNormalizeJsonPresets(jsonData);
            setFamilyNameInput(allPresets.group || "");
            setMetadataInput(allPresets.metadata.description || "");
            updatePresetsDropdown();
            originalPresets = JSON.parse(JSON.stringify(allPresets));
            const keys = Object.keys(allPresets.presets);
            if (keys.length > 0) {
              presetsDropdown.value = keys[0];
              loadPresetOption(keys[0], false);
              setPresetNameInput(keys[0]);
              currentPresetName = keys[0];
            }
            isLoaded = true;
            updateStylesFromFonts();
            updateLayerList();
            renderPreview();
            showNotif('Font loaded');
            return;
          } catch (err) {
            showNotif('Malformed JSON in preset file.');
            return;
          }
        };
        reader.readAsText(file);
      } else {
        const ext = file.name.match(/\.[^/.]+$/) ? file.name.match(/\.[^/.]+$/)[0] : ".otf";
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        let targetFilename = baseName + ext;
        let existed = Object.keys(fontFilesByBase).some(fname => fname === targetFilename);
        if (existed) {
          pendingFontAction = { file, base: baseName, ext, targetFilename };
          duplicateFontMsg.textContent = `A font with filename "${targetFilename}" already exists.`;
          duplicateFontModal.style.display = 'block';
          return;
        }
        processFontUpload(file, targetFilename);
      }
    }
  });
}

function validateAndNormalizeJsonPresets(data) {
  if (typeof data !== "object" || data === null)
    throw new Error("Preset file is not valid JSON object");

  // Group
  if (!("group" in data)) data.group = "";
  // Metadata
  if (!("metadata" in data) || typeof data.metadata !== "object" || data.metadata === null)
    data.metadata = { description: "" };
  if (!("description" in data.metadata))
    data.metadata.description = "";

  // Presets (object of name: [layers])
  if (!("presets" in data) || typeof data.presets !== "object" || data.presets === null)
    throw new Error("Preset file missing 'presets' dictionary");
  // Validate each preset is array of layers
  for (const [presetName, arr] of Object.entries(data.presets)) {
    if (!Array.isArray(arr))
      throw new Error(`Preset '${presetName}' is not an array of layers`);
    for (const [idx, layer] of arr.entries()) {
      if (typeof layer !== "object" || layer === null)
        throw new Error(`Layer ${idx+1} in preset '${presetName}' is not an object`);
      if (!("font" in layer)) throw new Error(`Layer ${idx+1} in preset '${presetName}' missing 'font'`);
      if (!("color" in layer)) layer.color = "#000000";
      if (!("opacity" in layer)) layer.opacity = 1;
      if (!("offset" in layer) || typeof layer.offset !== "object" || layer.offset === null)
        layer.offset = { x: 0, y: 0 };
      if (!("x" in layer.offset)) layer.offset.x = 0;
      if (!("y" in layer.offset)) layer.offset.y = 0;
      // 'name' is optional (alias)
    }
  }
  return {
    group: data.group,
    metadata: { description: data.metadata.description || "" },
    presets: data.presets
  };
}

function processFontUpload(file, targetFilename) {
  const url = URL.createObjectURL(file);
  const fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const displayName = targetFilename.replace(/\.[^/.]+$/, "");
  const fontFace = new FontFace(fontName, `url(${url})`);
  fontFace.load().then(loaded => {
    document.fonts.add(loaded);
    fontFilesByBase[targetFilename] = { url, isRuntime: true };
    updateStylesFromFonts();
    const styleObj = styles.find(s => s.filename === targetFilename);
    if (styleObj) {
      addFontAsLayer(styleObj).then(() => {
        updateLayerList();
        renderPreview();
        showNotif('Font uploaded');
      });
    }
  });
}

replaceFontBtn.onclick = function() {
  const {file, base, ext, targetFilename} = pendingFontAction;
  const url = URL.createObjectURL(file);
  fontFilesByBase[targetFilename] = { url, isRuntime: true };
  let updatedFontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const layersToUpdate = layers.filter(l => l.filename === targetFilename);
  layersToUpdate.forEach(layer => {
    layer.fileUrl = url;
    layer.fontName = updatedFontName + (Math.random().toString(36).substr(2, 3));
    try {
      const fontFace = new FontFace(layer.fontName, `url(${url})`);
      fontFace.load().then(loaded => {
        document.fonts.add(loaded);
        renderPreview();
      });
    } catch(e) {}
  });
  duplicateFontModal.style.display = 'none';
  pendingFontAction = null;
  showNotif('Font replaced');
  renderPreview();
};

addFontBtn.onclick = function() {
  const {file, base, ext} = pendingFontAction;
  let newFilename = getUniqueFilename(base, ext);
  processFontUpload(file, newFilename);
  duplicateFontModal.style.display = 'none';
  pendingFontAction = null;
  showNotif('Font added');
};
cancelFontBtn.onclick = function() {
  duplicateFontModal.style.display = 'none';
  pendingFontAction = null;
  showNotif('Cancelled');
};

async function loadAllFontsFromZipObject(zip) {
  let added = [];
  for (const zipEntry of Object.values(zip.files)) {
    if (!zipEntry.dir && /\.(ttf|otf|ltf)$/i.test(zipEntry.name)) {
      const blob = await zipEntry.async('blob');
      const url = URL.createObjectURL(blob);
      const fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const displayName = zipEntry.name.replace(/.*[\\/]/, '').replace(/\.[^/.]+$/, "");
      const filename = zipEntry.name.replace(/.*[\\/]/, '');
      const fontFace = new FontFace(fontName, `url(${url})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      fontFilesByBase[filename] = zipEntry;
      added.push(filename);
    }
  }
  updateStylesFromFonts();
  for (const fname of added) {
    const styleObj = styles.find(s => s.filename === fname);
    if (styleObj) {
      await addFontAsLayer(styleObj);
    }
  }
  updateLayerList();
  renderPreview();
  showNotif('Fonts loaded');
}

async function loadPresetOption(presetName, isPresetSwitch = true) {
  const preset = allPresets.presets[presetName];
  if (!preset) return;
  let loaded = [];
  for (const presetLayer of preset) {
    let entry = fontFilesByBase[presetLayer.font];
    let fileUrl, fontName;
    let baseOpacity = (typeof presetLayer.opacity === "number" && presetLayer.opacity > 1)
      ? presetLayer.opacity / 100
      : presetLayer.opacity;
    if (entry) {
      fontName = `font${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (entry.isRuntime && entry.url) {
        fileUrl = entry.url;
      } else if (typeof entry.async === "function") {
        let blob = await entry.async('blob');
        fileUrl = URL.createObjectURL(blob);
      }
      if (fileUrl) {
        const fontFace = new FontFace(fontName, `url(${fileUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
      }
    }
    loaded.push({
      id: Math.random().toString(36).substr(2, 9),
      fontName: fontName || "missingfont",
      displayName: presetLayer.font ? presetLayer.font.replace(/\.[^/.]+$/, "") : "",
      filename: presetLayer.font,
      color: presetLayer.color,
      opacity: baseOpacity,
      offsetX: presetLayer.offset?.x || 0,
      offsetY: presetLayer.offset?.y || 0,
      alias: presetLayer.name || "",
      fileUrl: fileUrl
      // allow future fields (blend_mode, visibility, etc.)
    });
  }
  layers = deepCopyLayers(loaded);
  updateLayerList();
  renderPreview();
  if (isPresetSwitch) {
    showNotif('Preset loaded');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setFamilyNameInput(allPresets.group || "");
  setMetadataInput(allPresets.metadata.description || "");
  updatePresetsDropdown();
  setPresetNameInput("");
  updateStylesFromFonts();
  updateLayerList();
  renderPreview();

  (function makePreviewContainerResizable() {
    const container = document.getElementById('preview-container');
    if (!container) return;

    const resizeHandle = document.createElement('div');
    resizeHandle.style.width = '100%';
    resizeHandle.style.height = '12px';
    resizeHandle.style.cursor = 'ns-resize';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.left = 0;
    resizeHandle.style.bottom = 0;
    resizeHandle.style.background = 'linear-gradient(to bottom, #e8e8f0, #e0e0ec 80%, #f7f7fa)';
    resizeHandle.style.zIndex = 10;
    resizeHandle.title = "Drag to resize preview area";

    container.style.position = 'relative';
    container.appendChild(resizeHandle);

    let isResizing = false;
    let startY, startHeight;

    resizeHandle.addEventListener('mousedown', function (e) {
      isResizing = true;
      startY = e.clientY;
      startHeight = container.offsetHeight;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
    });

    function stopResize() {
      isResizing = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    function doResize(e) {
      if (!isResizing) return;
      let newHeight = Math.max(60, startHeight + (e.clientY - startY));
      container.style.height = newHeight + 'px';
      const preview = document.getElementById('preview');
      if (preview) preview.style.height = newHeight + 'px';
    }

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);

    resizeHandle.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        isResizing = true;
        startY = e.touches[0].clientY;
        startHeight = container.offsetHeight;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';
      }
    }, {passive:false});
    document.addEventListener('touchmove', function(e) {
      if (!isResizing || e.touches.length !== 1) return;
      let newHeight = Math.max(60, startHeight + (e.touches[0].clientY - startY));
      container.style.height = newHeight + 'px';
      const preview = document.getElementById('preview');
      if (preview) preview.style.height = newHeight + 'px';
    }, {passive:false});
    document.addEventListener('touchend', stopResize);
  })();
});
