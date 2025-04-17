/*

curl -X POST -H "Authorization: Bearer $IAM_TOKEN" -d '{"model_uri":"art://b1gjmhsj4rvtkqtlauvc/yandex-art/latest","messages":[{"text":"Графика. Скетч. Цвета белый, красный #e22d30, почти черный #2a2a2a. Программирование, экология.","weight":1}],"generation_options":{"mime_type":"image/jpeg","seed":2}}' https://llm.api.cloud.yandex.net:443/foundationModels/v1/imageGenerationAsync

*/

class YandexART {
  /**
   *
   * @param {YandexART.Config} config
   */
  constructor(config) {
    this._model = config.model;
    this._token = config.token;
    this._message = config.message
  }

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
