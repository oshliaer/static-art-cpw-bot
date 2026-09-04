/**
 * Класс для работы с API сервиса Yandex ART для генерации изображений.
 * Предоставляет методы для асинхронной генерации изображений и проверки статуса операций.
 */
class YandexART {
  /**
   * Создает экземпляр класса YandexART
   * @param {YandexART.Config} config
   */
  constructor(config) {
    this._model = config.model;
    this._token = config.token;
    this._message = config.message;
  }

  /**
   * Отправляет запрос на асинхронную генерацию изображения
   * @param {number} seed - Зерно для генерации воспроизводимого результата
   * @returns {Object} - Ответ API с идентификатором операции
   * @throws {Error} - Если API вернул ошибку
   */
  imageGenerationAsync(seed) {
    const httpRequest = UrlFetchApp.fetch(
      'https://llm.api.cloud.yandex.net:443/foundationModels/v1/imageGenerationAsync',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this._token}`,
        },
        contentType: 'application/json',
        payload: JSON.stringify({
          model_uri: this._model,
          messages: [
            {
              text: this._message,
              weight: 1,
            },
          ],
          generation_options: {
            mime_type: 'image/jpeg',
            seed,
          },
        }),
      },
    );
    const response = JSON.parse(httpRequest.getContentText());
    if (response.error) {
      throw new Error(`Yandex ART API error: ${response.error.message}`);
    }
    return response;
  }

  /**
   * Получает статус операции по её идентификатору
   * @param {string} id - Идентификатор операции, полученный из метода imageGenerationAsync
   * @returns {Object} - Ответ API со статусом операции и, если готово, сгенерированным изображением
   * @throws {Error} - Если API вернул ошибку
   */
  operations(id) {
    const httpRequest = UrlFetchApp.fetch(`https://llm.api.cloud.yandex.net:443/operations/${id}`, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${this._token}`,
      },
      contentType: 'application/json',
    });
    const response = JSON.parse(httpRequest.getContentText());
    if (response.error) {
      throw new Error(`Yandex ART API error: ${response.error.message}`);
    }
    return response;
  }
}
