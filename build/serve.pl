#!/usr/bin/perl
# Одноразовый статический сервер для локальной проверки перед публикацией.
# В продакшене не нужен: на GitHub Pages статику отдаёт сам GitHub.
#   perl build/serve.pl 8765 .
use strict;
use warnings;
use IO::Socket::INET;

my $port = shift || 8765;
my $root = shift || '.';

my %MIME = (
  html => 'text/html; charset=utf-8',
  css  => 'text/css; charset=utf-8',
  js   => 'application/javascript; charset=utf-8',
  json => 'application/json; charset=utf-8',
  png  => 'image/png',
  jpg  => 'image/jpeg',
  docx => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
);

my $srv = IO::Socket::INET->new(
  LocalAddr => '127.0.0.1', LocalPort => $port,
  Listen => 20, ReuseAddr => 1, Proto => 'tcp'
) or die "не удалось занять порт $port: $!\n";

$| = 1;
print "слушаю http://127.0.0.1:$port/  (корень: $root)\n";

while (my $c = $srv->accept) {
  my $line = <$c>;
  unless (defined $line) { close $c; next }
  while (my $h = <$c>) { last if $h =~ /^\r?\n$/ }   # дочитываем заголовки

  my ($method, $path) = $line =~ /^(\w+)\s+(\S+)/;
  $path = '/' unless defined $path;
  $path =~ s/\?.*$//;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  $path = '/index.html' if $path eq '/';
  $path =~ s/\.\.//g;                                 # не выпускаем за корень

  my $file = $root . $path;
  if (-f $file) {
    my ($ext) = $file =~ /\.([A-Za-z0-9]+)$/;
    my $type = $MIME{ lc($ext || '') } || 'application/octet-stream';
    open(my $fh, '<:raw', $file) or next;
    local $/;
    my $body = <$fh>;
    close $fh;
    print $c "HTTP/1.1 200 OK\r\nContent-Type: $type\r\n"
           . "Content-Length: " . length($body) . "\r\n"
           . "Cache-Control: no-store\r\nConnection: close\r\n\r\n";
    binmode $c;
    print $c $body;
    print "200 $path\n";
  } else {
    my $body = "not found: $path";
    print $c "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\n"
           . "Content-Length: " . length($body) . "\r\nConnection: close\r\n\r\n$body";
    print "404 $path\n";
  }
  close $c;
}
