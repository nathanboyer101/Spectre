/* Spectre AdBlocker — content.js */

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
  "adtech.de","adtech.com","contextweb","pulsepoint",
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

// ── Keywords ──────────────────────────────────────────────────────────────────
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

const AD_TEXT_RE = /^\s*(publicité|publicite|advertisement|pub|sponsored|annonce)\s*$/i;

// ── Selectors ─────────────────────────────────────────────────────────────────
const AD_SELECTOR = [
  "iframe","ins.adsbygoogle","ins[data-ad-slot]",
  "[data-ad]","[data-ad-slot]","[data-ad-unit]","[data-ad-format]",
  "[data-google-query-id]","[data-dfp]","[data-prebid]",
  "[data-taboola-widget]","[data-outbrain-widget]",
  "[id*='google_ads']","[id*='div-gpt-ad']","[id*='dfp-ad']",
  "[id*='taboola']","[id*='outbrain']","[id*='criteo']",
  "[id*='smartad']","[id*='prebid']","[id*='adzone']",
  "[id*='pub-']","[id*='-pub']","[id*='banner-ad']",
  "[class*='adsbygoogle']","[class*='dfp-']","[class*='gpt-ad']",
  "[class*='ad-unit']","[class*='ad-container']","[class*='ad-wrapper']",
  "[class*='ad-slot']","[class*='ad-banner']","[class*='ad-block']",
  "[class*='ad-frame']","[class*='ad-zone']","[class*='ad-insert']",
  "[class*='ads-']","[class*='sponsor']","[class*='publicite']",
  "[class*='leaderboard']","[class*='skyscraper']","[class*='mrec']",
  "[class*='halfpage']","[class*='billboard']","[class*='sticky-ad']",
  "[class*='allocation']","[id*='allo-ad']",
  "[class*='adtech']","[id*='adtech']",
  "[class*='sublime']","[id*='sublime']",
  "[class*='teads']","[id*='teads']"
].join(",");

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasDomain(str) {
  for (const d of AD_DOMAINS) { if (str.includes(d)) return true; }
  return false;
}
function isIabSize(w, h) { return IAB_SIZES.has(`${Math.round(w)}x${Math.round(h)}`); }
function toURL(img) { return img.startsWith("data:") ? img : chrome.runtime.getURL(img); }

