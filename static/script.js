const languages = {
  zz: {
    use: "en"
  }, // devel
  en: {},
  ru: {},
  tr: {}
};

const apiUrl = document.location.origin;
const providerId = "";

//Build languages dropdown from JSON
let templateLangs = `
<nav class="langs navbar navbar-light bg-light container">
<span class="navbar-brand col-lg-3" data-translate="brand"></span>
<span class="navbar-text" data-translate="about"></span>
<div class="d-flex justify-content-end dropdown col-lg-3">
  <button type="button" class="btn btn-light dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" tabindex="1" data-translate="lang"></button>
  <ul class="dropdown-menu dropdown-menu-end">
`;
Object.entries(languages).forEach(([lang, props]) => {
  if (props.use === undefined) {
    templateLangs +=
      '<li setlang="' +
      lang +
      '"><a class="dropdown-item" href="#">' +
      lang.toUpperCase() +
      "</a></li>";
  }
});
templateLangs += `
  </ul>
  <button id="logout-button" type="submit" class="btn btn-light" data-translate="logout-button"></button>
</div>
</nav>
`;

const template =
  templateLangs +
  (`
  <form id="viewport" class="mode-index justify-content-center container">
  <div class="col-lg-6 mt-5 mx-auto">
    <div class="screen-index mb-3">
      <div class="px-4 text-center">
        <h4 data-translate="title"></h4>
        <p class="lead" data-translate="search-title"></p>
      </div>

      <input
        class="form-control input-lg mb-3"
        type="search"
        name="license"
        id="license"
      />
      <button
        id="search-button"
        type="submit"
        class="btn btn-primary"
        data-translate="search-button"
      ></button>
    </div>
    <div class="screen-error alert alert-danger">
      <span id="error-span"></span>
    </div>
    <div class="screen-found">
      <div class="px-4 text-center">
        <h2 data-translate="manage-title"></h2>
      </div>
      <div class="row mb-3">
        <div class="col-3" data-translate="license-value"></div>
        <div class="col" id="licenseValue">123456789012345</div>
        <div class="w-100"></div>
        <div class="col-3" data-translate="model-name"></div>
        <div class="col" id="modelName">Keenetic Giga</div>
        <div class="w-100"></div>
        <div class="col-3" data-translate="hardware-id"></div>
        <div class="col" id="hardwareId">KN-1010</div>
        <span id="systemName" hidden></span>
        <span id="redirectLink" hidden></span>
      </div>
      <button
        id="manage-button"
        type="submit"
        class="btn btn-primary"
        data-translate="manage-button"
      ></button>
      <button
        id="back-button"
        type="submit"
        class="btn btn-outline-primary"
        data-translate="back-button"
      ></button>
    </div>
  </div>
</form>
` || document.getElementById("template").innerHTML);

let uiElements = {};

function onDomInitialize() {
  document.getElementById("template").innerHTML = template;

  uiElements = {
    html: document.querySelector("html"),
    title: document.querySelector("title"),
    langControl: document.querySelector(".langs"),
    langValues: document.querySelectorAll("[setlang]"),
    viewport: document.getElementById("viewport"),
    backButton: document.getElementById("back-button"),
    logoutButton: document.getElementById("logout-button"),
    searchButton: document.getElementById("search-button"),
    manageButton: document.getElementById("manage-button"),
    licenseInput: document.getElementById("license"),
    error: document.getElementById("error-span"),
    licenseValue: document.getElementById("licenseValue"),
    modelName: document.getElementById("modelName"),
    hardwareId: document.getElementById("hardwareId"),
    redirectLink: document.getElementById("redirectLink"),
    systemName: document.getElementById("systemName")
  };

  uiElements.title.setAttribute("data-translate", "about");

  // set lang by storage
  if (localStorage && localStorage.language) setLang(localStorage.language);
  // set lang by navigator
  else setLangByNavigator();

  document.title = translateById("about");

  // activate language switching
  uiElements.langValues.forEach((el) =>
    el.addEventListener("click", dolangSwitch)
  );

  // activate dropdown
  const activeStateClassname = "is-active";
  const activateBodyClick = (ev) => {
    if (
      ev.target.parentNode.parentNode.nodeName === "UL" ||
      ev.target.nodeName === "BUTTON"
    ) {
      ev.preventDefault();
    }
    uiElements.langControl.classList.remove(activeStateClassname);
    return false;
  };

  document.body.addEventListener("click", activateBodyClick, true);

  uiElements.langControl.onclick = function (ev) {
    ev.currentTarget.classList.toggle(activeStateClassname);
  };

  uiElements.searchButton.addEventListener("click", onSearch, true);
  uiElements.manageButton.addEventListener("click", onManage, true);
  uiElements.backButton.addEventListener("click", onBack, true);
  uiElements.logoutButton.addEventListener("click", onLogout, true);
}
document.addEventListener("DOMContentLoaded", onDomInitialize);

