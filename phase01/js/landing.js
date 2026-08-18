/* ==========================================================================
   INVENTORYIQ LANDING PAGE SCROLL & INTERACTIVE ANIMATIONS
   - Text Reveal on Scroll
   - Zoom Scroll & 3D Tilt Mockup Effect
   - Ticker Marquee Infinite Component
   - Scroll Rotation Cards
   - Parallax Background Layering
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initZoomScrollEffect();
    initScrollTextReveal();
    initScrollRotationCards();
    initParallaxOrbs();
    initScrollDeliveryTruck();
    initRopCalculator();
    initDemandSimulator();
});

/* 1. ZOOM SCROLL EFFECT & 3D MOCKUP TILT */
function initZoomScrollEffect() {
    const mockup = document.querySelector(".hero-mockup-wrap");
    if (!mockup) return;

    window.addEventListener("scroll", () => {
        const scrolled = window.scrollY;
        const rate = Math.min(scrolled / 400, 1);
        
        // Rotate from 15deg to 0deg, scale from 0.92 to 1
        const rotateX = 15 * (1 - rate);
        const scale = 0.92 + (0.08 * rate);

        mockup.style.transform = `perspective(1200px) rotateX(${rotateX}deg) scale(${scale})`;
        mockup.style.opacity = `${0.7 + (0.3 * rate)}`;
    });
}

/* 2. TEXT REVEAL ON SCROLL */
function initScrollTextReveal() {
    const revealEls = document.querySelectorAll(".section-title, .hero-title, .section-desc, .hero-subtitle");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("text-revealed");
            }
        });
    }, { threshold: 0.15 });

    revealEls.forEach(el => observer.observe(el));
}

/* 3. SCROLL ROTATION CARDS & 3D PARALLAX HOVER */
function initScrollRotationCards() {
    const cards = document.querySelectorAll(".feature-card, .stat-box");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add("card-visible");
                }, i * 80);
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(c => observer.observe(c));

    // 3D Parallax Tilt on Mousemove
    cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - (rect.width / 2);
            const y = e.clientY - rect.top - (rect.height / 2);
            
            const rotateX = (-y / rect.height) * 12;
            const rotateY = (x / rect.width) * 12;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)";
        });
    });
}

/* 4. PARALLAX BACKGROUND ORBS */
function initParallaxOrbs() {
    const orbs = document.querySelectorAll(".landing-orb");
    if (!orbs.length) return;

    window.addEventListener("scroll", () => {
        const scrolled = window.scrollY;
        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 0.12;
            orb.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
}

/* 5. INTERACTIVE SCROLL-DRIVEN DELIVERY TRUCK PIPELINE */
function initScrollDeliveryTruck() {
    const section = document.querySelector(".supply-chain-section");
    const progressLine = document.querySelector(".pipeline-progress");
    const truck = document.querySelector(".delivery-truck-badge");
    const nodes = document.querySelectorAll(".pipeline-node");
    const statusText = document.getElementById("truck-status-text");

    if (!section || !progressLine || !truck) return;

    window.addEventListener("scroll", () => {
        const rect = section.getBoundingClientRect();
        const winHeight = window.innerHeight;
        
        const totalHeight = rect.height - (winHeight * 0.5);
        let progress = 0;

        if (rect.top <= winHeight * 0.5) {
            progress = Math.min(Math.max((winHeight * 0.5 - rect.top) / totalHeight, 0), 1);
        }

        const pct = progress * 100;
        progressLine.style.width = `${pct}%`;
        truck.style.left = `calc(${pct}% - 24px)`;

        // Highlight nodes and update live status text
        if (pct < 25) {
            updateNodesActive(0, nodes);
            if (statusText) statusText.textContent = "Step 1: Low Stock Detected — Auto Purchase Order Triggered";
        } else if (pct < 55) {
            updateNodesActive(1, nodes);
            if (statusText) statusText.textContent = "Step 2: Warehouse Processing — Safety Stock Allocated & Packed";
        } else if (pct < 85) {
            updateNodesActive(2, nodes);
            if (statusText) statusText.textContent = "Step 3: Express Delivery Transit — Truck Driving to Retail Store";
        } else {
            updateNodesActive(3, nodes);
            if (statusText) statusText.textContent = "Step 4: Stock Restocked Successfully — POS & Inventory Live!";
        }
    });
}

function updateNodesActive(activeIndex, nodes) {
    nodes.forEach((node, idx) => {
        if (idx <= activeIndex) {
            node.classList.add("node-active");
        } else {
            node.classList.remove("node-active");
        }
    });
}

/* 6. INTERACTIVE ROP FORMULA CALCULATOR CONTROLLER */
function initRopCalculator() {
    const leadInput = document.getElementById("calcLeadTime");
    const demandInput = document.getElementById("calcDailyDemand");
    const safetyInput = document.getElementById("calcSafetyStock");
    const resVal = document.getElementById("calcRopResult");

    if (!leadInput || !demandInput || !safetyInput || !resVal) return;

    function calculate() {
        const lead = parseFloat(leadInput.value) || 0;
        const demand = parseFloat(demandInput.value) || 0;
        const safety = parseFloat(safetyInput.value) || 0;

        const rop = Math.round((lead * demand) + safety);
        resVal.textContent = `${rop} Units`;
    }

    [leadInput, demandInput, safetyInput].forEach(inp => {
        inp.addEventListener("input", calculate);
    });

    calculate();
}

/* 7. INTERACTIVE DEMAND SIMULATOR WIDGET CONTROLLER */
function initDemandSimulator() {
    const slider = document.getElementById("simDemandSlider");
    const labelVal = document.getElementById("simDemandVal");
    const revVal = document.getElementById("simRevVal");
    const safetyVal = document.getElementById("simSafetyVal");
    const freqVal = document.getElementById("simFreqVal");

    if (!slider || !labelVal || !revVal || !safetyVal || !freqVal) return;

    function update() {
        const units = parseInt(slider.value) || 25;
        labelVal.textContent = `${units} Units / Day`;

        // Monthly Revenue ($45 avg item price)
        const revenue = Math.round(units * 30 * 45);
        revVal.textContent = `$${revenue.toLocaleString()}`;

        // Safety Stock (Lead Time 5 days * 0.35 buffer)
        const safety = Math.round(units * 5 * 0.35);
        safetyVal.textContent = `${safety} Units`;

        // Reorder Frequency
        const days = Math.max(2, Math.round(180 / units));
        freqVal.textContent = `Every ${days} Days`;
    }

    slider.addEventListener("input", update);
    update();
}
