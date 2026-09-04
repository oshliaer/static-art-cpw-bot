/**
 * Класс для работы с API Telegram
 * Предоставляет методы для отправки сообщений, документов, фотографий и удаления сообщений
 */
class Telegram {
  /**
   * Создает экземпляр класса Telegram
   * @param {Object} config Конфигурация
   * @param {string} config.token Токен бота Telegram
   * @param {string} config.chatId ID чата/канала для отправки сообщений
   */
  constructor({ token, chatId }) {
    this._token = token;
    this._chatId = chatId;
  }

  /**
   * Отправляет текстовое сообщение в чат/канал
   * @param {string} message Текст сообщения
   * @param {Object} extra Дополнительные параметры API Telegram
   * @returns {Object} Ответ от API Telegram
   * @throws {Error} Если API вернул ошибку
   */
  sendMessage(message, extra = {}) {
    const text = String(message);
    const url = `https://api.telegram.org/bot${this._token}/sendMessage`;

    const payload = Object.assign({ chat_id: this._chatId, text: text }, extra);

    const httpResponse = UrlFetchApp.fetch(url, {
      method: 'post',
      muteHttpExceptions: true,
      contentType: 'application/json',
      payload: JSON.stringify(payload),
    });
    if (httpResponse.getResponseCode() !== 200) {
      throw new Error(`Error sending message: ${httpResponse.getContentText()}`);
    }
    return JSON.parse(httpResponse.getContentText());
  }

  /**
   * Отправляет документ в чат/канал
   * @param {GoogleAppsScript.Base.Blob} document Документ для отправки
   * @param {Object} extra Дополнительные параметры API Telegram
   * @returns {Object} Ответ от API Telegram
   * @throws {Error} Если API вернул ошибку
   */
  sendDocument(document, extra = {}) {
    const url = `https://api.telegram.org/bot${this._token}/sendDocument`;
    const payload = Object.assign({ chat_id: this._chatId, document }, extra);
    const httpResponse = UrlFetchApp.fetch(url, {
      method: 'post',
      muteHttpExceptions: true,
      payload: payload,
    });
    if (httpResponse.getResponseCode() !== 200) {
      throw new Error(`Error sending message: ${httpResponse.getContentText()}`);
    }
    return JSON.parse(httpResponse.getContentText());
  }

  /**
   * Отправляет фотографию в чат/канал
   * @param {GoogleAppsScript.Base.Blob} photo Изображение для отправки
   * @param {Object} extra Дополнительные параметры API Telegram
   * @returns {Object} Ответ от API Telegram с информацией об отправленном сообщении
   * @throws {Error} Если API вернул ошибку
   */
  sendPhoto(photo, extra = {}) {
    const url = `https://api.telegram.org/bot${this._token}/sendPhoto`;
    const payload = Object.assign({ chat_id: this._chatId, photo }, extra);
    const httpResponse = UrlFetchApp.fetch(url, {
      method: 'post',
      muteHttpExceptions: true,
      payload: payload,
    });
    if (httpResponse.getResponseCode() !== 200) {
      throw new Error(`Error sending message: ${httpResponse.getContentText()}`);
    }
    return JSON.parse(httpResponse.getContentText());
  }
  
  /**
   * Удаляет сообщение из чата/канала по его идентификатору
   * @param {number} messageId Идентификатор сообщения для удаления
   * @returns {Object} Ответ от API Telegram
   * @throws {Error} Если API вернул ошибку
   */
  deleteMessage(messageId) {
    const url = `https://api.telegram.org/bot${this._token}/deleteMessage?chat_id=${this._chatId}&message_id=${messageId}`;
    const httpResponse = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (httpResponse.getResponseCode() !== 200) {
      throw new Error(`Error sending message: ${httpResponse.getContentText()}`);
    }
    return JSON.parse(httpResponse.getContentText());
  }
}
