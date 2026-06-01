// =============================================
// CINEBASE SPA — ReactJS (vanilla build)
// Тема: Каталог фільмів і серіалів
// =============================================
const { useState, useReducer, useEffect, useCallback } = React;

const API_BASE = "/index.php";

// ---- API helpers ----
async function apiFetch(resource, id = null, method = "GET", body = null) {
  const url = id ? `${API_BASE}/${resource}/${id}` : `${API_BASE}/${resource}`;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  return res.json();
}

// ---- Reducer ----
const initialState = {
  user: JSON.parse(localStorage.getItem("cinebase_user") || "null"),
  page: "home",
  films: [], directors: [], genres: [], studios: [],
  filterGenre: "", filterSort: "title", filterSearch: "",
  editingFilm: null,
  loading: false, message: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_PAGE":        return { ...state, page: action.page, editingFilm: null, message: null };
    case "SET_FILMS":       return { ...state, films: action.data };
    case "SET_DIRECTORS":   return { ...state, directors: action.data };
    case "SET_GENRES":      return { ...state, genres: action.data };
    case "SET_STUDIOS":     return { ...state, studios: action.data };
    case "SET_FILTER_GENRE":return { ...state, filterGenre: action.value };
    case "SET_FILTER_SORT": return { ...state, filterSort: action.value };
    case "SET_SEARCH":      return { ...state, filterSearch: action.value };
    case "SET_EDITING":     return { ...state, editingFilm: action.film, page: "edit" };
    case "SET_LOADING":     return { ...state, loading: action.value };
    case "SET_MESSAGE":     return { ...state, message: action.msg };
    case "LOGIN":
      localStorage.setItem("cinebase_user", JSON.stringify(action.user));
      return { ...state, user: action.user, page: "home" };
    case "LOGOUT":
      localStorage.removeItem("cinebase_user");
      return { ...state, user: null, page: "home" };
    default: return state;
  }
}

// ---- LocalCounter Component ----
function LocalCounter() {
  const [count, setCount] = useState(0);
  const [watched, setWatched] = useState([]);
  const labels = ["🎬 Запланував", "▶️ Дивлюся", "✅ Переглянуто", "❤️ Улюблене", "😴 Нудно"];
  return (
    React.createElement("div", { className: "counter-widget" },
      React.createElement("div", { className: "counter-label" },
        React.createElement("div", { style: { fontWeight: 500, marginBottom: 4 } }, "Мій трекер перегляду"),
        React.createElement("div", { style: { fontSize: 12, color: "var(--text-muted)" } },
          "Відмічено фільмів сьогодні: ",
          React.createElement("strong", { style: { color: "var(--accent)" } }, watched.length)
        )
      ),
      React.createElement("div", { className: "counter-display" }, count),
      React.createElement("div", { className: "counter-controls" },
        React.createElement("button", {
          className: "counter-btn",
          onClick: () => { setCount(c => Math.max(0, c - 1)); setWatched(w => w.slice(0,-1)); }
        }, "−"),
        React.createElement("button", {
          className: "counter-btn",
          style: { borderColor: "var(--accent)", color: "var(--accent)" },
          onClick: () => {
            setCount(c => c + 1);
            setWatched(w => [...w, labels[Math.floor(Math.random() * labels.length)]]);
          }
        }, "+")
      )
    )
  );
}

