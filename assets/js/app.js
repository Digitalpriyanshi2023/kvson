/* KVSON Portal Core Application Logic */

const API_BASE = '/api';
const STORAGE_KEYS = {
    user: "kvsn_user",
    token: "kvsn_access_token"
};

const appState = {
    currentUser: null,
    members: [],
    requests: [],
    adminTab: "requests",
    selectedAdminId: null,
    lastFocus: null
};

// DOM Query Selectors
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function text(value, fallback = "") {
    return value === null || value === undefined || value === "" ? fallback : String(value);
}

function initials(name) {
    return text(name, "K").trim().charAt(0).toUpperCase();
}

function getAuthHeaders() {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Unified REST API client helper
async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
            ...(options.headers || {})
        }
    });
    
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    
    if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `Request failed with status ${response.status}`);
    }
    return payload;
}

function setAuthenticatedUser(user, token = "") {
    appState.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    if (token) {
        localStorage.setItem(STORAGE_KEYS.token, token);
    }
    hydrateProfileForm();
    updateAuthUI();
}

function setNotice(id, message, type = "success") {
    const box = $(`#${id}`);
    if (!box) return;
    box.className = `notice ${type} show`;
    box.textContent = message;
}

function clearNotice(id) {
    const box = $(`#${id}`);
    if (!box) return;
    box.className = "notice";
    box.textContent = "";
}

function openModal(id) {
    const modal = $(`#${id}`);
    if (!modal) return;
    appState.lastFocus = document.activeElement;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    const focusTarget = $("input, button, textarea, select, a[href]", modal);
    if (focusTarget) focusTarget.focus();
}

function closeModals() {
    $$(".modal").forEach((modal) => modal.classList.remove("is-open"));
    document.body.classList.remove("modal-open");
    if (appState.lastFocus && typeof appState.lastFocus.focus === "function") {
        appState.lastFocus.focus();
    }
}

function createIcon(name) {
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", name);
    return icon;
}

// Render the public verified members directory
function renderDirectory(list = appState.members) {
    const grid = $("#memberGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.append(createIcon("search-x"));
        const p = document.createElement("p");
        p.textContent = "मिल्ने सदस्य भेटिएन। / No matching members found.";
        empty.append(p);
        grid.append(empty);
        refreshIcons();
        return;
    }

    list.forEach((member) => {
        const card = document.createElement("article");
        card.className = "member-card";

        const top = document.createElement("div");
        top.className = "member-top";

        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.textContent = initials(member.full_name);

        const titleWrap = document.createElement("div");
        const name = document.createElement("h3");
        name.textContent = text(member.full_name, "सदस्य");
        const role = document.createElement("p");
        role.textContent = text(member.occupation, "Community Member");
        titleWrap.append(name, role);
        top.append(avatar, titleWrap);

        const bio = document.createElement("p");
        bio.textContent = text(member.bio, "प्रमाणित सदस्य। / Verified member.");

        const meta = document.createElement("span");
        meta.className = "pill";
        meta.append(createIcon("map-pin"), document.createTextNode(text(member.district, "Nepal")));

        card.append(top, bio, meta);
        grid.append(card);
    });
    refreshIcons();
}

function filterDirectory() {
    const query = $("#directorySearch").value.trim().toLowerCase();
    const filtered = appState.members.filter((member) => {
        const haystack = [
            member.full_name,
            member.district,
            member.occupation,
            member.business_name,
            member.bio
        ].map((item) => text(item).toLowerCase()).join(" ");
        return haystack.includes(query);
    });
    renderDirectory(filtered);
}

async function fetchDirectory() {
    try {
        const data = await apiRequest("/directory");
        if (Array.isArray(data)) {
            appState.members = data.filter((member) => member.is_verified !== false);
        }
    } catch (error) {
        console.warn("Using local cache directory values.", error);
    }
    renderDirectory();
}

function updateAuthUI() {
    const user = appState.currentUser;
    const authSelector = $("#authSelector");
    
    // Toggle menu items visibility
    const loggedOutItems = $$(".logged-out-only");
    const loggedInItems = $$(".logged-in-only");
    
    if (user) {
        loggedOutItems.forEach(el => el.hidden = true);
        loggedInItems.forEach(el => el.hidden = false);
        
        // Show/hide admin option inside dropdown
        const btnAdmin = $("#btnDashboardAdmin");
        if (btnAdmin) {
            btnAdmin.hidden = !(user.role === "admin");
        }
        
        // Update Selector Button label to show User Name/Initial or "Profile"
        if (authSelector) {
            const labelSpan = authSelector.querySelector(".auth-label-current");
            if (labelSpan) {
                labelSpan.innerHTML = `<span class="lang-en">Profile</span><span class="lang-ne">प्रोफाइल</span>`;
            }
        }
    } else {
        loggedOutItems.forEach(el => el.hidden = false);
        loggedInItems.forEach(el => el.hidden = true);
        
        // Reset Selector Button label to "Account"
        if (authSelector) {
            const labelSpan = authSelector.querySelector(".auth-label-current");
            if (labelSpan) {
                labelSpan.innerHTML = `<span class="lang-en">Account</span><span class="lang-ne">खाता</span>`;
            }
        }
    }
}

