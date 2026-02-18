// static/js/client.js

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getTodayDate() {
    return formatDate(new Date());
}

function getParamFromURL(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ---------- ГЛАВНАЯ СТРАНИЦА (index.html) ----------
async function initIndex() {
    try {
        const data = await api.getAllData();
        // Открытые залы
        const openHalls = data.halls.filter(h => h.hall_open === 1);
        const openHallIds = openHalls.map(h => h.id);

        // Сеансы только в открытых залах
        const seances = data.seances.filter(s => openHallIds.includes(s.seance_hallid));

        // Группируем сеансы по фильмам и залам
        const films = data.films.map(film => {
            const filmSeances = seances.filter(s => s.seance_filmid === film.id);
            const hallsMap = new Map();
            filmSeances.forEach(s => {
                const hall = data.halls.find(h => h.id === s.seance_hallid);
                if (!hall) return;
                if (!hallsMap.has(hall.id)) {
                    hallsMap.set(hall.id, {
                        hallName: hall.hall_name,
                        times: []
                    });
                }
                hallsMap.get(hall.id).times.push({
                    time: s.seance_time,
                    seanceId: s.id
                });
            });
            return {
                ...film,
                halls: Array.from(hallsMap.values())
            };
        }).filter(f => f.halls.length > 0);

        // Рендерим календарь и фильмы
        renderCalendar();
        renderMovies(films, data);
    } catch (e) {
        alert('Ошибка загрузки данных: ' + e.message);
    }
}

// Календарь
function renderCalendar() {
    const calendarEl = document.querySelector('.calendar__days');
    if (!calendarEl) return;

    // Определяем дату из URL или берём сегодня
    const urlDate = getParamFromURL('date');
    const baseDate = urlDate ? new Date(urlDate + 'T12:00:00') : new Date();

    // Находим понедельник текущей недели
    const dayOfWeek = baseDate.getDay(); // 0 - вс, 1 - пн ...
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        days.push(day);
    }

    const todayStr = getTodayDate();
    let html = '';
    days.forEach(day => {
        const dayStr = formatDate(day);
        const isToday = (dayStr === todayStr);
        const dayName = day.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0,2);
        const dayNumber = day.getDate();

        html += `
            <div class="calendar__day ${isToday ? 'calendar__day--today' : ''}" data-date="${dayStr}">
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
                ${isToday ? '<span class="day-today">Сегодня</span>' : ''}
            </div>
        `;
    });
    calendarEl.innerHTML = html;

    // Обработчики кликов на дни
    document.querySelectorAll('.calendar__day').forEach(el => {
        el.addEventListener('click', () => {
            const selectedDate = el.dataset.date;
            // Обновляем URL и перезагружаем страницу (или делаем плавное обновление)
            window.location.href = `index.html?date=${selectedDate}`;
        });
    });
}

// Стрелки календаря (переключение недели с перезагрузкой)
function initCalendarArrows() {
    const prevBtn = document.querySelector('.calendar__arrow--prev');
    const nextBtn = document.querySelector('.calendar__arrow--next');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const currentDateStr = getParamFromURL('date') || getTodayDate();
            const currentDate = new Date(currentDateStr + 'T12:00:00');
            currentDate.setDate(currentDate.getDate() - 7);
            window.location.href = `index.html?date=${formatDate(currentDate)}`;
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const currentDateStr = getParamFromURL('date') || getTodayDate();
            const currentDate = new Date(currentDateStr + 'T12:00:00');
            currentDate.setDate(currentDate.getDate() + 7);
            window.location.href = `index.html?date=${formatDate(currentDate)}`;
        });
    }
}

