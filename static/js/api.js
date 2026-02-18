// static/js/api.js

class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    /**
     * Универсальный метод для выполнения запросов к API.
     * @param {string} endpoint - относительный путь (например, '/alldata')
     * @param {string} method - HTTP метод ('GET', 'POST', 'DELETE')
     * @param {FormData|Object} body - тело запроса (для POST)
     * @returns {Promise<Object>} - поле result из ответа сервера
     */
    async request(endpoint, method = 'GET', body = null) {
        const url = this.baseURL + endpoint;
        const options = { method };

        if (body) {
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.body = JSON.stringify(body);
                options.headers = { 'Content-Type': 'application/json' };
            }
        }

        const response = await fetch(url, options);
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Ошибка запроса');
        }
        return data.result;
    }

    // ----- Административные методы -----

    /**
     * Авторизация администратора.
     * @param {string} login - логин (shfe-diplom@netology.ru)
     * @param {string} password - пароль (shfe-diplom)
     * @returns {Promise<Object>}
     */
    login(login, password) {
        const formData = new FormData();
        formData.append('login', login);
        formData.append('password', password);
        return this.request('/login', 'POST', formData);
    }

    /**
     * Получение всех данных (залы, фильмы, сеансы).
     * @returns {Promise<Object>} - объект с полями halls, films, seances
     */
    getAllData() {
        return this.request('/alldata');
    }

    /**
     * Добавление нового зала.
     * @param {string} hallName - название зала
     * @returns {Promise<Object>} - обновлённый список залов
     */
    addHall(hallName) {
        const formData = new FormData();
        formData.append('hallName', hallName);
        return this.request('/hall', 'POST', formData);
    }

    /**
     * Удаление зала по ID.
     * @param {number|string} hallId
     * @returns {Promise<Object>} - обновлённые списки залов и сеансов
     */
    deleteHall(hallId) {
        return this.request(`/hall/${hallId}`, 'DELETE');
    }

    /**
     * Изменение конфигурации мест в зале.
     * @param {number|string} hallId
     * @param {Array<Array<string>>} config - двумерный массив типов мест
     * @returns {Promise<Object>} - информация о зале
     */
    updateHallConfig(hallId, config) {
        const formData = new FormData();
        formData.append('config', JSON.stringify(config));
        return this.request(`/hall/${hallId}/config`, 'POST', formData);
    }

    /**
     * Изменение стоимости билетов в зале.
     * @param {number|string} hallId
     * @param {number} priceStandart - цена обычного билета
     * @param {number} priceVip - цена VIP билета
     * @returns {Promise<Object>} - информация о зале
     */
    updateHallPrice(hallId, priceStandart, priceVip) {
        const formData = new FormData();
        formData.append('priceStandart', priceStandart);
        formData.append('priceVip', priceVip);
        return this.request(`/price/${hallId}`, 'POST', formData);
    }

    /**
     * Открыть или закрыть продажи в зале.
     * @param {number|string} hallId
     * @param {number} hallOpen - 1 (открыто) или 0 (закрыто)
     * @returns {Promise<Object>} - информация о зале
     */
    toggleHallStatus(hallId, hallOpen) {
        const formData = new FormData();
        formData.append('hallOpen', hallOpen);
        return this.request(`/open/${hallId}`, 'POST', formData);
    }

    /**
     * Добавление нового фильма.
     * @param {string} filmName - название
     * @param {number} filmDuration - длительность в минутах
     * @param {string} filmDescription - описание
     * @param {string} filmOrigin - страна
     * @param {File} filePoster - файл постера (png, до 3 Мб)
     * @returns {Promise<Object>} - обновлённый список фильмов
     */
    addMovie(filmName, filmDuration, filmDescription, filmOrigin, filePoster) {
        const formData = new FormData();
        formData.append('filmName', filmName);
        formData.append('filmDuration', filmDuration);
        formData.append('filmDescription', filmDescription);
        formData.append('filmOrigin', filmOrigin);
        if (filePoster) {
            formData.append('filePoster', filePoster);
        }
        return this.request('/film', 'POST', formData);
    }

    /**
     * Удаление фильма по ID.
     * @param {number|string} filmId
     * @returns {Promise<Object>} - обновлённые списки фильмов и сеансов
     */
    deleteMovie(filmId) {
        return this.request(`/film/${filmId}`, 'DELETE');
    }

    /**
     * Добавление нового сеанса.
     * @param {number|string} seanceHallid - ID зала
     * @param {number|string} seanceFilmid - ID фильма
     * @param {string} seanceTime - время в формате "HH:MM"
     * @returns {Promise<Object>} - обновлённый список сеансов
     */
    addSeance(seanceHallid, seanceFilmid, seanceTime) {
        const formData = new FormData();
        formData.append('seanceHallid', seanceHallid);
        formData.append('seanceFilmid', seanceFilmid);
        formData.append('seanceTime', seanceTime);
        return this.request('/seance', 'POST', formData);
    }

    /**
     * Удаление сеанса по ID.
     * @param {number|string} seanceId
     * @returns {Promise<Object>} - обновлённый список сеансов
     */
    deleteSeance(seanceId) {
        return this.request(`/seance/${seanceId}`, 'DELETE');
    }

    // ----- Гостевые методы -----

    /**
     * Получение схемы зала на конкретный сеанс и дату.
     * @param {number|string} seanceId - ID сеанса
     * @param {string} date - дата в формате YYYY-MM-DD
     * @returns {Promise<Array<Array<string>>>} - двумерный массив типов мест
     */
    getHallConfig(seanceId, date) {
        return this.request(`/hallconfig?seanceId=${seanceId}&date=${date}`);
    }

    /**
     * Покупка билетов.
     * @param {number|string} seanceId - ID сеанса
     * @param {string} ticketDate - дата сеанса YYYY-MM-DD
     * @param {Array<{row: number, place: number, coast: number}>} tickets - массив билетов
     * @returns {Promise<{tickets: Array}>} - массив купленных билетов с деталями
     */
    purchaseTicket(seanceId, ticketDate, tickets) {
        const formData = new FormData();
        formData.append('seanceId', seanceId);
        formData.append('ticketDate', ticketDate);
        formData.append('tickets', JSON.stringify(tickets));
        return this.request('/ticket', 'POST', formData);
    }
}

// Создаём глобальный экземпляр, доступный во всех скриптах
const api = new ApiClient('https://shfe-diplom.neto-server.ru');
