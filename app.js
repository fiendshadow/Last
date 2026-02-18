// ===== Константы даты и общие параметры =====
const daysRu = [
    "Воскресенье", "Понедельник", "Вторник",
    "Среда", "Четверг", "Пятница", "Суббота"
];
const today = new Date();
const todayIndex = today.getDay(); // 0..6
const todayName = daysRu[todayIndex];
const todayKey = today.toISOString().slice(0, 10); // YYYY-MM-DD
const LINES_PER_PAGE = 15;

// ===== DOM-элементы =====
const totalPagesInput   = document.getElementById("total-pages");
const currentPageInput  = document.getElementById("current-page");
const linesOnPageInput  = document.getElementById("lines-on-page");
const reviewPagesInput  = document.getElementById("review-pages");
const cycleDaysInput    = document.getElementById("cycle-days");
const weakPagesInput    = document.getElementById("weak-pages");
const lessonSizeSelect  = document.getElementById("lesson-size");

const useF1 = document.getElementById("use-f1");
const useF2 = document.getElementById("use-f2");
const useF3 = document.getElementById("use-f3");
const useF4 = document.getElementById("use-f4");
const useF5 = document.getElementById("use-f5");
const fortressToggles = { "1": useF1, "2": useF2, "3": useF3, "4": useF4, "5": useF5 };

const revisionToggle      = document.getElementById("revision-mode-toggle");
const darkModeToggle      = document.getElementById("dark-mode-toggle");
const compactModeToggle   = document.getElementById("compact-mode-toggle");
const useWeakPagesToggle  = document.getElementById("use-weak-pages");
const autoCycleDaysToggle = document.getElementById("auto-cycle-days-toggle");

const displayModeMinimalRadio = document.getElementById("display-mode-minimal");
const displayModeFullRadio    = document.getElementById("display-mode-full");

const todayNameSpan      = document.getElementById("today-name");
const todayDateSpan      = document.getElementById("today-date");
const todayNewLi         = document.getElementById("today-new");
const todayNearLi        = document.getElementById("today-near");
const todayFarLi         = document.getElementById("today-far");
const todayWeakSummaryLi = document.getElementById("today-weak-summary");
const nearReviewP        = document.getElementById("near-review-auto");

const totalPagesInfoSpan   = document.getElementById("total-pages-info");
const cycleDaysInfoSpan    = document.getElementById("cycle-days-info");
const dailyVolumeInfoSpan  = document.getElementById("daily-volume-info");
const reviewRangeTextSpan  = document.getElementById("review-range-text");
const thirdTodayMainP      = document.getElementById("third-today-main");
const thirdTodayWeakP      = document.getElementById("third-today-weak");
const resetReviewBtn       = document.getElementById("reset-review");

const tomorrowFarP  = document.getElementById("tomorrow-far");
const tomorrowWeakP = document.getElementById("tomorrow-weak");

const weakListInfoSpan = document.getElementById("weak-list-info");

const checklistElement   = document.getElementById("daily-checklist");
const checkboxes         = checklistElement.querySelectorAll("input[type='checkbox'][data-task-id]");
const resetChecklistBtn  = document.getElementById("reset-checklist");
const storageKeyChecklist = "quranPlanChecklist-" + todayKey;

const progressBarInner = document.getElementById("progress-bar-inner");
const progressText     = document.getElementById("progress-text");

const dailyNote = document.getElementById("daily-note");
const noteKey   = "quranPlanNote-" + todayKey;

const settingsPanel     = document.getElementById("settings-panel");
const toggleSettingsBtn = document.getElementById("toggle-settings");
const printBtn          = document.getElementById("print-btn");

const lessonDescShortSpan   = document.getElementById("lesson-desc-short");
const lessonDescHeadingSpan = document.getElementById("lesson-desc-heading");
const lessonDescGoalSpan    = document.getElementById("lesson-desc-goal");
const lessonDescStep1Span   = document.getElementById("lesson-desc-step1");
const lessonDesc5thSpan     = document.getElementById("lesson-desc-5th");
const nearBackLabelSpan     = document.getElementById("near-back-label");

const toggleForecastBtn = document.getElementById("toggle-forecast");
const forecastPanel     = document.getElementById("forecast-panel");
const forecastIntroP    = document.getElementById("forecast-intro");
const forecastTbody     = document.getElementById("forecast-tbody");
const forecastNoteP     = document.getElementById("forecast-note");

// История
const historyPrevBtn   = document.getElementById("history-prev");
const historyNextBtn   = document.getElementById("history-next");
const historyDateInput = document.getElementById("history-date");
const historyContentDiv= document.getElementById("history-content");

// Недельный план
const weeklyPlanToggleBtn = document.getElementById("toggle-weekly-plan");
const weeklyPlanPanel     = document.getElementById("weekly-plan-panel");
const weeklyPlanBody      = document.getElementById("weekly-plan-body");

// ===== Состояние =====
let settings = {};
let weakSet = new Set();
let reviewSet = [];   // массив страниц для 3-й крепости
let reviewState = null; // { lastDate, startIndex, todayCount, nextIndex }

// ===== Вспомогательные парсеры =====

