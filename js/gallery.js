(() => {
  // <stdin>
  window.addEventListener("load", () => {
    const gaps = 10;
    const article = document.querySelector("article");
    const gallery = document.getElementsByClassName("gallery")[0];
    const button = document.getElementById("top-button");
    const batchSize = 5;
    const buffer = article.clientHeight * 1;
    let gallerySession = 0;
    let page = 0;
    let galleryName;
    let isLoading = false;
    let mediaList = [];
    let msnry = null;
    let lastRowDeleteTop = 0;
    class SimpleMasonry {
      constructor(scrollArea, gallery2, columns = 5, gaps2 = 10, virtRowThreshold = 15) {
        this.scrollArea = scrollArea;
        this.gallery = gallery2;
        this.gallery.style.position = "relative";
        this.itemCache = [];
        this.gaps = gaps2;
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
        } else if (this.columnIndex === 0) {
          this.rowIndex++;
        }
        if (this.columnIndex >= this.columns) {
          this.rowMax = Math.max(...this.rowPositions);
          this.rowIndex++;
        }
        requestAnimationFrame(() => item.classList.add("visible"));
      }
      restore(item) {
        requestAnimationFrame(() => item.classList.add("visible"));
      }
      virtualize() {
        if (this.rowIndex <= this.virtRowThreshold)
          return;
        const rowDeleteIndex = this.rowIndex - this.virtRowThreshold;
        const rowDelete = Array.from(this.gallery.children).find((item) => parseInt(item.dataset.row) === rowDeleteIndex && parseInt(item.dataset.column) === 0);
        if (!rowDelete)
          return;
        this.rowDeleteTop = rowDelete.offsetTop;
        this.onRowVirtualized(this.rowDeleteTop);
        const scrollTop = this.scrollArea.scrollTop;
        Array.from(this.gallery.children).forEach((item) => {
          if (parseInt(item.dataset.row) < rowDeleteIndex && item.offsetTop + item.offsetHeight < this.scrollArea.scrollTop) {
            if (!this.itemCache.some((cached) => cached[0] === item.dataset.jsonIndex)) {
              this.itemCache.push([
                item.dataset.jsonIndex,
                item.dataset.row,
                item.offsetTop,
                item.offsetLeft,
                item.offsetWidth,
                item.offsetHeight
              ]);
            }
            item.remove();
          }
        });
      }
    }
    const MediaRepository = /* @__PURE__ */ (() => {
      let mediaResponse = null;
      function load() {
        if (!mediaResponse) {
          mediaResponse = fetch("media.json").then((response) => {
            if (!response.ok)
              throw new Error("Failed to load media.json");
            return response.json();
          });
        }
        return mediaResponse;
      }
      return { load };
    })();
    let mutex = Promise.resolve();
    function initGallery(shuffleMedia = false) {
      mutex = mutex.then(() => runInitGallery(shuffleMedia));
      return mutex;
    }
    async function runInitGallery(shuffleMedia = false) {
      const data = await MediaRepository.load();
      gallerySession++;
      msnry = null;
      gallery.innerHTML = "";
      page = 0;
      isLoading = false;
      lastRowDeleteTop = 0;
      galleryName = data.gallery_name;
      mediaList = shuffleMedia ? shuffle(data.items) : data.items;
      createGallery();
    }
    function createGallery() {
      msnry = new SimpleMasonry(article, gallery, calculateColumnCount(), gaps);
      msnry.onRowVirtualized = (top) => lastRowDeleteTop = top;
      fillGallery();
    }
    function fillGallery() {
      function loop() {
        if (article.scrollHeight <= article.clientHeight + buffer) {
          addItemBatch();
          requestAnimationFrame(loop);
        }
      }
      loop();
    }
    function addItemBatch() {
      const currentPage = page++;
      const batch = mediaList.slice(currentPage * batchSize, (currentPage + 1) * batchSize);
      if (batch.length === 0)
        return;
      batch.forEach((media) => {
        if (!media?.preview)
          return;
        const jsonIndex = mediaList.indexOf(media);
        routeItem(media, jsonIndex);
      });
    }
    function restoreItemBatch(msnry2) {
      const batch = msnry2.itemCache.splice(-batchSize, batchSize);
      batch.forEach(([jsonIndex, row, top, left, width, height]) => {
        const media = mediaList[jsonIndex];
        const itemContainer = document.createElement("div");
        itemContainer.className = "gallery-item loading";
        itemContainer.style.position = "absolute";
        itemContainer.style.width = width + "px";
        itemContainer.style.height = height + "px";
        itemContainer.style.left = left + "px";
        itemContainer.style.top = top + "px";
        itemContainer.dataset.jsonIndex = jsonIndex;
        itemContainer.dataset.row = row;
        itemContainer.dataset.gallerySession = gallerySession;
        routeItem(media, jsonIndex, itemContainer);
      });
    }
    function routeItem(media, jsonIndex, itemContainer = null) {
      const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
      const source = media.source.startsWith("http") ? media.source : `${base}/${media.source}?raw=true`;
      const preview = media.preview.startsWith("http") ? media.preview : `${base}/${media.preview}?raw=true`;
      return createMediaItem(media.type, source, preview, jsonIndex, itemContainer);
    }
    function createMediaWrapper(source) {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    }
    function createMediaItem(type, source, preview, jsonIndex, itemContainer = null) {
      return new Promise((resolve) => {
        const wrapper = createMediaWrapper(source);
        let media;
        let videoSource;
        if (type === "image") {
          media = document.createElement("img");
          media.src = preview;
        } else if (type === "video") {
          media = document.createElement("video");
          const videoSource2 = document.createElement("source");
          videoSource2.src = preview;
          media.appendChild(videoSource2);
          media.autoplay = media.loop = media.muted = media.playsInline = true;
        } else {
          media = document.createElement("p");
          media.textContent = source;
          wrapper.id = "link-card";
          wrapper.style.backgroundColor = getRandomDarkColor();
        }
        wrapper.appendChild(media);
        let item = itemContainer;
        let restore = false;
        if (!item) {
          item = document.createElement("div");
          item.className = "gallery-item";
          item.dataset.jsonIndex = jsonIndex;
          item.dataset.gallerySession = gallerySession;
        } else {
          restore = true;
          gallery.prepend(item);
          msnry.restore(item);
        }
        item.appendChild(wrapper);
        const handlers = resolveHandlers(resolve, item, restore);
        if (type === "image") {
          imagesLoaded(media).on("done", handlers.success).on("fail", handlers.error);
        } else if (type === "video") {
          media.addEventListener("loadeddata", handlers.success, { once: true });
          media.addEventListener("error", handlers.error, { once: true });
          if (videoSource) {
            videoSource.src.addEventListener("error", () => handlers.error(), { once: true });
          }
        } else {
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
          if (!restore) {
            gallery.appendChild(item);
            msnry.append(item);
          } else {
            item.classList.remove("loading");
          }
          resolve(item);
        },
        error: () => {
          console.error("Media didn't resolve.");
          resolve(null);
        }
      };
    }
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    function getRandomDarkColor() {
      const r = Math.floor(Math.random() * 100);
      const g = Math.floor(Math.random() * 100);
      const b = Math.floor(Math.random() * 100);
      return `rgb(${r}, ${g}, ${b})`;
    }
    function calculateColumnCount() {
      return window.innerWidth <= 767 ? 2 : 5;
    }
    article.addEventListener("scroll", () => {
      let nearBottom = article.scrollTop >= article.scrollHeight - article.clientHeight - buffer;
      let nearTop = lastRowDeleteTop !== 0 && article.scrollTop <= lastRowDeleteTop + buffer;
      if (nearBottom && !isLoading) {
        isLoading = true;
        addItemBatch();
        msnry.virtualize();
        isLoading = false;
      } else if (nearTop) {
        restoreItemBatch(msnry);
      }
    });
    button.addEventListener("click", () => initGallery(true));
    initGallery();
    console.log("Mureinoki \xB7 2025");
  });
})();
