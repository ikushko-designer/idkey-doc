use strict; use warnings; local $/;
open(my $f,'<:raw',$ARGV[0]) or die; my $x=<$f>; close $f;
my $i=0;
while($x=~m{<w:p\b[^>]*>(.*?)</w:p>}gs){
  my $b=$1; my $t='';
  while($b=~m{<w:t(?:\s[^>]*)?>(.*?)</w:t>}gs){ $t.=$1 }
  $i++;
  next unless $t=~/\S/;
  printf("P%03d: %s\n",$i,$t) if $t=~/(Этап|Оплата|Срок|Продолжительность|\{\{)/;
}
