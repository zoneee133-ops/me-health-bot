/**
 * Me — автосбор медицинских документов из почты.
 *
 * Установка (один раз, ~3 минуты):
 *   1. Откройте https://script.google.com  →  «Новый проект».
 *   2. Удалите пример кода, вставьте весь этот файл.
 *   3. В строке KEY ниже вставьте ключ из команды /mail в Telegram-боте Me.
 *   4. Сверху выберите функцию «setup» и нажмите «Выполнить».
 *      Google попросит доступ к Gmail — разрешите (экран «приложение не проверено»
 *      → «Дополнительно» → «Перейти … (небезопасно)» — это ваш собственный скрипт).
 *   5. Готово. Скрипт раз в час проверяет почту и присылает новые вложения в Me.
 *
 * Яндекс.Почта: в настройках Яндекса включите пересылку писем с анализами
 * на ваш адрес Gmail — дальше их подхватит этот же скрипт.
 */

var KEY = 'ВСТАВЬТЕ_КЛЮЧ_ИЗ_БОТА';
var ENDPOINT = 'https://me-webapp.pages.dev/api/inbox-mail';

// Какие письма считать медицинскими. Правьте под свою почту.
var QUERY = 'has:attachment newer_than:3d -label:me-done ('
  + 'subject:(анализ OR анализы OR результат OR результаты OR заключение OR обследование OR приём OR МРТ OR КТ OR УЗИ OR рентген OR рецепт) '
  + 'OR from:(invitro OR helix OR gemotest OR kdl OR citilab OR labquest OR cmd OR hemotest OR dnkom))';

var MAX_BYTES = 3 * 1024 * 1024;
var OK_MIME = { 'application/pdf': 1, 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/heic': 1, 'image/heif': 1 };

function setup() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'collect'; });
  if (!exists) ScriptApp.newTrigger('collect').timeBased().everyHours(1).create();
  collect();
}

function collect() {
  var label = GmailApp.getUserLabelByName('me-done') || GmailApp.createLabel('me-done');

  var threads = GmailApp.search(QUERY, 0, 20);
  for (var i = 0; i < threads.length; i++) {
    var sent = 0;
    var msgs = threads[i].getMessages();
    for (var j = 0; j < msgs.length; j++) {
      var atts = msgs[j].getAttachments({ includeInlineImages: false, includeAttachments: true });
      for (var k = 0; k < atts.length; k++) {
        var a = atts[k];
        var mime = String(a.getContentType() || '').toLowerCase().split(';')[0];
        if (!OK_MIME[mime] || a.getSize() > MAX_BYTES) continue;
        var code = post_({ key: KEY, name: a.getName(), mime: mime, b64: Utilities.base64Encode(a.getBytes()) });
        if (code >= 200 && code < 300) sent++;
      }
    }
    if (sent) threads[i].addLabel(label);
  }

  // коды подтверждения пересылки (Gmail / Яндекс) — пробрасываем в бот
  var conf = GmailApp.search('newer_than:2d -label:me-done subject:(подтверждение OR confirmation OR пересылк OR forwarding)', 0, 5);
  for (var c = 0; c < conf.length; c++) {
    var text = conf[c].getMessages().map(function (m) { return m.getPlainBody(); }).join('\n');
    var m1 = text.match(/(?:код|code)\D{0,25}(\d{5,7})/i) || text.match(/\b(\d{6})\b/);
    if (m1) post_({ key: KEY, confirm: m1[1] });
    conf[c].addLabel(label);
  }
}

function post_(payload) {
  try {
    var r = UrlFetchApp.fetch(ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return r.getResponseCode();
  } catch (e) {
    return 0;
  }
}
