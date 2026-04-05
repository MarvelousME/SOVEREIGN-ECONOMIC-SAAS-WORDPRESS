(function ($) {
  $(document).ready(function () {
    initPricingTables();
    appendFeatureColumn();
    syncActiveFeatures();
    initActiveFeatureObserver();

    $(window).on("resize", function () {
      initPricingTables();
      syncActiveFeatures();
    });
  });

  function initPricingTables() {
    $(".pxl-pricing-table").each(function () {
      const $tableWrapper = $(this);
      const $desktopTable = $tableWrapper.find(".pxl-table__desktop");
      const $mobileContainer = $tableWrapper.find(".pxl-table__mobile");

      if ($desktopTable.length === 0 || $mobileContainer.length === 0) return;
      const resScreen = $desktopTable.data("responsive") || 991;

      handleResponsiveTable($tableWrapper, $desktopTable, $mobileContainer, resScreen);
    });
  }

  function handleResponsiveTable($tableWrapper, $desktopTable, $mobileContainer, resScreen) {
    if ($(window).width() <= resScreen) {
      createMobileTable($desktopTable, $mobileContainer);
      $desktopTable.hide();
      $mobileContainer.show();
    } else {
      $mobileContainer.empty().hide();
      $desktopTable.show();
    }
  }

  function createMobileTable($desktopTable, $mobileContainer) {
    const $headers = $desktopTable.find("thead th");
    const $rows = $desktopTable.find("tbody tr");

    $mobileContainer.empty();

    for (let i = 1; i < $headers.length; i++) {
      const $columnDiv = $("<div>").addClass("pxl-table__mobile-column");

      const headerText = $headers.eq(i).html() || "";
      const $headerDiv = $("<div>").addClass("pxl-table__mobile-header").html(headerText);
      $columnDiv.append($headerDiv);

      const $bodyDiv = $("<div>").addClass("pxl-table__mobile-body");

      $rows.each(function () {
        const $row = $(this);
        const $cell = createMobileCell($row, i);
        $bodyDiv.append($cell);
      });

      $columnDiv.append($bodyDiv);
      $mobileContainer.append($columnDiv);
    }
  }

  function createMobileCell($row, columnIndex) {
    const $firstCell = $row.find("th").first();
    const $valueCell = $row.find("td").eq(columnIndex - 1);

    const $cellDiv = $("<div>").addClass("pxl-table__mobile-cell");

    if ($row.closest(".pxl-table__title-row.pxl-table__title-column").length) {
      $cellDiv.attr("data-label", $firstCell.text().trim());
    }

    const $labelCell = $("<div>")
      .addClass("pxl-table__mobile-cell--label")
      .text($firstCell.text().trim());

    const $valueCellDiv = $("<div>")
      .addClass("pxl-table__mobile-cell--value")
      .html($valueCell.html() || "");

    $cellDiv.append($labelCell).append($valueCellDiv);
    return $cellDiv;
  }

  function appendFeatureColumn() {
    $(".pxl-pricing-table__layout-2").each(function () {
      const $tableWrapper = $(this);
      const $featureColumn = $tableWrapper.find(".pxl-table__feature");

      $featureColumn.each(function (index) {
        const feature = $(this);
        const $targetItem = $tableWrapper.find(".item-" + (index + 1));
        $targetItem.append(feature);
        $targetItem.contents().unwrap();
      });
    });
  }

  function syncActiveFeatures() {
    $(".pxl-pricing-table").each(function () {
      const $tableWrapper = $(this);
      const $desktopTable = $tableWrapper.find(".pxl-table__desktop");
      const $mobileContainer = $tableWrapper.find(".pxl-table__mobile");

      // Remove previous active markers first
      $desktopTable.find("td").removeClass("pxl-row-active pxl-col-active active");
      $desktopTable.find("th").removeClass("active");
      $mobileContainer.find(".pxl-table__mobile-column").removeClass("pxl-row-active active");

      // Check each feature and activate corresponding cells if feature is active
      $tableWrapper.find(".pxl-table__feature").each(function () {
        const $feature = $(this);
        if (!$feature.hasClass("active")) return;

        // Determine column index via enclosing cell position
        const $enclosingCell = $feature.closest("td, th");
        if ($enclosingCell.length === 0) return;
        const colIndex = $enclosingCell.index(); // 0-based

        // Desktop: mark header and cells in this column
        if ($desktopTable.length > 0) {
          const $theadRow = $desktopTable.find("thead tr");
          if ($theadRow.length) {
            $theadRow.children().eq(colIndex).addClass("active");
          }
          $desktopTable.find("tbody tr").each(function () {
            const $row = $(this);
            const $cell = $row.children().eq(colIndex);
            if ($cell.is("td")) {
              $cell.addClass("active");
            }
          });
        }

        // Mobile: Find the mobile column that contains this feature
        if ($mobileContainer.length > 0) {
          // Find the mobile column that contains this active feature
          const $parentMobileColumn = $feature.closest(".pxl-table__mobile-column");

          if ($parentMobileColumn.length > 0) {
            $parentMobileColumn.addClass("active pxl-row-active");
          } else {
            // If feature is not in mobile column, try to find by matching content
            const featureText = $feature.text().trim();
            let foundColumn = null;

            $mobileContainer.find(".pxl-table__mobile-column").each(function () {
              const $column = $(this);
              // Check if this column contains the feature text in any of its cells
              if ($column.find("*").filter(function () {
                return $(this).text().trim() === featureText;
              }).length > 0) {
                foundColumn = $column;
                return false; // break the loop
              }
            });

            if (foundColumn) {
              foundColumn.addClass("active pxl-row-active");
            } else {
              // Final fallback: use desktop column index
              $mobileContainer.find(".pxl-table__mobile-column").eq(colIndex).addClass("active pxl-row-active");
            }
          }
        }
      });
    });
  }

  function initActiveFeatureObserver() {
    // Create a MutationObserver to watch for class changes
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList.contains('pxl-table__feature')) {
            syncActiveFeatures();
          }
        }
      });
    });

    // Start observing all pxl-table__feature elements
    $('.pxl-table__feature').each(function () {
      observer.observe(this, {
        attributes: true,
        attributeFilter: ['class']
      });
    });

    // Also observe for dynamically added elements
    $(document).on('DOMNodeInserted', '.pxl-table__feature', function () {
      observer.observe(this, {
        attributes: true,
        attributeFilter: ['class']
      });
    });
  }

  if (typeof elementorFrontend !== "undefined") {
    $(window).on("elementor/frontend/init", function () {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/pxl_table.default",
        function ($scope) {
          initPricingTables();
          appendFeatureColumn();
          syncActiveFeatures();
          initActiveFeatureObserver();
        }
      );
    });
  }
})(jQuery);
