use strict; use warnings; local $/;
# Готовит master_template.docx из EXAMPLE v1.docx:
#  1) склеивает плейсхолдеры, разорванные Word'ом на несколько run'ов
#  2) заменяет статичные номера этапов и перекрёстные ссылки на плейсхолдеры
#  3) выносит теги условных секций в отдельные абзацы
#  4) оборачивает таблицу «Созвон/ТЗ для документации» в {{#TECH_SECTION}}

my @RULES = (
  ['в течение 3 дней с даты согласования Этапа №1\.1' => '{{PAY_TECH2}}'],
  ['в течение 3 дней с даты завершения Этапа №2\.2'   => '{{PAY_TABLE}}'],
  ['всех планов и чертежей Этапов №1\.1, 1\.2'        => '{{TECH_STAGES_REF}}'],
  ['Этапов №2\.1, 2\.2' => 'Этапов №{{S_VIS1}}, {{S_VIS2}}'],
['Этап №1\.0' => 'Этап №{{S_TECH0}}'],
  ['Этапа №1\.1' => 'Этапа №{{S_TECH1}}'],  ['Этап №1\.1' => 'Этап №{{S_TECH1}}'],
  ['Этапа №1\.2' => 'Этапа №{{S_TECH2}}'],  ['Этап №1\.2' => 'Этап №{{S_TECH2}}'],
  ['Этапа №2\.0' => 'Этапа №{{S_VIS0}}'],   ['Этап №2\.0' => 'Этап №{{S_VIS0}}'],
  ['Этапа №2\.1' => 'Этапа №{{S_VIS1}}'],   ['Этап №2\.1' => 'Этап №{{S_VIS1}}'],
  ['Этапа №2\.2' => 'Этапа №{{S_VIS2}}'],   ['Этап №2\.2' => 'Этап №{{S_VIS2}}'],
  ['Этапа №3'    => 'Этапа №{{S_TABLE}}'],  ['Этап №3'    => 'Этап №{{S_TABLE}}'],
  ['Оплата 1\.1' => 'Оплата {{S_TECH1}}'],  ['Оплата 1\.2' => 'Оплата {{S_TECH2}}'],
  ['Оплата 2\.1' => 'Оплата {{S_VIS1}}'],   ['Оплата 2\.2' => 'Оплата {{S_VIS2}}'],
  ['Оплата 3 \|' => 'Оплата {{S_TABLE}} |'],
  ['\{\{TECH1_PR\}\}' => '{{TECH1_COST}}'],
  ['\{\{TECH2_PR\}\}' => '{{TECH2_COST}}'],
  ['\{\{TABLE_PR\}\}' => '{{TABLE_COST}}'],
  ['\(\{\{TOTAL_SUM_WORDS\}\}\)рублей\)' => '({{TOTAL_SUM_WORDS}})'],
  ['по горизонту пола \{\{AREA\}\}' => 'по горизонту пола {{AREA}} кв.м'],
  ['проекта:(?:\s|\xc2\xa0)*\{\{TOTAL_DAYS\}\}' => 'проекта: {{TOTAL_DAYS}} раб. дней'],
);
my (%hits, $merged, $split); $merged=0; $split=0;

open(my $in,'<:raw',$ARGV[0]) or die "нет входного файла: $!";
my $xml = <$in>; close $in;

sub runs_of {
  my ($body)=@_; my @r;
  while ($body =~ m{<w:t(\s[^>]*)?>(.*?)</w:t>}gs) {
    push @r, { attr=>(defined $1?$1:''), text=>$2, s=>$-[0], e=>$+[0] };
  }
  return @r;
}
sub bounds_of { my @t=@_; my @b; my $a=0; for (@t){ push @b,$a; $a+=length($_) } return @b; }

# Заменяет [$b..$e] склеенного текста на $rep. Удаление идёт справа налево,
# смещения берутся из снимка ДО изменений — иначе координаты «уезжают».
sub splice_span {
  my ($texts,$changed,$b,$e,$rep)=@_;
  my @bd = bounds_of(@$texts);
  my ($ra,$rb);
  for my $r (0..$#$texts) {
    my $rs=$bd[$r]; my $rr=$rs+length($texts->[$r])-1;
    $ra=$r if !defined($ra) && $b>=$rs && $b<=$rr;
    $rb=$r if $e>=$rs && $e<=$rr;
  }
  return 0 unless defined $ra && defined $rb;
  for my $r (reverse $ra..$rb) {
    my $rs=$bd[$r]; my $rr=$rs+length($texts->[$r])-1;
    my $cb=$b>$rs?$b:$rs; my $ce=$e<$rr?$e:$rr;
    substr($texts->[$r], $cb-$rs, $ce-$cb+1)='';
    $changed->[$r]=1;
  }
  substr($texts->[$ra], $b-$bd[$ra], 0) = $rep;
  $changed->[$ra]=1;
  return 1;
}
sub writeback {
  my ($body,$runs,$texts,$changed)=@_;
  for my $r (reverse 0..$#$runs) {
    next unless $changed->[$r];
    my $a=$runs->[$r]{attr}; $a .= ' xml:space="preserve"' unless $a=~/xml:space/;
    substr($$body,$runs->[$r]{s},$runs->[$r]{e}-$runs->[$r]{s}) = "<w:t$a>$texts->[$r]</w:t>";
  }
}

