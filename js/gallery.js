(() => {
  // <stdin>
  window.addEventListener("load", () => {
    const gaps = 10;
    const batchSize = 5;
    const article = document.querySelector("article");
    const gallery = document.querySelector(".gallery");
    const button = document.getElementById("top-button");
    let galleryName;
    let buffer = article.clientHeight;
    let page = 0;
    let mediaList = [];
    let isLoading = false;
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
    class Scope {
      constructor() {
        this.controller = new AbortController();
        this.signal = this.controller.signal;
        this.cleanups = /* @__PURE__ */ new Set();
      }
      run(fn) {
        if (this.signal.aborted)
          return;
        return fn(this.signal, this.onCleanup.bind(this));
      }
      onCleanup(fn) {
        this.cleanups.add(fn);
      }
      dispose() {
        this.controller.abort();
        for (const fn of this.cleanups) {
          try {
            fn();
          } catch {
          }
        }
        this.cleanups.clear();
      }
    }
    let galleryScope = null;
    async function initGallery(shuffleMedia = false) {
      galleryScope?.dispose();
      galleryScope = new Scope();
      galleryScope.run((signal, onCleanup) => {
        const onScroll = () => {
          let nearBottom = article.scrollTop >= article.scrollHeight - article.clientHeight - buffer;
          let nearTop = lastRowDeleteTop !== 0 && article.scrollTop <= lastRowDeleteTop + buffer;
          if (nearBottom && !isLoading) {
            isLoading = true;
            addItemBatch(galleryScope);
            msnry.virtualize();
            isLoading = false;
          } else if (nearTop) {
            galleryScope.run((signal2, onCleanup2) => restoreItemBatch(msnry, signal2, onCleanup2));
          }
        };
        article.addEventListener("scroll", onScroll);
        onCleanup(() => article.removeEventListener("scroll", onScroll));
      });
      const data = await MediaRepository.load();
      msnry = null;
      gallery.innerHTML = "";
      page = 0;
      isLoading = false;
      lastRowDeleteTop = 0;
      galleryName = data.gallery_name;
      mediaList = shuffleMedia ? shuffle(data.items) : data.items;
      createGallery(galleryScope);
    }
    function createGallery(scope) {
      scope.run((signal, onCleanup) => {
        msnry = new SimpleMasonry(
          article,
          gallery,
          window.innerWidth <= 767 ? 2 : 5,
          gaps
        );
        onCleanup(() => msnry.destroy?.());
        msnry.onRowVirtualized = (top) => lastRowDeleteTop = top;
        fillGallery(signal, onCleanup);
      });
    }
    function fillGallery(signal, onCleanup) {
      let rafId;
      function loop() {
        if (signal.aborted)
          return;
        if (article.scrollHeight <= article.clientHeight + buffer) {
          addItemBatch(galleryScope);
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      onCleanup(() => cancelAnimationFrame(rafId));
    }
    function addItemBatch(scope) {
      if (!scope || scope.signal.aborted)
        return;
      const currentPage = page++;
      const start = currentPage * batchSize;
      const batch = mediaList.slice(start, start + batchSize);
      if (batch.length === 0)
        return;
      batch.forEach((media, i) => {
        if (!media)
          return;
        const jsonIndex = start + i;
        scope.run((signal, onCleanup) => routeItem(media, jsonIndex, null, signal, onCleanup));
      });
    }
    function restoreItemBatch(msnry2, signal, onCleanup) {
      if (signal.aborted)
        return;
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
        onCleanup(() => itemContainer.remove());
        routeItem(media, jsonIndex, itemContainer, signal, onCleanup);
      });
    }
    function routeItem(media, jsonIndex, itemContainer = null, signal, onCleanup) {
      if (signal.aborted)
        return;
      const base = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}`;
      const fullres = media.fullres ? media.fullres.startsWith("http") ? media.fullres : `${base}/${media.fullres}?raw=true` : null;
      const thumbnail = media.thumbnail ? media.thumbnail.startsWith("http") ? media.thumbnail : `${base}/${media.thumbnail}?raw=true` : null;
      const source = media.source || null;
      return createMediaItem(media.type, fullres, thumbnail, source, jsonIndex, itemContainer, signal, onCleanup);
    }
    function createMediaWrapper(url) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    }
    function createMediaItem(type, fullres, thumbnail, source, jsonIndex, itemContainer = null, signal, onCleanup) {
      return new Promise((resolve) => {
        if (signal.aborted)
          return;
        const wrapper = createMediaWrapper(fullres);
        let media;
        let videoSource;
        if (type === "image") {
          media = document.createElement("img");
          media.src = thumbnail || fullres;
        } else if (type === "video") {
          media = document.createElement("video");
          videoSource = document.createElement("source");
          videoSource.src = thumbnail || fullres;
          media.appendChild(videoSource);
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
        } else {
          restore = true;
          gallery.prepend(item);
          msnry.restore(item);
        }
        item.appendChild(wrapper);
        if (source && type !== "url") {
          const sourceWrapper = createMediaWrapper(source);
          const sourceContainer = document.createElement("div");
          sourceContainer.className = "gallery-source";
          sourceContainer.textContent = "\u{1F517}\uFE0F";
          sourceWrapper.appendChild(sourceContainer);
          item.appendChild(sourceWrapper);
        }
        onCleanup(() => item.remove());
        const handlers = resolveHandlers(resolve, item, restore, signal);
        if (type === "image") {
          imagesLoaded(media).on("done", handlers.success).on("fail", handlers.error);
        } else if (type === "video") {
          media.addEventListener("loadeddata", handlers.success, { once: true });
          media.addEventListener("error", handlers.error, { once: true });
          if (videoSource) {
            videoSource.addEventListener("error", () => handlers.error(), { once: true });
          }
        } else {
          handlers.success();
        }
      });
    }
    function resolveHandlers(resolve, item, restore, signal) {
      return {
        success: () => {
          if (signal.aborted)
            return resolve(null);
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
    button.addEventListener("click", () => initGallery(true));
    initGallery();
    console.log("Mureinoki \xB7 2025");
  });
})();
