//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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

// ГЛАВНАЯ СТРАНИЦА (index.html)

// КАЛЕНДАРЬ
// Состояние календаря
let currentOffset = 0;            // количество дней от today, с которого начинается отображение (0 = сегодня)
let currentSelectedDate = null;

// Инициализация при загрузке
function initCalendar() {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    const dateParam = urlParams.get('date');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    // Определяем смещение по параметру start
    if (startParam) {
        const startDate = new Date(startParam + 'T00:00:00');
        const diffDays = Math.round((startDate - today) / (1000 * 60 * 60 * 24));
        currentOffset = diffDays > 0 ? diffDays : 0;
    } else {
        currentOffset = 0;
    }

    // Выбранная дата
    if (dateParam) {
        currentSelectedDate = new Date(dateParam + 'T00:00:00');
        // Если выбранная дата раньше today, корректируем
        if (currentSelectedDate < today) {
            currentSelectedDate = new Date(today);
        }
    } else {
        currentSelectedDate = new Date(today);
    }

    renderCalendar();
    loadMoviesForDate(formatDate(currentSelectedDate));
    window.addEventListener('popstate', handlePopState);
}

// Генерация массива элементов для отображения (7 элементов)
function getCalendarItems() {
    const items = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    // Левая стрелка (появляется, только если смещение > 0)
    if (currentOffset > 0) {
        items.push({
            type: 'arrow',
            direction: 'prev'
        });
    } else {
        // Первая ячейка - "Сегодня"
        items.push({
            type: 'date',
            date: new Date(today)
        });
    }

    // Добавляем 5 дат
    // Если offset === 0, первая дата уже добавлена, нужно добавить следующие 5 дней (today+1 ... today+5)
    // Если offset > 0, добавляем 5 дней, начиная с today + currentOffset
    let startDate;
    if (currentOffset === 0) {
        startDate = new Date(today);
    } else {
        startDate = new Date(today);
        startDate.setDate(today.getDate() + currentOffset);
    }

    for (let i = 1; i <= 5; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        items.push({
            type: 'date',
            date
        });
    }

    // Правая стрелка (всегда активна, без ограничения вперёд)
    items.push({
        type: 'arrow',
        direction: 'next'
    });

    if (items.length !== 7) {
        console.error('Ошибка: календарь должен содержать 7 элементов');
    }
    return items;
}

// Отрисовка календаря
function renderCalendar() {
    const container = document.querySelector('.calendar__days');
    if (!container) return;

    const items = getCalendarItems();
    const todayStr = formatDate(new Date());
    let html = '';

    items.forEach(item => {
        if (item.type === 'arrow') {
            const arrowSymbol = item.direction === 'prev' ? '<' : '>';
            const isDisabled = isArrowDisabled(item.direction);
            const disabledAttr = isDisabled ? 'disabled' : '';
            html += `
                <div class="calendar__day calendar__day--arrow" data-arrow="${item.direction}" ${disabledAttr}>
                    ${arrowSymbol}
                </div>
            `;
        } else {
            // Дата
            const date = item.date;
            const dateStr = formatDate(date);
            const isToday = (dateStr === todayStr);
            const isSelected = (dateStr === formatDate(currentSelectedDate));
            const dayOfWeek = date.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

            let dayClasses = 'calendar__day';
            if (isSelected) dayClasses += ' calendar__day--selected';
            if (isWeekend) dayClasses += ' calendar__day--weekend';
            if (isToday) dayClasses += ' calendar__day--today';

            const dayName = date.toLocaleDateString('ru-RU', {
                weekday: 'short'
            }).slice(0, 2);
            const dayNumber = date.getDate();

            if (isToday) {
                html += `
                    <div class="${dayClasses}" data-date="${dateStr}">
                        <span class="day-today">Сегодня</span>
                        <span class="day-name">${dayName}</span>
                        <span class="day-number">${dayNumber}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="${dayClasses}" data-date="${dateStr}">
                        <span class="day-name">${dayName}</span>
                        <span class="day-number">${dayNumber}</span>
                    </div>
                `;
            }
        }
    });

    container.innerHTML = html;

    // Обработчики кликов на датах
    document.querySelectorAll('.calendar__day[data-date]').forEach(el => {
        el.addEventListener('click', onDateClick);
    });

    // Обработчики кликов на стрелках (неотключённых)
    document.querySelectorAll('.calendar__day--arrow:not([disabled])').forEach(el => {
        el.addEventListener('click', onArrowClick);
    });
}