# --- 1+2: склейка тегов и текстовые замены ---
$xml =~ s{(<w:p\b[^>]*>)(.*?)(</w:p>)}{ $1 . edit_para($2) . $3 }gse;
sub edit_para {
  my ($body)=@_;
  my @runs = runs_of($body); return $body unless @runs;
  my @texts = map { $_->{text} } @runs;
  my @changed = (0) x @runs;
  # склейка разорванных тегов
  my $guard=0;
  while (++$guard < 200) {
    my $all = join('',@texts); my $done=1;
    my @bd = bounds_of(@texts);
    while ($all =~ /\{\{[^{}]*\}\}/gs) {
      my ($b,$e,$tag)=($-[0],$+[0]-1,$&);
      my ($ra,$rb);
      for my $r (0..$#texts) {
        my $rs=$bd[$r]; my $rr=$rs+length($texts[$r])-1;
        $ra=$r if !defined($ra) && $b>=$rs && $b<=$rr;
        $rb=$r if $e>=$rs && $e<=$rr;
      }
      next if !defined($ra) || !defined($rb) || $ra==$rb;
      splice_span(\@texts,\@changed,$b,$e,$tag); $merged++; $done=0; last;
    }
    last if $done;
  }
  # текстовые замены
  for my $rule (@RULES) {
    my ($re,$rep)=@$rule; my $from=0; my $g=0;
    while (++$g < 50) {
      my $all = join('',@texts);
      last if $from > length($all);
      pos($all)=$from;
      last unless $all =~ /$re/g;
      my ($b,$e)=($-[0],$+[0]-1);
      splice_span(\@texts,\@changed,$b,$e,$rep) or last;
      $from = $b + length($rep);
      $hits{$re}++;
    }
  }
  writeback(\$body,\@runs,\@texts,\@changed);
  return $body;
}

# --- 3: теги секций в отдельные абзацы ---
$xml =~ s{(<w:p\b[^>]*>)(.*?)(</w:p>)}{ split_para($1,$2,$3) }gse;
sub split_para {
  my ($open,$body,$close)=@_;
  my @runs = runs_of($body); return "$open$body$close" unless @runs;
  my @texts = map { $_->{text} } @runs;
  my $all = join('',@texts);
  my @tags = ($all =~ /(\{\{[#\/][A-Z0-9_]+\}\})/g);
  return "$open$body$close" unless @tags;
  (my $rest=$all) =~ s/\{\{[#\/][A-Z0-9_]+\}\}//g;
  return "$open$body$close" unless $rest =~ /\S/;
  my @changed=(0) x @runs;
  for my $tag (@tags) {
    my $j=join('',@texts); my $p=index($j,$tag); next if $p<0;
    splice_span(\@texts,\@changed,$p,$p+length($tag)-1,'');
  }
  writeback(\$body,\@runs,\@texts,\@changed);
  $split += scalar @tags;
  my $pre = join('', map { "<w:p><w:r><w:t>$_</w:t></w:r></w:p>" } @tags);
  return "$pre$open$body$close";
}

# --- 4: обёртка TECH_SECTION вокруг таблицы «Этап №{{S_TECH0}}» ---
my $anchor = index($xml,'{{S_TECH0}}');
die "не найден якорь {{S_TECH0}}" if $anchor<0;
my $ts = rindex($xml,'<w:tbl>',$anchor);
my $te = index($xml,'</w:tbl>',$anchor);
die "не найдена таблица вокруг этапа-созвона" if $ts<0 || $te<0;
$te += length('</w:tbl>');
substr($xml,$te,0) = '<w:p><w:r><w:t>{{/TECH_SECTION}}</w:t></w:r></w:p>';
substr($xml,$ts,0) = '<w:p><w:r><w:t>{{#TECH_SECTION}}</w:t></w:r></w:p>';

open(my $out,'>:raw',$ARGV[1]) or die; print $out $xml; close $out;
print "склеено разорванных тегов: $merged\n";
print "вынесено тегов секций в отдельные абзацы: $split\n";
my @miss = grep { !$hits{$_->[0]} } @RULES;
if (@miss) { print "НЕ СРАБОТАЛО ПРАВИЛО: $_->[0]\n" for @miss }
else { print "все правила замен сработали\n" }
