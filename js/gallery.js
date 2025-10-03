(() => {
  // <stdin>
  window.addEventListener("load", async () => {
    const article = document.querySelector("article");
    const gallery = document.getElementsByClassName("gallery")[0];
    const button = document.getElementById("top-button");
    const loadedSet = /* @__PURE__ */ new Set();
    let page = 0;
    let galleryName = "";
    let mediaList = [];
    let msnry;
    let isLoading = false;
    let endOfList = false;
    const BATCH_SIZE = 5;
    const counter = document.createElement("div");
    button.appendChild(counter);
    let itemCount = 0;
    function updateCounter() {
      counter.textContent = `Items Loaded: ${itemCount}`;
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
      if (isLoading || endOfList) return;
      isLoading = true;
      try {
        const start = page * BATCH_SIZE;
        if (start >= mediaList.length) {
          endOfList = true;
          return;
        }
        const batch = mediaList.slice(start, start + BATCH_SIZE);
        const elementPromises = batch.map(async (item) => {
          if (!item || !item.media || loadedSet.has(item.media)) return null;
          loadedSet.add(item.media);
          itemCount++;
          updateCounter();
          const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
          const src = item.source.startsWith("http") ? item.source : `${base}/${item.source}`;
          const media2 = item.media.startsWith("http") ? item.media : `${base}/${item.media}`;
          if (item.type === "image") return await createImageCard(src, media2);
          if (item.type === "video") return await createVideoCard(src, media2);
          if (item.type === "url") return createLinkCard(src);
          console.warn("Unknown type:", item.type);
          return null;
        });
        const items = (await Promise.all(elementPromises)).filter(Boolean);
        page++;
        if (items.length === 0) {
          if (page * BATCH_SIZE >= media.length) endOfList = true;
          return;
        }
        items.forEach((it) => gallery.appendChild(it));
        if (msnry && typeof msnry.appended === "function") msnry.appended(items);
        if (msnry && typeof msnry.layout === "function") msnry.layout();
        items.forEach((it) => {
          const vid = it.querySelector("video");
          if (vid && observer) observer.observe(vid);
        });
        if (page * BATCH_SIZE >= mediaList.length) endOfList = true;
      } finally {
        isLoading = false;
      }
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
      return wrapGalleryItem(link);
    }
    async function createImageCard(linkURL, imageURL) {
      return new Promise((resolve) => {
        const img = document.createElement("img");
        img.src = imageURL;
        const link = document.createElement("a");
        link.href = linkURL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.appendChild(img);
        imagesLoaded(img, () => {
          const item = wrapGalleryItem(link);
          resolve(item);
        });
        img.addEventListener("error", () => {
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
        video.addEventListener("loadeddata", () => {
          const item = wrapGalleryItem(link);
          resolve(item);
        }, { once: true });
        video.addEventListener("error", () => {
          console.warn("Video failed to load:", videoURL);
          resolve(null);
        }, { once: true });
      });
    }
    let observer = null;
    function createObserver() {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver((entries) => {
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
    }
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