// Проверка доступности стрелки
function isArrowDisabled(direction) {
    if (direction === 'prev') {
        // Стрелка назад неактивна, если смещение 0 (тогда её и нет)
        return currentOffset === 0;
    } else {
        // Стрелка вперёд всегда активна (ограничение снято)
        return false;
    }
}

// Обработчик клика на дате
function onDateClick(e) {
    const el = e.currentTarget;
    const dateStr = el.dataset.date;
    currentSelectedDate = new Date(dateStr + 'T00:00:00');
    updateURL();
    renderCalendar();
    loadMoviesForDate(dateStr);
}

// Обработчик клика на стрелке
function onArrowClick(e) {
    const el = e.currentTarget;
    const direction = el.dataset.arrow;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (direction === 'prev') {
        // Сдвиг на 5 дней назад, но не меньше 0
        currentOffset = Math.max(0, currentOffset - 5);
    } else {
        // Сдвиг на 5 дней вперёд (без ограничения)
        currentOffset += 5;
    }

    // Корректируем выбранную дату: если она выпала из нового диапазона, ставим первую дату
    const items = getCalendarItems();
    const dateItems = items.filter(item => item.type === 'date');
    if (dateItems.length > 0) {
        const firstDate = dateItems[0].date;
        const lastDate = dateItems[dateItems.length - 1].date;
        if (currentSelectedDate < firstDate || currentSelectedDate > lastDate) {
            currentSelectedDate = new Date(firstDate);
        }
    }

    updateURL();
    renderCalendar();
    loadMoviesForDate(formatDate(currentSelectedDate));
}

// Обновление URL
function updateURL() {
    const url = new URL(window.location);
    // Вычисляем start как первую дату в текущем отображении
    const items = getCalendarItems();
    const firstDateItem = items.find(item => item.type === 'date');
    const startParam = firstDateItem ? formatDate(firstDateItem.date) : '';
    url.searchParams.set('start', startParam);
    url.searchParams.set('date', formatDate(currentSelectedDate));
    history.pushState({}, '', url);
}

// Обработчик popstate
function handlePopState() {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    const dateParam = urlParams.get('date');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Восстанавливаем смещение
    if (startParam) {
        const startDate = new Date(startParam + 'T00:00:00');
        const diffDays = Math.round((startDate - today) / (1000 * 60 * 60 * 24));
        currentOffset = diffDays > 0 ? diffDays : 0;
    } else {
        currentOffset = 0;
    }

    // Восстанавливаем выбранную дату
    if (dateParam) {
        currentSelectedDate = new Date(dateParam + 'T00:00:00');
        if (currentSelectedDate < today) {
            currentSelectedDate = new Date(today);
        }
    } else {
        currentSelectedDate = new Date(today);
    }

    renderCalendar();
    loadMoviesForDate(formatDate(currentSelectedDate));
}


// ФИЛЬМЫ
// Загрузка фильмов для конкретной даты
async function loadMoviesForDate(dateStr) {
    try {
        const data = await api.getAllData();
        const openHalls = data.halls.filter(h => h.hall_open === 1);
        const openHallIds = openHalls.map(h => h.id);
        const seances = data.seances.filter(s => openHallIds.includes(s.seance_hallid));

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
            // Сортировка сеансов по времени
            for (let hallData of hallsMap.values()) {
                hallData.times.sort((a, b) => a.time.localeCompare(b.time));
            }
            return {
                ...film,
                halls: Array.from(hallsMap.values())
            };
        }).filter(f => f.halls.length > 0);

        renderMovies(films, data, dateStr);
    } catch (e) {
        alert('Ошибка загрузки данных: ' + e.message);
    }
}

