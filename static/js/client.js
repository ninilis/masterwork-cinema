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

        // Текущая выбранная дата (из URL или сегодня)
        const currentDate = getParamFromURL('date') || getTodayDate();

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

        // Рендерим календарь и фильмы, передавая текущую дату
        renderCalendar(currentDate);
        renderMovies(films, data, currentDate);
    } catch (e) {
        alert('Ошибка загрузки данных: ' + e.message);
    }
}

// Календарь
function renderCalendar(selectedDateStr) {
    const calendarEl = document.querySelector('.calendar__days');
    if (!calendarEl) return;

    const baseDate = new Date(selectedDateStr + 'T12:00:00');
    const dayOfWeek = baseDate.getDay();
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
        const isSelected = (dayStr === selectedDateStr);

        let dayClasses = 'calendar__day';
        if (isSelected) dayClasses += ' calendar__day--selected';

        const dayName = day.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0,2);
        const dayNumber = day.getDate();

        html += `
            <div class="${dayClasses}" data-date="${dayStr}">
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
                ${isToday ? '<span class="day-today">Сегодня</span>' : ''}
            </div>
        `;
    });
    calendarEl.innerHTML = html;

    document.querySelectorAll('.calendar__day').forEach(el => {
        el.addEventListener('click', () => {
            const selectedDate = el.dataset.date;
            window.location.href = `index.html?date=${selectedDate}`;
        });
    });
}