function dolangSwitch(ev) {
  ev.preventDefault();
  const task = ev.currentTarget;
  setLang(task.attributes.setlang.value);
}

function showError(text) {
  uiElements.error.innerHTML = text || "Unknown Error";
  uiElements.viewport.classList.replace("mode-index", "mode-error");
  uiElements.viewport.classList.replace("mode-found", "mode-error");
}

function onBack(ev) {
  ev.preventDefault();
  uiElements.searchButton.disabled = false;
  uiElements.licenseInput.value = "";
  uiElements.viewport.classList.replace("mode-found", "mode-index");
  uiElements.viewport.classList.replace("mode-error", "mode-index");
}

function onLogout(ev) {
  ev.preventDefault();
  window.location.href = apiUrl.replace("//", "//login:password@");
}

async function onSearch(ev) {
  ev.preventDefault();
  const license = uiElements.licenseInput.value.replaceAll("-", "");
  if (!license || license.length !== 15) {
    alert(translateById("alert-license-length"));
    return;
  }

  uiElements.searchButton.disabled = true;

  const response =
    // searchDebug(license) ||
    await fetch(apiUrl + "/search?license=" + license, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      credentials: "include",
      redirect: "error",
      referrerPolicy: "no-referrer"
    });

  const json = await response.json();

  let errorText = json.error;
  if (response.status !== 200 && errorText === undefined) {
     errorText = "Unknown error (" + response.status + ")";
  }
  if (errorText !== undefined) {
    const errorCode = json.code;
    showError(translateById(errorCode) || errorText);
    uiElements.searchButton.disabled = false;
    return;
  }


  uiElements.licenseValue.innerHTML =
    license.replace(/(\d)(?=(\d{3})+$)/g, "$1-") || "123-456-789-012-345";
  uiElements.modelName.innerText = json.modelName || "unknown";
  uiElements.hardwareId.innerText = json.ndmHwId || "unknown";
  uiElements.redirectLink.innerText = json.redirectUrl || "";
  uiElements.systemName.innerText = json.systemName || "";

  uiElements.viewport.classList.replace("mode-index", "mode-found");
  uiElements.viewport.classList.replace("mode-error", "mode-found");

  uiElements.searchButton.disabled = false;
}

async function onManage(ev) {
  ev.preventDefault();
  const manageUrl = uiElements.redirectLink.innerText.replace("&amp;", "&");
  if (manageUrl !== "") {
    window.open(manageUrl, "_blank").focus();
  }
}

// Do lang switching
function setLang(xx) {
  uiElements.html.lang = xx;
  fetch("/static/strings-" + xx + ".json")
    .then((response) => response.json())
    .then((data) => {
      languages[xx].data = data;
      document.querySelectorAll("[data-translate]").forEach((el) => {
        let key = el.getAttribute("data-translate");
        let translation = data[key] || "";
        el.innerHTML = translation;
      });
    });
  if (localStorage) localStorage.language = xx;
}

function translateById(id) {
  const lang = uiElements.html.lang || "en";
  const data = languages[lang].data || { id: "" };
  return data[id];
}

// get language from navigator settings
function approveLanguage(language) {
  return languages[language] && (languages[language].use || language);
}
function uaLanguage() {
  let s;
  for (let l of navigator.languages || [
    navigator.language || navigator.userLanguage
  ]) {
    if ((s = approveLanguage(l)) || (s = approveLanguage(l.split("-")[0]))) {
      return s;
    }
  }
}
function osLanguage() {
  var s;
  for (let l of [navigator.userLanguage || navigator.language]) {
    if ((s = approveLanguage(l)) || (s = approveLanguage(l.split("-")[0]))) {
      return s;
    }
  }
  return uaLanguage();
}

function setLangByNavigator() {
  let nav_lang = osLanguage();
  if (nav_lang) setLang(nav_lang);
}
