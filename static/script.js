/* ============================================================
   script.js — ClassControl Classroom System
   
   TABLE OF CONTENTS
   -----------------
   1.  Page Detection
   2.  Shared Utilities
   3.  success.html  — Student View
       3a. Socket & Message Count
       3b. Floating Toast
       3c. Messages Panel
       3d. File Sidebar
       3e. Centre Preview
       3f. Sidebar Collapse
       3g. Server Ping
   4.  teacher.html  — Teacher Dashboard
       4a. File Input Display
       4b. Student List (fetch & render)
       4c. Socket: Student Updates
   5.  teacher_login.html — Login Page
   6.  index.html    — Landing Page
       6a. Particles
       6b. Flip Cards
============================================================ */


/* ============================================================
   1. PAGE DETECTION — runs the right init based on <body> class
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
    const PAGE = {
        index:     document.body.classList.contains("index-page"),
        success:   document.body.classList.contains("success-page"),
        dashboard: document.body.classList.contains("dashboard-page"),
        login:     document.body.classList.contains("login-page"),
    };

    if (PAGE.success)   initSuccessPage();
    if (PAGE.dashboard) initDashboardPage();
    if (PAGE.login)     initLoginPage();
    if (PAGE.index)     initIndexPage();
});


/* ============================================================
   2. SHARED UTILITIES
============================================================ */

function currentTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


/* ============================================================
   3. SUCCESS PAGE (success.html — Student View)
============================================================ */

