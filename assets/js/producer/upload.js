(function () {
  function appBaseUrl() {
    var path = window.location.pathname;
    var i = path.indexOf('/producer');
    if (i !== -1) {
      var prefix = path.slice(0, i);
      return window.location.origin + (prefix ? prefix + '/' : '/');
    }
    return window.location.origin + '/';
  }

  function consumerUrlForInstructionId(instructionId) {
    return new URL('consumer/?id=' + encodeURIComponent(instructionId), appBaseUrl()).href;
  }

  function showError(msg) {
    var errorDiv = document.getElementById('error');
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    document.getElementById('result').style.display = 'none';
  }

  document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var modelName = document.getElementById('modelName').value;
    var article = document.getElementById('article').value || modelName;
    var pdfFile = document.getElementById('pdfFile').files[0];

    if (!pdfFile) {
      showError('Выберите PDF-файл');
      return;
    }

    var submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = '⏳ Загрузка...';
    submitBtn.disabled = true;

    setTimeout(function () {
      var instructionId = Math.random().toString(36).substring(2, 10);
      var shortUrl = consumerUrlForInstructionId(instructionId);
      var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(shortUrl);

      document.getElementById('shortUrl').textContent = shortUrl;
      document.getElementById('qrContainer').innerHTML = '<img src="' + qrUrl + '" alt="QR-код">';

      document.getElementById('result').style.display = 'block';
      document.getElementById('error').style.display = 'none';

      window.cardData = { modelName: modelName, article: article, shortUrl: shortUrl, instructionId: instructionId };

      submitBtn.textContent = '🚀 Сгенерировать QR и инструкцию';
      submitBtn.disabled = false;
    }, 1500);
  });

  document.getElementById('downloadQr').addEventListener('click', function () {
    var qrImg = document.querySelector('#qrContainer img');
    if (qrImg) {
      var link = document.createElement('a');
      link.href = qrImg.src;
      link.download = 'qr-code.png';
      link.click();
    } else {
      alert('QR-код ещё не сгенерирован');
    }
  });

  document.getElementById('downloadCard').addEventListener('click', function () {
    if (!window.cardData) return;

    var d = window.cardData;
    var cardHtml = '<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<title>Карточка-шпаргалка</title>\n<style>\nbody{font-family:Arial,sans-serif;margin:0;padding:20px;width:105mm;height:148mm;display:flex;flex-direction:column;justify-content:center;}\nh2{font-size:18px;margin:0 0 8px;}\n.qr{text-align:center;margin:16px 0;}\n.qr img{width:80px;height:80px;}\n.info{font-size:12px;margin:8px 0;}\n.bold{font-weight:bold;}\n.phone{font-size:20px;color:#2c3e50;margin:12px 0;}\nhr{margin:12px 0;}\n</style>\n</head>\n<body>\n<h2>ИНСТРУКЦИЯ ПО СБОРКЕ</h2>\n<div><strong>' +
      d.modelName + '</strong> ' + (d.article ? '(' + d.article + ')' : '') + '</div>\n<div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=' +
      encodeURIComponent(d.shortUrl) + '" alt="QR"></div>\n<div class="info">1. Откройте камеру телефона<br>2. Наведите на QR-код</div>\n<hr>\n<div class="bold">НЕ РАБОТАЕТ QR?</div>\n<div class="info">Введите в браузере:<br><span class="bold">' +
      d.shortUrl + '</span></div>\n<hr>\n<div class="bold">НЕТ ИНТЕРНЕТА?</div>\n<div class="phone">📞 8-800-123-45-67</div>\n<div class="info">(Пн-Пт 9-18)</div>\n<hr>\n<div class="bold">НЕ ХВАТАЕТ ДЕТАЛИ?</div>\n<div class="info">Нажмите кнопку внутри инструкции<br>или позвоните по номеру выше</div>\n</body>\n</html>';

    var blob = new Blob([cardHtml], { type: 'text/html' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'card-' + d.modelName.replace(/\s/g, '-') + '.html';
    link.click();
    URL.revokeObjectURL(link.href);

    alert('Карточка сохранена как HTML. Откройте и нажмите Ctrl+P для печати.');
  });
})();
