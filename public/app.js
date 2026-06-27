// VIPCall app.js — Full-Stack Node.js + MongoDB Catalog Manager

// App State
let products = [];
let activeImageMode = "file"; // "file" or "url"
let currentBase64Image = "";
let currentFilter = "all";
let isAdminLoggedIn = false;
let editingProductId = null;
let hasNewFileSelected = false;
let hasImageBeenCropped = false;

// Crop State
let cropState = {
  imgLeft: 0,
  imgTop: 0,
  baseScale: 1,
  zoom: 1,
  isDragging: false,
  startX: 0,
  startY: 0
};

// DOM Elements
const bodyElement = document.body;
const productList = document.getElementById("product-list");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("catalog-search");
const tabButtons = document.querySelectorAll(".filter-tabs .tab-btn");

// Sections
const authLoading = document.getElementById("auth-loading");
const loginSection = document.getElementById("login-section");
const addProductSection = document.getElementById("add-product-section");

// Forms & Inputs
const loginForm = document.getElementById("login-form");
const loginUsernameInput = document.getElementById("login-username");
const loginPasswordInput = document.getElementById("login-password");
const loginApiError = document.getElementById("login-api-error");

// Product Add Form Submission
const productForm = document.getElementById("product-form");
const inputTitle = document.getElementById("product-title");
const inputPrice = document.getElementById("product-price");
const inputCategory = document.getElementById("product-category");
const inputWhatsapp = document.getElementById("product-whatsapp");
const inputDescription = document.getElementById("product-description");
const inputImageUrl = document.getElementById("product-image-url");
const inputImageFile = document.getElementById("product-image-file");
const productApiError = document.getElementById("product-api-error");

// Toggles & Preview Elements
const btnToggleAdmin = document.getElementById("btn-toggle-admin");
const btnCloseDrawer = document.getElementById("btn-close-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const btnToggleUpload = document.getElementById("btn-toggle-upload");
const btnToggleUrl = document.getElementById("btn-toggle-url");
const imageUploadWrapper = document.getElementById("image-upload-wrapper");
const imageUrlWrapper = document.getElementById("image-url-wrapper");
const fileDropzone = document.getElementById("file-dropzone");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const btnRemovePreview = document.getElementById("btn-remove-preview");
const btnLogout = document.getElementById("btn-logout");
const cropContainer = document.getElementById("crop-container");
const cropZoom = document.getElementById("crop-zoom");

// Initialize application
async function init() {
  setupEventListeners();
  await checkAuthStatus();
  await fetchProducts();
}

// Check if user is logged in as admin
async function checkAuthStatus() {
  showLoading(true);
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    setAuthState(data.loggedIn);
  } catch (err) {
    console.error('Error checking auth status:', err);
    setAuthState(false);
  } finally {
    showLoading(false);
  }
}

// Toggle display loading spinner vs content panels
function showLoading(isLoading) {
  if (isLoading) {
    authLoading.classList.remove("hidden");
    loginSection.classList.add("hidden");
    addProductSection.classList.add("hidden");
  } else {
    authLoading.classList.add("hidden");
    if (isAdminLoggedIn) {
      addProductSection.classList.remove("hidden");
      loginSection.classList.add("hidden");
    } else {
      loginSection.classList.remove("hidden");
      addProductSection.classList.add("hidden");
    }
  }
}

// Set auth state variables and toggle class on body
function setAuthState(isLoggedIn) {
  isAdminLoggedIn = isLoggedIn;
  if (isLoggedIn) {
    bodyElement.classList.add("admin-logged-in");
  } else {
    bodyElement.classList.remove("admin-logged-in");
  }
}

