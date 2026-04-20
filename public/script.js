const firebaseConfig = {
    apiKey: "AIzaSyCCjI9e2oi2g-PAsgJn4fsD40qrdEDiDQ4",
    authDomain: "statistiqcricket.firebaseapp.com",
    projectId: "statistiqcricket",
    storageBucket: "statistiqcricket.firebasestorage.app",
    messagingSenderId: "55956915865",
    appId: "1:55956915865:web:799a20e9476c685d101a08",
    measurementId: "G-84ZWBMLG29",
};

// =========================================
// 1. INITIALIZATION & GLOBALS
// =========================================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let matches = [];
let chartInstance = null;
let winLossChartInstance = null;
let isLoginMode = true;
let statusTimeout;

// =========================================
// 2. DOM ELEMENTS
// =========================================
// Form & App Elements
const form = document.getElementById("matchForm");
const dismissedCheckbox = document.getElementById("dismissed");
const dismissalContainer = document.getElementById("dismissalContainer");
const matchListEl = document.getElementById("matchList");

// Auth Elements
const authOverlay = document.getElementById("authOverlay");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const toggleAuthMode = document.getElementById("toggleAuthMode");
const logoutBtn = document.getElementById("logoutBtn");

// UI Elements
const statusBar = document.getElementById("statusBar");
const historyFilter = document.getElementById("historyFilter");
const dateFilterFrom = document.getElementById("dateFilterFrom");
const dateFilterTo = document.getElementById("dateFilterTo");
const captainFilter = document.getElementById("captainFilter"); // Add this with your other filters
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const modal = document.getElementById("matchModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalSpan = document.getElementsByClassName("close-modal")[0];

// --- SCROLL REVEAL LOGIC ---
const scrollObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                // Optional: stop watching once it has appeared
                scrollObserver.unobserve(entry.target);
            }
        });
    },
    {
        threshold: 0.1, // Trigger when 10% of the element is visible
    },
);

// Start observing all reveal elements
document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
    scrollObserver.observe(el);
});

// =========================================
// 3. AUTHENTICATION LOGIC
// =========================================
toggleAuthMode.addEventListener("click", (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authSubmitBtn.innerText = isLoginMode ? "Log In" : "Sign Up";
    toggleAuthMode.innerText = isLoginMode ? "Sign Up" : "Log In";
});

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("ENTER KEY DETECTED - FORM SUBMITTING!");
    const email = authEmail.value;
    const password = authPassword.value;

    try {
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
            showStatus("Successfully logged in!", false);
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
            showStatus("Account created successfully!", false);
        }
        authForm.reset();
    } catch (err) {
        showStatus(err.message, true);
    }
});

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return str
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global Event Listener for the Enter Key
document.addEventListener("keydown", (e) => {
    // Check if the key pressed was Enter
    if (e.key === "Enter") {
        // Check if the user is currently typing in the Email or Password field
        if (e.target.id === "authEmail" || e.target.id === "authPassword") {
            e.preventDefault(); // Stop any weird default browser behavior
            console.log("Global Enter detected! Forcing click...");

            // Physically trigger the button click
            document.getElementById("authSubmitBtn").click();
        }
    }
});

logoutBtn.addEventListener("click", () => {
    auth.signOut();
});

// Auth Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        authOverlay.style.display = "none";
        document.body.classList.remove("no-scroll"); // ENABLE SCROLLING when logged in
        document.querySelector(".app-header h1").innerText =
            `Hey, ${user.email.split("@")[0]}!`;
        loadMatches();
    } else {
        currentUser = null;
        authOverlay.style.display = "flex";
        document.body.classList.add("no-scroll"); // DISABLE SCROLLING when logged out
        matches = [];
        updateUI();
    }
});