// Отрисовка карточек фильмов
function renderMovies(films, allData) {
    const container = document.querySelector('.movies-list');
    if (!container) return;

    let html = '';
    films.forEach(film => {
        const poster = film.film_poster || 'static/img/default-poster.jpg';
        const description = film.film_description || 'Описание отсутствует';
        const origin = film.film_origin || 'Неизвестно';
        const duration = film.film_duration || 0;

        let hallsHtml = '';
        film.halls.forEach(hall => {
            let timesHtml = hall.times.map(t => {
                // Проверка, прошёл ли сеанс (упрощённо: сравниваем только время, если дата сегодня)
                const isPast = checkIfPast(t.time); // можно доработать с учётом даты
                return `<span class="session-time ${isPast ? 'session-time--past' : ''}" data-seance-id="${t.seanceId}">${t.time}</span>`;
            }).join('');
            hallsHtml += `
                <div class="movie-card__hall">
                    <span class="hall-name">${hall.hallName}:</span>
                    <div class="session-times">
                        ${timesHtml}
                    </div>
                </div>
            `;
        });

        html += `
            <article class="movie-card bg-beige-transparent">
                <div class="movie-card__left">
                    <img class="movie-card__poster" src="${poster}" alt="${film.film_name}">
                    <div class="movie-card__halls">
                        ${hallsHtml}
                    </div>
                </div>
                <div class="movie-card__right">
                    <h2 class="movie-card__title">${film.film_name}</h2>
                    <p class="movie-card__description">${description}</p>
                    <p class="movie-card__duration">${duration} мин, ${origin}</p>
                </div>
            </article>
        `;
    });
    container.innerHTML = html;

    // Обработчики на сеансы
    document.querySelectorAll('.session-time:not(.session-time--past)').forEach(el => {
        el.addEventListener('click', (e) => {
            const seanceId = e.target.dataset.seanceId;
            const date = getParamFromURL('date') || getTodayDate();
            window.location.href = `hall.html?seanceId=${seanceId}&date=${date}`;
        });
    });
}

// Простейшая проверка, прошёл ли сеанс (только по времени, без учёта даты)
function checkIfPast(time) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const seanceTime = new Date(now);
    seanceTime.setHours(hours, minutes, 0, 0);
    return now > seanceTime;
}

// ---------- СТРАНИЦА ВЫБОРА МЕСТ (hall.html) ----------
async function initHall() {
    const seanceId = getParamFromURL('seanceId');
    const date = getParamFromURL('date') || getTodayDate();
    if (!seanceId) {
        alert('Не указан сеанс');
        window.location.href = 'index.html';
        return;
    }

    try {
        const configMatrix = await api.getHallConfig(seanceId, date);
        const allData = await api.getAllData();
        const seance = allData.seances.find(s => s.id == seanceId);
        if (!seance) throw new Error('Сеанс не найден');
        const film = allData.films.find(f => f.id === seance.seance_filmid);
        const hall = allData.halls.find(h => h.id === seance.seance_hallid);

        document.querySelector('.hall-info__title').textContent = film.film_name;
        document.querySelector('.hall-info__time').textContent = seance.seance_time;
        document.querySelector('.hall-info__hall').textContent = hall.hall_name;

        // Сохраняем цены в глобальные переменные (доступны в других функциях)
        window.standardPrice = hall.hall_price_standart;
        window.vipPrice = hall.hall_price_vip;

        renderHallScheme(configMatrix);

        document.querySelector('.btn-booking').addEventListener('click', bookTickets);
    } catch (e) {
        alert('Ошибка загрузки данных: ' + e.message);
    }
}

function renderHallScheme(matrix) {
    const container = document.querySelector('.hall-scheme');
    container.innerHTML = '';

    matrix.forEach((rowPlaces, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'hall-scheme__row';

        rowPlaces.forEach((placeType, colIndex) => {
            const place = document.createElement('div');
            place.className = `hall-scheme__place hall-scheme__place--${placeType}`;
            place.dataset.row = rowIndex + 1;
            place.dataset.place = colIndex + 1;
            place.dataset.type = placeType;

            if (placeType === 'standart' || placeType === 'vip') {
                place.addEventListener('click', onPlaceClick);
            }

            rowDiv.appendChild(place);
        });
        container.appendChild(rowDiv);
    });

    // Сброс стоимости и кнопки
    updateTotalPrice();
}

function onPlaceClick(e) {
    const place = e.currentTarget;
    if (place.classList.contains('hall-scheme__place--taken') || place.classList.contains('hall-scheme__place--disabled')) return;
    place.classList.toggle('hall-scheme__place--selected');
    updateTotalPrice();
}