// Close the admin panel drawer helper
function closeAdminDrawer() {
  bodyElement.classList.remove("admin-drawer-open");
  drawerOverlay.classList.add("hidden");
  cancelEditMode();
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener("input", filterAndRenderProducts);

  // Toggle Admin Drawer Panel
  btnToggleAdmin.addEventListener("click", () => {
    bodyElement.classList.add("admin-drawer-open");
    drawerOverlay.classList.remove("hidden");
  });

  btnCloseDrawer.addEventListener("click", closeAdminDrawer);
  drawerOverlay.addEventListener("click", closeAdminDrawer);

  // Tab Filtering (All, Indian, Russian)
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      fetchProducts();
    });
  });

  // Login Form Submission
  loginForm.addEventListener("submit", handleLoginSubmit);

  // Logout Trigger
  btnLogout.addEventListener("click", handleLogout);

  // Product Add Form Submission
  productForm.addEventListener("submit", handleProductSubmit);

  // Delete Listing (via Event Delegation)
  productList.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".btn-delete-product");
    if (deleteBtn) {
      const card = deleteBtn.closest(".product-card");
      if (card) {
        const id = card.dataset.id;
        if (id) {
          removeProduct(id);
        }
      }
    }

    const editBtn = e.target.closest(".btn-edit-product");
    if (editBtn) {
      const card = editBtn.closest(".product-card");
      if (card) {
        const id = card.dataset.id;
        if (id) {
          startEditProduct(id);
        }
      }
    }
  });

  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  btnCancelEdit.addEventListener("click", cancelEditMode);

  // Image Mode Toggles
  btnToggleUpload.addEventListener("click", () => setImageMode("file"));
  btnToggleUrl.addEventListener("click", () => setImageMode("url"));

  // File Upload Handlers
  inputImageFile.addEventListener("change", handleFileSelect);
  btnRemovePreview.addEventListener("click", removeFilePreview);

  // Cropper Events
  imagePreview.addEventListener("load", initCropper);
  cropContainer.addEventListener("mousedown", handleDragStart);
  window.addEventListener("mousemove", handleDragMove);
  window.addEventListener("mouseup", handleDragEnd);
  cropContainer.addEventListener("touchstart", handleDragStart, { passive: true });
  window.addEventListener("touchmove", handleDragMove, { passive: false });
  window.addEventListener("touchend", handleDragEnd);
  cropZoom.addEventListener("input", handleZoomChange);

  // Recalculate cropper scale on resize
  window.addEventListener("resize", () => {
    if (activeImageMode === "file" && currentBase64Image && !imagePreviewContainer.classList.contains("hidden")) {
      initCropper();
    }
  });

  // Drag and Drop files on dropzone
  fileDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileDropzone.classList.add("hover");
  });

  fileDropzone.addEventListener("dragleave", () => {
    fileDropzone.classList.remove("hover");
  });

  fileDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDropzone.classList.remove("hover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      inputImageFile.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });

  // Clear validation styling when user inputs values
  const inputs = [inputTitle, inputPrice, inputCategory, inputWhatsapp, inputDescription, inputImageUrl, loginUsernameInput, loginPasswordInput];
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      const parent = input.closest(".form-group");
      if (parent) parent.classList.remove("has-error");
      loginApiError.style.display = "none";
      productApiError.style.display = "none";
    });
  });
}

// Switch image mode (file upload vs URL input)
function setImageMode(mode) {
  activeImageMode = mode;
  const parent = btnToggleUpload.closest(".form-group");
  if (parent) parent.classList.remove("has-error");

  if (mode === "file") {
    btnToggleUpload.classList.add("active");
    btnToggleUrl.classList.remove("active");
    imageUploadWrapper.classList.remove("hidden");
    imageUrlWrapper.classList.add("hidden");
  } else {
    btnToggleUpload.classList.remove("active");
    btnToggleUrl.classList.add("active");
    imageUploadWrapper.classList.add("hidden");
    imageUrlWrapper.classList.remove("hidden");
  }
}

// Parse selected file as Base64 and show preview
function handleFileSelect() {
  const file = inputImageFile.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    inputImageFile.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    currentBase64Image = e.target.result;
    hasNewFileSelected = true;
    fileDropzone.classList.add("hidden");
    imagePreviewContainer.classList.remove("hidden");
    imagePreview.src = currentBase64Image;
    
    const parent = inputImageFile.closest(".form-group");
    if (parent) parent.classList.remove("has-error");
  };
  reader.readAsDataURL(file);
}

