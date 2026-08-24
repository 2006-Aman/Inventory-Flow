# 📄 Page Controllers — Flow Charts & Architecture

> **Scope:** All 12 JavaScript controller files inside `phase01/js/pages/`  
> Each page controller follows a common init → load data → render UI pattern with API + LocalStorage fallback.

---

## 📑 Table of Contents

- [Common Architecture Pattern](#-common-architecture-pattern)
- [1. dashboard.js — Dashboard Controller](#1-dashboardjs--dashboard-controller)
- [2. addProduct.js — Add / Edit Product Controller](#2-addproductjs--add--edit-product-controller)
- [3. inventory.js — Inventory Catalog Controller](#3-inventoryjs--inventory-catalog-controller)
- [4. sales.js — Record Sale Controller](#4-salesjs--record-sale-controller)
- [5. salesHistory.js — Sales History Ledger Controller](#5-saleshistoryjs--sales-history-ledger-controller)
- [6. forecast.js — Demand Forecast Page Controller](#6-forecastjs--demand-forecast-page-controller)
- [7. reorder.js — Reorder Planning Controller](#7-reorderjs--reorder-planning-controller)
- [8. reports.js — Business Reports Controller](#8-reportsjs--business-reports-controller)
- [9. analytics.js — Advanced Analytics Controller](#9-analyticsjs--advanced-analytics-controller)
- [10. invoices.js — Invoice System Controller](#10-invoicesjs--invoice-system-controller)
- [11. profile.js — User Profile Controller](#11-profilejs--user-profile-controller)
- [12. settings.js — System Settings Controller](#12-settingsjs--system-settings-controller)
- [Shared Dependencies Map](#-shared-dependencies-map)

---

## 🏛 Common Architecture Pattern

Every page controller follows this standard lifecycle:

```mermaid
flowchart TD
    A["DOMContentLoaded Event"] --> B["initPageFunction()"]
    B --> C["checkServerStatus()"]
    C --> D{"JSON-Server<br/>Responding?"}
    D -->|"Yes ✅"| E["Show: ● Server Connected<br/>(Green)"]
    D -->|"No ❌"| F["Show: ● Server Offline<br/>(Red)"]
    E --> G["loadData()"]
    F --> G
    G --> H{"API fetch<br/>Successful?"}
    H -->|"Yes"| I["Use API Data<br/>(db.json)"]
    H -->|"No (catch)"| J["Fallback to<br/>LocalStorage"]
    I --> K["Render UI Components"]
    J --> K
    K --> L["Setup Event Listeners"]

    style D fill:#6366f1,color:#fff
    style H fill:#6366f1,color:#fff
    style E fill:#22c55e,color:#fff
    style F fill:#ef4444,color:#fff
    style J fill:#f59e0b,color:#000
```

### Common Data Flow Pattern

```mermaid
sequenceDiagram
    participant Page as Page Controller
    participant API as API Layer<br/>(productApi/salesApi)
    participant Server as JSON-Server<br/>(localhost:3000)
    participant LS as LocalStorage<br/>(storage.js)

    Page->>API: getProducts() / getSales()
    API->>Server: GET /products or /sales
    alt Server Online
        Server-->>API: JSON Response ✅
        API-->>Page: Array of records
    else Server Offline
        Server-->>API: ❌ Network Error
        API-->>Page: throws Error
        Page->>LS: getLocalProducts() / getLocalSales()
        LS-->>Page: Cached Array of records
    end
    Page->>Page: Render UI with data
```

---

## 1. `dashboard.js` — Dashboard Controller

**File:** `js/pages/dashboard.js` (1080 lines)  
**Page:** `dashboard.html`  
**Role:** Main command center — renders 12 KPI cards, 10+ Chart.js visualizations, live clock, and recent sales timeline.

### Initialization Flow

```mermaid
flowchart TD
    A["DOMContentLoaded /<br/>readyState check"] --> B["initDashboardPage()"]
    B --> C["setupLiveClock()<br/>⏰ HH:MM:SS + Date"]
    C --> D["loadDashboardData()"]
    D --> E["getProducts() → allProducts"]
    E --> F["getSales() → allSales"]
    F --> G{"Data Loaded?"}

    G --> H["render12KPIs()"]
    G --> I["render12Sparklines()"]
    G --> J["renderRevenueDemandChart()"]
    G --> K["renderTopSellingProductsList()"]
    G --> L["renderSpeedometerGauge()"]
    G --> M["renderMonthlySalesBarChart()"]
    G --> N["renderLowStockTable()"]
    G --> O["renderCategoryRadarChart()"]
    G --> P["renderCategoryBubbleOrbit()"]
    G --> Q["renderForecastVsActualChart()"]
    G --> R["renderRecentSalesTimeline()"]
    G --> S["setupRestockModalEvents()"]
    G --> T["setupDropdownListeners()"]

    style B fill:#6366f1,color:#fff
    style H fill:#0ea5e9,color:#fff
    style J fill:#0ea5e9,color:#fff
    style L fill:#0ea5e9,color:#fff
```

### 12 KPI Cards Calculation Architecture

```mermaid
flowchart LR
    subgraph "Grid 1 — Primary Metrics"
        K1["Total Products<br/>allProducts.length"]
        K2["Inventory Value<br/>Σ(stock × sellingPrice)"]
        K3["Today's Sales<br/>Σ revenue (date=today)"]
        K4["30-Day Revenue<br/>Σ(qty × sellingPrice)"]
        K5["30-Day Profit<br/>Σ(qty × (sell-cost))"]
        K6["Avg Daily Demand<br/>totalUnits ÷ 30"]
    end

    subgraph "Grid 2 — Operational Metrics"
        K7["Orders Logged<br/>allSales.length"]
        K8["Forecast Accuracy<br/>(1 − WAPE) × 100"]
        K9["Items Running Low<br/>stock ≤ ROP & > 0"]
        K10["Out of Stock<br/>stock === 0"]
        K11["Upcoming Reorders<br/>low + outOfStock"]
        K12["Business Health %<br/>(safe ÷ total) × 100"]
    end
```

### Chart Rendering Pipeline

```mermaid
flowchart TD
    A["allProducts + allSales"] --> B["Aggregate Data"]
    B --> C1["Revenue & Demand<br/>Line Chart (dual axis)"]
    B --> C2["Top Selling Products<br/>Progress Bars"]
    B --> C3["Stock Health Gauge<br/>Doughnut 180°"]
    B --> C4["Monthly Sales<br/>Vertical Bar Chart"]
    B --> C5["Category Valuation<br/>Radar Chart"]
    B --> C6["Category Bubbles<br/>Animated Orbit"]
    B --> C7["Forecast vs Actual<br/>Line Chart (dual)"]
    B --> C8["Recent Sales<br/>Timeline Feed"]
    B --> C9["12× Sparklines<br/>Mini Line Charts"]

    style A fill:#6366f1,color:#fff
```

---

## 2. `addProduct.js` — Add / Edit Product Controller

**File:** `js/pages/addProduct.js` (459 lines)  
**Page:** `add-product.html`  
**Role:** Handles both adding new products and editing existing ones via URL param `?id=`.

### Complete Page Flow

```mermaid
flowchart TD
    A["DOMContentLoaded"] --> B{"URL has ?id=<br/>parameter?"}
    B -->|"No"| C["ADD MODE"]
    B -->|"Yes"| D["EDIT MODE"]

    C --> E["Auto-generate SKU<br/>generateCategorySku()"]
    E --> F["Auto-generate Barcode<br/>generateRandomBarcode()"]
    F --> G["Setup Live Preview"]

    D --> H["Set title → 'Edit product'<br/>Button → 'Update product'"]
    H --> I["getProductById(id)<br/>from API"]
    I --> I2{"API Success?"}
    I2 -->|"Yes"| J["populateProductForm()<br/>Fill all fields"]
    I2 -->|"No"| J2["LocalStorage Fallback<br/>getLocalProducts().find()"]
    J2 --> J
    J --> G

    G --> K["User fills / edits form"]
    K --> L["LIVE PREVIEW updates<br/>in real-time"]
    L --> M["User clicks Save/Update"]

    M --> N["collectProductFormData()"]
    N --> O["validateProduct()"]
    O --> P{"Duplicate SKU<br/>Check"}
    P -->|"Duplicate"| Q["❌ Error: SKU exists"]
    P -->|"Unique"| R{"Edit Mode?"}

    R -->|"Edit"| S["updateProduct(id, data)<br/>API + LocalStorage"]
    R -->|"Add"| T["createProduct(data)<br/>API + LocalStorage"]

    S --> U["✅ Redirect to<br/>inventory.html"]
    T --> U

    style B fill:#6366f1,color:#fff
    style C fill:#22c55e,color:#fff
    style D fill:#0ea5e9,color:#fff
    style Q fill:#ef4444,color:#fff
    style U fill:#22c55e,color:#fff
```

### Live Preview Architecture

```mermaid
flowchart LR
    A["Form Input Fields<br/>(11 fields)"] -->|"input/change<br/>events"| B["updateLivePreview()"]
    B --> C["Preview Card Updates:<br/>• Product Name<br/>• Category Badge<br/>• Price Display<br/>• Stock Level<br/>• SKU / Barcode<br/>• Profit Margin %"]

    A2["Category Input<br/>change"] -->|"triggers"| D["updateCategorySku()<br/>Auto-regenerate SKU"]
    D --> B
```

---

## 3. `inventory.js` — Inventory Catalog Controller

**File:** `js/pages/inventory.js` (617 lines)  
**Page:** `inventory.html`  
**Role:** Full product catalog with search, multi-filter, sort, pagination, inline stock update, edit redirect, and delete.

### Page Initialization Flow

```mermaid
flowchart TD
    A["DOMContentLoaded"] --> B["initInventory()"]
    B --> C["checkServer()"]
    C --> D["loadProducts()<br/>→ allProducts[]"]
    D --> E["populateCategoryFilter()"]
    D --> F["populateSupplierFilter()"]
    D --> G["populateCategoryDatalist()"]
    E --> H["renderProducts(allProducts)"]
    F --> H
    G --> H
    H --> I["updateSummary()"]
    I --> J["setupFilters()"]
    J --> K["setupActions()"]
    K --> L["setupModalEvents()"]
    L --> M{"URL has ?q=<br/>search param?"}
    M -->|"Yes"| N["Pre-fill search box<br/>applyFilters()"]
    M -->|"No"| O["Ready ✅"]

    style B fill:#6366f1,color:#fff
    style H fill:#0ea5e9,color:#fff
```

### Filter & Render Pipeline

```mermaid
flowchart TD
    A["User Input Triggers"] --> B["applyFilters()"]

    subgraph "Filter Inputs"
        F1["🔍 Search Text<br/>(name, SKU, category)"]
        F2["📂 Category Dropdown"]
        F3["🏢 Supplier Dropdown"]
        F4["📊 Status Dropdown<br/>(In Stock / Low / Out)"]
        F5["🔽 Sort By<br/>(name, price, stock, date)"]
    end

    F1 --> B
    F2 --> B
    F3 --> B
    F4 --> B
    F5 --> B

    B --> C["filteredProductsList = <br/>allProducts.filter().sort()"]
    C --> D["renderProducts(filtered)"]
    D --> E["Paginate: 10 items/page"]
    E --> F["createProductRow() × N"]
    F --> G["renderPagination()"]

    style B fill:#6366f1,color:#fff
```

### Product CRUD Actions

```mermaid
flowchart LR
    subgraph "Row Actions"
        A1["✏️ Edit"] -->|"redirect"| B1["add-product.html?id=xxx"]
        A2["📦 Update Stock"] -->|"modal"| B2["Stock Modal<br/>+/- quantity"]
        A3["🗑️ Delete"] -->|"confirm"| B3["deleteProduct(id)<br/>API + LS"]
    end

    B2 --> C["updateProduct(id, newStock)"]
    C --> D["updateLocalStorageProduct()"]
    D --> E["loadProducts() → re-render"]
    B3 --> E
```

---

## 4. `sales.js` — Record Sale Controller

**File:** `js/pages/sales.js` (441 lines)  
**Page:** `sales.html`  
**Role:** Record a new sale transaction with product selection, live total calculation, stock decrement, and today's performance KPIs.

### Sale Transaction Flow

```mermaid
flowchart TD
    A["initSalesPage()"] --> B["setDefaultDateTime()"]
    B --> C["loadProductsData()<br/>→ allProducts[]"]
    C --> D["loadSalesData()<br/>→ allSales[]"]
    D --> E["populateProductDropdown()"]
    E --> F["setupSalesEvents()"]

    F --> G["User selects product<br/>from dropdown"]
    G --> H["showProductInfoCard()<br/>Price, Stock, Status, Profit/Unit"]
    H --> I["User enters Quantity"]
    I --> J["LIVE TOTAL Calculates:<br/>Total = Price × Qty<br/>Profit = (Sell−Cost) × Qty"]
    J --> K["User clicks<br/>'Complete Sale'"]

    K --> L{"Validation"}
    L -->|"Qty = 0"| M["❌ Quantity must be ≥ 1"]
    L -->|"Qty > Stock"| N["❌ Insufficient Stock"]
    L -->|"Valid ✅"| O["Build saleData Object"]

    O --> P["1️⃣ createSale(saleData)<br/>POST /sales API"]
    P --> Q["2️⃣ Save to LocalStorage<br/>saveSales()"]
    Q --> R["3️⃣ Decrement Stock<br/>newStock = stock − qty"]
    R --> S["4️⃣ calculateStockStatus()<br/>Update product status"]
    S --> T["5️⃣ updateProduct(id)<br/>PUT /products/:id API"]
    T --> U["6️⃣ Save updated product<br/>to LocalStorage"]
    U --> V["7️⃣ Refresh UI<br/>Dropdown + Performance + Feed"]
    V --> W["✅ Sale Complete!<br/>Form Reset"]

    style K fill:#0ea5e9,color:#fff
    style L fill:#6366f1,color:#fff
    style M fill:#ef4444,color:#fff
    style N fill:#ef4444,color:#fff
    style W fill:#22c55e,color:#fff
```

### Data Write Architecture (Dual Persistence)

```mermaid
sequenceDiagram
    participant User
    participant Sales as sales.js
    participant SalesAPI as salesApi.js
    participant ProdAPI as productApi.js
    participant Server as JSON-Server
    participant LS as LocalStorage

    User->>Sales: Click "Complete Sale"
    Sales->>Sales: Validate inputs
    Sales->>SalesAPI: createSale(saleData)
    SalesAPI->>Server: POST /sales
    Server-->>SalesAPI: Created sale ✅
    Sales->>LS: saveSales(localSales) (backup)
    
    Sales->>Sales: newStock = stock − quantity
    Sales->>Sales: calculateStockStatus()
    Sales->>ProdAPI: updateProduct(id, stock/status)
    ProdAPI->>Server: PUT /products/:id
    Server-->>ProdAPI: Updated product ✅
    Sales->>LS: saveProducts(localProducts) (backup)
    
    Sales-->>User: ✅ "Sale completed!"
```

---

## 5. `salesHistory.js` — Sales History Ledger Controller

**File:** `js/pages/salesHistory.js` (534 lines)  
**Page:** `sales-history.html`  
**Role:** Complete sales log with search, product/date filters, pagination (15/page), invoice modal, and CSV export.

### Page Flow

```mermaid
flowchart TD
    A["initSalesHistoryPage()"] --> B["checkServerStatus()"]
    B --> C["loadProductsData()"]
    C --> D["loadSalesData()"]
    D --> E["setupFilterListeners()"]
    E --> F["setupCsvExport()"]
    F --> G["setupInvoiceModalEvents()"]

    subgraph "Filter System"
        H1["🔍 Search<br/>(product, customer)"]
        H2["📦 Product Filter<br/>Dropdown"]
        H3["📅 From Date"]
        H4["📅 To Date"]
    end

    H1 --> I["applyFilters()"]
    H2 --> I
    H3 --> I
    H4 --> I

    I --> J["filteredSales =<br/>allSales.filter()"]
    J --> K["renderSalesTable()<br/>15 items/page"]
    K --> L["renderPagination()"]
    K --> M["updateKpiCards()"]

    subgraph "Actions"
        N1["📄 View Invoice"] -->|"modal"| N2["openInvoiceModal(saleId)<br/>GST Calculation"]
        N3["📥 Export CSV"] --> N4["generateCsvData()<br/>Download .csv file"]
    end

    style I fill:#6366f1,color:#fff
```

---

## 6. `forecast.js` — Demand Forecast Page Controller

**File:** `js/pages/forecast.js` (468 lines)  
**Page:** `forecast.html`  
**Role:** Runs the Hybrid Forecast Engine on all products, renders 4 KPI cards, forecast chart, top demand products, and product breakdown table.

### Forecast Engine Pipeline

```mermaid
flowchart TD
    A["initForecastPage()"] --> B["checkServerStatus()"]
    B --> C["loadDataAndRunEngine()"]

    C --> D["1️⃣ Load Products<br/>getProducts() → allProducts"]
    D --> E["2️⃣ Load Sales<br/>getSales() → allSales"]
    E --> F["3️⃣ Execute Forecast Engine<br/>calculateAllProductForecasts(<br/>allProducts, allSales, 7)"]

    F --> G["forecastResults[] =<br/>Array of forecast objects"]

    G --> H["renderKPIs()"]
    G --> I["renderForecastChart()"]
    G --> J["renderTop8Products()"]
    G --> K["renderBreakdownTable()"]
    G --> L["setupCsvExport()"]

    style F fill:#6366f1,color:#fff
    style G fill:#0ea5e9,color:#fff
```

### Forecast KPIs Calculation

```mermaid
flowchart LR
    subgraph "4 KPI Cards"
        K1["📊 7-Day Demand<br/>Σ forecastDemand"]
        K2["📈 30-Day Demand<br/>Σ(avgDailyDemand × 30)"]
        K3["🔔 Reorder Alerts<br/>Count: status = 'Reorder'"]
        K4["🎯 Forecast Accuracy<br/>(1 − WAPE) × 100%"]
    end
```

### Per-Product Forecast Result Object

```mermaid
flowchart TD
    A["Product + Sales Data"] --> B["buildObservedDailyDemand()"]
    B --> C["capOutliers() — MAD"]
    C --> D{"classifyDemandPattern()"}
    
    D -->|"≥35% zero days"| E["Intermittent → TSB"]
    D -->|"slope ≥ 0.08"| F["Trending → Holt's"]
    D -->|"otherwise"| G["Stable → EWMA"]

    E --> H["avgDailyDemand"]
    F --> H
    G --> H

    H --> I["forecastDemand =<br/>avgDailyDemand × 7 days"]
    I --> J["reorderPoint =<br/>(demand × leadTime)<br/>+ safetyStock"]
    J --> K["status: In Stock /<br/>Low Stock / Reorder"]
    K --> L["confidence:<br/>High / Medium / Low"]

    style D fill:#6366f1,color:#fff
    style E fill:#ef4444,color:#fff
    style F fill:#eab308,color:#000
    style G fill:#22c55e,color:#fff
```

---

## 7. `reorder.js` — Reorder Planning Controller

**File:** `js/pages/reorder.js` (407 lines)  
**Page:** `reorder.html`  
**Role:** Runs forecast engine, shows 4 stock status KPIs, renders reorder table with recommended quantities, and provides interactive restock modal.

### Page Flow

```mermaid
flowchart TD
    A["initReorderPage()"] --> B["checkServerStatus()"]
    B --> C["loadDataAndRunEngine()"]
    C --> D["1. getProducts() → allProducts"]
    D --> E["2. getSales() → allSales"]
    E --> F["3. calculateAllProductForecasts()<br/>→ forecastResults[]"]
    F --> G["renderKPIs()"]
    G --> H["renderReorderTable()"]
    H --> I["setupModalEvents()"]
    I --> J["setupCsvExport()"]

    style F fill:#6366f1,color:#fff
```

### 4 Stock Status KPIs

```mermaid
flowchart LR
    subgraph "Reorder KPI Cards"
        K1["🟢 Safe Stock<br/>stock > ROP & > safetyStock"]
        K2["🟡 Low Stock<br/>stock ≤ ROP & > safetyStock<br/>& stock > 0"]
        K3["🔴 Critical<br/>stock ≤ safetyStock<br/>& stock > 0"]
        K4["⚫ Out of Stock<br/>stock === 0"]
    end
```

### Restock Modal Flow

```mermaid
flowchart TD
    A["User clicks 'Restock'<br/>on table row"] --> B["Open Restock Modal<br/>Pre-fill recommended qty"]
    B --> C["Recommended Qty =<br/>ROP − currentStock + safetyStock"]
    C --> D["User enters<br/>restock quantity"]
    D --> E["Click 'Confirm Restock'"]
    E --> F["newStock = current + restockQty"]
    F --> G["calculateStockStatus(newStock)"]
    G --> H["updateProduct(id, stock/status)<br/>API + LocalStorage"]
    H --> I["Reload Engine & Re-render"]
    I --> J["✅ Stock Restocked!"]

    style E fill:#0ea5e9,color:#fff
    style J fill:#22c55e,color:#fff
```

---

## 8. `reports.js` — Business Reports Controller

**File:** `js/pages/reports.js` (551 lines)  
**Page:** `reports.html`  
**Role:** Date-range filtered business performance reports with 5 KPI cards, daily revenue bar chart, category doughnut, monthly breakdown table, top products ranking, and CSV export.

### Initialization & Filter Flow

```mermaid
flowchart TD
    A["initReportsPage()"] --> B["checkServerStatus()"]
    B --> C["loadData()<br/>products + sales"]
    C --> D["setupDateDefaults()<br/>Last 30 days"]
    D --> E["setupFilterListeners()"]
    E --> F["applyFiltersAndRender()"]
    F --> G["setupCsvExport()"]

    subgraph "Date Range Presets"
        P1["30 Days"]
        P2["90 Days"]
        P3["Custom Range"]
        P4["All Time"]
    end

    P1 --> F
    P2 --> F
    P3 --> F
    P4 --> F

    F --> H["filteredSales =<br/>allSales.filter(date in range)"]
    H --> I["renderKPIs()"]
    H --> J["renderDailyRevenueChart()<br/>Bar Chart"]
    H --> K["renderCategoryDoughnut()<br/>Ring Chart"]
    H --> L["renderMonthlyTable()"]
    H --> M["renderTopProducts()"]

    style F fill:#6366f1,color:#fff
```

### 5 Report KPIs

```mermaid
flowchart LR
    subgraph "Report KPI Cards"
        K1["💰 Total Revenue<br/>Σ(qty × sellingPrice)"]
        K2["📈 Net Profit<br/>Σ(qty × (sell − cost))"]
        K3["📋 Total Orders<br/>filteredSales.length"]
        K4["📦 Units Sold<br/>Σ quantity"]
        K5["📊 Avg Order Value<br/>Revenue ÷ Orders"]
    end
```

---

## 9. `analytics.js` — Advanced Analytics Controller

**File:** `js/pages/analytics.js` (443 lines)  
**Page:** `analytics.html`  
**Role:** Advanced business analytics — inventory valuation, stock turnover, day-of-week trends, revenue vs orders combo chart, stock health distribution, and top categories ranking.

### Flow

```mermaid
flowchart TD
    A["initAnalyticsPage()"] --> B["checkServerStatus()"]
    B --> C["loadData()<br/>products + sales"]
    C --> D["renderKPIs()"]
    D --> E["renderDayOfWeekChart()<br/>Bar Chart"]
    E --> F["renderRevenueOrdersChart()<br/>Combo: Line + Bar"]
    F --> G["renderStockHealthChart()<br/>Doughnut Ring"]
    G --> H["renderTopCategoriesTable()"]

    style A fill:#6366f1,color:#fff
```

### 4 Analytics KPIs

```mermaid
flowchart LR
    subgraph "Analytics KPI Cards"
        K1["💎 Inventory Valuation<br/>Σ(stock × sellingPrice)"]
        K2["🔄 Stock Turnover<br/>unitsSold ÷ avgInventory"]
        K3["🏆 Top Category<br/>Category with most revenue"]
        K4["📊 Avg Units/Order<br/>totalUnits ÷ totalOrders"]
    end
```

### Chart Architecture

```mermaid
flowchart TD
    A["allSales + allProducts"] --> B["Aggregate by Day-of-Week"]
    A --> C["Aggregate by Month"]
    A --> D["Count by Stock Status"]
    A --> E["Group by Category"]

    B --> F["📊 Sales by Day of Week<br/>Bar Chart (Mon-Sun)"]
    C --> G["📈 Revenue vs Orders<br/>Combo Chart (Line + Bar)"]
    D --> H["🍩 Stock Health Distribution<br/>Doughnut (Safe/Low/Critical/Out)"]
    E --> I["📋 Top Categories Table<br/>Ranked by Revenue"]

    style A fill:#6366f1,color:#fff
```

---

## 10. `invoices.js` — Invoice System Controller

**File:** `js/pages/invoices.js` (401 lines)  
**Page:** `invoices.html`  
**Role:** Invoice list from sales data, interactive invoice preview modal with GST/Tax calculation, print-ready PDF export, search/filter, pagination.

### Flow

```mermaid
flowchart TD
    A["initInvoicesPage()"] --> B["setupLiveClock()"]
    B --> C["loadInvoiceData()<br/>products + sales"]
    C --> D["setupFilters()<br/>search + date"]
    D --> E["setupInvoiceModal()"]
    E --> F["setupCsvExport()"]
    F --> G{"URL has ?saleId=<br/>parameter?"}
    G -->|"Yes"| H["Auto-open invoice<br/>openInvoiceModal(saleId)"]
    G -->|"No"| I["Render Invoice List"]

    style A fill:#6366f1,color:#fff
    style H fill:#0ea5e9,color:#fff
```

### Invoice Modal Architecture

```mermaid
flowchart TD
    A["User clicks 'View Invoice'<br/>on a sale row"] --> B["openInvoiceModal(saleId)"]
    B --> C["Find sale in allSales"]
    C --> D["Find product in allProducts"]
    D --> E["Calculate Invoice Data"]

    subgraph "Invoice Calculation"
        E1["Subtotal = qty × sellingPrice"]
        E2["GST/Tax = Subtotal × taxRate%<br/>(from system_settings)"]
        E3["Grand Total = Subtotal + GST"]
        E4["Profit = qty × (sell − cost)"]
    end

    E --> E1
    E1 --> E2
    E2 --> E3
    E3 --> E4

    E4 --> F["Render Invoice Sheet<br/>in Modal"]
    F --> G["🖨️ Print Invoice<br/>window.print()"]

    style B fill:#6366f1,color:#fff
```

---

## 11. `profile.js` — User Profile Controller

**File:** `js/pages/profile.js` (125 lines)  
**Page:** `profile.html`  
**Role:** View/edit user profile info, change password — all tied to `inventory_current_user` in LocalStorage.

### Flow

```mermaid
flowchart TD
    A["DOMContentLoaded"] --> B["initProfilePage()"]
    B --> C["loadProfileData()"]
    B --> D["setupProfileFormHandler()"]
    B --> E["setupSecurityFormHandler()"]

    C --> F["getCurrentUser()<br/>from LocalStorage"]
    F --> G["Fill Form Fields:<br/>firstName, lastName, email,<br/>phone, organization, designation"]
    G --> H["Update Header:<br/>name, role, email display"]
    H --> I["Show Sales Count:<br/>getLocalSales().length"]
    I --> J["updateGlobalUserUI()"]

    style B fill:#6366f1,color:#fff
```

### Profile Update Flow

```mermaid
flowchart TD
    A["User edits profile fields"] --> B["Click 'Save Changes'"]
    B --> C["Collect form values"]
    C --> D["saveCurrentUser(user)<br/>→ LocalStorage"]
    D --> E["loadProfileData()<br/>Refresh display"]
    E --> F["updateGlobalUserUI()<br/>Update topbar name/avatar"]
    F --> G["✅ Toast: 'Saved!'"]

    style G fill:#22c55e,color:#fff
```

### Password Change Flow

```mermaid
flowchart TD
    A["User enters<br/>Current + New + Confirm"] --> B["Click 'Update Password'"]
    B --> C{"currentPass<br/>empty?"}
    C -->|"Yes"| D["❌ Enter current password"]
    C -->|"No"| E{"newPass ===<br/>confirmPass?"}
    E -->|"No"| F["❌ Passwords don't match"]
    E -->|"Yes"| G["updateUserPassword(<br/>current, new)"]
    G --> H{"Correct current<br/>password?"}
    H -->|"No"| I["❌ Wrong password"]
    H -->|"Yes"| J["✅ Password Updated!"]

    style D fill:#ef4444,color:#fff
    style F fill:#ef4444,color:#fff
    style I fill:#ef4444,color:#fff
    style J fill:#22c55e,color:#fff
```

---

## 12. `settings.js` — System Settings Controller

**File:** `js/pages/settings.js` (275 lines)  
**Page:** `settings.html`  
**Role:** Application configuration with tabbed sections — Inventory config, Business config, Notification preferences, and Data backup/export/import/reset.

### Flow

```mermaid
flowchart TD
    A["initSettingsPage()"] --> B["checkServerStatus()"]
    B --> C["setupTabSwitching()"]
    C --> D["loadSettingsValues()<br/>from system_settings LS key"]
    D --> E["setupFormEventHandlers()"]
    E --> F["setupDataBackupHandlers()"]

    style A fill:#6366f1,color:#fff
```

### Tab Architecture

```mermaid
flowchart LR
    subgraph "Settings Tabs"
        T1["📦 Inventory Settings<br/>• Default Lead Time<br/>• Safety Stock Buffer<br/>• Critical Level %<br/>• Auto Reorder Toggle"]
        T2["🏪 Business Settings<br/>• Store Name<br/>• Currency Symbol<br/>• Business Email<br/>• Tax Rate %"]
        T3["🔔 Notifications<br/>• Low Stock Banner<br/>• Email Alerts<br/>• Min Margin Alert %"]
        T4["💾 Data Management<br/>• Export JSON Backup<br/>• Import JSON Backup<br/>• Reset Cache Data"]
    end
```

### Data Backup Flow

```mermaid
flowchart TD
    subgraph "Export JSON"
        A1["Click 'Export'"] --> A2["Collect:<br/>products + sales + settings"]
        A2 --> A3["Generate JSON file"]
        A3 --> A4["📥 Download<br/>Inventory_Backup_DATE.json"]
    end

    subgraph "Import JSON"
        B1["Click 'Import'"] --> B2["File picker opens"]
        B2 --> B3["Parse JSON file"]
        B3 --> B4["Restore to LocalStorage:<br/>products, sales, settings"]
        B4 --> B5["🔄 Page Reload"]
    end

    subgraph "Reset Cache"
        C1["Click 'Reset'"] --> C2["confirm() dialog"]
        C2 --> C3["Remove:<br/>local_products<br/>local_sales<br/>system_settings"]
        C3 --> C4["🔄 Page Reload"]
    end
```

---

## 🔗 Shared Dependencies Map

Shows which shared modules each page controller depends on:

```mermaid
flowchart TD
    subgraph "Page Controllers (js/pages/)"
        P1["dashboard.js"]
        P2["addProduct.js"]
        P3["inventory.js"]
        P4["sales.js"]
        P5["salesHistory.js"]
        P6["forecast.js"]
        P7["reorder.js"]
        P8["reports.js"]
        P9["analytics.js"]
        P10["invoices.js"]
        P11["profile.js"]
        P12["settings.js"]
    end

    subgraph "API Layer (js/api/)"
        API["api.js"]
        PAPI["productApi.js"]
        SAPI["salesApi.js"]
        CAPI["categoryApi.js"]
        UAPI["userApi.js"]
    end

    subgraph "Forecast Engine (js/forecast/)"
        MA["movingAverage.js"]
        FC["forecast.js"]
        RP["reorderPoint.js"]
    end

    subgraph "Storage (js/storage/)"
        ST["storage.js"]
    end

    subgraph "Components (js/components/)"
        SB["sidebar.js"]
    end

    P1 --> PAPI
    P1 --> SAPI
    P1 --> ST
    P1 --> FC
    P1 --> SB

    P2 --> PAPI
    P2 --> ST
    P2 --> RP
    P2 --> SB

    P3 --> PAPI
    P3 --> ST
    P3 --> RP
    P3 --> SB

    P4 --> PAPI
    P4 --> SAPI
    P4 --> ST
    P4 --> RP
    P4 --> SB

    P5 --> PAPI
    P5 --> SAPI
    P5 --> ST
    P5 --> SB

    P6 --> PAPI
    P6 --> SAPI
    P6 --> ST
    P6 --> FC
    P6 --> SB

    P7 --> PAPI
    P7 --> SAPI
    P7 --> ST
    P7 --> FC
    P7 --> SB

    P8 --> PAPI
    P8 --> SAPI
    P8 --> ST
    P8 --> SB

    P9 --> PAPI
    P9 --> SAPI
    P9 --> ST
    P9 --> SB

    P10 --> PAPI
    P10 --> SAPI
    P10 --> ST
    P10 --> SB

    P11 --> ST
    P11 --> SB

    P12 --> PAPI
    P12 --> SAPI
    P12 --> ST
    P12 --> SB

    style API fill:#6366f1,color:#fff
    style ST fill:#f59e0b,color:#000
    style FC fill:#22c55e,color:#fff
    style SB fill:#0ea5e9,color:#fff
```

### Dependency Summary Table

| Page Controller | productApi | salesApi | storage.js | forecast engine | sidebar.js |
|:---|:---:|:---:|:---:|:---:|:---:|
| **dashboard.js** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **addProduct.js** | ✅ | ❌ | ✅ | ✅ (ROP) | ✅ |
| **inventory.js** | ✅ | ❌ | ✅ | ✅ (ROP) | ✅ |
| **sales.js** | ✅ | ✅ | ✅ | ✅ (Status) | ✅ |
| **salesHistory.js** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **forecast.js** | ✅ | ✅ | ✅ | ✅ (Full) | ✅ |
| **reorder.js** | ✅ | ✅ | ✅ | ✅ (Full) | ✅ |
| **reports.js** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **analytics.js** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **invoices.js** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **profile.js** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **settings.js** | ✅ | ✅ | ✅ | ❌ | ✅ |

---

<p align="center">
  <strong>Generated for InventoryIQ — Phase 01 Page Controllers Documentation</strong>
</p>
