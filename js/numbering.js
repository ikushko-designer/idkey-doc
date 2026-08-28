/* Сквозная нумерация этапов и перекрёстные ссылки в тексте договора.

   Группы идут подряд по факту присутствия:
     1) документация  — созвон/ТЗ (X.0), план расстановки мебели (X.n), вторая часть (X.n)
     2) визуализация  — созвон/ТЗ (Y.0), концепт (Y.1), финал (Y.2)
     3) таблица комплектации — одиночный номер Z, без подпунктов

   Примеры: Т1+Т2+3D+Табл -> 1.0 1.1 1.2 | 2.0 2.1 2.2 | 3
            только Т2     -> 1.0 1.1
            только Табл   -> 1                                            */
(function (global) {
  'use strict';

  var PAY_ON_SIGNING = 'в течение 3 дней с даты подписания договора';

  function build(flags) {
    var hasTech = !!(flags.tech1 || flags.tech2);
    var hasVis  = !!(flags.threeD || flags.twoD);
    var hasTable = !!flags.table;

    var g = 0;
    var techNo = hasTech ? ++g : null;
    var visNo  = hasVis  ? ++g : null;
    var tableNo = hasTable ? ++g : null;

    var out = {
      S_TECH0: '', S_TECH1: '', S_TECH2: '',
      S_VIS0: '', S_VIS1: '', S_VIS2: '',
      S_TABLE: ''
    };

    if (hasTech) {
      var sub = 0;
      out.S_TECH0 = techNo + '.' + sub++;
      if (flags.tech1) out.S_TECH1 = techNo + '.' + sub++;
      if (flags.tech2) out.S_TECH2 = techNo + '.' + sub++;
    }
    if (hasVis) {
      out.S_VIS0 = visNo + '.0';
      out.S_VIS1 = visNo + '.1';
      out.S_VIS2 = visNo + '.2';
    }
    if (hasTable) out.S_TABLE = String(tableNo);

    /* Срок оплаты второй части технички: после первой части, а если её нет — от подписания */
    out.PAY_TECH2 = flags.tech1
      ? 'в течение 3 дней с даты согласования Этапа №' + out.S_TECH1
      : PAY_ON_SIGNING;

    /* Срок оплаты таблицы комплектации: после визуальной части, иначе после технички, иначе от подписания */
    if (hasVis) {
      out.PAY_TABLE = 'в течение 3 дней с даты завершения Этапа №' + out.S_VIS2;
    } else if (flags.tech2) {
      out.PAY_TABLE = 'в течение 3 дней с даты согласования Этапа №' + out.S_TECH2;
    } else if (flags.tech1) {
      out.PAY_TABLE = 'в течение 3 дней с даты согласования Этапа №' + out.S_TECH1;
    } else {
      out.PAY_TABLE = PAY_ON_SIGNING;
    }

    /* п.4.7 — ссылка на чертежи, которые должны быть согласованы до визуализаций */
    if (flags.tech1 && flags.tech2) {
      out.TECH_STAGES_REF = 'всех планов и чертежей Этапов №' + out.S_TECH1 + ', ' + out.S_TECH2;
    } else if (flags.tech1) {
      out.TECH_STAGES_REF = 'всех планов и чертежей Этапа №' + out.S_TECH1;
    } else if (flags.tech2) {
      out.TECH_STAGES_REF = 'всех планов и чертежей Этапа №' + out.S_TECH2;
    } else {
      out.TECH_STAGES_REF = 'всех планов и чертежей, предоставленных Заказчиком';
    }

    return out;
  }

  global.Numbering = { build: build };
})(window);