function parsePagesPattern(text, maxPage) {
    const set = new Set();
    if (!text) return [];
    const max = Math.max(1, maxPage || 1);
    text.split(",").forEach(part => {
        part = part.trim();
        if (!part) return;
        const range = part.split("-").map(s => s.trim());
        if (range.length === 1) {
            const n = parseInt(range[0], 10);
            if (!isNaN(n) && n >= 1 && n <= max) set.add(n);
        } else {
            let a = parseInt(range[0], 10);
            let b = parseInt(range[1], 10);
            if (isNaN(a) || isNaN(b)) return;
            if (a > b) [a,b] = [b,a];
            if (b < 1) return;
            if (a < 1) a = 1;
            if (a > max) return;
            if (b > max) b = max;
            for (let i=a;i<=b;i++) set.add(i);
        }
    });
    return Array.from(set).sort((a,b)=>a-b);
}

function compressRanges(nums) {
    if (!nums || !nums.length) return "";
    const arr = Array.from(new Set(nums)).sort((a,b)=>a-b);
    const res = [];
    let start = arr[0];
    let prev  = arr[0];
    for (let i=1;i<arr.length;i++) {
        const n = arr[i];
        if (n === prev+1) {
            prev = n;
        } else {
            if (start === prev) res.push(String(start));
            else res.push(start + "–" + prev);
            start = prev = n;
        }
    }
    if (start === prev) res.push(String(start));
    else res.push(start + "–" + prev);
    return res.join(", ");
}

// ===== Загрузка/сохранение настроек =====

function loadSettings() {
    const isNarrow = (typeof window !== "undefined" && window.innerWidth < 700);
    const defaults = {
        totalPages: 19,
        currentPage: 19,
        linesOnCurrentPage: 0,
        reviewPagesText: "",
        cycleDays: 6,
        weakPages: "8-13",
        lessonSize: "5",
        activeFortresses: { "1": true, "2": true, "3": true, "4": true, "5": true },
        darkMode: false,
        revisionMode: false,
        settingsCollapsed: false,
        useWeakPages: true,
        compactMode: isNarrow,
        autoCycleDays: true,
        displayMode: "full"
    };
    try {
        const raw = localStorage.getItem("quranPlanSettingsV2");
        if (!raw) return defaults;
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object") return defaults;
        const out = { ...defaults };

        if (typeof data.totalPages === "number") out.totalPages = data.totalPages;
        if (typeof data.currentPage === "number") out.currentPage = data.currentPage;
        if (typeof data.linesOnCurrentPage === "number") out.linesOnCurrentPage = data.linesOnCurrentPage;
        if (typeof data.reviewPagesText === "string") out.reviewPagesText = data.reviewPagesText;
        if (typeof data.cycleDays === "number") out.cycleDays = data.cycleDays;
        if (typeof data.weakPages === "string") out.weakPages = data.weakPages;
        if (typeof data.lessonSize === "string" && ["5","7","page"].includes(data.lessonSize)) {
            out.lessonSize = data.lessonSize;
        }
        if (typeof data.darkMode === "boolean") out.darkMode = data.darkMode;
        if (typeof data.revisionMode === "boolean") out.revisionMode = data.revisionMode;
        if (typeof data.settingsCollapsed === "boolean") out.settingsCollapsed = data.settingsCollapsed;
        if (typeof data.useWeakPages === "boolean") out.useWeakPages = data.useWeakPages;
        if (typeof data.compactMode === "boolean") out.compactMode = data.compactMode;
        if (typeof data.autoCycleDays === "boolean") out.autoCycleDays = data.autoCycleDays;
        if (typeof data.displayMode === "string" &&
            (data.displayMode === "minimal" || data.displayMode === "full")) {
            out.displayMode = data.displayMode;
        }

        if (data.activeFortresses && typeof data.activeFortresses === "object") {
            out.activeFortresses = { ...defaults.activeFortresses };
            ["1","2","3","4","5"].forEach(k => {
                if (typeof data.activeFortresses[k] === "boolean") {
                    out.activeFortresses[k] = data.activeFortresses[k];
                }
            });
        }
        return out;
    } catch {
        return defaults;
    }
}

function saveSettings() {
    localStorage.setItem("quranPlanSettingsV2", JSON.stringify(settings));
}

function applySettingsToInputs() {
    totalPagesInput.value  = settings.totalPages;
    currentPageInput.value = settings.currentPage;
    linesOnPageInput.value = settings.linesOnCurrentPage || 0;
    reviewPagesInput.value = settings.reviewPagesText || "";
    cycleDaysInput.value   = settings.cycleDays;
    weakPagesInput.value   = settings.weakPages || "";
    lessonSizeSelect.value = settings.lessonSize || "5";

    useF1.checked = !!settings.activeFortresses["1"];
    useF2.checked = !!settings.activeFortresses["2"];
    useF3.checked = !!settings.activeFortresses["3"];
    useF4.checked = !!settings.activeFortresses["4"];
    useF5.checked = !!settings.activeFortresses["5"];

    revisionToggle.checked      = settings.revisionMode;
    darkModeToggle.checked      = settings.darkMode;
    compactModeToggle.checked   = settings.compactMode;
    useWeakPagesToggle.checked  = settings.useWeakPages;
    autoCycleDaysToggle.checked = settings.autoCycleDays;

    if (settings.displayMode === "minimal") displayModeMinimalRadio.checked = true;
    else displayModeFullRadio.checked = true;

    if (settings.revisionMode) {
        useF1.checked = false;
        useF1.disabled = true;
        settings.activeFortresses["1"] = false;
    } else {
        useF1.disabled = false;
    }

    if (settings.settingsCollapsed) {
        settingsPanel.classList.add("hidden");
        toggleSettingsBtn.textContent = "Показать настройки";
    } else {
        settingsPanel.classList.remove("hidden");
        toggleSettingsBtn.textContent = "Скрыть настройки";
    }
}

