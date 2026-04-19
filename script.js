let matches = JSON.parse(localStorage.getItem("cricket_matches")) || [];
let chartInstance = null;

const form = document.getElementById("matchForm");
const dismissedCheckbox = document.getElementById("dismissed");
const dismissalContainer = document.getElementById("dismissalContainer");
const matchListEl = document.getElementById("matchList");

// Filter Controls
const historyFilter = document.getElementById("historyFilter");
const dateFilterFrom = document.getElementById("dateFilterFrom");
const dateFilterTo = document.getElementById("dateFilterTo");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// Modal Controls
const modal = document.getElementById("matchModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalSpan = document.getElementsByClassName("close-modal")[0];

// Handle Modal Opening/Closing
openModalBtn.onclick = function () {
    modal.style.display = "flex";
};

closeModalSpan.onclick = function () {
    modal.style.display = "none";
};

// Close modal if user clicks anywhere outside of the modal content box
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

dismissedCheckbox.addEventListener("change", (e) => {
    dismissalContainer.style.display = e.target.checked ? "block" : "none";
});

// Update UI whenever any filter changes
historyFilter.addEventListener("change", updateUI);
dateFilterFrom.addEventListener("change", updateUI);
dateFilterTo.addEventListener("change", updateUI);

// Clear Filters Logic
clearFiltersBtn.addEventListener("click", () => {
    historyFilter.value = "All";
    dateFilterFrom.value = "";
    dateFilterTo.value = "";
    updateUI();
});

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const match = {
        id: Date.now(),
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
        captain: document.getElementById("captain").checked,
        notes: document.getElementById("notes").value,
    };

    matches.push(match);
    saveData();
    form.reset();
    dismissalContainer.style.display = "none";
    document.getElementById("date").valueAsDate = new Date();

    // Close the modal upon saving
    modal.style.display = "none";
});

function deleteMatch(id) {
    if (confirm("Are you sure you want to delete this match?")) {
        matches = matches.filter((m) => m.id !== id);
        saveData();
    }
}

function saveData() {
    matches.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem("cricket_matches", JSON.stringify(matches));
    updateUI();
}

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
        // 1. Check Format
        const formatMatch =
            selectedFormat === "All" || m.format === selectedFormat;

        // 2. Check Date Range
        let dateMatch = true;
        const matchDate = new Date(m.date);

        // Zero out the time so date comparisons are accurate
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

        const html = `
            <div class="match-card">
                <div class="match-card-header">
                    <div>
                        <div class="match-title">${match.team} vs ${match.opponent}</div>
                        <div class="match-date">${new Date(match.date).toLocaleDateString("en-GB")} | ${match.format}</div>
                    </div>
                    <div class="header-actions">
                        <div class="match-result result-${match.result}">${match.result}</div>
                        <button class="delete-btn" onclick="deleteMatch(${match.id})" title="Delete match"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                
                <div class="match-performances">
                    <div class="perf-section">
                        <strong>Batting</strong>
                        <span><i class="fas fa-baseball-bat-ball"></i> ${battingText}</span>
                    </div>
                    <div class="perf-section">
                        <strong>Bowling</strong>
                        <span><i class="fas fa-baseball-ball"></i> ${bowlingText}</span>
                    </div>
                    ${
                        match.catches > 0 || match.runouts > 0
                            ? `
                    <div class="perf-section">
                        <strong>Fielding</strong>
                        <span><i class="fas fa-hands"></i> ${match.catches}c, ${match.runouts}ro</span>
                    </div>`
                            : ""
                    }
                </div>
                ${
                    match.notes
                        ? `
                    <div style="margin-top: 12px; padding-top: 10px; font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                        <i class="fas fa-comment-dots" style="color: var(--text-muted); margin-right: 5px; width: 16px; text-align: center;"></i> "${match.notes}"
                    </div>
                `
                        : ""
                }
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

    filteredMatches.forEach((m) => {
        totalRuns += m.runs;
        totalBallsFaced += m.ballsFaced;
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
}

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
        "#e71d36",
        "#ff9f1c",
        "#2ec4b6",
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
            barThickness: 24,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: "#ffffff",
        };
    });

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Dismissals"],
            datasets: datasets,
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    display: false,
                    max: totalDismissals,
                },
                y: {
                    stacked: true,
                    display: false,
                },
            },
            plugins: {
                legend: {
                    display: false,
                },
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

// Initialize
document.getElementById("date").valueAsDate = new Date();
updateUI();
