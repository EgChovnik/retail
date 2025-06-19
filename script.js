// Telegram WebApp initialization
const tg = window.Telegram?.WebApp
if (tg) {
  tg.expand()
  tg.ready()
}

// Application state
let currentPage = "categories"
let currentCategory = ""
let currentProduct = null
const cart = []
const products = {}
const categories = {
  shirts: "рубашки",
  tshirts: "футболки",
  blouses: "блузы",
  pants: "брюки",
  shorts: "шорты",
  jackets: "манжеты",
  accessories: "аксессуары",
}

// Mock data for demonstration
const mockProducts = {
  shirts: [
    {
      id: "shirt1",
      name: "Рубашка BTNQ",
      description: "Зеленая широкая/белая/фиолетовая",
      price: 8500,
      images: [
        "/placeholder.svg?height=400&width=300",
        "/placeholder.svg?height=400&width=300",
        "/placeholder.svg?height=400&width=300",
      ],
    },
    {
      id: "shirt2",
      name: "Рубашка Classic",
      description: "Белая/бордовая, зеленая, синяя вышивка",
      price: 7500,
      images: ["/placeholder.svg?height=400&width=300", "/placeholder.svg?height=400&width=300"],
    },
  ],
  tshirts: [
    {
      id: "tshirt1",
      name: "Футболка Basic",
      description: "Хлопковая футболка базовых цветов",
      price: 3500,
      images: ["/placeholder.svg?height=400&width=300"],
    },
  ],
  blouses: [
    {
      id: "blouse1",
      name: "Блуза Elegant",
      description: "Шелковая блуза для особых случаев",
      price: 9500,
      images: ["/placeholder.svg?height=400&width=300"],
    },
  ],
}

// DOM elements
const backBtn = document.getElementById("backBtn")
const cartBtn = document.getElementById("cartBtn")
const cartCount = document.getElementById("cartCount")
const categoriesPage = document.getElementById("categoriesPage")
const productsPage = document.getElementById("productsPage")
const productDetailPage = document.getElementById("productDetailPage")
const categoryTitle = document.getElementById("categoryTitle")
const productsGrid = document.getElementById("productsGrid")
const loading = document.getElementById("loading")
const error = document.getElementById("error")

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  setupEventListeners()
  loadLogo()
})

function initializeApp() {
  showPage("categories")
  updateCartUI()

  // Setup Telegram WebApp main button
  if (tg) {
    tg.MainButton.setText("Оформить заказ")
    tg.MainButton.onClick(handleOrderSubmit)
    updateMainButton()
  }
}

function setupEventListeners() {
  // Back button
  backBtn.addEventListener("click", handleBackButton)

  // Category items
  document.querySelectorAll(".category-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const category = e.currentTarget.dataset.category
      showCategory(category)
    })
  })

  // Cart button (for future cart page)
  cartBtn.addEventListener("click", () => {
    // Future: show cart page
    console.log("Cart clicked", cart)
  })
}

function loadLogo() {
  const logo = document.getElementById("logo")
  logo.onerror = () => {
    logo.style.display = "none"
  }
}

function showPage(page) {
  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => (p.style.display = "none"))

  // Show target page
  switch (page) {
    case "categories":
      categoriesPage.style.display = "block"
      backBtn.style.display = "none"
      break
    case "products":
      productsPage.style.display = "block"
      backBtn.style.display = "block"
      break
    case "product-detail":
      productDetailPage.style.display = "block"
      backBtn.style.display = "block"
      break
  }

  currentPage = page
}

function handleBackButton() {
  switch (currentPage) {
    case "products":
      showPage("categories")
      break
    case "product-detail":
      showCategory(currentCategory)
      break
  }
}

function showCategory(category) {
  currentCategory = category
  categoryTitle.textContent = categories[category] || category

  showLoading()

  // Simulate loading delay
  setTimeout(() => {
    loadCategoryProducts(category)
    hideLoading()
    showPage("products")
  }, 500)
}

function loadCategoryProducts(category) {
  const categoryProducts = mockProducts[category] || []
  products[category] = categoryProducts

  productsGrid.innerHTML = ""

  categoryProducts.forEach((product) => {
    const productCard = createProductCard(product)
    productsGrid.appendChild(productCard)
  })
}

function createProductCard(product) {
  const card = document.createElement("div")
  card.className = "product-card"
  card.dataset.productId = product.id

  // Check if product is in cart
  const isInCart = cart.some((item) => item.id === product.id)
  if (isInCart) {
    card.classList.add("selected")
  }

  card.innerHTML = `
        <div class="product-image-container">
            <img class="product-image" src="${product.images[0]}" alt="${product.name}" loading="lazy">
            <button class="favorite-btn ${isInCart ? "active" : ""}" onclick="toggleProductInCart('${product.id}', event)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isInCart ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
            ${product.images.length > 1 ? createImageNavigation(product.images, product.id) : ""}
        </div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-description">${product.description}</div>
            <div class="product-price">${product.price.toLocaleString("ru-RU")} руб.</div>
        </div>
    `

  // Add click handler for product detail
  card.addEventListener("click", (e) => {
    if (!e.target.closest(".favorite-btn") && !e.target.closest(".image-nav")) {
      showProductDetail(product)
    }
  })

  // Setup image navigation if multiple images
  if (product.images.length > 1) {
    setupImageNavigation(card, product)
  }

  return card
}

