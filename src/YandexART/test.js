function testImageGenerationAsync() {
  const model = PropertiesService.getScriptProperties().getProperty('YANDEXART_MODEL');
  const token = PropertiesService.getScriptProperties().getProperty('YANDEXART_TOKEN');
  const ya = new YandexART({
    model,
    token,
  });

  const response = ya.imageGenerationAsync(2);
  console.log(response);
}

function testOperations() {
  const model = PropertiesService.getScriptProperties().getProperty('YANDEXART_MODEL');
  const token = PropertiesService.getScriptProperties().getProperty('YANDEXART_TOKEN');
  const ya = new YandexART({
    model,
    token,
  });
  const response = ya.operations('fbvulhcupqalp3285nv7');
  console.log(response);

  if (response?.response?.image) {
    const image = response.response.image;
    const blob = Utilities.newBlob(Utilities.base64Decode(image), 'image/jpeg', 'image.jpg');
    const file = DriveApp.createFile(blob);
    console.log(`File created: ${file.getUrl()}`);
  }
}
