/**
 * Основной класс приложения для генерации изображений с Yandex ART 
 * и публикации их в Telegram канал
 */
class App {
  /**
   * Получает объект таблицы Google Sheets
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} Объект таблицы
   */
  get book() {
    if (!this._book) {
      const bookId = PropertiesService.getScriptProperties().getProperty('BOOK_ID');
      this._book = SpreadsheetApp.openById(bookId);
    }
    return this._book;
  }

  /**
   * Получает лист "Daily ART" из таблицы
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} Лист таблицы с ежедневными изображениями
   */
  get dailyArtSheet() {
    if (!this._dailyArtSheet) {
      this._dailyArtSheet = this.book.getSheetByName('Daily ART');
    }
    return this._dailyArtSheet;
  }

  /**
   * Получает лист "Seeds" из таблицы
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} Лист таблицы с зернами генерации
   */
  get seedsSheet() {
    if (!this._seedsSheet) {
      this._seedsSheet = this.book.getSheetByName('Seeds');
    }
    return this._seedsSheet;
  }

  /**
   * Получает данные из листа Daily ART в виде коллекции объектов
   * @returns {{collection: Object[], headers: string[]}} Коллекция и заголовки
   */
  get dailyArtCollection() {
    const values = this.dailyArtSheet.getDataRange().getValues();
    return this.toCollection(values);
  }

  /**
   * Создает и возвращает экземпляр класса YandexART
   * @returns {YandexART} Экземпляр YandexART
   */
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

  /**
   * Создает и возвращает экземпляр класса Telegram
   * @returns {Telegram} Экземпляр Telegram
   */
  get telegram() {
    if (!this._telegram) {
      const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
      const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
      this._telegram = new Telegram({ chatId, token });
    }
    return this._telegram;
  }

  /**
   * Генерирует новое уникальное зерно, которое не использовалось ранее
   * @returns {number} Новое уникальное зерно
   */
  get nextSeed() {
    // Зерна хранятся текстом, поэтому сравнивать их с числом напрямую нельзя:
    // строгое равенство внутри includes не совпадет никогда. Приводим к числу,
    // заголовок и пустые ячейки отсеиваются как NaN.
    const taken = this.seedsSheet
      .getRange('A:A')
      .getValues()
      .map((row) => Number(row[0]))
      .filter((value) => Number.isFinite(value) && value > 0);
    // Генерация случайного целого числа между 1 и Number.MAX_SAFE_INTEGER (9007199254740991)
    let seed;
    do {
      seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
    } while (taken.includes(seed));
    return seed;
  }

  /**
   * Преобразует двумерный массив в коллекцию объектов
   * @param {Array<Array>} data - Двумерный массив, где первая строка содержит названия столбцов
   * @return {{collection: Object[], headers: string[]}} - Массив объектов с ключами из заголовка
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

  /**
   * Записывает зерно в ячейку строго текстом
   *
   * Зерно занимает до 16 цифр, а число в Таблицах хранится с точностью
   * до 15 значащих цифр. Стоит зерну попасть в ячейку числом, и последняя
   * цифра теряется: записанное зерно перестает совпадать с отправленным
   * в Yandex ART, а картинку по нему уже не повторить.
   *
   * Защиты две, и нужны обе. Ведущий апостроф говорит Таблицам, что значение
   * текстовое, а текстовый формат ячейки не дает числовому формату колонки
   * перебить апостроф. Апостроф в сохраненное значение не попадает.
   * @param {number} rowIndex Номер строки на листе Daily ART
   * @param {string[]} headers Заголовки листа в нижнем регистре
   * @param {number|string} seed Зерно генерации
   */
  writeSeed(rowIndex, headers, seed) {
    const colIndex = headers.indexOf('зерно');
    if (colIndex === -1) {
      return;
    }
    this.dailyArtSheet
      .getRange(rowIndex, colIndex + 1)
      .setNumberFormat('@')
      .setValue(`'${seed}`);
  }

  /**
   * Главная функция генерации и публикации ежедневного изображения
   * Проверяет наличие записи на текущий день, создает новую при отсутствии,
   * или проверяет статус генерации и публикует результат в Telegram
   */
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
      this.writeSeed(this.dailyArtSheet.getLastRow(), headers, nextSeed);
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
        // setValues переписывает всю строку, включая зерно, поэтому текстовую
        // запись зерна нужно восстановить
        this.writeSeed(item.дата.__rowIndex + 1, headers, item.зерно?.__value ?? '');
        console.log(`Daily ART generated successfully for ${id}`);
        return;
      }
      console.log(`Operation ${id} is not ready yet`);
      return;
    }
    console.log(`Nothing to do for ${id}`);
  }
}
