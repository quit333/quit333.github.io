(() => {
  // <stdin>
  window.addEventListener("load", async () => {
    function getColumnCount() {
      return window.innerWidth <= 767 ? 2 : 5;
    }
    const gaps = 10;
    const article = document.querySelector("article");
    const gallery = document.getElementsByClassName("gallery")[0];
    const button = document.getElementById("top-button");
    const batchSize = 5;
    const buffer = article.clientHeight * 2;
    let gallerySession = 0;
    let page;
    let galleryName;
    let isLoading;
    let mediaList;
    let msnry;
    let lastRowDeleteTop;
    class SimpleMasonry {
      constructor(gallery2, columns = 5, gaps2 = 10, virtRowThreshold = 15) {
        this.RowDeleteTop = 0;
        this.gaps = gaps2;
        this.gallery = gallery2;
        this.gallery.style.position = "relative";
        this.itemCache = [];
        this.columns = columns;
        this.columnIndex = 0;
        this.columnWidth = (this.gallery.clientWidth - this.gaps * (this.columns - 1)) / this.columns;
        this.rowIndex = 0;
        this.rowMax = 0;
        this.rowPositions = new Array(this.columns).fill(0);
        this.virtRowThreshold = virtRowThreshold;
        this.onRowVirtualized = () => {
        };
      }
      append(item) {
        this.columnIndex = this.columnIndex % this.columns;
        item.style.position = "absolute";
        item.style.left = `${this.columnIndex * (this.columnWidth + this.gaps)}px`;
        item.style.top = `${this.rowPositions[this.columnIndex]}px`;
        item.dataset.row = this.rowIndex;
        item.dataset.column = this.columnIndex;
        item.title = `column: ${this.columnIndex} | row: ${this.rowIndex}`;
        this.rowPositions[this.columnIndex] += item.offsetHeight + this.gaps;
        if (this.rowPositions[this.columnIndex] > this.rowMax) {
          this.columnIndex++;
        } else {
          if (this.columnIndex === 0) {
            this.rowIndex++;
          }
        }
        if (this.columnIndex >= this.columns) {
          this.rowMax = Math.max(...this.rowPositions);
          this.rowIndex++;
        }
        requestAnimationFrame(() => {
          item.classList.add("visible");
        });
      }
      restore(item) {
        requestAnimationFrame(() => {
          item.classList.add("visible");
        });
      }
      virtualize(article2) {
        if (this.rowIndex > this.virtRowThreshold) {
          const rowDeleteIndex = this.rowIndex - this.virtRowThreshold;
          const rowDelete = Array.from(this.gallery.children).find((item) => parseInt(item.dataset.row) === rowDeleteIndex && parseInt(item.dataset.column) === 0);
          if (!rowDelete)
            return;
          this.rowDeleteTop = rowDelete.offsetTop;
          const scrollTop = article2.scrollTop;
          const itemsToDelete = Array.from(this.gallery.children).filter((item) => {
            const isLowerRow = parseInt(item.dataset.row) < rowDeleteIndex;
            const isAboveViewport = item.offsetTop + item.offsetHeight < scrollTop;
            return isLowerRow && isAboveViewport;
          });
          this.onRowVirtualized(this.rowDeleteTop);
          itemsToDelete.forEach((item) => {
            const alreadyCached = this.itemCache.some((cached) => cached[0] === item.dataset.jsonIndex);
            if (alreadyCached)
              return;
            this.itemCache.push([item.dataset.jsonIndex, item.dataset.row, item.offsetTop, item.offsetLeft, item.offsetWidth, item.offsetHeight]);
            item.remove();
          });
        }
      }
    }
    async function initGallery(shuffleMedia = false) {
      try {
        const res = await fetch("media.json");
        const data = await res.json();
        mediaList = [];
        isLoading = false;
        page = 0;
        lastRowDeleteTop = 0;
        galleryName = data.gallery_name;
        mediaList = data.items;
        if (shuffleMedia)
          shuffle(mediaList);
        createGallery();
      } catch (err) {
        console.error("Failed to load media.json:", err);
      }
    }
    async function createGallery() {
      initSimpleMasonry();
      await fillGallery();
    }
    function initSimpleMasonry() {
      msnry = new SimpleMasonry(gallery, getColumnCount(), gaps);
      msnry.onRowVirtualized = (top) => {
        lastRowDeleteTop = top;
      };
    }
    article.addEventListener("scroll", async () => {
      let scrollTop = article.scrollTop;
      let nearBottom = scrollTop >= article.scrollHeight - article.clientHeight - buffer;
      let nearTop = lastRowDeleteTop !== 0 && scrollTop <= lastRowDeleteTop + buffer;
      if (nearBottom && !isLoading) {
        isLoading = true;
        addItemBatch().finally(() => {
          isLoading = false;
          msnry.virtualize(article);
        });
      } else if (nearTop) {
        restoreItemBatch(msnry);
      }
    });
    button.addEventListener("click", async () => {
      gallerySession++;
      msnry = null;
      gallery.innerHTML = "";
      await initGallery(true);
    });
    async function fillGallery() {
      while (article.scrollHeight <= article.clientHeight + 500) {
        addItemBatch();
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
    async function addItemBatch() {
      const currentPage = page++;
      const batch = mediaList.slice(currentPage * batchSize, (currentPage + 1) * batchSize);
      if (batch.length === 0)
        return;
      batch.forEach((media) => {
        const jsonIndex = mediaList.indexOf(media);
        if (!media || !media.preview)
          return;
        routeItem(media, jsonIndex).catch((err) => console.warn(err));
      });
    }
    function restoreItemBatch(msnry2) {
      if (msnry2.itemCache.length === 0)
        return;
      const batch = msnry2.itemCache.splice(-batchSize, batchSize);
      batch.forEach(([jsonIndex, row, top, left, width, height]) => {
        const media = mediaList[jsonIndex];
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.style.position = "absolute";
        item.style.width = width + "px";
        item.style.height = height + "px";
        item.style.left = left + "px";
        item.style.top = top + "px";
        item.dataset.jsonIndex = jsonIndex;
        item.dataset.row = row;
        item.dataset.gallerySession = gallerySession;
        routeItem(media, jsonIndex, item);
      });
    }
    async function routeItem(media, jsonIndex, itemContainer = null) {
      const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
      const source = media.source.startsWith("http") ? media.source : `${base}/${media.source}?raw=true`;
      const preview = media.preview.startsWith("http") ? media.preview : `${base}/${media.preview}?raw=true`;
      if (media.type === "image" || media.type === "video" || media.type === "url")
        return await createMediaItem(media.type, source, preview, jsonIndex, itemContainer);
      console.warn("Unknown type:", media.type);
      return null;
    }
    function createMediaWrapper(source) {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    }
    async function createMediaItem(type, source, preview, jsonIndex, itemContainer = null) {
      return new Promise((resolve) => {
        const mediaWrapper = createMediaWrapper(source);
        let media;
        let src = null;
        switch (type) {
          case "image":
            media = document.createElement("img");
            media.src = preview;
            break;
          case "video":
            media = document.createElement("video");
            const s = document.createElement("source");
            s.src = preview;
            media.autoplay = true;
            media.loop = true;
            media.muted = true;
            media.playsInline = true;
            media.appendChild(s);
            src = s;
            break;
          case "url":
            media = document.createElement("p");
            media.textContent = source;
            mediaWrapper.id = "link-card";
            mediaWrapper.style.backgroundColor = getRandomDarkColor();
            break;
        }
        mediaWrapper.appendChild(media);
        let item = itemContainer;
        let restore = false;
        if (!item) {
          item = document.createElement("div");
          item.className = "gallery-item";
          item.dataset.jsonIndex = jsonIndex;
          item.dataset.gallerySession = gallerySession;
        } else {
          restore = true;
        }
        item.appendChild(mediaWrapper);
        const handlers = resolveHandlers(resolve, item, restore);
        if (type === "image") {
          imagesLoaded(media).on("done", handlers.success).on("fail", handlers.error);
        } else if (type === "video") {
          media.addEventListener("loadeddata", handlers.success, { once: true });
          media.addEventListener("error", handlers.error, { once: true });
          if (src !== null) {
            src.addEventListener("error", () => handlers.error(), { once: true });
          }
        } else if (type === "url") {
          handlers.success();
        }
      });
    }
    function resolveHandlers(resolve, item, restore) {
      return {
        success: () => {
          if (parseInt(item.dataset.gallerySession) !== gallerySession) {
            item.remove();
            return resolve(null);
          }
          if (restore === false) {
            gallery.appendChild(item);
            msnry.append(item);
          } else {
            gallery.prepend(item);
            msnry.restore(item);
          }
          resolve(item);
        },
        error: () => {
          console.warn("Media didn't resolve.");
          resolve(null);
        }
      };
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
    initGallery();
    console.log("Mureinoki \xB7 2025");
  });
})();
