param($base)
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$dst = Join-Path $base 'templates\master_template.docx'
Copy-Item (Join-Path $base 'build\source.docx') $dst -Force
$zip = [System.IO.Compression.ZipFile]::Open($dst, [System.IO.Compression.ZipArchiveMode]::Update)
($zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }).Delete()
$e = $zip.CreateEntry('word/document.xml', [System.IO.Compression.CompressionLevel]::Optimal)
$s = $e.Open()
$b = [System.IO.File]::ReadAllBytes((Join-Path $base 'build\tpl\word\document.built.xml'))
$s.Write($b, 0, $b.Length); $s.Close(); $zip.Dispose()
"master_template.docx: OK, $((Get-Item $dst).Length) bytes"
