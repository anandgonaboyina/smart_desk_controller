# 📊 SmartDesk V2 Presentation Slides Guide

This folder contains the complete slide deck for the **SmartDesk V2** project in two formats:
1. **Interactive HTML Slides (`presentation_slides.html`)** — Immediate preview and 1-click PDF export in any browser or VS Code.
2. **LaTeX Beamer Source (`presentation_slides.tex`)** — Academic standard Beamer slide deck.

---

## 🚀 How to View and Take Output in VS Code

### Option 1: Instant HTML Presentation & 1-Click PDF Export (Recommended)
You can view the full 16:9 presentation directly without installing any LaTeX tools:

1. In VS Code, right-click on [`presentation_slides.html`](presentation_slides.html).
2. Choose **Open in Default Browser** (or **Open with Live Server** if you use the Live Server extension).
3. **Controls:**
   - Use the **◀ / ▶ buttons** or the **Left / Right Arrow Keys** (or Spacebar) to advance slides.
   - Press **F** for Fullscreen Presentation Mode.
   - Click **🖨️ Export to PDF** (or press `Ctrl + P`), choose **"Save as PDF"**, set Orientation to **Landscape**, and click **Save**!

---

## 📄 Option 2: Compiling LaTeX Beamer (`presentation_slides.tex`)

If you want to compile the LaTeX `.tex` file directly:

### A. Free Online 1-Click Compilation (Overleaf)
1. Go to [Overleaf.com](https://www.overleaf.com) and create a **New Project → Upload Project**.
2. Upload `presentation_slides.tex` and `logo.png`.
3. Click **Recompile** — the PDF is generated instantly!

### B. Local Compilation via VS Code (Requires TeX Distribution)
If you want VS Code's LaTeX Workshop extension to compile `.tex` files locally:
1. Install a TeX distribution on Windows:
   - **MiKTeX** (recommended, minimal ~200MB): [https://miktex.org/download](https://miktex.org/download)
   - Or **TeX Live**: [https://tug.org/texlive/](https://tug.org/texlive/)
2. Restart VS Code.
3. Open `presentation_slides.tex` and press `Ctrl + Alt + B` (or click the green play button in LaTeX Workshop).
4. Click **View LaTeX PDF** (`Ctrl + Alt + V`) to open the PDF preview tab inside VS Code.
