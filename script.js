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
// Обновляем объект categories, заменяя "jackets" на "cuffs"
const categories = {
  shirts: "рубашки",
  tshirts: "футболки",
  blouses: "блузы",
  pants: "брюки",
  shorts: "шорты",
  cuffs: "манжеты",
  accessories: "аксессуары",
}

// Удаляем mockProducts и добавляем конфигурацию для загрузки товаров
const PRODUCTS_CONFIG = {
  // Максимальное количество товаров для проверки в каждой категории
  maxItemsToCheck: 20,
  // Максимальное количество изображений для каждого товара
  maxImagesPerItem: 10,
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

// Обновляем функцию showCategory для показа загрузки
function showCategory(category) {
  currentCategory = category
  categoryTitle.textContent = categories[category] || category

  showLoading()

  // Загружаем товары категории
  loadCategoryProducts(category)
    .then(() => {
      hideLoading()
      showPage("products")
    })
    .catch((error) => {
      console.error("Ошибка загрузки категории:", error)
      hideLoading()
      showError()
    })
}

// Заменяем функцию loadCategoryProducts полностью
async function loadCategoryProducts(category) {
  try {
    const categoryProducts = await loadProductsFromDirectory(category)
    products[category] = categoryProducts

    productsGrid.innerHTML = ""

    if (categoryProducts.length === 0) {
      productsGrid.innerHTML = '<div class="no-products">Товары не найдены</div>'
      return
    }

    categoryProducts.forEach((product) => {
      const productCard = createProductCard(product)
      productsGrid.appendChild(productCard)
    })
  } catch (error) {
    console.error("Ошибка загрузки товаров категории:", error)
    showError()
  }
}

// Добавляем новую функцию для загрузки товаров из директории
async function loadProductsFromDirectory(category) {
  const products = []

  // Проверяем товары от item1 до maxItemsToCheck
  for (let i = 1; i <= PRODUCTS_CONFIG.maxItemsToCheck; i++) {
    const itemId = `item${i}`

    try {
      // Пытаемся загрузить описание товара
      const product = await loadSingleProduct(category, itemId)
      if (product) {
        products.push(product)
      }
    } catch (error) {
      // Если товар не найден, прекращаем поиск в этой категории
      console.log(`Товар ${itemId} в категории ${category} не найден, завершаем поиск`)
      break
    }
  }

  return products
}

// Добавляем функцию для загрузки одного товара
async function loadSingleProduct(category, itemId) {
  try {
    // Загружаем описание товара
    const descriptionUrl = `clothes/${category}/${itemId}/${itemId}.txt`
    const descriptionResponse = await fetch(descriptionUrl)

    if (!descriptionResponse.ok) {
      throw new Error(`Описание товара не найдено: ${descriptionUrl}`)
    }

    const descriptionText = await descriptionResponse.text()
    const [name, description, priceText] = descriptionText.trim().split("|")

    if (!name || !description || !priceText) {
      throw new Error(`Неверный формат описания для ${itemId}`)
    }

    // Извлекаем цену из текста (убираем "руб." и парсим число)
    const price = Number.parseInt(priceText.replace(/[^\d]/g, "")) || 0

    // Загружаем изображения товара
    const images = await loadProductImages(category, itemId)

    if (images.length === 0) {
      throw new Error(`Изображения не найдены для ${itemId}`)
    }

    return {
      id: `${category}_${itemId}`,
      name: name.trim(),
      description: description.trim(),
      price: price,
      images: images,
      category: category,
      itemId: itemId,
    }
  } catch (error) {
    console.error(`Ошибка загрузки товара ${itemId}:`, error)
    return null
  }
}

// Добавляем функцию для загрузки изображений товара
async function loadProductImages(category, itemId) {
  const images = []

  // Проверяем изображения от _1.jpg до _maxImagesPerItem.jpg
  for (let i = 1; i <= PRODUCTS_CONFIG.maxImagesPerItem; i++) {
    const imageUrl = `clothes/${category}/${itemId}/${itemId}_${i}.jpg`

    try {
      // Проверяем существование изображения
      const response = await fetch(imageUrl, { method: "HEAD" })
      if (response.ok) {
        images.push(imageUrl)
      } else {
        // Если изображение не найдено, прекращаем поиск
        break
      }
    } catch (error) {
      // Если ошибка при проверке, прекращаем поиск
      break
    }
  }

  return images
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
