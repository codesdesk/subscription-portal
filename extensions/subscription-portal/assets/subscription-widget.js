(function () {
  function init(widget) {
    var orderTypeInputs = widget.querySelectorAll('input[name="invoice_subscription_order_type"]');
    var options = widget.querySelector("[data-subscription-options]");
    var button = widget.querySelector("[data-create-subscription]");
    var message = widget.querySelector("[data-subscription-message]");

    orderTypeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        options.hidden = input.value !== "subscription" || !input.checked;
      });
    });

    button.addEventListener("click", async function () {
      message.textContent = "Creating subscription order...";
      button.disabled = true;

      try {
        var startType = widget.querySelector('input[name="invoice_subscription_start"]:checked').value;
        var quantity = Number(widget.querySelector("[data-subscription-quantity]").value || "1");
        var body = {
          startType: startType,
          lineItems: [
            {
              shopifyProductId: widget.dataset.productGid,
              shopifyVariantId: widget.dataset.variantGid,
              title: widget.dataset.title,
              sku: widget.dataset.sku,
              quantity: quantity,
              price: widget.dataset.price,
              tags: (widget.dataset.tags || "").split(",").filter(Boolean)
            }
          ]
        };

        var response = await fetch("/apps/subscription-portal/api/customer/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(await response.text());
        message.textContent = "Subscription order created.";
      } catch (error) {
        message.textContent = error.message || "Unable to create subscription.";
      } finally {
        button.disabled = false;
      }
    });
  }

  document.querySelectorAll(".invoice-subscription-widget").forEach(init);
})();