function hydrateProfileForm() {
    const user = appState.currentUser || {};
    
    const avatar = $("#profileAvatar");
    if (avatar) avatar.textContent = initials(user.full_name);
    
    const name = $("#profileName");
    if (name) name.textContent = text(user.full_name, "Member");
    
    const role = $("#profileRole");
    if (role) role.textContent = user.role === "admin" ? "Admin member" : "Verified member";
    
    const meta = $("#profileMeta");
    if (meta) meta.textContent = [user.district, user.occupation].filter(Boolean).join(" • ");

    if ($("#profileFullName")) $("#profileFullName").value = text(user.full_name);
    if ($("#profileContact")) $("#profileContact").value = text(user.contact);
    if ($("#profileDistrict")) $("#profileDistrict").value = text(user.district);
    if ($("#profileOccupation")) $("#profileOccupation").value = text(user.occupation);
    if ($("#profileBusiness")) $("#profileBusiness").value = text(user.business_name);
    if ($("#profileBio")) $("#profileBio").value = text(user.bio);
}

// Handlers for Login, Enrollment, and Profile Actions
async function handleLogin(event) {
    event.preventDefault();
    clearNotice("loginNotice");

    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    try {
        const data = await apiRequest("/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
        
        setAuthenticatedUser(data.user, data.token);
        closeModals();
        openModal("profileModal");
    } catch (error) {
        setNotice("loginNotice", error.message || "Login असफल भयो। / Login failed.", "error");
    }
}

async function handleEnrollment(event) {
    event.preventDefault();
    clearNotice("enrollNotice");
    
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
        const data = await apiRequest("/enroll", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        setNotice("enrollNotice", data.message || "आवेदन प्राप्त भयो। Admin verification पछि login access सक्रिय हुनेछ।", "success");
        event.currentTarget.reset();
    } catch (error) {
        setNotice("enrollNotice", error.message || "आवेदन पठाउन असमर्थ भयो। / Enrollment failed.", "error");
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    clearNotice("profileNotice");
    
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
        const data = await apiRequest("/profile", {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
        
        appState.currentUser = { ...appState.currentUser, ...(data.profile || data) };
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(appState.currentUser));
        hydrateProfileForm();
        setNotice("profileNotice", "Profile update भयो। / Profile updated successfully.", "success");
        updateAuthUI();
    } catch (error) {
        setNotice("profileNotice", error.message || "Profile update असफल भयो। / Update failed.", "error");
    }
}

// Admin Panel Roster Systems
async function fetchAdminData() {
    if (!appState.currentUser || appState.currentUser.role !== "admin") return;
    try {
        const data = await apiRequest("/admin/profiles");
        const profiles = Array.isArray(data) ? data : (data.profiles || []);
        appState.requests = profiles.filter((profile) => !profile.is_verified);
        appState.members = profiles.filter((profile) => profile.is_verified);
    } catch (error) {
        console.error("Unable to refresh rosters from live server.", error);
    }
}

function activeAdminRecords() {
    return appState.adminTab === "requests" ? appState.requests : appState.members;
}

function renderAdmin() {
    const reqCount = $("#requestCount");
    const memCount = $("#memberCount");
    if (reqCount) reqCount.textContent = appState.requests.length;
    if (memCount) memCount.textContent = appState.members.length;

    $$(".tab-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.adminTab === appState.adminTab);
    });

    renderAdminRoster();
    renderAdminDetail();
}

function renderAdminRoster() {
    const query = $("#adminSearch").value.trim().toLowerCase();
    const list = activeAdminRecords().filter((profile) => {
        const haystack = [profile.full_name, profile.email, profile.district, profile.occupation]
            .map((item) => text(item).toLowerCase())
            .join(" ");
        return haystack.includes(query);
    });
    
    const roster = $("#adminRoster");
    if (!roster) return;
    roster.innerHTML = "";

    if (!list.length) {
        const empty = document.createElement("p");
        empty.className = "section-copy";
        empty.textContent = "No records found.";
        roster.append(empty);
        return;
    }

    list.forEach((profile) => {
        const button = document.createElement("button");
        button.className = "roster-item";
        button.type = "button";
        button.dataset.id = profile.id;
        if (profile.id === appState.selectedAdminId) button.classList.add("active");

        const name = document.createElement("strong");
        name.textContent = text(profile.full_name, "Unnamed member");
        const meta = document.createElement("p");
        meta.textContent = [profile.district, profile.occupation].filter(Boolean).join(" • ");
        button.append(name, meta);
        
        button.addEventListener("click", () => {
            appState.selectedAdminId = profile.id;
            renderAdmin();
        });
        roster.append(button);
    });
}

function renderAdminDetail() {
    const detail = $("#adminDetail");
    if (!detail) return;
    const record = activeAdminRecords().find((profile) => profile.id === appState.selectedAdminId);
    detail.innerHTML = "";

    if (!record) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.append(createIcon("panel-left-open"));
        const p = document.createElement("p");
        p.textContent = "रेकर्ड चयन गर्नुहोस्। / Select a record.";
        empty.append(p);
        detail.append(empty);
        refreshIcons();
        return;
    }

    const heading = document.createElement("h3");
    heading.textContent = text(record.full_name, "Member profile");

    const dl = document.createElement("dl");
    dl.className = "detail-grid";
    [
        ["Email", record.email],
        ["Contact", record.contact],
        ["District", record.district],
        ["Occupation", record.occupation],
        ["Business", record.business_name],
        ["Role", record.role],
        ["Bio", record.bio]
    ].forEach(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = text(value, "Not provided");
        dl.append(dt, dd);
    });

    const actions = document.createElement("div");
    actions.className = "action-row";

    if (appState.adminTab === "requests") {
        const approve = document.createElement("button");
        approve.className = "btn btn-success";
        approve.type = "button";
        approve.append(createIcon("user-check"), document.createTextNode("Approve"));
        approve.addEventListener("click", () => resolveRequest(record.id, "approve"));

        const reject = document.createElement("button");
        reject.className = "btn btn-danger";
        reject.type = "button";
        reject.append(createIcon("user-x"), document.createTextNode("Reject"));
        reject.addEventListener("click", () => resolveRequest(record.id, "reject"));
        actions.append(approve, reject);
    } else {
        const toggleRole = document.createElement("button");
        toggleRole.className = "btn btn-outline";
        toggleRole.type = "button";
        toggleRole.append(createIcon("shield"), document.createTextNode(record.role === "admin" ? "Make Member" : "Make Admin"));
        toggleRole.addEventListener("click", () => updateRole(record.id, record.role === "admin" ? "member" : "admin"));

        const remove = document.createElement("button");
        remove.className = "btn btn-danger";
        remove.type = "button";
        remove.append(createIcon("trash-2"), document.createTextNode("Remove"));
        remove.addEventListener("click", () => removeMember(record.id));
        actions.append(toggleRole, remove);
    }

    detail.append(heading, dl, actions);
    refreshIcons();
}

