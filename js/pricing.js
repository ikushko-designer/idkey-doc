/* Расчёт стоимости и сроков. Единственный источник истины для сумм в договоре. */
(function (global) {
  'use strict';

  /* Срок по тарифной сетке.
     m2:   нижняя граница исключительная, верхняя включительная (диапазоны 0-10/10-100/100-300 перекрываются).
     view: обе границы включительные (1-5/6-9/10-100 не перекрываются).
     За пределами сетки — срок последнего диапазона + флаг outOfRange. */
  function resolveDays(rules, key, amount) {
    var rule = rules.services[key];
    if (!rule) return { days: 0, outOfRange: false };
    /* Пустая или нулевая площадь — это незаполненная форма, а не выход за тарифную сетку:
       срок 0 и без предупреждения, иначе менеджер видит «5 дней» и панику на ровном месте. */
    if (!(amount > 0)) return { days: 0, outOfRange: false };
    var mode = rules.boundary[rule.unit] || 'lowerExclusive';
    var tiers = rule.tiers;
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      var hit = mode === 'inclusive'
        ? (amount >= t.min && amount <= t.max)
        : (amount > t.min && amount <= t.max);
      if (hit) return { days: t.days, outOfRange: false };
    }
    var last = tiers[tiers.length - 1];
    if (amount > last.max) return { days: last.days, outOfRange: true };
    var first = tiers[0];
    return { days: first.days, outOfRange: true };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* state.services[key] = { checked, amount, price, days, amountManual, priceManual, daysManual } */
  function calculate(state, cfg, rules) {
    var result = { services: {}, totalSum: 0, totalDays: 0, warnings: [] };

    cfg.order.forEach(function (key) {
      var s = state.services[key];
      if (!s || !s.checked) return;
      var meta = cfg.services[key];

      var amount = s.amountManual ? num(s.amount)
                 : (meta.unit === 'm2' ? num(state.area) : cfg.twoDDefaultCount);
      var price  = s.priceManual ? num(s.price) : meta.defaultPrice;

      var auto = resolveDays(rules, key, amount);
      var days = s.daysManual ? Math.round(num(s.days)) : auto.days;

      var cost = round2(amount * price);

      result.services[key] = {
        amount: amount, price: price, cost: cost, days: days,
        autoAmount: meta.unit === 'm2' ? num(state.area) : cfg.twoDDefaultCount,
        autoPrice: meta.defaultPrice, autoDays: auto.days,
        outOfRange: auto.outOfRange, unit: meta.unit
      };
      if (auto.outOfRange && !s.daysManual) {
        result.warnings.push(meta.label + ': значение вне тарифной сетки — срок требует ручной проверки');
      }
      result.totalSum += cost;
      result.totalDays += days;
    });

    result.totalSum = round2(result.totalSum);
    result.totalSumWords = global.NumberToWords.moneyToWords(result.totalSum);
    return result;
  }

  function num(v) {
    var n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, ''));
    return isFinite(n) ? n : 0;
  }

  global.Pricing = { calculate: calculate, resolveDays: resolveDays, num: num, round2: round2 };
})(window);