// Отрисовка карточек фильмов
function renderMovies(films, allData, currentDate) {
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
                const isPast = checkIfPast(t.time, currentDate);
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

    document.querySelectorAll('.session-time:not(.session-time--past)').forEach(el => {
        el.addEventListener('click', (e) => {
            const seanceId = e.target.dataset.seanceId;
            const date = getParamFromURL('date') || getTodayDate();
            window.location.href = `hall.html?seanceId=${seanceId}&date=${date}`;
        });
    });
}

// Проверка, прошёл ли сеанс
function checkIfPast(time, dateStr) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const seanceDate = new Date(dateStr + 'T' + time + ':00');
    return now > seanceDate;
}

// СТРАНИЦА ВЫБОРА МЕСТ (hall.html)
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
        document.querySelector('.hall-info__time').textContent = 'Начало сеанса: ' + seance.seance_time;
        document.querySelector('.hall-info__hall').textContent = hall.hall_name;

        window.standardPrice = hall.hall_price_standart;
        window.vipPrice = hall.hall_price_vip;

        const standardPriceSpan = document.querySelector('.legend-price-standard');
        const vipPriceSpan = document.querySelector('.legend-price-vip');
        if (standardPriceSpan) standardPriceSpan.textContent = window.standardPrice;
        if (vipPriceSpan) vipPriceSpan.textContent = window.vipPrice;

        renderHallScheme(configMatrix);
        document.querySelector('.btn-booking').addEventListener('click', bookTickets);
    } catch (e) {
        alert('Ошибка загрузки данных: ' + e.message);
    }
}

function renderHallScheme(matrix) {
    const container = document.querySelector('.hall-scheme');
    if (!container) return;
    container.innerHTML = '';

    if (!matrix || matrix.length === 0) return;

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

            rowDiv.append(place);
        });
        container.append(rowDiv);
    });

    const bookBtn = document.querySelector('.btn-booking');
    if (bookBtn) {
        const selected = document.querySelectorAll('.hall-scheme__place--selected');
        bookBtn.disabled = selected.length === 0;
    }
}

function onPlaceClick(e) {
    const place = e.currentTarget;
    if (place.classList.contains('hall-scheme__place--taken') || place.classList.contains('hall-scheme__place--disabled')) return;
    place.classList.toggle('hall-scheme__place--selected');

    const bookBtn = document.querySelector('.btn-booking');
    if (bookBtn) {
        const selected = document.querySelectorAll('.hall-scheme__place--selected');
        bookBtn.disabled = selected.length === 0;
    }
}

async function bookTickets() {
    const seanceId = getParamFromURL('seanceId');
    const date = getParamFromURL('date') || getTodayDate();
    const selectedPlaces = document.querySelectorAll('.hall-scheme__place--selected');
    if (selectedPlaces.length === 0) return;

    try {
        const tickets = Array.from(selectedPlaces).map(place => {
            const isVip = place.classList.contains('hall-scheme__place--vip');
            const price = isVip ? Number(window.vipPrice) : Number(window.standardPrice);
            if (isNaN(price) || price <= 0) {
                throw new Error(`Не удалось определить цену для места ${place.dataset.row} ряд, ${place.dataset.place} место`);
            }
            return {
                row: parseInt(place.dataset.row),
                place: parseInt(place.dataset.place),
                coast: price
            };
        });

        const result = await api.purchaseTicket(seanceId, date, tickets);
        if (!result) throw new Error('Пустой ответ от API');

        let ticketsData;
        if (Array.isArray(result)) {
            ticketsData = result;
        } else if (result.tickets && Array.isArray(result.tickets)) {
            ticketsData = result.tickets;
        } else {
            throw new Error('API не вернуло билеты в ожидаемом формате');
        }

        localStorage.setItem('lastTickets', JSON.stringify(ticketsData));
        window.location.href = 'payment.html';
    } catch (e) {
        alert('Ошибка бронирования: ' + e.message);
    }
}

