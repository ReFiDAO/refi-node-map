function el(id) {
    const node = document.getElementById(id);
    if (!node) {
        throw new Error(`Missing element: #${id}`);
    }
    return node;
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

const MAP_Y_OFFSET_PCT = 7.5;

function latLngToPct(lat, lng) {
    const x = ((Number(lng) + 180) / 360) * 100;
    const y = ((90 - Number(lat)) / 180) * 100;
    return { xPct: clamp(x, 0, 100), yPct: clamp(y, 0, 100) };
}

function sanitizeHref(href) {
    const trimmed = String(href || "").trim();
    if (!trimmed) return "#";
    if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
    return "#";
}

function sanitizeImageSrc(src) {
    const trimmed = String(src || "").trim();
    if (!trimmed) return "";
    if (/^javascript:/i.test(trimmed)) return "";
    return trimmed;
}

function extractFirstImage(md) {
    const match = String(md || "").match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (!match) return { url: "", alt: "", stripped: md };
    const alt = match[1] || "";
    const url = match[2] || "";
    const stripped = String(md || "").replace(match[0], "").trim();
    return { url, alt, stripped };
}

function inlineMarkdown(text) {
    let out = escapeHtml(text);
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
        const safeHref = sanitizeHref(href);
        return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return out;
}

function renderMarkdown(md) {
    const lines = String(md || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
    let html = "";
    let inList = false;

    const closeList = () => {
        if (inList) {
            html += "</ul>";
            inList = false;
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            closeList();
            return;
        }

        if (trimmed.startsWith("### ")) {
            closeList();
            html += `<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`;
            return;
        }

        if (trimmed.startsWith("## ")) {
            closeList();
            html += `<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`;
            return;
        }

        if (trimmed.startsWith("# ")) {
            closeList();
            html += `<h2>${inlineMarkdown(trimmed.slice(2))}</h2>`;
            return;
        }

        const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            closeList();
            const alt = imageMatch[1] || "";
            const src = sanitizeImageSrc(imageMatch[2] || "");
            if (!src) return;
            html += `<figure class="node-media">
                <img class="node-media__img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
                ${alt ? `<figcaption class="node-media__caption">${escapeHtml(alt)}</figcaption>` : ""}
            </figure>`;
            return;
        }

        if (trimmed.startsWith("- ")) {
            if (!inList) {
                html += "<ul>";
                inList = true;
            }
            html += `<li>${inlineMarkdown(trimmed.slice(2))}</li>`;
            return;
        }

        closeList();
        html += `<p>${inlineMarkdown(trimmed)}</p>`;
    });

    closeList();
    return html;
}

function renderNodeMeta(node) {
    const items = [
        { label: "Location", value: node.location },
        { label: "Lead Stewards", value: node.leadStewards },
        { label: "Node Stage", value: node.nodeStage }
    ];
    const html = items
        .filter((item) => item.value)
        .map((item) => {
            const label = escapeHtml(item.label);
            const value = escapeHtml(item.value);
            return `<div class="node-modal__metaItem"><span class="node-modal__metaLabel">${label}</span><span class="node-modal__metaValue">${value}</span></div>`;
        })
        .join("");
    return html;
}

function getContinentLabel(node) {
    const haystack = `${node.name || ""} ${node.location || ""}`.toLowerCase();
    const matches = (value) => haystack.includes(value);

    if (matches("tanzania") || matches("uganda") || matches("lagos") || matches("nigeria") || matches("cape town") || matches("south africa")) {
        return "Africa";
    }
    if (matches("thailand") || matches("phangan") || matches("asia")) {
        return "Asia";
    }
    if (matches("barcelona") || matches("spain") || matches("lisbon") || matches("portugal") || matches("italia") || matches("italy") || matches("sicilia") || matches("sicily") || matches("hague") || matches("netherlands") || matches("europe")) {
        return "Europe";
    }
    if (matches("mexico") || matches("bay area") || matches("san francisco") || matches("usa") || matches("united states") || matches("portland") || matches("red hook") || matches("costa rica")) {
        return "North America";
    }
    if (matches("colombia") || matches("venezuela") || matches("belo horizonte") || matches("brazil") || matches("medell") || matches("bogota") || matches("atlántico") || matches("atlantico")) {
        return "South America";
    }
    return "Unknown";
}

