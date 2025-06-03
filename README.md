# Layered Type

**Layered Type** is a new font concept, packaged as a **Layered Type File (LTF)**. An LTF is essentially a collection of OTF/TTF fonts bundled with a `presets.json` file that defines the order, color, opacity, and X/Y positioning of *layers*. Each LTF can include multiple predefined *presets*, and *styles* (i.e., font files) can be reused, repeated, or omitted entirely in different layers. Users can recolor specific layers through a UI, offering flexibility and creative control.

This format is especially helpful for font creators aiming to deliver high-quality, layered typography with ease. It simplifies the process compared to traditional *layer fonts* (which require separate files and manual organization), while providing more flexibility than fixed-color formats like COLR/SVG, whose colors aren't easily customizable.

For font designers, LTF offers a powerful way to present fonts at their best.

---

## Key Differences from Existing Formats

### SVG Fonts
- Characters in LTF do **not** overlap unless designed that way.
- Shadows/outlines can be added behind full words without overlapping glyphs.
- Supports user-defined color changes.
- All combinations are stored as *presets* within a single file.
- Potentially faster rendering by applying styles to full layers, not individual glyphs.
- Can be used to package an entire font family into one file.
- Supports monochrome stacking as well as color.
- File sizes can be smaller through style reuse.

### Traditional Layer Fonts
- No manual setup needed for users—layers are ready-to-use.

---

## Disadvantages

- No native support in current font rendering systems.
- Requires stylistic overlap to be handled via font design, not rendering.
- Alternating colors within words is more complex.
- Misaligned styles (e.g., kerning/glyph metrics) may result in layer dislocation.

---

## Current Features

### Export Image
- Copy as expanded SVG or SVG font layers (fonts must be installed).
- Save directly as PNG or SVG.

### Randomizer
- Randomize layer properties: order, opacity, X/Y offset, etc.
- Choose which settings to randomize.

### Metadata
- Metadata (information, licnese, description, etc.) can be saved in the font.
- Expandable JSON format, allowing for separate metadata fields. 

---

## Potential Features

These enhancements are under a variable degree of consideration, though core design remains in the font creation stage:

### Gradients
- Possible via SVG, but design complexity increases (e.g., multiline behavior, per-glyph handling).

### Stroke/Outline Layer
- Could reduce need for additional styles; however, may render inconsistently.

### SVG Font Compatibility/Conversion
- Detect and open SVG fonts using `a.layer0` naming convention.
- UI might support exporting a preset as an SVG font for convenience.

### Metrics & Alignment
- Currently, all styles must match metrics/features for proper alignment.
- Auto-alignment is being explored, but is complex and buggy in early UI tests.

### Tracking
- Adjust letter spacing per layer (would require similar alignment logic as above).

### Overlaying Characters Support
- Could simulate traditional color fonts, but conflicts with LTF’s stacking model.

### Variable Font Support
- Allow style interpolation via a variable axis.

### Linked Colors
- Allow end-users to change multiple linked layers with a single click.

### Glyphs App Integration
- Export OTF master/instances from Glyphs, generate the `presets.json` file and package into an LTF.

### Preview Enhancements
- Custom preview sizes.
- Preset reordering or alphabetical sorting.
- Allow font creators to define default preview text.
- UI preview background color toggle (not stored in `presets.json`).

---

## Planned Improvements

- **Reusable Presets File:** Import presets.json from other LTFs.
- **Lock Features:** Restrict editing of certain layers (e.g., always keep shadow black).
- **Separate UIs:** One for font creators (possibly in Glyphs), and another for end-users (e.g., Illustrator plugin).

---

## Terminology

- **Style:** A standard OTF/TTF font embedded in the LTF.
- **Layer:** A combination of a style, color, opacity, and X/Y offset.
- **Preset:** A named set of layers in a defined order.

Each LTF can contain multiple presets using any combination of the included styles.

---

## Notes & Considerations

- Tested on Chrome version 136.
- UI is a proof of concept—compact and adaptable.
- You can upload new styles while working with an existing LTF.
- Opening a new LTF retains existing styles and adds new ones, but **replaces the presets**.
- Fonts not used in any preset are excluded from the final exported LTF (helps reduce file size).

---

## Final Thoughts

- This format may already exist under another name or standard—any feedback is welcome.
- It’s possible the concept isn't widely needed, but personally, I find it useful for how it handles layered typography.
- There may be rendering bugs or platform inconsistencies I haven’t yet encountered.

**Your interest, feedback, and contributions are highly appreciated!**
