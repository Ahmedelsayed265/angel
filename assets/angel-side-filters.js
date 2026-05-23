(function () {
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getFilterRoot() {
    return (
      document.getElementById("angel-category-filters") ||
      document.querySelector(".angel-side-filters")
    );
  }

  function isPanelOpen(toggle, panel) {
    if (toggle.getAttribute("aria-expanded") === "true") {
      return true;
    }
    if (panel && panel.classList.contains("show")) {
      return true;
    }
    if (toggle.classList.contains("collapsed") === false && toggle.hasAttribute("aria-expanded")) {
      return toggle.getAttribute("aria-expanded") !== "false";
    }
    return false;
  }

  function syncPlusMinusIcon(toggle, icon, panel) {
    icon.classList.toggle(
      "s-filters-widget-plusminus-active",
      isPanelOpen(toggle, panel),
    );
  }

  function bindPlusMinusToggle(toggle, root, existingIcon) {
    if (toggle.getAttribute("data-angel-plusminus-bound") === "true") {
      return;
    }
    toggle.setAttribute("data-angel-plusminus-bound", "true");

    var header = toggle.closest(".attribute-header");
    var targetSel =
      toggle.getAttribute("data-bs-target") ||
      toggle.getAttribute("data-target") ||
      toggle.getAttribute("href");
    var panel =
      targetSel && targetSel !== "#"
        ? (root || document).querySelector(targetSel)
        : null;

    qsa("i, svg, img, .fa, .icon, .collapse-icon", toggle).forEach(function (el) {
      if (!el.classList.contains("s-filters-widget-plusminus")) {
        el.hidden = true;
        el.style.display = "none";
      }
    });
    if (header) {
      qsa("i, svg, img, .fa, .icon, .collapse-icon", header).forEach(function (el) {
        if (!el.classList.contains("s-filters-widget-plusminus")) {
          el.hidden = true;
          el.style.display = "none";
        }
      });
    }

    var icon =
      existingIcon ||
      toggle.querySelector(".s-filters-widget-plusminus") ||
      (header && header.querySelector(".s-filters-widget-plusminus"));
    if (!icon) {
      icon = document.createElement("span");
      icon.className = "s-filters-widget-plusminus";
      icon.setAttribute("aria-hidden", "true");
      toggle.appendChild(icon);
    }

    function sync() {
      syncPlusMinusIcon(toggle, icon, panel);
    }

    sync();
    toggle.addEventListener("click", function () {
      window.setTimeout(sync, 50);
      window.setTimeout(sync, 320);
    });

    if (panel) {
      panel.addEventListener("shown.bs.collapse", sync);
      panel.addEventListener("hidden.bs.collapse", sync);
    }
  }

  function enhanceAccordionIcons(root) {
    if (!root) {
      return;
    }

    qsa(".attribute-header", root).forEach(function (header) {
      var icon = header.querySelector(".s-filters-widget-plusminus");
      var toggle = header.querySelector(
        '[data-bs-toggle="collapse"], [data-toggle="collapse"]',
      );
      if (icon && toggle) {
        bindPlusMinusToggle(toggle, root, icon);
      }
    });

    qsa(
      '.attribute-header [data-bs-toggle="collapse"], .attribute-header [data-toggle="collapse"], .attribute-header a[data-bs-toggle], .attribute-header a[data-toggle]',
      root,
    ).forEach(function (toggle) {
      bindPlusMinusToggle(toggle, root);
    });

    qsa(".attribute-header", root).forEach(function (header) {
      if (header.querySelector('[data-bs-toggle="collapse"], [data-toggle="collapse"]')) {
        return;
      }
      var fallbackToggle =
        header.querySelector("a, button") || header;
      if (
        fallbackToggle &&
        fallbackToggle.getAttribute("data-angel-plusminus-bound") !== "true"
      ) {
        bindPlusMinusToggle(fallbackToggle, root);
      }
    });
  }

  function setFilterPlaceholders(root) {
    qsa('input[type="search"], input[type="text"]', root).forEach(function (input) {
      if (
        input.closest(".attribute-price-body") ||
        input.closest(".attribute-body.attribute-price-body") ||
        input.closest(".form-row") ||
        input.getAttribute("placeholder")
      ) {
        return;
      }
      input.setAttribute("placeholder", "ادخل كلمة البحث");
    });
  }

  function enhanceFilters() {
    var root = getFilterRoot();
    if (!root) {
      return;
    }
    enhanceAccordionIcons(root);
    setFilterPlaceholders(root);
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  whenReady(function () {
    enhanceFilters();
    var root = getFilterRoot();
    if (!root || !window.MutationObserver) {
      return;
    }
    var observer = new MutationObserver(function () {
      enhanceFilters();
    });
    observer.observe(root, { childList: true, subtree: true });
  });

  window.AngelSideFilters = {
    enhance: enhanceFilters,
    enhanceAccordionIcons: enhanceAccordionIcons,
  };
})();