// ---- HomePage ----
function HomePage({ state, dispatch }) {
  const totalFilms = state.films.length;
  const avgRating = state.films.length
    ? (state.films.reduce((s, f) => s + parseFloat(f.rating || 0), 0) / state.films.length).toFixed(1)
    : "—";
  const genres = state.genres.length;

  return React.createElement("div", { className: "page-enter" },
    React.createElement("div", { className: "hero" },
      React.createElement("div", { className: "hero-tag" }, "✦ CineBase"),
      React.createElement("h1", { className: "hero-title" },
        "Твій", React.createElement("br", null),
        React.createElement("em", null, "Кіно"), "каталог"
      ),
      React.createElement("p", { className: "hero-sub" },
        "Зберігай, оцінюй та відстежуй улюблені фільми й серіали. Власна база кіно — завжди під рукою."
      ),
      React.createElement("div", { className: "hero-stats" },
        React.createElement("div", null,
          React.createElement("div", { className: "hero-stat-num" }, totalFilms),
          React.createElement("div", { className: "hero-stat-label" }, "Фільмів")
        ),
        React.createElement("div", null,
          React.createElement("div", { className: "hero-stat-num" }, avgRating),
          React.createElement("div", { className: "hero-stat-label" }, "Середній рейтинг")
        ),
        React.createElement("div", null,
          React.createElement("div", { className: "hero-stat-num" }, genres),
          React.createElement("div", { className: "hero-stat-label" }, "Жанрів")
        )
      )
    ),
    React.createElement(LocalCounter, null),
    React.createElement("div", { className: "section-header" },
      React.createElement("div", { className: "section-title" },
        React.createElement("span", { className: "section-title-line" }),
        "Останні надходження"
      ),
      state.user && React.createElement("button", {
        className: "btn btn-primary btn-sm",
        onClick: () => dispatch({ type: "SET_PAGE", page: "add" })
      }, "+ Додати фільм")
    ),
    state.films.length === 0
      ? React.createElement("div", { className: "empty-state" },
          React.createElement("div", { className: "empty-state-icon" }, "🎞️"),
          React.createElement("div", { className: "empty-state-text" }, "Каталог порожній. Додайте перший фільм!")
        )
      : React.createElement("div", { className: "films-grid" },
          state.films.slice(0, 6).map(film =>
            React.createElement(FilmCard, { key: film.id, film, state, dispatch })
          )
        )
  );
}

// ---- FilmCard ----
const GENRE_EMOJIS = {
  "1": "🎭", "2": "💥", "3": "😂", "4": "👻", "5": "💑", "6": "🔍", "7": "🚀", "8": "🧪"
};
function FilmCard({ film, state, dispatch }) {
  const genre = state.genres.find(g => g.id === film.genre_id);
  const director = state.directors.find(d => d.id === film.director_id);
  const emoji = GENRE_EMOJIS[film.genre_id] || "🎬";

  const handleDelete = async () => {
    if (!confirm(`Видалити "${film.title}"?`)) return;
    await apiFetch("film", film.id, "DELETE");
    const films = await apiFetch("film");
    dispatch({ type: "SET_FILMS", data: films || [] });
  };

  return React.createElement("div", { className: "film-card" },
    React.createElement("div", { className: "film-poster" },
      emoji,
      React.createElement("div", { className: "film-poster-overlay" }),
      genre && React.createElement("div", { className: "film-genre-badge" }, genre.name)
    ),
    React.createElement("div", { className: "film-card-body" },
      React.createElement("div", { className: "film-card-title" }, film.title),
      React.createElement("div", { className: "film-card-meta" },
        React.createElement("span", { className: "badge badge-year" }, film.year || "—"),
        film.rating && React.createElement("span", { className: "film-rating" }, "★ ", film.rating)
      ),
      director && React.createElement("div", { style: { fontSize: 12, color: "var(--text-muted)" } },
        "реж. ", director.name
      )
    ),
    state.user && React.createElement("div", { className: "film-card-actions" },
      React.createElement("button", {
        className: "btn btn-secondary btn-sm",
        style: { flex: 1 },
        onClick: () => dispatch({ type: "SET_EDITING", film })
      }, "✏️ Редагувати"),
      React.createElement("button", {
        className: "btn btn-danger btn-sm",
        onClick: handleDelete
      }, "🗑")
    )
  );
}

