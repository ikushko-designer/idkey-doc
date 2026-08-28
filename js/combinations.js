/* Проверка сочетания услуг по списку из для_договора.xlsx (ровно 20 вариантов). */
(function (global) {
  'use strict';

  function keyOf(list) { return list.slice().sort().join('+'); }

  function build(cfg) {
    var set = {};
    cfg.allowed.forEach(function (combo) { set[keyOf(combo)] = true; });
    return set;
  }

  /* Возвращает { ok, error } — error показывается менеджеру как есть. */
  function validate(selected, allowedSet) {
    if (!selected.length) {
      return { ok: false, error: 'Выберите хотя бы одну услугу.' };
    }
    if (allowedSet[keyOf(selected)]) return { ok: true, error: null };

    var has = {};
    selected.forEach(function (k) { has[k] = true; });

    if (has.threeD && has.twoD) {
      return { ok: false, error: '3D-визуализации и 2D-коллажи нельзя выбрать одновременно — такого договора нет ни в одном из 20 вариантов.' };
    }
    if (has.table && (has.tech1 || has.tech2) && !has.threeD && !has.twoD) {
      return { ok: false, error: 'Сочетание «Техничка + Таблица комплектации» без визуализаций не предусмотрено. Добавьте 3D-визуализации или 2D-коллажи, либо снимите «Таблицу комплектации».' };
    }
    return { ok: false, error: 'Такое сочетание услуг не предусмотрено договором. Допустимы только 20 вариантов из тарифной таблицы.' };
  }

  global.Combinations = { build: build, validate: validate };
})(window);