// ── Weighted random pick ──────────────────────────────────────────────────────
// imageWeights: { [src]: weight (1-5) }  — missing = weight 1
function pickImage(images, weights) {
  if (!images.length) return null;
  if (!weights || Object.keys(weights).length === 0) {
    return images[Math.floor(Math.random() * images.length)];
  }
  // Build weighted pool
  const pool = [];
  for (const src of images) {
    const w = weights[src] || 1;
    for (let i = 0; i < w; i++) pool.push(src);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Placeholder detection ────────────────────────────────────────────────────
function isAdPlaceholder(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (w < 80 || h < 20) return false;
  const text = (el.innerText || el.textContent || "").trim();
  if (AD_TEXT_RE.test(text)) return true;
  const children = [...el.children].filter(c => c.offsetWidth > 0 || c.offsetHeight > 0);
  if (children.length <= 2) {
    const childText = children.map(c => (c.innerText || c.textContent || "").trim()).join(" ");
    if (AD_TEXT_RE.test(childText)) return true;
  }
  return false;
}

// ── Score ─────────────────────────────────────────────────────────────────────
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
  for (const kw of ATTR_KEYWORDS) { if (combined.includes(kw)) { score += 4; break; } }
  if (/div[-_]?gpt[-_]?ad/i.test(id))  score += 10;
  if (/google[_-]?ads/i.test(id))       score += 10;
  try {
    const bg = getComputedStyle(el).backgroundImage.toLowerCase();
    if (bg && bg !== "none" && hasDomain(bg)) score += 8;
  } catch (_) {}
  const w = el.offsetWidth, h = el.offsetHeight;
  if (isIabSize(w, h)) score += 6;
  if (w >= 80 && h >= 30) score += 1;
  if (isAdPlaceholder(el)) score += 15;
  return score;
}

const SCORE_THRESHOLD = 5;

function isLayoutElement(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  return w > window.innerWidth * 0.9 && h > window.innerHeight * 0.55;
}

// ── Build replacement (contain + blurred bg) ──────────────────────────────────
function createReplacement(width, height, imageUrl) {
  const box = document.createElement("div");
  box.className = "william-replacement";
  box.style.cssText = `width:${width}px;height:${height}px;display:block;overflow:hidden;position:relative;box-sizing:border-box;`;

  const bg = document.createElement("div");
  bg.className = "william-bg";
  bg.style.cssText = `position:absolute;inset:0;background-image:url('${imageUrl}');background-size:cover;background-position:center;filter:blur(18px);opacity:0.35;transform:scale(1.08);pointer-events:none;z-index:0;`;

  const a = document.createElement("a");
  a.href   = "https://www.linkedin.com/in/william-rouviere";
  a.target = "_blank";
  a.rel    = "noopener noreferrer";
  a.style.cssText = "display:block;width:100%;height:100%;position:relative;z-index:1;line-height:0;";

  const img = document.createElement("img");
  img.src  = imageUrl;
  img.alt  = "";
  img.style.cssText = "display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;";

  a.appendChild(img);
  box.appendChild(bg);
  box.appendChild(a);
  return box;
}

// ── Replace with deferred sizing ──────────────────────────────────────────────
function attemptReplace(el, images, weights, attempt) {
  if (!el.isConnected) return;
  const w = el.offsetWidth  || el.getBoundingClientRect().width;
  const h = el.offsetHeight || el.getBoundingClientRect().height;
  if ((w < 10 || h < 10) && attempt < 10) {
    setTimeout(() => attemptReplace(el, images, weights, attempt + 1), 200 * Math.pow(1.5, attempt));
    return;
  }
  const width  = Math.max(Math.round(w), 300);
  const height = Math.max(Math.round(h), 100);
  const src    = pickImage(images, weights);
  if (!src) return;
  el.replaceWith(createReplacement(width, height, toURL(src)));
}

function replaceAd(el, images, weights) {
  if (processedAds.has(el)) return;
  processedAds.add(el);
  attemptReplace(el, images, weights, 0);
}

// ── Scans ─────────────────────────────────────────────────────────────────────
function runScan(images, weights) {
  document.querySelectorAll(AD_SELECTOR).forEach(el => {
    if (processedAds.has(el) || !el.isConnected) return;
    if (isLayoutElement(el)) return;
    if (scoreElement(el) >= SCORE_THRESHOLD) replaceAd(el, images, weights);
  });
  document.querySelectorAll("div,section,aside,article,figure").forEach(el => {
    if (processedAds.has(el) || !el.isConnected) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 80 || h < 20 || isLayoutElement(el)) return;
    if (isAdPlaceholder(el)) replaceAd(el, images, weights);
  });
}

let scanScheduled = false;
let cachedImages  = null;
let cachedWeights = null;
let cacheExpiry   = 0;

function scan() {
  if (scanScheduled) return;
  scanScheduled = true;
  const now = Date.now();
  if (cachedImages && now < cacheExpiry) {
    if (cachedImages.length > 0) runScan(cachedImages, cachedWeights);
    scanScheduled = false;
    return;
  }
  chrome.storage.local.get(["activeImages", "imageWeights"], data => {
    cachedImages  = data.activeImages  || [];
    cachedWeights = data.imageWeights  || {};
    cacheExpiry   = Date.now() + 5000;
    scanScheduled = false;
    if (cachedImages.length > 0) runScan(cachedImages, cachedWeights);
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
else scan();
window.addEventListener("load", () => { scan(); setTimeout(scan,800); setTimeout(scan,2500); setTimeout(scan,5000); });

let mutationTimer = null;
const observer = new MutationObserver(() => { clearTimeout(mutationTimer); mutationTimer = setTimeout(scan, 500); });
function startObserver() { observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
if (document.body) startObserver(); else document.addEventListener("DOMContentLoaded", startObserver);

chrome.storage.onChanged.addListener(changes => {
  if (changes.activeImages || changes.imageWeights) {
    cachedImages  = (changes.activeImages  || {}).newValue || cachedImages  || [];
    cachedWeights = (changes.imageWeights  || {}).newValue || cachedWeights || {};
    cacheExpiry   = Date.now() + 5000;
  }
});
