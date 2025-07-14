(() => {
  // <stdin>
  window.addEventListener("load", async () => {
    const article = document.querySelector("article");
    const gallery = document.getElementById("gallery");
    const button = document.getElementById("top-button");
    let page = 0;
    let galleryName = "";
    let mediaList = [];
    const loadedSet = /* @__PURE__ */ new Set();
    let msnry;
    try {
      const res = await fetch("media.json");
      const data = await res.json();
      galleryName = data.gallery_name;
      mediaList = data.items;
      const sizer = document.createElement("div");
      sizer.className = "grid-sizer";
      const gutterSizer = document.createElement("div");
      gutterSizer.className = "gutter-sizer";
      gallery.appendChild(sizer);
      gallery.appendChild(gutterSizer);
      initMasonry();
      await fillGalleryIfNeeded();
    } catch (err) {
      console.error("Failed to load media.json:", err);
    }
    function initMasonry() {
      msnry = new Masonry(gallery, {
        itemSelector: ".gallery-item",
        columnWidth: ".grid-sizer",
        percentPosition: true,
        gutter: ".gutter-sizer"
      });
    }
    async function fillGalleryIfNeeded() {
      while (article.scrollHeight <= article.clientHeight + 200) {
        await addMoreMedia();
      }
    }
    async function addMoreMedia() {
      const batch = mediaList.slice(page * 5, (page + 1) * 5);
      for (const item of batch) {
        if (!item || !item.media || loadedSet.has(item.media)) continue;
        loadedSet.add(item.media);
        await loadMedia(item);
      }
      page++;
    }
    async function loadMedia(item) {
      const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
      const src = item.source.startsWith("http") ? item.source : `${base}/${item.source}`;
      const media = item.media.startsWith("http") ? item.media : `${base}/${item.media}`;
      if (item.type === "image") return await createImageCard(src, media);
      if (item.type === "video") return await createVideoCard(src, media);
      if (item.type === "url") return createLinkCard(src);
      console.warn("Unknown type:", item.type);
    }
    async function createImageCard(linkURL, imageURL) {
      const img = document.createElement("img");
      img.src = imageURL;
      const link = document.createElement("a");
      link.href = linkURL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.appendChild(img);
      return new Promise((resolve) => {
        imagesLoaded(img, () => {
          const item = wrapGalleryItem(link);
          gallery.appendChild(item);
          msnry.appended(item);
          msnry.layout();
          resolve();
        });
      });
    }
    async function createVideoCard(linkURL, videoURL) {
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
      return new Promise((resolve) => {
        video.addEventListener("loadeddata", () => {
          const item = wrapGalleryItem(link);
          gallery.appendChild(item);
          msnry.appended(item);
          msnry.layout();
          observer.observe(video);
          resolve();
        });
        video.addEventListener("error", () => {
          console.warn("Video failed to load:", videoURL);
          resolve();
        });
      });
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
      msnry.appended(item);
      msnry.layout();
    }
    function wrapGalleryItem(el) {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.appendChild(el);
      return item;
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
    button.addEventListener("click", async () => {
      shuffle(mediaList);
      gallery.innerHTML = "";
      const sizer = document.createElement("div");
      sizer.className = "grid-sizer";
      gallery.appendChild(sizer);
      loadedSet.clear();
      initMasonry();
      page = 0;
      await fillGalleryIfNeeded();
    });
    article.addEventListener("scroll", async () => {
      const nearBottom = article.scrollTop >= article.scrollHeight - article.clientHeight - 500;
      if (nearBottom) await addMoreMedia();
    });
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
  });
})();
