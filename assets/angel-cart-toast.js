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

  function isArabicStore() {
    var lang = String(
      window.angelStoreLang ||
        document.documentElement.getAttribute("lang") ||
        "",
    )
      .toLowerCase()
      .split(/[-_]/)[0];
    if (lang === "ar") {
      return true;
    }
    var dir = String(
      window.appDirection || document.documentElement.getAttribute("dir") || "",
    ).toLowerCase();
    return dir === "rtl";
  }

  function defaultLabels() {
    if (isArabicStore()) {
      return {
        successTitle: "تمت الإضافة إلى سلة المشتريات",
        errorTitle: "تعذر الإضافة إلى السلة",
        cartSummary: "لديك {count} منتجات في السلة بـ {total}",
        defaultError: "فشل في إضافة المنتج للسلة",
        chooseOptions: "يجب اختيار المتغيرات أولاً",
        chooseOptionNamed: "يرجى اختيار {name} قبل الإضافة إلى السلة",
        alreadyInCart: "المنتج موجود في السلة — تم تحديث الكمية",
        cartUnavailable: "خدمة السلة غير متوفرة",
        cartUrl: "/cart",
        checkoutUrl: "/checkout",
      };
    }

    return {
      successTitle: "Added to shopping cart",
      errorTitle: "Could not add to cart",
      cartSummary: "You have {count} products in the cart for {total}",
      defaultError: "Failed to add to cart",
      chooseOptions: "Please choose product options first",
      chooseOptionNamed: "Please choose {name} before adding to cart",
      alreadyInCart: "This product is already in your cart. Quantity updated.",
      cartUnavailable: "Cart service not available",
      cartUrl: "/cart",
      checkoutUrl: "/checkout",
    };
  }

  function labels() {
    return Object.assign(
      {},
      defaultLabels(),
      window.angelCartToastLabels || {},
    );
  }

  function isVariantRelatedApiMessage(text) {
    return /option|variant|attribute|required|select|choose|خيار|متغير|اختر|اللون|الحجم/i.test(
      String(text || ""),
    );
  }

  function shouldPreferLocalizedVariantError(response, error, extractedText) {
    if (!isArabicStore()) {
      return false;
    }
    if (!extractedText) {
      return true;
    }
    if (/[\u0600-\u06FF]/.test(extractedText)) {
      return false;
    }
    if (isVariantRelatedApiMessage(extractedText)) {
      return true;
    }
    return getResponseStatus(response) === 400 || getErrorStatus(error) === 400;
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

  function getZidCartImageFromEntry(entry) {
    if (!entry) {
      return "";
    }
    if (typeof entry === "string") {
      return entry;
    }
    if (entry.thumbs) {
      return (
        entry.thumbs.medium ||
        entry.thumbs.small ||
        entry.thumbs.thumbnail ||
        entry.thumbs.large ||
        entry.thumbs.fullSize ||
        ""
      );
    }
    if (entry.origin) {
      return entry.origin;
    }
    return "";
  }

  function getZidItemImageUrl(item) {
    if (!item) {
      return "";
    }
    if (item.images && item.images.length) {
      var fromImages = getZidCartImageFromEntry(item.images[0]);
      if (fromImages) {
        return fromImages;
      }
    }
    if (typeof item.image === "string") {
      return item.image;
    }
    if (typeof item.image_url === "string") {
      return item.image_url;
    }
    if (item.main_image && item.main_image.image) {
      var zidImage = item.main_image.image;
      return (
        zidImage.medium ||
        zidImage.small ||
        zidImage.thumbnail ||
        zidImage.full_size ||
        ""
      );
    }
    return "";
  }

  function getTriggerImageUrl(trigger) {
    if (!trigger) {
      return "";
    }
    var card = trigger.closest(
      ".angel-product-card, .angel-grouped-card, .product-item",
    );
    if (card) {
      var cardImg = card.querySelector(".angel-grouped-card__img");
      return cardImg ? cardImg.getAttribute("src") || "" : "";
    }
    var pageImg = document.querySelector(
      ".angel-product-page .angel-product-gallery__img",
    );
    return pageImg ? pageImg.getAttribute("src") || "" : "";
  }

  function findCartLineForItem(cart, item) {
    if (!cart || !item) {
      return null;
    }
    var keys = [item.id, item.product_id, item.parent_id];
    var i;
    var line;
    for (i = 0; i < keys.length; i += 1) {
      if (keys[i] == null || keys[i] === "") {
        continue;
      }
      line = findCartLineByProductId(cart, keys[i]);
      if (line) {
        return line;
      }
    }
    return null;
  }

  function resolveToastImageUrl(item, trigger, cart) {
    var imageUrl = getZidItemImageUrl(item);
    if (imageUrl) {
      return imageUrl;
    }
    if (cart && item) {
      imageUrl = getZidItemImageUrl(findCartLineForItem(cart, item));
      if (imageUrl) {
        return imageUrl;
      }
    }
    return getTriggerImageUrl(trigger);
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

  function extractErrorText(value, depth) {
    depth = depth || 0;
    if (value == null || depth > 6) {
      return "";
    }

    if (typeof value === "string") {
      var text = value.trim();
      if (!text || text === "[object Object]") {
        return "";
      }
      return text;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (Array.isArray(value)) {
      var parts = [];
      for (var i = 0; i < value.length; i += 1) {
        var itemText = extractErrorText(value[i], depth + 1);
        if (itemText) {
          parts.push(itemText);
        }
      }
      return parts.join(" ");
    }

    if (typeof value !== "object") {
      return "";
    }

    var preferredKeys = [
      "description",
      "message",
      "detail",
      "details",
      "error",
      "title",
      "msg",
      "ar",
      "en",
    ];
    var k;
    for (k = 0; k < preferredKeys.length; k += 1) {
      var fromKey = extractErrorText(value[preferredKeys[k]], depth + 1);
      if (fromKey) {
        return fromKey;
      }
    }

    if (value.errors && typeof value.errors === "object") {
      var errorParts = [];
      Object.keys(value.errors).forEach(function (field) {
        var fieldText = extractErrorText(value.errors[field], depth + 1);
        if (fieldText) {
          errorParts.push(fieldText);
        }
      });
      if (errorParts.length) {
        return errorParts.join(" ");
      }
    }

    return "";
  }

  function collectErrorCandidates(response, error) {
    var candidates = [];
    if (error) {
      candidates.push(
        error.responseData && error.responseData.message,
        error.responseData,
        error.data && error.data.message,
        error.data,
        error.response && error.response.data,
        error.message,
        error,
      );
    }
    if (response) {
      candidates.push(
        response.message,
        response.error,
        response.errors,
        response.data && response.data.message,
        response.data && response.data.error,
        response.data && response.data.errors,
        response.data,
      );
    }
    return candidates;
  }

  function getFriendlyErrorMessage(response, error) {
    if (isDuplicateCartError(error, response)) {
      return labels().alreadyInCart || labels().defaultError;
    }

    var candidates = collectErrorCandidates(response, error);
    var i;
    var bestText = "";
    for (i = 0; i < candidates.length; i += 1) {
      var text = extractErrorText(candidates[i]);
      if (
        text &&
        !/^request failed/i.test(text) &&
        !/status code 400/i.test(text)
      ) {
        bestText = text;
        break;
      }
    }

    if (shouldPreferLocalizedVariantError(response, error, bestText)) {
      return labels().chooseOptions || labels().defaultError;
    }

    if (bestText) {
      return bestText;
    }

    if (getResponseStatus(response) === 400 || getErrorStatus(error) === 400) {
      return labels().chooseOptions || labels().defaultError;
    }

    return labels().defaultError;
  }

  function getProductCardDataFromNode(card) {
    if (!card) {
      return null;
    }
    var dataNode = card.querySelector(
      ".angel-product-card__data, .angel-grouped-card__data",
    );
    if (!dataNode || !dataNode.textContent) {
      return null;
    }
    try {
      return JSON.parse(dataNode.textContent);
    } catch (parseError) {
      return null;
    }
  }

  function getCardSelections(card) {
    if (!card) {
      return {};
    }
    try {
      return JSON.parse(card.getAttribute("data-option-selections") || "{}");
    } catch (parseError) {
      return {};
    }
  }

  function validateProductCardAdd(trigger) {
    var card =
      trigger &&
      trigger.closest &&
      trigger.closest(".angel-product-card, .product-item");
    if (!card || card.getAttribute("data-needs-options") !== "true") {
      return null;
    }

    var selectedId = card.getAttribute("data-selected-variant-id");
    var catalogId = card.getAttribute("data-product-id");
    var productData = getProductCardDataFromNode(card);
    var options = (productData && productData.options) || [];
    var requiredCount = options.length;
    var selections = getCardSelections(card);
    var selectedCount = Object.keys(selections).filter(function (key) {
      return selections[key];
    }).length;

    var needsSelection =
      !selectedId ||
      (catalogId && String(selectedId) === String(catalogId)) ||
      (requiredCount > 0 && selectedCount < requiredCount);

    if (!needsSelection) {
      return null;
    }

    card.classList.add("angel-product-card--needs-variant");
    var variantsWrap = card.querySelector("[data-product-card-variants]");
    if (variantsWrap) {
      variantsWrap.hidden = false;
      variantsWrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    if (requiredCount === 1 && options[0] && options[0].name) {
      return (labels().chooseOptionNamed || labels().chooseOptions).replace(
        "{name}",
        String(options[0].name),
      );
    }

    return labels().chooseOptions || labels().defaultError;
  }

  function validateProductPageAdd() {
    var panel = document.querySelector(
      ".angel-product-page .angel-variant-panel",
    );
    if (!panel) {
      return null;
    }

    var optionsRoot = panel.querySelector("#product-variants-options");
    if (!optionsRoot) {
      return null;
    }

    var missingNames = [];
    var groups = optionsRoot.querySelectorAll(
      ".angel-variant-option, :scope > div, :scope > fieldset",
    );

    groups.forEach(function (group) {
      if (!group.querySelector("ul")) {
        return;
      }

      var hasChoice =
        group.querySelector("ul li.active") ||
        group.querySelector("ul li.selected") ||
        group.querySelector("input:checked") ||
        group.querySelector(".angel-color-choice.is-active") ||
        group.querySelector(".angel-text-choice.is-active");

      if (hasChoice) {
        return;
      }

      var hint = group.querySelector(".angel-variant-option__hint");
      if (hint && hint.hidden) {
        return;
      }

      var labelEl = group.querySelector("label, .product-title, h4");
      var name = labelEl
        ? String(labelEl.textContent).replace(/:.*/, "").trim()
        : "";
      if (name) {
        missingNames.push(name);
      }
    });

    if (!missingNames.length) {
      return null;
    }

    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });

    if (missingNames.length === 1) {
      return (labels().chooseOptionNamed || labels().chooseOptions).replace(
        "{name}",
        missingNames[0],
      );
    }

    return labels().chooseOptions || labels().defaultError;
  }

  function validateBeforeAdd(options, trigger) {
    var cardMessage = validateProductCardAdd(trigger);
    if (cardMessage) {
      return cardMessage;
    }

    var onProductPage = document.querySelector(
      ".angel-product-page .angel-variant-panel",
    );
    if (
      onProductPage &&
      (options.form_id === "product-form" ||
        document.getElementById("product-form"))
    ) {
      return validateProductPageAdd();
    }

    return null;
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
      line.parent_id,
      line.id,
      line.sku,
      line.product && line.product.id,
      line.product && line.product.product_id,
      line.product && line.product.parent_id,
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
      var name = card.querySelector(
        ".angel-grouped-card__title, .product-card-title, .product-title, h3, h4",
      );
      var price = card.querySelector(
        ".angel-grouped-card__price, .product-price, .price, .product-formatted-price",
      );
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
      var pageName = productPage.querySelector(
        ".angel-product-info__title, h1.product-title, .product-title",
      );
      var pagePrice = productPage.querySelector(
        ".angel-product-info__price, .product-formatted-price, .product-price",
      );
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
    return {
      name: name,
      price: price,
      image: getZidItemImageUrl(item),
    };
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
      var src = getZidItemImageUrl(product);
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
    var count = response.cart_items_quantity || 0;
    var total = "";

    if (summaryEl) {
      summaryEl.textContent = formatSummary(count || 1, total);
    }

    if (imgEl) {
      imgEl.removeAttribute("src");
      imgEl.hidden = true;
    }

    showHost(successEl);
    updateToastNavLinks();

    fetchCartSnapshot().then(function (cart) {
      var imageUrl = resolveToastImageUrl(item, lastTrigger, cart);

      if (imgEl && imageUrl) {
        imgEl.src = imageUrl;
        imgEl.alt = display.name;
        imgEl.hidden = false;
      }

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
    var text =
      extractErrorText(message) ||
      labels().defaultError ||
      "Failed to add to cart";

    bindUi();
    if (!errorEl) {
      if (window.zid && window.zid.toaster && window.zid.toaster.showError) {
        window.zid.toaster.showError(text);
      }
      return;
    }

    var titleEl = qs(".angel-cart-toast__title", errorEl);
    var messageEl = qs("[data-angel-cart-toast-error-message]", errorEl);
    if (titleEl) {
      titleEl.textContent = labels().errorTitle;
    }
    if (messageEl) {
      messageEl.textContent = text;
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
    var validationMessage = validateBeforeAdd(addOptions, activeTrigger);

    if (validationMessage) {
      showError(validationMessage);
      var validationError = new Error("add_to_cart_validation");
      validationError.__angelToastHandled = true;
      return Promise.reject(validationError);
    }

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
    validateAdd: validateBeforeAdd,
    syncProductFormQuantity: syncProductFormQuantity,
    showSuccess: showSuccess,
    showError: showError,
    hide: hide,
  };
})();