// =========================================
// 4. CLOUD DATABASE LOGIC
// =========================================
async function loadMatches() {
    if (!currentUser) return;

    try {
        const snapshot = await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("matches")
            .get();
        matches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        matches.sort((a, b) => new Date(b.date) - new Date(a.date));
        updateUI();
    } catch (err) {
        console.error("Error loading matches:", err);
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const matchData = {
        date: document.getElementById("date").value,
        team: document.getElementById("team").value,
        opponent: document.getElementById("opponent").value,
        format: document.getElementById("format").value,
        result: document.getElementById("result").value,
        runs: parseInt(document.getElementById("runs").value) || 0,
        ballsFaced: parseInt(document.getElementById("ballsFaced").value) || 0,
        fours: parseInt(document.getElementById("fours").value) || 0,
        sixes: parseInt(document.getElementById("sixes").value) || 0,
        dismissed: document.getElementById("dismissed").checked,
        dismissalMethod: document.getElementById("dismissalMethod").value,
        overs: parseFloat(document.getElementById("overs").value) || 0,
        maidens: parseInt(document.getElementById("maidens").value) || 0,
        runsConceded:
            parseInt(document.getElementById("runsConceded").value) || 0,
        wickets: parseInt(document.getElementById("wickets").value) || 0,
        wides: parseInt(document.getElementById("wides").value) || 0, // NEW
        noBalls: parseInt(document.getElementById("noBalls").value) || 0, // NEW
        catches: parseInt(document.getElementById("catches").value) || 0,
        droppedCatches:
            parseInt(document.getElementById("droppedCatches").value) || 0,
        runouts: parseInt(document.getElementById("runouts").value) || 0,
        stumpings: parseInt(document.getElementById("stumpings").value) || 0,
        isCaptain: document.getElementById("isCaptain").checked, // NEW
        notes: document.getElementById("notes").value,

        isMultiDay:
            document.getElementById("format").value === "Test / Multi-day",

        // 2nd Innings Batting
        runs2: parseInt(document.getElementById("runs2").value) || 0,
        ballsFaced2:
            parseInt(document.getElementById("ballsFaced2").value) || 0,
        fours2: parseInt(document.getElementById("fours2").value) || 0,
        sixes2: parseInt(document.getElementById("sixes2").value) || 0,
        dismissed2: document.getElementById("dismissed2").checked,
        dismissalMethod2: document.getElementById("dismissalMethod2").value,

        // 2nd Innings Bowling
        overs2: parseFloat(document.getElementById("overs2").value) || 0,
        maidens2: parseInt(document.getElementById("maidens2").value) || 0,
        runsConceded2:
            parseInt(document.getElementById("runsConceded2").value) || 0,
        wickets2: parseInt(document.getElementById("wickets2").value) || 0,
        wides2: parseInt(document.getElementById("wides2").value) || 0,
        noBalls2: parseInt(document.getElementById("noBalls2").value) || 0,
    };

    try {
        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("matches")
            .add(matchData);
        form.reset();
        document.getElementById("batting2Section").style.display = "none";
        document.getElementById("bowling2Section").style.display = "none";
        document.getElementById("dismissalContainer2").style.display = "none";
        dismissalContainer.style.display = "none";
        document.getElementById("date").valueAsDate = new Date();
        modal.style.display = "none";
        document.body.classList.remove("no-scroll");
        loadMatches();
        showStatus("Match saved successfully!", false);
    } catch (err) {
        console.error("Error saving match:", err);
        showStatus("Failed to save match to cloud.", true);
    }
});

async function deleteMatch(id) {
    if (!currentUser) {
        showStatus("You must be logged in to delete matches.", true);
        return;
    }

    try {
        showStatus("Deleting match...", false);

        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("matches")
            .doc(id)
            .delete();

        showStatus("Match deleted successfully!", false);
        loadMatches(); // Refresh the screen
    } catch (err) {
        console.error("Error deleting match:", err);
        showStatus("Failed to delete: " + err.message, true);
    }
}