function applyDarkMode() {
    if (settings.darkMode) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
}

function applyCompactMode() {
    if (settings.compactMode) document.body.classList.add("compact");
    else document.body.classList.remove("compact");
}

function applyDisplayMode() {
    const detailed = document.querySelectorAll(".fortress-block, #weak-section");
    const minimal = settings.displayMode === "minimal";
    detailed.forEach(el => {
        if (minimal) el.classList.add("hidden");
        else el.classList.remove("hidden");
    });
}

// ===== Страницы для дальнего повторения =====

function buildReviewSet() {
    const total = Math.max(1, parseInt(settings.totalPages,10) || 1);
    let arr = parsePagesPattern(settings.reviewPagesText, total);
    if (!arr.length) {
        for (let i=1;i<=total;i++) arr.push(i);
    }
    reviewSet = arr;
}

// ===== Нормализация прогресса страниц =====

function normalizeLinesAndPage() {
    let lines = parseInt(settings.linesOnCurrentPage,10);
    if (isNaN(lines) || lines < 0) lines = 0;
    let page = parseInt(settings.currentPage,10);
    if (isNaN(page) || page < 1) page = 1;

    while (lines >= LINES_PER_PAGE) {
        lines -= LINES_PER_PAGE;
        page  += 1;
    }

    settings.linesOnCurrentPage = lines;
    settings.currentPage        = page;
    currentPageInput.value      = page;
    linesOnPageInput.value      = lines;
    saveSettings();
}

// ===== reviewState для 3-й крепости =====

function loadReviewState() {
    try {
        const raw = localStorage.getItem("quranPlanReviewStateV2");
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object") return null;
        return data;
    } catch {
        return null;
    }
}
function saveReviewState() {
    if (!reviewState) return;
    localStorage.setItem("quranPlanReviewStateV2", JSON.stringify(reviewState));
}

function initReviewForToday() {
    const N = reviewSet.length;
    if (!N) {
        reviewState = null;
        return;
    }
    const days = Math.max(1, parseInt(settings.cycleDays,10) || 1);
    const chunkLen = Math.max(1, Math.ceil(N / days));

    const st = loadReviewState();
    if (!st || st.lastDate !== todayKey) {
        let startIndex = st && typeof st.nextIndex === "number" ? st.nextIndex : 0;
        if (startIndex < 0 || startIndex >= N) startIndex = 0;
        let todayCount = chunkLen;
        if (startIndex + todayCount > N) todayCount = N - startIndex;
        if (todayCount < 1) todayCount = 1;
        let nextIndex = (startIndex + todayCount) % N;
        reviewState = {
            lastDate: todayKey,
            startIndex,
            todayCount,
            nextIndex
        };
        saveReviewState();
    } else {
        let startIndex = st.startIndex || 0;
        let todayCount = st.todayCount || chunkLen;
        if (startIndex < 0 || startIndex >= N) startIndex = 0;
        if (todayCount < 1) todayCount = Math.min(chunkLen, N);
        if (startIndex + todayCount > N) todayCount = N - startIndex;
        if (todayCount < 1) todayCount = 1;
        let nextIndex = (startIndex + todayCount) % N;
        reviewState = {
            lastDate: todayKey,
            startIndex,
            todayCount,
            nextIndex
        };
        saveReviewState();
    }
}

// ===== Логика урока (1-я крепость) =====

function getLessonPhrases() {
    const size = settings.lessonSize || "5";
    if (size === "7") {
        return { shortNom: "7 строк", shortAcc: "7 строк" };
    }
    if (size === "page") {
        return { shortNom: "целая страница", shortAcc: "целую страницу" };
    }
    return { shortNom: "5 строк", shortAcc: "5 строк" };
}

function getLinesPerDay() {
    if (settings.revisionMode) return 0;
    if (!settings.activeFortresses || !settings.activeFortresses["1"]) return 0;
    if (settings.lessonSize === "page") return LINES_PER_PAGE;
    if (settings.lessonSize === "7")   return 7;
    return 5;
}

function describeNewBlock() {
    const page = parseInt(settings.currentPage,10) || 1;
    const used = parseInt(settings.linesOnCurrentPage,10) || 0;
    const linesPerDay = getLinesPerDay();
    if (linesPerDay <= 0) return "страницу " + page;
    if (settings.lessonSize === "page" || linesPerDay >= LINES_PER_PAGE) {
        return "страницу " + page + " целиком";
    }
    const startLine = used + 1;
    const endLine   = Math.min(LINES_PER_PAGE, used + linesPerDay);
    return linesPerDay + " строк (примерно строки " + startLine + "–" + endLine + ") на странице " + page;
}

