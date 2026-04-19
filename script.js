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
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const modal = document.getElementById("matchModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalSpan = document.getElementsByClassName("close-modal")[0];

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

logoutBtn.addEventListener("click", () => {
    auth.signOut();
});

// Auth Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        authOverlay.style.display = "none";
        document.querySelector(".app-header h1").innerText =
            `Hey, ${user.email.split("@")[0]}!`;
        loadMatches();
    } else {
        currentUser = null;
        authOverlay.style.display = "flex";
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
        catches: parseInt(document.getElementById("catches").value) || 0,
        runouts: parseInt(document.getElementById("runouts").value) || 0,
        stumpings: parseInt(document.getElementById("stumpings").value) || 0,
        captain: document.getElementById("captain").checked,
        notes: document.getElementById("notes").value,
    };

    try {
        await db
            .collection("users")
            .doc(currentUser.uid)
            .collection("matches")
            .add(matchData);
        form.reset();
        dismissalContainer.style.display = "none";
        document.getElementById("date").valueAsDate = new Date();
        modal.style.display = "none";
        loadMatches();
        showStatus("Match saved successfully!", false);
    } catch (err) {
        console.error("Error saving match:", err);
        showStatus("Failed to save match to cloud.", true);
    }
});

async function deleteMatch(id) {
    if (!currentUser) return;
    if (confirm("Are you sure you want to permanently delete this match?")) {
        try {
            await db
                .collection("users")
                .doc(currentUser.uid)
                .collection("matches")
                .doc(id)
                .delete();
            loadMatches();
        } catch (err) {
            console.error("Error deleting match:", err);
        }
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

historyFilter.addEventListener("change", updateUI);
dateFilterFrom.addEventListener("change", updateUI);
dateFilterTo.addEventListener("change", updateUI);

clearFiltersBtn.addEventListener("click", () => {
    historyFilter.value = "All";
    dateFilterFrom.value = "";
    dateFilterTo.value = "";
    updateUI();
});

openModalBtn.onclick = () => (modal.style.display = "flex");
closeModalSpan.onclick = () => (modal.style.display = "none");
window.onclick = (e) => {
    if (e.target == modal) modal.style.display = "none";
};

// Initial state
document.getElementById("date").valueAsDate = new Date();

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
        return formatMatch && dateMatch;
    });
}

function updateUI() {
    const filteredMatches = getFilteredMatches();
    const formatPrefix =
        historyFilter.value === "All" ? "All Formats" : historyFilter.value;

    document.getElementById("stats-header").innerText =
        `${formatPrefix} Performance Stats`;
    document.getElementById("history-header").innerText =
        `${formatPrefix} Match History`;

    const fromDate = dateFilterFrom.value;
    const toDate = dateFilterTo.value;
    let dateText = "All Time";

    if (fromDate && toDate) {
        const f = new Date(fromDate).toLocaleDateString("en-GB");
        const t = new Date(toDate).toLocaleDateString("en-GB");
        dateText = `${f} — ${t}`;
    } else if (fromDate) {
        dateText = `Since ${new Date(fromDate).toLocaleDateString("en-GB")}`;
    } else if (toDate) {
        dateText = `Up to ${new Date(toDate).toLocaleDateString("en-GB")}`;
    }

    document.getElementById("stats-date-range").innerText = dateText;
    document.getElementById("history-date-range").innerText = dateText;

    renderHistory(filteredMatches);
    calculateStats(filteredMatches);
}

