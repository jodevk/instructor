(function () {
  var cfg = window.INSTRUCTOR || { apiBase: '', endpoints: {} };

  function getQueryId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id') || 'demo';
  }

  function instructionJsonUrl(id) {
    if (cfg.apiBase) {
      return cfg.apiBase.replace(/\/$/, '') + cfg.endpoints.instructions + '/' + encodeURIComponent(id) + '.json';
    }
    return new URL('../data/instructions/' + encodeURIComponent(id) + '.json', window.location.href).href;
  }

  var instructionId = getQueryId();
  var storageKey = 'instructor_completed_' + instructionId;

  var steps = [];
  var meta = { title: '', article: '', supportPhone: '', fallbackUrlHint: '' };
  var postAssembly = null;

  var currentStep = 0;
  var zoomed = false;
  var completedSteps = [];

  function loadProgress() {
    try {
      completedSteps = JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (e) {
      completedSteps = [];
    }
  }

  function saveProgress() {
    localStorage.setItem(storageKey, JSON.stringify(completedSteps));
    updateStats();
  }

  function updateStats() {
    var completedCount = completedSteps.length;
    var total = steps.length;
    var percent = total ? (completedCount / total) * 100 : 0;

    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('totalSteps').textContent = total;
    document.getElementById('progressFill').style.width = percent + '%';

    if (completedCount === total && total > 0) {
      setTimeout(function () {
        if (confirm('🎉 Поздравляем! Вы собрали мебель. Оцените инструкцию?')) {
          alert('Спасибо за обратную связь!');
        }
      }, 500);
    }
  }

  function isStepCompleted(stepIndex) {
    return completedSteps.indexOf(stepIndex) !== -1;
  }

  window.toggleStepComplete = function (stepIndex) {
    if (isStepCompleted(stepIndex)) {
      completedSteps = completedSteps.filter(function (i) { return i !== stepIndex; });
    } else {
      completedSteps.push(stepIndex);
      sendAnalytics(stepIndex, 'step_completed');
    }
    saveProgress();
    renderStep();
  };

  function sendAnalytics(stepIndex, action) {
    console.log('📊 Аналитика:', { instructionId: instructionId, step: stepIndex + 1, action: action });
    if (!cfg.apiBase) return;
    // fetch(cfg.apiBase + cfg.endpoints.analytics, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instructionId, stepIndex, action }) })
  }

  function renderPostAssembly() {
    var el = document.getElementById('postAssembly');
    if (!el || !postAssembly || !postAssembly.items || !postAssembly.items.length) {
      if (el) el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.querySelector('h3').textContent = postAssembly.title || 'После сборки';
    var ul = el.querySelector('ul');
    ul.innerHTML = postAssembly.items.map(function (item) {
      var href = item.href || '#';
      return '<li><a href="' + href + '">' + (item.label || '') + '</a></li>';
    }).join('');
  }

  function renderStep() {
    var container = document.getElementById('stepContainer');
    var step = steps[currentStep];
    if (!step) {
      container.innerHTML = '<p class="step-description">Инструкция не найдена.</p>';
      return;
    }

    var isCompleted = isStepCompleted(currentStep);

    container.innerHTML =
      '<div class="step-card">' +
      '<div class="step-header">' +
      '<div class="step-number">ШАГ ' + (currentStep + 1) + ' ИЗ ' + steps.length + '</div>' +
      '<button type="button" class="step-complete' + (isCompleted ? ' completed' : '') + '" onclick="toggleStepComplete(' + currentStep + ')">' +
      (isCompleted ? '✅ Выполнено' : '☐ Отметить выполненным') +
      '</button></div>' +
      '<div class="step-image" id="stepImage" onclick="toggleZoom()">' +
      '<img src="' + step.image + '" alt="Шаг ' + (currentStep + 1) + '" id="stepImg" loading="lazy">' +
      '<div class="zoom-hint">🔍 Нажмите для увеличения</div></div>' +
      '<div class="step-description">' + step.description + '</div></div>' +
      '<div class="nav-buttons">' +
      '<button type="button" class="nav-btn" onclick="prevStep()" ' + (currentStep === 0 ? 'disabled' : '') + '>◀ Назад</button>' +
      '<button type="button" class="nav-btn" onclick="nextStep()" ' + (currentStep === steps.length - 1 ? 'disabled' : '') + '>Вперед ▶</button>' +
      '</div>' +
      '<button type="button" class="missing-btn" onclick="openModal()">📦 Не хватает детали? Сообщить</button>';
  }

  window.nextStep = function () {
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      sendAnalytics(currentStep, 'step_view');
    }
  };

  window.prevStep = function () {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      sendAnalytics(currentStep, 'step_view');
    }
  };

  window.toggleZoom = function () {
    var img = document.getElementById('stepImg');
    var container = document.getElementById('stepImage');
    if (img) {
      zoomed = !zoomed;
      if (zoomed) {
        img.style.transform = 'scale(1.5)';
        container.style.overflow = 'auto';
      } else {
        img.style.transform = 'scale(1)';
        container.style.overflow = '';
      }
    }
  };

  window.openModal = function () {
    document.getElementById('missingModal').style.display = 'block';
  };

  window.closeModal = function () {
    document.getElementById('missingModal').style.display = 'none';
    document.getElementById('missingForm').reset();
    var preview = document.getElementById('photoPreview');
    preview.style.display = 'none';
    preview.innerHTML = '';
  };

  function applyMeta() {
    document.title = 'Инструкция — ' + meta.title;
    document.getElementById('productTitle').textContent = meta.title;
    document.getElementById('productArticle').textContent = 'Арт. ' + meta.article;
    document.getElementById('footerSupport').innerHTML =
      '<strong>💡 Нет интернета?</strong> Звоните: ' + meta.supportPhone + '<br>' +
      'Или введите в браузере: <strong>' + meta.fallbackUrlHint + '</strong>';
  }

  function init() {
    document.getElementById('stepContainer').innerHTML = '<div class="step-description">Загрузка инструкции...</div>';

    fetch(instructionJsonUrl(instructionId))
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function (data) {
        meta.title = data.title || 'Сборка';
        meta.article = data.article || '—';
        meta.supportPhone = data.supportPhone || '8-800-123-45-67';
        meta.fallbackUrlHint = data.fallbackUrlHint || window.location.host;
        steps = data.steps || [];
        postAssembly = data.postAssembly || null;
        applyMeta();
        renderPostAssembly();
        loadProgress();
        updateStats();
        renderStep();
        sendAnalytics(0, 'page_view');
      })
      .catch(function () {
        document.getElementById('stepContainer').innerHTML =
          '<p class="step-description">Не удалось загрузить инструкцию. Проверьте ссылку или попробуйте <a href="?id=demo">демо</a>.</p>';
      });
  }

  document.getElementById('photo').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function (event) {
        var preview = document.getElementById('photoPreview');
        preview.innerHTML = '<img src="' + event.target.result + '" alt="Фото">';
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('missingForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var currentStepData = {
      step_number: currentStep + 1,
      step_description: steps[currentStep] ? steps[currentStep].description : '',
    };

    var formData = new FormData();
    formData.append('instruction_id', instructionId);
    formData.append('part_name', document.getElementById('partName').value);
    formData.append('comment', document.getElementById('comment').value);
    formData.append('order_number', document.getElementById('orderNumber').value);
    formData.append('current_step', String(currentStepData.step_number));
    var photoFile = document.getElementById('photo').files[0];
    if (photoFile) formData.append('photo', photoFile);

    console.log('📤 Заявка «не хватает» (прототип):', {
      instructionId: instructionId,
      part: document.getElementById('partName').value,
      step: currentStepData.step_number,
    });

    if (cfg.apiBase) {
      // fetch(cfg.apiBase + cfg.endpoints.missingParts, { method: 'POST', body: formData })
    }

    alert('✅ Заявка отправлена! Логист свяжется с вами в ближайшее время.');
    closeModal();
  });

  document.getElementById('resetStats').addEventListener('click', function () {
    if (confirm('Сбросить прогресс сборки? Все отметки о выполненных шагах будут удалены.')) {
      completedSteps = [];
      saveProgress();
      renderStep();
      alert('Прогресс сброшен');
    }
  });

  init();
})();