// Стрелки календаря (переключение недели с перезагрузкой)
function initCalendarArrows() {
    const prevBtn = document.querySelector('.calendar__arrow--prev');
    const nextBtn = document.querySelector('.calendar__arrow--next');

    if (!prevBtn || !nextBtn) return;

    // Функция обновления состояния стрелок
    function updateArrows(currentDateStr) {
        const currentDate = new Date(currentDateStr + 'T12:00:00');
        const today = new Date();
        today.setHours(12, 0, 0, 0); // нормализуем

        // Получаем понедельник недели для currentDate
        const dayOfWeek = currentDate.getDay();
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        // Получаем понедельник текущей недели
        const todayDayOfWeek = today.getDay();
        const currentMonday = new Date(today);
        currentMonday.setDate(today.getDate() - (todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1));

        // Если отображаемая неделя совпадает с текущей, левая стрелка неактивна
        if (formatDate(monday) === formatDate(currentMonday)) {
            prevBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
        }
    }

    // Получаем текущую дату из URL или сегодня
    const currentDateStr = getParamFromURL('date') || getTodayDate();
    updateArrows(currentDateStr);

    prevBtn.addEventListener('click', () => {
        const currentDateStr = getParamFromURL('date') || getTodayDate();
        const currentDate = new Date(currentDateStr + 'T12:00:00');
        currentDate.setDate(currentDate.getDate() - 7);
        const newDate = formatDate(currentDate);
        window.location.href = `index.html?date=${newDate}`;
    });

    nextBtn.addEventListener('click', () => {
        const currentDateStr = getParamFromURL('date') || getTodayDate();
        const currentDate = new Date(currentDateStr + 'T12:00:00');
        currentDate.setDate(currentDate.getDate() + 7);
        const newDate = formatDate(currentDate);
        window.location.href = `index.html?date=${newDate}`;
    });
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

// Проверка, прошёл ли сеанс (с учётом даты и времени)
function checkIfPast(time, dateStr) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const seanceDate = new Date(dateStr + 'T' + time + ':00');
    return now > seanceDate;
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
        document.querySelector('.hall-info__time').textContent = 'Время сеанса: ' + seance.seance_time;
        document.querySelector('.hall-info__hall').textContent = hall.hall_name;

        window.standardPrice = hall.hall_price_standart;
        window.vipPrice = hall.hall_price_vip;

        // Обновляем цены в легенде
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
    console.log('renderHallScheme called, matrix type:', typeof matrix, 'length:', matrix ? matrix.length : 'null');
    const container = document.querySelector('.hall-scheme');
    console.log('container:', container);
    if (!container) {
        console.error('Контейнер .hall-scheme не найден');
        return;
    }
    container.innerHTML = '';

    if (!matrix || matrix.length === 0) {
        console.warn('Матрица пуста, схема не отрисована');
        return;
    }

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

    console.log('Схема отрисована, рядов:', container.children.length);
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
    if (totalEl) {
        totalEl.textContent = total;
    } else {
        console.warn('Элемент #total-price не найден');
    }

    const bookBtn = document.querySelector('.btn-booking');
    if (bookBtn) {
        if (selected.length > 0) {
            bookBtn.removeAttribute('disabled');
        } else {
            bookBtn.setAttribute('disabled', 'disabled');
        }
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

    console.log('Отправляемые билеты:', tickets);

    try {
        const result = await api.purchaseTicket(seanceId, date, tickets);
        console.log('Полный ответ API при покупке:', result);

        if (!result) {
            throw new Error('Пустой ответ от API');
        }

        // Извлекаем массив билетов из ответа (поддерживаем разные форматы)
        let ticketsData;
        if (Array.isArray(result)) {
            ticketsData = result; // если API возвращает массив напрямую
        } else if (result.tickets && Array.isArray(result.tickets)) {
            ticketsData = result.tickets; // если возвращает объект с полем tickets
        } else {
            console.error('Неизвестный формат ответа:', result);
            throw new Error('API не вернуло билеты в ожидаемом формате');
        }

        localStorage.setItem('lastTickets', JSON.stringify(ticketsData));
        console.log('Билеты сохранены, переход на payment.html');
        window.location.href = 'payment.html';
    } catch (e) {
        alert('Ошибка бронирования: ' + e.message);
        console.error(e);
    }
}

// ---------- СТРАНИЦА ПОДТВЕРЖДЕНИЯ (payment.html) ----------
function initPayment() {
    const ticketsJson = localStorage.getItem('lastTickets');
    console.log('Сырые данные из localStorage:', ticketsJson);

    if (!ticketsJson || ticketsJson === 'undefined') {
        window.location.href = 'index.html';
        return;
    }

    let tickets;
    try {
        tickets = JSON.parse(ticketsJson);
    } catch (e) {
        console.error('Ошибка парсинга билетов', e);
        window.location.href = 'index.html';
        return;
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
        window.location.href = 'index.html';
        return;
    }

    const ticket = tickets[0]; // для общей информации (фильм, зал, время – они одинаковы)

    // Формируем строку со всеми местами
    const seatsString = tickets.map(t => `${t.ticket_row} ряд, ${t.ticket_place} место`).join('; ');

    document.getElementById('film-name').textContent = ticket.ticket_filmname;
    document.getElementById('selected-seats').textContent = seatsString;
    document.getElementById('hall-name').textContent = ticket.ticket_hallname;
    document.getElementById('start-time').textContent = ticket.ticket_time;
    const total = tickets.reduce((sum, t) => sum + t.ticket_price, 0);
    document.getElementById('total-price').textContent = total + ' рублей';

    const btn = document.querySelector('.btn-code');
    if (btn) {
        btn.addEventListener('click', () => {
            window.location.href = 'ticket.html';
        });
    }
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
    const seatsString = tickets.map(t => `${t.ticket_row} ряд, ${t.ticket_place} место`).join('; ');

    document.getElementById('film-name').textContent = ticket.ticket_filmname;
    document.getElementById('selected-seats').textContent = seatsString;
    document.getElementById('hall-name').textContent = ticket.ticket_hallname;
    document.getElementById('start-time').textContent = ticket.ticket_time;

    generateQRCode(tickets); // передаём все билеты
}

function generateQRCode(tickets) {
    if (!tickets || tickets.length === 0) return;

    // Базовые данные
    const film = tickets[0].ticket_filmname;
    const date = tickets[0].ticket_date;
    const time = tickets[0].ticket_time;
    const hall = tickets[0].ticket_hallname;

    // Все места
    const seatsList = tickets.map(t => `${t.ticket_row} ряд/${t.ticket_place} место`).join(', ');
    const total = tickets.reduce((sum, t) => sum + t.ticket_price, 0);

    const qrData = `Билеты: ${film}, ${date} ${time}, Зал ${hall}, Места: ${seatsList}, Сумма: ${total}р. Билет действителен строго на свой сеанс.`;

    if (typeof QrCreator === 'undefined') {
        console.error('Библиотека QrCreator не загружена');
        return;
    }

    const container = document.querySelector('.qr-placeholder');
    container.innerHTML = ''; // очищаем

    QrCreator.render({
        text: qrData,
        size: 200, // размер QR-кода
        fill: '#000000',
        background: '#ffffff',
        radius: 0.5, // скругление модулей
    }, container);
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
