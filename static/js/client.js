// Функция форматирования даты в YYYY-MM-DD
function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Функция получения сегодняшней даты
function getTodayDate() {
    return formatDate(new Date());
}

// Рендер календаря на основе переданной даты (любой день недели)
function renderCalendar(centerDate = new Date()) {
    const calendarEl = document.querySelector('.calendar__days');
    if (!calendarEl) return;

    // Находим понедельник текущей недели
    const dayOfWeek = centerDate.getDay(); // 0 - вс, 1 - пн ...
    const monday = new Date(centerDate);
    monday.setDate(centerDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

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
            window.location.href = `index.html?date=${selectedDate}`;
        });
    });
}

// Обработчики стрелок
document.querySelector('.calendar__arrow--prev')?.addEventListener('click', () => {
    // Получаем текущую отображаемую дату (например, из центральной ячейки или из URL)
    const currentDateStr = new URLSearchParams(window.location.search).get('date') || getTodayDate();
    const currentDate = new Date(currentDateStr + 'T12:00:00'); // добавляем время, чтобы избежать сдвига по часовому поясу
    currentDate.setDate(currentDate.getDate() - 7); // минус неделя
    window.location.href = `index.html?date=${formatDate(currentDate)}`;
});

document.querySelector('.calendar__arrow--next')?.addEventListener('click', () => {
    const currentDateStr = new URLSearchParams(window.location.search).get('date') || getTodayDate();
    const currentDate = new Date(currentDateStr + 'T12:00:00');
    currentDate.setDate(currentDate.getDate() + 7); // плюс неделя
    window.location.href = `index.html?date=${formatDate(currentDate)}`;
});

// При загрузке страницы рендерим календарь с учётом параметра date из URL
const urlDate = new URLSearchParams(window.location.search).get('date');
if (urlDate) {
    renderCalendar(new Date(urlDate + 'T12:00:00'));
} else {
    renderCalendar(new Date()); // сегодня
}
