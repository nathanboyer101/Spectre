/* William Ad Blocker — content.js */

const processedAds = new WeakSet();

// ── Ad domain list ────────────────────────────────────────────────────────────
const AD_DOMAINS = [
  "doubleclick","googlesyndication","googleadservices","googletagservices",
  "googletagmanager","adservice.google","pagead2.googlesyndication",
  "criteo","taboola","outbrain",
  "smartadserver","sparteo",
  "appnexus","xandr","adnxs",
  "pubmatic","rubiconproject","openx",
  "amazon-adsystem",
  "casalemedia","indexexchange",
  "adform","adroll","advertising.com",
  "ads.yahoo","ads.twitter","static.ads-twitter",
  "ads.tiktok","analytics.tiktok",
  "bidswitch","smaato","lijit","sonobi",
  "yieldmo","media.net","revcontent","mgid",
  "sharethrough","triplelift","districtm","teads",
  "moatads","moatpixel","adsafeprotected","doubleverify",
  "scorecardresearch","everesttech",
  "adtech.de","adtech.com",
  "contextweb","pulsepoint",
  "33across","emxdgt","conversantmedia",
  "ligatus","sublime.systems","digiteka","nextperf",
  "affialive","tradedoubler","zanox","effiliation",
  "weborama","netlinkup","adikteev"
];

// ── IAB standard sizes ────────────────────────────────────────────────────────
const IAB_SIZES = new Set([
  "300x250","728x90","160x600","300x600","320x50","320x100",
  "300x100","468x60","250x250","200x200","336x280","120x600",
  "120x240","970x90","970x250","980x120","750x300","750x200",
  "750x100","930x180","980x90","320x480","300x1050"
]);

// ── id/class keyword scoring ──────────────────────────────────────────────────
const ATTR_KEYWORDS = [
  "advertisement","advertising","adsense",
  "ad-container","ad-wrapper","ad-slot","ad-unit","ad-banner",
  "ad-block","ad-region","ad-zone","ad-box","ad-frame","ad-insert",
  "adsbygoogle","ads-container","ads-wrapper","ads-slot","ads-block",
  "sponsored","sponsorship","promo-ad","native-ad","pub-",
  "dfp-ad","gpt-ad","prebid","publicite","publicité",
  "sticky-ad","adhesion-ad","interstitial","leaderboard","skyscraper",
  "mrec","halfpage","billboard"
];

// ── Text patterns that mark an empty ad placeholder ──────────────────────────
// Regex that matches elements whose visible text is *only* an ad label
const AD_TEXT_RE = /^\s*(publicité|publicite|advertisement|pub|sponsored|annonce)\s*$/i;

// ── Selectors ─────────────────────────────────────────────────────────────────
const AD_SELECTOR = [
  // Standard ad tags
  "iframe",
  "ins.adsbygoogle",
  "ins[data-ad-slot]",
  // Data attributes
  "[data-ad]","[data-ad-slot]","[data-ad-unit]","[data-ad-format]",
  "[data-google-query-id]","[data-dfp]","[data-prebid]",
  "[data-taboola-widget]","[data-outbrain-widget]",
  // ID patterns
  "[id*='google_ads']","[id*='div-gpt-ad']","[id*='dfp-ad']",
  "[id*='taboola']","[id*='outbrain']","[id*='criteo']",
  "[id*='smartad']","[id*='prebid']","[id*='adzone']",
  "[id*='pub-']","[id*='-pub']","[id*='banner-ad']",
  // Class patterns
  "[class*='adsbygoogle']","[class*='dfp-']","[class*='gpt-ad']",
  "[class*='ad-unit']","[class*='ad-container']","[class*='ad-wrapper']",
  "[class*='ad-slot']","[class*='ad-banner']","[class*='ad-block']",
  "[class*='ad-frame']","[class*='ad-zone']","[class*='ad-insert']",
  "[class*='ads-']","[class*='sponsor']","[class*='publicite']",
  "[class*='leaderboard']","[class*='skyscraper']","[class*='mrec']",
  "[class*='halfpage']","[class*='billboard']","[class*='sticky-ad']",
  // Allociné / 20minutes specific
  "[class*='allocation']","[id*='allo-ad']",
  "[class*='adtech']","[id*='adtech']",
  "[class*='sublime']","[id*='sublime']",
  "[class*='teads']","[id*='teads']"
].join(",");

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasDomain(str) {
  for (const d of AD_DOMAINS) {
    if (str.includes(d)) return true;
  }
  return false;
}