function updateLessonTexts() {
    const p = getLessonPhrases();
    if (lessonDescShortSpan)   lessonDescShortSpan.textContent   = p.shortNom;
    if (lessonDescHeadingSpan) lessonDescHeadingSpan.textContent = p.shortNom;
    if (lessonDescGoalSpan)    lessonDescGoalSpan.textContent    = p.shortAcc;
    if (lessonDescStep1Span)   lessonDescStep1Span.textContent   = p.shortAcc;
    if (lessonDesc5thSpan)     lessonDesc5thSpan.textContent     = p.shortNom;

    const desc = describeNewBlock();
    if (todayNewLi) {
        todayNewLi.textContent = "1‑я крепость (новый урок): " + desc + ".";
    }
}

// ===== 2-я крепость =====

function getNearBackCount() {
    const size = settings.lessonSize || "5";
    if (size === "page") return 1;
    return 2;
}

function updateNearBackLabel() {
    const count = getNearBackCount();
    nearBackLabelSpan.textContent =
        count === 1 ? "1 предыдущую страницу" : count + " предыдущие страницы";
}

function buildNearReviewInfo() {
    const total   = parseInt(settings.totalPages,10) || 0;
    const current = parseInt(settings.currentPage,10) || 0;
    if (!current || current < 1) return null;
    const back = getNearBackCount();
    let start = current - back;
    if (start < 1) start = 1;
    const text = (start === current) ? ("стр. " + current) : ("стр. " + start + "–" + current);
    let extra = "";
    if (total && current > total) {
        extra = " (внимание: текущая страница больше общего числа выученных страниц).";
    }
    return { text, extra };
}

function updateNearReview() {
    const info = buildNearReviewInfo();
    if (!info) {
        nearReviewP.innerHTML = "<strong>Подсказка:</strong> введи текущий номер страницы в настройках выше.";
        return;
    }
    nearReviewP.innerHTML =
        "<strong>Подсказка:</strong> сегодня для 2‑й крепости повтори по памяти: " +
        info.text + "." + info.extra;
}

// ===== 3-я крепость =====

function buildThirdMainInfo() {
    const N = reviewSet.length;
    if (!N) return null;

    // четверг: полный проход
    if (todayIndex === 4) {
        const totalAll = Math.max(1, parseInt(settings.totalPages,10) || 1);
        const pages = [];
        for (let i=1;i<=totalAll;i++) pages.push(i);
        return {
            pages,
            text: "стр. 1–" + totalAll,
            count: totalAll,
            isThursdayAll: true
        };
    }

    if (!reviewState) return null;
    const startIndex = reviewState.startIndex || 0;
    const todayCount = reviewState.todayCount || 1;
    const slice = reviewSet.slice(startIndex, startIndex + todayCount);
    if (!slice.length) return null;
    const text = "стр. " + compressRanges(slice);
    return { pages: slice, text, count: slice.length, isThursdayAll: false };
}

function buildThirdTomorrowInfo() {
    const N = reviewSet.length;
    if (!N || !reviewState) return null;
    const days = Math.max(1, parseInt(settings.cycleDays,10) || 1);
    const chunkLen = Math.max(1, Math.ceil(N / days));
    let startIndex = reviewState.nextIndex || 0;
    if (startIndex < 0 || startIndex >= N) startIndex = 0;
    let count = chunkLen;
    if (startIndex + count > N) count = N - startIndex;
    if (count < 1) count = 1;
    const slice = reviewSet.slice(startIndex, startIndex + count);
    const text  = "стр. " + compressRanges(slice);
    return { pages: slice, text, count };
}

function buildWeakInfoForPages(pages) {
    if (!settings.useWeakPages) {
        return {
            message: "Учёт слабых страниц отключён (можно включить в настройках).",
            short: ""
        };
    }
    if (!weakSet || weakSet.size === 0) {
        return {
            message: "Слабые страницы не указаны. Если хочешь выделить их, заполни поле в настройках.",
            short: ""
        };
    }
    const weakToday = pages.filter(p => weakSet.has(p));
    if (!weakToday.length) {
        return {
            message: "Слабые страницы в этот блок не попали. Всё равно следи за качеством чтения.",
            short: "Слабые страницы в этот блок не попали."
        };
    }
    const list = compressRanges(weakToday);
    return {
        message: "В этот блок попадают слабые страницы: стр. " + list + ". Сделай на них особый упор.",
        short: "Слабые страницы в блоке: стр. " + list + "."
    };
}

