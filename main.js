(function () {
  "use strict";

  /* ---------- мобильное меню ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "✕" : "☰";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      }
    });
  }

  /* ---------- год в подвале ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- появление блоков при прокрутке ---------- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && revealItems.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- подсветка активного пункта меню ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
  var map = {};
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var section = document.getElementById(id);
    if (section) map[id] = { link: a, section: section };
  });
  if ("IntersectionObserver" in window && Object.keys(map).length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("active"); });
        var hit = map[entry.target.id];
        if (hit) hit.link.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { spy.observe(map[id].section); });
  }

  /* ---------- копирование ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    var src = document.getElementById(btn.getAttribute("data-copy"));
    if (!src) return;
    var text = src.textContent.trim();
    var done = function () {
      var old = btn.textContent;
      btn.textContent = "Скопировано ✓";
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (err) { /* ignore */ }
      ta.remove();
    }
  });

  /* ---------- живой поиск по базе ---------- */
  var ARTICLES = window.ROH_ARTICLES || [];
  var CODE_LABELS = { uk: "УК", pk: "ПК", koap: "КоАП", pdd: "ПДД", tk: "ТК", eth: "Этика", fkz: "ФКЗ", con: "Конституция" };

  var SYNONYMS = {
    "угон": ["угнали", "угнал", "машина", "автомобиль", "транспорт", "завладение"],
    "угнали": ["угон", "машина", "автомобиль", "транспорт"],
    "машину": ["машина", "автомобиль", "транспорт", "угон"],
    "кража": ["украл", "украли", "воровство", "хищение", "имущество"],
    "украл": ["кража", "воровство", "хищение"],
    "драка": ["избиение", "побои", "ударил", "вред здоровью", "телесные"],
    "ударил": ["драка", "избиение", "побои", "вред здоровью"],
    "избил": ["драка", "избиение", "вред здоровью", "побои"],
    "убил": ["убийство", "смерть", "причинение смерти"],
    "зарплата": ["труд", "трудовой", "работодатель", "оплата труда", "задержка"],
    "зарплату": ["зарплата", "труд", "работодатель", "оплата труда"],
    "уволили": ["увольнение", "работодатель", "трудовой кодекс", "расторжение"],
    "обыск": ["досмотр", "осмотр", "задержание", "изъятие", "понятые"],
    "задержали": ["задержание", "права задержанного", "доставление", "административный"],
    "права": ["документы", "водитель", "удостоверение", "лишение права"],
    "пьяный": ["опьянение", "алкоголь", "освидетельствование", "медицинское"],
    "скорость": ["превышение", "скоростной режим", "пдд", "движение"],
    "светофор": ["красный", "проезд", "перекрёсток", "сигнал"],
    "парковка": ["стоянка", "тротуар", "эвакуация", "остановка"],
    "оружие": ["пистолет", "огнестрельное", "хранение", "лицензия"],
    "наркотики": ["наркотик", "сбыт", "хранение", "психотропные"],
    "взятка": ["коррупция", "должностное лицо", "подкуп"],
    "оскорбление": ["честь", "достоинство", "клевета", "неуважение"],
    "дтп": ["авария", "дорожно-транспортное", "пдд", "происшествие"],
    "суд": ["судебный", "судья", "процесс", "заседание"],
    "адвокат": ["защитник", "защита", "юридическая помощь"]
  };

  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9\s-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var STOP = { "не": 1, "ни": 1, "и": 1, "в": 1, "во": 1, "на": 1, "с": 1, "со": 1, "по": 1, "за": 1, "из": 1, "от": 1, "до": 1, "для": 1, "что": 1, "как": 1, "это": 1, "я": 1, "мы": 1, "вы": 1, "он": 1, "она": 1, "они": 1, "мне": 1, "меня": 1, "мой": 1, "моя": 1, "если": 1, "или": 1, "а": 1, "но": 1, "у": 1, "о": 1, "об": 1, "при": 1, "же": 1, "бы": 1, "ли": 1 };

  function words(text) {
    return norm(text).split(" ").filter(function (w) { return w.length > 1 && !STOP[w]; });
  }

  function stem(w) {
    if (w.length > 6) return w.slice(0, w.length - 2);
    if (w.length > 4) return w.slice(0, w.length - 1);
    return w;
  }

  function plural(n) {
    var m = n % 10, h = n % 100;
    if (m === 1 && h !== 11) return "статья";
    if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return "статьи";
    return "статей";
  }

  function expand(list) {
    var extra = [];
    list.forEach(function (w) {
      Object.keys(SYNONYMS).forEach(function (key) {
        if (w === key || w.indexOf(key) === 0 || key.indexOf(w) === 0) {
          extra = extra.concat(SYNONYMS[key]);
        }
      });
    });
    return extra;
  }

  var TITLES = [], SHORTS = [], PUNISH = [];
  for (var ai = 0; ai < ARTICLES.length; ai++) {
    TITLES.push(norm(ARTICLES[ai][3]));
    SHORTS.push(norm(ARTICLES[ai][4]));
    PUNISH.push(norm(ARTICLES[ai][5]));
  }

  var idfCache = {};
  function wgt(term) {
    if (idfCache[term] != null) return idfCache[term];
    var df = 0;
    for (var i = 0; i < TITLES.length; i++) {
      if (TITLES[i].indexOf(term) > -1) df++;
    }
    var value = Math.log(1 + TITLES.length / (1 + df));
    idfCache[term] = value;
    return value;
  }

  var CODE_HINTS = [
    { re: /(увол|зарплат|работодател|трудов|отпуск|переработ|смены|преми)/, code: "tk", bonus: 16 },
    { re: /(наркот|взятк|коррупц)/, code: "uk", bonus: 10 }
  ];

  function hasPhrase(text, term) {
    var parts = words(term);
    if (parts.length <= 1) return text.indexOf(stem(term)) > -1;
    for (var i = 0; i < parts.length; i++) {
      if (text.indexOf(stem(parts[i])) < 0) return false;
    }
    return true;
  }

  function search(query, limit) {
    var q = norm(query);
    if (!q) return [];
    var ws = words(q);
    if (!ws.length) return [];
    var wsStems = {};
    ws.forEach(function (w) { wsStems[stem(w)] = 1; });
    var seen = {};
    var extra = [];
    expand(ws).forEach(function (t) {
      var st = stem(t);
      if (wsStems[st] || seen[st]) return;
      seen[st] = 1;
      extra.push(t);
    });
    extra = extra.slice(0, 12);
    var phrase = q;
    var hits = [];

    for (var i = 0; i < ARTICLES.length; i++) {
      var title = TITLES[i], short = SHORTS[i], punish = PUNISH[i];
      var blob = title + " " + short + " " + punish;
      var score = 0;

      for (var j = 0; j < ws.length; j++) {
        var w = ws[j], st = stem(w);
        if (title.indexOf(w) > -1) score += 6 * wgt(w);
        else if (title.indexOf(st) > -1) score += 4 * wgt(st);
        else if (punish.indexOf(w) > -1) score += 2.5 * wgt(w);
        else if (short.indexOf(w) > -1) score += 2 * wgt(w);
        else if (blob.indexOf(st) > -1) score += 1 * wgt(st);
      }
      for (var k = 0; k < extra.length; k++) {
        var ex = extra[k], exs = stem(ex);
        if (hasPhrase(title, ex)) score += 3.5 * wgt(exs);
        else if (hasPhrase(punish, ex)) score += 1.6 * wgt(exs);
        else if (hasPhrase(short, ex)) score += 1.2 * wgt(exs);
        else if (hasPhrase(blob, ex)) score += 0.6 * wgt(exs);
      }
      if (title.indexOf(phrase) > -1) score += 8;
      else if (phrase.length > 4 && blob.indexOf(phrase) > -1) score += 4;

      if (score > 0) {
        for (var h = 0; h < CODE_HINTS.length; h++) {
          if (CODE_HINTS[h].code === ARTICLES[i][0] && CODE_HINTS[h].re.test(q)) score += CODE_HINTS[h].bonus;
        }
        hits.push({ a: ARTICLES[i], score: score });
      }
    }

    hits.sort(function (x, y) {
      if (y.score !== x.score) return y.score - x.score;
      return String(x.a[3]).length - String(y.a[3]).length;
    });
    return hits.slice(0, limit || 6);
  }

  function render(results, query) {
    var box = document.getElementById("searchResults");
    var meta = document.getElementById("searchMeta");
    if (!box || !meta) return;

    if (!query) {
      box.innerHTML = "";
      meta.textContent = "Начни вводить запрос — результаты появятся здесь.";
      return;
    }
    if (!results.length) {
      meta.textContent = "По запросу «" + query + "» ничего не нашлось.";
      box.innerHTML = '<div class="s-empty">Попробуй иначе: «угнали», «драка», «без прав», «зарплата», «обыск».</div>';
      return;
    }

    meta.textContent = "Найдено " + results.length + " " + plural(results.length) + " — нажми, чтобы открыть в демо.";
    box.innerHTML = results.map(function (hit) {
      var a = hit.a;
      var code = a[0], idx = a[1], num = a[2], title = a[3], punish = a[5];
      var href = "app.html?code=" + encodeURIComponent(code) + "&i=" + encodeURIComponent(idx);
      var sub = punish ? "Наказание: " + punish : "Наказание не указано";
      return '<a class="s-result" href="' + href + '">' +
        '<span class="s-code">' + CODE_LABELS[code] + " · " + num + "</span>" +
        '<span class="s-body"><b>' + escapeHtml(title) + "</b><small>" + escapeHtml(sub) + "</small></span>" +
        '<span class="s-arrow" aria-hidden="true">↗</span></a>';
    }).join("");
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var input = document.getElementById("siteSearch");
  var clearBtn = document.getElementById("siteSearchClear");
  var chips = document.getElementById("searchChips");
  var timer = 0;

  function runSearch() {
    if (!input) return;
    var q = input.value.trim();
    if (clearBtn) clearBtn.hidden = !q;
    render(q ? search(q, 6) : [], q);
  }

  if (input) {
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(runSearch, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); runSearch(); }
      if (e.key === "Escape") { input.value = ""; runSearch(); }
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      input.value = "";
      input.focus();
      runSearch();
    });
  }
  if (chips) {
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-q]");
      if (!b) return;
      input.value = b.getAttribute("data-q");
      input.focus();
      runSearch();
    });
  }
  if (input && ARTICLES.length) {
    var params = new URLSearchParams(window.location.search);
    var q0 = params.get("q");
    if (q0) { input.value = q0; runSearch(); }
  }
})();