// =========================================
// 5. EVENT LISTENERS & UI HELPERS
// =========================================
function showStatus(message, isError = true) {
    statusBar.innerHTML = isError
        ? `<i class="fas fa-exclamation-circle"></i> ${message}`
        : `<i class="fas fa-check-circle"></i> ${message}`;
    statusBar.className = `status-bar show ${isError ? "error" : "success"}`;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
        statusBar.classList.remove("show");
    }, 4000);
}

dismissedCheckbox.addEventListener("change", (e) => {
    dismissalContainer.style.display = e.target.checked ? "block" : "none";
});

// Toggle 2nd Innings Form Sections
document.getElementById("format").addEventListener("change", (e) => {
    const isMulti = e.target.value === "Test / Multi-day";
    document.getElementById("batting2Section").style.display = isMulti
        ? "block"
        : "none";
    document.getElementById("bowling2Section").style.display = isMulti
        ? "block"
        : "none";
});

// Toggle 2nd Innings Dismissal Dropdown
document.getElementById("dismissed2").addEventListener("change", (e) => {
    document.getElementById("dismissalContainer2").style.display = e.target
        .checked
        ? "block"
        : "none";
});

historyFilter.addEventListener("change", updateUI);
dateFilterFrom.addEventListener("change", updateUI);
dateFilterTo.addEventListener("change", updateUI);
captainFilter.addEventListener("change", updateUI);

clearFiltersBtn.addEventListener("click", () => {
    historyFilter.value = "All";
    dateFilterFrom.value = "";
    dateFilterTo.value = "";
    captainFilter.value = "All"; // NEW
    updateUI();
});

// Modal Open/Close Logic
openModalBtn.onclick = () => {
    modal.style.display = "flex";
    document.body.classList.add("no-scroll"); // BUGFIX: Lock scroll
};

closeModalSpan.onclick = () => {
    modal.style.display = "none";
    document.body.classList.remove("no-scroll"); // BUGFIX: Unlock scroll
};

window.onclick = (e) => {
    if (e.target == modal) {
        modal.style.display = "none";
        document.body.classList.remove("no-scroll"); // BUGFIX: Unlock scroll
    }
};
// Initial state
document.getElementById("date").valueAsDate = new Date();

// Bulletproof Delete Listener (Event Delegation) ---
matchListEl.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-match-btn");

    if (deleteBtn) {
        const matchId = deleteBtn.getAttribute("data-id");
        if (matchId) deleteMatch(matchId);
    }
});

// =========================================
// 6. DATA PROCESSING & RENDERING
// =========================================
function oversToBalls(oversStr) {
    const num = parseFloat(oversStr);
    const wholeOvers = Math.floor(num);
    const balls = Math.round((num - wholeOvers) * 10);
    return wholeOvers * 6 + balls;
}

function getFilteredMatches() {
    const selectedFormat = historyFilter.value;
    const fromDate = dateFilterFrom.value;
    const toDate = dateFilterTo.value;
    const selectedCaptain = captainFilter.value;

    return matches.filter((m) => {
        const formatMatch =
            selectedFormat === "All" || m.format === selectedFormat;
        let dateMatch = true;
        const matchDate = new Date(m.date);
        matchDate.setHours(0, 0, 0, 0);

        if (fromDate) {
            const fDate = new Date(fromDate);
            fDate.setHours(0, 0, 0, 0);
            dateMatch = dateMatch && matchDate >= fDate;
        }
        if (toDate) {
            const tDate = new Date(toDate);
            tDate.setHours(0, 0, 0, 0);
            dateMatch = dateMatch && matchDate <= tDate;
        }

        // NEW: Captaincy Check
        let captainMatch = true;
        if (selectedCaptain === "Captain") {
            captainMatch = m.isCaptain === true;
        }

        return formatMatch && dateMatch && captainMatch;
    });
}