function updateThirdFortressUI() {
    const N = reviewSet.length;
    totalPagesInfoSpan.textContent = N;
    const days = Math.max(1, parseInt(settings.cycleDays,10) || 1);
    cycleDaysInfoSpan.textContent = days;
    const chunkLen = N ? Math.max(1, Math.ceil(N / days)) : 0;
    dailyVolumeInfoSpan.textContent = chunkLen;

    if (N) {
        const text = "стр. " + compressRanges(reviewSet);
        reviewRangeTextSpan.textContent = text;
    } else {
        reviewRangeTextSpan.textContent = "нет страниц (проверь настройки)";
    }

    const info = buildThirdMainInfo();
    if (!info) {
        thirdTodayMainP.textContent = "Сегодняшний блок 3‑й крепости ещё не рассчитан.";
        thirdTodayWeakP.textContent = "";
    } else {
        thirdTodayMainP.textContent =
            "Сегодня по 3‑й крепости: " + info.text +
            (todayIndex === 4 ? " (общий проход)." : " (" + info.count + " стр.).");
        const weakInfo = buildWeakInfoForPages(info.pages);
        thirdTodayWeakP.textContent = weakInfo.message;
    }

    if (!settings.useWeakPages) {
        weakListInfoSpan.textContent = "учёт отключён";
    } else if (!weakSet || !weakSet.size) {
        weakListInfoSpan.textContent = "не выбраны";
    } else {
        weakListInfoSpan.textContent = compressRanges(Array.from(weakSet));
    }

    const tomorrowInfo = buildThirdTomorrowInfo();
    if (!tomorrowInfo) {
        tomorrowFarP.textContent = "Завтрашний блок 3‑й крепости ещё не рассчитан.";
        tomorrowWeakP.textContent = "";
    } else {
        tomorrowFarP.textContent =
            "Предварительно завтра по 3‑й крепости: " +
            tomorrowInfo.text + " (" + tomorrowInfo.count + " стр.).";
        const weakTomorrow = buildWeakInfoForPages(tomorrowInfo.pages);
        tomorrowWeakP.textContent = weakTomorrow.message;
    }
}

function updateTodayPlan() {
    todayNameSpan.textContent = todayName;
    const [y,m,dd] = todayKey.split("-");
    todayDateSpan.textContent = dd + "." + m + "." + y;

    const nearInfo = buildNearReviewInfo();
    if (nearInfo) {
        todayNearLi.textContent =
            "2‑я крепость (ближнее повторение): " + nearInfo.text + ".";
    } else {
        todayNearLi.textContent =
            "2‑я крепость (ближнее повторение): укажи текущую страницу в настройках, чтобы видеть точные номера.";
    }

    const info = buildThirdMainInfo();
    if (info) {
        todayFarLi.textContent =
            "3‑я крепость (дальнее повторение): " + info.text +
            (todayIndex === 4 ? " (общий проход)." : " (" + info.count + " стр.).");
        const weakInfo = buildWeakInfoForPages(info.pages);
        todayWeakSummaryLi.textContent = weakInfo.short || weakInfo.message;
    } else {
        todayFarLi.textContent = "3‑я крепость (дальнее повторение): блок ещё не рассчитан.";
        todayWeakSummaryLi.textContent = "";
    }
}

// Видимость блоков по крепостям
function applyFortressVisibility() {
    const active = settings.activeFortresses || {};
    const blocks = document.querySelectorAll(".fortress-block");
    blocks.forEach(block => {
        const num = block.getAttribute("data-fortress");
        block.style.display = active[num] ? "" : "none";
    });
    const planItems = document.querySelectorAll("#today-plan [data-fortress]");
    planItems.forEach(item => {
        const num = item.getAttribute("data-fortress");
        item.style.display = active[num] ? "list-item" : "none";
    });
    const taskLabels = checklistElement.querySelectorAll("label[data-fortress]");
    taskLabels.forEach(label => {
        const num = label.getAttribute("data-fortress");
        label.style.display = active[num] ? "block" : "none";
    });
}

// Прогресс по чек-листу
function updateProgressAndStats() {
    const activeList = Object.keys(settings.activeFortresses || {})
        .filter(k => settings.activeFortresses[k]);
    const total = activeList.length;
    let completed = 0;
    checkboxes.forEach(cb => {
        const fortNum = cb.closest("label").getAttribute("data-fortress");
        if (!fortNum) return;
        if (activeList.includes(fortNum) && cb.checked) completed++;
    });

    if (total > 0) {
        const percent = Math.round((completed / total) * 100);
        progressBarInner.style.width = percent + "%";
        let txt = "Прогресс за сегодня: " + completed + " / " + total +
            " крепостей (" + percent + "%).";
        if (completed === total) txt += " Все активные крепости на сегодня выполнены.";
        progressText.innerHTML = "<small>" + txt + "</small>";
    } else {
        progressBarInner.style.width = "0%";
        progressText.innerHTML =
            "<small>Не выбрано ни одной активной крепости (проверь настройки).</small>";
    }
}

