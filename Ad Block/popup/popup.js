/* Spectre AdBlocker — popup.js */

const uploadInput = document.getElementById("upload");
const urlInput    = document.getElementById("url-input");
const urlAddBtn   = document.getElementById("url-add");
const gallery     = document.getElementById("gallery");
const countEl     = document.getElementById("gallery-count");
const emptyEl     = document.getElementById("empty-state");
const hintEl      = document.getElementById("gallery-hint");
const modeFairBtn = document.getElementById("mode-fair");
const modeCustomBtn = document.getElementById("mode-custom");

let freqMode = "fair"; // "fair" | "custom"

// ── Storage ───────────────────────────────────────────────────────────────────
function load(cb) {
  chrome.storage.local.get(["allImages","activeImages","imageWeights","freqMode"], data => {
    cb(
      data.allImages    || [],
      data.activeImages || [],
      data.imageWeights || {},
      data.freqMode     || "fair"
    );
  });
}

function save(all, active, weights, mode, cb) {
  chrome.storage.local.set({ allImages: all, activeImages: active, imageWeights: weights, freqMode: mode }, cb || (() => {}));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDisplayURL(src) {
  if (src.startsWith("data:") || src.startsWith("http")) return src;
  return "../" + src;
}

function weightToStars(w) {
  return "★".repeat(w) + "☆".repeat(5 - w);
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderGallery() {
  load((all, active, weights, mode) => {
    freqMode = mode;

    // Sync toggle buttons
    modeFairBtn.classList.toggle("active",   mode === "fair");
    modeCustomBtn.classList.toggle("active", mode === "custom");
    hintEl.textContent = mode === "custom"
      ? "Clique • glisse le curseur pour la fréquence"
      : "Clique pour activer / désactiver";

    const activeSet = new Set(active);
    gallery.innerHTML = "";
    countEl.textContent = `${all.length} image${all.length !== 1 ? "s" : ""}`;
    emptyEl.hidden = all.length > 0;

    all.forEach(src => {
      const isActive = activeSet.has(src);
      const weight   = weights[src] || 1;

      const card = document.createElement("div");
      card.className = "img-card " + (isActive ? "active" : "inactive");

      const img  = document.createElement("img");
      img.src    = toDisplayURL(src);
      img.alt    = "";
      img.loading = "lazy";

      const check = document.createElement("span");
      check.className   = "badge-check";
      check.textContent = "✓";

      const del = document.createElement("button");
      del.className   = "btn-delete";
      del.textContent = "✕";
      del.title = "Supprimer";

      // Frequency bar (shown in custom mode)
      const freqBar = document.createElement("div");
      freqBar.className = "freq-bar" + (mode === "custom" ? " visible" : "");

      const stars = document.createElement("div");
      stars.className   = "freq-stars";
      stars.textContent = weightToStars(weight);

      const slider = document.createElement("input");
      slider.type  = "range";
      slider.min   = "1";
      slider.max   = "5";
      slider.value = String(weight);

      freqBar.appendChild(slider);
      freqBar.appendChild(stars);

      // ── Events ──────────────────────────────────────────────────────────
      card.addEventListener("click", e => {
        if (e.target === del || e.target === slider) return;
        load((all2, active2, weights2, mode2) => {
          const s = new Set(active2);
          s.has(src) ? s.delete(src) : s.add(src);
          save(all2, [...s], weights2, mode2, renderGallery);
        });
      });

      del.addEventListener("click", e => {
        e.stopPropagation();
        load((all2, active2, weights2, mode2) => {
          const newAll    = all2.filter(s => s !== src);
          const newActive = active2.filter(s => s !== src);
          const newW      = { ...weights2 };
          delete newW[src];
          save(newAll, newActive, newW, mode2, renderGallery);
        });
      });

      slider.addEventListener("input", e => {
        e.stopPropagation();
        const v = parseInt(slider.value);
        stars.textContent = weightToStars(v);
      });

      slider.addEventListener("change", e => {
        e.stopPropagation();
        const v = parseInt(slider.value);
        load((all2, active2, weights2, mode2) => {
          const newW = { ...weights2, [src]: v };
          save(all2, active2, newW, mode2);
        });
      });

      card.appendChild(img);
      card.appendChild(check);
      card.appendChild(del);
      card.appendChild(freqBar);
      gallery.appendChild(card);
    });
  });
}

// ── Frequency mode toggle ─────────────────────────────────────────────────────
modeFairBtn.addEventListener("click", () => {
  load((all, active, weights) => save(all, active, weights, "fair", renderGallery));
});
modeCustomBtn.addEventListener("click", () => {
  load((all, active, weights) => save(all, active, weights, "custom", renderGallery));
});

// ── Upload from file ──────────────────────────────────────────────────────────
uploadInput.addEventListener("change", e => {
  const files = [...e.target.files];
  if (!files.length) return;
  uploadInput.value = "";
  let pending = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      load((all, active, weights, mode) => {
        if (all.includes(dataUrl)) { if (--pending === 0) renderGallery(); return; }
        save([...all, dataUrl], [...active, dataUrl], weights, mode, () => {
          if (--pending === 0) renderGallery();
        });
      });
    };
    reader.readAsDataURL(file);
  });
});

// ── Add from URL ──────────────────────────────────────────────────────────────
// Error label (created once, inserted after url-row)
const urlError = document.createElement("p");
urlError.className = "url-error";
urlAddBtn.parentElement.after(urlError);

function showUrlError(msg) {
  urlError.textContent = msg;
  urlError.classList.add("visible");
  setTimeout(() => urlError.classList.remove("visible"), 3000);
}

function addImageFromURL(rawUrl) {
  const url = rawUrl.trim();
  if (!url) return;

  // Basic URL validation
  try { new URL(url); } catch (_) { showUrlError("URL invalide."); return; }
  if (!/^https?:\/\//i.test(url)) { showUrlError("L'URL doit commencer par https://"); return; }

  // Check it looks like an image
  const ext = url.split("?")[0].toLowerCase();
  const looksLikeImage = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)$/.test(ext);

  load((all, active, weights, mode) => {
    if (all.includes(url)) { showUrlError("Cette image est déjà dans la galerie."); return; }

    // Fetch and convert to data URL so it works offline & cross-origin
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      })
      .then(blob => {
        // Verify it's actually an image
        if (!blob.type.startsWith("image/")) throw new Error("Pas une image.");
        return new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload  = () => res(fr.result);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
      })
      .then(dataUrl => {
        save([...all, dataUrl], [...active, dataUrl], weights, mode, () => {
          urlInput.value = "";
          renderGallery();
        });
      })
      .catch(err => {
        // If fetch fails (CORS etc.) store the URL directly
        if (looksLikeImage) {
          save([...all, url], [...active, url], weights, mode, () => {
            urlInput.value = "";
            renderGallery();
          });
        } else {
          showUrlError("Impossible de charger cette image.");
        }
      });
  });
}

urlAddBtn.addEventListener("click", () => addImageFromURL(urlInput.value));
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") addImageFromURL(urlInput.value); });

// ── Init ──────────────────────────────────────────────────────────────────────
renderGallery();
