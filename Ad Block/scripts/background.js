/* William Ad Blocker — background.js */

const DEFAULT_IMAGES = [
  "images/default1.jpg",
  "images/default2.jpg",
  "images/default3.jpg",
  "images/default4.jpg",
  "images/default5.jpg",
  "images/default6.jpg",
  "images/default7.jpg",
  "images/default8.jpg"
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["allImages", "activeImages"], data => {

    // First install: seed both lists
    if (!data.allImages || data.allImages.length === 0) {
      chrome.storage.local.set({
        allImages:    DEFAULT_IMAGES,
        activeImages: DEFAULT_IMAGES
      });
    }
    // Migration from older version (activeImages only)
    else if (!data.allImages) {
      chrome.storage.local.set({
        allImages: data.activeImages || DEFAULT_IMAGES
      });
    }
  });
});