function isIabSize(w, h) {
  return IAB_SIZES.has(`${Math.round(w)}x${Math.round(h)}`);
}

function toURL(img) {
  return img.startsWith("data:") ? img : chrome.runtime.getURL(img);
}

function pickImage(images) {
  return images[Math.floor(Math.random() * images.length)];
}

// ── Detect empty placeholder left by ad blockers (like "20minutes publicité") ─
function isAdPlaceholder(el) {
  // Must have a non-trivial size
  const w = el.offsetWidth, h = el.offsetHeight;
  if (w < 80 || h < 20) return false;

  // Get only direct visible text (ignore children that have content)
  const text = el.innerText || el.textContent || "";
  if (AD_TEXT_RE.test(text.trim())) return true;

  // Also catch elements that contain *only* a label child + no real content
  // e.g. <div class="ad-wrapper"><span>Publicité</span></div>
  const children = [...el.children].filter(c => c.offsetWidth > 0 || c.offsetHeight > 0);
  if (children.length <= 2) {
    const childText = children.map(c => (c.innerText || c.textContent || "").trim()).join(" ");
    if (AD_TEXT_RE.test(childText)) return true;
  }

  return false;
}

// ── Score an element ──────────────────────────────────────────────────────────
function scoreElement(el) {
  if (!el || !el.isConnected) return 0;

  const tag = el.tagName;
  const src = (el.src || el.currentSrc || "").toLowerCase();

  let score = 0;

  if ((tag === "IFRAME" || tag === "IMG") && src && hasDomain(src)) score += 10;
  if (tag === "INS" && el.classList.contains("adsbygoogle")) score += 12;

  if (el.hasAttribute("data-ad-slot"))         score += 10;
  if (el.hasAttribute("data-google-query-id")) score += 10;
  if (el.hasAttribute("data-ad"))              score += 8;
  if (el.hasAttribute("data-ad-unit"))         score += 8;
  if (el.hasAttribute("data-dfp"))             score += 8;
  if (el.hasAttribute("data-prebid"))          score += 8;
  if (el.hasAttribute("data-taboola-widget"))  score += 10;
  if (el.hasAttribute("data-outbrain-widget")) score += 10;

  const id  = (el.id || "").toLowerCase();
  const cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
  const combined = id + " " + cls;

  for (const kw of ATTR_KEYWORDS) {
    if (combined.includes(kw)) { score += 4; break; }
  }
  if (/div[-_]?gpt[-_]?ad/i.test(id))  score += 10;
  if (/google[_-]?ads/i.test(id))       score += 10;

  try {
    const bg = getComputedStyle(el).backgroundImage.toLowerCase();
    if (bg && bg !== "none" && hasDomain(bg)) score += 8;
  } catch (_) {}

  const w = el.offsetWidth, h = el.offsetHeight;
  if (isIabSize(w, h)) score += 6;
  if (w >= 80 && h >= 30) score += 1;

  // Empty placeholder with only "publicité" text = definite ad
  if (isAdPlaceholder(el)) score += 15;

  return score;
}

const SCORE_THRESHOLD = 5;

function isLayoutElement(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  // Skip full-page overlays
  if (w > window.innerWidth * 0.9 && h > window.innerHeight * 0.55) return true;
  return false;
}

