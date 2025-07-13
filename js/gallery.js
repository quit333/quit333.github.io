(() => {
  // <stdin>
  window.addEventListener("load", () => {
    const article = document.querySelector("article");
    const button = document.getElementById("top-button");
    const gallery = document.getElementById("gallery");
    let page = 0;
    let mediaList = [];
    let rowGap = 0, columnGap = 0;
    let galleryName = "";
    updateGaps();
    fetch("media.json").then((res) => res.json()).then((data) => {
      galleryName = data.gallery_name;
      mediaList = data.items;
      onStart();
    }).catch((err) => {
      console.error("Failed to load media.json:", err);
    });
    let isAdding = false;
    function onStart() {
      if (isAdding) return;
      if (article.scrollHeight <= article.clientHeight + 200) {
        isAdding = true;
        addMoreMedia();
        setTimeout(() => {
          onStart();
        }, 200);
      }
    }
    function updateGaps() {
      const style = window.getComputedStyle(gallery);
      rowGap = parseInt(style.rowGap);
      columnGap = parseInt(style.columnGap);
    }
    function addMoreMedia() {
      const batch = mediaList.slice(page * 5, (page + 1) * 5);
      batch.forEach((mediaItem) => {
        try {
          loadMedia(mediaItem);
        } catch (e) {
          console.warn("Error loading media item:", mediaItem, e);
        }
      });
      isAdding = false;
      page++;
    }
    const loadedMediaSet = /* @__PURE__ */ new Set();
    function loadMedia(mediaItem) {
      const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
      if (!mediaItem || !mediaItem.source || !mediaItem.type) {
        console.warn("Invalid media item:", mediaItem);
        return;
      }
      const source = mediaItem.source.startsWith("http") ? mediaItem.source : `${base}/${mediaItem.source}`;
      const media = mediaItem.media.startsWith("http") ? mediaItem.media : `${base}/${mediaItem.media}`;
      if (loadedMediaSet.has(media)) return;
      loadedMediaSet.add(media);
      switch (mediaItem.type) {
        case "image":
          createIMG(source, media);
          break;
        case "video":
          createVideo(source, media);
          break;
        case "url":
          createLinkCard(source, media);
          break;
        default:
          console.warn("Unknown media type:", mediaItem.type);
      }
    }
    function createIMG(source, media) {
      const img = document.createElement("img");
      img.src = media;
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.appendChild(img);
      img.addEventListener("load", () => {
        createGalleryItem(link);
      });
      img.addEventListener("error", () => {
        console.warn("Image failed to load:", media);
        link.remove();
      });
    }
    function createVideo(source, media) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      const videoSource = document.createElement("source");
      videoSource.src = media;
      video.appendChild(videoSource);
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.appendChild(video);
      video.addEventListener("loadeddata", () => {
        if (!video.closest(".gallery-item")) {
          createGalleryItem(link);
          observer.observe(video);
        }
      });
      video.addEventListener("error", () => {
        console.warn("Video failed to load:", media);
        link.remove();
      });
    }
    function createLinkCard(source, media) {
      const link = document.createElement("a");
      link.id = "link-card";
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.backgroundColor = getRandomDarkColor();
      const text = document.createElement("p");
      text.textContent = source;
      link.appendChild(text);
      createGalleryItem(link);
    }
    function createGalleryItem(media) {
      if (!media) return;
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.appendChild(media);
      gallery.appendChild(item);
      setGalleryItemHeight(item);
    }
    function setGalleryItemHeight(item) {
      const media = item.querySelector("img, video, iframe");
      if (!media) return;
      const height = media.clientHeight;
      const rowSpan = Math.ceil(height / rowGap);
      item.style.gridRowEnd = `span ${rowSpan}`;
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
    button.addEventListener("click", () => {
      shuffle(mediaList);
      gallery.innerHTML = "";
      page = 0;
      loadedMediaSet.clear();
      onStart();
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
    article.addEventListener("scroll", () => {
      if (isAdding) return;
      if (article.scrollTop >= article.scrollHeight - article.clientHeight - 500) {
        isAdding = true;
        addMoreMedia();
      }
    });
    window.addEventListener("resize", () => {
      updateGaps();
      document.querySelectorAll(".gallery-item").forEach(setGalleryItemHeight);
    });
  });
})();
