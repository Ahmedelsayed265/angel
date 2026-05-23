(function () {
  var mainSwiper = null;
  var thumbsSwiper = null;
  var relatedSwiper = null;
  var lightboxSwiper = null;
  var lightboxRoot = null;
  var lightboxWrapper = null;
  var lightboxInitialized = false;
  var galleryClicksBound = false;
  var galleryLensBound = false;
  var LENS_SIZE = 200;
  var LENS_ZOOM = 2.5;

  function isRtl() {
    return window.appDirection !== "ltr";
  }

  function destroySwiper(instance) {
    if (instance && !instance.destroyed) {
      instance.destroy(true, true);
    }
    return null;
  }

  function getProductGalleryImageUrls() {
    if (!window.productImages || !Array.isArray(window.productImages)) {
      return [];
    }
    return window.productImages
      .map(function (item) {
        if (!item || !item.image) {
          return "";
        }
        return item.image.full_size || item.image.medium || "";
      })
      .filter(Boolean);
  }

  function normalizeLightboxImages(images) {
    if (!images) {
      return [];
    }
    if (Array.isArray(images)) {
      return images
        .map(function (item) {
          if (typeof item === "string") {
            return item;
          }
          if (item && item.image) {
            return item.image.full_size || item.image.medium || "";
          }
          return "";
        })
        .filter(Boolean);
    }
    return [];
  }

  function updateLightboxNavState() {
    if (!lightboxRoot) {
      return;
    }
    var hasMultiple =
      lightboxWrapper && lightboxWrapper.querySelectorAll(".swiper-slide").length > 1;
    lightboxRoot.classList.toggle("is-single-slide", !hasMultiple);
  }

  function updateFullscreenIcon() {
    if (!lightboxRoot) {
      return;
    }
    var isFs = !!document.fullscreenElement;
    lightboxRoot.classList.toggle("is-fullscreen", isFs);
  }

  function exitFullscreenIfNeeded() {
    if (!document.fullscreenElement) {
      return;
    }
    var exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen;
    if (exit) {
      exit.call(document);
    }
  }

  function closeProductLightbox() {
    if (!lightboxRoot) {
      return;
    }
    exitFullscreenIfNeeded();
    lightboxRoot.classList.remove("is-open", "is-fullscreen");
    lightboxRoot.hidden = true;
    lightboxRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("angel-product-lightbox-open");
  }

  function buildLightboxSlides(images) {
    if (!lightboxWrapper) {
      return;
    }
    lightboxWrapper.innerHTML = images
      .map(function (src) {
        return (
          '<div class="swiper-slide">' +
          '<img class="angel-product-lightbox__slide-img" src="' +
          src +
          '" alt="" />' +
          "</div>"
        );
      })
      .join("");
  }

  function initLightboxSwiper() {
    var swiperEl = document.getElementById("angel-product-lightbox-swiper");
    if (!swiperEl || typeof Swiper === "undefined") {
      return;
    }

    lightboxSwiper = destroySwiper(lightboxSwiper);

    var slideCount = lightboxWrapper
      ? lightboxWrapper.querySelectorAll(".swiper-slide").length
      : 0;
    var hasMultiple = slideCount > 1;

    lightboxSwiper = new Swiper(swiperEl, {
      slidesPerView: 1,
      spaceBetween: 0,
      rtl: isRtl(),
      loop: hasMultiple,
      navigation: hasMultiple
        ? {
            nextEl: "#angel-product-lightbox-next",
            prevEl: "#angel-product-lightbox-prev",
          }
        : false,
      keyboard: {
        enabled: true,
        onlyInViewport: false,
      },
    });
  }

  function openProductLightbox(images, index) {
    var urls = normalizeLightboxImages(images);
    if (!urls.length || !lightboxRoot || !lightboxWrapper) {
      return;
    }

    var startIndex = parseInt(index, 10) || 0;
    if (startIndex < 0 || startIndex >= urls.length) {
      startIndex = 0;
    }

    buildLightboxSlides(urls);
    initLightboxSwiper();
    updateLightboxNavState();

    lightboxRoot.hidden = false;
    lightboxRoot.classList.add("is-open");
    lightboxRoot.setAttribute("aria-hidden", "false");
    document.body.classList.add("angel-product-lightbox-open");

    if (lightboxSwiper) {
      if (lightboxSwiper.params.loop && lightboxSwiper.slideToLoop) {
        lightboxSwiper.slideToLoop(startIndex, 0);
      } else {
        lightboxSwiper.slideTo(startIndex, 0);
      }
      lightboxSwiper.update();
    }
  }

  function toggleProductLightboxFullscreen() {
    if (!lightboxRoot) {
      return;
    }
    var target = lightboxRoot;
    if (!document.fullscreenElement) {
      var request =
        target.requestFullscreen ||
        target.webkitRequestFullscreen ||
        target.msRequestFullscreen;
      if (request) {
        request.call(target).catch(function () {});
      }
    } else {
      exitFullscreenIfNeeded();
    }
  }

  function initProductLightbox() {
    lightboxRoot = document.getElementById("angel-product-lightbox");
    lightboxWrapper = document.getElementById("angel-product-lightbox-wrapper");
    if (!lightboxRoot || !lightboxWrapper || lightboxInitialized) {
      return;
    }
    lightboxInitialized = true;

    lightboxRoot.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        closeProductLightbox();
      });
    });

    lightboxRoot.addEventListener("click", function (event) {
      if (
        event.target.closest(".angel-product-lightbox__stage") ||
        event.target.closest(".angel-product-lightbox__toolbar") ||
        event.target.closest(".angel-product-lightbox__nav")
      ) {
        return;
      }
      closeProductLightbox();
    });

    var fsBtn = lightboxRoot.querySelector("[data-lightbox-fullscreen]");
    if (fsBtn) {
      fsBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleProductLightboxFullscreen();
      });
    }

    document.addEventListener("fullscreenchange", updateFullscreenIcon);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && lightboxRoot.classList.contains("is-open")) {
        closeProductLightbox();
      }
    });

    window.openPhotoSwiper = openProductLightbox;
  }

  function bindGalleryLightboxClicks() {
    if (galleryClicksBound) {
      return;
    }
    galleryClicksBound = true;

    var galleryRoot = document.getElementById("angel-product-gallery");
    if (galleryRoot) {
      galleryRoot.addEventListener("click", function (event) {
      if (event.target.closest(".angel-product-gallery__play")) {
        return;
      }
      if (
        event.target.closest("[data-share-open]") ||
        event.target.closest("[data-share-close]") ||
        event.target.closest(".angel-product-gallery__share-link") ||
        event.target.closest(".add-to-wishlist")
      ) {
        return;
      }

      var zoomBtn = event.target.closest(".angel-product-gallery__zoom");
      var thumbBtn = event.target.closest(".angel-product-gallery__thumb");
      var mainImg = event.target.closest(".angel-product-gallery__img");
      var thumbImg =
        event.target.closest(".angel-product-gallery__thumb img") ||
        (thumbBtn && thumbBtn.querySelector("img"));

      if (!zoomBtn && !mainImg && !thumbImg && !thumbBtn) {
        return;
      }

      var images = getProductGalleryImageUrls();
      if (!images.length) {
        return;
      }

      var index = 0;
      if (zoomBtn) {
        index = parseInt(zoomBtn.getAttribute("data-gallery-index"), 10) || 0;
      } else if (thumbBtn) {
        index = parseInt(thumbBtn.getAttribute("data-index"), 10) || 0;
      } else if (mainSwiper && !mainSwiper.destroyed) {
        index = mainSwiper.realIndex;
      }

      event.preventDefault();
      openProductLightbox(images, index);
      });
    }

    var descriptionRoot = document.getElementById("product-description");
    if (descriptionRoot) {
      descriptionRoot.addEventListener("click", function (event) {
        var img = event.target.closest("img");
        if (!img || !img.src) {
          return;
        }
        var galleryImages = getProductGalleryImageUrls();
        var index = galleryImages.indexOf(img.src);
        if (index === -1) {
          var normalizedSrc = img.src.split("?")[0];
          index = galleryImages.findIndex(function (url) {
            return url.split("?")[0] === normalizedSrc;
          });
        }
        if (index >= 0 && galleryImages.length) {
          event.preventDefault();
          openProductLightbox(galleryImages, index);
        } else {
          event.preventDefault();
          openProductLightbox([img.src], 0);
        }
      });
    }
  }

  function bindGalleryZoom() {
    bindGalleryLightboxClicks();
  }

  function isGalleryLensEnabled() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function getDisplayedImageBounds(img, container) {
    if (!img || !container) {
      return null;
    }
    var cw = container.clientWidth;
    var ch = container.clientHeight;
    var nw = img.naturalWidth;
    var nh = img.naturalHeight;
    if (!cw || !ch || !nw || !nh) {
      return null;
    }

    var containerRatio = cw / ch;
    var imageRatio = nw / nh;
    var width;
    var height;
    var left;
    var top;

    if (imageRatio > containerRatio) {
      width = cw;
      height = cw / imageRatio;
      left = 0;
      top = (ch - height) / 2;
    } else {
      height = ch;
      width = ch * imageRatio;
      top = 0;
      left = (cw - width) / 2;
    }

    return { left: left, top: top, width: width, height: height };
  }

  function hideGalleryLens() {
    var lens = document.getElementById("angel-product-gallery-lens");
    var mainEl = document.getElementById("angel-product-gallery-main");
    if (lens) {
      lens.classList.remove("is-visible");
      lens.setAttribute("aria-hidden", "true");
    }
    if (mainEl) {
      mainEl
        .querySelectorAll(".angel-product-gallery__zoom.is-lens-active")
        .forEach(function (btn) {
          btn.classList.remove("is-lens-active");
        });
    }
  }

  function updateGalleryLens(event, zoomBtn) {
    var stage = document.querySelector(".angel-product-gallery__stage");
    var lens = document.getElementById("angel-product-gallery-lens");
    var lensImg = lens && lens.querySelector(".angel-product-gallery__lens-img");
    var img = zoomBtn && zoomBtn.querySelector(".angel-product-gallery__img");

    if (!stage || !lens || !lensImg || !img || zoomBtn.querySelector(".angel-product-gallery__play")) {
      hideGalleryLens();
      return;
    }

    if (!img.complete || !img.naturalWidth) {
      img.addEventListener(
        "load",
        function () {
          updateGalleryLens(event, zoomBtn);
        },
        { once: true },
      );
      return;
    }

    var bounds = getDisplayedImageBounds(img, zoomBtn);
    if (!bounds) {
      hideGalleryLens();
      return;
    }

    var btnRect = zoomBtn.getBoundingClientRect();
    var stageRect = stage.getBoundingClientRect();
    var pointerX = event.clientX - btnRect.left;
    var pointerY = event.clientY - btnRect.top;

    if (
      pointerX < bounds.left ||
      pointerY < bounds.top ||
      pointerX > bounds.left + bounds.width ||
      pointerY > bounds.top + bounds.height
    ) {
      hideGalleryLens();
      return;
    }

    var relX = pointerX - bounds.left;
    var relY = pointerY - bounds.top;
    var pctX = relX / bounds.width;
    var pctY = relY / bounds.height;
    var radius = LENS_SIZE / 2;
    var stageX = event.clientX - stageRect.left;
    var stageY = event.clientY - stageRect.top;
    var lensLeft = Math.max(0, Math.min(stageX - radius, stageRect.width - LENS_SIZE));
    var lensTop = Math.max(0, Math.min(stageY - radius, stageRect.height - LENS_SIZE));
    var zoomW = bounds.width * LENS_ZOOM;
    var zoomH = bounds.height * LENS_ZOOM;

    if (lensImg.src !== img.currentSrc && lensImg.src !== img.src) {
      lensImg.src = img.currentSrc || img.src;
    }

    lensImg.style.width = zoomW + "px";
    lensImg.style.height = zoomH + "px";
    lensImg.style.left = radius - pctX * zoomW + "px";
    lensImg.style.top = radius - pctY * zoomH + "px";

    lens.style.width = LENS_SIZE + "px";
    lens.style.height = LENS_SIZE + "px";
    lens.style.left = lensLeft + "px";
    lens.style.top = lensTop + "px";
    lens.classList.add("is-visible");
    lens.setAttribute("aria-hidden", "false");
    zoomBtn.classList.add("is-lens-active");
  }

  function initGalleryLens() {
    if (!isGalleryLensEnabled()) {
      return;
    }

    var mainEl = document.getElementById("angel-product-gallery-main");
    var lens = document.getElementById("angel-product-gallery-lens");
    if (!mainEl || !lens || mainEl.classList.contains("d-none")) {
      return;
    }

    if (!galleryLensBound) {
      galleryLensBound = true;

      mainEl.addEventListener("mousemove", function (event) {
        var zoomBtn = event.target.closest(".angel-product-gallery__zoom");
        if (!zoomBtn || !mainEl.contains(zoomBtn)) {
          hideGalleryLens();
          return;
        }
        updateGalleryLens(event, zoomBtn);
      });

      mainEl.addEventListener("mouseleave", hideGalleryLens);
    }

    if (mainSwiper && !mainSwiper.destroyed) {
      mainSwiper.on("slideChange", hideGalleryLens);
    }
  }

  function initGallerySwipers() {
    var mainEl = document.getElementById("angel-product-gallery-main");
    var thumbsEl = document.getElementById("angel-product-gallery-thumbs");
    if (!mainEl || mainEl.classList.contains("d-none")) {
      return;
    }

    mainSwiper = destroySwiper(mainSwiper);
    thumbsSwiper = destroySwiper(thumbsSwiper);

    var slideCount = mainEl.querySelectorAll(".swiper-slide").length;
    var hasMultiple = slideCount > 1;

    if (thumbsEl && !thumbsEl.classList.contains("d-none") && hasMultiple) {
      thumbsSwiper = new Swiper(thumbsEl, {
        slidesPerView: 3.7,
        spaceBetween: 10,
        freeMode: true,
        watchSlidesProgress: true,
        rtl: isRtl(),
      });
    }

    mainSwiper = new Swiper(mainEl, {
      spaceBetween: 0,
      rtl: isRtl(),
      loop: hasMultiple,
      navigation: hasMultiple
        ? {
            nextEl: "#angel-product-gallery-next",
            prevEl: "#angel-product-gallery-prev",
          }
        : false,
      pagination: hasMultiple
        ? {
            el: "#angel-product-gallery-pagination",
            clickable: true,
          }
        : false,
      thumbs: thumbsSwiper ? { swiper: thumbsSwiper } : undefined,
    });

    bindGalleryZoom();
    initGalleryLens();
  }

  function buildGalleryHtml(media, productName) {
    var mainWrapper = document.getElementById(
      "angel-product-gallery-main-wrapper",
    );
    var thumbsWrapper = document.getElementById(
      "angel-product-gallery-thumbs-wrapper",
    );
    var mainEl = document.getElementById("angel-product-gallery-main");
    var thumbsEl = document.getElementById("angel-product-gallery-thumbs");
    var emptyEl = document.getElementById("angel-product-gallery-empty");
    var stageEl = document.querySelector(".angel-product-gallery__stage");
    var videoPlaySrc =
      document
        .querySelector(".angel-product-gallery")
        ?.getAttribute("data-video-icon") || "";

    if (!mainWrapper || !emptyEl) {
      return;
    }

    mainSwiper = destroySwiper(mainSwiper);
    thumbsSwiper = destroySwiper(thumbsSwiper);

    if (!media || !media.length) {
      mainWrapper.innerHTML = "";
      if (thumbsWrapper) {
        thumbsWrapper.innerHTML = "";
      }
      mainEl?.classList.add("d-none");
      thumbsEl?.classList.add("d-none");
      emptyEl.classList.remove("d-none");
      stageEl?.classList.add("angel-product-gallery__stage--empty");
      return;
    }

    var playIcon = window.angelProductVideoIcon || "";
    var htmlMain = "";
    var htmlThumbs = "";

    media.forEach(function (item, index) {
      var full = item.image && item.image.full_size ? item.image.full_size : "";
      var medium = item.image && item.image.medium ? item.image.medium : full;
      var video =
        item.provider && item.link
          ? '<img class="angel-product-gallery__play" src="' +
            playIcon +
            '" alt="" onclick="event.stopPropagation(); showIframe(this, \'' +
            String(item.link).replace(/'/g, "\\'") +
            "');\" />"
          : "";

      htmlMain +=
        '<div class="swiper-slide"><button type="button" class="angel-product-gallery__zoom" data-gallery-index="' +
        index +
        '"><img src="' +
        full +
        '" alt="' +
        (productName || "") +
        '" class="angel-product-gallery__img" loading="' +
        (index === 0 ? "eager" : "lazy") +
        '" />' +
        video +
        "</button></div>";

      htmlThumbs +=
        '<div class="swiper-slide"><button type="button" class="angel-product-gallery__thumb" data-index="' +
        index +
        '"><img src="' +
        medium +
        '" alt="" loading="lazy" /></button></div>';
    });

    mainWrapper.innerHTML = htmlMain;
    if (thumbsWrapper) {
      thumbsWrapper.innerHTML = htmlThumbs;
    }

    mainEl.classList.remove("d-none");
    emptyEl.classList.add("d-none");
    stageEl?.classList.remove("angel-product-gallery__stage--empty");

    if (media.length > 1) {
      thumbsEl?.classList.remove("d-none");
    } else {
      thumbsEl?.classList.add("d-none");
    }

    requestAnimationFrame(initGallerySwipers);
  }

  function initRelatedSwiper() {
    var el = document.getElementById("angel-related-products");
    if (!el || el.dataset.angelInitialized === "1") {
      if (el && el.dataset.angelInitialized === "1" && relatedSwiper) {
        relatedSwiper.update();
      }
      return;
    }

    relatedSwiper = destroySwiper(relatedSwiper);

    relatedSwiper = new Swiper(el, {
      slidesPerView: 2.1,
      spaceBetween: 12,
      rtl: isRtl(),
      navigation: {
        nextEl: "#angel-related-products-next",
        prevEl: "#angel-related-products-prev",
      },
      breakpoints: {
        576: { slidesPerView: 2.5, spaceBetween: 14 },
        768: { slidesPerView: 3.2, spaceBetween: 16 },
        992: { slidesPerView: 4.2, spaceBetween: 18 },
        1200: { slidesPerView: 5, spaceBetween: 20 },
      },
    });

    el.dataset.angelInitialized = "1";
  }

  var ANGEL_REVIEW_DRAFT_KEY = "angel_product_review_draft";

  function saveAngelReviewDraft(comment, productId, productSlug, targetUrl) {
    if (!comment) {
      return;
    }
    try {
      sessionStorage.setItem(
        ANGEL_REVIEW_DRAFT_KEY,
        JSON.stringify({
          comment: comment,
          productId: productId ? String(productId) : "",
          productSlug: productSlug ? String(productSlug) : "",
          targetUrl: targetUrl || "",
          savedAt: Date.now(),
        }),
      );
    } catch (error) {
      /* ignore quota errors */
    }
  }

  function initAngelReviewDraft() {
    var form = document.getElementById("angel-product-rating-inline");
    if (!form) {
      return;
    }

    var textarea = form.querySelector('textarea[name="review"]');
    var sendLink = form.querySelector("[data-angel-review-send]");
    if (!textarea || !sendLink) {
      return;
    }

    sendLink.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      var comment = textarea.value.trim();
      var productId = form.getAttribute("data-product-id") || "";
      var productSlug = form.getAttribute("data-product-slug") || "";
      var targetUrl =
        sendLink.getAttribute("data-review-target") ||
        form.getAttribute("data-review-url") ||
        sendLink.getAttribute("href") ||
        "";

      if (!targetUrl) {
        window.zid?.toaster?.showError(
          window.angelReviewPageErrorMessage ||
            "Review page is not available.",
        );
        return;
      }

      if (comment) {
        saveAngelReviewDraft(comment, productId, productSlug, targetUrl);
      }

      var requiresLogin = sendLink.getAttribute("data-requires-login") === "true";
      if (
        requiresLogin &&
        (!window.customerAuthState ||
          !window.customerAuthState.isAuthenticated)
      ) {
        if (typeof handleLoginAction === "function") {
          handleLoginAction(targetUrl, true);
        } else {
          window.location.href =
            "/auth/login?redirect_to=" + encodeURIComponent(targetUrl);
        }
        return;
      }

      window.location.assign(targetUrl);
    });
  }

  function initAngelInlineQuestion() {
    var form = document.getElementById("angel-product-question-inline");
    if (!form) {
      return;
    }

    var submitBtn = form.querySelector("[data-angel-question-submit]");
    var textarea = form.querySelector('textarea[name="question"]');
    var nameInput = form.querySelector('input[name="name"]');
    var emailInput = form.querySelector('input[name="email"]');
    var errorEl = form.querySelector('[data-error="question"]');
    var progress = form.querySelector(".angel-product-tabs__send-progress");
    var productId = form.getAttribute("data-product-id");

    if (!submitBtn || !textarea || !productId) {
      return;
    }

    function fillCustomerFields() {
      if (window.customer) {
        if (window.customer.name && nameInput) {
          nameInput.value = window.customer.name;
        }
        if (window.customer.email && emailInput) {
          emailInput.value = window.customer.email;
        }
      }
    }

    fillCustomerFields();

    function resetQuestionSubmitUi() {
      submitBtn.disabled = false;
      if (progress) {
        progress.classList.add("d-none");
      }
    }

    submitBtn.addEventListener("click", function () {
      var questionText = textarea.value.trim();

      if (!questionText) {
        if (errorEl) {
          errorEl.classList.remove("d-none");
        }
        return;
      }

      if (errorEl) {
        errorEl.classList.add("d-none");
      }

      if (
        !window.customerAuthState ||
        !window.customerAuthState.isAuthenticated
      ) {
        if (typeof handleLoginAction === "function") {
          handleLoginAction("", false);
        }
        return;
      }

      fillCustomerFields();

      if (
        (!nameInput || !nameInput.value || !emailInput || !emailInput.value) &&
        typeof $ !== "undefined" &&
        $("#addProductQuestionModal").length
      ) {
        $("#addProductQuestionModal").modal("show");
        if (typeof productsQuestions !== "undefined") {
          productsQuestions.fillCustomerData();
        }
        return;
      }

      if (!window.zid?.products?.createQuestion) {
        window.zid?.toaster?.showError(
          window.angelQuestionServiceErrorMessage ||
            "Service not available. Please try again.",
        );
        return;
      }

      submitBtn.disabled = true;
      if (progress) {
        progress.classList.remove("d-none");
      }

      window.zid.products
        .createQuestion(
          productId,
          {
            question: questionText,
            name: nameInput ? nameInput.value : "",
            email: emailInput ? emailInput.value : "",
            is_anonymous: false,
          },
          { showErrorNotification: true },
        )
        .then(function (response) {
          if (response) {
            textarea.value = "";
            if (window.zid && window.zid.toaster) {
              window.zid.toaster.showSuccess(
                window.angelQuestionSuccessMessage ||
                  "Your question has been sent successfully.",
              );
            }
          }
        })
        .catch(function (err) {
          console.error(err);
        })
        .finally(resetQuestionSubmitUi);
    });
  }

  function initTabs() {
    var tabs = document.querySelectorAll(".angel-product-tabs__btn");
    var panels = document.querySelectorAll(".angel-product-tabs__panel");
    if (!tabs.length) {
      return;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        tabs.forEach(function (t) {
          var isActive = t === tab;
          t.classList.toggle("is-active", isActive);
          t.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        panels.forEach(function (panel) {
          panel.classList.toggle(
            "is-active",
            panel.getAttribute("data-panel") === target,
          );
        });
      });
    });
  }

  function initStickyBar() {
    var bar = document.getElementById("angel-product-sticky-bar");
    if (!bar) {
      return;
    }

    var minus = bar.querySelector("[data-qty-minus]");
    var plus = bar.querySelector("[data-qty-plus]");
    var qtyInput = bar.querySelector("[data-qty-value]");
    var qtySelect = document.getElementById("product-quantity");

    function hasQtySelect() {
      return !!(qtySelect && qtySelect.options && qtySelect.options.length);
    }

    function maxQty() {
      if (hasQtySelect()) {
        var last = qtySelect.options[qtySelect.options.length - 1];
        var n = parseInt(last.value, 10);
        return n > 0 ? n : 1;
      }
      var fromInput = qtyInput ? parseInt(qtyInput.max, 10) : NaN;
      if (fromInput > 0) {
        return fromInput;
      }
      return 100;
    }

    function setQuantity(nextVal) {
      if (!qtyInput) {
        return;
      }
      var m = maxQty();
      var v = parseInt(String(nextVal), 10);
      if (!v || v < 1) {
        v = 1;
      }
      if (v > m) {
        v = m;
      }
      qtyInput.min = "1";
      qtyInput.max = String(m);
      qtyInput.value = String(v);

      if (!hasQtySelect()) {
        return;
      }
      var opt = qtySelect.querySelector('option[value="' + v + '"]');
      if (opt) {
        opt.selected = true;
      } else {
        qtySelect.selectedIndex = qtySelect.options.length - 1;
        qtyInput.value = qtySelect.value;
      }
    }

    function syncFromSelect() {
      if (!qtyInput) {
        return;
      }
      if (!hasQtySelect()) {
        qtyInput.min = "1";
        qtyInput.max = String(maxQty());
        if (!qtyInput.value || parseInt(qtyInput.value, 10) < 1) {
          qtyInput.value = "1";
        }
        return;
      }
      setQuantity(qtySelect.value || "1");
    }

    function applyQtyFromInput() {
      if (!qtyInput) {
        return;
      }
      setQuantity(parseInt(String(qtyInput.value).trim(), 10) || 1);
      if (hasQtySelect()) {
        qtySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    qtySelect?.addEventListener("change", syncFromSelect);
    syncFromSelect();

    minus?.addEventListener("click", function () {
      if (!qtyInput) {
        return;
      }
      var current = parseInt(qtyInput.value, 10) || 1;
      if (current <= 1) {
        return;
      }
      if (hasQtySelect()) {
        qtySelect.selectedIndex = Math.max(0, qtySelect.selectedIndex - 1);
        qtySelect.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      setQuantity(current - 1);
    });

    plus?.addEventListener("click", function () {
      if (!qtyInput) {
        return;
      }
      var current = parseInt(qtyInput.value, 10) || 1;
      if (current >= maxQty()) {
        return;
      }
      if (hasQtySelect()) {
        var maxIx = qtySelect.options.length - 1;
        if (qtySelect.selectedIndex >= maxIx) {
          return;
        }
        qtySelect.selectedIndex += 1;
        qtySelect.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      setQuantity(current + 1);
    });

    qtyInput?.addEventListener("change", applyQtyFromInput);
    qtyInput?.addEventListener("blur", applyQtyFromInput);
    qtyInput?.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        qtyInput.blur();
      }
    });

    var addBtn = bar.querySelector("[data-sticky-add]");
    var buyBtn = bar.querySelector("[data-sticky-buy]");

    addBtn?.addEventListener("click", function () {
      if (typeof window.productAddToCart === "function") {
        window.productAddToCart(addBtn);
      }
    });

    buyBtn?.addEventListener("click", function () {
      if (typeof window.zidProductBuyNow === "function") {
        window.zidProductBuyNow();
      }
    });
  }

  function initAngelVariantPanel() {
    var panel = document.querySelector(".angel-product-page .angel-variant-panel");
    if (!panel) {
      return;
    }

    var optionsRoot = panel.querySelector("#product-variants-options");
    if (!optionsRoot) {
      return;
    }

    var hintText = panel.getAttribute("data-select-label") || "Select";

    optionsRoot.querySelectorAll(":scope > div, :scope > fieldset").forEach(function (group) {
      if (group.classList.contains("angel-variant-option")) {
        return;
      }

      var label =
        group.querySelector("label") ||
        group.querySelector(".product-title") ||
        group.querySelector("h4");
      var list = group.querySelector("ul");
      if (!label || !list) {
        return;
      }

      group.classList.add("angel-variant-option");

      var labelsWrap = document.createElement("div");
      labelsWrap.className = "angel-variant-option__labels";
      label.parentNode.insertBefore(labelsWrap, label);
      labelsWrap.appendChild(label);

      if (!labelsWrap.querySelector(".angel-variant-option__hint")) {
        var hint = document.createElement("span");
        hint.className = "angel-variant-option__hint";
        hint.textContent = hintText;
        labelsWrap.appendChild(hint);
      }
    });

    initAngelColorVariants();
    initAngelTextVariants();
  }

  function getAngelProductVariantData() {
    var node = document.getElementById("angel-product-variant-data");
    if (!node || !node.textContent) {
      return null;
    }
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function syncAngelColorOptionActive(group) {
    var nativeList = group.querySelector("ul");
    var choicesWrap = group.querySelector(".angel-color-option__choices");
    if (!nativeList || !choicesWrap) {
      return;
    }

    var lis = nativeList.querySelectorAll("li");
    var buttons = choicesWrap.querySelectorAll(".angel-color-choice");
    lis.forEach(function (li, index) {
      var btn = buttons[index];
      if (!btn) {
        return;
      }
      var isActive = li.classList.contains("active");
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");

      if (!btn.classList.contains("angel-color-choice--image")) {
        return;
      }

      var thumb = btn.querySelector(".angel-color-choice__thumb");
      var check = btn.querySelector(".angel-color-choice__check");
      if (isActive && thumb && !check) {
        thumb.insertAdjacentHTML(
          "beforeend",
          '<span class="angel-color-choice__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>',
        );
      } else if (!isActive && check) {
        check.remove();
      }
    });
  }

  function mountAngelColorOptionGroup(group, product) {
    if (group.classList.contains("angel-color-option--ready")) {
      syncAngelColorOptionActive(group);
      return;
    }

    var label = group.querySelector("label, .product-title, h4");
    var nativeList = group.querySelector("ul");
    if (!label || !nativeList) {
      return;
    }

    var resolvedOption = product ? resolveOptionForGroup(group, product) : null;
    var labelIsColor =
      label && isGroupedColorOptionName(label.textContent);
    if (resolvedOption && !isGroupedColorOption(resolvedOption) && !labelIsColor) {
      return;
    }

    var colorOption = resolvedOption;
    if (!colorOption && labelIsColor) {
      colorOption = {
        id:
          nativeList.getAttribute("data-option-id") ||
          label.getAttribute("for") ||
          "color",
        name: normalizeOptionLabelText(label.textContent) || "اللون",
      };
    }
    if (!colorOption) {
      return;
    }

    var choices = product ? getGroupedOptionChoices(product, colorOption) : [];
    if (!choices.length) {
      nativeList.querySelectorAll("li").forEach(function (li) {
        var name = (
          li.getAttribute("data-value") ||
          li.getAttribute("data-choice") ||
          (li.querySelector("a") && li.querySelector("a").textContent) ||
          li.textContent ||
          ""
        )
          .replace(/\s+/g, " ")
          .trim();
        if (!name) {
          return;
        }
        var choice = normalizeGroupedChoice({
          id:
            li.getAttribute("data-choice-id") ||
            li.getAttribute("data-id") ||
            name,
          name: name,
          value: name,
        });
        if (!choice) {
          return;
        }
        var img = li.querySelector("img");
        if (img && img.src) {
          choice.image = img.src;
        }
        choices.push(choice);
      });
    }

    if (!choices.length) {
      return;
    }

    var productRef = product || { variants: [], selected_product: {} };
    var useImages = choices.some(function (choice) {
      var variant = findGroupedVariantForChoice(
        productRef,
        colorOption,
        choice,
      );
      return groupedChoiceHasImage(choice, variant);
    });

    group.classList.add(
      "angel-variant-option",
      "angel-color-option",
      "angel-color-option--ready",
    );

    var hint = group.querySelector(".angel-variant-option__hint");
    if (hint) {
      hint.hidden = true;
    }

    var choicesWrap = group.querySelector(".angel-color-option__choices");
    if (!choicesWrap) {
      choicesWrap = document.createElement("div");
      choicesWrap.className = "angel-color-option__choices";
      choicesWrap.setAttribute("role", "list");
      nativeList.parentNode.insertBefore(choicesWrap, nativeList);
    }

    choicesWrap.innerHTML = choices
      .map(function (choice) {
        return renderAngelColorChoiceButton(
          choice,
          productRef,
          colorOption,
          useImages,
        );
      })
      .join("");

    hideNativeVariantList(group, nativeList, "angel-color-option__native");

    var lis = nativeList.querySelectorAll("li");
    choicesWrap.querySelectorAll(".angel-color-choice").forEach(function (btn, index) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        var li = lis[index];
        if (!li) {
          return;
        }
        var link = li.querySelector("a");
        if (link) {
          link.click();
        } else {
          li.click();
        }
        window.setTimeout(function () {
          syncAngelColorOptionActive(group);
        }, 0);
      });
    });

    syncAngelColorOptionActive(group);
  }

  function initAngelColorVariants(attempt) {
    var panel = document.querySelector(".angel-product-page .angel-variant-panel");
    if (!panel) {
      return;
    }

    var optionsRoot = panel.querySelector("#product-variants-options");
    if (!optionsRoot) {
      return;
    }

    var product = getAngelProductVariantData();
    var groups = optionsRoot.querySelectorAll(":scope > div, :scope > fieldset");
    var mounted = 0;

    groups.forEach(function (group) {
      if (!isGroupedColorVariantGroup(group, product)) {
        return;
      }

      mountAngelColorOptionGroup(group, product);
      mounted += 1;
    });

    if (!optionsRoot.dataset.angelColorWatch) {
      optionsRoot.dataset.angelColorWatch = "1";
      var observer = new MutationObserver(function () {
        optionsRoot
          .querySelectorAll(".angel-color-option--ready")
          .forEach(syncAngelColorOptionActive);
        if (!optionsRoot.querySelector(".angel-color-option--ready")) {
          initAngelColorVariants(0);
        }
      });
      observer.observe(optionsRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }

    if (!mounted && (attempt || 0) < 8) {
      window.setTimeout(function () {
        initAngelColorVariants((attempt || 0) + 1);
      }, 200);
    }
  }

  function isGroupedColorOption(option) {
    if (!option) {
      return false;
    }
    return (
      isGroupedColorOptionName(option.name) ||
      isGroupedColorOptionName(option.slug) ||
      option.display_type === "color" ||
      option.type === "color"
    );
  }

  function getGroupedOptionIndex(product, option) {
    var options = (product && product.options) || [];
    var i;
    if (!option) {
      return -1;
    }
    for (i = 0; i < options.length; i += 1) {
      if (String(options[i].id) === String(option.id)) {
        return i;
      }
    }
    return -1;
  }

  function getGroupedVariantAttributeForOption(variant, product, option) {
    var attributes = (variant && variant.attributes) || [];
    if (!attributes.length || !option) {
      return null;
    }
    var optionIndex = getGroupedOptionIndex(product, option);
    var i;
    var attr;

    if (option.id) {
      for (i = 0; i < attributes.length; i += 1) {
        attr = attributes[i];
        if (
          String(attr.option_id) === String(option.id) ||
          String(attr.product_option_id) === String(option.id)
        ) {
          return attr;
        }
      }
    }

    if (optionIndex >= 0 && attributes[optionIndex]) {
      return attributes[optionIndex];
    }

    if (option.slug) {
      for (i = 0; i < attributes.length; i += 1) {
        attr = attributes[i];
        if (String(attr.option_slug) === String(option.slug)) {
          return attr;
        }
      }
    }

    return null;
  }

  function getGroupedNonColorOptions(product) {
    var options = (product && product.options) || [];
    var colorOption = findGroupedColorOption(product);
    return options.filter(function (option) {
      if (isGroupedColorOption(option)) {
        return false;
      }
      if (
        colorOption &&
        option.id &&
        String(option.id) === String(colorOption.id)
      ) {
        return false;
      }
      return true;
    });
  }

  function renderAngelTextChoiceButton(choice, product, option) {
    var variant = findGroupedVariantForChoice(product, option, choice);
    var variantId = variant ? variant.id : "";
    var choiceId = choice.id || choice.value || choice.name || "";
    var label = escapeGroupedHtmlText(choice.name || choice.value || "");
    var isActive = isGroupedChoiceActive(product, option, choice, variant);
    var activeClass = isActive ? " is-active" : "";
    var ariaPressed = isActive
      ? ' aria-pressed="true"'
      : ' aria-pressed="false"';

    return (
      '<button type="button" role="listitem" class="angel-text-choice' +
      activeClass +
      '" data-variant-id="' +
      escapeGroupedHtmlText(variantId) +
      '" data-choice-id="' +
      escapeGroupedHtmlText(choiceId) +
      '" data-option-id="' +
      escapeGroupedHtmlText(option.id) +
      '"' +
      ariaPressed +
      ' aria-label="' +
      label +
      '"><span class="angel-text-choice__label">' +
      label +
      "</span></button>"
    );
  }

  function syncAngelTextOptionActive(group) {
    var nativeList = group.querySelector("ul");
    var choicesWrap = group.querySelector(".angel-text-option__choices");
    if (!nativeList || !choicesWrap) {
      return;
    }

    var lis = nativeList.querySelectorAll("li");
    var buttons = choicesWrap.querySelectorAll(".angel-text-choice");
    lis.forEach(function (li, index) {
      var btn = buttons[index];
      if (!btn) {
        return;
      }
      var isActive = li.classList.contains("active");
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function mountAngelTextOptionGroup(group, product, option) {
    if (group.classList.contains("angel-text-option--ready")) {
      syncAngelTextOptionActive(group);
      return;
    }

    var label = group.querySelector("label, .product-title, h4");
    var nativeList = group.querySelector("ul");
    if (!label || !nativeList) {
      return;
    }

    if (!option) {
      option = resolveOptionForGroup(group, product);
    }
    if (!option) {
      option = {
        id:
          nativeList.getAttribute("data-option-id") ||
          label.getAttribute("for") ||
          "option",
        name: normalizeOptionLabelText(label.textContent),
      };
    }
    if (option && isGroupedColorOption(option)) {
      return;
    }
    if (
      label &&
      isGroupedColorOptionName(label.textContent) &&
      !option.name
    ) {
      return;
    }

    var choices = product ? getGroupedOptionChoices(product, option) : [];
    if (!choices.length) {
      nativeList.querySelectorAll("li").forEach(function (li) {
        var name = (
          li.getAttribute("data-value") ||
          li.getAttribute("data-choice") ||
          (li.querySelector("a") && li.querySelector("a").textContent) ||
          li.textContent ||
          ""
        )
          .replace(/\s+/g, " ")
          .trim();
        if (!name) {
          return;
        }
        var choice = normalizeGroupedChoice({
          id:
            li.getAttribute("data-choice-id") ||
            li.getAttribute("data-id") ||
            name,
          name: name,
          value: name,
        });
        if (choice) {
          choices.push(choice);
        }
      });
    }

    if (!choices.length) {
      return;
    }

    var productRef = product || { variants: [], selected_product: {} };

    group.classList.add(
      "angel-variant-option",
      "angel-text-option",
      "angel-text-option--ready",
    );

    var hint = group.querySelector(".angel-variant-option__hint");
    if (hint) {
      hint.hidden = true;
    }

    var choicesWrap = group.querySelector(".angel-text-option__choices");
    if (!choicesWrap) {
      choicesWrap = document.createElement("div");
      choicesWrap.className = "angel-text-option__choices";
      choicesWrap.setAttribute("role", "list");
      nativeList.parentNode.insertBefore(choicesWrap, nativeList);
    }

    choicesWrap.innerHTML = choices
      .map(function (choice) {
        return renderAngelTextChoiceButton(choice, productRef, option);
      })
      .join("");

    hideNativeVariantList(group, nativeList, "angel-text-option__native");

    var lis = nativeList.querySelectorAll("li");
    choicesWrap.querySelectorAll(".angel-text-choice").forEach(function (btn, index) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        var li = lis[index];
        if (!li) {
          return;
        }
        var link = li.querySelector("a");
        if (link) {
          link.click();
        } else {
          li.click();
        }
        window.setTimeout(function () {
          syncAngelTextOptionActive(group);
        }, 0);
      });
    });

    syncAngelTextOptionActive(group);
  }

  function initAngelTextVariants(attempt) {
    var panel = document.querySelector(".angel-product-page .angel-variant-panel");
    if (!panel) {
      return;
    }

    var optionsRoot = panel.querySelector("#product-variants-options");
    if (!optionsRoot) {
      return;
    }

    var product = getAngelProductVariantData();
    var groups = optionsRoot.querySelectorAll(":scope > div, :scope > fieldset");
    var mounted = 0;

    groups.forEach(function (group) {
      if (!isGroupedTextVariantGroup(group, product)) {
        return;
      }

      var option = resolveOptionForGroup(group, product);
      mountAngelTextOptionGroup(group, product, option);
      mounted += 1;
    });

    if (!optionsRoot.dataset.angelTextWatch) {
      optionsRoot.dataset.angelTextWatch = "1";
      var observer = new MutationObserver(function () {
        optionsRoot
          .querySelectorAll(".angel-text-option--ready")
          .forEach(syncAngelTextOptionActive);
        if (!optionsRoot.querySelector(".angel-text-option--ready")) {
          initAngelTextVariants(0);
        }
      });
      observer.observe(optionsRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    if (!mounted && (attempt || 0) < 8) {
      window.setTimeout(function () {
        initAngelTextVariants((attempt || 0) + 1);
      }, 200);
    }
  }

  function initGalleryShare() {
    var root = document.getElementById("angel-product-gallery");
    if (!root) {
      return;
    }

    var defaultBlock = root.querySelector("[data-share-default]");
    var panel = root.querySelector("[data-share-panel]");
    var openBtn = root.querySelector("[data-share-open]");
    var closeBtn = root.querySelector("[data-share-close]");
    var copyBtn = root.querySelector('[data-share="copy"]');

    if (!defaultBlock || !panel || !openBtn) {
      return;
    }

    function setShareOpen(isOpen) {
      defaultBlock.classList.toggle("is-hidden", isOpen);
      panel.classList.toggle("is-open", isOpen);
      panel.hidden = !isOpen;
      openBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    openBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setShareOpen(true);
    });

    closeBtn?.addEventListener("click", function (e) {
      e.stopPropagation();
      setShareOpen(false);
    });

    copyBtn?.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var url =
        root.getAttribute("data-share-url") || window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          var copiedMsg =
            root.getAttribute("data-share-copied") || "Link copied";
          if (window.zid && window.zid.toaster && window.zid.toaster.showSuccess) {
            window.zid.toaster.showSuccess(copiedMsg);
          }
        });
      }
    });

    document.addEventListener("click", function (e) {
      if (!panel.classList.contains("is-open")) {
        return;
      }
      if (root.contains(e.target)) {
        return;
      }
      setShareOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) {
        setShareOpen(false);
      }
    });
  }

  function parseCountdownEnd(value) {
    if (!value) {
      return NaN;
    }
    var trimmed = String(value).trim();
    if (/^\d+$/.test(trimmed)) {
      var asNum = Number(trimmed);
      return trimmed.length <= 10 ? asNum * 1000 : asNum;
    }
    var parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  function formatCountdown(ms) {
    var totalSeconds = Math.max(0, Math.floor(ms / 1000));
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  function initUrgencyCountdown() {
    var timerEl = document.querySelector("[data-urgency-countdown]");
    if (!timerEl) {
      return;
    }

    var endMs = parseCountdownEnd(timerEl.getAttribute("data-countdown-end"));
    if (Number.isNaN(endMs)) {
      return;
    }

    function tick() {
      var remaining = endMs - Date.now();
      timerEl.textContent = formatCountdown(remaining);
      if (remaining <= 0) {
        timerEl.textContent = "00:00:00";
        return false;
      }
      return true;
    }

    if (!tick()) {
      return;
    }

    window.setInterval(function () {
      tick();
    }, 1000);
  }

  var groupedQuickViewState = null;

  function groupedQvLabels(root) {
    return {
      add: root.getAttribute("data-label-add") || "add to cart",
      preorder: root.getAttribute("data-label-preorder") || "Preorder now",
      viewProduct: root.getAttribute("data-label-view-product") || "View product",
      discount: root.getAttribute("data-label-discount") || "Discount",
      copied: root.getAttribute("data-label-copied") || "Link copied",
      readMore: root.getAttribute("data-label-read-more") || "Read more",
      placeholder: root.getAttribute("data-asset-placeholder") || "",
    };
  }

  function unwrapGroupedProduct(response) {
    if (!response) {
      return null;
    }
    if (response.product) {
      return response.product;
    }
    if (response.data) {
      if (response.data.product) {
        return response.data.product;
      }
      if (response.data.id) {
        return response.data;
      }
    }
    if (response.id && response.name) {
      return response;
    }
    return null;
  }

  function normalizeGroupedProduct(product) {
    if (!product) {
      return null;
    }
    if (!product.selected_product) {
      product.selected_product = product;
    }
    return product;
  }

  function getEmbeddedGroupedProduct(trigger) {
    var card =
      trigger.closest(".angel-grouped-card") ||
      trigger.closest(".angel-product-card");
    if (!card) {
      return null;
    }
    var dataNode =
      card.querySelector(".angel-grouped-card__data") ||
      card.querySelector(".angel-product-card__data");
    if (!dataNode || !dataNode.textContent) {
      return null;
    }
    try {
      return normalizeGroupedProduct(JSON.parse(dataNode.textContent));
    } catch (error) {
      return null;
    }
  }

  function fetchGroupedProduct(productId) {
    if (window.zid && window.zid.products && typeof window.zid.products.get === "function") {
      return window.zid.products
        .get(productId)
        .then(unwrapGroupedProduct)
        .catch(function () {
          return null;
        });
    }

    if (
      window.zid &&
      window.zid.store &&
      window.zid.store.product &&
      typeof window.zid.store.product.fetch === "function"
    ) {
      return window.zid.store.product
        .fetch(productId)
        .then(unwrapGroupedProduct)
        .catch(function () {
          return null;
        });
    }

    return Promise.resolve(null);
  }

  function getGroupedProductMedia(product) {
    var selected = product.selected_product || product;
    if (selected.media && selected.media.length) {
      return selected.media;
    }
    if (product.images && product.images.length) {
      return product.images;
    }
    if (product.main_image && product.main_image.image) {
      return [{ image: product.main_image.image }];
    }
    return [];
  }

  function getGroupedMediaUrl(item, size) {
    if (!item || !item.image) {
      return "";
    }
    if (size === "full") {
      return item.image.full_size || item.image.medium || item.image.small || "";
    }
    return item.image.medium || item.image.full_size || item.image.small || "";
  }

  function isUsableGroupedImageUrl(url) {
    if (!url || typeof url !== "string") {
      return false;
    }
    var trimmed = url.trim();
    return (
      !!trimmed &&
      trimmed !== "[object Object]" &&
      (trimmed.indexOf("http://") === 0 ||
        trimmed.indexOf("https://") === 0 ||
        trimmed.indexOf("//") === 0 ||
        trimmed.indexOf("/") === 0)
    );
  }

  function resolveGroupedAssetUrl(asset) {
    if (!asset) {
      return "";
    }
    if (typeof asset === "string") {
      return isUsableGroupedImageUrl(asset) ? asset.trim() : "";
    }
    if (typeof asset !== "object") {
      return "";
    }

    if (asset.image && typeof asset.image === "object") {
      var nested =
        asset.image.medium ||
        asset.image.full_size ||
        asset.image.small ||
        asset.image.thumbnail ||
        asset.image.large ||
        "";
      if (isUsableGroupedImageUrl(nested)) {
        return nested;
      }
    }

    var direct =
      asset.medium ||
      asset.full_size ||
      asset.small ||
      asset.thumbnail ||
      asset.large ||
      "";
    if (isUsableGroupedImageUrl(direct)) {
      return direct;
    }

    if (asset.url) {
      return resolveGroupedAssetUrl(asset.url);
    }
    if (asset.src) {
      return resolveGroupedAssetUrl(asset.src);
    }

    return "";
  }

  function getGroupedCategoryImageUrl(cat) {
    if (!cat) {
      return "";
    }
    return (
      resolveGroupedAssetUrl(cat.cover_image) ||
      resolveGroupedAssetUrl(cat.image) ||
      ""
    );
  }

  function getGroupedCategoryUrl(cat) {
    if (!cat) {
      return "";
    }
    var direct = String(cat.url || cat.html_url || "").trim();
    if (direct) {
      return direct;
    }
    if (cat.id) {
      return (
        "/categories/" +
        String(cat.id) +
        "/" +
        String(cat.slug || cat.id)
      );
    }
    return "";
  }

  function stripGroupedHtml(html) {
    if (!html) {
      return "";
    }
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function renderGroupedRatingStars(rating) {
    var avg = Number(rating && rating.average);
    if (!avg || Number.isNaN(avg)) {
      return "";
    }
    var rounded = Math.ceil(avg * 2) / 2;
    var html = '<span class="angel-grouped-quick-view__stars" aria-hidden="true">';
    for (var n = 1; n <= 5; n += 1) {
      if (n <= rounded) {
        html += '<span>★</span>';
      } else if (n <= rounded + 0.5) {
        html += '<span>⯨</span>';
      } else {
        html += '<span class="is-muted">★</span>';
      }
    }
    html += "</span>";
    return html;
  }

  function groupedRatingCountLabel(count) {
    if (count === 1) {
      return "(" + count + ")";
    }
    return "(" + count + ")";
  }

  var GROUPED_COLOR_NAME_HEX = {
    أسود: "#000000",
    black: "#000000",
    أبيض: "#ffffff",
    white: "#ffffff",
    أزرق: "#2563eb",
    blue: "#2563eb",
    برتقالي: "#f97316",
    orange: "#f97316",
    أحمر: "#ef4444",
    red: "#ef4444",
    أخضر: "#22c55e",
    green: "#22c55e",
    رمادي: "#9ca3af",
    gray: "#9ca3af",
    grey: "#9ca3af",
    وردي: "#ec4899",
    pink: "#ec4899",
    بني: "#92400e",
    brown: "#92400e",
    أصفر: "#eab308",
    yellow: "#eab308",
    بنفسجي: "#a855f7",
    purple: "#a855f7",
  };

  function escapeGroupedHtmlText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function isGroupedColorOptionName(name) {
    var normalized = String(name || "")
      .toLowerCase()
      .trim();
    return (
      normalized.indexOf("color") !== -1 ||
      normalized.indexOf("colour") !== -1 ||
      normalized.indexOf("لون") !== -1
    );
  }

  function normalizeOptionLabelText(text) {
    return String(text || "")
      .replace(/\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function resolveOptionForGroup(group, product) {
    var options = (product && product.options) || [];
    var nativeList = group && group.querySelector("ul");
    var label = group && group.querySelector("label, .product-title, h4");
    var optionId =
      (nativeList && nativeList.getAttribute("data-option-id")) ||
      (label && label.getAttribute("for")) ||
      "";
    var i;

    if (optionId) {
      for (i = 0; i < options.length; i += 1) {
        if (String(options[i].id) === String(optionId)) {
          return options[i];
        }
      }
    }

    if (label) {
      var labelText = normalizeOptionLabelText(label.textContent);
      for (i = 0; i < options.length; i += 1) {
        if (normalizeOptionLabelText(options[i].name) === labelText) {
          return options[i];
        }
      }
    }

    return null;
  }

  function isGroupedColorVariantGroup(group, product) {
    if (group.classList.contains("angel-text-option--ready")) {
      return false;
    }

    var option = resolveOptionForGroup(group, product);
    if (option && isGroupedColorOption(option)) {
      return true;
    }

    var label = group.querySelector("label, .product-title, h4");
    return !!(label && isGroupedColorOptionName(label.textContent));
  }

  function isGroupedTextVariantGroup(group, product) {
    if (
      group.classList.contains("angel-color-option--ready") ||
      group.classList.contains("angel-color-option")
    ) {
      return false;
    }

    if (!group.querySelector("ul")) {
      return false;
    }

    return !isGroupedColorVariantGroup(group, product);
  }

  function hideNativeVariantList(group, nativeList, nativeClass) {
    nativeList.classList.add(nativeClass);
    nativeList.hidden = true;
    nativeList.setAttribute("aria-hidden", "true");

    group.querySelectorAll("ul").forEach(function (ul) {
      if (
        ul.classList.contains("angel-color-option__choices") ||
        ul.classList.contains("angel-text-option__choices")
      ) {
        return;
      }
      ul.hidden = true;
      ul.setAttribute("aria-hidden", "true");
    });

    group.querySelectorAll(":scope > div").forEach(function (wrap) {
      if (
        wrap.classList.contains("angel-variant-option__labels") ||
        wrap.classList.contains("angel-color-option__choices") ||
        wrap.classList.contains("angel-text-option__choices")
      ) {
        return;
      }
      if (
        wrap.querySelector("ul.angel-color-option__native, ul.angel-text-option__native") &&
        !wrap.querySelector(".angel-color-choice, .angel-text-choice")
      ) {
        wrap.hidden = true;
      }
    });
  }

  function findGroupedColorOption(product) {
    var options = (product && product.options) || [];
    var i;
    for (i = 0; i < options.length; i += 1) {
      var option = options[i];
      if (isGroupedColorOption(option)) {
        return option;
      }
    }

    return null;
  }

  function normalizeGroupedChoice(choice) {
    if (choice == null) {
      return null;
    }
    if (typeof choice === "string" || typeof choice === "number") {
      var text = String(choice).trim();
      return text ? { id: text, name: text, value: text } : null;
    }
    if (typeof choice !== "object") {
      return null;
    }
    var name = String(
      choice.name || choice.label || choice.title || choice.value || "",
    ).trim();
    var value = String(choice.value || choice.name || choice.label || "").trim();
    var id = choice.id || choice.value_id || value || name;
    if (!id && !name && !value) {
      return null;
    }
    return {
      id: id,
      name: name || value,
      value: value || name,
      color:
        choice.color ||
        choice.hex ||
        choice.color_code ||
        choice.value_code ||
        choice.code,
      image: choice.image || choice.image_url,
      _variantId: choice._variantId,
    };
  }

  function getGroupedColorOptionIndex(product, colorOption) {
    var options = (product && product.options) || [];
    var i;
    if (!colorOption) {
      return -1;
    }
    for (i = 0; i < options.length; i += 1) {
      if (String(options[i].id) === String(colorOption.id)) {
        return i;
      }
    }
    if (isGroupedColorOptionName(colorOption.name)) {
      for (i = 0; i < options.length; i += 1) {
        if (isGroupedColorOptionName(options[i].name)) {
          return i;
        }
      }
    }
    return -1;
  }

  function getGroupedVariantColorAttribute(variant, product, colorOption) {
    var attributes = (variant && variant.attributes) || [];
    if (!attributes.length) {
      return null;
    }

    var optionIndex = getGroupedColorOptionIndex(product, colorOption);
    var i;
    var attr;

    if (colorOption && colorOption.id) {
      for (i = 0; i < attributes.length; i += 1) {
        attr = attributes[i];
        if (
          String(attr.option_id) === String(colorOption.id) ||
          String(attr.product_option_id) === String(colorOption.id)
        ) {
          return attr;
        }
      }
    }

    if (optionIndex >= 0 && attributes[optionIndex]) {
      return attributes[optionIndex];
    }

    for (i = 0; i < attributes.length; i += 1) {
      attr = attributes[i];
      if (isGroupedColorOptionName(attr.name)) {
        return attr;
      }
    }

    return null;
  }

  function buildGroupedChoicesFromVariants(product, option) {
    var variants = (product && product.variants) || [];
    var map = {};
    var choices = [];

    variants.forEach(function (variant) {
      var attr = getGroupedVariantAttributeForOption(variant, product, option);
      if (!attr) {
        return;
      }

      var name = String(attr.value || attr.name || "").trim();
      if (!name) {
        return;
      }

      var key = String(attr.id || attr.value_id || name);
      if (map[key]) {
        return;
      }

      map[key] = true;
      choices.push(
        normalizeGroupedChoice({
          id: attr.id || attr.value_id || name,
          name: name,
          value: name,
          color: attr.color || attr.hex || attr.color_code,
          image: attr.image,
          _variantId: variant.id,
        }),
      );
    });

    return choices.filter(Boolean);
  }

  function getGroupedOptionChoices(product, option) {
    if (!option) {
      return [];
    }

    var raw =
      option.choices ||
      option.values ||
      option.options ||
      option.elements ||
      [];
    var choices = [];

    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        var normalized = normalizeGroupedChoice(item);
        if (normalized) {
          choices.push(normalized);
        }
      });
    } else if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (key) {
        var normalized = normalizeGroupedChoice(raw[key]);
        if (normalized) {
          if (!normalized.id) {
            normalized.id = key;
          }
          choices.push(normalized);
        }
      });
    }

    if (!choices.length && product) {
      choices = buildGroupedChoicesFromVariants(product, option);
    }

    return choices;
  }

  function groupedAttributeMatchesChoice(attr, option, choice) {
    var choiceId = choice.id;
    var choiceName = String(choice.name || choice.value || "").trim();
    var attrValue = String(attr.value || attr.name || "").trim();
    var optionMatch =
      !option.id ||
      String(attr.option_id) === String(option.id) ||
      String(attr.product_option_id) === String(option.id) ||
      (option.slug && String(attr.option_slug) === String(option.slug));
    var valueMatch =
      String(attr.id) === String(choiceId) ||
      String(attr.value_id) === String(choiceId) ||
      attrValue === choiceName ||
      (choice.value && attrValue === String(choice.value).trim());
    return valueMatch && (optionMatch || !attr.option_id);
  }

  function findGroupedVariantForChoice(product, option, choice) {
    var variants = product.variants || [];
    if (choice && choice._variantId) {
      var direct = variants.find(function (variant) {
        return String(variant.id) === String(choice._variantId);
      });
      if (direct) {
        return direct;
      }
    }
    var match = variants.find(function (variant) {
      return (variant.attributes || []).some(function (attr) {
        return groupedAttributeMatchesChoice(attr, option, choice);
      });
    });
    if (match) {
      return match;
    }
    var choiceName = String(choice.name || choice.value || "").trim();
    return variants.find(function (variant) {
      return (variant.attributes || []).some(function (attr) {
        return String(attr.value || attr.name || "").trim() === choiceName;
      });
    });
  }

  function getGroupedChoiceImageUrl(choice, variant) {
    var fromChoiceImage = resolveGroupedAssetUrl(choice.image);
    if (fromChoiceImage) {
      return fromChoiceImage;
    }
    if (typeof choice.image === "string" && isUsableGroupedImageUrl(choice.image)) {
      return choice.image.trim();
    }
    if (choice.image_url && isUsableGroupedImageUrl(choice.image_url)) {
      return choice.image_url.trim();
    }
    if (variant && variant.images && variant.images.length) {
      return getGroupedMediaUrl(variant.images[0], "thumb");
    }
    if (variant && variant.image && variant.image.image) {
      return getGroupedMediaUrl(variant.image, "thumb");
    }
    return "";
  }

  function getGroupedChoiceColorHex(choice) {
    var raw =
      choice.color ||
      choice.hex ||
      choice.color_code ||
      choice.value_code ||
      choice.code ||
      "";
    if (raw && /^#?[0-9a-f]{3,8}$/i.test(String(raw).trim())) {
      var hex = String(raw).trim();
      return hex.indexOf("#") === 0 ? hex : "#" + hex;
    }
    var label = String(choice.name || choice.value || "")
      .toLowerCase()
      .trim();
    return GROUPED_COLOR_NAME_HEX[label] || "#6b7280";
  }

  function groupedChoiceHasImage(choice, variant) {
    return !!getGroupedChoiceImageUrl(choice, variant);
  }

  function isGroupedChoiceActive(product, option, choice, variant) {
    var selected = product.selected_product || product;
    if (variant && String(selected.id) === String(variant.id)) {
      return true;
    }
    return (selected.attributes || []).some(function (attr) {
      return groupedAttributeMatchesChoice(attr, option, choice);
    });
  }

  function renderAngelColorChoiceButton(
    choice,
    product,
    colorOption,
    useImages,
  ) {
    var variant = findGroupedVariantForChoice(product, colorOption, choice);
    var variantId = variant ? variant.id : "";
    var choiceId = choice.id || choice.value || choice.name || "";
    var label = escapeGroupedHtmlText(choice.name || choice.value || "");
    var isActive = isGroupedChoiceActive(product, colorOption, choice, variant);
    var activeClass = isActive ? " is-active" : "";
    var ariaPressed = isActive
      ? ' aria-pressed="true"'
      : ' aria-pressed="false"';
    var baseAttrs =
      ' data-variant-id="' +
      escapeGroupedHtmlText(variantId) +
      '" data-choice-id="' +
      escapeGroupedHtmlText(choiceId) +
      '" data-option-id="' +
      escapeGroupedHtmlText(colorOption.id) +
      '"' +
      ariaPressed +
      ' aria-label="' +
      label +
      '"';

    if (useImages) {
      var imageUrl = getGroupedChoiceImageUrl(choice, variant);
      if (imageUrl) {
        return (
          '<button type="button" role="listitem" class="angel-color-choice angel-color-choice--image' +
          activeClass +
          '"' +
          baseAttrs +
          '><span class="angel-color-choice__thumb"><img src="' +
          escapeGroupedHtmlText(imageUrl) +
          '" alt="" loading="lazy" />' +
          (isActive
            ? '<span class="angel-color-choice__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>'
            : "") +
          '</span><span class="angel-color-choice__name">' +
          label +
          "</span></button>"
        );
      }
    }

    var hex = getGroupedChoiceColorHex(choice);
    return (
      '<button type="button" role="listitem" class="angel-color-choice angel-color-choice--swatch' +
      activeClass +
      '"' +
      baseAttrs +
      '><span class="angel-color-choice__dot" style="background-color:' +
      escapeGroupedHtmlText(hex) +
      '"></span><span class="angel-color-choice__name">' +
      label +
      "</span></button>"
    );
  }

  function buildGroupedColorChoicesHtml(product, state) {
    var colorOption = findGroupedColorOption(product);
    if (!colorOption) {
      return { html: "", option: null, useImages: false };
    }

    var choices = getGroupedOptionChoices(product, colorOption);
    if (!choices.length) {
      return { html: "", option: null, useImages: false };
    }

    var useImages = choices.some(function (choice) {
      var variant = findGroupedVariantForChoice(product, colorOption, choice);
      return groupedChoiceHasImage(choice, variant);
    });

    var html = choices
      .map(function (choice) {
        return renderAngelColorChoiceButton(
          choice,
          product,
          colorOption,
          useImages,
        );
      })
      .join("");

    return { html: html, option: colorOption, useImages: useImages };
  }

  function buildGroupedTextOptionsHtml(product) {
    var options = getGroupedNonColorOptions(product);
    if (!options.length) {
      return { html: "", hasOptions: false };
    }

    var sections = [];
    options.forEach(function (option) {
      var choices = getGroupedOptionChoices(product, option);
      if (!choices.length) {
        return;
      }
      var optionName = escapeGroupedHtmlText(option.name || "");
      var buttons = choices
        .map(function (choice) {
          return renderAngelTextChoiceButton(choice, product, option);
        })
        .join("");
      sections.push(
        '<div class="angel-grouped-quick-view__option" data-option-id="' +
          escapeGroupedHtmlText(option.id) +
          '"><p class="angel-grouped-quick-view__option-heading">' +
          optionName +
          '<span class="angel-grouped-quick-view__option-req" aria-hidden="true">*</span></p><div class="angel-text-option__choices" role="list">' +
          buttons +
          "</div></div>",
      );
    });

    return {
      html: sections.join(""),
      hasOptions: sections.length > 0,
    };
  }

  function groupedProductHasVariantUi(product) {
    var colorResult = buildGroupedColorChoicesHtml(product);
    var textResult = buildGroupedTextOptionsHtml(product);
    return !!(colorResult.html || textResult.html);
  }

  function updateGroupedQuickViewPrices(root, selected, labels) {
    var salePrice = selected.formatted_sale_price;
    var regularPrice = selected.formatted_price;
    var currentText = salePrice || regularPrice || "";
    var oldText = salePrice && regularPrice ? regularPrice : "";

    root.querySelectorAll("[data-grouped-qv-price]").forEach(function (el) {
      el.textContent = currentText;
      el.classList.toggle(
        "angel-grouped-quick-view__price--regular",
        !salePrice,
      );
      el.classList.toggle("angel-grouped-quick-view__price--sale", !!salePrice);
    });

    root.querySelectorAll("[data-grouped-qv-panel-price]").forEach(function (el) {
      el.textContent = currentText;
      el.classList.toggle(
        "angel-grouped-quick-view__price--regular",
        !salePrice,
      );
      el.classList.toggle("angel-grouped-quick-view__price--sale", !!salePrice);
    });

    root.querySelectorAll("[data-grouped-qv-price-old], [data-grouped-qv-panel-price-old]").forEach(function (el) {
      if (oldText) {
        el.textContent = oldText;
        el.hidden = false;
      } else {
        el.textContent = "";
        el.hidden = true;
      }
    });

    var discountEl = root.querySelector("[data-grouped-qv-discount]");
    if (discountEl) {
      var discountText = "";
      if (selected.formatted_discount_amount) {
        discountText =
          labels.discount + " " + selected.formatted_discount_amount;
      } else if (salePrice && selected.discount_amount) {
        discountText = labels.discount + " " + selected.discount_amount;
      }
      if (discountText) {
        discountEl.textContent = discountText;
        discountEl.hidden = false;
      } else {
        discountEl.hidden = true;
      }
    }
  }

  function syncGroupedQuickViewChoiceActive(root, optionId, choiceId) {
    if (!root || !optionId) {
      return;
    }

    root
      .querySelectorAll(
        '.angel-color-choice[data-option-id="' +
          optionId +
          '"], .angel-text-choice[data-option-id="' +
          optionId +
          '"]',
      )
      .forEach(function (el) {
        var isActive = String(el.getAttribute("data-choice-id")) === String(choiceId);
        el.classList.toggle("is-active", isActive);
        el.setAttribute("aria-pressed", isActive ? "true" : "false");
        if (!el.classList.contains("angel-color-choice--image")) {
          return;
        }
        var thumb = el.querySelector(".angel-color-choice__thumb");
        var check = el.querySelector(".angel-color-choice__check");
        if (isActive && thumb && !check) {
          thumb.insertAdjacentHTML(
            "beforeend",
            '<span class="angel-color-choice__check" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>',
          );
        } else if (!isActive && check) {
          check.remove();
        }
      });
  }

  function selectGroupedVariantChoice(state, btn) {
    var product = state.product;
    var root = state.root;
    if (!product) {
      return;
    }

    var optionId = btn.getAttribute("data-option-id");
    var choiceId = btn.getAttribute("data-choice-id");
    if (!optionId || !choiceId) {
      return;
    }

    state.optionSelections = state.optionSelections || {};
    state.optionSelections[optionId] = choiceId;
    syncGroupedQuickViewChoiceActive(root, optionId, choiceId);

    var variantId = btn.getAttribute("data-variant-id");
    var variants = product.variants || [];
    var variant = variants.find(function (v) {
      return String(v.id) === String(variantId);
    });

    if (
      variant &&
      Object.keys(state.optionSelections).length <= 1 &&
      !getGroupedNonColorOptions(product).length
    ) {
      product.selected_product = variant;
      applyGroupedQuickViewProduct(state);
      return;
    }

    if (
      !window.zid ||
      !window.zid.products ||
      typeof window.zid.products.getProductOptions !== "function"
    ) {
      return;
    }

    window.zid.products
      .getProductOptions(state.productId || product.id, {
        attributes: state.optionSelections,
      })
      .then(function (response) {
        var payload = response && response.data ? response.data : response;
        var selected = payload && (payload.selected_product || payload.product);
        if (selected) {
          product.selected_product = selected;
          if (payload.product) {
            state.product = normalizeGroupedProduct(payload.product);
            state.product.selected_product = selected;
          }
          applyGroupedQuickViewProduct(state);
        }
      })
      .catch(function () {});
  }

  function selectGroupedColorChoice(state, btn) {
    selectGroupedVariantChoice(state, btn);
  }

  function groupedProductNeedsOptions(product) {
    return !!(
      product &&
      (product.has_options ||
        product.has_fields ||
        product.has_variants ||
        product.product_class === "dynamic_bundle")
    );
  }

  function groupedProductCanAdd(product, selected) {
    var canPreorder = product && product.can_be_preordered;
    if (!selected) {
      return false;
    }
    if (selected.in_stock) {
      return true;
    }
    if (canPreorder) {
      return true;
    }
    if (product.is_infinite || (selected.quantity && selected.quantity > 0)) {
      return true;
    }
    return false;
  }

  function applyGroupedQuickViewProduct(state) {
    var root = state.root;
    var product = state.product;
    var labels = state.labels;
    var selected = product.selected_product || product;
    var media = getGroupedProductMedia(product);

    state.media = media;
    state.galleryIndex = 0;
    state.selectedVariantId = selected.id;

    var titleEl = root.querySelector("[data-grouped-qv-title]");
    var subtitleEl = root.querySelector("[data-grouped-qv-subtitle]");
    var brandEl = root.querySelector("[data-grouped-qv-brand]");
    var discountEl = root.querySelector("[data-grouped-qv-discount]");
    var ratingEl = root.querySelector("[data-grouped-qv-rating]");
    var descWrapEl = root.querySelector("[data-grouped-qv-description-wrap]");
    var descEl = root.querySelector("[data-grouped-qv-description]");
    var readMoreEl = root.querySelector("[data-grouped-qv-read-more]");
    var pricesWrap = root.querySelector("[data-grouped-qv-prices]");
    var optionsWrap = root.querySelector("[data-grouped-qv-options]");
    var colorPanel = root.querySelector("[data-grouped-qv-color-panel]");
    var colorLabel = root.querySelector("[data-grouped-qv-color-label]");
    var colorChoices = root.querySelector("[data-grouped-qv-color-choices]");
    var imgEl = root.querySelector("[data-grouped-qv-img]");
    var addBtn = root.querySelector("[data-grouped-qv-add]");
    var addLabel = root.querySelector("[data-grouped-qv-add-label]");
    var viewLink = root.querySelector("[data-grouped-qv-view-link]");
    var qtyWrap = root.querySelector("[data-grouped-qv-qty-wrap]");
    var wishlistWrap = root.querySelector("[data-grouped-qv-wishlist-wrap]");
    var wishlistBtn = root.querySelector("[data-grouped-qv-wishlist]");

    if (titleEl) {
      titleEl.innerHTML = product.name || "";
    }

    var productUrl =
      product.html_url ||
      (product.slug ? "/products/" + product.slug : "#");

    if (subtitleEl) {
      var subtitleText = "";
      if (product.subtitle) {
        subtitleText = stripGroupedHtml(product.subtitle);
      } else if (product.meta_description) {
        subtitleText = stripGroupedHtml(product.meta_description);
      }
      if (subtitleText) {
        subtitleEl.textContent = subtitleText;
        subtitleEl.hidden = false;
      } else {
        subtitleEl.textContent = "";
        subtitleEl.hidden = true;
      }
    }

    if (brandEl) {
      var cat =
        product.categories && product.categories.length
          ? product.categories[0]
          : null;
      if (cat) {
        var brandNameRaw = String(cat.name || "");
        var brandName = escapeGroupedHtmlText(brandNameRaw);
        var brandImg = getGroupedCategoryImageUrl(cat);
        if (!isUsableGroupedImageUrl(brandImg) && state.brandImageUrl) {
          brandImg = state.brandImageUrl;
        }
        var brandUrl = getGroupedCategoryUrl(cat) || state.brandCategoryUrl || "";
        var brandHtml = "";
        if (brandUrl) {
          brandHtml +=
            '<a class="angel-grouped-quick-view__brand-link" href="' +
            escapeGroupedHtmlText(brandUrl) +
            '">';
        }
        brandHtml += '<span class="angel-grouped-quick-view__brand-pill">';
        if (isUsableGroupedImageUrl(brandImg)) {
          brandHtml +=
            '<img src="' +
            escapeGroupedHtmlText(brandImg) +
            '" alt="' +
            brandName +
            '" loading="lazy" />';
        } else if (brandName) {
          brandHtml +=
            '<span class="angel-grouped-quick-view__brand-placeholder" aria-hidden="true">' +
            escapeGroupedHtmlText(brandNameRaw.charAt(0)) +
            "</span>";
        }
        brandHtml += "</span>";
        if (brandUrl) {
          brandHtml += "</a>";
        }
        brandEl.innerHTML = brandHtml;
        brandEl.hidden = false;
      } else {
        brandEl.innerHTML = "";
        brandEl.hidden = true;
      }
    }

    updateGroupedQuickViewPrices(root, selected, labels);
    if (discountEl) {
      var salePrice = selected.formatted_sale_price;
      if (
        discountEl.hidden &&
        product.discount_percentage &&
        !selected.formatted_discount_amount
      ) {
        discountEl.textContent =
          labels.discount + " " + product.discount_percentage + "%";
        discountEl.hidden = false;
      }
      if (!salePrice && !product.discount_percentage) {
        discountEl.hidden = true;
      }
    }

    if (ratingEl && product.rating && product.rating.average) {
      var count = product.rating.total_count || 0;
      ratingEl.innerHTML =
        renderGroupedRatingStars(product.rating) +
        '<span class="angel-grouped-quick-view__rating-count">' +
        groupedRatingCountLabel(count) +
        "</span>";
      ratingEl.hidden = false;
    } else if (ratingEl) {
      ratingEl.hidden = true;
    }

    var description =
      product.description || product.short_description || "";
    if (descWrapEl && descEl && description) {
      var plain = stripGroupedHtml(description);
      var excerpt = plain;
      if (excerpt.length > 200) {
        excerpt = excerpt.slice(0, 197) + "...";
      }
      descEl.textContent = excerpt;
      descWrapEl.hidden = false;

      if (readMoreEl) {
        readMoreEl.href = productUrl;
        readMoreEl.textContent = labels.readMore;
        readMoreEl.hidden = false;
      }
    } else if (descWrapEl) {
      descWrapEl.hidden = true;
      if (readMoreEl) {
        readMoreEl.hidden = true;
      }
    }

    var textOptionsResult = buildGroupedTextOptionsHtml(product);
    if (optionsWrap) {
      if (textOptionsResult.html) {
        optionsWrap.innerHTML = textOptionsResult.html;
        optionsWrap.hidden = false;
      } else {
        optionsWrap.innerHTML = "";
        optionsWrap.hidden = true;
      }
    }

    var colorResult = buildGroupedColorChoicesHtml(product, state);
    var hasColorPanel = !!(colorResult.html && colorResult.option);
    if (colorPanel && colorChoices) {
      if (hasColorPanel) {
        if (colorLabel) {
          colorLabel.textContent = colorResult.option.name || "اللون";
        }
        colorChoices.innerHTML = colorResult.html;
        colorPanel.hidden = false;
        colorPanel.classList.toggle(
          "angel-grouped-quick-view__color-panel--images",
          colorResult.useImages,
        );
      } else {
        colorChoices.innerHTML = "";
        colorPanel.hidden = true;
        colorPanel.classList.remove(
          "angel-grouped-quick-view__color-panel--images",
        );
      }
    }

    var hasVariantUi = groupedProductHasVariantUi(product);
    if (pricesWrap) {
      pricesWrap.hidden = hasColorPanel;
    }

    updateGroupedQuickViewGallery(state);

    var needsOptions = groupedProductNeedsOptions(product);
    var canAdd = groupedProductCanAdd(product, selected);

    if (viewLink) {
      viewLink.href = productUrl;
    }

    if (needsOptions && !hasVariantUi) {
      if (addBtn) {
        addBtn.hidden = true;
      }
      if (viewLink) {
        viewLink.classList.remove("d-none");
        viewLink.textContent = labels.viewProduct;
      }
      if (qtyWrap) {
        qtyWrap.hidden = true;
      }
    } else {
      if (addBtn) {
        addBtn.hidden = false;
        addBtn.disabled = !canAdd;
      }
      if (viewLink) {
        viewLink.classList.add("d-none");
      }
      if (qtyWrap) {
        qtyWrap.hidden = !canAdd;
      }
      if (addLabel) {
        addLabel.textContent = product.effective_preorder_campaign
          ? labels.preorder
          : labels.add;
      }
    }

    if (wishlistWrap && wishlistBtn) {
      var wishlistEnabled =
        root.getAttribute("data-wishlist-enabled") === "true";
      if (wishlistEnabled) {
        wishlistWrap.hidden = false;
        wishlistWrap.setAttribute("data-wishlist-id", product.id);
        wishlistBtn.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof addToWishlist === "function") {
            addToWishlist(wishlistBtn, String(product.id));
          }
        };
      } else {
        wishlistWrap.hidden = true;
      }
    }

    state.shareUrl = productUrl;
    state.shareTitle = stripGroupedHtml(product.name || "");
    state.selectedProductId = selected.id;

    state.optionSelections = state.optionSelections || {};
    (selected.attributes || []).forEach(function (attr) {
      var optionId = attr.option_id || attr.product_option_id;
      var choiceId = attr.id || attr.value_id || attr.value;
      if (optionId && choiceId) {
        state.optionSelections[optionId] = choiceId;
        syncGroupedQuickViewChoiceActive(root, optionId, choiceId);
      }
    });
  }

  function updateGroupedQuickViewGallery(state) {
    var root = state.root;
    var imgEl = root.querySelector("[data-grouped-qv-img]");
    var prevBtn = root.querySelector("[data-grouped-qv-prev]");
    var nextBtn = root.querySelector("[data-grouped-qv-next]");
    var media = state.media || [];
    var index = state.galleryIndex || 0;

    if (!media.length) {
      if (imgEl) {
        imgEl.src = state.labels.placeholder;
        imgEl.alt = "";
      }
      if (prevBtn) {
        prevBtn.disabled = true;
      }
      if (nextBtn) {
        nextBtn.disabled = true;
      }
      return;
    }

    if (index < 0) {
      index = 0;
    }
    if (index >= media.length) {
      index = media.length - 1;
    }
    state.galleryIndex = index;

    if (imgEl) {
      imgEl.src = getGroupedMediaUrl(media[index], "full") || state.labels.placeholder;
      imgEl.alt = state.shareTitle || "";
    }
    if (prevBtn) {
      prevBtn.disabled = media.length <= 1 || index <= 0;
    }
    if (nextBtn) {
      nextBtn.disabled = media.length <= 1 || index >= media.length - 1;
    }
  }

  function setGroupedQuickViewLoading(state, isLoading) {
    var root = state.root;
    var loadingEl = root.querySelector("[data-grouped-qv-loading]");
    var dialogEl = root.querySelector("[data-grouped-qv-dialog]");
    var contentEl = root.querySelector("[data-grouped-qv-content]");

    root.classList.toggle("is-loading", isLoading);

    if (loadingEl) {
      loadingEl.hidden = !isLoading;
    }
    if (dialogEl) {
      dialogEl.hidden = isLoading;
    }
    if (contentEl && isLoading) {
      contentEl.hidden = true;
    }
  }

  function renderGroupedQuickViewProduct(state, product) {
    var root = state.root;
    var contentEl = root.querySelector("[data-grouped-qv-content]");
    var normalized = normalizeGroupedProduct(product);

    if (!normalized) {
      closeGroupedQuickView();
      return;
    }

    state.product = normalized;
    applyGroupedQuickViewProduct(state);
    setGroupedQuickViewLoading(state, false);

    if (contentEl) {
      contentEl.hidden = false;
    }
  }

  function openGroupedQuickView(productId, embeddedProduct, brandMeta) {
    var root = document.getElementById("angel-grouped-quick-view");
    if (!root || !productId) {
      return;
    }

    var labels = groupedQvLabels(root);
    var initialProduct = normalizeGroupedProduct(embeddedProduct);
    var meta = brandMeta || {};

    groupedQuickViewState = {
      root: root,
      labels: labels,
      productId: productId,
      product: null,
      media: [],
      galleryIndex: 0,
      embeddedProduct: initialProduct,
      brandImageUrl: meta.imageUrl || "",
      brandCategoryUrl: meta.categoryUrl || "",
    };

    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("angel-grouped-qv-open");
    setGroupedQuickViewLoading(groupedQuickViewState, true);

    var fetchStartedAt = Date.now();
    var minLoaderMs = 400;

    fetchGroupedProduct(productId).then(function (product) {
      var waitMs = Math.max(0, minLoaderMs - (Date.now() - fetchStartedAt));

      window.setTimeout(function () {
        if (
          !groupedQuickViewState ||
          String(groupedQuickViewState.productId) !== String(productId)
        ) {
          return;
        }

        var resolved = product || groupedQuickViewState.embeddedProduct;
        if (!resolved) {
          closeGroupedQuickView();
          return;
        }

        renderGroupedQuickViewProduct(groupedQuickViewState, resolved);
      }, waitMs);
    });
  }

  function closeGroupedQuickView() {
    var root = document.getElementById("angel-grouped-quick-view");
    if (!root) {
      return;
    }
    root.classList.remove("is-open", "is-loading");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("angel-grouped-qv-open");
    groupedQuickViewState = null;

    var loadingEl = root.querySelector("[data-grouped-qv-loading]");
    var dialogEl = root.querySelector("[data-grouped-qv-dialog]");
    var contentEl = root.querySelector("[data-grouped-qv-content]");
    if (loadingEl) {
      loadingEl.hidden = true;
    }
    if (dialogEl) {
      dialogEl.hidden = true;
    }
    if (contentEl) {
      contentEl.hidden = true;
    }
  }

  function bindGroupedQuickViewTriggers(scope) {
    if (!scope) {
      return;
    }

    scope.querySelectorAll("[data-grouped-quick-view]").forEach(function (trigger) {
      if (trigger.dataset.groupedQvBound === "1") {
        return;
      }
      trigger.dataset.groupedQvBound = "1";

      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var productId = trigger.getAttribute("data-product-id");
        if (!productId) {
          return;
        }
        openGroupedQuickView(productId, getEmbeddedGroupedProduct(trigger), {
          imageUrl: trigger.getAttribute("data-brand-image") || "",
          categoryUrl: trigger.getAttribute("data-brand-url") || "",
        });
      });
    });
  }

  function initGroupedQuickView() {
    var root = document.getElementById("angel-grouped-quick-view");
    if (!root) {
      return;
    }

    bindGroupedQuickViewTriggers(document.querySelector(".angel-product-grouped-wrap"));
    bindGroupedQuickViewTriggers(
      document.getElementById("products-list") || document,
    );

    root.querySelectorAll("[data-grouped-qv-close]").forEach(function (el) {
      el.addEventListener("click", function (event) {
        event.preventDefault();
        closeGroupedQuickView();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && root.classList.contains("is-open")) {
        closeGroupedQuickView();
      }
    });

    var prevBtn = root.querySelector("[data-grouped-qv-prev]");
    var nextBtn = root.querySelector("[data-grouped-qv-next]");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (!groupedQuickViewState) {
          return;
        }
        groupedQuickViewState.galleryIndex -= 1;
        updateGroupedQuickViewGallery(groupedQuickViewState);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (!groupedQuickViewState) {
          return;
        }
        groupedQuickViewState.galleryIndex += 1;
        updateGroupedQuickViewGallery(groupedQuickViewState);
      });
    }

    function bindGroupedQuickViewVariantClicks(container) {
      if (!container) {
        return;
      }
      container.addEventListener("click", function (event) {
        var btn =
          event.target.closest(".angel-color-choice") ||
          event.target.closest(".angel-text-choice");
        if (!btn || !groupedQuickViewState) {
          return;
        }
        event.preventDefault();
        selectGroupedVariantChoice(groupedQuickViewState, btn);
      });
    }

    bindGroupedQuickViewVariantClicks(
      root.querySelector("[data-grouped-qv-color-choices]"),
    );
    bindGroupedQuickViewVariantClicks(
      root.querySelector("[data-grouped-qv-options]"),
    );

    var qtyInput = root.querySelector("[data-grouped-qv-qty]");
    var qtyMinus = root.querySelector("[data-grouped-qv-qty-minus]");
    var qtyPlus = root.querySelector("[data-grouped-qv-qty-plus]");
    if (qtyMinus && qtyInput) {
      qtyMinus.addEventListener("click", function () {
        var val = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = String(Math.max(1, val - 1));
      });
    }
    if (qtyPlus && qtyInput) {
      qtyPlus.addEventListener("click", function () {
        var val = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = String(val + 1);
      });
    }

    var shareBtn = root.querySelector("[data-grouped-qv-share]");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        if (!groupedQuickViewState) {
          return;
        }
        var url = groupedQuickViewState.shareUrl;
        var title = groupedQuickViewState.shareTitle;
        if (navigator.share && url) {
          navigator.share({ title: title, url: url }).catch(function () {});
          return;
        }
        if (url && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            window.zid?.toaster?.showSuccess(groupedQuickViewState.labels.copied);
          });
        }
      });
    }

    var addBtn = root.querySelector("[data-grouped-qv-add]");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        if (!groupedQuickViewState || addBtn.disabled) {
          return;
        }
        var progress = root.querySelector(".angel-grouped-quick-view__add-progress");
        var label = root.querySelector("[data-grouped-qv-add-label]");
        var qty = parseInt(qtyInput && qtyInput.value, 10) || 1;
        var productId =
          groupedQuickViewState.selectedProductId ||
          groupedQuickViewState.productId;

        if (progress) {
          progress.classList.remove("d-none");
        }
        if (label) {
          label.classList.add("d-none");
        }
        addBtn.disabled = true;

        if (!window.zid || !window.zid.cart || !window.zid.cart.addProduct) {
          addBtn.disabled = false;
          if (progress) {
            progress.classList.add("d-none");
          }
          if (label) {
            label.classList.remove("d-none");
          }
          return;
        }

        var addOptions = { product_id: productId, quantity: qty };
        var addPromise =
          window.AngelCartToast &&
          typeof window.AngelCartToast.addToCart === "function"
            ? window.AngelCartToast.addToCart(addOptions, {}, addBtn)
            : window.zid.cart.addProduct(addOptions, {
                showErrorNotification: false,
              });

        addPromise
          .then(function (response) {
            if (response) {
              closeGroupedQuickView();
            }
          })
          .finally(function () {
            addBtn.disabled = false;
            if (progress) {
              progress.classList.add("d-none");
            }
            if (label) {
              label.classList.remove("d-none");
            }
          });
      });
    }
  }

  function formatAngelReviewDate(dateString) {
    if (!dateString) {
      return "";
    }
    var date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    var day = String(date.getDate()).padStart(2, "0");
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var year = date.getFullYear();
    return day + "/" + month + "/" + year;
  }

  function initAngelReviewsSection() {
    var section = document.querySelector(".angel-reviews-section");
    if (!section) {
      return;
    }

    section.querySelectorAll("[data-review-date-value]").forEach(function (el) {
      var value = el.getAttribute("data-review-date-value");
      var formatted = formatAngelReviewDate(value);
      if (formatted) {
        el.textContent = formatted;
      }
    });

    var list = section.querySelector("#angel-reviews-list");
    var sortSelect = section.querySelector("[data-angel-reviews-sort]");

    function sortReviews(mode) {
      if (!list) {
        return;
      }
      var cards = Array.from(list.querySelectorAll(".angel-review-card"));
      cards.sort(function (a, b) {
        var dateA = new Date(a.getAttribute("data-review-date") || 0).getTime();
        var dateB = new Date(b.getAttribute("data-review-date") || 0).getTime();
        var ratingA = Number(a.getAttribute("data-review-rating")) || 0;
        var ratingB = Number(b.getAttribute("data-review-rating")) || 0;

        if (mode === "oldest") {
          return dateA - dateB;
        }
        if (mode === "highest") {
          return ratingB - ratingA || dateB - dateA;
        }
        if (mode === "lowest") {
          return ratingA - ratingB || dateB - dateA;
        }
        return dateB - dateA;
      });
      cards.forEach(function (card) {
        list.appendChild(card);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        sortReviews(sortSelect.value || "newest");
      });
    }

    section.addEventListener("click", function (event) {
      var imageBtn = event.target.closest("[data-review-image]");
      if (!imageBtn) {
        return;
      }
      var src = imageBtn.getAttribute("data-review-image");
      if (src && typeof openPhotoSwiper === "function") {
        openPhotoSwiper([src], 0);
      }
    });

    section.addEventListener("click", function (event) {
      var helpfulBtn = event.target.closest(".angel-review-card__helpful");
      if (!helpfulBtn || helpfulBtn.disabled) {
        return;
      }
      var countEl = helpfulBtn.querySelector("[data-helpful-num]");
      var current = parseInt(helpfulBtn.getAttribute("data-helpful-count"), 10) || 0;
      helpfulBtn.setAttribute("data-helpful-count", String(current + 1));
      if (countEl) {
        countEl.textContent = String(current + 1);
      }
    });
  }

  function initGroupedProductsSection() {
    var section = document.querySelector(".angel-product-grouped-wrap");
    if (!section) {
      return;
    }

    var vitrinRoot = section.querySelector(".angel-product-grouped__vitrin");
    var customCards = section.querySelectorAll(".angel-grouped-card");

    if (vitrinRoot) {
      var legacyCards = vitrinRoot.querySelectorAll(".product-item");
      if (!legacyCards.length && !customCards.length) {
        section.classList.add("d-none");
        return;
      }
    }

    if (window.bundleOffersLoader && typeof window.bundleOffersLoader.reload === "function") {
      window.bundleOffersLoader.reload();
    }
  }

  function init() {
    if (window.__angelProductJsInit) {
      return;
    }
    window.__angelProductJsInit = true;

    initProductLightbox();
    bindGalleryLightboxClicks();
    var galleryRoot = document.getElementById("angel-product-gallery");
    if (galleryRoot) {
      window.angelProductVideoIcon =
        galleryRoot.getAttribute("data-video-icon") || "";
      initGallerySwipers();
      initGalleryShare();
    }
    initTabs();
    initAngelInlineQuestion();
    initAngelReviewDraft();
    initStickyBar();
    initRelatedSwiper();
    initAngelVariantPanel();
    initUrgencyCountdown();
    initGroupedQuickView();
    initAngelReviewsSection();
    initGroupedProductsSection();
  }

  window.AngelProductPage = {
    init: init,
    rebuildGallery: buildGalleryHtml,
    initRelated: initRelatedSwiper,
    openLightbox: openProductLightbox,
    openGroupedQuickView: openGroupedQuickView,
    bindGroupedQuickViewTriggers: bindGroupedQuickViewTriggers,
  };

  window.angelProductShare = function () {
    var root = document.getElementById("angel-product-gallery");
    var openBtn = root && root.querySelector("[data-share-open]");
    if (openBtn) {
      openBtn.click();
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