function createImageNavigation(images, productId) {
  if (images.length <= 1) return ""

  const dots = images
    .map((_, index) => `<div class="image-dot ${index === 0 ? "active" : ""}" data-index="${index}"></div>`)
    .join("")

  return `<div class="image-nav">${dots}</div>`
}

function setupImageNavigation(card, product) {
  const image = card.querySelector(".product-image")
  const dots = card.querySelectorAll(".image-dot")

  dots.forEach((dot, index) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation()

      // Update image
      image.src = product.images[index]

      // Update dots
      dots.forEach((d) => d.classList.remove("active"))
      dot.classList.add("active")

      // Haptic feedback
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred("light")
      }
    })
  })
}

function toggleProductInCart(productId, event) {
  event.stopPropagation()

  const product = findProductById(productId)
  if (!product) return

  const existingIndex = cart.findIndex((item) => item.id === productId)
  const card = document.querySelector(`[data-product-id="${productId}"]`)
  const favoriteBtn = card.querySelector(".favorite-btn")
  const heartIcon = favoriteBtn.querySelector("svg")

  if (existingIndex >= 0) {
    // Remove from cart
    cart.splice(existingIndex, 1)
    card.classList.remove("selected")
    favoriteBtn.classList.remove("active")
    heartIcon.setAttribute("fill", "none")
  } else {
    // Add to cart
    cart.push(product)
    card.classList.add("selected")
    favoriteBtn.classList.add("active")
    heartIcon.setAttribute("fill", "currentColor")
  }

  updateCartUI()
  updateMainButton()

  // Haptic feedback
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred("medium")
  }
}

function findProductById(productId) {
  for (const category in products) {
    const product = products[category].find((p) => p.id === productId)
    if (product) return product
  }
  return null
}

function showProductDetail(product) {
  currentProduct = product

  // Setup images
  const imagesContainer = document.getElementById("productImages")
  imagesContainer.innerHTML = ""

  product.images.forEach((image, index) => {
    const img = document.createElement("img")
    img.className = `product-detail-image ${index === 0 ? "active" : ""}`
    img.src = image
    img.alt = product.name
    imagesContainer.appendChild(img)
  })

  // Setup image dots if multiple images
  const imageDots = document.getElementById("imageDots")
  if (product.images.length > 1) {
    imageDots.style.display = "flex"
    imageDots.innerHTML = product.images
      .map(
        (_, index) =>
          `<div class="image-dot ${index === 0 ? "active" : ""}" onclick="showProductImage(${index})"></div>`,
      )
      .join("")
  } else {
    imageDots.style.display = "none"
  }

  // Setup product info
  document.getElementById("productDetailName").textContent = product.name
  document.getElementById("productDetailDescription").textContent = product.description
  document.getElementById("productDetailPrice").textContent = `${product.price.toLocaleString("ru-RU")} руб.`

  // Setup add to cart button
  const addToCartBtn = document.getElementById("addToCartBtn")
  const isInCart = cart.some((item) => item.id === product.id)
  addToCartBtn.textContent = isInCart ? "Убрать из корзины" : "Добавить в корзину"
  addToCartBtn.onclick = () => toggleProductInCartFromDetail(product.id)

  showPage("product-detail")
}

function showProductImage(index) {
  const images = document.querySelectorAll(".product-detail-image")
  const dots = document.querySelectorAll("#imageDots .image-dot")

  images.forEach((img, i) => {
    img.classList.toggle("active", i === index)
  })

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index)
  })
}

function toggleProductInCartFromDetail(productId) {
  const product = findProductById(productId)
  if (!product) return

  const existingIndex = cart.findIndex((item) => item.id === productId)
  const addToCartBtn = document.getElementById("addToCartBtn")

  if (existingIndex >= 0) {
    cart.splice(existingIndex, 1)
    addToCartBtn.textContent = "Добавить в корзину"
  } else {
    cart.push(product)
    addToCartBtn.textContent = "Убрать из корзины"
  }

  updateCartUI()
  updateMainButton()

  // Haptic feedback
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred("medium")
  }
}

function updateCartUI() {
  cartCount.textContent = cart.length
  cartCount.style.display = cart.length > 0 ? "flex" : "none"
}

function updateMainButton() {
  if (!tg) return

  if (cart.length > 0) {
    tg.MainButton.setText(`Оформить заказ (${cart.length})`)
    tg.MainButton.show()
  } else {
    tg.MainButton.hide()
  }
}

function handleOrderSubmit() {
  if (cart.length === 0) return

  const orderData = cart.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
  }))

  // Send data to Telegram bot
  if (tg) {
    tg.sendData(JSON.stringify(orderData))
  }

  console.log("Order submitted:", orderData)
}

function showLoading() {
  loading.style.display = "block"
}

function hideLoading() {
  loading.style.display = "none"
}

function showError() {
  error.style.display = "block"
  hideLoading()
}

// Global functions for inline event handlers
window.toggleProductInCart = toggleProductInCart
window.showProductImage = showProductImage
