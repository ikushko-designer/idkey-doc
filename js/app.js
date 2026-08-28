/* UI формы, live-пересчёт, генерация договора. */
(function () {
  'use strict';

  /* Пароль лежит в открытом виде — это фильтр для своих, а не защита.
     На статическом хостинге иначе нельзя: серверной проверки нет. */
  var PASSWORD = '2507';
  var TEMPLATE_URL = 'templates/master_template.docx';

  var CFG = null, RULES = null, ALLOWED = null;
  var lastBlob = null, lastName = '';
  /* До первой попытки составить договор не красим поля алым и не ругаемся
     на пустой набор услуг — иначе форма встречает менеджера сплошной руганью. */
  var submitTried = false;
  var $ = function (id) { return document.getElementById(id); };

  /* Приватный режим Safari и заблокированные куки роняют sessionStorage —
     без обёртки вход перестал бы работать вообще. */
  function remember(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, value);
    } catch (e) { /* не запомнили — переживём, просто спросим пароль ещё раз */ }
    return null;
  }

  /* ---------- экран пароля ---------- */
  function initGate() {
    if (remember('cg-auth') === '1') return openApp();
    $('gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('gate-pass').value.trim() === PASSWORD) {
        remember('cg-auth', '1');
        openApp();
      } else {
        $('gate-error').hidden = false;
        $('gate-pass').select();
      }
    });
  }

  function openApp() {
    $('gate').hidden = true;
    $('app').hidden = false;
    boot();
  }

  /* ---------- загрузка конфигов ---------- */
  function boot() {
    Promise.all([
      fetch('config/services.json').then(function (r) { return r.json(); }),
      fetch('config/term-rules.json').then(function (r) { return r.json(); }),
      fetch('config/combinations.json').then(function (r) { return r.json(); })
    ]).then(function (res) {
      CFG = res[0];
      RULES = res[1];
      ALLOWED = window.Combinations.build(res[2]);
      buildServices();
      $('f-date').value = window.Contract.contractDate(new Date());
      $('form').addEventListener('input', recalc);
      $('form').addEventListener('change', recalc);
      $('form').addEventListener('submit', onSubmit);
      $('dl-word').addEventListener('click', downloadWord);
      $('dl-pdf').addEventListener('click', downloadPdf);
      $('f-phone').addEventListener('blur', formatPhone);
      window.addEventListener('resize', fitPreview);
      $('pdf-hint').textContent = pdfHint();
      recalc();
    }).catch(function (e) {
      alert('Не удалось загрузить настройки: ' + e.message);
    });
  }

  /* ---------- блоки услуг ---------- */
  function buildServices() {
    var host = $('services');
    CFG.order.forEach(function (key) {
      var meta = CFG.services[key];
      var unitSuffix = meta.unit === 'm2' ? 'кв.м' : 'шт.';
      var box = document.createElement('div');
      box.className = 'svc';
      box.dataset.key = key;
      box.innerHTML =
        '<label class="svc__head"><input type="checkbox" class="svc__cb"><span>' + meta.label + '</span></label>' +
        '<div class="svc__body" hidden>' +
          fld('amount', meta.amountLabel, unitSuffix) +
          fld('days', 'Срок, дн', '') +
          fld('price', 'P=', meta.unitLabel) +
          '<div class="fld"><span class="fld__lbl">Стоимость</span>' +
            '<output class="input input--small input--auto input--ro" data-f="cost">0</output>' +
            '<span class="suffix">руб.</span></div>' +
          (key === 'twoD'
            ? '<div class="fld fld--wide"><span class="fld__lbl">Подробнее</span>' +
              '<textarea class="input input--area" data-f="option" rows="3"></textarea></div>'
            : '') +
        '</div>';
      host.appendChild(box);

      if (key === 'twoD') {
        box.querySelector('[data-f="option"]').value = CFG.twoDDefaultOption;
      }

      box.querySelector('.svc__cb').addEventListener('change', function () {
        box.querySelector('.svc__body').hidden = !this.checked;
        box.classList.toggle('svc--on', this.checked);
      });

      Array.prototype.forEach.call(box.querySelectorAll('.edit'), function (btn) {
        btn.addEventListener('click', function () { toggleManual(box, btn.getAttribute('data-f')); });
      });
    });
  }

  function fld(name, label, suffix) {
    return '<div class="fld"><span class="fld__lbl">' + label + '</span>' +
      '<input class="input input--small input--auto" data-f="' + name + '" inputmode="decimal" readonly>' +
      '<button class="edit" type="button" data-f="' + name + '" title="Ручное редактирование">&#9998;</button>' +
      (suffix ? '<span class="suffix">' + suffix + '</span>' : '') +
      '</div>';
  }

  function toggleManual(box, field) {
    var input = box.querySelector('[data-f="' + field + '"]');
    var btn = box.querySelector('.edit[data-f="' + field + '"]');
    if (input.getAttribute('data-manual') === '1') {
      input.setAttribute('data-manual', '');
      input.readOnly = true;
      btn.classList.remove('edit--on');
    } else {
      input.setAttribute('data-manual', '1');
      input.readOnly = false;
      btn.classList.add('edit--on');
      input.focus();
      input.select();
    }
    recalc();
  }

  function isManual(box, field) {
    return box.querySelector('[data-f="' + field + '"]').getAttribute('data-manual') === '1';
  }

  /* ---------- состояние формы ---------- */
  function readState() {
    var st = {
      contractNo: $('f-no').value,
      date: new Date(),
      fio: $('f-fio').value.trim(),
      inn: $('f-inn').value.trim(),
      phone: $('f-phone').value.trim(),
      address: $('f-address').value.trim(),
      area: $('f-area').value,
      twoDOption: '',
      services: {}
    };
    CFG.order.forEach(function (key) {
      var box = document.querySelector('.svc[data-key="' + key + '"]');
      var get = function (f) { return box.querySelector('[data-f="' + f + '"]'); };
      st.services[key] = {
        checked: box.querySelector('.svc__cb').checked,
        amount: get('amount').value,
        price: get('price').value,
        days: get('days').value,
        amountManual: isManual(box, 'amount'),
        priceManual: isManual(box, 'price'),
        daysManual: isManual(box, 'days')
      };
      if (key === 'twoD') st.twoDOption = get('option').value;
    });
    return st;
  }

  /* ---------- пересчёт ---------- */
  function recalc() {
    if (!CFG) return null;
    var st = readState();
    var calc = window.Pricing.calculate(st, CFG, RULES);

    CFG.order.forEach(function (key) {
      var box = document.querySelector('.svc[data-key="' + key + '"]');
      var r = calc.services[key];
      if (!r) {                                  /* услуга снята — гасим её предупреждение */
        box.classList.remove('svc--warn');
        return;
      }
      setField(box, 'amount', fmt(r.amount), !st.services[key].amountManual);
      setField(box, 'price', fmt(r.price), !st.services[key].priceManual);
      setField(box, 'days', String(r.days), !st.services[key].daysManual);
      box.querySelector('[data-f="cost"]').value = window.Contract.money(r.cost);
      box.classList.toggle('svc--warn', r.outOfRange);
    });

    $('t-sum').value = window.Contract.money(calc.totalSum);
    $('t-words').value = calc.totalSumWords;
    $('t-days').value = String(calc.totalDays);

    var warnings = calc.warnings.concat(twoDCountWarning(st, calc));
    var warn = $('warnings');
    warn.hidden = warnings.length === 0;
    warn.textContent = warnings.join('\n');

    var selected = CFG.order.filter(function (k) { return st.services[k].checked; });
    var combo = window.Combinations.validate(selected, ALLOWED);
    $('combo-error').hidden = combo.ok || (selected.length === 0 && !submitTried);
    $('combo-error').textContent = combo.error || '';

    var problems = validateFields(st);
    var ok = combo.ok && problems.length === 0;
    var btn = $('make');
    btn.classList.toggle('btn--valid', ok);
    btn.classList.toggle('btn--invalid', !ok);
    if (ok) $('make-msg').textContent = '';
    if (submitTried) highlight(problems);   /* подсветка снимается сразу, как поле исправили */

    return { state: st, calc: calc, ok: ok, problems: problems, combo: combo };
  }

  function setField(box, name, value, isAuto) {
    var el = box.querySelector('[data-f="' + name + '"]');
    if (el.getAttribute('data-manual') !== '1') el.value = value;
    el.classList.toggle('input--auto', isAuto);
    el.classList.toggle('input--manual', !isAuto);
  }

  function fmt(n) {
    return (Math.round(n * 100) / 100).toString().replace('.', ',');
  }

  /* В договор количество ракурсов попадает только текстом из «Подробнее»,
     а цена считается по полю N= — расхождение между ними даёт неверный договор. */
  function twoDCountWarning(st, calc) {
    var r = calc.services.twoD;
    if (!r) return [];
    /* Именно «N ракурс…», а не первое попавшееся число: в дефолтном тексте
       первым идёт «2» из «2D-коллажей». Если формулировка другая — молчим,
       ложная тревога хуже её отсутствия. */
    var m = String(st.twoDOption).match(/(\d+)\s*ракурс/i);
    if (!m) return [];
    var inText = parseInt(m[1], 10);
    if (inText === Math.round(r.amount)) return [];
    return ['2D-коллажи: в поле «Подробнее» указано ракурсов — ' + inText +
            ', а в расчёте — ' + Math.round(r.amount) + '. Поправьте текст или количество.'];
  }

  /* ---------- валидация ---------- */
  function validateFields(st) {
    var bad = [];
    if (!/^\d+$/.test(String(st.contractNo).trim())) bad.push('f-no');
    if (!st.fio) bad.push('f-fio');
    if (!/^\d{10}(\d{2})?$/.test(st.inn.replace(/\s/g, ''))) bad.push('f-inn');
    if (st.phone.replace(/\D/g, '').length < 10) bad.push('f-phone');
    if (!st.address) bad.push('f-address');
    if (!(window.Pricing.num(st.area) > 0)) bad.push('f-area');
    return bad;
  }

  function highlight(problems) {
    ['f-no', 'f-fio', 'f-inn', 'f-phone', 'f-address', 'f-area'].forEach(function (id) {
      $(id).classList.remove('input--bad');
    });
    problems.forEach(function (id) { $(id).classList.add('input--bad'); });
  }

  /* Приводит к «+7 (909) 980-90-00». Нестандартную запись оставляет как есть. */
  function phoneValue(raw) {
    var d = String(raw).replace(/\D/g, '');
    if (d.length === 11 && (d.charAt(0) === '7' || d.charAt(0) === '8')) {
      return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
    }
    if (d.length === 10) {
      return '+7 (' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6, 8) + '-' + d.slice(8, 10);
    }
    return String(raw).trim();
  }

  function formatPhone() {
    this.value = phoneValue(this.value);
    recalc();
  }

  /* ---------- генерация ---------- */
  function onSubmit(e) {
    e.preventDefault();
    submitTried = true;
    var r = recalc();
    highlight(r.problems);
    if (!r.ok) {
      $('make-msg').textContent = r.combo.ok ? 'не все поля заполнены' : 'проверьте набор услуг';
      return;
    }
    $('make-msg').textContent = 'собираю договор…';

    var st = r.state;
    st.phone = phoneValue(st.phone);   /* в договор всегда идёт единый формат номера */
    $('f-phone').value = st.phone;
    var data = window.Contract.buildData(st, r.calc, CFG);
    var dateOverride = $('f-date').value.trim();
    if (dateOverride) data.DATE = dateOverride;

    window.Contract.render(TEMPLATE_URL, data).then(function (blob) {
      lastBlob = blob;
      /* В имени файла не должно быть символов, запрещённых в Windows и macOS */
      lastName = ('Договор ' + data.CONTRACT_NO.replace('/', '-') +
                  (st.fio ? ' ' + st.fio : ''))
                 .replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.docx';
      $('result').hidden = false;
      $('make-msg').textContent = '✓ готово';
      $('preview').innerHTML = '';
      return window.docx.renderAsync(blob, $('preview'), null, {
        className: 'docx',
        inWrapper: true,
        breakPages: true,
        renderHeaders: true,
        /* Колонтитул «стр. X из Y» — поле Word: браузер не пересчитывает номера,
           и в предпросмотре он встал бы один раз внизу документа с неверным номером. */
        renderFooters: false,
        useBase64URL: true
      });
    }).then(function () {
      fitPreview();
      $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (err) {
      $('make-msg').textContent = 'ошибка';
      alert(window.Contract.describeError(err));
    });
  }

  function downloadWord() {
    if (!lastBlob) return;
    var url = URL.createObjectURL(lastBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = lastName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function downloadPdf() {
    window.print();
  }

  function pdfHint() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'PDF: откроется окно печати, далее «Поделиться» → «Сохранить в Файлы»';
    if (/Android/.test(ua)) return 'PDF: в окне печати выберите «Сохранить как PDF»';
    return 'PDF: в окне печати выберите принтер «Сохранить как PDF»';
  }

  /* Страница A4 шире экрана телефона — вписываем предпросмотр по ширине. */
  function fitPreview() {
    var host = $('preview');
    var wrap = host.querySelector('.docx-wrapper');
    if (!wrap) return;
    var page = wrap.querySelector('section');
    if (!page) return;
    wrap.style.transform = 'none';
    host.style.height = 'auto';
    var scale = Math.min(1, host.clientWidth / (page.offsetWidth + 2));
    if (scale >= 0.999) return;
    wrap.style.transformOrigin = 'top left';
    wrap.style.transform = 'scale(' + scale + ')';
    host.style.height = (wrap.scrollHeight * scale) + 'px';
  }

  initGate();
})();
