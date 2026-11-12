const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    nav.classList.toggle("open", !isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    });
  });
}

document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const serviceSelect = document.querySelector('select[name="service"]');
    if (serviceSelect) {
      const requested = link.dataset.service;
      const matchingOption = [...serviceSelect.options].find((option) => option.text === requested);
      if (matchingOption) serviceSelect.value = matchingOption.value;
    }
  });
});

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const quoteForm = document.querySelector("#quote-form");
const formStatus = document.querySelector("#form-status");

if (quoteForm && formStatus) {
  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!quoteForm.reportValidity()) return;

    const data = new FormData(quoteForm);
    const fields = [
      ["Name", data.get("name")],
      ["Phone", data.get("phone")],
      ["Email", data.get("email") || "Not provided"],
      ["Property location", data.get("location") || "Not provided"],
      ["Service", data.get("service")],
      ["Job details", data.get("details") || "Not provided"]
    ];
    const requestText = "K&L LAWNCARE REMOVAL — ESTIMATE REQUEST\n\n" +
      fields.map(([label, value]) => label + ": " + value).join("\n");

    formStatus.hidden = false;
    formStatus.textContent = "Your estimate request is prepared below. This website is not yet connected to K&L's email or booking system, so nothing has been sent. Copy the request and send it using the business's confirmed contact details.\n\n" + requestText;

    let copyButton = formStatus.querySelector("button");
    if (!copyButton) {
      copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "button button-dark";
      copyButton.style.marginTop = "12px";
      copyButton.textContent = "Copy request";
      formStatus.appendChild(document.createElement("br"));
      formStatus.appendChild(copyButton);
    }

    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(requestText);
        copyButton.textContent = "Copied";
      } catch {
        copyButton.textContent = "Select and copy the request text";
      }
    };
    formStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}