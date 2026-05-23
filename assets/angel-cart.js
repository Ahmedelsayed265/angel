(function () {
  var qtyUpdateInFlight = {};
  var removeInFlight = {};

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getCartItem(el) {
    if (!el) {
      return null;
    }
    return (
      el.closest(".angel-cart-item") ||
      el.closest(".cart-product-row-wrapper") ||
      el.closest("[data-cart-line-id]")
    );
  }

  function getCartLineId(el) {
    if (!el) {
      return null;
    }
    var item = getCartItem(el);
    var fromEl =
      el.getAttribute("data-cart-line-id") ||
      (item && item.getAttribute("data-cart-line-id"));
    if (fromEl) {
      return String(fromEl);
    }
    return null;
  }

  function getCatalogProductId(el) {
    var item = getCartItem(el);
    if (!item) {
      return null;
    }
    var id = item.getAttribute("data-catalog-product-id");
    return id ? String(id) : null;
  }

  function resolveImageUrl(source) {
    if (!source) {
      return "";
    }
    if (typeof source === "string") {
      return source;
    }
    if (source.image && typeof source.image === "object") {
      return (
        source.image.medium ||
        source.image.small ||
        source.image.thumbnail ||
        source.image.full_size ||
        source.image.url ||
        ""
      );
    }
    if (source.images && source.images.length) {
      var first = source.images[0];
      if (typeof first === "string") {
        return first;
      }
      if (first.image) {
        return (
          first.image.medium ||
          first.image.small ||
          first.image.full_size ||
          first.image.url ||
          ""
        );
      }
      return first.medium || first.small || first.url || "";
    }
    if (source.media && source.media.length) {
      return resolveImageUrl(source.media[0]);
    }
    return (
      source.thumbnail ||
      source.image_url ||
      source.product_image ||
      source.url ||
      source.medium ||
      source.small ||
      ""
    );
  }

  function resolveCartLineImageUrl(line) {
    if (!line) {
      return "";
    }
    var sources = [
      line,
      line.main_image,
      line.product,
      line.product && line.product.main_image,
      line.selected_product,
      line.selected_product && line.selected_product.main_image,
    ];
    var i;
    var url;
    for (i = 0; i < sources.length; i += 1) {
      url = resolveImageUrl(sources[i]);
      if (url) {
        return url;
      }
    }
    if (typeof line.image === "string") {
      return line.image;
    }
    if (typeof line.image_url === "string") {
      return line.image_url;
    }
    if (typeof line.product_image === "string") {
      return line.product_image;
    }
    return "";
  }

  function isPlaceholderImgSrc(src) {
    if (!src) {
      return true;
    }
    return /product-img\.svg/i.test(src);
  }

  function hydrateCartImages(root) {
    root = root || document;
    return fetchCartSnapshot().then(function (cart) {
      if (!cart) {
        return;
      }
      var products = cart.products || cart.items || [];
      products.forEach(function (line) {
        var lineId = line.id != null ? String(line.id) : "";
        if (!lineId) {
          return;
        }
        var item = root.querySelector(
          '.angel-cart-item[data-cart-line-id="' + lineId + '"]',
        );
        if (!item) {
          return;
        }
        var img = item.querySelector("[data-angel-cart-img]");
        if (!img) {
          return;
        }
        var url =
          resolveCartLineImageUrl(line) ||
          img.getAttribute("data-angel-cart-img-url") ||
          "";
        if (!url || isPlaceholderImgSrc(url)) {
          return;
        }
        if (isPlaceholderImgSrc(img.src) || img.src !== url) {
          img.src = url;
          img.setAttribute("data-angel-cart-img-url", url);
        }
      });
    });
  }

  function getRemoveProductFn() {
    if (
      window.zid &&
      window.zid.cart &&
      typeof window.zid.cart.removeProduct === "function"
    ) {
      return function (payload, config) {
        return window.zid.cart.removeProduct(payload, config);
      };
    }
    if (
      window.zid &&
      window.zid.store &&
      window.zid.store.cart &&
      typeof window.zid.store.cart.removeProduct === "function"
    ) {
      return function (payload) {
        var lineId = payload.product_id || payload.id;
        return window.zid.store.cart.removeProduct(
          lineId,
          payload.catalog_product_id,
        );
      };
    }
    return null;
  }

  function getUpdateProductFn() {
    if (
      window.zid &&
      window.zid.cart &&
      typeof window.zid.cart.updateProduct === "function"
    ) {
      return function (payload, config) {
        return window.zid.cart.updateProduct(payload, config);
      };
    }
    if (
      window.zid &&
      window.zid.store &&
      window.zid.store.cart &&
      typeof window.zid.store.cart.updateProduct === "function"
    ) {
      return function (payload) {
        var lineId = payload.product_id || payload.id;
        return window.zid.store.cart.updateProduct(
          lineId,
          payload.quantity,
          payload.catalog_product_id,
        );
      };
    }
    return null;
  }

  function normalizeCartUpdateResponse(res) {
    if (!res) {
      return { cart: null, html: null };
    }
    var data = res.data || res;
    var cart =
      data.cart ||
      res.cart ||
      (data.products || data.items ? data : null) ||
      (res.products || res.items ? res : null);
    var html =
      data.products_list_html ||
      data.cart_products_html ||
      data.template_for_cart_products_list ||
      res.products_list_html ||
      res.cart_products_html ||
      res.template_for_cart_products_list ||
      data.html ||
      res.html;

    if (html && typeof html === "object") {
      html =
        html.products_list ||
        html.cart_products ||
        html.template_for_cart_products_list ||
        null;
    }

    return { cart: cart, html: html };
  }

  function getCurrentListHtml() {
    var listEl = document.querySelector(".template_for_cart_products_list");
    return listEl ? listEl.innerHTML : "";
  }

  function syncLineTotalsDisplay(cart) {
    var products = (cart && (cart.products || cart.items)) || [];
    products.forEach(function (line) {
      var lineId = line.id != null ? String(line.id) : "";
      if (!lineId) {
        return;
      }
      var item = document.querySelector(
        '.angel-cart-item[data-cart-line-id="' + lineId + '"]',
      );
      if (!item) {
        return;
      }
      var totalEl = item.querySelector(".angel-cart-item__total-value.totals");
      if (totalEl) {
        totalEl.textContent =
          line.total_string ||
          line.formatted_total ||
          line.price_string ||
          totalEl.textContent;
      }
      var select = item.querySelector(".cart-product-quantity-dropdown select");
      if (select && line.quantity != null && String(select.value) !== String(line.quantity)) {
        select.value = String(line.quantity);
        select.setAttribute("data-angel-qty-last", String(line.quantity));
      }
    });
  }

  function pruneRemovedItems(cart) {
    var products = (cart && (cart.products || cart.items)) || [];
    var ids = products.map(function (line) {
      return line.id != null ? String(line.id) : "";
    });
    qsa(".angel-cart-item").forEach(function (item) {
      var lineId = item.getAttribute("data-cart-line-id");
      if (lineId && ids.indexOf(String(lineId)) === -1) {
        item.remove();
      }
    });
  }

  function applyCartUpdate(cart) {
    if (!cart) {
      return;
    }

    pruneRemovedItems(cart);
    syncLineTotalsDisplay(cart);

    if (typeof window.cartProductsHtmlChanged === "function") {
      var hasProducts =
        (cart.products_count != null && cart.products_count > 0) ||
        ((cart.products || cart.items || []).length > 0);
      window.cartProductsHtmlChanged(
        hasProducts ? getCurrentListHtml() : "",
        cart,
        { keepListHtml: !!hasProducts },
      );
      return;
    }

    if (typeof setCartTotalAndBadge === "function") {
      setCartTotalAndBadge(cart);
    }
  }

  function fetchCartSnapshot() {
    if (!window.zid || !window.zid.cart || typeof window.zid.cart.get !== "function") {
      return Promise.resolve(null);
    }
    return window.zid.cart
      .get({ showErrorNotification: false })
      .then(function (res) {
        var cart = (res && (res.cart || res.data)) || res;
        return cart && (cart.products || cart.items || cart.id != null) ? cart : null;
      })
      .catch(function () {
        return null;
      });
  }

  function tryApiPayloads(fn, payloads, config) {
    var index = 0;
    function attempt() {
      if (index >= payloads.length) {
        return Promise.reject(new Error("cart_api_failed"));
      }
      var payload = payloads[index];
      index += 1;
      return fn(payload, config).catch(function (err) {
        if (index >= payloads.length) {
          throw err;
        }
        return attempt();
      });
    }
    return attempt();
  }

  function resolveCartAfterMutation(res) {
    var parsed = normalizeCartUpdateResponse(res);
    if (parsed.cart) {
      return Promise.resolve(parsed.cart);
    }
    return fetchCartSnapshot();
  }

  function setLineUpdating(item, isUpdating) {
    if (!item) {
      return;
    }
    item.classList.toggle("angel-cart-item--updating", !!isUpdating);
  }

  function showDeleteProgress(link) {
    if (!link) {
      return;
    }
    var icon = link.querySelector(".icon-delete");
    var prefix = link.querySelector(".prefix");
    if (icon) {
      icon.classList.add("d-none");
    }
    if (prefix) {
      prefix.classList.remove("d-none");
    }
  }

  function hideDeleteProgress(link) {
    if (!link) {
      return;
    }
    var icon = link.querySelector(".icon-delete");
    var prefix = link.querySelector(".prefix");
    if (icon) {
      icon.classList.remove("d-none");
    }
    if (prefix) {
      prefix.classList.add("d-none");
    }
  }

  function removeCartLine(lineId, triggerEl) {
    var removeProduct = getRemoveProductFn();
    if (!removeProduct || !lineId) {
      return Promise.resolve();
    }

    if (removeInFlight[lineId]) {
      return removeInFlight[lineId];
    }

    var item = getCartItem(triggerEl);
    var catalogId = getCatalogProductId(triggerEl);
    setLineUpdating(item, true);

    var payloads = [
      { product_id: lineId },
      { id: lineId },
    ];
    if (catalogId) {
      payloads.push({ product_id: lineId, catalog_product_id: catalogId });
    }

    removeInFlight[lineId] = tryApiPayloads(removeProduct, payloads, {
      showErrorNotification: true,
    })
      .then(resolveCartAfterMutation)
      .then(function (cart) {
        if (cart) {
          applyCartUpdate(cart);
        }
      })
      .catch(function () {
        /* Zid shows error notification. */
      })
      .finally(function () {
        setLineUpdating(item, false);
        delete removeInFlight[lineId];
        if (triggerEl) {
          hideDeleteProgress(triggerEl);
        }
      });

    return removeInFlight[lineId];
  }

  function submitQuantityChange(select) {
    var updateProduct = getUpdateProductFn();
    var lineId = getCartLineId(select);
    var quantity = parseInt(select.value, 10);
    var item = getCartItem(select);
    var catalogId = getCatalogProductId(select);

    if (!updateProduct || !lineId || !quantity || quantity < 1) {
      return Promise.resolve();
    }

    if (qtyUpdateInFlight[lineId]) {
      return qtyUpdateInFlight[lineId];
    }

    var previousValue =
      select.getAttribute("data-angel-qty-last") || String(select.value);
    setLineUpdating(item, true);

    var payloads = [
      { product_id: lineId, quantity: quantity },
      { id: lineId, quantity: quantity },
    ];
    if (catalogId) {
      payloads.push({
        product_id: lineId,
        quantity: quantity,
        catalog_product_id: catalogId,
      });
    }

    qtyUpdateInFlight[lineId] = tryApiPayloads(updateProduct, payloads, {
      showErrorNotification: true,
    })
      .then(resolveCartAfterMutation)
      .then(function (cart) {
        if (!cart) {
          select.value = previousValue;
          return null;
        }
        applyCartUpdate(cart);
        select.setAttribute("data-angel-qty-last", String(select.value));
        return cart;
      })
      .catch(function () {
        select.value = previousValue;
      })
      .finally(function () {
        setLineUpdating(item, false);
        delete qtyUpdateInFlight[lineId];
      });

    return qtyUpdateInFlight[lineId];
  }

  function bindCartActions(root) {
    var page = qs(".angel-cart-page", root);
    if (!page || page.getAttribute("data-angel-cart-actions-bound")) {
      return;
    }
    page.setAttribute("data-angel-cart-actions-bound", "true");

    page.addEventListener("click", function (event) {
      var deleteLink = event.target.closest(".cart-product-delete a");
      if (!deleteLink || !page.contains(deleteLink)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      var lineId = getCartLineId(deleteLink);
      if (!lineId) {
        return;
      }

      showDeleteProgress(deleteLink);
      removeCartLine(lineId, deleteLink);
    });
  }

  function bindQtySteppers(root) {
    qsa("[data-angel-cart-qty]", root).forEach(function (wrap) {
      if (wrap.getAttribute("data-angel-qty-bound")) {
        return;
      }
      wrap.setAttribute("data-angel-qty-bound", "true");
      var select = wrap.querySelector("select");
      var minus = wrap.querySelector("[data-angel-cart-qty-minus]");
      var plus = wrap.querySelector("[data-angel-cart-qty-plus]");
      if (!select) {
        return;
      }

      select.setAttribute("data-angel-qty-last", select.value);

      select.addEventListener("change", function (event) {
        event.stopPropagation();
        submitQuantityChange(select);
      });

      minus?.addEventListener("click", function (e) {
        e.preventDefault();
        if (select.selectedIndex <= 0) {
          return;
        }
        select.selectedIndex -= 1;
        submitQuantityChange(select);
      });

      plus?.addEventListener("click", function (e) {
        e.preventDefault();
        if (select.selectedIndex >= select.options.length - 1) {
          return;
        }
        select.selectedIndex += 1;
        submitQuantityChange(select);
      });
    });
  }

  function initWishlistStates(root) {
    if (typeof fillWishlistItems !== "function") {
      return;
    }
    var ids = [];
    qsa(
      ".angel-cart-page .add-to-wishlist[data-wishlist-id], .angel-cart-recommendations .add-to-wishlist[data-wishlist-id]",
      root,
    ).forEach(function (wrap) {
        var id = wrap.getAttribute("data-wishlist-id");
        if (id) {
          ids.push({ id: id });
        }
      },
    );
    if (ids.length) {
      fillWishlistItems(ids);
    }
  }

  function enhanceCartList(root) {
    root = root || document;
    bindCartActions(root);
    bindQtySteppers(root);
    initWishlistStates(root);
    hydrateCartImages(root);

    if (window.AngelProductCard && typeof window.AngelProductCard.init === "function") {
      var rec = qs("#angel-cart-recommendations-grid", root);
      if (rec) {
        window.AngelProductCard.init(rec);
      }
    }
    if (
      window.AngelProductPage &&
      typeof window.AngelProductPage.bindGroupedQuickViewTriggers === "function"
    ) {
      window.AngelProductPage.bindGroupedQuickViewTriggers(root);
    }
    if (window.bundleOffersLoader && typeof window.bundleOffersLoader.reload === "function") {
      window.bundleOffersLoader.reload();
    }
  }

  function mountRecommendationCards(cards) {
    var section = document.getElementById("angel-cart-recommendations");
    var grid = document.getElementById("angel-cart-recommendations-grid");
    if (!section || !grid) {
      return;
    }

    if (!cards || !cards.length) {
      section.hidden = true;
      return;
    }

    grid.innerHTML = "";
    Array.prototype.forEach.call(cards, function (card, index) {
      if (index >= 12) {
        return;
      }
      var node = card.closest(".prod-col") || card;
      grid.appendChild(document.importNode(node, true));
    });

    section.hidden = false;
    enhanceCartList(section);
  }

  function extractProductCardsFromHtml(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var list = doc.getElementById("products-list");
    if (!list) {
      return [];
    }

    var cards = list.querySelectorAll(".product-item.angel-product-card");
    if (cards.length) {
      return Array.prototype.slice.call(cards);
    }

    cards = list.querySelectorAll(".product-item");
    if (cards.length) {
      return Array.prototype.slice.call(cards);
    }

    return Array.prototype.slice.call(list.children);
  }

  function loadRecommendationsFromProductsPage() {
    return fetch("/products", {
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("products_page_unavailable");
        }
        return response.text();
      })
      .then(function (html) {
        var cards = extractProductCardsFromHtml(html);
        if (!cards.length) {
          throw new Error("products_cards_missing");
        }
        mountRecommendationCards(cards);
      });
  }

  function loadRecommendations() {
    var section = document.getElementById("angel-cart-recommendations");
    var grid = document.getElementById("angel-cart-recommendations-grid");
    if (!section || !grid) {
      return;
    }

    if (grid.querySelector(".angel-product-card, .product-item")) {
      section.hidden = false;
      enhanceCartList(section);
      if (window.AngelProductCard && typeof window.AngelProductCard.init === "function") {
        window.AngelProductCard.init(grid);
      }
      return;
    }

    loadRecommendationsFromProductsPage().catch(function () {
      section.hidden = true;
    });
  }

  function init() {
    if (!document.querySelector(".angel-cart-page")) {
      return;
    }
    enhanceCartList(document);
    loadRecommendations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AngelCartPage = {
    enhance: enhanceCartList,
    loadRecommendations: loadRecommendations,
    updateQuantity: submitQuantityChange,
    removeLine: removeCartLine,
  };
})();