function updateUI() {
    const filteredMatches = getFilteredMatches();
    const formatPrefix =
        historyFilter.value === "All" ? "All Formats" : historyFilter.value;

    // 2. Figure out the Date string first
    const fromDate = dateFilterFrom.value;
    const toDate = dateFilterTo.value;
    let dateText = "All Time"; // Default to All Time

    if (fromDate && toDate) {
        const f = new Date(fromDate).toLocaleDateString("en-GB");
        const t = new Date(toDate).toLocaleDateString("en-GB");
        dateText = `${f} — ${t}`;
    } else if (fromDate) {
        dateText = `Since ${new Date(fromDate).toLocaleDateString("en-GB")}`;
    } else if (toDate) {
        dateText = `Up to ${new Date(toDate).toLocaleDateString("en-GB")}`;
    }

    // 3. Tag on the captaincy if needed
    dateText += ` | ${formatPrefix}`;
    if (captainFilter.value === "Captain") {
        dateText += " | as captain";
    }

    // 4. Update the DOM elements
    document.getElementById("stats-date-range").innerText = dateText;
    document.getElementById("history-date-range").innerText = dateText;

    renderHistory(filteredMatches);
    calculateStats(filteredMatches);
}

function renderHistory(filteredMatches) {
    document.getElementById("history-header").innerText =
        `Match History (${filteredMatches.length} Matches)`;

    matchListEl.innerHTML = "";
    if (filteredMatches.length === 0) {
        matchListEl.innerHTML =
            '<div class="empty-state">No matches found for this selection.</div>';
        return;
    }

    filteredMatches.forEach((match, index) => {
        // Helpers to format the text
        const getBatStr = (runs, balls, fours, sixes, dismissed, method) => {
            if (balls === 0 && runs === 0 && !dismissed) return null;
            let sr = balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00";
            let str = `${runs}${dismissed ? "" : "*"} (${sixes || 0}x6, ${fours || 0}x4 SR: ${sr})`;
            if (dismissed && method) str += ` - ${method}`;
            return str;
        };

        const getBowlStr = (overs, maidens, runs, wickets, wides, noBalls) => {
            if (overs <= 0) return null;
            let econ =
                oversToBalls(overs) > 0
                    ? (runs / (oversToBalls(overs) / 6)).toFixed(2)
                    : "0.00";
            return `${overs}-${maidens || 0}-${runs}-${wickets} (Econ: ${econ}, Wd: ${wides || 0}, Nb: ${noBalls || 0})`;
        };

        // Generate Strings
        let bat1 = getBatStr(
            match.runs,
            match.ballsFaced,
            match.fours,
            match.sixes,
            match.dismissed,
            match.dismissalMethod,
        );
        let bat2 = match.isMultiDay
            ? getBatStr(
                  match.runs2,
                  match.ballsFaced2,
                  match.fours2,
                  match.sixes2,
                  match.dismissed2,
                  match.dismissalMethod2,
              )
            : null;

        let battingText = "Did not bat";
        if (bat1 && bat2) battingText = `1st: ${bat1} <br> 2nd: ${bat2}`;
        else if (bat1) battingText = bat1;
        else if (bat2) battingText = bat2; // In case they only batted in the 2nd innings

        let bowl1 = getBowlStr(
            match.overs,
            match.maidens,
            match.runsConceded,
            match.wickets,
            match.wides,
            match.noBalls,
        );
        let bowl2 = match.isMultiDay
            ? getBowlStr(
                  match.overs2,
                  match.maidens2,
                  match.runsConceded2,
                  match.wickets2,
                  match.wides2,
                  match.noBalls2,
              )
            : null;

        let bowlingText = "Did not bowl";
        if (bowl1 && bowl2) bowlingText = `1st: ${bowl1} <br> 2nd: ${bowl2}`;
        else if (bowl1) bowlingText = bowl1;
        else if (bowl2) bowlingText = bowl2;

        let fieldingParts = [];
        if (match.catches > 0) fieldingParts.push(`${match.catches}c`);
        if (match.runouts > 0) fieldingParts.push(`${match.runouts}ro`);
        if (match.stumpings > 0) fieldingParts.push(`${match.stumpings}st`);
        let fieldingStr = fieldingParts.join(", ");

        let titleText = `${escapeHTML(match.team)} vs ${escapeHTML(match.opponent)}`;
        if (match.innings && match.innings !== "Only") {
            titleText += ` (${match.innings} Innings)`;
        }

        let captainBadgeHtml = match.isCaptain
            ? `<span class="captain-badge">CAPT</span>`
            : "";

        const html = `
            <div class="match-card" style="animation-delay: ${index * 0.05}s;">
                <div class="match-card-header">
                    <div>
                        <div class="match-title">${titleText} ${captainBadgeHtml}</div>
                        <div class="match-date">${new Date(match.date).toLocaleDateString("en-GB")} | ${match.format}</div>
                    </div>
                    <div class="header-actions">
                        <div class="match-result result-${match.result}">${match.result}</div>
                        <button class="delete-btn delete-match-btn" data-id="${match.id}" title="Delete match"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="match-performances">
                    <div class="perf-section"><strong>Batting</strong><span>${battingText}</span></div>
                    <div class="perf-section"><strong>Bowling</strong><span>${bowlingText}</span></div>
                    ${fieldingParts.length > 0 ? `<div class="perf-section"><strong>Fielding</strong><span>${fieldingStr}</span></div>` : ""}
                </div>
                ${match.notes ? `<div style="margin-top: 12px; padding-top: 10px; font-size: 0.85rem; color: var(--text-muted); font-style: italic;"><i class="fas fa-comment-dots" style="color: var(--text-muted); margin-right: 5px; width: 16px; text-align: center;"></i> "${escapeHTML(match.notes)}"</div>` : ""}
            </div>
        `;
        matchListEl.insertAdjacentHTML("beforeend", html);
    });
}

