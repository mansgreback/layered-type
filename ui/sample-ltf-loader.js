// --- Sample LTF Loader Bar (Centered, Hide on Any Load, Horizontal Scroll, Auto-refresh) ---
// Add this script after the DOM is loaded. Update handleFontFiles if needed.

(function() {
  // Create the sample bar container
  const bar = document.createElement('div');
  bar.id = 'sampleLtfBar';
  bar.style.cssText = `
    width: 100%;
    max-width: 600px;
    background: #f5f7ff;
    border-bottom: 1.5px solid #c4c9ee;
    border-radius: 0 0 10px 10px;
    padding: 10px 0 8px 10px;
    font-size: 1em;
    box-shadow: 0 2px 10px #0001;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow-x: auto;
    margin-bottom: 0;
    margin-left: auto;
    margin-right: auto;
    justify-content: center;
  `;

  // Label
  const label = document.createElement('span');
  label.textContent = 'Try Samples:';
  label.style.cssText = 'font-size:1.08em;font-weight:500;margin-right:10px;white-space:nowrap;';
  bar.appendChild(label);

  // Horizontal scroll area for sample buttons
  const fileList = document.createElement('div');
  fileList.id = 'sampleLtfList';
  fileList.style.cssText = `
    display: flex;
    flex-wrap: nowrap;
    gap: 7px;
    overflow-x: auto;
    white-space: nowrap;
    width: auto;
    min-width: 0;
  `;
  bar.appendChild(fileList);

  // Insert the bar just before the drop area
  const dropArea = document.getElementById('fontDropArea');
  if (dropArea) {
    dropArea.parentNode.insertBefore(bar, dropArea);
  } else {
    // fallback to body top if can't find
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // Helper: Load sample LTF filenames from the /samples directory on GitHub
  async function listSampleLtfFiles() {
    fileList.innerHTML = `<em style="color:#888;">Loading samples...</em>`;
    try {
      const apiUrl = "https://api.github.com/repos/mansgreback/layered-type/contents/samples";
      const resp = await fetch(apiUrl, { cache: "no-store" });
      if (!resp.ok) throw new Error("Failed to fetch samples");
      const files = await resp.json();
      const ltfFiles = files.filter(f => f.name.endsWith('.ltf'));

      if (!ltfFiles.length) {
        fileList.innerHTML = `<span style="color:#a00;">No .ltf files found in /samples directory.</span>`;
        return;
      }
      fileList.innerHTML = '';
      ltfFiles.forEach(f => {
        const btn = document.createElement('button');
        btn.textContent = f.name;
        btn.style.cssText = `
          margin:0 0 0 0;
          padding:5px 18px;
          font-size:1em;
          border-radius:7px;
          background:#e9f1fa;
          border:1px solid #b0c6e4;
          cursor:pointer;
          white-space:nowrap;
          color:#1a2333;
          font-weight:500;
        `;
        btn.onclick = async function() {
          btn.disabled = true;
          btn.textContent = 'Loading...';
          try {
            const rawUrl = f.download_url;
            const resp = await fetch(rawUrl, { cache: "no-store" });
            if (!resp.ok) throw new Error("Failed to fetch file");
            const blob = await resp.blob();
            const fileObj = new File([blob], f.name, {type: blob.type || 'application/octet-stream'});
            if (typeof handleFontFiles === 'function') {
              handleFontFiles([fileObj]);
            }
            // Hide bar when any sample is loaded
            bar.style.display = 'none';
          } catch (err) {
            btn.textContent = 'Error!';
            btn.style.background = "#ffeaea";
            setTimeout(() => {
              btn.textContent = f.name;
              btn.disabled = false;
              btn.style.background = '#e9f1fa';
            }, 1800);
          }
        };
        fileList.appendChild(btn);
      });
    } catch (err) {
      fileList.innerHTML = `<span style="color:#a00;">Error loading samples.</span>`;
    }
  }

  // Initial load
  listSampleLtfFiles();

  // Auto-refresh the sample list every 60 seconds (in case files are added/removed)
  const sampleInterval = setInterval(listSampleLtfFiles, 60000);

  // Hide bar if any font, ltf, or sample is loaded.
  // This function should be called after any successful font/sample/preset load.
  function hideSampleBar() {
    bar.style.display = 'none';
    clearInterval(sampleInterval);
  }
  window.hideSampleBar = hideSampleBar; // For access from elsewhere if needed

  // Patch handleFontFiles to hide the bar when anything is loaded.
  // Only patch once!
  if (typeof handleFontFiles === 'function' && !handleFontFiles.__sampleBarPatched) {
    const origHandleFontFiles = handleFontFiles;
    window.handleFontFiles = function(files) {
      // Hide bar on any load
      hideSampleBar();
      return origHandleFontFiles.apply(this, arguments);
    };
    window.handleFontFiles.__sampleBarPatched = true;
  } else {
    // If handleFontFiles isn't available yet, patch it when defined
    Object.defineProperty(window, 'handleFontFiles', {
      configurable: true,
      set(fn) {
        if (!fn.__sampleBarPatched) {
          window.handleFontFiles = function(files) {
            hideSampleBar();
            return fn.apply(this, arguments);
          };
          window.handleFontFiles.__sampleBarPatched = true;
        }
      }
    });
  }

  // Optionally, also hide the bar if a file is loaded via <input type="file"> directly
  // (You can customize this part if your app uses a different element)
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener('change', function(evt) {
      if (evt.target.files && evt.target.files.length > 0) {
        hideSampleBar();
      }
    });
  }

})();