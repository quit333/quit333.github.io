(() => {
  // <stdin>
  window.addEventListener("load", () => {
    const article = document.querySelector("article");
    const button = document.getElementById("top-button");
    const gallery = document.getElementById("gallery");
    let page = 0;
    let mediaList = [];
    let gridComputedStyle = window.getComputedStyle(gallery);
    let rowGap = parseInt(gridComputedStyle.rowGap);
    let columnGap = parseInt(gridComputedStyle.columnGap);
    let galleryName = "";
    fetch("media.json").then((res) => res.json()).then((data) => {
      galleryName = data.gallery_name;
      mediaList = data.media;
      onStart();
    });
    function onStart() {
      if (article.scrollHeight <= article.clientHeight + 200) {
        addMoreMedia();
        setTimeout(onStart, 100);
      }
    }
    function addMoreMedia() {
      const start = page * 5;
      const end = start + 5;
      const currentMedia = mediaList.slice(start, end);
      currentMedia.forEach((mediaItem) => {
        const mediaItemLCase = mediaItem.toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp"].some((ext) => mediaItemLCase.endsWith(ext))) {
          const img = document.createElement("img");
          const imgName = mediaItem;
          const imgBaseName = `${imgName.split(".").slice(0, -1)}`;
          img.src = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/thumbnails/${imgBaseName}.webp`;
          const link = document.createElement("a");
          link.href = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/images/${imgName}`;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.appendChild(img);
          img.addEventListener("load", () => createGalleryItem(link));
        } else if (mediaItemLCase.endsWith(".gif")) {
          const img = document.createElement("img");
          img.src = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/videos/${mediaItem}`;
          const link = document.createElement("a");
          link.href = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/videos/${mediaItem}`;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.appendChild(img);
          img.addEventListener("load", () => createGalleryItem(link));
        } else if (mediaItemLCase.startsWith("http")) {
          if (mediaItemLCase.includes("youtube.com")) {
            const iframe = document.createElement("iframe");
            iframe.id = "player";
            iframe.type = "text/html";
            iframe.src = mediaItem;
            iframe.allowFullscreen = true;
            createGalleryItem(iframe);
          } else {
            const video = document.createElement("video");
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.dataset.src = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/videos/${mediaItem}`;
            const source = document.createElement("source");
            source.src = mediaItem;
            video.appendChild(source);
            const link = document.createElement("a");
            link.href = mediaItemLCase;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.appendChild(video);
            video.addEventListener("loadeddata", () => {
              createGalleryItem(link);
              observer.observe(link);
            });
          }
        } else if ([".mp4", ".webm"].some((ext) => mediaItemLCase.endsWith(ext))) {
          const video = document.createElement("video");
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.dataset.src = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/videos/${mediaItem}`;
          const source = document.createElement("source");
          source.src = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/videos/${mediaItem}`;
          video.appendChild(source);
          const link = document.createElement("a");
          link.href = `https://raw.githubusercontent.com/quit333/quit3-backup/refs/heads/master/${galleryName}/videos/${mediaItem}`;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.appendChild(video);
          video.addEventListener("loadeddata", () => {
            createGalleryItem(link);
            observer.observe(link);
          });
        } else {
        }
      });
      page++;
    }
    function createGalleryItem(media) {
      const item = document.createElement("div");
      item.className = "gallery-item";
      item.appendChild(media);
      gallery.appendChild(item);
      setItemHeight(item);
    }
    function setItemHeight(item) {
      const media = item.querySelector("img, video, iframe");
      if (!media) return;
      if (media.tagName === "IMG" && !media.complete) return;
      if (media.tagName === "VIDEO" && media.readyState < 2) return;
      const itemHeight = media.clientHeight;
      const gridRowHeight = rowGap;
      const rowSpan = Math.ceil(itemHeight / gridRowHeight);
      item.style.gridRowEnd = `span ${rowSpan}`;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playVideo(entry.target);
        } else {
          stopVideo(entry.target);
        }
      });
    }, {
      root: article,
      threshold: 0.5
    });
    function stopVideo(item) {
      const video = item.querySelector("video");
      if (video) video.pause();
    }
    function playVideo(item) {
      const video = item.querySelector("video");
      if (video) video.play().catch(() => {
      });
    }
    button.addEventListener("click", () => {
      onShuffle();
    });
    function onShuffle() {
      shuffle(mediaList);
      const items = gallery.querySelectorAll(".gallery-item");
      items.forEach((item) => {
        item.remove();
      });
      onStart();
    }
    function shuffle(array) {
      let currentIndex = array.length;
      while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex],
          array[currentIndex]
        ];
      }
    }
    article.addEventListener("scroll", () => {
      if (article.scrollTop >= article.scrollHeight - article.clientHeight - 500) {
        addMoreMedia();
      }
    });
    window.addEventListener("resize", () => {
      const items = gallery.querySelectorAll(".gallery-item");
      gridComputedStyle = window.getComputedStyle(gallery);
      rowGap = parseInt(gridComputedStyle.rowGap);
      columnGap = parseInt(gridComputedStyle.columnGap);
      items.forEach((item) => {
        setItemHeight(item);
      });
    });
  });
  console.log("Mureinoki \xB7 2025");
})();
