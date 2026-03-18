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
let currentSeatType = 'standart'; // текущий выбранный тип места (standart / vip / disabled)
let selectedPriceHallId = null; // выбранный зал в блоке цен
let selectedOpenHallId = null; // выбранный зал в блоке открытия продаж
let draggingSeance = null;        // текущий перетаскиваемый сеанс


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

        // Возврат фокуса на кнопку после закрытия модалок
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('hidden.bs.modal', function() {
                const trigger = document.querySelector(`[data-bs-target="#${this.id}"]`);
                if (trigger) trigger.focus();
            });
        });
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
        renderHallConfigTabs(); // вкладки конфигурации залов
        renderPriceHallTabs(); // вкладки цен
        renderOpenHallTabs(); // вкладки открытия продаж
        renderFilmsPool(); // пул фильмов
        renderTimelines(); // ленты сеансов
        updateOpenButtonText();
    } catch (error) {
        alert('Ошибка загрузки данных: ' + error.message);
    }
}

// ---------- ОТРИСОВКА СПИСКА ЗАЛОВ (блок 1) ----------
function renderHalls() {
    const container = document.getElementById('halls-list');
    if (!container) return;

    container.innerHTML = halls.map(hall => `
        <div class="hall-item" data-hall-id="${hall.id}">
            <span class="hall-name">${hall.hall_name}</span>
            <button class="btn-delete-hall" title="Удалить зал">🗑️</button>
        </div>
    `).join('');

    document.querySelectorAll('.btn-delete-hall').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hallItem = e.target.closest('.hall-item');
            const hallId = hallItem.dataset.hallId;
            deleteHall(hallId);
        });
    });
}

// ---------- ОТРИСОВКА ВКЛАДОК ДЛЯ ЦЕН (блок 3) ----------
function renderPriceHallTabs() {
    const container = document.getElementById('priceHallTabs');
    if (!container) return;
    if (halls.length === 0) {
        container.innerHTML = '<p>Нет залов</p>';
        return;
    }
    let html = '';
    halls.forEach((hall, index) => {
        const activeClass = index === 0 ? 'active' : '';
        html += `<div class="hall-tab ${activeClass}" data-hall-id="${hall.id}">${hall.hall_name}</div>`;
    });
    container.innerHTML = html;

    // Устанавливаем выбранный зал (первый по умолчанию)
    if (halls.length > 0) {
        selectedPriceHallId = halls[0].id;
        // Загружаем цены выбранного зала
        const hall = halls[0];
        document.getElementById('standartPrice').value = hall.hall_price_standart || 250;
        document.getElementById('vipPrice').value = hall.hall_price_vip || 350;
    }

    // Обработчики кликов по вкладкам
    document.querySelectorAll('#priceHallTabs .hall-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('#priceHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedPriceHallId = tab.dataset.hallId;
            // Загружаем цены выбранного зала
            const hall = halls.find(h => h.id == selectedPriceHallId);
            if (hall) {
                document.getElementById('standartPrice').value = hall.hall_price_standart || 250;
                document.getElementById('vipPrice').value = hall.hall_price_vip || 350;
            }
        });
    });
}

// ---------- ОТРИСОВКА ВКЛАДОК ДЛЯ ОТКРЫТИЯ ПРОДАЖ (блок 5) ----------
function renderOpenHallTabs() {
    const container = document.getElementById('openHallTabs');
    if (!container) return;
    if (halls.length === 0) {
        container.innerHTML = '<p>Нет залов</p>';
        return;
    }
    let html = '';
    halls.forEach((hall, index) => {
        const activeClass = index === 0 ? 'active' : '';
        html += `<div class="hall-tab ${activeClass}" data-hall-id="${hall.id}">${hall.hall_name}</div>`;
    });
    container.innerHTML = html;

    // Устанавливаем выбранный зал (первый по умолчанию)
    if (halls.length > 0) {
        selectedOpenHallId = halls[0].id;
        updateOpenButtonText();
    }

    // Обработчики кликов по вкладкам
    document.querySelectorAll('#openHallTabs .hall-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('#openHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedOpenHallId = tab.dataset.hallId;
            updateOpenButtonText();
        });
    });
}

// ---------- ОТРИСОВКА СПИСКА ФИЛЬМОВ (вспомогательная) ----------
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

