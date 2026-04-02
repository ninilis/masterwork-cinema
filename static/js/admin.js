// ПРОВЕРКА АВТОРИЗАЦИИ
if (document.querySelector('.admin-steps')) {
    if (!sessionStorage.getItem('adminAuthenticated')) {
        window.location.href = 'login.html';
    }
}

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let halls = [];
let films = [];
let seances = [];
let selectedPriceHallId = null;
let selectedOpenHallId = null;

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (document.querySelector('.admin-steps')) {
        loadAdminData();
        initEventListeners();
        drawStepLines();
    }

    // Управление фокусом и очистка полей для модальных окон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('shown.bs.modal', function() {
            const firstFocusable = this.querySelector('input:not([type="hidden"]), button, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) firstFocusable.focus();
        });

        modal.addEventListener('hide.bs.modal', function() {
            const trigger = document.querySelector(`[data-bs-target="#${this.id}"]`);
            if (trigger) {
                setTimeout(() => trigger.focus(), 10);
            } else {
                if (this.contains(document.activeElement)) document.activeElement.blur();
            }

            if (this.id === 'addSeanceModal') {
                const hallSelect = document.getElementById('seanceHallSelect');
                const filmSelect = document.getElementById('seanceFilmSelect');
                if (hallSelect) hallSelect.value = '';
                if (filmSelect) filmSelect.value = '';
                document.getElementById('seanceTime').value = '';
                document.getElementById('seanceHallId').value = '';
                document.getElementById('seanceFilmId').value = '';
            }
        });
    });

    // ОБРАБОТЧИК ЛОГИНА
    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        try {
            await api.login(email, password);
            sessionStorage.setItem('adminAuthenticated', 'true');
            window.location.href = 'admin.html';
        } catch (error) {
            showMessage('Ошибка входа', error.message, true);
        }
    }

    // ВКЛАДКИ КОНФИГУРАЦИИ ЗАЛОВ (блок 2)
    function renderHallConfigTabs() {
        const container = document.getElementById('hallConfigTabs');
        if (!container) return;
        container.innerHTML = '';
        if (halls.length === 0) {
            container.textContent = 'Нет залов';
            return;
        }
        halls.forEach((hall, index) => {
            const tab = document.createElement('div');
            tab.className = 'hall-tab';
            if (index === 0) tab.classList.add('active');
            tab.dataset.hallId = hall.id;
            tab.textContent = hall.hall_name;
            tab.addEventListener('click', () => {
                document.querySelectorAll('#hallConfigTabs .hall-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadHallConfig(tab.dataset.hallId);
                syncHallSelection(tab.dataset.hallId);
            });
            container.append(tab);
        });
        if (halls.length > 0) loadHallConfig(halls[0].id);
    }

    // ЗАГРУЗКА ДАННЫХ
    async function loadAdminData() {
        try {
            const data = await api.getAllData();
            halls = data.halls || [];
            films = data.films || [];
            seances = data.seances || [];

            // Сохраняем выбранные залы до перерисовки
            const savedPriceHallId = selectedPriceHallId;
            const savedOpenHallId = selectedOpenHallId;

            renderHalls();
            renderFilms();
            renderHallSelects();
            renderHallConfigTabs();
            renderPriceHallTabs(savedPriceHallId);
            renderOpenHallTabs(savedOpenHallId);
            renderFilmsPool();
            renderTimelines();
            updateOpenButtonText();
            drawStepLines();
            populateSeanceModalSelects();
            initTrashBin();
        } catch (error) {
            showMessage('Ошибка загрузки данных', error.message, true);
        }
    }


// ОТРИСОВКА ЗАЛОВ (блок 1)
    function renderHalls() {
        const container = document.getElementById('halls-list');
        if (!container) return;

        // Очищаем контейнер
        container.innerHTML = '';

        halls.forEach(hall => {
            // Контейнер зала
            const hallItem = document.createElement('div');
            hallItem.className = 'hall-item';
            hallItem.dataset.hallId = hall.id;

            // Название зала
            const nameSpan = document.createElement('span');
            nameSpan.className = 'hall-name';
            nameSpan.textContent = hall.hall_name;

            // Кнопка удаления
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-hall';
            deleteBtn.title = 'Удалить зал';
            deleteBtn.addEventListener('click', () => deleteHall(hall.id));

            // Собираем элемент
            hallItem.append(nameSpan, deleteBtn);
            container.append(hallItem);
        });
    }

// ВКЛАДКИ ЦЕН (блок 3)
    function renderPriceHallTabs(savedHallId = null) {
        const container = document.getElementById('priceHallTabs');
        if (!container) return;
        container.innerHTML = '';
        if (halls.length === 0) {
            container.textContent = 'Нет залов';
            return;
        }
        let activeFound = false;
        halls.forEach((hall, index) => {
            const tab = document.createElement('div');
            tab.className = 'hall-tab';
            if (savedHallId && hall.id == savedHallId) {
                tab.classList.add('active');
                activeFound = true;
                selectedPriceHallId = hall.id;
            } else if (!savedHallId && index === 0) {
                tab.classList.add('active');
                selectedPriceHallId = hall.id;
            }
            tab.dataset.hallId = hall.id;
            tab.textContent = hall.hall_name;
            tab.addEventListener('click', () => {
                document.querySelectorAll('#priceHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                selectedPriceHallId = tab.dataset.hallId;
                const selectedHall = halls.find(h => h.id == selectedPriceHallId);
                if (selectedHall) {
                    document.getElementById('standartPrice').value = selectedHall.hall_price_standart || 250;
                    document.getElementById('vipPrice').value = selectedHall.hall_price_vip || 350;
                }
            });
            container.append(tab);
        });
        // Если сохранённый зал не найден, активируем первый
        if (!activeFound && halls.length > 0) {
            const firstTab = container.querySelector('.hall-tab');
            if (firstTab) firstTab.classList.add('active');
            selectedPriceHallId = halls[0].id;
        }
        // Загружаем цены для выбранного зала
        const hall = halls.find(h => h.id == selectedPriceHallId);
        if (hall) {
            document.getElementById('standartPrice').value = hall.hall_price_standart || 250;
            document.getElementById('vipPrice').value = hall.hall_price_vip || 350;
        }
    }

    //ВКЛАДКИ ОТКРЫТИЯ ПРОДАЖ (блок 5)
    function renderOpenHallTabs(savedHallId = null) {
        const container = document.getElementById('openHallTabs');
        if (!container) return;
        container.innerHTML = '';
        if (halls.length === 0) {
            container.textContent = 'Нет залов';
            return;
        }
        let activeFound = false;
        halls.forEach((hall, index) => {
            const tab = document.createElement('div');
            tab.className = 'hall-tab';
            if (savedHallId && hall.id == savedHallId) {
                tab.classList.add('active');
                activeFound = true;
                selectedOpenHallId = hall.id;
            } else if (!savedHallId && index === 0) {
                tab.classList.add('active');
                selectedOpenHallId = hall.id;
            }
            tab.dataset.hallId = hall.id;
            tab.textContent = hall.hall_name;
            tab.addEventListener('click', () => {
                document.querySelectorAll('#openHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                selectedOpenHallId = tab.dataset.hallId;
                updateOpenButtonText();
            });
            container.append(tab);
        });
        if (!activeFound && halls.length > 0) {
            const firstTab = container.querySelector('.hall-tab');
            if (firstTab) firstTab.classList.add('active');
            selectedOpenHallId = halls[0].id;
        }
        updateOpenButtonText();
    }

// СПИСОК ФИЛЬМОВ (вспомогательная) – безопасная версия
    function renderFilms() {
        const container = document.getElementById('films-list');
        if (!container) return;

        // Очищаем контейнер
        container.innerHTML = '';

        films.forEach(film => {
            // Карточка фильма
            const filmCard = document.createElement('div');
            filmCard.className = 'film-card';
            filmCard.dataset.filmId = film.id;
            // Название фильма
            const title = document.createElement('h5');
            title.textContent = film.film_name;
            // Информация о длительности и стране
            const info = document.createElement('p');
            info.textContent = `${film.film_duration} мин, ${film.film_origin || 'Неизвестно'}`;
            // Кнопка удаления
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-film btn btn-sm btn-outline-danger';
            deleteBtn.textContent = 'Удалить';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filmId = filmCard.dataset.filmId;
                deleteFilm(filmId);
            });
            // Собираем карточку
            filmCard.append(title, info, deleteBtn);
            container.append(filmCard);
        });
    }

// ЗАПОЛНЕНИЕ SELECT-ОВ ЗАЛОВ
    function renderHallSelects() {
        const selects = document.querySelectorAll('select[id^="hallSelect"]');
        selects.forEach(select => {
            select.innerHTML = ''; // очистка безопасна, т.к. нет пользовательских данных
            halls.forEach(hall => {
                const option = document.createElement('option');
                option.value = hall.id;
                option.textContent = hall.hall_name;
                select.append(option);
            });
        });
    }

    function loadHallConfig(hallId) {
        const hall = halls.find(h => h.id == hallId);
        if (!hall) return;
        document.getElementById('rowsCount').value = hall.hall_rows || 5;
        document.getElementById('colsCount').value = hall.hall_places || 8;
        renderSchemeEditor(hall);
    }

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
                    let newType;
                    if (place.dataset.type === 'standart') newType = 'vip';
                    else if (place.dataset.type === 'vip') newType = 'disabled';
                    else newType = 'standart';
                    place.className = `hall-scheme-editor__place hall-scheme-editor__place--${newType}`;
                    place.dataset.type = newType;
                });
                rowDiv.append(place);
            }
            container.append(rowDiv);
        }
    }

    function rebuildSchemeFromInputs() {
        const activeTab = document.querySelector('#hallConfigTabs .hall-tab.active');
        if (!activeTab) return;
        const hallId = activeTab.dataset.hallId;
        const hall = halls.find(h => h.id == hallId);
        if (!hall) return;
        const newRows = parseInt(document.getElementById('rowsCount').value);
        const newCols = parseInt(document.getElementById('colsCount').value);
        if (isNaN(newRows) || isNaN(newCols) || newRows < 1 || newCols < 1) {
            showMessage('Ошибка', 'Некорректные размеры зала', true);
            return;
        }
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
        let newConfig = [];
        for (let r = 0; r < newRows; r++) {
            let row = [];
            for (let c = 0; c < newCols; c++) {
                if (r < oldConfig.length && c < oldConfig[r].length) row.push(oldConfig[r][c]);
                else row.push('standart');
            }
            newConfig.push(row);
        }
        hall.hall_config = newConfig;
        hall.hall_rows = newRows;
        hall.hall_places = newCols;
        renderSchemeEditor(hall);
    }

    async function saveHallConfig() {
        const activeTab = document.querySelector('#hallConfigTabs .hall-tab.active');
        if (!activeTab) return;
        const hallId = activeTab.dataset.hallId;
        const hall = halls.find(h => h.id == hallId);
        if (!hall) return;

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
            showMessage('Ошибка', 'Некорректные размеры зала', true);
            return;
        }

        // Сохраняем выбранные залы в других блоках
        const savedPriceHallId = selectedPriceHallId;
        const savedOpenHallId = selectedOpenHallId;

        try {
            await api.updateHallConfig(hallId, newConfig, newRows, newCols);
            showMessage('Успех', 'Конфигурация сохранена');

            // Обновляем локальные данные о зале
            const updatedHall = { ...hall, hall_config: newConfig, hall_rows: newRows, hall_places: newCols };
            const index = halls.findIndex(h => h.id == hallId);
            if (index !== -1) halls[index] = updatedHall;

            // Перерисовываем только схему и связанные поля (без полной перезагрузки)
            renderSchemeEditor(updatedHall);

            // Восстанавливаем выбранные залы в других блоках
            if (savedPriceHallId) {
                selectedPriceHallId = savedPriceHallId;
                const priceTab = document.querySelector(`#priceHallTabs .hall-tab[data-hall-id="${savedPriceHallId}"]`);
                if (priceTab) {
                    document.querySelectorAll('#priceHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
                    priceTab.classList.add('active');
                    const hallForPrice = halls.find(h => h.id == savedPriceHallId);
                    if (hallForPrice) {
                        document.getElementById('standartPrice').value = hallForPrice.hall_price_standart || 250;
                        document.getElementById('vipPrice').value = hallForPrice.hall_price_vip || 350;
                    }
                }
            }
            if (savedOpenHallId) {
                selectedOpenHallId = savedOpenHallId;
                const openTab = document.querySelector(`#openHallTabs .hall-tab[data-hall-id="${savedOpenHallId}"]`);
                if (openTab) {
                    document.querySelectorAll('#openHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
                    openTab.classList.add('active');
                    updateOpenButtonText();
                }
            }
        } catch (error) {
            showMessage('Ошибка сохранения', error.message, true);
        }
    }

    function syncHallSelection(hallId) {
        // Синхронизация с блоком цен
        const priceTab = document.querySelector(`#priceHallTabs .hall-tab[data-hall-id="${hallId}"]`);
        if (priceTab) {
            document.querySelectorAll('#priceHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
            priceTab.classList.add('active');
            selectedPriceHallId = hallId;
            const hall = halls.find(h => h.id == hallId);
            if (hall) {
                document.getElementById('standartPrice').value = hall.hall_price_standart || 250;
                document.getElementById('vipPrice').value = hall.hall_price_vip || 350;
            }
        }
        // Синхронизация с блоком открытия продаж
        const openTab = document.querySelector(`#openHallTabs .hall-tab[data-hall-id="${hallId}"]`);
        if (openTab) {
            document.querySelectorAll('#openHallTabs .hall-tab').forEach(t => t.classList.remove('active'));
            openTab.classList.add('active');
            selectedOpenHallId = hallId;
            updateOpenButtonText();
        }
    }

    //УПРАВЛЕНИЕ ЗАЛАМИ
    async function deleteHall(hallId) {
        showConfirm(
            'Удалить зал? Это также удалит все связанные сеансы.',
            async () => {
                try {
                    await api.deleteHall(hallId);
                    await loadAdminData();
                } catch (error) {
                    showMessage('Ошибка удаления', error.message, true);
                }
            },
            () => {} // отмена – ничего не делаем
        );
    }

    async function createHall() {
        const name = document.getElementById('hallName').value.trim();
        if (!name) {
            showMessage('Название зала', 'Введите название зала');
            return;
        }
        try {
            await api.addHall(name);
            await loadAdminData();
            const newHall = halls.find(h => h.hall_name === name);
            if (newHall) {
                const defaultRows = 5, defaultCols = 8;
                const defaultConfig = Array(defaultRows).fill().map(() => Array(defaultCols).fill('standart'));
                await api.updateHallConfig(newHall.id, defaultConfig, defaultRows, defaultCols);
                await loadAdminData();
            }
            const modalEl = document.getElementById('addHallModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            document.getElementById('hallName').value = '';
        } catch (error) {
            showMessage('Ошибка при создании зала: ', error.message, true);
        }
    }

    //УПРАВЛЕНИЕ ФИЛЬМАМИ
    async function deleteFilm(filmId) {
        showConfirm(
            'Удалить фильм? Это также удалит все связанные сеансы.',
            async () => {
                try {
                    await api.deleteMovie(filmId);
                    await loadAdminData();
                } catch (error) {
                    showMessage('Ошибка удаления', error.message, true);
                }
            },
            () => {} // отмена – ничего не делаем
        );
    }

    async function createFilm() {
        const name = document.getElementById('filmName').value.trim();
        const duration = parseInt(document.getElementById('filmDuration').value);
        const description = document.getElementById('filmDescription').value.trim();
        const origin = document.getElementById('filmOrigin').value.trim();
        const posterFile = document.getElementById('filmPosterInput').files[0];
        if (!name || !duration) {
            showMessage('Введите данные', 'Заполните обязательные поля');
            return;
        }
        try {
            await api.addMovie(name, duration, description, origin, posterFile);
            await loadAdminData();
            const modalEl = document.getElementById('addFilmModal');
            bootstrap.Modal.getInstance(modalEl).hide();
            document.querySelector('[data-bs-target="#addFilmModal"]').focus();
            document.getElementById('filmName').value = '';
            document.getElementById('filmDuration').value = '';
            document.getElementById('filmDescription').value = '';
            document.getElementById('filmOrigin').value = '';
            document.getElementById('filmPosterInput').value = '';
        } catch (error) {
            showMessage('Ошибка добавления фильма: ', error.message, true);
        }
    }

    //УПРАВЛЕНИЕ СЕАНСАМИ
    async function createSeance() {
        const hallId = document.getElementById('seanceHallSelect').value;
        const filmId = document.getElementById('seanceFilmSelect').value;
        const time = document.getElementById('seanceTime').value;
        if (!hallId || !filmId || !time) {
            showMessage('Введите данные', 'Заполните все поля');
            return;
        }
        const film = films.find(f => f.id == filmId);
        if (!film) {
            showMessage('Упс...', 'Фильм не найден');
            return;
        }
        const [hours, minutes] = time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + film.film_duration;
        if (endMinutes > 1440) {
            showMessage('Предупреждение', 'Сеанс не может заканчиваться позже 23:59');
            return;
        }
        try {
            await api.addSeance(hallId, filmId, time);
            await loadAdminData();
            const modalEl = document.getElementById('addSeanceModal');
            bootstrap.Modal.getInstance(modalEl).hide();
            document.getElementById('seanceTime').value = '';
            document.getElementById('seanceHallSelect').value = '';
            document.getElementById('seanceFilmSelect').value = '';
        } catch (error) {
            showMessage('Ошибка добавления сеанса: ', error.message, true);
        }
    }

// ПУЛ ФИЛЬМОВ (DRAG & DROP)
    function renderFilmsPool() {
        const pool = document.getElementById('films-pool-list');
        if (!pool) return;

        // Очищаем контейнер
        pool.innerHTML = '';

        films.forEach(film => {
            // Генерация цвета, если отсутствует
            if (!film.film_color) {
                const hue = Math.floor(Math.random() * 360);
                film.film_color = `hsl(${hue}, 70%, 70%)`;
            }
            const posterSrc = film.film_poster || 'static/img/default-poster.jpg';
            // Основная карточка фильма
            const filmCard = document.createElement('div');
            filmCard.className = 'film-card';
            filmCard.setAttribute('draggable', 'true');
            filmCard.dataset.filmId = film.id;
            filmCard.style.backgroundColor = film.film_color;
            // Блок постера
            const posterDiv = document.createElement('div');
            posterDiv.className = 'film-card-poster';
            const img = document.createElement('img');
            img.src = posterSrc;
            img.alt = film.film_name;
            posterDiv.appendChild(img);
            // Блок информации
            const infoDiv = document.createElement('div');
            infoDiv.className = 'film-card-info';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'film-card-title';
            titleDiv.textContent = film.film_name;

            const durationDiv = document.createElement('div');
            durationDiv.className = 'film-card-duration';
            durationDiv.textContent = `${film.film_duration} мин`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-film';
            deleteBtn.title = 'Удалить фильм';
            // Обработчик удаления
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filmId = filmCard.dataset.filmId;
                deleteFilm(filmId);
            });

            infoDiv.appendChild(titleDiv);
            infoDiv.appendChild(durationDiv);
            infoDiv.appendChild(deleteBtn);

            filmCard.appendChild(posterDiv);
            filmCard.appendChild(infoDiv);

            // Drag & Drop для фильма
            filmCard.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', film.id);
                e.dataTransfer.effectAllowed = 'copy';
            });

            pool.appendChild(filmCard);
        });
    }



    //ОТРИСОВКА БЛОКА СЕАНСА (резиновый)
    function renderSeanceBlock(slotsContainer, markersContainer, seance, film) {
        const [hours, minutes] = seance.seance_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + film.film_duration;
        if (endMinutes > 1440) return;
        const leftPercent = (startMinutes / 1440) * 100;
        const widthPercent = (film.film_duration / 1440) * 100;

        const block = document.createElement('div');
        block.className = 'seance-block';
        block.style.left = `${leftPercent}%`;
        block.style.width = `${widthPercent}%`;
        block.dataset.seanceId = seance.id;
        block.setAttribute('draggable', 'true');

        // Оборачиваем текст в span
        const textSpan = document.createElement('span');
        textSpan.textContent = film.film_name;
        block.append(textSpan);

        block.style.backgroundColor = film.film_color || 'var(--color-lazurit)';
        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', seance.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        // Создание метки времени (если нужна)
        const marker = document.createElement('div');
        marker.className = 'seance-time-marker';
        marker.style.left = `${leftPercent}%`;
        const tick = document.createElement('div');
        tick.className = 'time-tick';
        const timeSpan = document.createElement('span');
        timeSpan.textContent = seance.seance_time;
        marker.append(tick);
        marker.append(timeSpan);

        slotsContainer.append(block);
        markersContainer.append(marker);
    }

    //ОТРИСОВКА ТАЙМЛАЙНОВ (резиновых)
    function renderTimelines() {
        const timelinesContainer = document.getElementById('halls-timelines');
        if (!timelinesContainer) return;
        timelinesContainer.innerHTML = '';

        const seancesByHall = {};
        seances.forEach(s => {
            if (!seancesByHall[s.seance_hallid]) seancesByHall[s.seance_hallid] = [];
            seancesByHall[s.seance_hallid].push(s);
        });

        halls.forEach(hall => {
            const timelineDiv = document.createElement('div');
            timelineDiv.className = 'hall-timeline';
            timelineDiv.dataset.hallId = hall.id;

            const header = document.createElement('div');
            header.className = 'timeline-header';
            header.textContent = hall.hall_name;

            // Контейнер для блоков сеансов и меток времени
            const slotsWrapper = document.createElement('div');
            slotsWrapper.className = 'timeline-slots-wrapper';

            // Контейнер для блоков фильмов
            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'timeline-slots';
            slotsContainer.dataset.hallId = hall.id;

            // Контейнер для меток времени (под блоками)
            const markersContainer = document.createElement('div');
            markersContainer.className = 'timeline-markers';

            const hallSeances = seancesByHall[hall.id] || [];
            hallSeances.forEach(seance => {
                const film = films.find(f => f.id == seance.seance_filmid);
                if (film) {
                    renderSeanceBlock(slotsContainer, markersContainer, seance, film);
                }
            });

            // Drag & Drop для создания сеанса (на контейнер с блоками)
            slotsContainer.addEventListener('dragover', (e) => e.preventDefault());
            slotsContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                const filmId = e.dataTransfer.getData('text/plain');
                if (!filmId) return;
                const hallId = slotsContainer.dataset.hallId;
                document.getElementById('seanceHallId').value = hallId;
                document.getElementById('seanceFilmId').value = filmId;
                const hallSelect = document.getElementById('seanceHallSelect');
                const filmSelect = document.getElementById('seanceFilmSelect');
                if (hallSelect) hallSelect.value = hallId;
                if (filmSelect) filmSelect.value = filmId;
                new bootstrap.Modal(document.getElementById('addSeanceModal')).show();
            });

            slotsWrapper.append(slotsContainer);
            slotsWrapper.append(markersContainer);
            timelineDiv.append(header);
            timelineDiv.append(slotsWrapper);
            timelinesContainer.append(timelineDiv);
        });
    }

    //КОРЗИНА ДЛЯ УДАЛЕНИЯ СЕАНСОВ
    function initTrashBin() {
        const trash = document.getElementById('trashBin');
        if (!trash) return;
        trash.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        trash.addEventListener('drop', async (e) => {
            e.preventDefault();
            const seanceId = e.dataTransfer.getData('text/plain');
            if (!seanceId) return;
            if (confirm('Удалить этот сеанс?')) {
                try {
                    await api.deleteSeance(seanceId);
                    await loadAdminData();
                } catch (err) {
                    showMessage('Ошибка удаления: ', err.message, true);
                }
            }
        });
    }

    //ОБНОВЛЕНИЕ ЦЕН
    async function updatePrices() {
        if (!selectedPriceHallId) {
            showMessage('', 'Выберите зал');
            return;
        }
        const standart = parseInt(document.getElementById('standartPrice').value);
        const vip = parseInt(document.getElementById('vipPrice').value);
        if (isNaN(standart) || isNaN(vip) || standart < 0 || vip < 0) {
            showMessage('Предупреждение', 'Цены должны быть положительными числами');
            return;
        }
        try {
            await api.updateHallPrice(selectedPriceHallId, standart, vip);
            showMessage('Ура', 'Цены обновлены');
            await loadAdminData();
        } catch (error) {
            showMessage('Ошибка: ', error.message, true);
        }
    }

    //ПЕРЕКЛЮЧЕНИЕ СТАТУСА ЗАЛА
    async function toggleHallStatus() {
        if (!selectedOpenHallId) {
            showMessage('', 'Выберите зал');
            return;
        }
        const hall = halls.find(h => h.id == selectedOpenHallId);
        if (!hall) return;
        const newStatus = hall.hall_open === 1 ? 0 : 1;
        const action = newStatus === 1 ? 'открыть' : 'закрыть';

        showConfirm(
            `Вы уверены, что хотите ${action} продажи в зале "${hall.hall_name}"?`,
            async () => {
                try {
                    await api.toggleHallStatus(selectedOpenHallId, newStatus);
                    await loadAdminData();
                } catch (error) {
                    showMessage('Ошибка изменения статуса', error.message, true);
                }
            },
            () => {}
        );
    }

    function updateOpenButtonText() {
        const button = document.getElementById('toggleHallStatusBtn');
        if (!button) return;
        button.classList.remove('btn-primary', 'btn-danger');
        if (!selectedOpenHallId) {
            button.textContent = 'Открыть продажу билетов';
            button.classList.add('btn-primary');
            return;
        }
        const hall = halls.find(h => h.id == selectedOpenHallId);
        if (hall) {
            if (hall.hall_open === 1) {
                button.textContent = 'Закрыть продажу билетов';
                button.classList.add('btn-danger');
            } else {
                button.textContent = 'Открыть продажу билетов';
                button.classList.add('btn-primary');
            }
        }
    }

    //ПОДПИСКА НА КНОПКИ
    function initEventListeners() {
        document.getElementById('addHallForm')?.addEventListener('submit', (e) => { e.preventDefault(); createHall(); });
        document.getElementById('addFilmForm')?.addEventListener('submit', (e) => { e.preventDefault(); createFilm(); });
        document.getElementById('savePriceBtn')?.addEventListener('click', updatePrices);
        document.getElementById('toggleHallStatusBtn')?.addEventListener('click', toggleHallStatus);
        document.getElementById('addSeanceForm')?.addEventListener('submit', (e) => { e.preventDefault(); createSeance(); });
        document.getElementById('uploadPosterBtn')?.addEventListener('click', () => document.getElementById('filmPosterInput').click());
        document.getElementById('saveHallConfigBtn')?.addEventListener('click', saveHallConfig);
        document.getElementById('rowsCount')?.addEventListener('input', rebuildSchemeFromInputs);
        document.getElementById('colsCount')?.addEventListener('input', rebuildSchemeFromInputs);
        document.getElementById('cancelHallConfigBtn')?.addEventListener('click', () => {
            const activeTab = document.querySelector('#hallConfigTabs .hall-tab.active');
            if (activeTab) loadHallConfig(activeTab.dataset.hallId);
        });
        document.getElementById('cancelPriceBtn')?.addEventListener('click', () => {
            if (selectedPriceHallId) {
                const hall = halls.find(h => h.id == selectedPriceHallId);
                if (hall) {
                    document.getElementById('standartPrice').value = hall.hall_price_standart || 250;
                    document.getElementById('vipPrice').value = hall.hall_price_vip || 350;
                }
            }
        });
        document.getElementById('cancelScheduleBtn')?.addEventListener('click', () => loadAdminData());
        document.querySelectorAll('.admin-block__title').forEach(title => {
            title.addEventListener('click', (e) => {
                const block = e.target.closest('.admin-block');
                block.classList.toggle('collapsed');
                drawStepLines();
            });
        });
        document.getElementById('seanceHallSelect')?.addEventListener('change', () => {
            document.getElementById('seanceHallId').value = document.getElementById('seanceHallSelect').value;
        });
        document.getElementById('seanceFilmSelect')?.addEventListener('change', () => {
            document.getElementById('seanceFilmId').value = document.getElementById('seanceFilmSelect').value;
        });
    }

    //ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    function drawStepLines() {
        const canvas = document.querySelector('.step-lines-canvas');
        if (!canvas) return;
        canvas.innerHTML = '';
        const circles = document.querySelectorAll('.admin-block .step-circle');
        if (circles.length < 2) return;
        const containerRect = canvas.parentElement.getBoundingClientRect();
        const positions = [];
        circles.forEach(circle => {
            const rect = circle.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            positions.push({
                left: centerX - containerRect.left,
                top: rect.top + window.scrollY - (containerRect.top + window.scrollY),
                bottom: rect.bottom + window.scrollY - (containerRect.top + window.scrollY)
            });
        });
        for (let i = 0; i < positions.length - 1; i++) {
            const height = positions[i + 1].top - positions[i].bottom;
            if (height <= 0) continue;
            const line = document.createElement('div');
            line.className = 'step-vertical-line';
            line.style.left = `${positions[i].left}px`;
            line.style.top = `${positions[i].bottom}px`;
            line.style.height = `${height}px`;
            canvas.append(line);
        }
    }

    function populateSeanceModalSelects() {
        const hallSelect = document.getElementById('seanceHallSelect');
        const filmSelect = document.getElementById('seanceFilmSelect');
        if (!hallSelect || !filmSelect) return;

        // Очищаем selects
        hallSelect.innerHTML = '';
        filmSelect.innerHTML = '';

        // Добавляем option "Выберите зал" через DOM
        const defaultHallOption = document.createElement('option');
        defaultHallOption.value = '';
        defaultHallOption.textContent = 'Выберите зал';
         hallSelect.append(defaultHallOption);

        // Добавляем залы
        halls.forEach(hall => {
            const option = document.createElement('option');
            option.value = hall.id;option.textContent = hall.hall_name;
            hallSelect.append(option);
        });

         // Добавляем option "Выберите фильм" через DOM
        const defaultFilmOption = document.createElement('option');
        defaultFilmOption.value = '';
        defaultFilmOption.textContent = 'Выберите фильм';
        filmSelect.append(defaultFilmOption);

        // Добавляем фильмы
        films.forEach(film => {
            const option = document.createElement('option');
            option.value = film.id;
            option.textContent = film.film_name;
            filmSelect.append(option);
        });
    }

    function showMessage(title, message, isError = false) {
        const modal = document.getElementById('notificationModal');
        if (!modal) return;
        const titleEl = document.getElementById('notificationModalTitle');
        const bodyEl = document.getElementById('notificationModalMessage');
        if (titleEl) titleEl.textContent = title || (isError ? 'Ошибка' : 'Уведомление');
        if (bodyEl) bodyEl.textContent = message;
        // Опционально: изменить цвет кнопки или заголовка в зависимости от типа
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    function showConfirm(message, onConfirm, onCancel) {
        const modal = document.getElementById('confirmModal');
        if (!modal) {
            // fallback
            if (confirm(message)) onConfirm();
            else if (onCancel) onCancel();
            return;
        }
        const bodyEl = modal.querySelector('.modal-body');
        if (bodyEl) bodyEl.textContent = message;
        const confirmBtn = modal.querySelector('#confirmOkBtn');
        const cancelBtn = modal.querySelector('#confirmCancelBtn');

        const modalInstance = new bootstrap.Modal(modal);
        const handleConfirm = () => {
            modalInstance.hide();
            onConfirm();
            cleanup();
        };
        const handleCancel = () => {
            modalInstance.hide();
            if (onCancel) onCancel();
            cleanup();
        };
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        modalInstance.show();
    }
});
