
//  Copyright 2025 Måns Grebäck
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  http://www.apache.org/licenses/LICENSE-2.0

//  Layered Type is a font packaging format that combines multiple font 
//  styles into a single file (LTF) with customizable visual presets. 
//  More information, samples, and demo at 
//  https://github.com/mansgreback/layered-type

function createExportDialog() {
  const old = document.getElementById('exportImageModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'exportImageModal';
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(32,32,42,0.19)';
  modal.style.zIndex = 99999;
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  const dialog = document.createElement('div');
  dialog.style.background = '#fff';
  dialog.style.borderRadius = '10px';
  dialog.style.boxShadow = '0 2px 24px #0003';
  dialog.style.padding = '28px 32px 20px 32px';
  dialog.style.minWidth = '320px';
  dialog.style.maxWidth = '98vw';

  dialog.innerHTML = `
    <div style="font-size:1.2em;font-weight:bold;margin-bottom:18px;text-align:center;">Export Image</div>
    <div style="margin-bottom:20px;">
      <div style="font-weight:bold;margin-bottom:4px;">Copy to Clipboard</div>
      <button id="copySvgExpandedBtn" style="margin:2px 10px 2px 0;">SVG (Expanded Outline)</button>
      <button id="copySvgFontBtn" style="margin:2px 0 2px 0;">SVG (Fonts Intact)</button>
    </div>
    <div style="margin-bottom:20px;">
      <div style="font-weight:bold;margin-bottom:4px;">Download</div>
      <button id="downloadSvgBtn" style="margin:2px 10px 2px 0;">SVG</button>
      <button id="downloadPngBtn" style="margin:2px 6px 2px 0;">PNG</button>
      <span style="margin-right:4px;">Width (px):</span>
      <input id="pngWidthInput" type="number" style="width:74px;" value="1000" min="10" max="5000">
    </div>
    <div style="text-align:center;">
      <button id="closeExportModalBtn" style="margin-top:6px;">Close</button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  async function computeVectorBBox(padding = 10) {
    // Returns {minX, minY, maxX, maxY}
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const text = previewText.value;
    for (const layer of [...layers].slice().reverse()) {
      if (!layer.fileUrl) continue;
      try {
        const font = await new Promise((resolve, reject) => {
          opentype.load(layer.fileUrl, (err, font) => err ? reject(err) : resolve(font));
        });
        const path = font.getPath(text, 10 + layer.offsetX, 150 - layer.offsetY, 64);
        const bbox = path.getBoundingBox();
        minX = Math.min(minX, bbox.x1);
        minY = Math.min(minY, bbox.y1);
        maxX = Math.max(maxX, bbox.x2);
        maxY = Math.max(maxY, bbox.y2);
      } catch (err) {
        // Ignore
      }
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      // fallback
      return {minX: 0, minY: 0, maxX: 2000, maxY: 200, width: 2000, height: 200};
    }
    minX = Math.floor(minX) - padding;
    minY = Math.floor(minY) - padding;
    maxX = Math.ceil(maxX) + padding;
    maxY = Math.ceil(maxY) + padding;
    return {minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY};
  }

  async function getExpandedSvgCropped() {
    const text = previewText.value;
    const bbox = await computeVectorBBox(10);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', bbox.width);
    svg.setAttribute('height', bbox.height);
    svg.setAttribute('viewBox', `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`);
    const pathGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (const layer of [...layers].slice().reverse()) {
      if (!layer.fileUrl) continue;
      try {
        const font = await new Promise((resolve, reject) => {
          opentype.load(layer.fileUrl, (err, font) => err ? reject(err) : resolve(font));
        });
        const path = font.getPath(text, 10 + layer.offsetX, 150 - layer.offsetY, 64);
        const d = path.toPathData();
        const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElem.setAttribute('d', d);
        pathElem.setAttribute('fill', layer.color);
        pathElem.setAttribute('opacity', typeof layer.opacity === 'number' ? layer.opacity : 1);
        pathGroup.appendChild(pathElem);
      } catch (err) { }
    }
    svg.appendChild(pathGroup);
    return new XMLSerializer().serializeToString(svg);
  }

  async function getFontsIntactSvgCropped() {
    const text = previewText.value;
    const bbox = await computeVectorBBox(10);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', bbox.width);
    svg.setAttribute('height', bbox.height);
    svg.setAttribute('viewBox', `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`);
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (const layer of [...layers].slice().reverse()) {
      if (!layer.fileUrl) continue;
      const textElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElem.setAttribute('x', 10 + layer.offsetX);
      textElem.setAttribute('y', 150 - layer.offsetY);
      textElem.setAttribute('fill', layer.color);
      textElem.setAttribute('opacity', typeof layer.opacity === 'number' ? layer.opacity : 1);
      textElem.setAttribute('font-family', layer.displayName);
      textElem.setAttribute('font-size', '64px');
      textElem.textContent = text;
      textGroup.appendChild(textElem);
    }
    svg.appendChild(textGroup);
    return new XMLSerializer().serializeToString(svg);
  }

  function downloadFile(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); }, 200);
  }

  dialog.querySelector('#copySvgExpandedBtn').onclick = async () => {
    const svgString = await getExpandedSvgCropped();
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(svgString);
      if (typeof showNotif === "function") showNotif('SVG (Outline) copied!');
    } else {
      const temp = document.createElement('textarea');
      temp.value = svgString;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      if (typeof showNotif === "function") showNotif('SVG (Outline) copied!');
    }
  };

  dialog.querySelector('#copySvgFontBtn').onclick = async () => {
    const svgString = await getFontsIntactSvgCropped();
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(svgString);
      if (typeof showNotif === "function") showNotif('SVG (Fonts Intact) copied!');
    } else {
      const temp = document.createElement('textarea');
      temp.value = svgString;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      if (typeof showNotif === "function") showNotif('SVG (Fonts Intact) copied!');
    }
  };

  dialog.querySelector('#downloadSvgBtn').onclick = async () => {
    const svgString = await getExpandedSvgCropped();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    downloadFile(blob, 'export.svg');
    if (typeof showNotif === "function") showNotif('SVG downloaded!');
  };

  dialog.querySelector('#downloadPngBtn').onclick = async () => {
    const svgString = await getExpandedSvgCropped();
    const bbox = await computeVectorBBox(10);
    const pngWidth = parseInt(dialog.querySelector('#pngWidthInput').value, 10) || bbox.width;
    const scale = pngWidth / bbox.width;
    const pngHeight = Math.round(bbox.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = pngWidth;
    canvas.height = pngHeight;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    img.onload = function() {
      ctx.clearRect(0, 0, pngWidth, pngHeight);
      ctx.drawImage(img, 0, 0, pngWidth, pngHeight);
      canvas.toBlob(function(blob) {
        downloadFile(blob, 'export.png');
        if (typeof showNotif === "function") showNotif('PNG downloaded!');
      }, 'image/png');
    };
    img.onerror = function() {
      if (typeof showNotif === "function") showNotif('Error rendering PNG');
    };
    img.src = svg64;
  };

  dialog.querySelector('#closeExportModalBtn').onclick = function() {
    modal.remove();
  };

  modal.addEventListener('keydown', e => {
    if (e.key === "Escape") modal.remove();
  });
  setTimeout(() => dialog.focus(), 20);
}

function addExportImageButton() {
  if (document.getElementById('exportImageBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'exportImageBtn';
  btn.textContent = 'Export Image';
  btn.className = 'layerBtn';
  btn.style.marginLeft = '10px';
  btn.onclick = () => createExportDialog();
  const row = document.getElementById('fontRow');
  if (row) row.appendChild(btn);
}

window.addEventListener('DOMContentLoaded', addExportImageButton);