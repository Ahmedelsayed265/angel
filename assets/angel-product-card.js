(function () {
  var COLOR_NAME_HEX = {
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
      window.appDirection ||
        document.documentElement.getAttribute("dir") ||
        "",
    ).toLowerCase();
    return dir === "rtl";
  }

  function labels() {
    var fallback = isArabicStore()
      ? { chooseOptions: "يجب اختيار المتغيرات أولاً" }
      : { chooseOptions: "Please choose product options first" };
    return Object.assign(
      {},
      fallback,
      window.angelProductCardLabels || {},
      window.angelCartToastLabels || {},
    );
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function isColorOptionName(name) {
    var normalized = String(name || "")
      .toLowerCase()
      .trim();
    return (
      normalized.indexOf("color") !== -1 ||
      normalized.indexOf("colour") !== -1 ||
      normalized.indexOf("لون") !== -1
    );
  }

  function isColorOption(option) {
    if (!option) {
      return false;
    }
    return (
      isColorOptionName(option.name) ||
      isColorOptionName(option.slug) ||
      option.display_type === "color" ||
      option.type === "color"
    );
  }

  function getNonColorOptions(product) {
    var options = (product && product.options) || [];
    var colorOption = findColorOption(product);
    return options.filter(function (option) {
      if (isColorOption(option)) {
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

  function getOptionIndex(product, option) {
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

  function getVariantAttributeForOption(variant, product, option) {
    var attributes = (variant && variant.attributes) || [];
    if (!attributes.length || !option) {
      return null;
    }
    var optionIndex = getOptionIndex(product, option);
    var i;
    var attr;

    if (option.id && String(option.id) !== "color") {
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

    return null;
  }

  function findColorOption(product) {
    var options = (product && product.options) || [];
    var i;
    for (i = 0; i < options.length; i += 1) {
      var option = options[i];
      if (isColorOption(option)) {
        return option;
      }
    }
    return null;
  }

  function normalizeChoice(choice) {
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

  function getColorOptionIndex(product, colorOption) {
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
    return -1;
  }

  function resolveColorAttributeIndex(product) {
    if (product && product._colorAttrIndex != null) {
      return product._colorAttrIndex;
    }

    var options = (product && product.options) || [];
    var i;
    for (i = 0; i < options.length; i += 1) {
      if (
        isColorOptionName(options[i].name) ||
        isColorOptionName(options[i].slug) ||
        options[i].display_type === "color" ||
        options[i].type === "color"
      ) {
        product._colorAttrIndex = i;
        return i;
      }
    }

    var variants = (product && product.variants) || [];
    if (!variants.length) {
      product._colorAttrIndex = -1;
      return -1;
    }

    product._colorAttrIndex = -1;
    return -1;
  }

  function getVariantColorAttribute(variant, product, colorOption) {
    var attributes = (variant && variant.attributes) || [];
    if (!attributes.length) {
      return null;
    }
    var optionIndex = getColorOptionIndex(product, colorOption);
    var colorAttrIndex = resolveColorAttributeIndex(product);
    var i;
    var attr;

    if (colorOption && colorOption.id && String(colorOption.id) !== "color") {
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

    if (colorAttrIndex >= 0 && attributes[colorAttrIndex]) {
      return attributes[colorAttrIndex];
    }

    for (i = 0; i < attributes.length; i += 1) {
      attr = attributes[i];
      if (isColorOptionName(attr.name)) {
        return attr;
      }
    }

    return null;
  }

  function buildChoicesFromVariants(product, option) {
    var variants = (product && product.variants) || [];
    var map = {};
    var choices = [];
    var isColor = option && isColorOption(option);

    variants.forEach(function (variant) {
      var attr = isColor
        ? getVariantColorAttribute(variant, product, option)
        : getVariantAttributeForOption(variant, product, option);
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
        normalizeChoice({
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

  function getOptionChoices(product, option) {
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
        var normalized = normalizeChoice(item);
        if (normalized) {
          choices.push(normalized);
        }
      });
    } else if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (key) {
        var normalized = normalizeChoice(raw[key]);
        if (normalized) {
          if (!normalized.id) {
            normalized.id = key;
          }
          choices.push(normalized);
        }
      });
    }

    if (!choices.length && product) {
      choices = buildChoicesFromVariants(product, option);
    }

    return choices;
  }

  function attributeMatchesChoice(attr, option, choice) {
    var choiceId = choice.id;
    var choiceName = String(choice.name || choice.value || "").trim();
    var attrValue = String(attr.value || attr.name || "").trim();
    var optionMatch =
      !option.id ||
      String(attr.option_id) === String(option.id) ||
      String(attr.product_option_id) === String(option.id);
    var valueMatch =
      String(attr.id) === String(choiceId) ||
      String(attr.value_id) === String(choiceId) ||
      attrValue === choiceName ||
      (choice.value && attrValue === String(choice.value).trim());
    return valueMatch && (optionMatch || !attr.option_id);
  }

  function findVariantForChoice(product, option, choice) {
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
        return attributeMatchesChoice(attr, option, choice);
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

  function resolveAssetUrl(asset) {
    if (!asset) {
      return "";
    }
    if (typeof asset === "string") {
      var trimmed = asset.trim();
      if (
        trimmed &&
        (trimmed.indexOf("http") === 0 ||
          trimmed.indexOf("//") === 0 ||
          trimmed.indexOf("/") === 0)
      ) {
        return trimmed;
      }
      return "";
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
        "";
      if (nested) {
        return nested;
      }
    }
    return (
      asset.medium ||
      asset.full_size ||
      asset.small ||
      asset.thumbnail ||
      asset.large ||
      asset.url ||
      ""
    );
  }

  function getChoiceImageUrl(choice, variant) {
    var fromChoice = resolveAssetUrl(choice.image);
    if (fromChoice) {
      return fromChoice;
    }
    if (variant && variant.images && variant.images.length) {
      var item = variant.images[0];
      return resolveAssetUrl(item) || resolveAssetUrl(item.image);
    }
    if (variant && variant.image) {
      return resolveAssetUrl(variant.image);
    }
    return "";
  }

  function getChoiceColorHex(choice) {
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
    return COLOR_NAME_HEX[label] || "#6b7280";
  }

  function choiceHasImage(choice, variant) {
    return !!getChoiceImageUrl(choice, variant);
  }

  function isChoiceActive(product, option, choice, variant) {
    var selected = product.selected_product || {};
    if (variant && String(selected.id) === String(variant.id)) {
      return true;
    }
    return (selected.attributes || []).some(function (attr) {
      return attributeMatchesChoice(attr, option, choice);
    });
  }

  function renderProductCardColorButton(choice, product, colorOption, useImages) {
    var variant = findVariantForChoice(product, colorOption, choice);
    var variantId = variant ? variant.id : "";
    var choiceId = choice.id || choice.value || choice.name || "";
    var label = escapeHtml(choice.name || choice.value || "");
    var isActive = isChoiceActive(product, colorOption, choice, variant);
    var activeClass = isActive ? " is-active" : "";
    var ariaPressed = isActive
      ? ' aria-pressed="true"'
      : ' aria-pressed="false"';
    var baseAttrs =
      ' data-variant-id="' +
      escapeHtml(variantId) +
      '" data-choice-id="' +
      escapeHtml(choiceId) +
      '" data-option-id="' +
      escapeHtml(colorOption.id) +
      '"' +
      ariaPressed +
      ' aria-label="' +
      label +
      '"';

    if (useImages) {
      var imageUrl = getChoiceImageUrl(choice, variant);
      if (imageUrl) {
        return (
          '<button type="button" role="listitem" class="angel-color-choice angel-color-choice--image' +
          activeClass +
          '"' +
          baseAttrs +
          '><span class="angel-color-choice__thumb"><img src="' +
          escapeHtml(imageUrl) +
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

    var hex = getChoiceColorHex(choice);
    return (
      '<button type="button" role="listitem" class="angel-color-choice angel-color-choice--swatch' +
      activeClass +
      '"' +
      baseAttrs +
      '><span class="angel-color-choice__dot" style="background-color:' +
      escapeHtml(hex) +
      '"></span><span class="angel-color-choice__name">' +
      label +
      "</span></button>"
    );
  }

  function unwrapCardProduct(response) {
    if (!response) {
      return null;
    }
    if (response.data) {
      if (response.data.product) {
        return response.data.product;
      }
      return response.data;
    }
    return response;
  }

  function fetchCardProduct(productId) {
    if (
      window.zid &&
      window.zid.products &&
      typeof window.zid.products.get === "function"
    ) {
      return window.zid.products
        .get(productId)
        .then(unwrapCardProduct)
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
        .then(unwrapCardProduct)
        .catch(function () {
          return null;
        });
    }

    return Promise.resolve(null);
  }

  function mergeCardProductData(base, full) {
    if (!full) {
      return base;
    }
    var merged = Object.assign({}, base, full);
    if (!merged.selected_product && base && base.selected_product) {
      merged.selected_product = base.selected_product;
    }
    if (!merged.selected_product && full.selected_product) {
      merged.selected_product = full.selected_product;
    }
    return merged;
  }

  function renderProductCardTextButton(choice, product, option) {
    var variant = findVariantForChoice(product, option, choice);
    var variantId = variant ? variant.id : "";
    var choiceId = choice.id || choice.value || choice.name || "";
    var label = escapeHtml(choice.name || choice.value || "");
    var isActive = isChoiceActive(product, option, choice, variant);
    var activeClass = isActive ? " is-active" : "";
    var ariaPressed = isActive
      ? ' aria-pressed="true"'
      : ' aria-pressed="false"';

    return (
      '<button type="button" role="listitem" class="angel-text-choice' +
      activeClass +
      '" data-variant-id="' +
      escapeHtml(variantId) +
      '" data-choice-id="' +
      escapeHtml(choiceId) +
      '" data-option-id="' +
      escapeHtml(option.id) +
      '"' +
      ariaPressed +
      ' aria-label="' +
      label +
      '"><span class="angel-text-choice__label">' +
      label +
      "</span></button>"
    );
  }

  function buildProductCardColorSectionHtml(product) {
    var colorOption = findColorOption(product);
    if (!colorOption) {
      return { html: "", useImages: false };
    }

    resolveColorAttributeIndex(product);
    var choices = getOptionChoices(product, colorOption);
    if (!choices.length) {
      return { html: "", useImages: false };
    }

    var useImages = choices.some(function (choice) {
      var variant = findVariantForChoice(product, colorOption, choice);
      return choiceHasImage(choice, variant);
    });

    var html = choices
      .map(function (choice) {
        return renderProductCardColorButton(
          choice,
          product,
          colorOption,
          useImages,
        );
      })
      .join("");

    return {
      html:
        '<div class="angel-product-card__option angel-product-card__option--color' +
        (useImages ? " angel-product-card__option--images" : "") +
        '"><div class="angel-text-option__choices" role="list">' +
        html +
        "</div></div>",
      useImages: useImages,
    };
  }

  function buildProductCardVariantsHtml(product) {
    var sections = [];
    var colorSection = buildProductCardColorSectionHtml(product);
    if (colorSection.html) {
      sections.push(colorSection.html);
    }

    getNonColorOptions(product).forEach(function (option) {
      var choices = getOptionChoices(product, option);
      if (!choices.length) {
        return;
      }
      var optionName = escapeHtml(option.name || "");
      var buttons = choices
        .map(function (choice) {
          return renderProductCardTextButton(choice, product, option);
        })
        .join("");
      sections.push(
        '<div class="angel-product-card__option" data-option-id="' +
          escapeHtml(option.id) +
          '"><p class="angel-product-card__option-label">' +
          optionName +
          '</p><div class="angel-text-option__choices" role="list">' +
          buttons +
          "</div></div>",
      );
    });

    return {
      html: sections.join(""),
      hasVariants: sections.length > 0,
    };
  }

  function getCardSelections(card) {
    var raw = card.getAttribute("data-option-selections");
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return {};
    }
  }

  function setCardSelections(card, selections) {
    card.setAttribute("data-option-selections", JSON.stringify(selections || {}));
  }

  function syncProductCardChoiceActive(card, optionId, choiceId) {
    if (!card || !optionId) {
      return;
    }
    card
      .querySelectorAll(
        '[data-option-id="' +
          optionId +
          '"].angel-color-choice, [data-option-id="' +
          optionId +
          '"].angel-text-choice',
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

  function getProductCardData(card) {
    var node =
      card.querySelector(".angel-product-card__data") ||
      card.querySelector(".angel-grouped-card__data");
    if (!node || !node.textContent) {
      return null;
    }
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function setProductCardData(card, product) {
    var node =
      card.querySelector(".angel-product-card__data") ||
      card.querySelector(".angel-grouped-card__data");
    if (node && product) {
      node.textContent = JSON.stringify(product);
    }
  }

  function applyProductCardVariant(card, product, variant) {
    if (!variant) {
      return;
    }

    product.selected_product = variant;
    card.setAttribute("data-selected-variant-id", String(variant.id));

    var priceEl = card.querySelector("[data-product-card-price]");
    var priceOldEl = card.querySelector("[data-product-card-price-old]");
    var salePrice = variant.formatted_sale_price;
    var regularPrice = variant.formatted_price;
    var currentText = salePrice || regularPrice || "";
    var oldText = salePrice && regularPrice ? regularPrice : "";

    if (priceEl) {
      priceEl.textContent = currentText;
    }
    if (priceOldEl) {
      if (oldText) {
        priceOldEl.textContent = oldText;
        priceOldEl.hidden = false;
      } else {
        priceOldEl.textContent = "";
        priceOldEl.hidden = true;
      }
    }

    var bestPrice = card.querySelector(".angel-product-card__best-price");
    if (bestPrice) {
      bestPrice.hidden = !salePrice;
    }

    var imgEl = card.querySelector("#product-card-img-" + product.id);
    if (imgEl) {
      var imageUrl = "";
      if (variant.images && variant.images.length) {
        imageUrl =
          resolveAssetUrl(variant.images[0]) ||
          resolveAssetUrl(variant.images[0].image);
      } else if (variant.image) {
        imageUrl = resolveAssetUrl(variant.image);
      }
      if (imageUrl) {
        imgEl.src = imageUrl;
      }
    }
  }

  function selectProductCardVariantChoice(card, product, btn) {
    var optionId = btn.getAttribute("data-option-id");
    var choiceId = btn.getAttribute("data-choice-id");
    if (!optionId || !choiceId) {
      return;
    }

    var selections = getCardSelections(card);
    selections[optionId] = choiceId;
    setCardSelections(card, selections);
    syncProductCardChoiceActive(card, optionId, choiceId);
    card.classList.remove("angel-product-card--needs-variant");

    var variantId = btn.getAttribute("data-variant-id");
    var variants = product.variants || [];
    var variant = variants.find(function (v) {
      return String(v.id) === String(variantId);
    });

    if (
      variant &&
      Object.keys(selections).length <= 1 &&
      !getNonColorOptions(product).length
    ) {
      applyProductCardVariant(card, product, variant);
      setProductCardData(card, product);
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
      .getProductOptions(product.id, { attributes: selections })
      .then(function (response) {
        var payload = response && response.data ? response.data : response;
        var selected = payload && (payload.selected_product || payload.product);
        if (selected) {
          product.selected_product = selected;
          applyProductCardVariant(card, product, selected);
          setProductCardData(card, product);
        }
      })
      .catch(function () {});
  }

  function mountProductCardVariants(card, product) {
    var variantsWrap = card.querySelector("[data-product-card-variants]");
    if (!variantsWrap) {
      return false;
    }

    var result = buildProductCardVariantsHtml(product);
    if (!result.html) {
      return false;
    }

    variantsWrap.innerHTML = result.html;
    variantsWrap.hidden = false;
    variantsWrap.classList.remove("is-loading");

    if (!card.getAttribute("data-selected-variant-id") && product.selected_product) {
      applyProductCardVariant(card, product, product.selected_product);
    }

    syncProductCardSelectionsFromSelected(card, product);

    return true;
  }

  function syncProductCardSelectionsFromSelected(card, product) {
    var selected = product && product.selected_product;
    if (!selected || !selected.attributes) {
      return;
    }

    var selections = {};
    selected.attributes.forEach(function (attr) {
      var optionId = attr.option_id || attr.product_option_id;
      var choiceId = attr.id || attr.value_id || attr.value;
      if (optionId && choiceId) {
        selections[optionId] = choiceId;
        syncProductCardChoiceActive(card, optionId, choiceId);
      }
    });
    if (Object.keys(selections).length) {
      setCardSelections(card, selections);
    }
  }

  function bindProductCardVariantClicks(card, product) {
    var variantsWrap = card.querySelector("[data-product-card-variants]");
    if (!variantsWrap || variantsWrap.dataset.variantBound === "1") {
      return;
    }
    variantsWrap.dataset.variantBound = "1";
    variantsWrap.addEventListener("click", function (event) {
      var btn =
        event.target.closest(".angel-color-choice") ||
        event.target.closest(".angel-text-choice");
      if (!btn) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      var latest = getProductCardData(card) || product;
      selectProductCardVariantChoice(card, latest, btn);
    });
  }

  function initProductCard(card) {
    if (card.dataset.productCardReady === "1") {
      return;
    }

    var product = getProductCardData(card);
    if (!product) {
      return;
    }

    var needsOptions = card.getAttribute("data-needs-options") === "true";
    var variantsWrap = card.querySelector("[data-product-card-variants]");

    function finishVariants(productData) {
      if (!needsOptions || !variantsWrap) {
        return;
      }

      var mounted = mountProductCardVariants(card, productData);
      if (mounted) {
        bindProductCardVariantClicks(card, productData);
        return;
      }

      variantsWrap.hidden = true;
    }

    if (needsOptions && variantsWrap) {
      variantsWrap.hidden = false;

      if (mountProductCardVariants(card, product)) {
        bindProductCardVariantClicks(card, product);
      } else if (product.id) {
        variantsWrap.classList.add("is-loading");
        fetchCardProduct(product.id).then(function (fullProduct) {
          variantsWrap.classList.remove("is-loading");
          var merged = mergeCardProductData(product, fullProduct);
          setProductCardData(card, merged);
          finishVariants(merged);
        });
      } else {
        variantsWrap.hidden = true;
      }
    }

    card.dataset.productCardReady = "1";
  }

  function parseCountdownEnd(value) {
    if (!value) {
      return NaN;
    }
    var trimmed = String(value).trim();
    if (!trimmed) {
      return NaN;
    }
    var asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && trimmed === String(asNum)) {
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

  function initDiscountCountdown(el) {
    if (!el || el.dataset.countdownReady === "1") {
      return;
    }

    var endMs = parseCountdownEnd(el.getAttribute("data-countdown-end"));
    if (Number.isNaN(endMs)) {
      el.hidden = true;
      return;
    }

    var remaining = endMs - Date.now();
    if (remaining <= 0) {
      el.hidden = true;
      return;
    }

    el.dataset.countdownReady = "1";
    el.hidden = false;

    function tick() {
      var left = endMs - Date.now();
      if (left <= 0) {
        el.hidden = true;
        el.textContent = "00:00:00";
        return false;
      }
      el.textContent = formatCountdown(left);
      return true;
    }

    tick();
    window.setInterval(tick, 1000);
  }

  function initDiscountCountdowns(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-discount-countdown]").forEach(initDiscountCountdown);
  }

  function initProductCards(root) {
    var scope = root || document;
    scope.querySelectorAll(".angel-product-card").forEach(initProductCard);
    initDiscountCountdowns(scope);
  }

  function handleProductCardAdd(btn) {
    var card = btn.closest(".angel-product-card");
    if (!card) {
      return;
    }

    var needsOptions = card.getAttribute("data-needs-options") === "true";
    var selectedId = card.getAttribute("data-selected-variant-id");

    if (needsOptions && !selectedId) {
      if (
        window.AngelCartToast &&
        typeof window.AngelCartToast.addToCart === "function"
      ) {
        window.AngelCartToast.addToCart(
          { product_id: card.getAttribute("data-product-id"), quantity: 1 },
          {},
          btn,
        );
        return;
      }
      card.classList.add("angel-product-card--needs-variant");
      var variantsWrap = card.querySelector("[data-product-card-variants]");
      if (variantsWrap) {
        variantsWrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      if (window.zid && window.zid.toaster && window.zid.toaster.showError) {
        window.zid.toaster.showError(labels().chooseOptions);
      }
      return;
    }

    var productId = selectedId || card.getAttribute("data-product-id");
    if (window.AngelCartToast && typeof window.AngelCartToast.addToCart === "function") {
      var progress = btn.querySelector(
        ".add-to-cart-progress, .angel-grouped-card__btn-progress",
      );
      var content = btn.querySelector(".angel-grouped-card__btn-content");
      if (progress) {
        progress.classList.remove("d-none");
      }
      if (content) {
        content.classList.add("d-none");
      }
      btn.disabled = true;

      window.AngelCartToast.addToCart(
        { product_id: productId, quantity: 1 },
        {},
        btn,
      )
        .then(function () {
          if (progress) {
            progress.classList.add("d-none");
          }
          if (content) {
            content.classList.remove("d-none");
          }
          btn.disabled = false;
        })
        .catch(function () {
          if (progress) {
            progress.classList.add("d-none");
          }
          if (content) {
            content.classList.remove("d-none");
          }
          btn.disabled = false;
        });
      return;
    }

    if (typeof window.productCartAddToCart === "function") {
      window.productCartAddToCart(btn, productId);
    }
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-product-card-add]");
    if (!btn) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleProductCardAdd(btn);
  });

  function bindProductCardQuickView(scope) {
    if (window.AngelProductPage && window.AngelProductPage.bindGroupedQuickViewTriggers) {
      window.AngelProductPage.bindGroupedQuickViewTriggers(scope || document);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initProductCards();
    initDiscountCountdowns(document);
    bindProductCardQuickView(document.getElementById("products-list") || document);

    var list = document.getElementById("products-list");
    if (list && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        initProductCards(list);
        bindProductCardQuickView(list);
      });
      observer.observe(list, { childList: true, subtree: true });
    }
  });

  window.AngelProductCard = {
    init: initProductCards,
    initCard: initProductCard,
    initDiscountCountdowns: initDiscountCountdowns,
  };
})();
