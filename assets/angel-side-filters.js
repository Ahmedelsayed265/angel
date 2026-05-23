(function () {
  var enhanceTimer = null;

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getFilterRoot() {
    return (
      document.getElementById("angel-category-filters") ||
      document.querySelector(".angel-side-filters")
    );
  }

  function getFilterDrawer() {
    return document.querySelector(".angel-category-page__sidebar[data-angel-filter-drawer]");
  }

  function revealMobileFilterMarkup(root) {
    if (!root) {
      return;
    }

    var drawer = root.closest(".angel-category-page__sidebar");
    if (!drawer) {
      return;
    }

    qsa(
      ".product-attributes, .products-filters-container, .filter-content, .attribute, .attribute-group",
      root,
    ).forEach(function (el) {
      el.classList.remove("d-none");
      el.hidden = false;
      el.removeAttribute("hidden");
      el.style.removeProperty("display");
      el.style.removeProperty("visibility");
      el.style.removeProperty("opacity");
    });
  }

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
  }

  function resolveCollapsePanel(toggle, header, root) {
    var scope = root || document;
    var targetSel =
      toggle.getAttribute("data-bs-target") ||
      toggle.getAttribute("data-target") ||
      toggle.getAttribute("href");

    if (targetSel && targetSel !== "#") {
      var byId = scope.querySelector(targetSel) || document.querySelector(targetSel);
      if (byId) {
        return byId;
      }
    }

    var card = (header || toggle).closest(".attribute");
    if (!card) {
      return null;
    }

    return (
      card.querySelector(":scope > .collapse") ||
      card.querySelector(":scope > .attribute-body.collapse") ||
      card.querySelector(":scope > .attribute-body")
    );
  }

  function linkToggleToPanel(toggle, panel) {
    if (!toggle || !panel) {
      return;
    }

    if (!panel.classList.contains("collapse")) {
      panel.classList.add("collapse");
    }

    if (!panel.id) {
      panel.id =
        "angel-filter-" +
        Math.random().toString(36).slice(2, 10) +
        "-" +
        Date.now().toString(36);
    }

    var hash = "#" + panel.id;
    toggle.setAttribute("data-bs-target", hash);
    toggle.setAttribute("data-target", hash);
    if (
      toggle.tagName === "A" &&
      (!toggle.getAttribute("href") || toggle.getAttribute("href").charAt(0) === "#")
    ) {
      toggle.setAttribute("href", hash);
    }
    if (!toggle.getAttribute("data-bs-toggle")) {
      toggle.setAttribute("data-bs-toggle", "collapse");
    }
  }

  function isPanelOpen(toggle, panel) {
    if (panel && panel.classList.contains("show")) {
      return true;
    }
    if (toggle.getAttribute("aria-expanded") === "true") {
      return true;
    }
    return toggle.classList.contains("collapsed") === false;
  }

  function syncPlusMinusIcon(toggle, icon, panel) {
    icon.classList.toggle(
      "s-filters-widget-plusminus-active",
      isPanelOpen(toggle, panel),
    );
  }

  function hideDefaultCollapseIcons(scope) {
    if (!scope) {
      return;
    }
    qsa("i, svg, img, .fa, .icon, .collapse-icon", scope).forEach(function (el) {
      if (!el.classList.contains("s-filters-widget-plusminus")) {
        el.hidden = true;
        el.style.display = "none";
      }
    });
  }

  function placeIconBesideTitle(header, toggle, icon) {
    if (!icon) {
      return icon;
    }

    var title =
      (header && header.querySelector(".attribute-label")) ||
      (header && header.querySelector("h2, h3, h4, h5, h6")) ||
      null;

    if (title) {
      if (toggle && toggle.contains(title)) {
        if (title.nextElementSibling !== icon) {
          title.insertAdjacentElement("afterend", icon);
        }
      } else if (header && title.parentNode === header) {
        if (title.nextElementSibling !== icon) {
          title.insertAdjacentElement("afterend", icon);
        }
      }
    } else if (toggle && !toggle.contains(icon)) {
      toggle.appendChild(icon);
    }

    return icon;
  }

  function ensurePlusMinusIcon(header, toggle) {
    var icon =
      (header && header.querySelector(".s-filters-widget-plusminus")) ||
      (toggle && toggle.querySelector(".s-filters-widget-plusminus"));

    if (!icon) {
      icon = document.createElement("span");
      icon.className = "s-filters-widget-plusminus";
      icon.setAttribute("aria-hidden", "true");
    }

    hideDefaultCollapseIcons(toggle);
    if (header) {
      hideDefaultCollapseIcons(header);
    }

    return placeIconBesideTitle(header, toggle, icon);
  }

  function bindPlusMinusToggle(toggle, root, existingIcon) {
    var header = toggle.closest(".attribute-header");
    var panel = resolveCollapsePanel(toggle, header, root);

    if (panel) {
      linkToggleToPanel(toggle, panel);
    }

    var icon = existingIcon || ensurePlusMinusIcon(header, toggle);
    var boundKey = "data-angel-plusminus-bound";

    function sync() {
      panel = resolveCollapsePanel(toggle, header, root);
      syncPlusMinusIcon(toggle, icon, panel);
    }

    sync();

    if (toggle.getAttribute(boundKey) === "true") {
      return;
    }
    toggle.setAttribute(boundKey, "true");

    toggle.addEventListener("click", function () {
      window.setTimeout(sync, 0);
      window.setTimeout(sync, 350);
    });

    if (panel) {
      panel.addEventListener("shown.bs.collapse", sync);
      panel.addEventListener("hidden.bs.collapse", sync);
    }
  }

  function initAccordion(root) {
    if (!root) {
      return;
    }

    migrateBootstrapAttributes(root);

    var toggles = qsa(
      '.attribute-header [data-bs-toggle="collapse"], .attribute-header [data-toggle="collapse"], .attribute-header a[data-bs-target], .attribute-header a[data-target]',
      root,
    );

    qsa(".attribute-header", root).forEach(function (header) {
      var toggle = header.querySelector(
        '[data-bs-toggle="collapse"], [data-toggle="collapse"], a[data-bs-target], a[data-target]',
      );
      if (!toggle) {
        toggle = header.querySelector("a, button");
      }
      if (toggle && toggles.indexOf(toggle) === -1) {
        toggles.push(toggle);
      }
    });

    var bs = window.bootstrap;
    var useBootstrap = !!(bs && bs.Collapse);

    toggles.forEach(function (toggle) {
      var header = toggle.closest(".attribute-header");
      var panel = resolveCollapsePanel(toggle, header, root);
      if (!panel) {
        return;
      }

      linkToggleToPanel(toggle, panel);

      var open = panel.classList.contains("show");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("collapsed", !open);

      if (toggle.getAttribute("data-angel-collapse-bound") === "true") {
        return;
      }
      toggle.setAttribute("data-angel-collapse-bound", "true");

      toggle.addEventListener("click", function (e) {
        panel = resolveCollapsePanel(toggle, header, root);
        if (!panel) {
          return;
        }

        linkToggleToPanel(toggle, panel);

        if (useBootstrap) {
          try {
            var instance = bs.Collapse.getOrCreateInstance(panel, { toggle: false });
            instance.toggle();
            e.preventDefault();
            return;
          } catch (err) {
            /* fall through to manual toggle */
          }
        }

        e.preventDefault();
        var willOpen = !panel.classList.contains("show");
        panel.classList.toggle("show", willOpen);
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
        toggle.classList.toggle("collapsed", !willOpen);

        var icon =
          (header && header.querySelector(".s-filters-widget-plusminus")) ||
          toggle.querySelector(".s-filters-widget-plusminus");
        if (icon) {
          syncPlusMinusIcon(toggle, icon, panel);
        }
      });
    });

    if (useBootstrap) {
      qsa(".collapse, .attribute-body.collapse", root).forEach(function (panel) {
        if (!bs.Collapse.getInstance(panel)) {
          try {
            new bs.Collapse(panel, { toggle: false });
          } catch (err2) {
            /* manual handler above is enough */
          }
        }
      });
    }
  }

  function enhanceAccordionIcons(root) {
    if (!root) {
      return;
    }

    qsa(".attribute-header", root).forEach(function (header) {
      var toggle = header.querySelector(
        '[data-bs-toggle="collapse"], [data-toggle="collapse"], a[data-bs-target], a[data-target]',
      );
      if (!toggle) {
        toggle = header.querySelector("a, button");
      }
      if (!toggle) {
        return;
      }

      var icon = ensurePlusMinusIcon(header, toggle);
      bindPlusMinusToggle(toggle, root, icon);
    });
  }

  function stripWrapperStyles(root) {
    if (!root) {
      return;
    }

    var panel = root.closest(".angel-side-filters-panel__inner");
    var scope = panel || root;

    qsa(
      ".product-attributes, .products-filters-container, .angel-category-filters",
      scope,
    ).forEach(function (el) {
      if (el.classList.contains("attribute")) {
        return;
      }
      el.style.setProperty("background", "transparent", "important");
      el.style.setProperty("background-color", "transparent", "important");
      el.style.setProperty("padding", "0", "important");
      el.style.setProperty("border", "none", "important");
      el.style.setProperty("border-radius", "0", "important");
      el.style.setProperty("box-shadow", "none", "important");
    });

    if (
      root.id === "angel-category-filters" ||
      root.classList.contains("angel-side-filters")
    ) {
      root.style.setProperty("background", "transparent", "important");
      root.style.setProperty("padding", "0", "important");
    }
  }

  function splitCombinedAttributeSections(root) {
    if (!root || root.getAttribute("data-angel-cards-split") === "true") {
      return;
    }

    var split = false;

    qsa(".attribute", root).forEach(function (attr) {
      var headers = qsa(":scope > .attribute-header", attr);
      if (headers.length < 2) {
        return;
      }

      var fragment = document.createDocumentFragment();

      headers.forEach(function (header) {
        var card = document.createElement("div");
        card.className = "attribute angel-side-filters__card";

        card.appendChild(header);

        var sibling = header.nextElementSibling;
        while (sibling && !sibling.classList.contains("attribute-header")) {
          var next = sibling.nextElementSibling;
          card.appendChild(sibling);
          sibling = next;
        }

        fragment.appendChild(card);
      });

      if (fragment.childNodes.length) {
        attr.replaceWith(fragment);
        split = true;
      }
    });

    if (split) {
      root.setAttribute("data-angel-cards-split", "true");
      qsa("[data-angel-collapse-bound]", root).forEach(function (el) {
        el.removeAttribute("data-angel-collapse-bound");
      });
      qsa("[data-angel-plusminus-bound]", root).forEach(function (el) {
        el.removeAttribute("data-angel-plusminus-bound");
      });
    }
  }

  function markFilterCards(root) {
    qsa(".attribute", root).forEach(function (attr) {
      attr.classList.add("angel-side-filters__card");
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
    revealMobileFilterMarkup(root);
    stripWrapperStyles(root);
    splitCombinedAttributeSections(root);
    markFilterCards(root);
    stripWrapperStyles(root);
    initAccordion(root);
    enhanceAccordionIcons(root);
    setFilterPlaceholders(root);
    revealMobileFilterMarkup(root);
  }

  function prepareMobileDrawer() {
    enhanceFilters();
    window.setTimeout(enhanceFilters, 120);
    window.setTimeout(enhanceFilters, 450);
  }

  function initMobileFilterDrawer() {
    var drawer = getFilterDrawer();
    if (!drawer || drawer.getAttribute("data-angel-filter-drawer-bound") === "true") {
      return;
    }
    drawer.setAttribute("data-angel-filter-drawer-bound", "true");

    var backdrop = document.querySelector(".angel-category-page__sidebar-backdrop");
    var page = drawer.closest(".angel-category-page");

    function setOpen(open) {
      drawer.classList.toggle("is-open", open);
      if (backdrop) {
        backdrop.hidden = !open;
      }
      document.body.classList.toggle("angel-category-filter-open", open);
      if (page) {
        qsa("[data-angel-category-filter-toggle]", page).forEach(function (btn) {
          btn.setAttribute("aria-expanded", open ? "true" : "false");
        });
      }
      if (open) {
        prepareMobileDrawer();
      }
    }

    var clickRoot = page || document;
    clickRoot.addEventListener("click", function (event) {
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
      if (event.key === "Escape" && drawer.classList.contains("is-open")) {
        setOpen(false);
      }
    });
  }

  function scheduleEnhance() {
    if (enhanceTimer) {
      window.clearTimeout(enhanceTimer);
    }
    enhanceTimer = window.setTimeout(enhanceFilters, 40);
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  whenReady(function () {
    initMobileFilterDrawer();
    enhanceFilters();
    var root = getFilterRoot();
    if (!root || !window.MutationObserver) {
      return;
    }
    var observer = new MutationObserver(function () {
      scheduleEnhance();
    });
    observer.observe(root, { childList: true, subtree: true });
  });

  window.AngelSideFilters = {
    enhance: enhanceFilters,
    enhanceAccordionIcons: enhanceAccordionIcons,
    initAccordion: initAccordion,
    prepareMobileDrawer: prepareMobileDrawer,
    initMobileFilterDrawer: initMobileFilterDrawer,
  };
})();
