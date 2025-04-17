class Telegram {
  constructor({ token, chatId }) {
    this._token = token;
    this._chatId = chatId;
    console.log(`Telegram initialized with token: ${token} and chatId: ${chatId}`);
  }

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
   *
   * @param {number} messageId
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