function calculateStats(filteredMatches) {
    let totalRuns = 0,
        totalBallsFaced = 0,
        dismissals = 0;
    let highestScore = 0,
        hsNotOut = false;
    let totalWickets = 0,
        totalRunsConceded = 0,
        totalBallsBowled = 0;
    let bestWickets = -1,
        bestRuns = 999;
    let totalCatches = 0,
        totalRunouts = 0,
        totalStumpings = 0,
        totalDropped = 0;
    let dismissalCounts = {};
    let resultsCounts = { Won: 0, Lost: 0, Draw: 0, Tie: 0 };

    // NEW GRANULAR TRACKERS
    let batInnings = 0,
        bowlInnings = 0,
        notOuts = 0,
        ducks = 0;
    let fifties = 0,
        hundreds = 0,
        fiveWickets = 0;
    let total4s = 0,
        total6s = 0,
        totalWides = 0,
        totalNoBalls = 0;

    filteredMatches.forEach((m) => {
        if (m.result) resultsCounts[m.result]++;

        // --- HELPER: Process a single batting innings ---
        const processBatting = (
            runs,
            balls,
            fours,
            sixes,
            dismissed,
            method,
        ) => {
            if (balls === 0 && runs === 0 && !dismissed) return; // Did not bat

            batInnings++;
            totalRuns += runs;
            totalBallsFaced += balls;
            total4s += fours || 0;
            total6s += sixes || 0;

            if (!dismissed) notOuts++;
            if (dismissed && runs === 0) ducks++;

            if (dismissed) {
                dismissals++;
                let dMethod = method || "Unknown";
                dismissalCounts[dMethod] = (dismissalCounts[dMethod] || 0) + 1;
            }

            if (runs > highestScore) {
                highestScore = runs;
                hsNotOut = !dismissed;
            } else if (runs === highestScore && !dismissed && !hsNotOut) {
                hsNotOut = true;
            }

            if (runs >= 100) hundreds++;
            else if (runs >= 50) fifties++;
        };

        // --- HELPER: Process a single bowling innings ---
        const processBowling = (
            overs,
            maidens,
            runsC,
            wickets,
            wides,
            noBalls,
        ) => {
            if (overs <= 0) return; // Did not bowl

            bowlInnings++;
            totalWickets += wickets;
            totalRunsConceded += runsC;
            totalBallsBowled += oversToBalls(overs);
            totalWides += wides || 0;
            totalNoBalls += noBalls || 0;

            if (wickets >= 5) fiveWickets++;

            if (
                wickets > bestWickets ||
                (wickets === bestWickets && runsC < bestRuns)
            ) {
                bestWickets = wickets;
                bestRuns = runsC;
            }
        };

        // Run the 1st Innings
        processBatting(
            m.runs,
            m.ballsFaced,
            m.fours,
            m.sixes,
            m.dismissed,
            m.dismissalMethod,
        );
        processBowling(
            m.overs,
            m.maidens,
            m.runsConceded,
            m.wickets,
            m.wides,
            m.noBalls,
        );

        // Run the 2nd Innings if it exists
        if (m.isMultiDay) {
            processBatting(
                m.runs2,
                m.ballsFaced2,
                m.fours2,
                m.sixes2,
                m.dismissed2,
                m.dismissalMethod2,
            );
            processBowling(
                m.overs2,
                m.maidens2,
                m.runsConceded2,
                m.wickets2,
                m.wides2,
                m.noBalls2,
            );
        }

        // FIELDING LOGIC (Applies to whole match)
        totalCatches += m.catches || 0;
        totalRunouts += m.runouts || 0;
        totalStumpings += m.stumpings || 0;
        totalDropped += m.droppedCatches || 0;
    });

    const batAvg =
        dismissals > 0 ? totalRuns / dismissals : totalRuns > 0 ? totalRuns : 0;
    const strikeRate =
        totalBallsFaced > 0 ? (totalRuns / totalBallsFaced) * 100 : 0;
    const hsString =
        highestScore > 0 || hsNotOut
            ? `${highestScore}${hsNotOut ? "*" : ""}`
            : "0";
    const economy =
        totalBallsBowled > 0 ? totalRunsConceded / (totalBallsBowled / 6) : 0;
    const bowlAvg = totalWickets > 0 ? totalRunsConceded / totalWickets : 0;
    const bbString = bestWickets >= 0 ? `${bestWickets}/${bestRuns}` : "-";

    // INJECT INTO DOM
    document.getElementById("stat-bat-inns").innerText = batInnings;
    document.getElementById("stat-total-runs").innerText = totalRuns;
    document.getElementById("stat-bat-avg").innerText =
        dismissals === 0 && totalRuns > 0 ? "NA" : batAvg.toFixed(2);
    document.getElementById("stat-sr").innerText = strikeRate.toFixed(2);
    document.getElementById("stat-hs").innerText = hsString;
    document.getElementById("stat-not-outs").innerText = notOuts;
    document.getElementById("stat-100s").innerText = hundreds;
    document.getElementById("stat-50s").innerText = fifties;
    document.getElementById("stat-total-4s").innerText = total4s;
    document.getElementById("stat-total-6s").innerText = total6s;
    document.getElementById("stat-ducks").innerText = ducks;

    document.getElementById("stat-bowl-inns").innerText = bowlInnings;
    document.getElementById("stat-wickets").innerText = totalWickets;
    document.getElementById("stat-bowl-avg").innerText =
        totalWickets === 0 ? "-" : bowlAvg.toFixed(2);
    document.getElementById("stat-economy").innerText = economy.toFixed(2);
    document.getElementById("stat-bb").innerText = bbString;
    document.getElementById("stat-5w").innerText = fiveWickets;
    document.getElementById("stat-wides").innerText = totalWides;
    document.getElementById("stat-noballs").innerText = totalNoBalls;

    document.getElementById("stat-catches").innerText = totalCatches;
    document.getElementById("stat-dropped").innerText = totalDropped;
    document.getElementById("stat-runouts").innerText = totalRunouts;
    document.getElementById("stat-stumpings").innerText = totalStumpings;

    renderStraightBarChart(dismissalCounts, dismissals);
    renderWinLossChart(resultsCounts, filteredMatches.length);
}