// ---- FilmsPage ----
function FilmsPage({ state, dispatch }) {
  let filtered = [...state.films];
  if (state.filterGenre) filtered = filtered.filter(f => f.genre_id === state.filterGenre);
  if (state.filterSearch) {
    const q = state.filterSearch.toLowerCase();
    filtered = filtered.filter(f => f.title.toLowerCase().includes(q));
  }
  if (state.filterSort === "rating") filtered.sort((a,b) => (b.rating||0) - (a.rating||0));
  else if (state.filterSort === "year") filtered.sort((a,b) => (b.year||0) - (a.year||0));
  else filtered.sort((a,b) => a.title.localeCompare(b.title, "uk"));

  return React.createElement("div", { className: "page-enter" },
    React.createElement("div", { className: "section-header" },
      React.createElement("div", { className: "section-title" },
        React.createElement("span", { className: "section-title-line" }),
        "Каталог фільмів"
      ),
      state.user && React.createElement("button", {
        className: "btn btn-primary btn-sm",
        onClick: () => dispatch({ type: "SET_PAGE", page: "add" })
      }, "+ Додати")
    ),
    React.createElement("div", { className: "filter-bar" },
      React.createElement("label", null, "Жанр"),
      React.createElement("select", {
        className: "filter-select",
        value: state.filterGenre,
        onChange: e => dispatch({ type: "SET_FILTER_GENRE", value: e.target.value })
      },
        React.createElement("option", { value: "" }, "Всі жанри"),
        state.genres.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))
      ),
      React.createElement("label", null, "Сортування"),
      React.createElement("select", {
        className: "filter-select",
        value: state.filterSort,
        onChange: e => dispatch({ type: "SET_FILTER_SORT", value: e.target.value })
      },
        React.createElement("option", { value: "title" }, "За назвою"),
        React.createElement("option", { value: "rating" }, "За рейтингом"),
        React.createElement("option", { value: "year" }, "За роком")
      ),
      React.createElement("input", {
        className: "filter-input",
        placeholder: "🔍 Пошук за назвою...",
        value: state.filterSearch,
        onChange: e => dispatch({ type: "SET_SEARCH", value: e.target.value })
      })
    ),
    filtered.length === 0
      ? React.createElement("div", { className: "empty-state" },
          React.createElement("div", { className: "empty-state-icon" }, "🎞️"),
          React.createElement("div", { className: "empty-state-text" }, "Нічого не знайдено")
        )
      : React.createElement("div", { className: "films-grid" },
          filtered.map(film => React.createElement(FilmCard, { key: film.id, film, state, dispatch }))
        )
  );
}

