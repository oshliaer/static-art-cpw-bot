class App {
  constructor() {}

  /**
   * @returns {number}
   */
  get lastSeed() {
    return +PropertiesService.getScriptProperties().getProperty('LAST_SEED') || 0;
  }

  /**
   * @param {number} seed
   */
  set lastSeed(seed) {
    PropertiesService.getScriptProperties().setProperty('LAST_SEED', String(seed));
  }
  /**
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
   */
  get book() {
    if (!this._book) {
      const bookId = PropertiesService.getScriptProperties().getProperty('BOOK_ID');
      this._book = SpreadsheetApp.openById(bookId);
    }
    return this._book;
  }

  get dailyArtSheet() {
    if (!this._dailyArtSheet) {
      this._dailyArtSheet = this.book.getSheetByName('Daily ART');
    }
    return this._dailyArtSheet;
  }

  get seedsSheet() {
    if (!this._seedsSheet) {
      this._seedsSheet = this.book.getSheetByName('Seeds');
    }
    return this._seedsSheet;
  }

  get dailyArtCollection() {
    const values = this.dailyArtSheet.getDataRange().getValues();
    return this.toCollection(values);
  }

  get ya() {
    if (!this._ya) {
      const model = PropertiesService.getScriptProperties().getProperty('YANDEXART_MODEL');
      const token = PropertiesService.getScriptProperties().getProperty('YANDEXART_TOKEN');
      const message = PropertiesService.getScriptProperties().getProperty('MESSAGE');
      this._ya = new YandexART({
        model,
        token,
        message,
      });
    }
    return this._ya;
  }

  get telegram() {
    if (!this._telegram) {
      const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
      const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
      this._telegram = new Telegram({ chatId, token });
    }
    return this._telegram;
  }

  get nextSeed() {
    const taken = this.seedsSheet
      .getRange('A:A')
      .getValues()
      .map((row) => row[0]);
    // Generate a random integer between 1 and Number.MAX_SAFE_INTEGER (9007199254740991)
    let seed;
    do {
      seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
    } while (taken.includes(seed));
    return seed;
  }

  /**
   * Converts a 2D array to an array of objects
   * @param {Array<Array>} data - 2D array where the first row contains column names
   * @return {{collection: Object[], headers: string[]}} - Array of objects with keys from the header row
   */
  toCollection(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        collection: [],
        headers: [],
      };
    }

    // Extract headers from the first row
    const headers = data[0].map((header, index) => {
      if (typeof header !== 'string' || header.trim() === '') {
        return `__col_${index}`;
      }
      return header.toLowerCase();
    });

    // Convert remaining rows to objects
    const collection = [];
    for (let __rowIndex = 1; __rowIndex < data.length; __rowIndex++) {
      const row = data[__rowIndex];
      const obj = {};

      headers.forEach((header, __colIndex) => {
        let __value = row[__colIndex];

        obj[header] = {
          __value,
          __colIndex,
          __rowIndex,
        };
      });

      collection.push(obj);
    }

    return {
      collection,
      headers,
    };
  }

  generateDailyART() {
    console.log('Generating daily ART');
    const { collection, headers } = this.dailyArtCollection;
    const now = new Date();
    const date = Utilities.formatDate(now, this.book.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    const dailyItem = collection.find((item) => {
      const _date = item['дата'].__value;
      if (!_date.getTime) {
        return false;
      }
      const formattedDate = Utilities.formatDate(_date, this.book.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
      return formattedDate === date;
    });
    if (!dailyItem) {
      console.log('No daily item found, creating a new one');
      // call new image
      const nextSeed = this.nextSeed;
      const item = {
        дата: {
          __value: now,
        },
        'запрос картинки': {
          __value: '',
        },
        отчет: {
          __value: '',
        },
        зерно: {
          __value: `'${nextSeed}`,
        },
      };
      try {
        const response = this.ya.imageGenerationAsync(nextSeed);
        const { id } = response;
        item['запрос картинки'].__value = id;
      } catch (error) {
        item['запрос картинки'].__value = error.message;
        item.отчет.__value = 'Ошибка генерации изображения';
      }
      const row = headers.map((h) => item[h]?.__value ?? '');
      this.dailyArtSheet.appendRow(row);
      return;
    }
    const report = dailyItem['отчет'].__value;
    const id = dailyItem['запрос картинки'].__value;
    const item = { ...dailyItem };
    if (id !== '' && report === '') {
      console.log(`Checking operation ${id}`);
      const request = this.ya.operations(id);
      if (request.response?.image) {
        const image = request.response.image;
        item['результат запроса картинки'].__value = 'Получено';
        const blob = Utilities.newBlob(Utilities.base64Decode(image), 'image/jpeg', 'image.jpg');
        const tgResp = this.telegram.sendPhoto(blob);
        if (tgResp.ok === true) {
          item['результат отправки картинки'].__value = `https://t.me/static_art_cpw/${tgResp.result.message_id}`;
        } else {
          item['результат отправки картинки'].__value = 'Ошибка отправки картинки';
        }
        item['отчет'].__value = 'Готово';
        this.dailyArtSheet
          .getRange(item.дата.__rowIndex + 1, 1, 1, headers.length)
          .setValues([headers.map((h) => item[h]?.__value ?? '')]);
        console.log(`Daily ART generated successfully for ${id}`);
        return;
      }
      console.log(`Operation ${id} is not ready yet`);
      return;
    }
    console.log(`Nothing to do for ${id}`);
  }
}
