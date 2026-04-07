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

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function touchDistance(a, b) {
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  var instructionId = getQueryId();
  var storageKey = 'instructor_completed_' + instructionId;
  var reviewStorageKey = 'instructor_review_' + instructionId;

  var steps = [];
  var meta = { title: '', article: '', supportPhone: '', fallbackUrlHint: '' };
  var postAssembly = null;
  var shopCta = null;

  var currentStep = 0;
  var zoomScale = 1;
  var zoomHandlersBound = false;
  var pinchState = null;

  var completedSteps = [];

  var lbScale = 1;
  var lbPinch = null;
  var lbDrag = null;

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

  function hasReviewSubmitted() {
    try {
      return !!localStorage.getItem(reviewStorageKey);
    } catch (e) {
      return false;
    }
  }

  function clampZoom(s) {
    return Math.min(3, Math.max(1, Math.round(s * 100) / 100));
  }

  function applyInlineZoom() {
    var img = document.getElementById('stepImg');
    var label = document.getElementById('zoomPctLabel');
    if (!img) return;
    zoomScale = clampZoom(zoomScale);
    img.style.transform = 'none';
    img.style.width = zoomScale * 100 + '%';
    img.style.maxWidth = 'none';
    img.style.height = 'auto';
    if (label) label.textContent = Math.round(zoomScale * 100) + '%';
  }

  function resetInlineZoom() {
    zoomScale = 1;
    applyInlineZoom();
    var vp = document.getElementById('stepImageViewport');
    if (vp) {
      vp.scrollLeft = 0;
      vp.scrollTop = 0;
    }
  }

  function applyLbZoom() {
    var img = document.getElementById('zoomLightboxImg');
    var label = document.getElementById('lbZoomPct');
    var vp = document.getElementById('zoomLightboxViewport');
    if (!img || !vp) return;
    lbScale = clampZoom(lbScale);
    img.style.width = lbScale * 100 + '%';
    img.style.maxWidth = 'none';
    img.style.height = 'auto';
    if (label) label.textContent = Math.round(lbScale * 100) + '%';
  }

  function openZoomLightbox() {
    var srcEl = document.getElementById('stepImg');
    var box = document.getElementById('zoomLightbox');
    var img = document.getElementById('zoomLightboxImg');
    if (!srcEl || !box || !img) return;
    img.src = srcEl.currentSrc || srcEl.src;
    img.alt = srcEl.alt || '';
    lbScale = zoomScale;
    var vp = document.getElementById('zoomLightboxViewport');
    if (vp) {
      vp.scrollLeft = 0;
      vp.scrollTop = 0;
    }
    applyLbZoom();
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeZoomLightbox() {
    var box = document.getElementById('zoomLightbox');
    if (!box) return;
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbPinch = null;
    lbDrag = null;
  }

  function bindZoomUI() {
    var vp = document.getElementById('stepImageViewport');
    if (!vp || zoomHandlersBound) return;
    zoomHandlersBound = true;

    vp.addEventListener(
      'wheel',
      function (e) {
        e.preventDefault();
        var step = e.deltaY > 0 ? -0.12 : 0.12;
        zoomScale = clampZoom(zoomScale + step);
        applyInlineZoom();
      },
      { passive: false }
    );

    vp.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinchState = {
          d: touchDistance(e.touches[0], e.touches[1]),
          scale: zoomScale,
        };
      }
    }, { passive: true });

    vp.addEventListener(
      'touchmove',
      function (e) {
        if (e.touches.length === 2 && pinchState) {
          e.preventDefault();
          var d = touchDistance(e.touches[0], e.touches[1]);
          if (pinchState.d > 0) {
            zoomScale = clampZoom(pinchState.scale * (d / pinchState.d));
            applyInlineZoom();
          }
        }
      },
      { passive: false }
    );

    vp.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) pinchState = null;
    });

    document.getElementById('zoomInBtn').addEventListener('click', function () {
      zoomScale = clampZoom(zoomScale + 0.25);
      applyInlineZoom();
    });
    document.getElementById('zoomOutBtn').addEventListener('click', function () {
      zoomScale = clampZoom(zoomScale - 0.25);
      applyInlineZoom();
    });
    document.getElementById('zoomResetBtn').addEventListener('click', function () {
      resetInlineZoom();
    });
    document.getElementById('zoomFsBtn').addEventListener('click', function () {
      openZoomLightbox();
    });
  }

  function bindLightboxUI() {
    var box = document.getElementById('zoomLightbox');
    var vp = document.getElementById('zoomLightboxViewport');
    if (!box || box.dataset.bound) return;
    box.dataset.bound = '1';

    document.getElementById('zoomLightboxClose').addEventListener('click', closeZoomLightbox);
    document.getElementById('lbZoomIn').addEventListener('click', function () {
      lbScale = clampZoom(lbScale + 0.25);
      applyLbZoom();
    });
    document.getElementById('lbZoomOut').addEventListener('click', function () {
      lbScale = clampZoom(lbScale - 0.25);
      applyLbZoom();
    });
    document.getElementById('lbZoomReset').addEventListener('click', function () {
      lbScale = 1;
      applyLbZoom();
      if (vp) {
        vp.scrollLeft = 0;
        vp.scrollTop = 0;
      }
    });

    vp.addEventListener(
      'wheel',
      function (e) {
        e.preventDefault();
        lbScale = clampZoom(lbScale + (e.deltaY > 0 ? -0.12 : 0.12));
        applyLbZoom();
      },
      { passive: false }
    );

    vp.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        lbPinch = { d: touchDistance(e.touches[0], e.touches[1]), scale: lbScale };
        lbDrag = null;
      } else if (e.touches.length === 1 && lbScale > 1.02) {
        var t = e.touches[0];
        lbDrag = { x: t.clientX, y: t.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
      }
    }, { passive: true });

    vp.addEventListener(
      'touchmove',
      function (e) {
        if (e.touches.length === 2 && lbPinch) {
          e.preventDefault();
          var d = touchDistance(e.touches[0], e.touches[1]);
          if (lbPinch.d > 0) {
            lbScale = clampZoom(lbPinch.scale * (d / lbPinch.d));
            applyLbZoom();
          }
        } else if (e.touches.length === 1 && lbDrag) {
          e.preventDefault();
          var p = e.touches[0];
          vp.scrollLeft = lbDrag.sl - (p.clientX - lbDrag.x);
          vp.scrollTop = lbDrag.st - (p.clientY - lbDrag.y);
        }
      },
      { passive: false }
    );

    vp.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) lbPinch = null;
      if (e.touches.length === 0) lbDrag = null;
    });

    var dragMouse = null;
    vp.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || lbScale <= 1.02) return;
      dragMouse = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
      vp.classList.add('is-dragging');
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragMouse) return;
      vp.scrollLeft = dragMouse.sl - (e.clientX - dragMouse.x);
      vp.scrollTop = dragMouse.st - (e.clientY - dragMouse.y);
    });
    window.addEventListener('mouseup', function () {
      dragMouse = null;
      if (vp) vp.classList.remove('is-dragging');
    });
  }

  function updateStats() {
    var completedCount = completedSteps.length;
    var total = steps.length;
    var percent = total ? (completedCount / total) * 100 : 0;

    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('totalSteps').textContent = total;
    document.getElementById('progressFill').style.width = percent + '%';
  }

  function isStepCompleted(stepIndex) {
    return completedSteps.indexOf(stepIndex) !== -1;
  }

  window.toggleStepComplete = function (stepIndex) {
    var beforeCount = completedSteps.length;
    if (isStepCompleted(stepIndex)) {
      completedSteps = completedSteps.filter(function (i) {
        return i !== stepIndex;
      });
    } else {
      completedSteps.push(stepIndex);
      sendAnalytics(stepIndex, 'step_completed');
    }
    saveProgress();
    var total = steps.length;
    var afterCount = completedSteps.length;
    if (
      total > 0 &&
      afterCount === total &&
      afterCount > beforeCount &&
      !hasReviewSubmitted()
    ) {
      setTimeout(function () {
        openReviewModal();
      }, 600);
    }
    renderStep();
  };

  function sendAnalytics(stepIndex, action) {
    console.log('📊 Аналитика:', { instructionId: instructionId, step: stepIndex + 1, action: action });
    if (!cfg.apiBase) return;
  }

  function renderShopCta() {
    var bar = document.getElementById('shopCtaBar');
    if (!bar) return;
    if (!shopCta || !shopCta.href) {
      bar.style.display = 'none';
      bar.setAttribute('hidden', '');
      return;
    }
    bar.removeAttribute('hidden');
    bar.style.display = 'block';
    var line = document.getElementById('shopCtaLine');
    var link = document.getElementById('shopCtaLink');
    if (line) line.textContent = shopCta.line || '';
    if (link) {
      link.href = shopCta.href;
      link.textContent = shopCta.linkLabel || 'Магазин';
    }
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
    ul.innerHTML = postAssembly.items
      .map(function (item) {
        var href = item.href || '#';
        return '<li><a href="' + escapeAttr(href) + '">' + escapeAttr(item.label || '') + '</a></li>';
      })
      .join('');
  }

  function renderStep() {
    zoomHandlersBound = false;
    resetInlineZoom();

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
      '<div class="step-number">ШАГ ' +
      (currentStep + 1) +
      ' ИЗ ' +
      steps.length +
      '</div>' +
      '<button type="button" class="step-complete' +
      (isCompleted ? ' completed' : '') +
      '" onclick="toggleStepComplete(' +
      currentStep +
      ')">' +
      (isCompleted ? '✅ Выполнено' : '☐ Отметить выполненным') +
      '</button></div>' +
      '<div class="step-image" id="stepImageWrapper">' +
      '<div class="step-image-viewport" id="stepImageViewport" tabindex="0">' +
      '<img src="' +
      escapeAttr(step.image) +
      '" alt="Шаг ' +
      (currentStep + 1) +
      '" id="stepImg" loading="lazy" draggable="false">' +
      '</div>' +
      '<div class="zoom-toolbar">' +
      '<button type="button" class="zoom-tool-btn" id="zoomOutBtn" aria-label="Уменьшить">−</button>' +
      '<span class="zoom-pct" id="zoomPctLabel">100%</span>' +
      '<button type="button" class="zoom-tool-btn" id="zoomInBtn" aria-label="Увеличить">+</button>' +
      '<button type="button" class="zoom-tool-btn zoom-tool-btn--text" id="zoomResetBtn">Сброс</button>' +
      '<button type="button" class="zoom-tool-btn zoom-tool-btn--text" id="zoomFsBtn">Весь экран</button>' +
      '</div>' +
      '<div class="zoom-hint">Колёсико · щипок · кнопки</div>' +
      '</div>' +
      '<div class="step-description">' +
      step.description +
      '</div></div>' +
      '<div class="nav-buttons">' +
      '<button type="button" class="nav-btn" onclick="prevStep()" ' +
      (currentStep === 0 ? 'disabled' : '') +
      '>◀ Назад</button>' +
      '<button type="button" class="nav-btn" onclick="nextStep()" ' +
      (currentStep === steps.length - 1 ? 'disabled' : '') +
      '>Вперед ▶</button>' +
      '</div>' +
      '<button type="button" class="missing-btn" onclick="openModal()">📦 Не хватает детали? Сообщить</button>';

    applyInlineZoom();
    bindZoomUI();
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

  function openReviewModal() {
    var m = document.getElementById('reviewModal');
    if (!m) return;
    m.style.display = 'block';
    m.setAttribute('aria-hidden', 'false');
  }

  function closeReviewModal() {
    var m = document.getElementById('reviewModal');
    if (!m) return;
    m.style.display = 'none';
    m.setAttribute('aria-hidden', 'true');
  }

  function setStarRating(n) {
    var input = document.getElementById('reviewRating');
    var stars = document.querySelectorAll('#starRating .star');
    if (input) input.value = String(n);
    stars.forEach(function (btn) {
      var v = parseInt(btn.getAttribute('data-value'), 10);
      btn.classList.toggle('is-active', v <= n);
    });
  }

  function bindReviewStars() {
    var wrap = document.getElementById('starRating');
    if (!wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = '1';
    var stars = wrap.querySelectorAll('.star');
    stars.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStarRating(parseInt(btn.getAttribute('data-value'), 10));
      });
      btn.addEventListener('mouseenter', function () {
        var h = parseInt(btn.getAttribute('data-value'), 10);
        stars.forEach(function (b) {
          var v = parseInt(b.getAttribute('data-value'), 10);
          b.classList.toggle('is-hover', v <= h);
        });
      });
    });
    wrap.addEventListener('mouseleave', function () {
      stars.forEach(function (b) {
        b.classList.remove('is-hover');
      });
    });
  }

  function applyMeta() {
    document.title = 'Инструкция — ' + meta.title;
    document.getElementById('productTitle').textContent = meta.title;
    document.getElementById('productArticle').textContent = 'Арт. ' + meta.article;
    document.getElementById('footerSupport').innerHTML =
      '<strong>💡 Нет интернета?</strong> Звоните: ' +
      meta.supportPhone +
      '<br>' +
      'Или введите в браузере: <strong>' +
      meta.fallbackUrlHint +
      '</strong>';
  }

  function init() {
    document.getElementById('stepContainer').innerHTML = '<div class="step-description">Загрузка инструкции...</div>';

    bindLightboxUI();
    bindReviewStars();

    document.getElementById('openReviewBtn').addEventListener('click', function () {
      openReviewModal();
    });
    document.getElementById('closeReviewModal').addEventListener('click', function () {
      closeReviewModal();
    });

    document.getElementById('reviewForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var rating = parseInt(document.getElementById('reviewRating').value, 10);
      if (!rating || rating < 1 || rating > 5) {
        alert('Поставьте оценку звёздами.');
        return;
      }
      var text = document.getElementById('reviewText').value.trim();
      var payload = {
        instructionId: instructionId,
        rating: rating,
        text: text,
        at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(reviewStorageKey, JSON.stringify(payload));
      } catch (err) {}
      console.log('⭐ Отзыв (прототип):', payload);
      if (cfg.apiBase) {
        // fetch POST review
      }
      alert('Спасибо! Отзыв сохранён (в демо — локально на устройстве).');
      closeReviewModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeZoomLightbox();
        closeReviewModal();
        closeModal();
      }
    });

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
        shopCta = data.shopCta || null;
        applyMeta();
        renderShopCta();
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