// ---------- ЗАПОЛНЕНИЕ ВСЕХ ВЫПАДАЮЩИХ СПИСКОВ ЗАЛОВ (устаревшее, может остаться для совместимости) ----------
function renderHallSelects() {
    const selects = document.querySelectorAll('select[id^="hallSelect"]');
    selects.forEach(select => {
        select.innerHTML = halls.map(hall => `<option value="${hall.id}">${hall.hall_name}</option>`).join('');
    });
}

// ---------- ОТРИСОВКА ВКЛАДОК ВЫБОРА ЗАЛА В КОНФИГУРАЦИИ (блок 2) ----------
function renderHallConfigTabs() {
    const container = document.getElementById('hallConfigTabs');
    if (!container) return;
    if (halls.length === 0) {
        container.innerHTML = '<p>Нет залов</p>';
        return;
    }
    let html = '';
    halls.forEach((hall, index) => {
        const activeClass = index === 0 ? 'active' : '';
        html += `<div class="hall-tab ${activeClass}" data-hall-id="${hall.id}">${hall.hall_name}</div>`;
    });
    container.innerHTML = html;

    // Загружаем схему первого зала
    if (halls.length > 0) {
        loadHallConfig(halls[0].id);
    }

    // Обработчики кликов по вкладкам
    document.querySelectorAll('.hall-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.hall-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const hallId = tab.dataset.hallId;
            loadHallConfig(hallId);
        });
    });
}

// ---------- ЗАГРУЗКА КОНФИГУРАЦИИ ВЫБРАННОГО ЗАЛА ----------
function loadHallConfig(hallId) {
    const hall = halls.find(h => h.id == hallId);
    if (!hall) return;

    document.getElementById('rowsCount').value = hall.hall_rows || 5;
    document.getElementById('colsCount').value = hall.hall_places || 8;

    renderSchemeEditor(hall);
}

// ---------- ОТРИСОВКА РЕДАКТОРА СХЕМЫ ----------
function renderSchemeEditor(hall) {
    const container = document.getElementById('hallSchemeEditor');
    if (!container) return;

    let config = hall.hall_config;
    if (!config || config.length === 0) {
        config = Array(hall.hall_rows).fill().map(() => Array(hall.hall_places).fill('standart'));
    }

    container.innerHTML = '';

    for (let r = 0; r < config.length; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'hall-scheme-editor__row';
        for (let c = 0; c < config[r].length; c++) {
            const placeType = config[r][c];
            const place = document.createElement('div');
            place.className = `hall-scheme-editor__place hall-scheme-editor__place--${placeType}`;
            place.dataset.row = r;
            place.dataset.col = c;
            place.dataset.type = placeType;

            place.addEventListener('click', () => {
                // Циклическое переключение: standart -> vip -> disabled -> standart
                const currentType = place.dataset.type;
                let newType;
                if (currentType === 'standart') newType = 'vip';
                else if (currentType === 'vip') newType = 'disabled';
                else newType = 'standart';

                place.className = `hall-scheme-editor__place hall-scheme-editor__place--${newType}`;
                place.dataset.type = newType;
            });

            rowDiv.appendChild(place);
        }
        container.appendChild(rowDiv);
    }
}

// ---------- ПЕРЕСТРОЕНИЕ СХЕМЫ ПРИ ИЗМЕНЕНИИ РАЗМЕРОВ ----------
function rebuildSchemeFromInputs() {
    const activeTab = document.querySelector('.hall-tab.active');
    if (!activeTab) return;
    const hallId = activeTab.dataset.hallId;
    const hall = halls.find(h => h.id == hallId);
    if (!hall) return;

    const newRows = parseInt(document.getElementById('rowsCount').value);
    const newCols = parseInt(document.getElementById('colsCount').value);
    if (isNaN(newRows) || isNaN(newCols) || newRows < 1 || newCols < 1) {
        alert('Некорректные размеры зала');
        return;
    }

    // Собираем старую конфигурацию из DOM
    const editor = document.getElementById('hallSchemeEditor');
    const oldRows = editor.querySelectorAll('.hall-scheme-editor__row');
    let oldConfig = [];
    oldRows.forEach(row => {
        const rowConfig = [];
        row.querySelectorAll('.hall-scheme-editor__place').forEach(place => {
            rowConfig.push(place.dataset.type);
        });
        oldConfig.push(rowConfig);
    });

    // Создаём новую конфигурацию, сохраняя старые значения где возможно
    let newConfig = [];
    for (let r = 0; r < newRows; r++) {
        let row = [];
        for (let c = 0; c < newCols; c++) {
            if (r < oldConfig.length && c < oldConfig[r].length) {
                row.push(oldConfig[r][c]);
            } else {
                row.push('standart');
            }
        }
        newConfig.push(row);
    }

    hall.hall_config = newConfig;
    hall.hall_rows = newRows;
    hall.hall_places = newCols;
    renderSchemeEditor(hall);
}