// Remove preview image and reset input values
function removeFilePreview() {
  currentBase64Image = "";
  hasNewFileSelected = false;
  hasImageBeenCropped = false;
  inputImageFile.value = "";
  imagePreview.src = "#";
  fileDropzone.classList.remove("hidden");
  imagePreviewContainer.classList.add("hidden");
}

// Handle Admin Login submission
async function handleLoginSubmit(e) {
  e.preventDefault();
  
  let hasErrors = false;
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  if (!username) {
    setErrorState(loginUsernameInput, true);
    hasErrors = true;
  } else {
    setErrorState(loginUsernameInput, false);
  }

  if (!password) {
    setErrorState(loginPasswordInput, true);
    hasErrors = true;
  } else {
    setErrorState(loginPasswordInput, false);
  }

  if (hasErrors) return;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    setAuthState(true);
    showLoading(false);
    
    loginForm.reset();
    fetchProducts(); // Re-fetch to show administrative elements (Remove buttons)
  } catch (err) {
    console.error(err);
    loginApiError.textContent = err.message;
    loginApiError.style.display = "block";
  }
}

// Handle Admin Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthState(false);
    showLoading(false);
    fetchProducts(); // Re-fetch to hide administrative elements (Remove buttons)
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// Fetch products from database
async function fetchProducts() {
  let url = '/api/products';
  if (currentFilter !== 'all') {
    url += `?category=${currentFilter}`;
  }

  renderSkeleton();

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      products = data;
      filterAndRenderProducts();
    }
  } catch (err) {
    console.error('Error fetching products:', err);
  }
}