// Прогноз роста
function formatDatePlusDays(days) {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    let mm = String(d.getMonth()+1).padStart(2,"0");
    let dd = String(d.getDate()).padStart(2,"0");
    return dd + "." + mm + "." + yyyy;
}
function updateForecast() {
    const linesPerDay = getLinesPerDay();
    const horizons = [
        { label: "7 дней (неделя)", days: 7 },
        { label: "30 дней (≈ 1 месяц)", days: 30 },
        { label: "90 дней (≈ 3 месяца)", days: 90 }
    ];
    const p = getLessonPhrases();

    if (linesPerDay <= 0) {
        forecastIntroP.textContent =
            "Сейчас новый урок отключён (1‑я крепость не используется или включён режим только повторения), " +
            "поэтому прогноз по новому хифзу равен 0. Включи 1‑ю крепость и выбери объём урока, чтобы увидеть прогноз.";
        forecastTbody.innerHTML = "";
        forecastNoteP.innerHTML =
            "<small>Как только ты снова начнёшь новый хифз, здесь появится примерный рост за неделю, месяц и 3 месяца.</small>";
        return;
    }

    forecastIntroP.textContent =
        "При текущем объёме урока (" + p.shortNom +
        ") и ежедневном новом уроке ты добавишь к своему хифзу примерно:";

    const currentPages = parseInt(settings.totalPages,10) || 0;
    const rows = horizons.map(h => {
        const totalLines = linesPerDay * h.days;
        const pages = Math.floor(totalLines / LINES_PER_PAGE);
        const remLines = totalLines % LINES_PER_PAGE;

        let newHifzText = totalLines + " строк";
        if (pages > 0) {
            newHifzText += " ≈ " + pages + " стр.";
            if (remLines > 0) newHifzText += " и " + remLines + " строк";
        }

        let growthText = "+" + pages + " стр.";
        if (remLines > 0) growthText += " и +" + remLines + " строк";
        growthText += " к текущему уровню.";

        const approxTotalPages = currentPages + pages + (remLines > 0 ? 1 : 0);
        const dateStr = formatDatePlusDays(h.days);
        const totalText =
            "≈ " + approxTotalPages + " стр. от начала аль‑Бакара к " + dateStr;

        return "<tr>" +
            "<td>" + h.label + "</td>" +
            "<td>" + newHifzText + "</td>" +
            "<td>" + growthText + "</td>" +
            "<td>" + totalText + "</td>" +
            "</tr>";
    });

    forecastTbody.innerHTML = rows.join("");
    forecastNoteP.innerHTML =
        "<small>Это приблизительный прогноз, если каждый день делать новый урок в выбранном объёме " +
        "и не пропускать дни.</small>";
}

// История
function loadHistory(dateStr) {
    historyDateInput.value = dateStr;
    const d = new Date(dateStr);
    const valid = !isNaN(d.getTime());
    const [y,m,dd] = dateStr.split("-");
    const label = (valid ? daysRu[d.getDay()] + ", " : "") + dd + "." + m + "." + y;

    let checklistObj = {};
    try {
        const raw = localStorage.getItem("quranPlanChecklist-" + dateStr);
        if (raw) checklistObj = JSON.parse(raw) || {};
    } catch {}
    const noteText = localStorage.getItem("quranPlanNote-" + dateStr) || "";

    const totalTasks = 5;
    const completed = Object.values(checklistObj).filter(Boolean).length;

    if (!Object.keys(checklistObj).length && !noteText) {
        historyContentDiv.innerHTML =
            "<p><strong>" + label + "</strong></p>" +
            "<p>Нет сохранённых данных за эту дату.</p>";
        return;
    }

    const fortressNames = {
        fortress1: "1‑я крепость (новый урок)",
        fortress2: "2‑я крепость (ближнее повторение)",
        fortress3: "3‑я крепость (дальнее повторение)",
        fortress4: "4‑я крепость (намаз)",
        fortress5: "5‑я крепость (проверка/слушание)"
    };

    let tasksHtml = "<ul>";
    Object.entries(fortressNames).forEach(([id,labelName]) => {
        const done = checklistObj[id] ? "выполнено" : "—";
        tasksHtml += "<li>" + labelName + ": <strong>" + done + "</strong></li>";
    });
    tasksHtml += "</ul>";

    const safeNote = noteText
        ? noteText.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\n/g,"<br>")
        : "<em>нет заметки</em>";

    historyContentDiv.innerHTML =
        "<p><strong>" + label + "</strong></p>" +
        "<p>Выполненные крепости: " + completed + " / " + totalTasks + "</p>" +
        tasksHtml +
        "<p><strong>Заметка:</strong><br>" + safeNote + "</p>";
}
function shiftHistory(delta) {
    let current = historyDateInput.value || todayKey;
    let d = new Date(current);
    if (isNaN(d.getTime())) d = new Date(today);
    d.setDate(d.getDate() + delta);
    const key = d.toISOString().slice(0,10);
    loadHistory(key);
}