// ---------- СОХРАНЕНИЕ КОНФИГУРАЦИИ ЗАЛА ----------
async function saveHallConfig() {
    const activeTab = document.querySelector('.hall-tab.active');
    if (!activeTab) return;
    const hallId = activeTab.dataset.hallId;
    const hall = halls.find(h => h.id == hallId);
    if (!hall) return;

    // Собираем конфигурацию из DOM
    const editor = document.getElementById('hallSchemeEditor');
    const rows = editor.querySelectorAll('.hall-scheme-editor__row');
    const newConfig = [];
    rows.forEach(row => {
        const rowConfig = [];
        row.querySelectorAll('.hall-scheme-editor__place').forEach(place => {
            rowConfig.push(place.dataset.type);
        });
        newConfig.push(rowConfig);
    });

    const newRows = parseInt(document.getElementById('rowsCount').value);
    const newCols = parseInt(document.getElementById('colsCount').value);
    if (isNaN(newRows) || isNaN(newCols) || newRows < 1 || newCols < 1) {
        alert('Некорректные размеры зала');
        return;
    }

    try {
        await api.updateHallConfig(hallId, newConfig, newRows, newCols);
        alert('Конфигурация сохранена');
        await loadAdminData();
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
    }
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
    if (!name) {
        alert('Введите название зала');
        return;
    }
    try {
        const newHall = await api.addHall(name); // предполагаем, что возвращает объект зала с id
        // Установим дефолтную конфигурацию
        const defaultRows = 5;
        const defaultCols = 8;
        const defaultConfig = Array(defaultRows).fill().map(() => Array(defaultCols).fill('standart'));
        await api.updateHallConfig(newHall.id, defaultConfig, defaultRows, defaultCols);
        await loadAdminData();
        // Закрыть модалку и очистить поле
        bootstrap.Modal.getInstance(document.getElementById('addHallModal')).hide();
        document.getElementById('hallName').value = '';
    } catch (error) {
        alert('Ошибка при создании зала: ' + error.message);
    }
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
    const posterFile = document.getElementById('filmPosterInput').files[0];

    if (!name || !duration) {
        alert('Заполните обязательные поля');
        return;
    }

    try {
        await api.addMovie(name, duration, description, origin, posterFile);
        await loadAdminData();
        const modalEl = document.getElementById('addFilmModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        document.querySelector('[data-bs-target="#addFilmModal"]').focus();
        // очистка формы
        document.getElementById('filmName').value = '';
        document.getElementById('filmDuration').value = '';
        document.getElementById('filmDescription').value = '';
        document.getElementById('filmOrigin').value = '';
        document.getElementById('filmPosterInput').value = '';
    } catch (error) {
        alert('Ошибка добавления фильма: ' + error.message);
    }
}

// ---------- УПРАВЛЕНИЕ СЕАНСАМИ ----------
async function createSeance() {
    const hallId = document.getElementById('seanceHallId').value;
    const filmId = document.getElementById('seanceFilmId').value;
    const time = document.getElementById('seanceTime').value;

    if (!hallId || !filmId || !time) {
        alert('Заполните все поля');
        return;
    }

    try {
        await api.addSeance(hallId, filmId, time);
        await loadAdminData();
        const modalEl = document.getElementById('addSeanceModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        // Очистка формы
        document.getElementById('seanceTime').value = '';
        document.getElementById('seanceHallId').value = '';
        document.getElementById('seanceFilmId').value = '';
        // Возврат фокуса (если есть кнопка, но её может не быть – опционально)
        document.querySelector('[data-bs-target="#addSeanceModal"]')?.focus();
    } catch (error) {
        alert('Ошибка добавления сеанса: ' + error.message);
    }
}

// ---------- ОТРИСОВКА ПУЛА ФИЛЬМОВ ДЛЯ DRAG & DROP ----------
function renderFilmsPool() {
    const pool = document.getElementById('films-pool-list');
    if (!pool) return;

    pool.innerHTML = films.map(film => {
        // Генерируем случайный светлый цвет (пастельный оттенок)
        const hue = Math.floor(Math.random() * 360);
        const bgColor = `hsl(${hue}, 30%, 90%)`;

        // Постер (если есть, иначе заглушка)
        const posterSrc = film.film_poster || 'static/img/default-poster.jpg';

        return `
            <div class="film-card" draggable="true" data-film-id="${film.id}" style="background-color: ${bgColor};">
                <div class="film-card-poster">
                    <img src="${posterSrc}" alt="${film.film_name}">
                </div>
                <div class="film-card-info">
                    <div class="film-card-title">${film.film_name}</div>
                    <div class="film-card-duration">${film.film_duration} мин</div>
                    <button class="btn-delete-film" title="Удалить фильм">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    // Обработчики удаления фильмов
    document.querySelectorAll('.btn-delete-film').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // предотвращаем срабатывание drag
            const filmCard = e.target.closest('.film-card');
            const filmId = filmCard.dataset.filmId;
            deleteFilm(filmId);
        });
    });

    // Переинициализация drag&drop после обновления списка
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
    // Уничтожаем предыдущие экземпляры Sortable
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

    // Получаем элемент корзины (убеждаемся, что он существует)
    const trashBin = document.getElementById('trashBin');
    if (!trashBin) {
        console.warn('Элемент #trashBin не найден в DOM');
        return;
    }

    // Для каждого таймлайна создаём Sortable
    document.querySelectorAll('.timeline-slots').forEach(slot => {
        sortableInstances.push(new Sortable(slot, {
            group: {
                name: 'films',
                pull: true,
                revertClone: false
            },
            animation: 150,
            onStart: (evt) => {
                // Показываем корзину только если перетаскивается сеанс
                if (evt.item.classList.contains('seance-block')) {
                    draggingSeance = evt.item;
                    trashBin.classList.remove('hidden');
                }
            },
            onEnd: (evt) => {
                // Скрываем корзину
                trashBin.classList.add('hidden');

                if (draggingSeance) {
                    // Координаты мыши в момент отпускания
                    const clientX = evt.originalEvent.clientX;
                    const clientY = evt.originalEvent.clientY;
                    const trashRect = trashBin.getBoundingClientRect();

                    // Проверяем, отпущен ли элемент над корзиной
                    if (clientX >= trashRect.left && clientX <= trashRect.right &&
                        clientY >= trashRect.top && clientY <= trashRect.bottom) {

                        const seanceId = draggingSeance.dataset.seanceId;
                        if (seanceId && confirm('Удалить этот сеанс?')) {
                            // Удаляем через API
                            api.deleteSeance(seanceId)
                                .then(() => loadAdminData())
                                .catch(err => {
                                    alert('Ошибка удаления: ' + err.message);
                                    loadAdminData(); // перезагружаем для синхронизации
                                });
                        }
                        // Если отмена – ничего не делаем, элемент вернётся на место автоматически
                    }
                    draggingSeance = null;
                }
            },
            onAdd: async (evt) => {
                // Логика добавления нового сеанса (перетаскивание карточки фильма из пула)
                const filmId = evt.item.dataset.filmId;
                const hallId = evt.target.closest('.hall-timeline').dataset.hallId;

                // Если перетаскивается существующий сеанс (перемещение между таймлайнами), ничего не делаем
                if (evt.item.classList.contains('seance-block')) {
                    return;
                }

                // Удаляем добавленный элемент (он будет создан через модалку)
                evt.item.remove();

                // Заполняем скрытые поля в модальном окне добавления сеанса
                document.getElementById('seanceHallId').value = hallId;
                document.getElementById('seanceFilmId').value = filmId;

                // Открываем модальное окно
                const modal = new bootstrap.Modal(document.getElementById('addSeanceModal'));
                modal.show();
            }
            // onRemove полностью удалён – удаление только через корзину
        }));
    });
}

// ---------- ОБНОВЛЕНИЕ ЦЕН ----------
async function updatePrices() {
    if (!selectedPriceHallId) {
        alert('Выберите зал');
        return;
    }
    const standart = parseInt(document.getElementById('standartPrice').value);
    const vip = parseInt(document.getElementById('vipPrice').value);

    if (isNaN(standart) || isNaN(vip) || standart < 0 || vip < 0) {
        alert('Цены должны быть положительными числами');
        return;
    }

    try {
        await api.updateHallPrice(selectedPriceHallId, standart, vip);
        alert('Цены обновлены');
        await loadAdminData(); // перезагружает данные, вкладки перерисуются с актуальными ценами
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }

}

// ---------- ПЕРЕКЛЮЧЕНИЕ СТАТУСА ЗАЛА ----------
async function toggleHallStatus() {
    if (!selectedOpenHallId) {
        alert('Выберите зал');
        return;
    }
    const hall = halls.find(h => h.id == selectedOpenHallId);
    if (!hall) return;

    const newStatus = hall.hall_open === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'открыть' : 'закрыть';
    if (!confirm(`Вы уверены, что хотите ${action} продажи в зале "${hall.hall_name}"?`)) return;

    try {
        await api.toggleHallStatus(selectedOpenHallId, newStatus);
        await loadAdminData();
    } catch (error) {
        alert('Ошибка изменения статуса: ' + error.message);
    }
}

function updateOpenButtonText() {
    const button = document.getElementById('toggleHallStatusBtn');
    if (!button) return;
    if (!selectedOpenHallId) {
        button.textContent = 'Открыть продажу билетов';
        return;
    }
    const hall = halls.find(h => h.id == selectedOpenHallId);
    if (hall) {
        button.textContent = hall.hall_open === 1 ? 'Приостановить продажу билетов' : 'Открыть продажу билетов';
    }
}

// ---------- ПОДПИСКА НА КНОПКИ ----------
function initEventListeners() {
    // Форма добавления зала
    const hallForm = document.getElementById('addHallForm');
    if (hallForm) {
        hallForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createHall();
        });
    }

    // Форма добавления фильма
    const filmForm = document.getElementById('addFilmForm');
    if (filmForm) {
        filmForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createFilm();
        });
    }

    // Кнопка сохранения цен
    const savePriceBtn = document.getElementById('savePriceBtn');
    if (savePriceBtn) savePriceBtn.addEventListener('click', updatePrices);

    // Кнопка переключения статуса зала
    const toggleStatusBtn = document.getElementById('toggleHallStatusBtn');
    if (toggleStatusBtn) toggleStatusBtn.addEventListener('click', toggleHallStatus);

    // Форма добавления сеанса
    const seanceForm = document.getElementById('addSeanceForm');
    if (seanceForm) {
        seanceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createSeance();
        });
    }

    // Кнопка загрузки постера
    const uploadBtn = document.getElementById('uploadPosterBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            document.getElementById('filmPosterInput').click();
        });
    }

    // Кнопка сохранения конфигурации зала
    const saveConfigBtn = document.getElementById('saveHallConfigBtn');
    if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveHallConfig);

    // Изменение размеров зала
    const rowsInput = document.getElementById('rowsCount');
    const colsInput = document.getElementById('colsCount');
    if (rowsInput) rowsInput.addEventListener('input', rebuildSchemeFromInputs);
    if (colsInput) colsInput.addEventListener('input', rebuildSchemeFromInputs);
    // Отмена в конфигурации зала
    document.getElementById('cancelHallConfigBtn')?.addEventListener('click', () => {
        const activeTab = document.querySelector('.hall-tab.active');
        if (activeTab) loadHallConfig(activeTab.dataset.hallId);
    });

// Отмена в блоке цен
    document.getElementById('cancelPriceBtn')?.addEventListener('click', () => {
        if (selectedPriceHallId) {
            const hall = halls.find(h => h.id == selectedPriceHallId);
            if (hall) {
                document.getElementById('standartPrice').value = hall.hall_price_standart || 250;
                document.getElementById('vipPrice').value = hall.hall_price_vip || 350;
            }
        }
    });

// Отмена в сетке сеансов
    document.getElementById('cancelScheduleBtn')?.addEventListener('click', () => {
        loadAdminData(); // полная перезагрузка всех данных
    });
}