// СТРАНИЦА ПОДТВЕРЖДЕНИЯ (payment.html)
function initPayment() {
    const ticketsJson = localStorage.getItem('lastTickets');
    if (!ticketsJson || ticketsJson === 'undefined') {
        window.location.href = 'index.html';
        return;
    }

    let tickets;
    try {
        tickets = JSON.parse(ticketsJson);
    } catch (e) {
        window.location.href = 'index.html';
        return;
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
        window.location.href = 'index.html';
        return;
    }

    const ticket = tickets[0];
    const seatsString = tickets.map(t => `${t.ticket_row} ряд, ${t.ticket_place} место`).join('; ');

    document.getElementById('film-name').textContent = ticket.ticket_filmname;
    document.getElementById('selected-seats').textContent = seatsString;
    document.getElementById('hall-name').textContent = ticket.ticket_hallname;
    document.getElementById('start-time').textContent = ticket.ticket_time;
    const total = tickets.reduce((sum, t) => sum + t.ticket_price, 0);
    document.getElementById('total-price').textContent = total + ' рублей';

    document.querySelector('.btn-code').addEventListener('click', () => {
        window.location.href = 'ticket.html';
    });
}

// СТРАНИЦА БИЛЕТА (ticket.html)
function initTicket() {
    const ticketsJson = localStorage.getItem('lastTickets');
    if (!ticketsJson) {
        window.location.href = 'index.html';
        return;
    }

    const tickets = JSON.parse(ticketsJson);
    if (tickets.length === 0) return;

    const ticket = tickets[0];
    const seatsString = tickets.map(t => `${t.ticket_row} ряд, ${t.ticket_place} место`).join('; ');

    document.getElementById('film-name').textContent = ticket.ticket_filmname;
    document.getElementById('selected-seats').textContent = seatsString;
    document.getElementById('hall-name').textContent = ticket.ticket_hallname;
    document.getElementById('start-time').textContent = ticket.ticket_time;

    generateQRCode(tickets);
}

function generateQRCode(tickets) {
    if (!tickets || tickets.length === 0) return;
    const film = tickets[0].ticket_filmname;
    const date = tickets[0].ticket_date;
    const time = tickets[0].ticket_time;
    const hall = tickets[0].ticket_hallname;
    const seatsList = tickets.map(t => `${t.ticket_row} ряд/${t.ticket_place} место`).join(', ');
    const total = tickets.reduce((sum, t) => sum + t.ticket_price, 0);
    const bookingCode = tickets.map(t => t.ticket_qr || t.id).join(', ');

    const qrData = `Билеты: ${film}, ${date} ${time}, Зал ${hall}, Места: ${seatsList}, Сумма: ${total}р. Код бронирования: ${bookingCode}. Билет действителен строго на свой сеанс.`;

    if (typeof QrCreator === 'undefined') {
        console.error('Библиотека QrCreator не загружена');
        return;
    }

    const container = document.querySelector('.qr-placeholder');
    container.innerHTML = '';
    QrCreator.render({
        text: qrData,
        size: 180,
        fill: '#000000',
        background: '#ffffff',
        radius: 0.5,
    }, container);
}

// ЗАПУСК
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.movies-list')) {
        initCalendar();
    } else if (document.querySelector('.hall-scheme')) {
        initHall();
    } else if (document.querySelector('.payment-card')) {
        initPayment();
    } else if (document.querySelector('.ticket-card')) {
        initTicket();
    }
});

//вараинт