// =========================================
// 7. CHART RENDERING
// =========================================
function renderStraightBarChart(dismissalCounts, totalDismissals) {
    const ctx = document.getElementById("dismissalChart").getContext("2d");
    const wrapper = document.getElementById("dismissalChartWrapper");
    const labels = Object.keys(dismissalCounts);

    if (chartInstance) chartInstance.destroy();

    if (labels.length === 0 || totalDismissals === 0) {
        wrapper.style.display = "none";
        return;
    }
    wrapper.style.display = "block";

    const chartColors = [
        "#fbbf24", // Premium Gold
        "#3b82f6", // Bright Blue
        "#8b5cf6", // Tropical Violet
        "#10b981", // Emerald Green
        "#f59e0b", // Amber
        "#ef4444", // Soft Red
        "#06b6d4", // Cyan
        "#f97316", // Orange
        "#6366f1", // Indigo
        "#ec4899", // Pink/Magenta
    ];
    const datasets = labels.map((label, index) => {
        // Determine if this is the first or last segment in the stack
        const isFirst = index === 0;
        const isLast = index === labels.length - 1;

        return {
            label: label,
            data: [dismissalCounts[label]],
            backgroundColor: chartColors[index % chartColors.length],
            barThickness: 12,
            // NEW: Only round the far left and far right corners
            borderRadius: {
                topLeft: isFirst ? 9 : 0,
                bottomLeft: isFirst ? 9 : 0,
                topRight: isLast ? 9 : 0,
                bottomRight: isLast ? 9 : 0,
            },
            borderSkipped: false,
            borderWidth: 1,
            borderColor: "#ffffff",
        };
    });

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: { labels: ["Dismissals"], datasets: datasets },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, display: false, max: totalDismissals },
                y: { stacked: true, display: false },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const percentage = (
                                (value / totalDismissals) *
                                100
                            ).toFixed(1);
                            return ` ${context.dataset.label}: ${value} (${percentage}%)`;
                        },
                    },
                },
            },
        },
    });
}

