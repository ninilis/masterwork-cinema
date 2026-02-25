// static/js/admin.js

// ---------- ПРОВЕРКА АВТОРИЗАЦИИ ----------
if (document.querySelector('.admin-steps')) {
    if (!sessionStorage.getItem('adminAuthenticated')) {
        window.location.href = 'login.html';
    }
}

// ---------- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ----------
let halls = [];
let films = [];
let seances = [];

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
function formatDateForInput(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ---------- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ----------
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (document.querySelector('.admin-steps')) {
        loadAdminData();
        initEventListeners();
        // Подписка на изменение выбора зала в блоке 5 (статус)
        const hallSelectOpen = document.getElementById('hallSelectOpen');
        if (hallSelectOpen) {
            hallSelectOpen.addEventListener('change', updateOpenButtonText);
        }
    }
});

// ---------- ОБРАБОТЧИК ЛОГИНА ----------
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
        await api.login(email, password);
        sessionStorage.setItem('adminAuthenticated', 'true');
        window.location.href = 'admin.html';
    } catch (error) {
        alert('Ошибка входа: ' + error.message);
    }
}

// ---------- ЗАГРУЗКА ВСЕХ ДАННЫХ С СЕРВЕРА ----------
async function loadAdminData() {
    try {
        const data = await api.getAllData();
        halls = data.halls || [];
        films = data.films || [];
        seances = data.seances || [];
        renderHalls();
        renderFilms();
        renderHallSelects();
        renderFilmsPool();
        renderTimelines();
        updateOpenButtonText(); // обновить текст кнопки статуса после загрузки
    } catch (error) {
        alert('Ошибка загрузки данных: ' + error.message);
    }
}