// ---- EditFilmPage ----
function EditFilmPage({ state, dispatch, isAdd }) {
  const blank = { title: "", year: "", rating: "", duration: "", description: "", genre_id: "", director_id: "", studio_id: "", status: "" };
  const [form, setForm] = useState(isAdd ? blank : (state.editingFilm || blank));
  const [msg, setMsg] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title) { setMsg({ type: "error", text: "Назва фільму обов'язкова!" }); return; }
    let result;
    if (isAdd) {
      result = await apiFetch("film", null, "POST", form);
    } else {
      result = await apiFetch("film", form.id, "PUT", form);
    }
    if (result) {
      const films = await apiFetch("film");
      dispatch({ type: "SET_FILMS", data: films || [] });
      setMsg({ type: "success", text: isAdd ? "Фільм успішно додано! 🎬" : "Зміни збережено! ✅" });
      if (isAdd) setForm(blank);
    }
  };

  const statuses = ["Переглянуто", "Планую", "Дивлюся", "Кинуто", "Хочу переглянути"];

  return React.createElement("div", { className: "page-enter" },
    React.createElement("div", { className: "form-container" },
      React.createElement("div", { className: "form-title" }, isAdd ? "Новий фільм" : "Редагувати фільм"),
      React.createElement("div", { className: "form-group" },
        React.createElement("label", { className: "form-label" }, "Назва фільму *"),
        React.createElement("input", { className: "form-input", value: form.title, onChange: e => set("title", e.target.value), placeholder: "Наприклад: Темний лицар" })
      ),
      React.createElement("div", { className: "form-row" },
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { className: "form-label" }, "Рік"),
          React.createElement("input", { className: "form-input", type: "number", value: form.year, onChange: e => set("year", e.target.value), placeholder: "2024" })
        ),
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { className: "form-label" }, "Рейтинг (0–10)"),
          React.createElement("input", { className: "form-input", type: "number", step: "0.1", min: "0", max: "10", value: form.rating, onChange: e => set("rating", e.target.value), placeholder: "8.5" })
        )
      ),
      React.createElement("div", { className: "form-row" },
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { className: "form-label" }, "Жанр"),
          React.createElement("select", { className: "form-select", value: form.genre_id, onChange: e => set("genre_id", e.target.value) },
            React.createElement("option", { value: "" }, "Оберіть жанр"),
            state.genres.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))
          )
        ),
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { className: "form-label" }, "Режисер"),
          React.createElement("select", { className: "form-select", value: form.director_id, onChange: e => set("director_id", e.target.value) },
            React.createElement("option", { value: "" }, "Оберіть режисера"),
            state.directors.map(d => React.createElement("option", { key: d.id, value: d.id }, d.name))
          )
        )
      ),
      React.createElement("div", { className: "form-row" },
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { className: "form-label" }, "Студія"),
          React.createElement("select", { className: "form-select", value: form.studio_id, onChange: e => set("studio_id", e.target.value) },
            React.createElement("option", { value: "" }, "Оберіть студію"),
            state.studios.map(s => React.createElement("option", { key: s.id, value: s.id }, s.name))
          )
        ),
        React.createElement("div", { className: "form-group" },
          React.createElement("label", { className: "form-label" }, "Тривалість (хв)"),
          React.createElement("input", { className: "form-input", type: "number", value: form.duration, onChange: e => set("duration", e.target.value), placeholder: "120" })
        )
      ),
      React.createElement("div", { className: "form-group" },
        React.createElement("label", { className: "form-label" }, "Статус перегляду"),
        React.createElement("select", { className: "form-select", value: form.status, onChange: e => set("status", e.target.value) },
          React.createElement("option", { value: "" }, "Оберіть статус"),
          statuses.map(s => React.createElement("option", { key: s, value: s }, s))
        )
      ),
      React.createElement("div", { className: "form-group" },
        React.createElement("label", { className: "form-label" }, "Опис"),
        React.createElement("textarea", { className: "form-textarea", value: form.description, onChange: e => set("description", e.target.value), placeholder: "Короткий опис сюжету..." })
      ),
      msg && React.createElement("div", { className: `form-msg ${msg.type}` }, msg.text),
      React.createElement("div", { className: "form-actions" },
        React.createElement("button", { className: "btn btn-primary", onClick: handleSubmit },
          isAdd ? "🎬 Додати фільм" : "💾 Зберегти зміни"
        ),
        React.createElement("button", {
          className: "btn btn-secondary",
          onClick: () => dispatch({ type: "SET_PAGE", page: "films" })
        }, "Скасувати")
      )
    )
  );
}

