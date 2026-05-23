(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  /** Bootstrap 5 uses data-bs-*; legacy theme / vitrin markup may still use data-toggle. */
  function migrateBootstrapAttributes(root) {
    if (!root) {
      return;
    }

    qsa("[data-toggle]:not([data-bs-toggle])", root).forEach(function (el) {
      el.setAttribute("data-bs-toggle", el.getAttribute("data-toggle"));
    });

    qsa("[data-target]:not([data-bs-target])", root).forEach(function (el) {
      el.setAttribute("data-bs-target", el.getAttribute("data-target"));
    });

    qsa("[data-dismiss]:not([data-bs-dismiss])", root).forEach(function (el) {
      el.setAttribute("data-bs-dismiss", el.getAttribute("data-dismiss"));
    });
  }

  function initBootstrapWidgets(root) {
    var bs = window.bootstrap;
    if (!bs || !root) {
      return;
    }

    migrateBootstrapAttributes(root);

    qsa('[data-bs-toggle="dropdown"]', root).forEach(function (el) {
      if (!bs.Dropdown.getInstance(el)) {
        new bs.Dropdown(el);
      }
    });

    qsa('[data-bs-toggle="collapse"]', root).forEach(function (el) {
      var target = el.getAttribute("data-bs-target") || el.getAttribute("href");
      if (!target || target === "#") {
        return;
      }
      var panel = document.querySelector(target);
      if (panel && !bs.Collapse.getInstance(panel)) {
        new bs.Collapse(panel, { toggle: false });
      }
    });
  }

  function initSortDropdown() {
    var page = qs(".angel-category-page");
    if (!page) {
      return;
    }

    var wrap = qs(".angel-category-toolbar__sort-dropdown", page);
    if (!wrap || wrap.getAttribute("data-angel-sort-bound") === "true") {
      return;
    }
    wrap.setAttribute("data-angel-sort-bound", "true");

    var btn = qs(".angel-category-toolbar__sort-btn", wrap);
    var menu = qs(".angel-category-toolbar__sort-menu", wrap);
    if (!btn || !menu) {
      return;
    }

    migrateBootstrapAttributes(wrap);
    if (window.bootstrap && window.bootstrap.Dropdown) {
      if (!window.bootstrap.Dropdown.getInstance(btn)) {
        new window.bootstrap.Dropdown(btn);
      }
      return;
    }

    function closeMenu() {
      menu.classList.remove("show");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var isOpen = menu.classList.contains("show");
      qsa(".angel-category-toolbar__sort-menu.show", page).forEach(
        function (openMenu) {
          openMenu.classList.remove("show");
        },
      );
      qsa(
        '.angel-category-toolbar__sort-btn[aria-expanded="true"]',
        page,
      ).forEach(function (openBtn) {
        openBtn.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        menu.classList.add("show");
        btn.setAttribute("aria-expanded", "true");
      }
    });

    document.addEventListener("click", function (event) {
      if (!wrap.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  function initFilterDrawer() {
    var page = qs(".angel-category-page");
    if (!page) {
      return;
    }

    if (page.getAttribute("data-angel-filter-drawer-bound") === "true") {
      return;
    }
    page.setAttribute("data-angel-filter-drawer-bound", "true");

    var sidebar = qs(".angel-category-page__sidebar", page);
    var backdrop = qs(".angel-category-page__sidebar-backdrop", page);
    var openBtns = qsa("[data-angel-category-filter-toggle]", page);

    function setOpen(open) {
      if (!sidebar) {
        return;
      }
      sidebar.classList.toggle("is-open", open);
      if (backdrop) {
        backdrop.hidden = !open;
      }
      document.body.classList.toggle("angel-category-filter-open", open);
      qsa("[data-angel-category-filter-toggle]", page).forEach(function (btn) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    page.addEventListener("click", function (event) {
      if (event.target.closest("[data-angel-category-filter-toggle]")) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.target.closest("[data-angel-category-filter-close]")) {
        event.preventDefault();
        setOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        sidebar &&
        sidebar.classList.contains("is-open")
      ) {
        setOpen(false);
      }
    });

    openBtns.forEach(function (btn) {
      if (!btn.getAttribute("aria-expanded")) {
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initClearFilter() {
    qsa("[data-angel-category-clear]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var base = window.location.origin + window.location.pathname;
        window.location.href = base;
      });
    });
  }

  function initBackToTop() {
    var btn = qs("[data-angel-category-back-top]");
    if (!btn) {
      return;
    }
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function enhanceFilterPanel() {
    var root = document.getElementById("angel-category-filters");
    if (!root) {
      return;
    }

    qsa(
      "fieldset, .product-filter, [class*='filter-group'], section",
      root,
    ).forEach(function (block) {
      if (block.classList.contains("angel-category-filter-section")) {
        return;
      }
      if (block.classList.contains("attribute") || block.closest(".attribute")) {
        return;
      }
      block.classList.add("angel-category-filter-section");

      var heading = block.querySelector(
        "legend, h3, h4, .product-filter__title, label",
      );
      if (heading && !heading.closest(".angel-category-filter-section__head")) {
        var head = document.createElement("div");
        head.className = "angel-category-filter-section__head";
        if (heading.parentNode) {
          heading.parentNode.insertBefore(head, heading);
          head.appendChild(heading);
        }
      }
    });

  }

  function observeFilters() {
    var root = document.getElementById("angel-category-filters");
    if (!root) {
      return;
    }

    enhanceFilterPanel();
    migrateBootstrapAttributes(root);
    initBootstrapWidgets(root);
    if (window.AngelSideFilters && window.AngelSideFilters.enhance) {
      window.AngelSideFilters.enhance();
    }

    if (!window.MutationObserver) {
      return;
    }

    var observer = new MutationObserver(function () {
      enhanceFilterPanel();
      migrateBootstrapAttributes(root);
      initBootstrapWidgets(root);
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  var testimonialSwiper = null;

  var STAR_SVG =
    '<svg class="angel-category-testimonial-card__star" version="1.1" xmlns="http://www.w3.org/2000/svg" width="30" height="32" viewBox="0 0 30 32" aria-hidden="true">' +
    "<title>star2</title>" +
    '<path d="M29.714 11.839c0 0.321-0.232 0.625-0.464 0.857l-6.482 6.321 1.536 8.929c0.018 0.125 0.018 0.232 0.018 0.357 0 0.464-0.214 0.893-0.732 0.893-0.25 0-0.5-0.089-0.714-0.214l-8.018-4.214-8.018 4.214c-0.232 0.125-0.464 0.214-0.714 0.214-0.518 0-0.75-0.429-0.75-0.893 0-0.125 0.018-0.232 0.036-0.357l1.536-8.929-6.5-6.321c-0.214-0.232-0.446-0.536-0.446-0.857 0-0.536 0.554-0.75 1-0.821l8.964-1.304 4.018-8.125c0.161-0.339 0.464-0.732 0.875-0.732s0.714 0.393 0.875 0.732l4.018 8.125 8.964 1.304c0.429 0.071 1 0.286 1 0.821z"></path>' +
    "</svg>";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseJsonScript(id) {
    var node = document.getElementById(id);
    if (!node || !node.textContent) {
      return null;
    }
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function normalizeReviewItem(review, fallbackImage) {
    if (!review) {
      return null;
    }

    var comment = String(review.comment || review.content || review.text || "")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!comment) {
      return null;
    }

    var customer = review.customer || {};
    var name =
      customer.name ||
      review.customer_name ||
      review.name ||
      review.author ||
      "";

    var imageSrc =
      customer.image ||
      review.customer_image ||
      review.image_src ||
      review.image ||
      fallbackImage ||
      "";

    var rating = parseInt(review.rating, 10);
    if (isNaN(rating) || rating < 1) {
      rating = 5;
    }
    if (rating > 5) {
      rating = 5;
    }

    return {
      name: String(name).trim() || "",
      comment: comment,
      rating: rating,
      image_src: imageSrc,
    };
  }

  function itemKey(item) {
    return (
      String(item.name || "").toLowerCase() +
      "|" +
      String(item.comment || "").toLowerCase()
    );
  }

  function mergeItems(existing, incoming, maxSlides) {
    var map = {};
    var merged = [];

    existing.forEach(function (item) {
      if (!item || !item.comment) {
        return;
      }
      var key = itemKey(item);
      if (map[key]) {
        return;
      }
      map[key] = true;
      merged.push(item);
    });

    incoming.forEach(function (item) {
      if (!item || !item.comment || merged.length >= maxSlides) {
        return;
      }
      var key = itemKey(item);
      if (map[key]) {
        return;
      }
      map[key] = true;
      merged.push(item);
    });

    return merged.slice(0, maxSlides);
  }

  function collectExistingItems(wrapper) {
    var items = [];
    qsa(".angel-category-testimonial-card", wrapper).forEach(function (card) {
      var commentEl = card.querySelector(
        ".angel-category-testimonial-card__comment",
      );
      var nameEl = card.querySelector(".angel-category-testimonial-card__name");
      var imgEl = card.querySelector(
        ".angel-category-testimonial-card__avatar",
      );
      var comment = commentEl ? commentEl.textContent.trim() : "";
      if (!comment) {
        return;
      }
      items.push({
        name: nameEl ? nameEl.textContent.trim() : "",
        comment: comment,
        rating: qsa(".angel-category-testimonial-card__star", card).length || 5,
        image_src: imgEl ? imgEl.getAttribute("src") || "" : "",
      });
    });
    return items;
  }

  function renderStars(count) {
    var html = "";
    var i;
    for (i = 0; i < count; i += 1) {
      html += STAR_SVG;
    }
    return html;
  }

  function renderTestimonialCard(item) {
    var name = escapeHtml(item.name || "");
    var comment = escapeHtml(item.comment || "");
    var rating = Math.min(5, Math.max(1, parseInt(item.rating, 10) || 5));
    var avatarHtml = "";

    if (item.image_src) {
      avatarHtml =
        '<img class="angel-category-testimonial-card__avatar" src="' +
        escapeHtml(item.image_src) +
        '" alt="" width="96" height="96" loading="lazy" />';
    } else {
      avatarHtml =
        '<span class="angel-category-testimonial-card__avatar-fallback" aria-hidden="true">' +
        escapeHtml((item.name || "?").charAt(0)) +
        "</span>";
    }

    return (
      '<article class="angel-category-testimonial-card">' +
      '<i class="testimonial__icon sicon-quote angel-category-testimonial-card__quote" aria-hidden="true"></i>' +
      '<div class="angel-category-testimonial-card__avatar-wrap">' +
      avatarHtml +
      "</div>" +
      (name
        ? '<h3 class="angel-category-testimonial-card__name">' + name + "</h3>"
        : "") +
      '<div class="angel-category-testimonial-card__stars" aria-hidden="true">' +
      renderStars(rating) +
      "</div>" +
      '<p class="angel-category-testimonial-card__comment">' +
      comment +
      "</p>" +
      "</article>"
    );
  }

  function renderTestimonialSlides(wrapper, items) {
    wrapper.innerHTML = items
      .map(function (item) {
        return (
          '<div class="swiper-slide">' + renderTestimonialCard(item) + "</div>"
        );
      })
      .join("");
  }

  function extractReviewsFromResponse(response) {
    var payload = response && response.data ? response.data : response;
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload.reviews && Array.isArray(payload.reviews.results)) {
      return payload.reviews.results;
    }
    if (Array.isArray(payload.reviews)) {
      return payload.reviews;
    }
    if (Array.isArray(payload.results)) {
      return payload.results;
    }
    return [];
  }

  function fetchProductReviews(productIds, maxSlides) {
    if (
      !productIds.length ||
      !window.zid ||
      !window.zid.products ||
      typeof window.zid.products.reviews !== "function"
    ) {
      return Promise.resolve([]);
    }

    var collected = [];
    var index = 0;
    var section = qs("[data-angel-category-testimonials]");
    var fallbackImage = section
      ? section.getAttribute("data-store-logo") || ""
      : "";

    function next() {
      if (index >= productIds.length || collected.length >= maxSlides) {
        return Promise.resolve(collected);
      }

      var productId = productIds[index];
      index += 1;

      return window.zid.products
        .reviews(productId, { page: 1, page_size: 3 })
        .then(function (response) {
          extractReviewsFromResponse(response).forEach(function (review) {
            var item = normalizeReviewItem(review, fallbackImage);
            if (item) {
              collected.push(item);
            }
          });
        })
        .catch(function () {})
        .then(next);
    }

    return next();
  }

  function setTestimonialsLoading(section, loading) {
    var loader = qs("[data-angel-category-testimonials-loader]", section);
    if (loader) {
      loader.hidden = !loading;
    }
    section.classList.toggle("angel-category-testimonials--loading", loading);
  }

  function initTestimonialsSwiper() {
    var el = document.getElementById("angel-category-testimonials-swiper");
    if (!el || typeof Swiper === "undefined") {
      return;
    }

    var slideCount = el.querySelectorAll(".swiper-slide").length;
    if (!slideCount) {
      return;
    }

    if (testimonialSwiper) {
      testimonialSwiper.destroy(true, true);
      testimonialSwiper = null;
    }

    var isRtl =
      document.body.classList.contains("rtl") || window.appDirection !== "ltr";

    testimonialSwiper = new Swiper(el, {
      slidesPerView: 1,
      spaceBetween: 16,
      loop: slideCount > 1,
      speed: 450,
      grabCursor: true,
      rtl: isRtl,
      autoplay:
        slideCount > 1
          ? {
              delay: 5500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }
          : false,
      breakpoints: {
        576: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 3,
        },
        992: {
          slidesPerView: 3,
        },
      },
    });
  }

  function loadCategoryTestimonials() {
    var section = qs("[data-angel-category-testimonials]");
    if (!section) {
      return Promise.resolve();
    }

    var source = section.getAttribute("data-source") || "both";
    var maxSlides = parseInt(section.getAttribute("data-max-slides"), 10) || 8;
    var needsApi = section.getAttribute("data-needs-api") === "true";
    var wrapper = document.getElementById(
      "angel-category-testimonials-wrapper",
    );

    if (!wrapper) {
      return Promise.resolve();
    }

    var existing = collectExistingItems(wrapper);

    if (!needsApi || source === "manual") {
      if (!existing.length) {
        section.hidden = true;
      } else {
        section.hidden = false;
        initTestimonialsSwiper();
      }
      return Promise.resolve();
    }

    var productIds = parseJsonScript("angel-category-testimonials-product-ids");
    if (!productIds || !productIds.length) {
      if (!existing.length) {
        section.hidden = true;
      } else {
        initTestimonialsSwiper();
      }
      return Promise.resolve();
    }

    setTestimonialsLoading(section, true);

    return fetchProductReviews(productIds, maxSlides).then(function (apiItems) {
      setTestimonialsLoading(section, false);

      var merged =
        source === "api"
          ? mergeItems([], apiItems, maxSlides)
          : mergeItems(existing, apiItems, maxSlides);

      if (!merged.length) {
        section.hidden = true;
        return;
      }

      section.hidden = false;
      renderTestimonialSlides(wrapper, merged);
      initTestimonialsSwiper();
    });
  }

  function init() {
    var page = qs(".angel-category-page");
    if (!page) {
      return;
    }

    migrateBootstrapAttributes(page);
    initFilterDrawer();
    initSortDropdown();
    initClearFilter();
    initBackToTop();
    observeFilters();
    loadCategoryTestimonials();
  }

  whenReady(init);

  window.AngelCategoryPage = {
    onProductsUpdated: observeFilters,
    loadCategoryTestimonials: loadCategoryTestimonials,
    initTestimonialsSwiper: initTestimonialsSwiper,
  };
})();