function setModalLogo(modalLogo, node) {
    const nodeId = node && node.id ? String(node.id) : "";
    if (!nodeId) {
        modalLogo.hidden = true;
        modalLogo.removeAttribute("src");
        return;
    }
    const base = `nodes/${nodeId}/images/logo`;
    const extensions = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
    let idx = 0;

    const tryNext = () => {
        if (idx >= extensions.length) {
            modalLogo.hidden = true;
            modalLogo.removeAttribute("src");
            return;
        }
        const ext = extensions[idx++];
        modalLogo.src = `${base}.${ext}`;
        modalLogo.hidden = false;
    };

    modalLogo.alt = `${node.name || "Node"} logo`;
    modalLogo.onload = () => {
        modalLogo.hidden = false;
    };
    modalLogo.onerror = () => {
        tryNext();
    };
    tryNext();
}

function main() {
    const nodes = Array.isArray(window.__NODE_DATA__) ? window.__NODE_DATA__ : [];

    const mapPins = el("mapPins");
    const nodeGrid = el("nodeGrid");
    const nodeFilters = el("nodeFilters");
    const modal = el("nodeModal");
    const modalTitle = el("modalTitle");
    const modalMeta = el("modalMeta");
    const modalContent = el("modalContent");
    const modalHero = el("modalHero");
    const modalHeroImg = el("modalHeroImg");
    const modalClose = el("modalClose");
    const modalLogo = el("modalLogo");
    const scrollIndicator = document.getElementById("scrollIndicator");
    const mapSection = document.getElementById("mapSection");
    const btnTour = el("btnTour");
    const btnAdmin = el("btnAdmin");
    const btnPickPin = el("btnPickPin");
    const tourPanel = el("tourPanel");
    const tourPanelTitle = el("tourPanelTitle");
    const tourPanelMeta = el("tourPanelMeta");
    const tourPanelText = el("tourPanelText");
    const tourPanelPrev = el("tourPanelPrev");
    const tourPanelNext = el("tourPanelNext");
    const tourPanelEnd = el("tourPanelEnd");
    const tourPanelOpen = el("tourPanelOpen");
    const tourLayer = el("tourLayer");
    const tourPath = el("tourPath");
    const mapHud = el("mapHud");
    const hudX = el("hudX");
    const hudY = el("hudY");
    const hudStatus = el("hudStatus");
    const adminModal = el("adminModal");
    const adminClose = el("adminClose");
    const adminCoords = el("adminCoords");

    let isAdmin = false;
    let pickMode = false;
    const state = { activeNodeId: null };
    const filters = { continent: "All" };
    const tour = { active: false, ids: [], idx: 0 };

    function updateModalOpenState(open) {
        document.body.classList.toggle("is-modal-open", !!open);
    }

    function updateModalScrollState() {
        const max = 240;
        const progress = clamp(modal.scrollTop / max, 0, 1);
        modal.style.setProperty("--hero-collapse", progress.toFixed(3));
        modal.style.setProperty("--header-opacity", (0.65 + progress * 0.3).toFixed(3));
    }

    function resetModalScrollState() {
        modal.scrollTop = 0;
        modal.style.setProperty("--hero-collapse", "0");
        modal.style.setProperty("--header-opacity", "0.9");
    }


    function setAdminMode(on) {
        isAdmin = !!on;
        document.body.classList.toggle("is-admin", isAdmin);
        btnAdmin.textContent = isAdmin ? "Admin (on)" : "Admin";
        if (!isAdmin) {
            mapHud.hidden = true;
            setPickMode(false);
        }
    }

    function setPickMode(on) {
        pickMode = !!on;
        document.body.classList.toggle("is-picking-pin", pickMode);
        if (isAdmin) {
            mapHud.hidden = !pickMode;
        }
        btnPickPin.textContent = pickMode ? "Picking..." : "Pick pin";
    }

    function updateHudFromEvent(e) {
        const rect = mapPins.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const xPct = clamp(x, 0, 100).toFixed(1);
        const yPct = clamp(y, 0, 100).toFixed(1);
        hudX.textContent = xPct;
        hudY.textContent = yPct;
        return { xPct, yPct };
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    function setHudStatus(message) {
        hudStatus.textContent = message;
        window.setTimeout(() => {
            hudStatus.textContent = "Click the map to copy x/y%.";
        }, 1400);
    }

function nodePoint(node) {
    if (Number.isFinite(node.lat) && Number.isFinite(node.lng)) {
        const point = latLngToPct(node.lat, node.lng);
        return {
            xPct: point.xPct,
            yPct: clamp(point.yPct + MAP_Y_OFFSET_PCT, 0, 100)
        };
    }
    if (Number.isFinite(node.xPct) && Number.isFinite(node.yPct)) {
        return {
            xPct: node.xPct,
            yPct: clamp(node.yPct + MAP_Y_OFFSET_PCT, 0, 100)
        };
    }
    return { xPct: 50, yPct: 50 };
}

    function pinPointForNodeId(nodeId) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        return nodePoint(node);
    }

    function renderPins() {
        mapPins.innerHTML = nodes
            .map((node) => {
                const { xPct, yPct } = nodePoint(node);
                return `
                    <button class="pin" type="button" data-node-id="${escapeHtml(node.id)}" style="left:${xPct}%; top:${yPct}%;">
                        <div class="pin__bubble">
                            <span class="pin__dot" aria-hidden="true"></span>
                            <span class="pin__label">${escapeHtml(node.name)}</span>
                        </div>
                        <div class="pin__stem" aria-hidden="true"></div>
                    </button>
                `;
            })
            .join("");
    }

    function setPinOffset(pin, x, y) {
        pin.style.setProperty("--pin-offset-x", `${x}px`);
        pin.style.setProperty("--pin-offset-y", `${y}px`);
        pin.dataset.offsetX = String(x);
        pin.dataset.offsetY = String(y);
    }

    function resolvePinOverlaps() {
        const pins = Array.from(mapPins.querySelectorAll(".pin"));
        if (pins.length < 2) return;

        pins.forEach((pin) => setPinOffset(pin, 0, 0));

        const maxIterations = 320;
        const nudgeStep = 8;
        const maxOffset = 90;

        for (let iter = 0; iter < maxIterations; iter += 1) {
            let moved = false;
            for (let i = 0; i < pins.length; i += 1) {
                const a = pins[i].querySelector(".pin__bubble");
                if (!a) continue;
                const aRect = a.getBoundingClientRect();
                for (let j = i + 1; j < pins.length; j += 1) {
                    const b = pins[j].querySelector(".pin__bubble");
                    if (!b) continue;
                    const bRect = b.getBoundingClientRect();
                    const overlaps = !(
                        aRect.right < bRect.left ||
                        aRect.left > bRect.right ||
                        aRect.bottom < bRect.top ||
                        aRect.top > bRect.bottom
                    );
                    if (!overlaps) continue;

                    const aCenterX = aRect.left + aRect.width / 2;
                    const aCenterY = aRect.top + aRect.height / 2;
                    const bCenterX = bRect.left + bRect.width / 2;
                    const bCenterY = bRect.top + bRect.height / 2;
                    const dx = bCenterX - aCenterX || 1;
                    const dy = bCenterY - aCenterY || 1;
                    const length = Math.hypot(dx, dy) || 1;
                    const moveX = (dx / length) * nudgeStep;
                    const moveY = (dy / length) * nudgeStep;

                    const aCurrentX = Number(pins[i].dataset.offsetX || 0);
                    const aCurrentY = Number(pins[i].dataset.offsetY || 0);
                    const bCurrentX = Number(pins[j].dataset.offsetX || 0);
                    const bCurrentY = Number(pins[j].dataset.offsetY || 0);
                    const aNextX = clamp(aCurrentX - moveX, -maxOffset, maxOffset);
                    const aNextY = clamp(aCurrentY - moveY, -maxOffset, maxOffset);
                    const bNextX = clamp(bCurrentX + moveX, -maxOffset, maxOffset);
                    const bNextY = clamp(bCurrentY + moveY, -maxOffset, maxOffset);

                    if (aNextX !== aCurrentX || aNextY !== aCurrentY) {
                        setPinOffset(pins[i], aNextX, aNextY);
                        moved = true;
                    }
                    if (bNextX !== bCurrentX || bNextY !== bCurrentY) {
                        setPinOffset(pins[j], bNextX, bNextY);
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
    }

    function renderNodeGrid() {
        const filtered = nodes.filter((node) => {
            if (filters.continent === "All") return true;
            return getContinentLabel(node) === filters.continent;
        });
        nodeGrid.innerHTML = filtered
            .map((node) => {
                const location = node.location ? node.location : "Location TBD";
                const imgMatch = String(node.content || "").match(/!\[[^\]]*\]\(([^)]+)\)/);
                const coverSrc = imgMatch ? sanitizeImageSrc(imgMatch[1]) : "";
                const metaLine = location;
                return `
                    <article class="node-card" data-node-id="${escapeHtml(node.id)}">
                        <div class="node-card__media ${coverSrc ? "" : "is-empty"}">
                            ${coverSrc ? `<img class="node-card__img" src="${escapeHtml(coverSrc)}" alt="${escapeHtml(node.name)}" loading="lazy" />` : ""}
                        </div>
                        <div class="node-card__body">
                            <div class="node-title">${escapeHtml(node.name)}</div>
                            <p class="node-description">${escapeHtml(metaLine)}</p>
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    function renderFilters() {
        const order = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Unknown"];
        const counts = {};
        nodes.forEach((node) => {
            const continent = getContinentLabel(node);
            counts[continent] = (counts[continent] || 0) + 1;
        });

        const items = order.filter((label) => counts[label]).map((label) => ({
            label,
            count: counts[label]
        }));
        const buttons = [
            { label: "All", count: nodes.length },
            ...items
        ];

        nodeFilters.innerHTML = buttons
            .map((item) => {
                const active = filters.continent === item.label ? "is-active" : "";
                return `<button class="node-filter ${active}" type="button" data-filter="${escapeHtml(item.label)}">${escapeHtml(item.label)} (${item.count})</button>`;
            })
            .join("");
    }

    function animatePath(fromId, toId) {
        const a = pinPointForNodeId(fromId);
        const b = pinPointForNodeId(toId);
        if (!a || !b) {
            tourPath.setAttribute("d", "");
            tourLayer.classList.remove("is-animating");
            return;
        }
        const d = `M ${a.xPct} ${a.yPct} L ${b.xPct} ${b.yPct}`;
        tourPath.setAttribute("d", d);
        tourLayer.classList.remove("is-animating");
        void tourLayer.offsetWidth;
        tourLayer.classList.add("is-animating");
        window.setTimeout(() => tourLayer.classList.remove("is-animating"), 1000);
    }

    function setTourCurrentPin(nodeId) {
        Array.from(mapPins.querySelectorAll(".pin")).forEach((p) => {
            p.classList.toggle("is-tour-current", p.dataset.nodeId === nodeId);
        });
    }

    function updateTourUI() {
        tourPanel.hidden = !tour.active;
        btnTour.textContent = tour.active ? "Tour (on)" : "Tour";
        const len = tour.ids.length;
        tourPanelPrev.disabled = !tour.active || len < 2;
        tourPanelNext.disabled = !tour.active || len < 2;
    }

    function openTourStep(nextIdx, fromId) {
        if (!tour.active) return;
        const len = tour.ids.length;
        if (len === 0) return;
        const idx = (nextIdx + len) % len;
        tour.idx = idx;
        const id = tour.ids[idx];
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        tourPanelTitle.textContent = node.name;
        tourPanelMeta.textContent = `Stop ${idx + 1} of ${len}`;
        tourPanelText.textContent = "Open the profile to learn about this local node.";
        setTourCurrentPin(id);
        if (fromId && fromId !== id) {
            animatePath(fromId, id);
        } else {
            tourPath.setAttribute("d", "");
        }
        updateTourUI();
    }

    function startTour() {
        if (nodes.length === 0) return;
        tour.active = true;
        tour.ids = nodes.map((n) => n.id);
        tour.idx = 0;
        updateTourUI();
        openTourStep(0, null);
    }

    function endTour() {
        tour.active = false;
        tour.ids = [];
        tour.idx = 0;
        updateTourUI();
        tourPath.setAttribute("d", "");
        setTourCurrentPin("");
    }

    function openModal() {
        if (!modal.open) modal.showModal();
        updateModalOpenState(true);
        resetModalScrollState();
    }

    function closeModal() {
        if (modal.open) modal.close();
        updateModalOpenState(false);
        resetModalScrollState();
    }

    async function openNode(nodeId) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        state.activeNodeId = nodeId;
        modalTitle.textContent = node.name;
        setModalLogo(modalLogo, node);
        const metaHtml = renderNodeMeta(node);
        modalMeta.innerHTML = metaHtml;
        modalMeta.hidden = !metaHtml;
        modalContent.innerHTML = "<p class=\"muted\">Loading...</p>";
        openModal();
        if (window.location.protocol === "file:" && node.content) {
            const { url, alt } = extractFirstImage(node.content);
            if (url) {
                modalHeroImg.src = url;
                modalHeroImg.alt = alt || node.name;
                modalHero.hidden = false;
            } else {
                modalHero.hidden = true;
            }
            modalContent.innerHTML = renderMarkdown(node.content);
            return;
        }
        try {
            const res = await fetch(node.mdPath, { cache: "no-cache" });
            if (!res.ok) {
                throw new Error(`Failed to load ${node.mdPath}`);
            }
            const md = await res.text();
            const { url, alt } = extractFirstImage(md);
            if (url) {
                modalHeroImg.src = url;
                modalHeroImg.alt = alt || node.name;
                modalHero.hidden = false;
            } else {
                modalHero.hidden = true;
            }
            modalContent.innerHTML = renderMarkdown(md);
        } catch (err) {
            if (node.content) {
                const { url, alt } = extractFirstImage(node.content);
                if (url) {
                    modalHeroImg.src = url;
                    modalHeroImg.alt = alt || node.name;
                    modalHero.hidden = false;
                } else {
                    modalHero.hidden = true;
                }
                modalContent.innerHTML = renderMarkdown(node.content);
            } else {
                modalHero.hidden = true;
                modalContent.innerHTML = `<p class="muted">Unable to load node content.</p>`;
            }
        }
    }

    mapPins.addEventListener("click", async (e) => {
        const pin = e.target.closest(".pin[data-node-id]");
        if (pin) {
            openNode(pin.dataset.nodeId);
            return;
        }
        if (!isAdmin) return;
        const coords = updateHudFromEvent(e);
        const text = `xPct:${coords.xPct}, yPct:${coords.yPct}`;
        if (pickMode) {
            adminCoords.textContent = text;
            setHudStatus(`Picked: ${text}`);
            setPickMode(false);
            return;
        }
        const ok = await copyToClipboard(text);
        setHudStatus(ok ? `Copied: ${text}` : `Copy blocked — use: ${text}`);
    });

    mapPins.addEventListener("mousemove", (e) => {
        if (!isAdmin) return;
        updateHudFromEvent(e);
    });

    mapPins.addEventListener("mouseenter", () => {
        if (!isAdmin) return;
        mapHud.hidden = false;
    });

    mapPins.addEventListener("mouseleave", () => {
        if (!isAdmin || pickMode) return;
        mapHud.hidden = true;
    });

    nodeGrid.addEventListener("click", (e) => {
        const card = e.target.closest(".node-card[data-node-id]");
        if (card) {
            openNode(card.dataset.nodeId);
        }
    });

    nodeFilters.addEventListener("click", (e) => {
        const button = e.target.closest(".node-filter[data-filter]");
        if (!button) return;
        filters.continent = button.dataset.filter || "All";
        renderFilters();
        renderNodeGrid();
    });

    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
    modal.addEventListener("close", () => updateModalOpenState(false));
    modal.addEventListener("scroll", updateModalScrollState);


    btnTour.addEventListener("click", () => {
        if (tour.active) endTour();
        else startTour();
    });
    tourPanelEnd.addEventListener("click", endTour);
    tourPanelPrev.addEventListener("click", () => {
        const fromId = tour.ids[tour.idx];
        openTourStep(tour.idx - 1, fromId);
    });
    tourPanelNext.addEventListener("click", () => {
        const fromId = tour.ids[tour.idx];
        openTourStep(tour.idx + 1, fromId);
    });
    tourPanelOpen.addEventListener("click", () => {
        if (!tour.active || tour.ids.length === 0) return;
        openNode(tour.ids[tour.idx]);
    });

    btnAdmin.addEventListener("click", () => {
        setAdminMode(!isAdmin);
        if (isAdmin && !adminModal.open) adminModal.showModal();
    });

    adminClose.addEventListener("click", () => {
        if (adminModal.open) adminModal.close();
    });
    adminModal.addEventListener("click", (e) => {
        if (e.target === adminModal) adminModal.close();
    });

    btnPickPin.addEventListener("click", () => {
        if (!isAdmin) return;
        setPickMode(!pickMode);
        if (pickMode) {
            adminCoords.textContent = "Click on the map to capture coordinates.";
        }
    });

    if (scrollIndicator && mapSection) {
        scrollIndicator.addEventListener("click", () => {
            mapSection.scrollIntoView({ behavior: "smooth" });
        });
        scrollIndicator.style.cursor = "pointer";
    }

    renderPins();
    requestAnimationFrame(resolvePinOverlaps);
    renderFilters();
    renderNodeGrid();
    setAdminMode(false);
    updateTourUI();

    window.addEventListener("resize", () => {
        requestAnimationFrame(resolvePinOverlaps);
    });

    window.addEventListener("load", () => {
        requestAnimationFrame(resolvePinOverlaps);
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => requestAnimationFrame(resolvePinOverlaps));
    }
}

document.addEventListener("DOMContentLoaded", main);