// ponytail: loading skeleton skeleton rendering
function renderSkeleton() {
  productList.innerHTML = Array(3).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-meta"></div>
        <div class="skeleton-line skeleton-desc"></div>
        <div class="skeleton-line skeleton-footer"></div>
      </div>
    </div>
  `).join("");
  emptyState.classList.add("hidden");
}

// Client-side search filter and HTML rendering
function filterAndRenderProducts() {
  const query = searchInput.value.toLowerCase().trim();
  
  const filtered = products.filter(p => 
    p.title.toLowerCase().includes(query) || 
    p.description.toLowerCase().includes(query)
  );

  productList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = product._id;

    const imageSrc = product.image || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=400";
    
    // Construct WhatsApp message URL
    const whatsappUrl = `https://wa.me/${product.whatsapp}?text=Hi,%20I'm%20interested%20in%20your%20listing:%20${encodeURIComponent(product.title)}`;

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img class="card-image" src="${imageSrc}" alt="${escapeHTML(product.title)}" loading="lazy">
      </div>
      <div class="card-content">
        <div class="card-header-row">
          <h3 class="card-title">${escapeHTML(product.title)}</h3>
        </div>
        <div class="card-meta-row">
          <span class="card-price">₹${Number(product.price).toLocaleString('en-IN')}</span>
          <span class="card-category" data-cat="${product.category}">${escapeHTML(product.category)}</span>
        </div>
        <p class="card-description">${escapeHTML(product.description)}</p>
        <div class="card-footer">
          <a href="${whatsappUrl}" target="_blank" class="btn-whatsapp-inquire">
            <!-- Custom SVG Chat/Speech Bubble Icon -->
            <svg class="whatsapp-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
              <rect width="256" height="256" fill="none"/>
              <path d="M128,24A104,104,0,0,0,36.85,178.6L24.81,222.6a8,8,0,0,0,9.86,9.86l44-12A104,104,0,1,0,128,24Zm0,184a79.8,79.8,0,0,1-40.85-11.23,8,8,0,0,0-7.39-.33l-28.75,7.84,7.84-28.75a8,8,0,0,0-.33-7.39A79.8,79.8,0,1,1,128,208Z" fill="currentColor"/>
            </svg>
            Inquire
          </a>
          <button class="btn-edit-product">
            <!-- Custom SVG Edit/Pencil Icon -->
            <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
              <rect width="256" height="256" fill="none"/>
              <path d="M92.7,216H48a8,8,0,0,1-8-8V163.3a7.9,7.9,0,0,1,2.3-5.6l120-120a8,8,0,0,1,11.4,0l48,48a8,8,0,0,1,0,11.4l-120,120A7.9,7.9,0,0,1,92.7,216Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
              <line x1="136" y1="64" x2="192" y2="120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
            </svg>
            Edit
          </button>
          <button class="btn-delete-product">
            <!-- Custom SVG Trash Icon -->
            <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
              <rect width="256" height="256" fill="none"/>
              <line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
              <line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
              <line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
              <path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
              <path d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `;

    productList.appendChild(card);
  });
}

// Remove a product from database with CSS animation
async function removeProduct(id) {
  const confirmed = await showConfirmModal();
  if (!confirmed) return;

  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (!card) return;

  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete item.');
    }

    card.classList.add("fade-out");
    
    let removed = false;
    const finishRemoval = () => {
      if (removed) return;
      removed = true;
      products = products.filter(p => p._id !== id);
      filterAndRenderProducts();
    };

    card.addEventListener("transitionend", finishRemoval, { once: true });
    setTimeout(finishRemoval, 350); // Fallback: 350ms (transition is 300ms)
  } catch (err) {
    alert(err.message);
  }
};

// Handle product creation submission
async function handleProductSubmit(e) {
  e.preventDefault();

  let hasErrors = false;
  const titleVal = inputTitle.value.trim();
  const priceVal = parseFloat(inputPrice.value);
  const categoryVal = inputCategory.value;
  const whatsappVal = inputWhatsapp.value.trim();
  const descriptionVal = inputDescription.value.trim();

  // Validate Title
  if (!titleVal) {
    setErrorState(inputTitle, true);
    hasErrors = true;
  } else {
    setErrorState(inputTitle, false);
  }

  // Validate Price
  if (isNaN(priceVal) || priceVal < 0) {
    setErrorState(inputPrice, true);
    hasErrors = true;
  } else {
    setErrorState(inputPrice, false);
  }

  // Validate Category
  if (!categoryVal) {
    setErrorState(inputCategory, true);
    hasErrors = true;
  } else {
    setErrorState(inputCategory, false);
  }

  // Validate WhatsApp Number
  // Very simple check: ensure it has at least 8 digits
  const cleanPhone = whatsappVal.replace(/[^0-9]/g, "");
  if (!whatsappVal || cleanPhone.length < 8) {
    setErrorState(inputWhatsapp, true);
    hasErrors = true;
  } else {
    setErrorState(inputWhatsapp, false);
  }

  // Validate Description
  if (!descriptionVal) {
    setErrorState(inputDescription, true);
    hasErrors = true;
  } else {
    setErrorState(inputDescription, false);
  }

  // Validate Image
  let imageUrl = "";
  if (activeImageMode === "file") {
    if (!currentBase64Image) {
      setGroupErrorState(fileDropzone, true);
      hasErrors = true;
    } else {
      setGroupErrorState(fileDropzone, false);
      imageUrl = (hasNewFileSelected || hasImageBeenCropped) ? getCroppedBase64() : currentBase64Image;
    }
  } else {
    const urlVal = inputImageUrl.value.trim();
    if (!urlVal || !isValidURL(urlVal)) {
      setErrorState(inputImageUrl, true);
      hasErrors = true;
    } else {
      setErrorState(inputImageUrl, false);
      imageUrl = urlVal;
    }
  }

  if (hasErrors) return;

  const productPayload = {
    title: titleVal,
    price: priceVal,
    category: categoryVal,
    whatsapp: cleanPhone,
    description: descriptionVal,
    image: imageUrl
  };

  const isEditing = !!editingProductId;
  const apiEndpoint = isEditing ? `/api/products/${editingProductId}` : '/api/products';
  const apiMethod = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(apiEndpoint, {
      method: apiMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save item.');
    }

    const targetId = isEditing ? editingProductId : data._id;

    // Reset Form and View
    cancelEditMode();
    closeAdminDrawer();

    // Refresh products and scroll item into view
    await fetchProducts();
    const newlyCreated = document.querySelector(`.product-card[data-id="${targetId}"]`);
    if (newlyCreated) {
      newlyCreated.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch (err) {
    console.error(err);
    productApiError.textContent = err.message;
    productApiError.style.display = "block";
  }
}

// Utility to set validation error CSS class on element wrappers
function setErrorState(inputEl, hasError) {
  const parent = inputEl.closest(".form-group");
  if (!parent) return;
  if (hasError) {
    parent.classList.add("has-error");
  } else {
    parent.classList.remove("has-error");
  }
}

function setGroupErrorState(element, hasError) {
  const parent = element.closest(".form-group");
  if (!parent) return;
  if (hasError) {
    parent.classList.add("has-error");
  } else {
    parent.classList.remove("has-error");
  }
}

// URL string verification
function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}

// Escape dangerous inputs to prevent HTML injection
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Show custom UI confirmation modal and return a Promise
function showConfirmModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const btnCancel = document.getElementById("btn-confirm-cancel");
    const btnDelete = document.getElementById("btn-confirm-delete");

    // Show modal
    modal.classList.remove("hidden");

    const cleanup = (value) => {
      modal.classList.add("hidden");
      // Remove event listeners to avoid memory leaks
      btnCancel.removeEventListener("click", onCancel);
      btnDelete.removeEventListener("click", onDelete);
      resolve(value);
    };

    const onCancel = () => cleanup(false);
    const onDelete = () => cleanup(true);

    btnCancel.addEventListener("click", onCancel);
    btnDelete.addEventListener("click", onDelete);
  });
}

// Start edit mode for a listing
function startEditProduct(id) {
  const product = products.find(p => p._id === id);
  if (!product) return;

  editingProductId = id;
  hasNewFileSelected = false;
  hasImageBeenCropped = false;

  // Populate fields
  inputTitle.value = product.title;
  inputPrice.value = product.price;
  inputCategory.value = product.category;
  inputWhatsapp.value = product.whatsapp;
  inputDescription.value = product.description;

  // Handle image population
  if (product.image && product.image.startsWith("data:")) {
    setImageMode("file");
    currentBase64Image = product.image;
    fileDropzone.classList.add("hidden");
    imagePreviewContainer.classList.remove("hidden");
    imagePreview.src = currentBase64Image;
    inputImageUrl.value = "";
  } else {
    setImageMode("url");
    inputImageUrl.value = product.image || "";
    removeFilePreview();
  }

  // Update UI titles & buttons
  const formTitle = document.querySelector("#add-product-section .form-title");
  if (formTitle) formTitle.textContent = "Edit Listing";

  const btnSubmit = document.getElementById("btn-submit");
  if (btnSubmit) btnSubmit.textContent = "Save Changes";

  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  if (btnCancelEdit) btnCancelEdit.classList.remove("hidden");

  // Open drawer
  bodyElement.classList.add("admin-drawer-open");
  drawerOverlay.classList.remove("hidden");
}

// Cancel edit mode and reset form to "Add New"
function cancelEditMode() {
  editingProductId = null;
  productForm.reset();
  removeFilePreview();
  setImageMode("file");

  const formTitle = document.querySelector("#add-product-section .form-title");
  if (formTitle) formTitle.textContent = "Add New";

  const btnSubmit = document.getElementById("btn-submit");
  if (btnSubmit) btnSubmit.textContent = "Add to Catalog";

  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  if (btnCancelEdit) btnCancelEdit.classList.add("hidden");

  productApiError.style.display = "none";
}

// ponytail: native client-side drag-to-crop implementation (zero dependencies)
function initCropper() {
  const containerWidth = cropContainer.clientWidth || 364;
  const containerHeight = cropContainer.clientHeight || 200;
  const imgNaturalWidth = imagePreview.naturalWidth;
  const imgNaturalHeight = imagePreview.naturalHeight;

  if (!imgNaturalWidth || !imgNaturalHeight) return;

  const scaleX = containerWidth / imgNaturalWidth;
  const scaleY = containerHeight / imgNaturalHeight;
  cropState.baseScale = Math.max(scaleX, scaleY);

  const scaledWidth = imgNaturalWidth * cropState.baseScale;
  const scaledHeight = imgNaturalHeight * cropState.baseScale;

  cropState.imgLeft = (containerWidth - scaledWidth) / 2;
  cropState.imgTop = (containerHeight - scaledHeight) / 2;
  cropState.zoom = 1;
  cropZoom.value = 1;

  updateCropperTransform();
}

function updateCropperTransform() {
  const scale = cropState.baseScale * cropState.zoom;
  imagePreview.style.transform = `translate(${cropState.imgLeft}px, ${cropState.imgTop}px) scale(${scale})`;
}

function handleDragStart(e) {
  if (activeImageMode !== "file" || !currentBase64Image) return;
  cropState.isDragging = true;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  cropState.startX = clientX - cropState.imgLeft;
  cropState.startY = clientY - cropState.imgTop;
}

function handleDragMove(e) {
  if (!cropState.isDragging) return;
  if (e.cancelable) e.preventDefault();
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const newLeft = clientX - cropState.startX;
  const newTop = clientY - cropState.startY;

  const containerWidth = cropContainer.clientWidth || 364;
  const containerHeight = cropContainer.clientHeight || 200;
  const scale = cropState.baseScale * cropState.zoom;
  const scaledWidth = imagePreview.naturalWidth * scale;
  const scaledHeight = imagePreview.naturalHeight * scale;

  const minLeft = containerWidth - scaledWidth;
  const minTop = containerHeight - scaledHeight;

  cropState.imgLeft = Math.min(0, Math.max(minLeft, newLeft));
  cropState.imgTop = Math.min(0, Math.max(minTop, newTop));
  hasImageBeenCropped = true;

  updateCropperTransform();
}

function handleDragEnd() {
  cropState.isDragging = false;
}

function handleZoomChange(e) {
  const containerWidth = cropContainer.clientWidth || 364;
  const containerHeight = cropContainer.clientHeight || 200;
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;

  const oldZoom = cropState.zoom;
  const newZoom = parseFloat(e.target.value);
  cropState.zoom = newZoom;

  const scaleOld = cropState.baseScale * oldZoom;
  const scaleNew = cropState.baseScale * newZoom;

  const ix = (cx - cropState.imgLeft) / scaleOld;
  const iy = (cy - cropState.imgTop) / scaleOld;

  const newLeft = cx - ix * scaleNew;
  const newTop = cy - iy * scaleNew;

  const scaledWidth = imagePreview.naturalWidth * scaleNew;
  const scaledHeight = imagePreview.naturalHeight * scaleNew;
  const minLeft = containerWidth - scaledWidth;
  const minTop = containerHeight - scaledHeight;

  cropState.imgLeft = Math.min(0, Math.max(minLeft, newLeft));
  cropState.imgTop = Math.min(0, Math.max(minTop, newTop));
  hasImageBeenCropped = true;

  updateCropperTransform();
}

function getCroppedBase64() {
  const containerWidth = cropContainer.clientWidth || 364;
  const containerHeight = cropContainer.clientHeight || 200;

  if (!imagePreview.naturalWidth || !imagePreview.naturalHeight) {
    return currentBase64Image;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = Math.round(600 * (containerHeight / containerWidth));
  const ctx = canvas.getContext("2d");

  const scale = cropState.baseScale * cropState.zoom;
  const sx = -cropState.imgLeft / scale;
  const sy = -cropState.imgTop / scale;
  const sWidth = containerWidth / scale;
  const sHeight = containerHeight / scale;

  ctx.drawImage(imagePreview, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Run application bootloader
document.addEventListener("DOMContentLoaded", init);