// Недельный план
function updateWeeklyPlan() {
    const days = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
    const offDay = "Четверг";
    const workingDays = ["Понедельник","Вторник","Среда","Пятница","Суббота","Воскресенье"];

    const N = reviewSet.length;
    const pagesPerWorkDay = workingDays.length ? Math.max(1, Math.ceil(N / workingDays.length)) : 0;
    const p = getLessonPhrases();
    const hasNew = !settings.revisionMode && settings.activeFortresses["1"];
    const nearBack = getNearBackCount();
    const nearLabel = nearBack === 1
        ? "текущая + 1 предыдущая страница"
        : "текущая + " + nearBack + " предыдущие страницы";

    weeklyPlanBody.innerHTML = "";
    let idx = 0;
    days.forEach(day => {
        let newLessonCell;
        if (!hasNew) newLessonCell = "нет (новый урок отключён)";
        else if (day === offDay) newLessonCell = "выходной (без нового урока)";
        else newLessonCell = p.shortAcc + " на текущей странице";

        let nearCell = nearLabel;
        let farCell;

        if (day === offDay) {
            const totalAll = Math.max(1, parseInt(settings.totalPages,10) || 1);
            farCell = "все выученные страницы: стр. 1–" + totalAll;
        } else {
            if (!N) farCell = "нет страниц (проверь настройки)";
            else {
                if (idx >= N) idx = 0;
                const slice = reviewSet.slice(idx, Math.min(N, idx + pagesPerWorkDay));
                const text  = "стр. " + compressRanges(slice);
                farCell = text;
                idx = (idx + pagesPerWorkDay) % N;
            }
        }

        const tr = document.createElement("tr");
        tr.innerHTML =
            "<td>" + day + "</td>" +
            "<td>" + newLessonCell + "</td>" +
            "<td>" + nearCell + "</td>" +
            "<td>" + farCell + "</td>";
        weeklyPlanBody.appendChild(tr);
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
(function init() {
    settings = loadSettings();
    applySettingsToInputs();
    normalizeLinesAndPage();
    applyDarkMode();
    applyCompactMode();
    applyDisplayMode();

    weakSet = new Set(parsePagesPattern(settings.weakPages, settings.totalPages));
    buildReviewSet();
    reviewState = loadReviewState();
    initReviewForToday();

    updateLessonTexts();
    updateNearBackLabel();
    updateNearReview();
    updateThirdFortressUI();
    updateTodayPlan();
    applyFortressVisibility();
    updateForecast();
    updateWeeklyPlan();
    updateProgressAndStats();

    // Чек-лист
    let savedChecklist = {};
    try {
        const raw = localStorage.getItem(storageKeyChecklist);
        if (raw) savedChecklist = JSON.parse(raw) || {};
    } catch {
        savedChecklist = {};
    }

    checkboxes.forEach(cb => {
        const id = cb.getAttribute("data-task-id");
        if (savedChecklist[id]) cb.checked = true;
        cb.addEventListener("change", () => {
            const wasChecked = !!savedChecklist[id];
            savedChecklist[id] = cb.checked;
            localStorage.setItem(storageKeyChecklist, JSON.stringify(savedChecklist));

            // 1-я крепость: при первом нажатии за день — двигаем прогресс строк
            if (id === "fortress1" && cb.checked && !wasChecked) {
                const linesAdded = getLinesPerDay();
                if (linesAdded > 0) {
                    settings.linesOnCurrentPage = (settings.linesOnCurrentPage || 0) + linesAdded;
                    normalizeLinesAndPage();
                    updateLessonTexts();
                    updateNearReview();
                    updateWeeklyPlan();
                    updateForecast();
                    updateTodayPlan();
                }
            }

            updateProgressAndStats();
        });
    });

    resetChecklistBtn.addEventListener("click", () => {
        checkboxes.forEach(cb => cb.checked = false);
        savedChecklist = {};
        localStorage.removeItem(storageKeyChecklist);
        updateProgressAndStats();
    });

    // Заметка
    const savedNote = localStorage.getItem(noteKey);
    if (savedNote != null) dailyNote.value = savedNote;
    dailyNote.addEventListener("input", () => {
        localStorage.setItem(noteKey, dailyNote.value);
    });

    // История
    historyDateInput.value = todayKey;
    loadHistory(todayKey);
    historyDateInput.addEventListener("change", () => {
        const val = historyDateInput.value || todayKey;
        loadHistory(val);
    });
    historyPrevBtn.addEventListener("click", () => shiftHistory(-1));
    historyNextBtn.addEventListener("click", () => shiftHistory(1));

    // Печать
    printBtn.addEventListener("click", () => window.print());

    // Сворачивание настроек
    toggleSettingsBtn.addEventListener("click", () => {
        settings.settingsCollapsed = !settings.settingsCollapsed;
        if (settings.settingsCollapsed) {
            settingsPanel.classList.add("hidden");
            toggleSettingsBtn.textContent = "Показать настройки";
        } else {
            settingsPanel.classList.remove("hidden");
            toggleSettingsBtn.textContent = "Скрыть настройки";
        }
        saveSettings();
    });

    // Сворачивание прогноза
    toggleForecastBtn.addEventListener("click", () => {
        const hidden = forecastPanel.classList.toggle("hidden");
        toggleForecastBtn.textContent = hidden ? "Показать прогноз" : "Скрыть прогноз";
    });

    // Сворачивание недельного плана
    weeklyPlanToggleBtn.addEventListener("click", () => {
        const hidden = weeklyPlanPanel.classList.toggle("hidden");
        weeklyPlanToggleBtn.textContent = hidden ? "Показать план на неделю" : "Скрыть план на неделю";
    });

    // Изменения числовых/текстовых настроек
    function onSettingsChange(e) {
        const totalVal  = parseInt(totalPagesInput.value,10);
        const currentVal= parseInt(currentPageInput.value,10);
        const cycleVal  = parseInt(cycleDaysInput.value,10);
        const weakVal   = weakPagesInput.value || "";
        const reviewVal = reviewPagesInput.value || "";
        const lessonVal = lessonSizeSelect.value || "5";

        settings.totalPages = (!isNaN(totalVal)  && totalVal  > 0) ? totalVal  : 1;
        settings.currentPage= (!isNaN(currentVal)&& currentVal> 0) ? currentVal: 1;
        settings.cycleDays  = (!isNaN(cycleVal)  && cycleVal  > 0) ? cycleVal  : 1;
        settings.weakPages  = weakVal;
        settings.reviewPagesText = reviewVal;
        settings.lessonSize = ["5","7","page"].includes(lessonVal) ? lessonVal : "5";

        if (e && e.target === cycleDaysInput) {
            settings.autoCycleDays = false;
            autoCycleDaysToggle.checked = false;
        }

        saveSettings();
        weakSet = new Set(parsePagesPattern(settings.weakPages, settings.totalPages));
        normalizeLinesAndPage();
        buildReviewSet();
        reviewState = loadReviewState();
        initReviewForToday();

        updateLessonTexts();
        updateNearBackLabel();
        updateNearReview();
        updateThirdFortressUI();
        updateTodayPlan();
        updateForecast();
        updateWeeklyPlan();
        updateProgressAndStats();
    }

    [totalPagesInput, currentPageInput, cycleDaysInput,
     weakPagesInput, reviewPagesInput, lessonSizeSelect]
        .forEach(inp => inp.addEventListener("input", onSettingsChange));

    // Ручной ввод строк
    linesOnPageInput.addEventListener("input", () => {
        let val = parseInt(linesOnPageInput.value,10);
        if (isNaN(val) || val < 0) val = 0;
        settings.linesOnCurrentPage = val;
        normalizeLinesAndPage();
        updateLessonTexts();
        updateNearReview();
        updateWeeklyPlan();
        updateForecast();
        updateTodayPlan();
    });

    // Вкл/выкл крепостей
    function handleFortressToggle(num) {
        const chk = fortressToggles[num];
        settings.activeFortresses[num] = !!chk.checked;
        saveSettings();
        applyFortressVisibility();
        updateForecast();
        updateWeeklyPlan();
        updateProgressAndStats();
        updateTodayPlan();
    }
    ["1","2","3","4","5"].forEach(num => {
        fortressToggles[num].addEventListener("change", () => handleFortressToggle(num));
    });

    // Режим только повторения
    revisionToggle.addEventListener("change", () => {
        settings.revisionMode = revisionToggle.checked;
        if (settings.revisionMode) {
            settings.activeFortresses["1"] = false;
            useF1.checked = false;
            useF1.disabled = true;
        } else {
            useF1.disabled = false;
            settings.activeFortresses["1"] = true;
            useF1.checked = true;
        }
        saveSettings();
        applyFortressVisibility();
        updateNearReview();
        updateThirdFortressUI();
        updateTodayPlan();
        updateForecast();
        updateWeeklyPlan();
        updateProgressAndStats();
    });

    // Тёмная тема
    darkModeToggle.addEventListener("change", () => {
        settings.darkMode = darkModeToggle.checked;
        saveSettings();
        applyDarkMode();
    });

    // Компактный режим
    compactModeToggle.addEventListener("change", () => {
        settings.compactMode = compactModeToggle.checked;
        saveSettings();
        applyCompactMode();
    });

    // Учёт слабых страниц
    useWeakPagesToggle.addEventListener("change", () => {
        settings.useWeakPages = useWeakPagesToggle.checked;
        saveSettings();
        updateThirdFortressUI();
        updateTodayPlan();
    });

    // Авто-настройка дней на круг
    function calcRecommendedCycleDays(pagesCount, lessonSize) {
        const pages = Math.max(1, pagesCount || 1);
        let targetPerDay;
        if (lessonSize === "5") targetPerDay = 3.5;
        else if (lessonSize === "7") targetPerDay = 2.5;
        else targetPerDay = 2;
        let days = Math.round(pages / targetPerDay);
        if (days < 3) days = 3;
        if (days > 21) days = 21;
        return days;
    }

    autoCycleDaysToggle.addEventListener("change", () => {
        settings.autoCycleDays = autoCycleDaysToggle.checked;
        saveSettings();
        if (settings.autoCycleDays) {
            const N = reviewSet.length;
            const newCycle = calcRecommendedCycleDays(N, settings.lessonSize);
            settings.cycleDays = newCycle;
            cycleDaysInput.value = newCycle;
            saveSettings();
            reviewState = null;
            initReviewForToday();
            updateThirdFortressUI();
            updateTodayPlan();
            updateForecast();
            updateWeeklyPlan();
            updateProgressAndStats();
        }
    });

    // Новый круг повторения
    resetReviewBtn.addEventListener("click", () => {
        const N = reviewSet.length;
        if (!N) return;
        const days = Math.max(1, parseInt(settings.cycleDays,10) || 1);
        const chunkLen = Math.max(1, Math.ceil(N / days));
        const todayCount = Math.min(chunkLen, N);
        reviewState = {
            lastDate: todayKey,
            startIndex: 0,
            todayCount,
            nextIndex: todayCount % N
        };
        saveReviewState();
        updateThirdFortressUI();
        updateTodayPlan();
    });

    // Режим отображения
    displayModeMinimalRadio.addEventListener("change", () => {
        if (displayModeMinimalRadio.checked) {
            settings.displayMode = "minimal";
            saveSettings();
            applyDisplayMode();
        }
    });
    displayModeFullRadio.addEventListener("change", () => {
        if (displayModeFullRadio.checked) {
            settings.displayMode = "full";
            saveSettings();
            applyDisplayMode();
        }
    });
})();