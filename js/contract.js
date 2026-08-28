/* Сборка данных для шаблона и рендер .docx прямо в браузере. */
(function (global) {
  'use strict';

  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var templateBuffer = null;

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* Номер договора: ДДММ/ГГ-номер из формы (формат из для_договора.xlsx) */
  function contractNo(seq, date) {
    return pad2(date.getDate()) + pad2(date.getMonth() + 1) + '/' +
           String(date.getFullYear()).slice(2) + '-' + String(seq || '1').trim();
  }

  /* Дата договора без числа: «месяц год» — само «   »  уже стоит в шаблоне */
  function contractDate(date) {
    return MONTHS_GEN[date.getMonth()] + ' ' + date.getFullYear();
  }

  function money(n) {
    return (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }
  function amount(n) {
    return (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }

  function loadTemplate(url) {
    if (templateBuffer) return Promise.resolve(templateBuffer);
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('Не удалось загрузить шаблон договора (' + r.status + ')');
        return r.arrayBuffer();
      })
      .then(function (buf) { templateBuffer = buf; return buf; });
  }

  /* Полный набор данных: и значения плейсхолдеров, и булевы флаги секций. */
  function buildData(state, calc, cfg) {
    var flags = {};
    cfg.order.forEach(function (k) { flags[k] = !!(state.services[k] && state.services[k].checked); });
    var stages = global.Numbering.build(flags);

    var s = function (k) { return calc.services[k] || { amount: 0, price: 0, cost: 0, days: 0 }; };
    var t1 = s('tech1'), t2 = s('tech2'), d3 = s('threeD'), d2 = s('twoD'), tb = s('table');
    var now = state.date || new Date();

    var data = {
      /* --- флаги условных секций --- */
      TECH1: flags.tech1,
      TECH2: flags.tech2,
      THREE_D: flags.threeD,
      TWO_D: flags.twoD,
      TABLE: flags.table,
      TECH_SECTION: flags.tech1 || flags.tech2,

      /* --- общие поля --- */
      CONTRACT_NO: contractNo(state.contractNo, now),
      DATE: contractDate(now),
      FIO: state.fio || '',
      INN: state.inn || '',
      PHONE: state.phone || '',
      ADDRESS: state.address || '',
      AREA: amount(global.Pricing.num(state.area)),
      TOTAL_DAYS: String(calc.totalDays),
      TOTAL_SUM: money(calc.totalSum),
      TOTAL_SUM_WORDS: calc.totalSumWords,

      /* --- по услугам --- */
      TECH1_AREA: amount(t1.amount), TECH1_DAYS: String(t1.days), TECH1_COST: money(t1.cost),
      TECH2_AREA: amount(t2.amount), TECH2_DAYS: String(t2.days), TECH2_COST: money(t2.cost),
      '3D_AREA': amount(d3.amount), '3D_DAYS': String(d3.days),
      '3D_80': money(d3.cost * 0.8), '3D_20': money(d3.cost * 0.2),
      '2D_OPTION': state.twoDOption || '',
      '2D_DAYS': String(d2.days),
      '2D_80': money(d2.cost * 0.8), '2D_20': money(d2.cost * 0.2),
      TABLE_AREA: amount(tb.amount), TABLE_DAYS: String(tb.days), TABLE_COST: money(tb.cost)
    };

    /* номера этапов и перекрёстные ссылки */
    Object.keys(stages).forEach(function (k) { data[k] = stages[k]; });
    return data;
  }

  /* Понятное сообщение вместо стектрейса docxtemplater. */
  function describeError(err) {
    if (err && err.properties && err.properties.errors && err.properties.errors.length) {
      var lines = err.properties.errors.map(function (e) {
        var p = e.properties || {};
        return '• ' + (p.explanation || e.message) + (p.xtag ? ' (тег {{' + p.xtag + '}})' : '');
      });
      return 'Шаблон договора повреждён — проверьте разметку тегов:\n' + lines.join('\n');
    }
    return (err && err.message) ? err.message : 'Неизвестная ошибка при сборке договора';
  }

  function render(templateUrl, data) {
    return loadTemplate(templateUrl).then(function (buf) {
      var zip = new global.PizZip(buf);
      var doc = new global.docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: function () { return ''; }
      });
      doc.render(data);
      return doc.getZip().generate({
        type: 'blob',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE'
      });
    });
  }

  global.Contract = {
    buildData: buildData,
    render: render,
    describeError: describeError,
    contractNo: contractNo,
    contractDate: contractDate,
    money: money,
    DOCX_MIME: DOCX_MIME
  };
})(window);