// ---- AuthPage ----
function AuthPage({ dispatch }) {
  const [login, setLogin] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr] = useState("");

  const handleLogin = () => {
    if (!login || !pass) { setErr("Заповніть усі поля"); return; }
    if (pass.length < 4) { setErr("Пароль занадто короткий"); return; }
    dispatch({ type: "LOGIN", user: { login, role: login === "admin" ? "admin" : "user" } });
  };

  return React.createElement("div", { className: "auth-page" },
    React.createElement("div", { className: "auth-box" },
      React.createElement("div", { className: "auth-logo" }, "🎬 CineBase"),
      React.createElement("div", { className: "auth-subtitle" }, "Увійдіть, щоб керувати каталогом"),
      React.createElement("div", { className: "form-group" },
        React.createElement("label", { className: "form-label" }, "Логін"),
        React.createElement("input", {
          className: "form-input", value: login,
          onChange: e => setLogin(e.target.value),
          placeholder: "admin або будь-який логін"
        })
      ),
      React.createElement("div", { className: "form-group" },
        React.createElement("label", { className: "form-label" }, "Пароль"),
        React.createElement("input", {
          className: "form-input", type: "password", value: pass,
          onChange: e => setPass(e.target.value),
          onKeyDown: e => e.key === "Enter" && handleLogin(),
          placeholder: "Мінімум 4 символи"
        })
      ),
      err && React.createElement("div", { className: "form-msg error" }, err),
      React.createElement("button", { className: "btn btn-primary btn-full", style: { marginTop: 8 }, onClick: handleLogin }, "Увійти →"),
      React.createElement("div", { className: "auth-divider" },
        React.createElement("span", null, "демо-доступ")
      ),
      React.createElement("div", { style: { fontSize: 12, color: "var(--text-muted)", textAlign: "center" } },
        "Логін: ", React.createElement("code", { style: { color: "var(--accent)" } }, "admin"), " | Пароль: ",
        React.createElement("code", { style: { color: "var(--accent)" } }, "1234")
      )
    )
  );
}

// ---- TablePage (generic) ----
function TablePage({ title, resource, state, dispatch, columns, renderRow }) {
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    apiFetch(resource).then(data => setItems(data || []));
  }, [resource]);

  const handleAdd = async () => {
    if (!newName) { setMsg({ type: "error", text: "Назва не може бути порожньою" }); return; }
    const res = await apiFetch(resource, null, "POST", { name: newName });
    if (res) {
      setItems(prev => [...prev, res]);
      setNewName(""); setShowAdd(false);
      setMsg({ type: "success", text: "Додано!" });
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("Видалити запис?")) return;
    await apiFetch(resource, id, "DELETE");
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return React.createElement("div", { className: "page-enter" },
    React.createElement("div", { className: "section-header" },
      React.createElement("div", { className: "section-title" },
        React.createElement("span", { className: "section-title-line" }),
        title
      ),
      state.user && React.createElement("button", {
        className: "btn btn-primary btn-sm",
        onClick: () => setShowAdd(s => !s)
      }, showAdd ? "Скасувати" : "+ Додати")
    ),
    showAdd && React.createElement("div", { className: "filter-bar", style: { marginBottom: 16 } },
      React.createElement("input", {
        className: "filter-input", value: newName,
        onChange: e => setNewName(e.target.value),
        placeholder: `Нова назва для "${title}"...`,
        onKeyDown: e => e.key === "Enter" && handleAdd()
      }),
      React.createElement("button", { className: "btn btn-primary btn-sm", onClick: handleAdd }, "Зберегти")
    ),
    msg && React.createElement("div", { className: `form-msg ${msg.type}`, style: { marginBottom: 16 } }, msg.text),
    React.createElement("div", { className: "table-wrapper" },
      React.createElement("table", { className: "data-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            React.createElement("th", null, "#"),
            ...columns.map(c => React.createElement("th", { key: c }, c)),
            state.user && React.createElement("th", null, "Дії")
          )
        ),
        React.createElement("tbody", null,
          items.length === 0
            ? React.createElement("tr", null,
                React.createElement("td", { colSpan: columns.length + 2, style: { textAlign: "center", color: "var(--text-muted)", padding: 32 } }, "Порожньо")
              )
            : items.map((item, i) =>
                React.createElement("tr", { key: item.id },
                  React.createElement("td", { style: { color: "var(--text-muted)" } }, i + 1),
                  ...(renderRow ? renderRow(item) : [React.createElement("td", { key: "name" }, item.name)]),
                  state.user && React.createElement("td", null,
                    React.createElement("div", { className: "table-actions" },
                      React.createElement("button", {
                        className: "btn btn-danger btn-sm",
                        onClick: () => handleDelete(item.id)
                      }, "Видалити")
                    )
                  )
                )
              )
        )
      )
    )
  );
}