async function resolveRequest(id, action) {
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this membership request?`)) return;
    try {
        await apiRequest("/admin/resolve-request", {
            method: "POST",
            body: JSON.stringify({ id, action })
        });
        await fetchAdminData();
    } catch (error) {
        alert("Action transaction failed: " + error.message);
    }
    appState.selectedAdminId = null;
    fetchDirectory();
    renderAdmin();
}

async function updateRole(id, role) {
    if (!confirm(`Change this member role to ${role}?`)) return;
    try {
        await apiRequest("/admin/role", {
            method: "PATCH",
            body: JSON.stringify({ id, role })
        });
        await fetchAdminData();
    } catch (error) {
        alert("Action transaction failed: " + error.message);
    }
    renderAdmin();
}

async function removeMember(id) {
    if (!confirm("Remove this member from the directory?")) return;
    try {
        await apiRequest(`/admin/profiles/${id}`, { method: "DELETE" });
        await fetchAdminData();
    } catch (error) {
        alert("Action transaction failed: " + error.message);
    }
    appState.selectedAdminId = null;
    fetchDirectory();
    renderAdmin();
}

function logout() {
    appState.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.token);
    closeModals();
    updateAuthUI();
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function bindEvents() {
    const menuBtn = $("#menuButton");
    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            const navLinks = $("#navLinks");
            const isOpen = navLinks.classList.toggle("is-open");
            menuBtn.setAttribute("aria-expanded", String(isOpen));
        });
    }

    $$("#navLinks a").forEach((link) => {
        link.addEventListener("click", () => {
            $("#navLinks").classList.remove("is-open");
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
        });
    });

    $$("[data-open-modal='login']").forEach((button) => {
        button.addEventListener("click", () => openModal("loginModal"));
    });

    $$("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", closeModals);
    });

    $$(".modal").forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeModals();
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeModals();
    });

    // Dropdown Profile, Admin, and Logout bindings
    const btnProfile = $("#btnDashboardProfile");
    if (btnProfile) {
        btnProfile.addEventListener("click", () => {
            hydrateProfileForm();
            openModal("profileModal");
        });
    }

    const btnAdmin = $("#btnDashboardAdmin");
    if (btnAdmin) {
        btnAdmin.addEventListener("click", async () => {
            await fetchAdminData();
            renderAdmin();
            openModal("adminModal");
        });
    }

    const btnLogout = $("#btnDashboardLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", logout);
    }

    // Auth Dropdown trigger toggle
    const authSelector = $("#authSelector");
    const authDropdown = $(".auth-dropdown");
    if (authSelector && authDropdown) {
        authSelector.addEventListener("click", (e) => {
            e.stopPropagation();
            authDropdown.classList.toggle("is-open");
        });
        
        document.addEventListener("click", () => {
            authDropdown.classList.remove("is-open");
        });

        $$("#authDropdownMenu .dropdown-item, #authDropdownMenu a").forEach((item) => {
            item.addEventListener("click", () => {
                authDropdown.classList.remove("is-open");
            });
        });
    }

    const loginForm = $("#loginForm");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    // Mock logins configuration
    $$("[data-demo-login]").forEach((button) => {
        button.addEventListener("click", async () => {
            const role = button.dataset.demoLogin;
            const email = role === "admin" ? "admin@kvson.org" : "member@kvson.org";
            const password = role === "admin" ? "admin123" : "member123";
            try {
                const data = await apiRequest("/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });
                setAuthenticatedUser(data.user, data.token);
                closeModals();
                openModal("profileModal");
            } catch (err) {
                setNotice("loginNotice", err.message, "error");
            }
        });
    });

    const enrollForm = $("#enrollmentForm");
    if (enrollForm) enrollForm.addEventListener("submit", handleEnrollment);

    const profileForm = $("#profileForm");
    if (profileForm) profileForm.addEventListener("submit", handleProfileUpdate);

    const logoutBtn = $("#logoutButton");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    const dirSearch = $("#directorySearch");
    if (dirSearch) dirSearch.addEventListener("input", filterDirectory);

    const refreshDir = $("#refreshDirectory");
    if (refreshDir) refreshDir.addEventListener("click", fetchDirectory);

    const adminSearch = $("#adminSearch");
    if (adminSearch) adminSearch.addEventListener("input", renderAdminRoster);

    $$(".tab-btn").forEach((button) => {
        button.addEventListener("click", () => {
            appState.adminTab = button.dataset.adminTab;
            appState.selectedAdminId = null;
            renderAdmin();
        });
    });

    const contactForm = $("#contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();
            alert("सन्देश प्राप्त भयो। / Message received.");
            event.currentTarget.reset();
        });
    }

    // Theme Switcher
    const themeToggle = $("#themeToggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", nextTheme);
            localStorage.setItem("kvson_theme", nextTheme);
            refreshIcons();
        });
    }

    // Language Selector Dropdown
    const langSelector = $("#langSelector");
    const langDropdown = $(".language-dropdown");
    if (langSelector && langDropdown) {
        langSelector.addEventListener("click", (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle("is-open");
        });
        
        document.addEventListener("click", () => {
            langDropdown.classList.remove("is-open");
        });
    }

    // Language Selection Items
    $$("#langDropdownMenu .dropdown-item").forEach((item) => {
        item.addEventListener("click", (e) => {
            const lang = e.currentTarget.dataset.lang;
            setLanguage(lang);
        });
    });
}

function setLanguage(lang) {
    document.documentElement.setAttribute("data-lang", lang);
    localStorage.setItem("kvson_lang", lang);

    // Update active class in dropdown items
    $$("#langDropdownMenu .dropdown-item").forEach((btn) => {
        if (btn.dataset.lang === lang) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Update the button label text
    const label = $("#langSelector .lang-label-current");
    if (label) {
        if (lang === "all") {
            label.textContent = "Bilingual";
        } else if (lang === "ne") {
            label.textContent = "नेपाली";
        } else if (lang === "en") {
            label.textContent = "English";
        }
    }
}

function init() {
    try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.user);
        if (storedUser) {
            appState.currentUser = JSON.parse(storedUser);
        }
    } catch (error) {
        appState.currentUser = null;
    }
    
    bindEvents();
    
    // Apply initial language state to sync UI dropdown & labels
    const activeLang = localStorage.getItem("kvson_lang") || "ne";
    setLanguage(activeLang);

    updateAuthUI();
    fetchDirectory();
    refreshIcons();
    window.addEventListener("load", refreshIcons);
}

document.addEventListener("DOMContentLoaded", init);