function updateTotalPrice() {
    const selected = document.querySelectorAll('.hall-scheme__place--selected');
    let total = 0;
    selected.forEach(place => {
        if (place.classList.contains('hall-scheme__place--vip')) {
            total += window.vipPrice;
        } else {
            total += window.standardPrice;
        }
    });
    const totalEl = document.getElementById('total-price');
    if (totalEl) totalEl.textContent = total;

    const bookBtn = document.querySelector('.btn-booking');
    if (selected.length > 0) {
        bookBtn.removeAttribute('disabled');
    } else {
        bookBtn.setAttribute('disabled', 'disabled');
    }
}

async function bookTickets() {
    const seanceId = getParamFromURL('seanceId');
    const date = getParamFromURL('date') || getTodayDate();
    const selectedPlaces = document.querySelectorAll('.hall-scheme__place--selected');
    if (selectedPlaces.length === 0) return;

    const tickets = Array.from(selectedPlaces).map(place => ({
        row: parseInt(place.dataset.row),
        place: parseInt(place.dataset.place),
        coast: place.classList.contains('hall-scheme__place--vip') ? window.vipPrice : window.standardPrice
    }));

    try {
        const result = await api.purchaseTicket(seanceId, date, tickets);
        localStorage.setItem('lastTickets', JSON.stringify(result.tickets));
        window.location.href = 'payment.html';
    } catch (e) {
        alert('Ошибка бронирования: ' + e.message);
    }
}

// ---------- СТРАНИЦА ПОДТВЕРЖДЕНИЯ (payment.html) ----------
function initPayment() {
    const ticketsJson = localStorage.getItem('lastTickets');
    if (!ticketsJson) {
        window.location.href = 'index.html';
        return;
    }

    const tickets = JSON.parse(ticketsJson);
    if (tickets.length === 0) return;

    // Берём первый билет для отображения (если несколько, можно суммировать)
    const ticket = tickets[0];
    document.getElementById('film-name').textContent = ticket.ticket_filmname;
    document.getElementById('selected-seats').textContent = `${ticket.ticket_row} ряд, ${ticket.ticket_place} место`;
    document.getElementById('hall-name').textContent = ticket.ticket_hallname;
    document.getElementById('start-time').textContent = ticket.ticket_time;
    const total = tickets.reduce((sum, t) => sum + t.ticket_price, 0);
    document.getElementById('total-price').textContent = total + ' ₽';

    document.querySelector('.btn-code').addEventListener('click', () => {
        window.location.href = 'ticket.html';
    });
}

// ---------- СТРАНИЦА БИЛЕТА (ticket.html) ----------
function initTicket() {
    const ticketsJson = localStorage.getItem('lastTickets');
    if (!ticketsJson) {
        window.location.href = 'index.html';
        return;
    }

    const tickets = JSON.parse(ticketsJson);
    if (tickets.length === 0) return;

    const ticket = tickets[0];
    document.getElementById('film-name').textContent = ticket.ticket_filmname;
    document.getElementById('selected-seats').textContent = `${ticket.ticket_row} ряд, ${ticket.ticket_place} место`;
    document.getElementById('hall-name').textContent = ticket.ticket_hallname;
    document.getElementById('start-time').textContent = ticket.ticket_time;

    generateQRCode(ticket);
}

function generateQRCode(ticket) {
    const qrData = `Билет: ${ticket.ticket_filmname}, ${ticket.ticket_date} ${ticket.ticket_time}, Зал ${ticket.ticket_hallname}, Ряд ${ticket.ticket_row}, Место ${ticket.ticket_place}, Цена ${ticket.ticket_price}р. Билет действителен строго на свой сеанс.`;

    if (typeof QRCreator === 'undefined') {
        console.error('Библиотека QRCreator не загружена');
        return;
    }

    const qr = QRCreator(qrData, { image: 'SVG' });
    const container = document.querySelector('.qr-placeholder');
    container.innerHTML = '';
    container.appendChild(qr.result);
}

// ---------- ЗАПУСК В ЗАВИСИМОСТИ ОТ СТРАНИЦЫ ----------
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.movies-list')) {
        initIndex();
        initCalendarArrows();
    } else if (document.querySelector('.hall-scheme')) {
        initHall();
    } else if (document.querySelector('.payment-card')) {
        initPayment();
    } else if (document.querySelector('.ticket-card')) {
        initTicket();
    }
});
