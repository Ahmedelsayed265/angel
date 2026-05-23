(function () {
  var AUTO_HIDE_MS = 8000;
  var host = null;
  var successEl = null;
  var errorEl = null;
  var hideTimer = null;
  var hideStartedAt = 0;
  var hideDurationMs = AUTO_HIDE_MS;
  var hideRemainingMs = null;
  var lastTrigger = null;

  function labels() {
    return (
      window.angelCartToastLabels || {
        successTitle: "Added to shopping cart",
        errorTitle: "Could not add to cart",
        cartSummary: "You have {count} products in the cart for {total}",
        defaultError: "Failed to add to cart",
        alreadyInCart:
          "This product is already in your cart. Quantity updated.",
        cartUnavailable: "Cart service not available",
        cartUrl: "/cart",
        checkoutUrl: "/checkout",
      }
    );
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function formatSummary(count, total) {
    return labels()
      .cartSummary.replace("{count}", String(count))
      .replace("{total}", String(total || ""));
  }

  function getCartTotalString(cart) {
    if (!cart || !cart.totals || !cart.totals.length) {
      return "";
    }
    var totalItem = cart.totals.filter(function (entry) {
      return entry.code === "total";
    })[0];
    return totalItem ? totalItem.value_string || "" : "";
  }

  function resolveImageUrl(source) {
    if (!source) {
      return "";
    }
    if (typeof source === "string") {
      return source;
    }
    if (source.image) {
      return (
        source.image.medium ||
        source.image.small ||
        source.image.thumbnail ||
        source.image.full_size ||
        ""
      );
    }
    if (source.images && source.images.length) {
      var first = source.images[0];
      return (
        first.medium ||
        first.small ||
        first.thumbnail ||
        first.full_size ||
        (typeof first === "string" ? first : "")
      );
    }
    return source.thumbnail || source.url || "";
  }

  function getAddedItem(response) {
    if (!response) {
      return null;
    }
    return (
      response.item ||
      (response.data && response.data.cart && response.data.cart.product) ||
      (response.data && response.data.item) ||
      null
    );
  }

  function isSuccessResponse(response) {
    if (response === false) {
      return false;
    }
    /* Resolved with no payload — legacy cart API still added the item. */
    if (response == null) {
      return true;
    }
    if (response.error === true || response.status === "error") {
      return false;
    }
    if (response.success === false) {
      return false;
    }
    if (
      response.data &&
      (response.data.error === true || response.data.status === "error")
    ) {
      return false;
    }
    return true;
  }

  function cleanupLegacyPatch() {
    if (
      window.zid &&
      window.zid.cart &&
      window.zid.cart.addProduct &&
      window.zid.cart.addProduct.__angelIsWrapper &&
      window.zid.cart.__angelNativeAddProduct
    ) {
      window.zid.cart.addProduct = window.zid.cart.__angelNativeAddProduct;
    }
  }

  function getErrorStatus(error) {
    if (!error) {
      return null;
    }
    if (error.status != null) {
      return Number(error.status);
    }
    if (error.statusCode != null) {
      return Number(error.statusCode);
    }
    if (error.response && error.response.status != null) {
      return Number(error.response.status);
    }
    if (error.responseData && error.responseData.status != null) {
      return Number(error.responseData.status);
    }
    var msg = String(error.message || "");
    if (/status code 400/i.test(msg)) {
      return 400;
    }
    return null;
  }

  function getResponseStatus(response) {
    if (!response) {
      return null;
    }
    if (response.status != null) {
      return Number(response.status);
    }
    if (response.statusCode != null) {
      return Number(response.statusCode);
    }
    if (response.code != null && !isNaN(Number(response.code))) {
      return Number(response.code);
    }
    if (response.data && response.data.status != null) {
      return Number(response.data.status);
    }
    return null;
  }

  function isDuplicateCartError(error, response) {
    if (getErrorStatus(error) === 400 || getResponseStatus(response) === 400) {
      return true;
    }
    var msg = String(
      (error && error.message) ||
        (error && error.responseData && error.responseData.message) ||
        (error && error.data && error.data.message) ||
        (response && response.message) ||
        (response && response.data && response.data.message) ||
        "",
    ).toLowerCase();
    return /already|duplicate|exists|موجود|مضاف|مكرر|cart\/items/i.test(msg);
  }

  function isAddFailure(response, error) {
    if (isSuccessResponse(response)) {
      return false;
    }
    if (error) {
      return true;
    }
    if (response == null) {
      return false;
    }
    if (
      response.error === true ||
      response.success === false ||
      getResponseStatus(response) === 400
    ) {
      return true;
    }
    return !!(
      response.message &&
      !response.item &&
      !response.cart_items_quantity
    );
  }

  function getFriendlyErrorMessage(response, error) {
    var raw =
      (error && error.responseData && error.responseData.message) ||
      (error && error.message) ||
      (response && response.message) ||
      (response && response.data && response.data.message) ||
      "";

    if (/status code 400/i.test(String(raw))) {
      return labels().alreadyInCart || labels().defaultError;
    }

    if (raw && !/^request failed/i.test(String(raw))) {
      return raw;
    }

    return labels().defaultError;
  }

  function getErrorMessage(response, error) {
    return getFriendlyErrorMessage(response, error);
  }

  function getCartProducts(cart) {
    if (!cart) {
      return [];
    }
    return cart.products || cart.items || cart.cart_products || [];
  }

  function readProductPageQuantity() {
    var stickyQty = document.querySelector(
      "#angel-product-sticky-bar [data-qty-value]",
    );
    if (stickyQty && stickyQty.value) {
      var fromSticky = parseInt(String(stickyQty.value).trim(), 10);
      if (fromSticky > 0) {
        return fromSticky;
      }
    }
    var qtyField =
      document.getElementById("product-quantity") ||
      (document.getElementById("product-form") &&
        document
          .getElementById("product-form")
          .querySelector('[name="quantity"]'));
    if (qtyField && qtyField.value) {
      var fromField = parseInt(String(qtyField.value).trim(), 10);
      if (fromField > 0) {
        return fromField;
      }
    }
    return 1;
  }

  function syncProductFormQuantity(quantity) {
    var qty = Math.max(1, parseInt(quantity, 10) || 1);
    var select = document.getElementById("product-quantity");
    var form = document.getElementById("product-form");
    var sticky = document.querySelector(
      "#angel-product-sticky-bar [data-qty-value]",
    );

    if (select && select.options && select.options.length) {
      var matched = select.querySelector('option[value="' + qty + '"]');
      if (matched) {
        select.value = String(qty);
      } else {
        var last = select.options[select.options.length - 1];
        var maxVal = parseInt(last.value, 10) || qty;
        if (qty > maxVal) {
          qty = maxVal;
        }
        select.value = String(qty);
      }
    }

    if (form) {
      var namedQty = form.elements && form.elements.namedItem("quantity");
      if (namedQty) {
        namedQty.value = String(qty);
      }
    }

    if (sticky) {
      sticky.value = String(qty);
    }

    return qty;
  }

  function productFormNeedsFormId() {
    if (window.bundleCartPayload) {
      return true;
    }
    var form = document.getElementById("product-form");
    if (!form) {
      return false;
    }
    if (form.getAttribute("data-is-bundle") === "true") {
      return true;
    }
    if (form.getAttribute("data-has-custom-fields") === "true") {
      return true;
    }
    return false;
  }

  function enrichAddProductOptions(options) {
    var next = Object.assign({}, options || {});

    if (next.form_id !== "product-form") {
      if (!next.quantity || next.quantity < 1) {
        next.quantity = 1;
      }
      return next;
    }

    var productInput = document.getElementById("product-id");
    if (productInput && productInput.value) {
      next.product_id = productInput.value;
    }

    next.quantity = syncProductFormQuantity(
      next.quantity != null ? next.quantity : readProductPageQuantity(),
    );

    /* Vitrin reads quantity from the form when form_id is set and ignores options.quantity. */
    if (!productFormNeedsFormId()) {
      delete next.form_id;
    }

    return next;
  }

  function resolveCartUrl() {
    var headerCart = document.querySelector("a.a-shopping-cart[href]");
    if (headerCart) {
      var headerHref = headerCart.getAttribute("href");
      if (headerHref) {
        return headerHref;
      }
    }
    return labels().cartUrl || "/cart/view";
  }

  function resolveCheckoutUrl() {
    return labels().checkoutUrl || "/checkout";
  }

  function updateToastNavLinks() {
    if (!host) {
      return;
    }
    var cartLink = qs("[data-angel-cart-toast-cart-link]", host);
    var checkoutLink = qs("[data-angel-cart-toast-checkout]", host);
    if (cartLink) {
      cartLink.setAttribute("href", resolveCartUrl());
    }
    if (checkoutLink) {
      checkoutLink.setAttribute("href", resolveCheckoutUrl());
    }
  }

  function resolveProductIdFromOptions(options, trigger) {
    if (options && options.product_id != null && options.product_id !== "") {
      return String(options.product_id);
    }

    if (trigger) {
      var card = trigger.closest(".angel-product-card, .product-item");
      if (card) {
        var selectedVariant = card.getAttribute("data-selected-variant-id");
        if (selectedVariant) {
          return String(selectedVariant);
        }
        var cardProductId = card.getAttribute("data-product-id");
        if (cardProductId) {
          return String(cardProductId);
        }
      }
    }

    if (options && options.form_id) {
      var input = document.getElementById("product-id");
      if (input && input.value) {
        return String(input.value);
      }
    }

    return "";
  }

  function getLineCatalogIds(line) {
    if (!line) {
      return [];
    }
    var ids = [
      line.product_id,
      line.variant_id,
      line.id,
      line.sku,
      line.product && line.product.id,
      line.product && line.product.product_id,
      line.product &&
        line.product.selected_product &&
        line.product.selected_product.id,
    ];
    return ids
      .filter(function (id) {
        return id != null && id !== "";
      })
      .map(function (id) {
        return String(id);
      });
  }

  function findCartLineByProductId(cart, productId) {
    if (!cart || !productId) {
      return null;
    }
    var target = String(productId);
    var products = getCartProducts(cart);
    var i;
    var line;
    var ids;
    var j;

    for (i = 0; i < products.length; i += 1) {
      line = products[i];
      ids = getLineCatalogIds(line);
      for (j = 0; j < ids.length; j += 1) {
        if (ids[j] === target) {
          return line;
        }
      }
    }

    return null;
  }

  function getCartLineId(line) {
    if (!line) {
      return null;
    }
    if (line.id != null && line.id !== "") {
      return line.id;
    }
    if (line.cart_product_id != null) {
      return line.cart_product_id;
    }
    return null;
  }

  function getUpdateProductApi() {
    if (
      !window.zid ||
      !window.zid.cart ||
      typeof window.zid.cart.updateProduct !== "function"
    ) {
      return null;
    }
    return window.zid.cart.updateProduct;
  }

  function buildSuccessResponse(cart, line) {
    var response = {
      cart_items_quantity:
        (cart && (cart.cart_items_quantity || cart.products_count)) || 0,
    };
    if (line) {
      response.item = line;
    }
    return response;
  }

  function tryUpdateQuantitySilent(line, addQty, config) {
    var updateProduct = getUpdateProductApi();
    var lineId = getCartLineId(line);
    var newQty;
    var payloads;
    var index;

    if (!updateProduct || !lineId) {
      return;
    }

    newQty = (parseInt(line.quantity, 10) || 1) + (parseInt(addQty, 10) || 1);
    payloads = [
      { product_id: lineId, quantity: newQty },
      { id: lineId, quantity: newQty },
    ];

    function attempt(i) {
      if (i >= payloads.length) {
        return;
      }
      updateProduct
        .call(
          window.zid.cart,
          payloads[i],
          Object.assign({}, config || {}, { showErrorNotification: false }),
        )
        .then(function () {
          if (typeof fetchCart === "function") {
            fetchCart();
          }
        })
        .catch(function () {
          attempt(i + 1);
        });
    }

    attempt(0);
  }

  function recoverAlreadyInCart(options, config, trigger) {
    var productId = resolveProductIdFromOptions(options, trigger);

    return fetchCartSnapshot().then(function (cart) {
      if (!cart) {
        return Promise.reject(new Error("cart_unavailable"));
      }

      var line = productId ? findCartLineByProductId(cart, productId) : null;
      var products = getCartProducts(cart);

      if (!line && products.length === 1) {
        line = products[0];
      }

      if (!line && products.length > 0 && productId) {
        line = products[0];
      }

      if (!line && products.length === 0) {
        return Promise.reject(new Error("cart_empty"));
      }

      if (line) {
        tryUpdateQuantitySilent(line, options && options.quantity, config);
      }

      return buildSuccessResponse(cart, line);
    });
  }

  function tryRecoverExistingCartItem(
    options,
    config,
    trigger,
    response,
    error,
  ) {
    var duplicate = isDuplicateCartError(error, response);

    return recoverAlreadyInCart(options, config, trigger)
      .then(function (successResponse) {
        showSuccess(successResponse);
        return successResponse;
      })
      .catch(function () {
        if (!duplicate) {
          return Promise.reject(error || response);
        }
        return fetchCartSnapshot().then(function (cart) {
          if (cart && getCartProducts(cart).length > 0) {
            var fallback = buildSuccessResponse(cart, getCartProducts(cart)[0]);
            showSuccess(fallback);
            return fallback;
          }
          return Promise.reject(error || response);
        });
      })
      .catch(function (fail) {
        showError(getFriendlyErrorMessage(response, fail));
        var failErr = new Error("add_to_cart_failed");
        failErr.__angelToastHandled = true;
        throw failErr;
      });
  }

  function getAddProductApi() {
    if (
      !window.zid ||
      !window.zid.cart ||
      typeof window.zid.cart.addProduct !== "function"
    ) {
      return null;
    }
    var fn = window.zid.cart.addProduct;
    if (fn.__angelIsWrapper && window.zid.cart.__angelNativeAddProduct) {
      return window.zid.cart.__angelNativeAddProduct;
    }
    return fn;
  }

  function getContextFromTrigger(trigger) {
    var context = {};
    if (!trigger) {
      return context;
    }

    var card = trigger.closest(
      ".angel-product-card, .angel-grouped-card, .product-item",
    );
    if (card) {
      var img = card.querySelector(
        ".angel-product-card__img, .angel-grouped-card__media img, .product-card-image img, .angel-grouped-card__img img, img",
      );
      var name = card.querySelector(
        ".angel-grouped-card__title, .product-card-title, .product-title, h3, h4",
      );
      var price = card.querySelector(
        ".angel-grouped-card__price, .product-price, .price, .product-formatted-price",
      );
      if (img) {
        context.image = img.getAttribute("src") || "";
      }
      if (name) {
        context.name = name.textContent.trim();
      }
      if (price) {
        context.price = price.textContent.trim();
      }

      var dataNode = card.querySelector(
        ".angel-product-card__data, .angel-grouped-card__data",
      );
      if (dataNode && dataNode.textContent) {
        try {
          var data = JSON.parse(dataNode.textContent);
          if (
            !context.name &&
            data.selected_product &&
            data.selected_product.name
          ) {
            context.name = data.selected_product.name;
          }
          if (!context.price && data.formatted_sale_price) {
            context.price = data.formatted_sale_price;
          } else if (!context.price && data.formatted_price) {
            context.price = data.formatted_price;
          }
        } catch (error) {
          /* ignore invalid json */
        }
      }
    }

    var productPage = trigger.closest(".angel-product-page, .product-details");
    if (productPage) {
      var pageImg = productPage.querySelector(
        ".angel-product-gallery__img, .angel-product-gallery__main img, .product-images img",
      );
      var pageName = productPage.querySelector(
        ".angel-product-info__title, h1.product-title, .product-title",
      );
      var pagePrice = productPage.querySelector(
        ".angel-product-info__price, .product-formatted-price, .product-price",
      );
      if (pageImg && !context.image) {
        context.image = pageImg.getAttribute("src") || "";
      }
      if (pageName && !context.name) {
        context.name = pageName.textContent.trim();
      }
      if (pagePrice && !context.price) {
        context.price = pagePrice.textContent.trim();
      }
    }

    return context;
  }

  function mergeProductDisplay(item, context) {
    var name =
      (item && (item.name || item.product_name || item.title)) ||
      context.name ||
      "";
    var price =
      (item &&
        (item.price_string ||
          item.formatted_price ||
          item.formatted_sale_price ||
          item.total_string ||
          item.price)) ||
      context.price ||
      "";
    var image = resolveImageUrl(item) || context.image || "";
    return { name: name, price: price, image: image };
  }

  function updateCartBadge(quantity) {
    if (!quantity && quantity !== 0) {
      return;
    }
    qsa(".cart-badge").forEach(function (badge) {
      badge.classList.remove("d-none");
      badge.textContent = quantity;
    });
    if (typeof setCartBadge === "function") {
      setCartBadge(quantity);
    }
    if (typeof setCartTotalAndBadge === "function" && quantity) {
      setCartTotalAndBadge({ cart_items_quantity: quantity });
    }
  }

  function renderThumbs(container, cart) {
    if (!container) {
      return;
    }
    container.innerHTML = "";
    var products =
      (cart && (cart.products || cart.items || cart.cart_products)) || [];
    products.slice(0, 4).forEach(function (product) {
      var src = resolveImageUrl(product);
      if (!src) {
        return;
      }
      var img = document.createElement("img");
      img.className = "angel-cart-toast__thumb";
      img.src = src;
      img.alt = "";
      img.width = 36;
      img.height = 36;
      img.loading = "lazy";
      img.decoding = "async";
      container.appendChild(img);
    });
  }

  function clearHideTimer() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function hide() {
    clearHideTimer();
    hideRemainingMs = null;
    if (!host) {
      return;
    }
    host.hidden = true;
    host.classList.remove("is-visible", "is-paused");
    if (successEl) {
      successEl.hidden = true;
    }
    if (errorEl) {
      errorEl.hidden = true;
    }
  }

  function scheduleHide(delayMs) {
    clearHideTimer();
    hideRemainingMs = null;
    if (host) {
      host.classList.remove("is-paused");
    }
    hideDurationMs = typeof delayMs === "number" ? delayMs : AUTO_HIDE_MS;
    hideStartedAt = Date.now();
    hideTimer = window.setTimeout(hide, hideDurationMs);
  }

  function pauseHideTimer() {
    if (
      !host ||
      host.hidden ||
      !host.classList.contains("is-visible") ||
      hideTimer == null
    ) {
      return;
    }
    var elapsed = Date.now() - hideStartedAt;
    hideRemainingMs = Math.max(0, hideDurationMs - elapsed);
    clearHideTimer();
    host.classList.add("is-paused");
  }

  function resumeHideTimer() {
    if (!host || host.hidden || !host.classList.contains("is-visible")) {
      return;
    }
    if (hideRemainingMs == null) {
      return;
    }
    host.classList.remove("is-paused");
    if (hideRemainingMs <= 0) {
      hideRemainingMs = null;
      hide();
      return;
    }
    scheduleHide(hideRemainingMs);
  }

  function restartProgress(toast) {
    if (!toast) {
      return;
    }
    var progress = toast.querySelector(".angel-cart-toast__progress");
    if (!progress) {
      return;
    }
    progress.style.animation = "none";
    void progress.offsetWidth;
    progress.style.animation = "";
  }

  function showHost(toast) {
    if (!host || !toast) {
      return;
    }
    host.hidden = false;
    host.classList.add("is-visible");
    if (successEl) {
      successEl.hidden = toast !== successEl;
    }
    if (errorEl) {
      errorEl.hidden = toast !== errorEl;
    }
    restartProgress(toast);
    scheduleHide();
  }

  function fetchCartSnapshot() {
    if (!window.zid || !window.zid.cart || !window.zid.cart.get) {
      return Promise.resolve(null);
    }
    return window.zid.cart
      .get({ showErrorNotification: false })
      .catch(function () {
        return null;
      });
  }

  function showSuccess(response) {
    bindUi();
    if (!successEl) {
      return;
    }

    var item = getAddedItem(response);
    var context = getContextFromTrigger(lastTrigger);
    var display = mergeProductDisplay(item, context);

    var nameEl = qs(".angel-cart-toast__product-name", successEl);
    var priceEl = qs(".angel-cart-toast__product-price", successEl);
    var imgEl = qs(".angel-cart-toast__product-img", successEl);
    var summaryEl = qs("[data-angel-cart-toast-summary]", successEl);
    var thumbsEl = qs("[data-angel-cart-toast-thumbs]", successEl);
    var titleEl = qs(".angel-cart-toast__title", successEl);

    if (titleEl) {
      titleEl.textContent = labels().successTitle;
    }
    if (nameEl) {
      nameEl.textContent = display.name;
    }
    if (priceEl) {
      priceEl.textContent = display.price;
    }
    if (imgEl) {
      if (display.image) {
        imgEl.src = display.image;
        imgEl.alt = display.name;
        imgEl.hidden = false;
      } else {
        imgEl.removeAttribute("src");
        imgEl.hidden = true;
      }
    }

    var count = response.cart_items_quantity || 0;
    var total = "";

    if (summaryEl) {
      summaryEl.textContent = formatSummary(count || 1, total);
    }

    showHost(successEl);
    updateToastNavLinks();

    fetchCartSnapshot().then(function (cart) {
      if (cart) {
        count = cart.cart_items_quantity || cart.products_count || count;
        total = getCartTotalString(cart);
        renderThumbs(thumbsEl, cart);
        if (typeof setCartTotalAndBadge === "function") {
          setCartTotalAndBadge(cart);
        }
      } else if (response.cart_items_quantity) {
        updateCartBadge(response.cart_items_quantity);
      }

      if (summaryEl) {
        summaryEl.textContent = formatSummary(count || 1, total);
      }
    });

    if (response.cart_items_quantity) {
      updateCartBadge(response.cart_items_quantity);
    }
    if (typeof fetchCart === "function") {
      fetchCart();
    }
  }

  function showError(message) {
    bindUi();
    if (!errorEl) {
      if (window.zid && window.zid.toaster && window.zid.toaster.showError) {
        window.zid.toaster.showError(message);
      }
      return;
    }

    var titleEl = qs(".angel-cart-toast__title", errorEl);
    var messageEl = qs("[data-angel-cart-toast-error-message]", errorEl);
    if (titleEl) {
      titleEl.textContent = labels().errorTitle;
    }
    if (messageEl) {
      messageEl.textContent = message || labels().defaultError;
    }
    showHost(errorEl);
  }

  function bindUi() {
    host = host || document.getElementById("angel-cart-toast-host");
    successEl =
      successEl || document.getElementById("angel-cart-toast-success");
    errorEl = errorEl || document.getElementById("angel-cart-toast-error");
    if (!host || !successEl || !errorEl) {
      return false;
    }

    updateToastNavLinks();

    if (!host.getAttribute("data-angel-cart-toast-bound")) {
      host.setAttribute("data-angel-cart-toast-bound", "true");
      host.addEventListener("click", function (event) {
        if (event.target.closest("[data-angel-cart-toast-close]")) {
          event.preventDefault();
          hide();
          return;
        }
        if (event.target.closest("[data-angel-cart-toast-continue]")) {
          hide();
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && host && !host.hidden) {
          hide();
        }
      });

      host.addEventListener("mouseenter", pauseHideTimer);
      host.addEventListener("mouseleave", resumeHideTimer);
    }

    return true;
  }

  function runAddToCart(options, config, trigger) {
    if (trigger) {
      lastTrigger = trigger;
    } else if (document.activeElement && document.activeElement.closest) {
      var activeBtn = document.activeElement.closest(
        "[data-product-card-add], .product-card-add-to-cart, .btn-add-to-cart, [data-grouped-qv-add], .angel-product-sticky__add",
      );
      if (activeBtn) {
        lastTrigger = activeBtn;
      }
    }

    var addProduct = getAddProductApi();
    if (!addProduct) {
      showError(labels().cartUnavailable || labels().defaultError);
      return Promise.reject(new Error("Cart unavailable"));
    }

    config = Object.assign({}, config || {}, {
      showErrorNotification: false,
    });

    var activeTrigger = trigger || lastTrigger;
    var addOptions = enrichAddProductOptions(options);

    return addProduct
      .call(window.zid.cart, addOptions, config)
      .then(function (response) {
        if (isSuccessResponse(response)) {
          showSuccess(response);
          return response;
        }
        if (isAddFailure(response, null)) {
          return tryRecoverExistingCartItem(
            addOptions,
            config,
            activeTrigger,
            response,
            null,
          );
        }
        showError(getFriendlyErrorMessage(response, null));
        var failResponseErr = new Error("add_to_cart_failed");
        failResponseErr.__angelToastHandled = true;
        throw failResponseErr;
      })
      .catch(function (error) {
        if (error && error.__angelToastHandled) {
          throw error;
        }
        if (isAddFailure(null, error)) {
          return tryRecoverExistingCartItem(
            addOptions,
            config,
            activeTrigger,
            null,
            error,
          );
        }
        showError(getFriendlyErrorMessage(null, error));
        throw error;
      });
  }

  function init() {
    cleanupLegacyPatch();
    bindUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("load", function () {
    cleanupLegacyPatch();
    bindUi();
  });

  document.addEventListener(
    "click",
    function (event) {
      var addBtn = event.target.closest(
        "[data-product-card-add], .product-card-add-to-cart, .btn-add-to-cart, [data-grouped-qv-add], .angel-product-sticky__add",
      );
      if (addBtn) {
        lastTrigger = addBtn;
      }
    },
    true,
  );

  window.AngelCartToast = {
    addToCart: runAddToCart,
    syncProductFormQuantity: syncProductFormQuantity,
    showSuccess: showSuccess,
    showError: showError,
    hide: hide,
  };
})();