// ── Build replacement with blurred background effect ─────────────────────────
//
// Layout:
//   .william-replacement  (clip container, exact ad size)
//     .william-bg         (blurred low-opacity bg layer, same image, cover)
//     a
//       img.william-image (main image, contain so it's fully visible)
//
function createReplacement(width, height, imageUrl) {
  const box = document.createElement("div");
  box.className = "william-replacement";
  box.style.cssText = [
    `width:${width}px`,
    `height:${height}px`,
    "display:block",
    "overflow:hidden",
    "position:relative",
    "box-sizing:border-box"
  ].join(";");

  // ── Blurred background layer ──────────────────────────────────────────────
  const bg = document.createElement("div");
  bg.className = "william-bg";
  bg.style.cssText = [
    "position:absolute",
    "inset:0",
    `background-image:url('${imageUrl}')`,
    "background-size:cover",
    "background-position:center",
    "filter:blur(18px)",
    "opacity:0.35",
    "transform:scale(1.08)", // avoid white blur edges
    "pointer-events:none",
    "z-index:0"
  ].join(";");

  // ── Foreground link + image ───────────────────────────────────────────────
  const a = document.createElement("a");
  a.href   = "https://www.linkedin.com/in/william-rouviere";
  a.target = "_blank";
  a.rel    = "noopener noreferrer";
  a.style.cssText = [
    "display:block",
    "width:100%",
    "height:100%",
    "position:relative",
    "z-index:1",
    "line-height:0"
  ].join(";");

  const img = document.createElement("img");
  img.src   = imageUrl;
  img.alt   = "";
  // object-fit:contain so the FULL image is always visible
  img.style.cssText = [
    "display:block!important",
    "width:100%!important",
    "height:100%!important",
    "object-fit:contain!important",
    "object-position:center!important"
  ].join(";");

  a.appendChild(img);
  box.appendChild(bg);
  box.appendChild(a);
  return box;
}

// ── Replace with deferred sizing ─────────────────────────────────────────────
function attemptReplace(el, images, attempt) {
  if (!el.isConnected) return;

  const w = el.offsetWidth  || el.getBoundingClientRect().width;
  const h = el.offsetHeight || el.getBoundingClientRect().height;

  if ((w < 10 || h < 10) && attempt < 10) {
    setTimeout(() => attemptReplace(el, images, attempt + 1), 200 * Math.pow(1.5, attempt));
    return;
  }

  const width  = Math.max(Math.round(w),  300);
  const height = Math.max(Math.round(h),  100);
  const url    = toURL(pickImage(images));

  el.replaceWith(createReplacement(width, height, url));
}

function replaceAd(el, images) {
  if (processedAds.has(el)) return;
  processedAds.add(el);
  attemptReplace(el, images, 0);
}

// ── Extra pass: scan for placeholder-only elements (Allociné, 20min…) ────────
function scanPlaceholders(images) {
  // Walk ALL block-level elements looking for pure "publicité" placeholders
  // that may not match the CSS selector (no ad class, just empty div with text)
  const blockEls = document.querySelectorAll("div,section,aside,article,figure");
  blockEls.forEach(el => {
    if (processedAds.has(el)) return;
    if (!el.isConnected) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 80 || h < 20) return;
    if (isLayoutElement(el)) return;
    if (isAdPlaceholder(el)) {
      replaceAd(el, images);
    }
  });
}

// ── Main scan ─────────────────────────────────────────────────────────────────
let scanScheduled = false;
let cachedImages  = null;
let cacheExpiry   = 0;

function runScan(images) {
  // Pass 1 — selector-based (fast)
  document.querySelectorAll(AD_SELECTOR).forEach(el => {
    if (processedAds.has(el) || !el.isConnected) return;
    if (isLayoutElement(el)) return;
    if (scoreElement(el) >= SCORE_THRESHOLD) replaceAd(el, images);
  });

  // Pass 2 — text-placeholder sweep (catches Allociné / 20min style)
  scanPlaceholders(images);
}

function scan() {
  if (scanScheduled) return;
  scanScheduled = true;

  const now = Date.now();
  if (cachedImages && now < cacheExpiry) {
    if (cachedImages.length > 0) runScan(cachedImages);
    scanScheduled = false;
    return;
  }

  chrome.storage.local.get(["activeImages"], data => {
    cachedImages = data.activeImages || [];
    cacheExpiry  = Date.now() + 5000;
    scanScheduled = false;
    if (cachedImages.length > 0) runScan(cachedImages);
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scan);
} else {
  scan();
}
window.addEventListener("load", () => {
  scan();
  setTimeout(scan, 800);
  setTimeout(scan, 2500);
  setTimeout(scan, 5000);
});

// ── MutationObserver ──────────────────────────────────────────────────────────
let mutationTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(mutationTimer);
  mutationTimer = setTimeout(scan, 500);
});

function startObserver() {
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
if (document.body) startObserver();
else document.addEventListener("DOMContentLoaded", startObserver);

// ── Cache invalidation ────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener(changes => {
  if (changes.activeImages) {
    cachedImages = changes.activeImages.newValue || [];
    cacheExpiry  = Date.now() + 5000;
  }
});