function initSuccessPage() {

    const socket = io();
    let msgCount  = 0;
    let toastTimer = null;

    socket.on("broadcast", function (data) {
        if (data.message) showToast(data.message);
        if (data.file) {
            addFile(data.file);
            showPreview(data.file);
        }
    });

    function showToast(text) {
        const toast   = document.getElementById("msg-toast");
        const toastTx = document.getElementById("msg-toast-text");
        const bar     = document.getElementById("msg-toast-bar");

        toastTx.textContent = text;
        toast.classList.add("visible");

        bar.style.transition = "none";
        bar.style.width = "100%";
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = "width 10s linear";
                bar.style.width = "0%";
            });
        });

        addToPanel(text);

        clearTimeout(toastTimer);
        toastTimer = setTimeout(dismissToast, 10000);
    }

    window.dismissToast = function () {
        document.getElementById("msg-toast").classList.remove("visible");
        clearTimeout(toastTimer);
    };

    window.togglePanel = function () {
        document.getElementById("msg-panel").classList.toggle("visible");
    };

    document.addEventListener("click", function (e) {
        const panel = document.getElementById("msg-panel");
        const btn   = document.getElementById("msg-toggle-btn");
        if (
            panel.classList.contains("visible") &&
            !panel.contains(e.target) &&
            !btn.contains(e.target)
        ) {
            panel.classList.remove("visible");
        }
    });

    function addToPanel(text) {
        const list  = document.getElementById("msg-panel-list");
        const empty = document.getElementById("panel-empty");
        const badge = document.getElementById("msg-count-badge");

        if (empty) empty.style.display = "none";

        msgCount++;
        badge.textContent = msgCount;
        badge.style.display = "inline-flex";

        const item = document.createElement("div");
        item.classList.add("msg-item");
        item.innerHTML = `
            <div class="msg-meta">
                <i class='bx bxs-user-circle'></i>
                <span class="msg-author">Teacher</span>
                <span class="msg-time">${currentTime()}</span>
            </div>
            <p class="msg-text">${text}</p>
        `;
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
    }

    function addFile(url) {
        const container = document.getElementById("sidebar-files");
        const empty = container.querySelector(".sidebar-empty");
        if (empty) empty.remove();

        const extension = url.split(".").pop().toLowerCase();
        const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(extension);
        const isPDF   = extension === "pdf";
        const isText  = extension === "txt";
        const isCode  = ["py","js","java","cpp","c","cs","html","css","ts",
                         "json","xml","php","rb","go","rs","sh","sql"].includes(extension);
        const isDoc   = ["doc","docx"].includes(extension);
        const isPPT   = ["ppt","pptx"].includes(extension);
        const isXLS   = ["xls","xlsx"].includes(extension);

        let icon = "bx-file-blank";
        if (isImage)       icon = "bxs-image";
        else if (isPDF)    icon = "bxs-file-pdf";
        else if (isText)   icon = "bxs-file-txt";
        else if (isCode)   icon = "bx-code-curly";
        else if (isDoc)    icon = "bxs-file-doc";
        else if (isPPT)    icon = "bxs-slideshow";
        else if (isXLS)    icon = "bxs-spreadsheet";

        const rawFilename = url.split("/").pop();
        const existing    = container.querySelectorAll(".file-item");
        const takenNames  = Array.from(existing).map(el => el.dataset.displayName);

        let displayName = rawFilename;
        if (takenNames.includes(rawFilename)) {
            const dotIdx   = rawFilename.lastIndexOf(".");
            const base     = dotIdx !== -1 ? rawFilename.slice(0, dotIdx) : rawFilename;
            const ext      = dotIdx !== -1 ? rawFilename.slice(dotIdx)    : "";
            let counter    = 1;
            while (takenNames.includes(`${base}(${counter})${ext}`)) counter++;
            displayName = `${base}(${counter})${ext}`;
        }

        const fileItem = document.createElement("div");
        fileItem.classList.add("file-item");
        fileItem.style.cursor = "pointer";
        fileItem.dataset.url         = url;
        fileItem.dataset.displayName = displayName;
        fileItem.innerHTML = `
            <div class="file-item-icon"><i class='bx ${icon}'></i></div>
            <div class="file-item-info">
                <span class="file-item-name">${displayName}</span>
                <span class="file-item-type">${extension.toUpperCase()}</span>
            </div>
            <a href="${url}" target="_blank" class="file-item-btn" title="Open in new tab"
               onclick="event.stopPropagation()">
                <i class='bx bx-link-external'></i>
            </a>
        `;

        fileItem.addEventListener("click", function () {
            showPreview(url);
        });

        container.appendChild(fileItem);
    }

    window.showPreview = function (url) {
        const preview = document.getElementById("preview-area");

        const staticPlaceholder = document.getElementById("screen-placeholder-static");
        if (staticPlaceholder) staticPlaceholder.style.display = "none";
        preview.style.display = "flex";

        const file     = url.toLowerCase();
        const ext      = url.split(".").pop().toLowerCase();
        const filename = url.split("/").pop();

        function wrapInCard(labelText, bodyHTML) {
            return `
                <div class="preview-card">
                    <div class="preview-card-header">
                        <span class="preview-card-label">${labelText}</span>
                        <span class="preview-ext">.${ext}</span>
                        <a href="${url}" target="_blank" class="preview-open-btn" title="Open in new tab">
                            <i class='bx bx-link-external'></i> Open
                        </a>
                    </div>
                    <div class="preview-card-body">
                        ${bodyHTML}
                    </div>
                </div>
            `;
        }

        if (["png","jpg","jpeg","gif","webp"].includes(ext)) {
            preview.innerHTML = wrapInCard("Image from Teacher", `
                <img src="${url}" style="max-width:100%; border-radius:8px;">
            `);
        } else if (ext === "pdf") {
            preview.innerHTML = wrapInCard("PDF from Teacher", `
                <iframe src="${url}" style="width:100%; height:75vh; border:none; border-radius:8px;"></iframe>
            `);
        } else if (["mp4","webm","ogg"].includes(ext)) {
            preview.innerHTML = wrapInCard("Video from Teacher", `
                <video style="width:100%; border-radius:8px;" controls>
                    <source src="${url}">
                </video>
            `);
        } else if (["ppt","pptx","doc","docx","xls","xlsx"].includes(ext)) {
            preview.innerHTML = wrapInCard("Document from Teacher", `
                <div class="preview-doc-placeholder">
                    <i class='bx bx-file-blank'></i>
                    <p>${filename}</p>
                    <a href="${url}" target="_blank" class="preview-download-btn">
                        <i class='bx bx-download'></i> Download to view
                    </a>
                </div>
            `);
        } else if (isTextOrCode(file)) {
            preview.innerHTML = wrapInCard("Loading...", "");
            fetch(url)
                .then(res => res.text())
                .then(text => {
                    const isPlain = ext === "txt";
                    const escaped = text
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

                    preview.innerHTML = wrapInCard(
                        isPlain ? "Text from Teacher" : "Code from Teacher",
                        `<div class="preview-code-topbar">
                            <span class="preview-code-filename">${filename}</span>
                            <button class="preview-copy-btn" onclick="copyPreviewCode(this)">
                                <i class='bx bx-copy'></i> Copy
                            </button>
                        </div>
                        <pre class="preview-pre"><code class="${isPlain ? "" : "language-" + ext}">${escaped}</code></pre>`
                    );

                    if (!isPlain) {
                        preview.querySelectorAll("pre code").forEach(block => {
                            hljs.highlightElement(block);
                        });
                    }
                })
                .catch(() => {
                    preview.innerHTML = wrapInCard("Error", `<p style="color:#f43f5e; padding:20px;">Could not load file.</p>`);
                });
        }
    };

    function isTextOrCode(file) {
        const textExts = ["txt","py","js","java","cpp","c","cs","html","css",
                          "ts","json","xml","php","rb","go","rs","sh","sql"];
        const ext = file.split(".").pop().toLowerCase();
        return textExts.includes(ext);
    }

    window.copyPreviewCode = function(btn) {
        const code = btn.closest(".preview-card-body").querySelector("code").innerText;
        navigator.clipboard.writeText(code).then(() => {
            btn.innerHTML = "<i class='bx bx-check'></i> Copied!";
            setTimeout(() => { btn.innerHTML = "<i class='bx bx-copy'></i> Copy"; }, 2000);
        });
    };

    window.toggleSidebar = function () {
        const sidebar = document.getElementById("success-sidebar");
        const chevron = document.getElementById("sidebar-chevron");
        sidebar.classList.toggle("collapsed");
        chevron.classList.toggle("rotated");
    };

    function pingServer() {
        fetch("/ping", { method: "POST" });
    }
    pingServer();
    setInterval(pingServer, 5000);
}


