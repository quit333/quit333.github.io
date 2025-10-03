(() => {
  // <stdin>
  window.addEventListener("load", async () => {
    const article = document.querySelector("article");
    const gallery = document.getElementsByClassName("gallery")[0];
    const button = document.getElementById("top-button");
    const loadedSet = /* @__PURE__ */ new Set();
    const batchSize = 5;
    let page = 0;
    let galleryName = "";
    let mediaList = [];
    let msnry;
    const counter = document.createElement("div");
    const pendingLoads = /* @__PURE__ */ new Set();
    let itemCount = 0;
    let appendCount = 0;
    let lastItem = "";
    button.appendChild(counter);
    function updateCounter() {
      const pendingList = Array.from(pendingLoads).slice(0, 5);
      const more = pendingLoads.size > 5 ? ` (+${pendingLoads.size - 5} more)` : "";
      counter.innerHTML = `
		Items Loaded: ${itemCount}<br>
		Items Appended: ${appendCount}<br>
		Last Item: ${lastItem}<br>
		Scroll: ${article.scrollTop}/${article.scrollHeight - article.clientHeight - 500}<br>
		Pending (${pendingLoads.size}): ${pendingList.join("<br>")}${more} `;
    }
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    function getRandomDarkColor() {
      const r = Math.floor(Math.random() * 100);
      const g = Math.floor(Math.random() * 100);
      const b = Math.floor(Math.random() * 100);
      return `rgb(${r}, ${g}, ${b})`;
    }
    try {
      const res = await fetch("media.json");
      const data = await res.json();
      galleryName = data.gallery_name;
      mediaList = data.items;
      initMasonry();
      await fillGalleryIfNeeded();
    } catch (err) {
      console.error("Failed to load media.json:", err);
    }
    function initMasonry() {
      const gridSizer = document.createElement("div");
      const gutterSizer = document.createElement("div");
      gridSizer.className = "grid-sizer";
      gutterSizer.className = "gutter-sizer";
      gallery.appendChild(gridSizer);
      gallery.appendChild(gutterSizer);
      msnry = new Masonry(gallery, {
        itemSelector: ".gallery-item",
        columnWidth: ".grid-sizer",
        gutter: ".gutter-sizer",
        percentPosition: true
      });
    }
    async function fillGalleryIfNeeded() {
      while (article.scrollHeight <= article.clientHeight + 200) {
        await addMoreMedia();
      }
    }
    async function addMoreMedia() {
      const batch = mediaList.slice(page * batchSize, (page + 1) * batchSize);
      let appendedSomething = false;
      for (const item of batch) {
        if (!item || !item.media || loadedSet.has(item.media)) continue;
        loadedSet.add(item.media);
        await loadMedia(item);
        appendedSomething = true;
      }
      if (appendedSomething) page++;
    }
    async function loadMedia(item) {
      const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
      const src = item.source.startsWith("http") ? item.source : `${base}/${item.source}`;
      const media = item.media.startsWith("http") ? item.media : `${base}/${item.media}`;
      itemCount++;
      lastItem = media;
      updateCounter();
      if (item.type === "image") return await createImageCard(src, media);
      if (item.type === "video") return await createVideoCard(src, media);
      if (item.type === "url") return createLinkCard(src);
      console.warn("Unknown type:", item.type);
    }
    function wrapGalleryItem(el) {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.appendChild(el);
      return item;
    }
    function createLinkCard(href) {
      const link = document.createElement("a");
      link.id = "link-card";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.backgroundColor = getRandomDarkColor();
      const p = document.createElement("p");
      p.textContent = href;
      link.appendChild(p);
      const item = wrapGalleryItem(link);
      gallery.appendChild(item);
      appendCount++;
      updateCounter();
      msnry.appended(item);
      msnry.layout();
    }
    async function createImageCard(linkURL, imageURL) {
      pendingLoads.add(imageURL);
      return new Promise((resolve) => {
        const img = document.createElement("img");
        img.src = imageURL;
        const link = document.createElement("a");
        link.href = linkURL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.appendChild(img);
        imagesLoaded(img, () => {
          pendingLoads.delete(imageURL);
          updateCounter();
          const item = wrapGalleryItem(link);
          gallery.appendChild(item);
          appendCount++;
          updateCounter();
          msnry.appended(item);
          msnry.layout();
          resolve(item);
        });
        img.addEventListener("error", () => {
          pendingLoads.delete(imageURL);
          updateCounter();
          console.warn("Image failed to load:", imageURL);
          resolve(null);
        }, { once: true });
      });
    }
    async function createVideoCard(linkURL, videoURL) {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        const source = document.createElement("source");
        source.src = videoURL;
        video.appendChild(source);
        const link = document.createElement("a");
        link.href = linkURL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.appendChild(video);
        const cleanup = () => {
          pendingLoads.delete(videoURL);
          updateCounter();
        };
        const onSuccess = () => {
          appendCount++;
          updateCounter();
          cleanup();
          const item = wrapGalleryItem(link);
          gallery.appendChild(item);
          resolve(item);
        };
        const onError = () => {
          console.warn("Video failed to load:", videoURL);
          cleanup();
          resolve(null);
        };
        video.addEventListener("loadeddata", onSuccess, { once: true });
        video.addEventListener("error", onError, { once: true });
        source.addEventListener("error", onError, { once: true });
      });
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (video.tagName !== "VIDEO") return;
        if (entry.isIntersecting) {
          video.play().catch((err) => console.warn("Video play error:", err));
        } else {
          video.pause();
        }
      });
    }, {
      root: article,
      rootMargin: "250px 0px 250px 0px"
    });
    article.addEventListener("scroll", async () => {
      const nearBottom = article.scrollTop >= article.scrollHeight - article.clientHeight - 500;
      if (nearBottom) await addMoreMedia();
    });
    button.addEventListener("click", async () => {
      shuffle(mediaList);
      gallery.innerHTML = "";
      loadedSet.clear();
      initMasonry();
      page = 0;
      await fillGalleryIfNeeded();
    });
  });
  console.log("Mureinoki \xB7 2025");
})();
