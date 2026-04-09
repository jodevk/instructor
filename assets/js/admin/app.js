(function () {
  var cfg = window.INSTRUCTOR || { appVersion: '1' };

  function withCacheBust(url) {
    var v = cfg.appVersion || '1';
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'v=' + encodeURIComponent(v);
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function resolveThumbUrl(src) {
    if (!src) return src;
    if (/^https?:\/\//i.test(src)) return withCacheBust(src);
    return withCacheBust(new URL(src, window.location.href).href);
  }

  var titles = {
    overview: { title: 'Обзор', sub: 'Ключевые цифры и свежие заявки.' },
    models: { title: 'Модели', sub: 'Все инструкции, карточка и замена PDF.' },
    requests: { title: 'Заявки клиентов', sub: 'Нехватка деталей и статусы обработки.' },
    analytics: { title: 'Аналитика и отзывы', sub: 'Воронка по шагам и оценки клиентов.' },
    subscription: { title: 'Подписка', sub: 'Тариф, лимит моделей и продление.' },
  };

  var state = { data: null, currentModelId: null };

  function badgeClass(status) {
    if (status === 'new') return 'badge--new';
    if (status === 'in_progress') return 'badge--progress';
    if (status === 'closed') return 'badge--closed';
    return '';
  }

  function badgeText(status) {
    if (status === 'new') return 'Новая';
    if (status === 'in_progress') return 'В работе';
    if (status === 'closed') return 'Закрыта';
    return status;
  }

  function stars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return '<span class="stars">' + s + '</span>';
  }

  function setPanel(name) {
    document.querySelectorAll('.admin-nav button').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-panel') === name);
    });
    document.querySelectorAll('.admin-panel').forEach(function (p) {
      p.classList.toggle('is-visible', p.getAttribute('data-panel-content') === name);
    });
    var t = titles[name] || titles.overview;
    document.getElementById('adminPageTitle').textContent = t.title;
    document.getElementById('adminPageSub').textContent = t.sub;
  }

  function renderOverview() {
    var d = state.data;
    var sub = d.subscription;
    var reqOpen = d.requests.filter(function (r) {
      return r.status !== 'closed';
    }).length;

    document.getElementById('overviewStats').innerHTML =
      '<div class="stat-card"><div class="stat-card__val">' +
      d.models.length +
      '</div><div class="stat-card__label">Моделей в аккаунте</div></div>' +
      '<div class="stat-card"><div class="stat-card__val">' +
      sub.usedModels +
      ' / ' +
      sub.limitModels +
      '</div><div class="stat-card__label">Использовано лимита</div></div>' +
      '<div class="stat-card"><div class="stat-card__val">' +
      reqOpen +
      '</div><div class="stat-card__label">Открытых заявок</div></div>' +
      '<div class="stat-card"><div class="stat-card__val">' +
      d.reviews.length +
      '</div><div class="stat-card__label">Отзывов (всего)</div></div>';

    var preview = d.requests.slice(0, 5);
    document.getElementById('overviewRequestsPreview').innerHTML = preview
      .map(function (r) {
        return (
          '<tr><td>' +
          r.createdAt +
          '</td><td>' +
          r.modelName +
          '</td><td>' +
          r.type +
          '</td><td>' +
          r.step +
          '</td><td><span class="badge ' +
          badgeClass(r.status) +
          '">' +
          badgeText(r.status) +
          '</span></td></tr>'
        );
      })
      .join('');
  }

  function openModelModal(model) {
    state.currentModelId = model.id;
    document.getElementById('modalModelTitle').textContent = model.name;
    document.getElementById('modalModelMeta').textContent =
      'Арт. ' + model.article + ' · ' + model.stepsCount + ' шагов · PDF: ' + model.pdfFileName;

    var steps = model.steps && model.steps.length ? model.steps : [];
    var stepsEl = document.getElementById('modalStepsPreview');
    if (!steps.length) {
      stepsEl.innerHTML =
        '<p class="sub" style="grid-column:1/-1;padding:16px;">Шаги появятся после обработки PDF на сервере. Сейчас в демо для этой модели превью не заданы.</p>';
    } else {
      stepsEl.innerHTML = steps
        .map(function (s) {
          return (
            '<div class="step-thumb"><img src="' +
            escapeAttr(resolveThumbUrl(s.thumb)) +
            '" alt="Шаг ' +
            s.n +
            '" loading="lazy"><span>Шаг ' +
            s.n +
            ': ' +
            s.title +
            '</span></div>'
          );
        })
        .join('');
    }

    document.getElementById('modalPdfInput').value = '';
    document.getElementById('modelModal').classList.add('is-open');
    document.getElementById('modelModal').setAttribute('aria-hidden', 'false');
  }

  function closeModelModal() {
    document.getElementById('modelModal').classList.remove('is-open');
    document.getElementById('modelModal').setAttribute('aria-hidden', 'true');
  }

  function renderModels() {
    document.getElementById('modelsTableBody').innerHTML = state.data.models
      .map(function (m) {
        return (
          '<tr data-model-id="' +
          m.id +
          '"><td><strong>' +
          m.name +
          '</strong></td><td>' +
          m.article +
          '</td><td>' +
          m.stepsCount +
          '</td><td>' +
          m.pdfFileName +
          '</td><td>' +
          m.updatedAt +
          '</td><td>' +
          m.scans7d +
          '</td><td><button type="button" class="btn-sm btn-sm--primary js-open-model">Карточка</button></td></tr>'
        );
      })
      .join('');

    document.getElementById('modelsTableBody').onclick = function (e) {
      var btn = e.target.closest('.js-open-model');
      if (!btn) return;
      var row = btn.closest('tr');
      var id = row && row.getAttribute('data-model-id');
      var model = state.data.models.find(function (x) {
        return x.id === id;
      });
      if (model) openModelModal(model);
    };
  }

  function renderRequests() {
    document.getElementById('requestsTableBody').innerHTML = state.data.requests
      .map(function (r) {
        return (
          '<tr><td>' +
          r.id +
          '</td><td>' +
          r.createdAt +
          '</td><td>' +
          r.modelName +
          '<br><small style="color:#64748b">' +
          r.article +
          '</small></td><td>' +
          r.type +
          '</td><td>' +
          r.step +
          '</td><td>' +
          r.detail +
          '</td><td><span class="badge ' +
          badgeClass(r.status) +
          '">' +
          badgeText(r.status) +
          '</span></td><td><button type="button" class="btn-sm btn-sm--ghost js-req-demo">Открыть</button></td></tr>'
        );
      })
      .join('');

    document.getElementById('requestsTableBody').onclick = function (e) {
      if (e.target.closest('.js-req-demo')) {
        alert('В прототипе нет карточки заявки. В продукте — фото, контакты, история.');
      }
    };
  }

  function renderFunnel(modelId) {
    var rows = state.data.funnels[modelId] || [];
    document.getElementById('funnelTableBody').innerHTML = rows
      .map(function (row) {
        return (
          '<tr><td>' +
          row.step +
          '</td><td>' +
          row.label +
          '</td><td>' +
          row.reachedPct +
          '%</td><td>' +
          row.completedPct +
          '%</td><td><div class="funnel-bar" style="width:' +
          row.reachedPct +
          '%"></div></td></tr>'
        );
      })
      .join('');
  }

  function renderAnalytics() {
    var sel = document.getElementById('funnelModelSelect');
    sel.innerHTML = state.data.models
      .map(function (m) {
        return '<option value="' + m.id + '">' + m.name + ' (' + m.article + ')</option>';
      })
      .join('');

    var firstId = state.data.models[0] && state.data.models[0].id;
    if (firstId) {
      sel.value = firstId;
      renderFunnel(firstId);
    }

    sel.onchange = function () {
      renderFunnel(sel.value);
    };

    document.getElementById('reviewsTableBody').innerHTML = state.data.reviews
      .map(function (v) {
        return (
          '<tr><td>' +
          v.createdAt +
          '</td><td>' +
          v.modelName +
          '<br><small style="color:#64748b">' +
          v.article +
          '</small></td><td>' +
          stars(v.rating) +
          '</td><td>' +
          (v.text || '—') +
          '</td><td>' +
          v.lastStepReached +
          '</td></tr>'
        );
      })
      .join('');
  }

  function renderSubscription() {
    var s = state.data.subscription;
    var pct = Math.min(100, Math.round((s.usedModels / s.limitModels) * 100));
    document.getElementById('subscriptionCard').innerHTML =
      '<h2>Текущий тариф: ' +
      s.planName +
      '</h2>' +
      '<p class="sub" style="margin-bottom:16px;">' +
      s.priceMonthlyRub.toLocaleString('ru-RU') +
      ' ₽ / мес · продление ' +
      s.renewsAt +
      '</p>' +
      '<p><span class="badge badge--closed">Статус: ' +
      (s.status === 'active' ? 'активна' : s.status) +
      '</span></p>' +
      '<div class="sub-progress">' +
      '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;"><span>Моделей в тарифе</span><span>' +
      s.usedModels +
      ' / ' +
      s.limitModels +
      '</span></div>' +
      '<div class="sub-progress__bar"><div class="sub-progress__fill" style="width:' +
      pct +
      '%"></div></div>' +
      '</div>' +
      '<div class="sub-actions">' +
      '<button type="button" class="btn-sm btn-sm--primary" id="subUpgradeDemo">Сменить тариф (демо)</button>' +
      '<button type="button" class="btn-sm btn-sm--ghost" id="subHistoryDemo">История платежей (демо)</button>' +
      '<button type="button" class="btn-sm btn-sm--ghost" id="subCancelDemo">Условия отмены (демо)</button>' +
      '</div>';

    document.getElementById('subUpgradeDemo').onclick = function () {
      alert('Демо: здесь будет выбор тарифа и оплата.');
    };
    document.getElementById('subHistoryDemo').onclick = function () {
      alert('Демо: список счетов и актов.');
    };
    document.getElementById('subCancelDemo').onclick = function () {
      alert('Демо: политика отмены и контакт поддержки.');
    };
  }

  function bindNav() {
    document.querySelectorAll('.admin-nav button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPanel(btn.getAttribute('data-panel'));
      });
    });
  }

  document.getElementById('modelModalClose').addEventListener('click', closeModelModal);
  document.getElementById('modelModal').addEventListener('click', function (e) {
    if (e.target.id === 'modelModal') closeModelModal();
  });
  document.getElementById('modalPdfSubmit').addEventListener('click', function () {
    var f = document.getElementById('modalPdfInput').files[0];
    if (!f) {
      alert('Выберите PDF-файл.');
      return;
    }
    console.log('📤 [демо] Замена PDF для модели', state.currentModelId, f.name);
    alert('Демо: файл «' + f.name + '» поставлен в очередь на конвертацию.');
    closeModelModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModelModal();
  });

  var url = withCacheBust(new URL('../data/admin-mock.json', window.location.href).href);
  fetch(url, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('mock');
      return r.json();
    })
    .then(function (data) {
      state.data = data;
      renderOverview();
      renderModels();
      renderRequests();
      renderAnalytics();
      renderSubscription();
      bindNav();
    })
    .catch(function () {
      document.querySelector('.admin-main').innerHTML =
        '<div class="admin-card"><p>Не удалось загрузить <code>data/admin-mock.json</code>.</p></div>';
    });
})();