/* ============================================================
   4. DASHBOARD PAGE (teacher.html — Teacher Dashboard)
============================================================ */

function initDashboardPage() {

    const fileInput = document.getElementById("file-input");
    if (fileInput) {
        fileInput.addEventListener("change", function () {
            const display = document.getElementById("file-name-display");
            display.textContent = this.files.length > 1
                ? `${this.files.length} files selected`
                : this.files.length === 1
                ? this.files[0].name
                : "Attach files";
        });
    }

    window.fetchStudents = function () {
        fetch("/teacher-data")
            .then(response => response.json())
            .then(data => {
                const tbody         = document.getElementById("student-list");
                const empty         = document.getElementById("empty-state");
                const countActive   = document.getElementById("count-active");
                const countInactive = document.getElementById("count-inactive");
                const countTotal    = document.getElementById("count-total");

                tbody.innerHTML = "";

                if (data.length === 0) {
                    empty.style.display       = "flex";
                    countActive.textContent   = "0 active";
                    countInactive.textContent = "0 inactive";
                    countTotal.textContent    = "0 total";
                } else {
                    empty.style.display = "none";

                    const activeCount   = data.filter(s => s.status.toUpperCase() === "ACTIVE").length;
                    const inactiveCount = data.length - activeCount;

                    countActive.textContent   = activeCount   + " active";
                    countInactive.textContent = inactiveCount + " inactive";
                    countTotal.textContent    = data.length   + " total";

                    data.forEach((student, i) => {
                        const tr = document.createElement("tr");
                        tr.style.animationDelay = (i * 0.05) + "s";
                        tr.classList.add("row-animate");

                        const isActive      = student.status.toUpperCase() === "ACTIVE";
                        const tmplId        = isActive ? "heartbeat-active" : "heartbeat-inactive";
                        const tmpl          = document.getElementById(tmplId);
                        const heartbeatNode = tmpl.content.cloneNode(true);

                        const tdStatus = document.createElement("td");
                        tdStatus.appendChild(heartbeatNode);

                        tr.innerHTML = `
                            <td><span class="id-badge">#${student.id}</span></td>
                            <td><span class="student-name">${student.name}</span></td>
                            <td class="col-last-active"><span class="time-label">${student.last_active}</span></td>
                        `;
                        tr.appendChild(tdStatus);
                        tbody.appendChild(tr);
                    });
                }
            });
    };

    fetchStudents();
    setInterval(fetchStudents, 5000);

    const socket = io();
    socket.on("update_students", function () {
        fetchStudents();
    });
}


/* ============================================================
   5. LOGIN PAGE (teacher_login.html)
============================================================ */

function initLoginPage() {
    const container = document.getElementById("particles");
    if (!container) return;

    for (let i = 0; i < 40; i++) {
        const p = document.createElement("div");
        p.classList.add("particle");
        p.style.left            = Math.random() * 100 + "vw";
        p.style.width           = p.style.height = (Math.random() * 3 + 1) + "px";
        p.style.animationDuration = (Math.random() * 15 + 10) + "s";
        p.style.animationDelay    = (Math.random() * 15) + "s";
        container.appendChild(p);
    }
}


/* ============================================================
   6. INDEX PAGE (index.html)
============================================================ */

function initIndexPage() {

    const particleContainer = document.getElementById("index-particles");
    if (particleContainer) {
        for (let i = 0; i < 30; i++) {
            const p = document.createElement("div");
            p.style.cssText = `
                position: absolute;
                background: white;
                border-radius: 50%;
                opacity: 0;
                left: ${Math.random() * 100}vw;
                width: ${Math.random() * 2 + 1}px;
                height: ${Math.random() * 2 + 1}px;
                animation: floatUp ${Math.random() * 15 + 10}s linear ${Math.random() * 15}s infinite;
            `;
            particleContainer.appendChild(p);
        }
    }

    document.querySelectorAll(".idx-s_round").forEach(function (btn) {
        const targetId = btn.getAttribute("data-target");
        const flipBox  = document.getElementById(targetId);
        const bRound   = btn.closest(".idx-r_wrap").querySelector(".idx-b_round");
        const arrow    = btn.querySelector(".idx-s_arrow");

        btn.addEventListener("mouseenter", function () {
            bRound.classList.add("active");
        });
        btn.addEventListener("mouseleave", function () {
            bRound.classList.remove("active");
        });

        btn.addEventListener("click", function () {
            flipBox.classList.toggle("flipped");
            arrow.classList.toggle("rotated");

            btn.classList.add("clicked");
            btn.addEventListener("transitionend", function handler() {
                btn.classList.remove("clicked");
                btn.removeEventListener("transitionend", handler);
            });
        });
    });
}