function renderWinLossChart(resultsCounts, totalMatches) {
    const ctx = document.getElementById("winLossChart").getContext("2d");
    const wrapper = document.getElementById("winLossChartWrapper");

    if (winLossChartInstance) winLossChartInstance.destroy();

    if (totalMatches === 0) {
        wrapper.style.display = "none";
        return;
    }
    wrapper.style.display = "block";

    const resultColors = {
        Won: "#2ec4b6",
        Lost: "#dc2626",
        Draw: "#0ea5e9",
        Tie: "#a855f7",
    };

    const labels = Object.keys(resultsCounts).filter(
        (key) => resultsCounts[key] > 0,
    );

    const datasets = labels.map((label, index) => {
        // Determine if this is the first or last segment in the stack
        const isFirst = index === 0;
        const isLast = index === labels.length - 1;

        return {
            label: label,
            data: [resultsCounts[label]],
            backgroundColor: resultColors[label],
            barThickness: 12,
            // NEW: Only round the far left and far right corners
            borderRadius: {
                topLeft: isFirst ? 9 : 0,
                bottomLeft: isFirst ? 9 : 0,
                topRight: isLast ? 9 : 0,
                bottomRight: isLast ? 9 : 0,
            },
            borderSkipped: false,
            borderWidth: 1,
            borderColor: "#ffffff",
        };
    });

    winLossChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Results"],
            datasets: datasets,
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, display: false, max: totalMatches },
                y: { stacked: true, display: false },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            const percentage = (
                                (value / totalMatches) *
                                100
                            ).toFixed(1);
                            return ` ${context.dataset.label}: ${value} (${percentage}%)`;
                        },
                    },
                },
            },
        },
    });
}