// ---- Main App ----
function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadData = useCallback(async () => {
    dispatch({ type: "SET_LOADING", value: true });
    const [films, directors, genres, studios] = await Promise.all([
      apiFetch("film"), apiFetch("director"), apiFetch("genre"), apiFetch("studio")
    ]);
    dispatch({ type: "SET_FILMS",     data: films     || [] });
    dispatch({ type: "SET_DIRECTORS", data: directors || [] });
    dispatch({ type: "SET_GENRES",    data: genres    || [] });
    dispatch({ type: "SET_STUDIOS",   data: studios   || [] });
    dispatch({ type: "SET_LOADING",   value: false });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!state.user && state.page === "login") {
    return React.createElement(AuthPage, { dispatch });
  }

  const navItems = [
    { key: "home",      label: "Головна" },
    { key: "films",     label: "Каталог" },
    { key: "directors", label: "Режисери" },
    { key: "genres",    label: "Жанри" },
    { key: "studios",   label: "Студії" },
  ];

  const renderPage = () => {
    switch (state.page) {
      case "home":      return React.createElement(HomePage, { state, dispatch });
      case "films":     return React.createElement(FilmsPage, { state, dispatch });
      case "add":       return React.createElement(EditFilmPage, { state, dispatch, isAdd: true });
      case "edit":      return React.createElement(EditFilmPage, { state, dispatch, isAdd: false });
      case "directors": return React.createElement(TablePage, {
        title: "Режисери", resource: "director", state, dispatch,
        columns: ["Ім'я режисера"],
        renderRow: item => [React.createElement("td", { key: "name" }, item.name)]
      });
      case "genres": return React.createElement(TablePage, {
        title: "Жанри", resource: "genre", state, dispatch,
        columns: ["Жанр"],
        renderRow: item => [React.createElement("td", { key: "name" }, item.name)]
      });
      case "studios": return React.createElement(TablePage, {
        title: "Кіностудії", resource: "studio", state, dispatch,
        columns: ["Студія"],
        renderRow: item => [React.createElement("td", { key: "name" }, item.name)]
      });
      default: return React.createElement(HomePage, { state, dispatch });
    }
  };

  return React.createElement("div", { className: "app-wrapper" },
    React.createElement("nav", { className: "navbar" },
      React.createElement("a", { className: "navbar-logo", href: "#", onClick: e => { e.preventDefault(); dispatch({ type: "SET_PAGE", page: "home" }); } },
        React.createElement("span", null, "🎬"), "CineBase"
      ),
      React.createElement("div", { className: "navbar-links" },
        navItems.map(item =>
          React.createElement("button", {
            key: item.key,
            className: `nav-btn ${state.page === item.key || (item.key === "home" && state.page === "home") ? "active" : ""}`,
            onClick: () => dispatch({ type: "SET_PAGE", page: item.key })
          }, item.label)
        )
      ),
      state.user
        ? React.createElement("div", { className: "navbar-user" },
            "👤 ", React.createElement("strong", null, state.user.login),
            state.user.role === "admin" && React.createElement("span", { className: "badge badge-rating", style: { fontSize: 10 } }, "admin"),
            React.createElement("button", { className: "logout-btn", onClick: () => dispatch({ type: "LOGOUT" }) }, "Вийти")
          )
        : React.createElement("button", {
            className: "btn btn-secondary btn-sm",
            onClick: () => dispatch({ type: "SET_PAGE", page: "login" })
          }, "Увійти")
    ),
    React.createElement("main", { className: "main-content" },
      state.loading
        ? React.createElement("div", { className: "empty-state" },
            React.createElement("div", { className: "empty-state-icon" }, "⏳"),
            React.createElement("div", { className: "empty-state-text" }, "Завантаження даних...")
          )
        : state.page === "login"
          ? React.createElement(AuthPage, { dispatch })
          : renderPage()
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
