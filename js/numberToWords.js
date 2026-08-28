/* Сумма прописью на русском, со склонением рублей и копеек. */
(function (global) {
  'use strict';

  var ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  var ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  var TEENS  = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
                'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  var TENS   = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят',
                'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  var HUNDS  = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот',
                'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  // Формы: [1, 2-4, 5-0] — «рубль / рубля / рублей»
  var SCALES = [
    { forms: null,                                     feminine: false },
    { forms: ['тысяча', 'тысячи', 'тысяч'],            feminine: true  },
    { forms: ['миллион', 'миллиона', 'миллионов'],     feminine: false },
    { forms: ['миллиард', 'миллиарда', 'миллиардов'],  feminine: false },
    { forms: ['триллион', 'триллиона', 'триллионов'],  feminine: false }
  ];

  function plural(n, forms) {
    var n10 = n % 10, n100 = n % 100;
    if (n100 > 10 && n100 < 20) return forms[2];
    if (n10 === 1) return forms[0];
    if (n10 >= 2 && n10 <= 4) return forms[1];
    return forms[2];
  }

  function tripletToWords(n, feminine) {
    var out = [];
    var h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
    if (h) out.push(HUNDS[h]);
    if (t === 1) {
      out.push(TEENS[o]);
    } else {
      if (t) out.push(TENS[t]);
      if (o) out.push(feminine ? ONES_F[o] : ONES_M[o]);
    }
    return out;
  }

  /* 142000 -> "сто сорок две тысячи" */
  function intToWords(value) {
    var n = Math.floor(Math.abs(value));
    if (n === 0) return 'ноль';
    var triplets = [];
    while (n > 0) { triplets.push(n % 1000); n = Math.floor(n / 1000); }
    var words = [];
    for (var i = triplets.length - 1; i >= 0; i--) {
      var t = triplets[i];
      if (!t) continue;
      /* Выше триллионов честно расписать не можем — лучше вернуть цифры, чем неверное слово */
      if (i >= SCALES.length) return String(Math.floor(Math.abs(value)));
      var scale = SCALES[i];
      words = words.concat(tripletToWords(t, scale.feminine));
      if (scale.forms) words.push(plural(t, scale.forms));
    }
    return words.join(' ');
  }

  /* 142000 -> "сто сорок две тысячи рублей 00 копеек" */
  function moneyToWords(value) {
    var total = Math.round(Math.abs(value) * 100);
    var rub = Math.floor(total / 100);
    var kop = total % 100;
    var words = intToWords(rub);
    words = words.charAt(0).toUpperCase() + words.slice(1);
    return words + ' ' + plural(rub, ['рубль', 'рубля', 'рублей']) + ' ' +
           (kop < 10 ? '0' + kop : String(kop)) + ' ' +
           plural(kop, ['копейка', 'копейки', 'копеек']);
  }

  global.NumberToWords = { intToWords: intToWords, moneyToWords: moneyToWords, plural: plural };
})(window);