function renderHistory(filteredMatches) {
    matchListEl.innerHTML = "";
    if (filteredMatches.length === 0) {
        matchListEl.innerHTML =
            '<div class="empty-state">No matches found for this selection.</div>';
        return;
    }

    filteredMatches.forEach((match) => {
        const isBatting =
            match.ballsFaced > 0 || match.runs > 0 || match.dismissed;
        const isBowling = match.overs > 0;

        let battingText = isBatting
            ? `${match.runs}${match.dismissed ? "" : "*"} off ${match.ballsFaced} balls`
            : "Did not bat";
        if (match.dismissed && match.dismissalMethod)
            battingText += ` (${match.dismissalMethod})`;

        let matchEconomy = "0.00";
        if (isBowling && oversToBalls(match.overs) > 0) {
            matchEconomy = (
                match.runsConceded /
                (oversToBalls(match.overs) / 6)
            ).toFixed(2);
        }

        let bowlingText = isBowling
            ? `${match.wickets}/${match.runsConceded} (${match.overs} ov, Econ: ${matchEconomy})`
            : "Did not bowl";

        let fieldingParts = [];
        if (match.catches > 0) fieldingParts.push(`${match.catches}c`);
        if (match.runouts > 0) fieldingParts.push(`${match.runouts}ro`);
        if (match.stumpings > 0) fieldingParts.push(`${match.stumpings}st`);
        let fieldingStr = fieldingParts.join(", ");

        const html = `
            <div class="match-card">
                <div class="match-card-header">
                    <div>
                        <div class="match-title">${match.team} vs ${match.opponent}</div>
                        <div class="match-date">${new Date(match.date).toLocaleDateString("en-GB")} | ${match.format}</div>
                    </div>
                    <div class="header-actions">
                        <div class="match-result result-${match.result}">${match.result}</div>
                        <button class="delete-btn" onclick="deleteMatch('${match.id}')" title="Delete match"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="match-performances">
                    <div class="perf-section"><strong>Batting</strong><span><i class="fas fa-baseball-bat-ball"></i> ${battingText}</span></div>
                    <div class="perf-section"><strong>Bowling</strong><span><i class="fas fa-baseball-ball"></i> ${bowlingText}</span></div>
                    ${fieldingParts.length > 0 ? `<div class="perf-section"><strong>Fielding</strong><span><i class="fas fa-hands"></i> ${fieldingStr}</span></div>` : ""}
                </div>
                ${match.notes ? `<div style="margin-top: 12px; padding-top: 10px; font-size: 0.85rem; color: var(--text-muted); font-style: italic;"><i class="fas fa-comment-dots" style="color: var(--text-muted); margin-right: 5px; width: 16px; text-align: center;"></i> "${match.notes}"</div>` : ""}
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
    let dismissalCounts = {};
    let totalWickets = 0,
        totalRunsConceded = 0,
        totalBallsBowled = 0;
    let bestWickets = -1,
        bestRuns = 999;
    let totalCatches = 0,
        totalRunouts = 0;
    let resultsCounts = { Won: 0, Lost: 0, Draw: 0, Tie: 0 };

    filteredMatches.forEach((m) => {
        totalRuns += m.runs;
        totalBallsFaced += m.ballsFaced;

        if (m.result) resultsCounts[m.result]++;

        if (m.dismissed) {
            dismissals++;
            if (m.dismissalMethod) {
                dismissalCounts[m.dismissalMethod] =
                    (dismissalCounts[m.dismissalMethod] || 0) + 1;
            } else {
                dismissalCounts["Unknown"] =
                    (dismissalCounts["Unknown"] || 0) + 1;
            }
        }

        if (m.runs > highestScore) {
            highestScore = m.runs;
            hsNotOut = !m.dismissed;
        } else if (m.runs === highestScore && !m.dismissed && !hsNotOut) {
            hsNotOut = true;
        }

        totalWickets += m.wickets;
        totalRunsConceded += m.runsConceded;
        totalBallsBowled += oversToBalls(m.overs);

        if (
            m.wickets > bestWickets ||
            (m.wickets === bestWickets && m.runsConceded < bestRuns)
        ) {
            if (m.overs > 0) {
                bestWickets = m.wickets;
                bestRuns = m.runsConceded;
            }
        }

        totalCatches += m.catches;
        totalRunouts += m.runouts;
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

    document.getElementById("stat-total-runs").innerText = totalRuns;
    document.getElementById("stat-bat-avg").innerText =
        dismissals === 0 && totalRuns > 0 ? "NA" : batAvg.toFixed(2);
    document.getElementById("stat-sr").innerText = strikeRate.toFixed(2);
    document.getElementById("stat-hs").innerText = hsString;
    document.getElementById("stat-wickets").innerText = totalWickets;
    document.getElementById("stat-economy").innerText = economy.toFixed(2);
    document.getElementById("stat-bowl-avg").innerText =
        totalWickets === 0 ? "-" : bowlAvg.toFixed(2);
    document.getElementById("stat-bb").innerText = bbString;
    document.getElementById("stat-catches").innerText = totalCatches;
    document.getElementById("stat-runouts").innerText = totalRunouts;

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
        "#ff9f1c",
        "#2ec4b6",
        "#e71d36",
        "#011627",
        "#a855f7",
        "#3b82f6",
        "#f97316",
    ];
    const datasets = labels.map((label, index) => {
        return {
            label: label,
            data: [dismissalCounts[label]],
            backgroundColor: chartColors[index % chartColors.length],
            barThickness: 18,
            borderRadius: 9,
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
        Won: "#059669",
        Lost: "#dc2626",
        Draw: "#d97706",
        Tie: "#0ea5e9",
    };

    const labels = Object.keys(resultsCounts).filter(
        (key) => resultsCounts[key] > 0,
    );

    const datasets = labels.map((label) => {
        return {
            label: label,
            data: [resultsCounts[label]],
            backgroundColor: resultColors[label],
            barThickness: 18,
            borderRadius: 9,
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