// ---------- ОТРИСОВКА СПИСКА ЗАЛОВ ----------
function renderHalls() {
    const container = document.getElementById('halls-list');
    if (!container) return;

    container.innerHTML = halls.map(hall => `
        <div class="hall-item" data-hall-id="${hall.id}">
            <span class="hall-name">${hall.hall_name}</span>
            <div>
                <button class="btn-edit-scheme btn btn-sm btn-outline-primary" data-hall-id="${hall.id}">Схема</button>
                <button class="btn-delete-hall btn btn-sm btn-outline-danger" title="Удалить зал">×</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-delete-hall').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hallItem = e.target.closest('.hall-item');
            const hallId = hallItem.dataset.hallId;
            deleteHall(hallId);
        });
    });

    document.querySelectorAll('.btn-edit-scheme').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hallId = e.target.dataset.hallId;
            openSchemeEditor(hallId);
        });
    });
}

// ---------- ОТРИСОВКА СПИСКА ФИЛЬМОВ (для админки) ----------
function renderFilms() {
    const container = document.getElementById('films-list');
    if (!container) return;

    container.innerHTML = films.map(film => `
        <div class="film-card" data-film-id="${film.id}">
            <h5>${film.film_name}</h5>
            <p>${film.film_duration} мин, ${film.film_origin || 'Неизвестно'}</p>
            <button class="btn-delete-film btn btn-sm btn-outline-danger">Удалить</button>
        </div>
    `).join('');

    document.querySelectorAll('.btn-delete-film').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filmCard = e.target.closest('.film-card');
            const filmId = filmCard.dataset.filmId;
            deleteFilm(filmId);
        });
    });
}

// ---------- ЗАПОЛНЕНИЕ ВСЕХ ВЫПАДАЮЩИХ СПИСКОВ ЗАЛОВ ----------
function renderHallSelects() {
    const selects = document.querySelectorAll('select[id^="hallSelect"]');
    selects.forEach(select => {
        select.innerHTML = halls.map(hall => `<option value="${hall.id}">${hall.hall_name}</option>`).join('');
    });
}

// ---------- ОТРИСОВКА ПУЛА ФИЛЬМОВ ДЛЯ DRAG & DROP ----------
function renderFilmsPool() {
    const pool = document.getElementById('films-pool-list');
    if (!pool) return;
    pool.innerHTML = films.map(film => `
        <div class="film-item" draggable="true" data-film-id="${film.id}">${film.film_name}</div>
    `).join('');
    initDrag();
}

// ---------- ОТРИСОВКА ЛЕНТ СЕАНСОВ ----------
function renderTimelines() {
    const timelinesContainer = document.getElementById('halls-timelines');
    if (!timelinesContainer) return;

    const seancesByHall = {};
    seances.forEach(s => {
        if (!seancesByHall[s.seance_hallid]) seancesByHall[s.seance_hallid] = [];
        seancesByHall[s.seance_hallid].push(s);
    });

    halls.forEach(hall => {
        let timeline = document.querySelector(`.hall-timeline[data-hall-id="${hall.id}"]`);
        if (!timeline) {
            timeline = document.createElement('div');
            timeline.className = 'hall-timeline';
            timeline.dataset.hallId = hall.id;
            timeline.innerHTML = `
                <div class="timeline-header">${hall.hall_name}</div>
                <div class="timeline-slots" id="timeline-hall-${hall.id}"></div>
            `;
            timelinesContainer.appendChild(timeline);
        }
        const slots = timeline.querySelector('.timeline-slots');
        slots.innerHTML = '';

        const hallSeances = seancesByHall[hall.id] || [];
        hallSeances.forEach(seance => {
            const film = films.find(f => f.id == seance.seance_filmid);
            if (!film) return;
            const block = document.createElement('div');
            block.className = 'seance-block';
            block.textContent = `${film.film_name} ${seance.seance_time}`;
            block.dataset.seanceId = seance.id;
            block.dataset.filmId = seance.seance_filmid;
            block.dataset.hallId = seance.seance_hallid;
            block.dataset.time = seance.seance_time;
            block.setAttribute('draggable', 'true');
            slots.appendChild(block);
        });
    });

    initDrag();
}

// ---------- DRAG & DROP (SORTABLE) ----------
let sortableInstances = [];

function initDrag() {
    sortableInstances.forEach(instance => instance.destroy());
    sortableInstances = [];

    const filmsPool = document.getElementById('films-pool-list');
    if (filmsPool) {
        sortableInstances.push(new Sortable(filmsPool, {
            group: {
                name: 'films',
                pull: 'clone',
                revertClone: false
            },
            sort: false,
            animation: 150
        }));
    }

    document.querySelectorAll('.timeline-slots').forEach(slot => {
        sortableInstances.push(new Sortable(slot, {
            group: {
                name: 'films',
                pull: true
            },
            onAdd: async (evt) => {
                const filmId = evt.item.dataset.filmId;
                const hallId = evt.target.closest('.hall-timeline').dataset.hallId;

                // Если это существующий сеанс (перемещение внутри лент) — ничего не делаем
                if (evt.item.classList.contains('seance-block')) {
                    return;
                }

                // Это новый сеанс
                const time = prompt('Введите время сеанса (HH:MM):', '12:00');
                if (!time) {
                    evt.item.remove();
                    return;
                }

                try {
                    await api.addSeance(hallId, filmId, time);
                    await loadAdminData(); // перезагружаем все данные (ленты перерисуются)
                } catch (error) {
                    alert('Ошибка создания сеанса: ' + error.message);
                    evt.item.remove();
                }
            },
            onRemove: async (evt) => {
                const seanceId = evt.item.dataset.seanceId;
                if (seanceId && confirm('Удалить сеанс?')) {
                    try {
                        await api.deleteSeance(seanceId);
                        // Элемент уже удалён из DOM, ничего не делаем
                    } catch (error) {
                        alert('Ошибка удаления: ' + error.message);
                        loadAdminData(); // восстановить состояние
                    }
                } else {
                    // Отмена удаления — перезагружаем, чтобы вернуть элемент
                    loadAdminData();
                }
            }
        }));
    });
}

// ---------- УПРАВЛЕНИЕ ЗАЛАМИ ----------
async function deleteHall(hallId) {
    if (!confirm('Удалить зал? Это также удалит все связанные сеансы.')) return;
    try {
        await api.deleteHall(hallId);
        await loadAdminData();
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}

async function createHall() {
    const name = document.getElementById('hallName').value.trim();
    const rows = parseInt(document.getElementById('hallRows').value);
    const cols = parseInt(document.getElementById('hallCols').value);
    if (!name || !rows || !cols) {
        alert('Заполните все поля');
        return;
    }
    try {
        await api.addHall(name);
        await loadAdminData();
        const modalEl = document.getElementById('addHallModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        document.getElementById('hallName').value = '';
        document.getElementById('hallRows').value = 5;
        document.getElementById('hallCols').value = 8;
    } catch (error) {
        alert('Ошибка при создании зала: ' + error.message);
    }
}

// ---------- РЕДАКТОР СХЕМЫ ЗАЛА ----------
function openSchemeEditor(hallId) {
    const hall = halls.find(h => h.id == hallId);
    if (!hall) return;

    document.getElementById('editingHallName').textContent = hall.hall_name;
    const editorContainer = document.getElementById('hall-scheme-editor');
    editorContainer.innerHTML = '';

    let config = hall.hall_config;
    if (!config || config.length === 0) {
        config = Array(hall.hall_rows).fill().map(() => Array(hall.hall_places).fill('standart'));
    }

    for (let r = 0; r < hall.hall_rows; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'hall-scheme-editor__row';
        for (let c = 0; c < hall.hall_places; c++) {
            const place = document.createElement('div');
            place.className = `hall-scheme-editor__place hall-scheme-editor__place--${config[r][c]}`;
            place.dataset.row = r;
            place.dataset.col = c;
            place.dataset.type = config[r][c];

            place.addEventListener('click', () => {
                const types = ['standart', 'vip', 'disabled'];
                let current = place.dataset.type;
                let nextIndex = (types.indexOf(current) + 1) % types.length;
                let nextType = types[nextIndex];
                place.className = `hall-scheme-editor__place hall-scheme-editor__place--${nextType}`;
                place.dataset.type = nextType;
            });

            rowDiv.appendChild(place);
        }
        editorContainer.appendChild(rowDiv);
    }

    const modal = new bootstrap.Modal(document.getElementById('editHallSchemeModal'));
    modal.show();

    document.getElementById('saveSchemeBtn').onclick = async () => {
        const newConfig = [];
        const rows = editorContainer.querySelectorAll('.hall-scheme-editor__row');
        rows.forEach(row => {
            const rowConfig = [];
            row.querySelectorAll('.hall-scheme-editor__place').forEach(place => {
                rowConfig.push(place.dataset.type);
            });
            newConfig.push(rowConfig);
        });

        try {
            await api.updateHallConfig(hallId, newConfig);
            modal.hide();
            await loadAdminData();
        } catch (error) {
            alert('Ошибка сохранения схемы: ' + error.message);
        }
    };
}

// ---------- УПРАВЛЕНИЕ ФИЛЬМАМИ ----------
async function deleteFilm(filmId) {
    if (!confirm('Удалить фильм? Это также удалит все связанные сеансы.')) return;
    try {
        await api.deleteMovie(filmId);
        await loadAdminData();
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}

async function createFilm() {
    const name = document.getElementById('filmName').value.trim();
    const duration = parseInt(document.getElementById('filmDuration').value);
    const description = document.getElementById('filmDescription').value.trim();
    const origin = document.getElementById('filmOrigin').value.trim();
    const posterFile = document.getElementById('filmPoster').files[0];

    if (!name || !duration) {
        alert('Заполните обязательные поля');
        return;
    }

    try {
        await api.addMovie(name, duration, description, origin, posterFile);
        await loadAdminData();
        const modalEl = document.getElementById('addFilmModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        document.getElementById('filmName').value = '';
        document.getElementById('filmDuration').value = '';
        document.getElementById('filmDescription').value = '';
        document.getElementById('filmOrigin').value = '';
        document.getElementById('filmPoster').value = '';
    } catch (error) {
        alert('Ошибка добавления фильма: ' + error.message);
    }
}

// ---------- ОБНОВЛЕНИЕ ЦЕН ----------
async function updatePrices() {
    const select = document.getElementById('hallSelectPrice');
    if (!select) return;
    const hallId = select.value;
    const standart = parseInt(document.getElementById('standartPrice').value);
    const vip = parseInt(document.getElementById('vipPrice').value);

    if (isNaN(standart) || isNaN(vip)) {
        alert('Введите корректные цены');
        return;
    }

    try {
        await api.updateHallPrice(hallId, standart, vip);
        alert('Цены обновлены');
        await loadAdminData();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// ---------- ПЕРЕКЛЮЧЕНИЕ СТАТУСА ЗАЛА (ОТКРЫТ/ЗАКРЫТ) ----------
async function toggleHallStatus() {
    const select = document.getElementById('hallSelectOpen');
    if (!select) return;
    const hallId = select.value;
    const hall = halls.find(h => h.id == hallId);
    if (!hall) return;

    const newStatus = hall.hall_open === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'открыть' : 'закрыть';
    if (!confirm(`Вы уверены, что хотите ${action} продажи в зале "${hall.hall_name}"?`)) return;

    try {
        await api.toggleHallStatus(hallId, newStatus);
        await loadAdminData();
        // после обновления данных текст кнопки обновится через updateOpenButtonText
    } catch (error) {
        alert('Ошибка изменения статуса: ' + error.message);
    }
}

// Обновление текста кнопки в блоке 5 в зависимости от выбранного зала
function updateOpenButtonText() {
    const select = document.getElementById('hallSelectOpen');
    const button = document.getElementById('toggleHallStatusBtn');
    if (!select || !button) return;
    const hallId = select.value;
    const hall = halls.find(h => h.id == hallId);
    if (hall) {
        button.textContent = hall.hall_open === 1 ? 'Приостановить продажу билетов' : 'Открыть продажу билетов';
    }
}

// ---------- ПОДПИСКА НА КНОПКИ ----------
function initEventListeners() {
    const saveHallBtn = document.getElementById('saveHallBtn');
    if (saveHallBtn) saveHallBtn.addEventListener('click', createHall);

    const saveFilmBtn = document.getElementById('saveFilmBtn');
    if (saveFilmBtn) saveFilmBtn.addEventListener('click', createFilm);

    const savePriceBtn = document.getElementById('savePriceBtn');
    if (savePriceBtn) savePriceBtn.addEventListener('click', updatePrices);

    const toggleStatusBtn = document.getElementById('toggleHallStatusBtn');
    if (toggleStatusBtn) toggleStatusBtn.addEventListener('click', toggleHallStatus);
}
