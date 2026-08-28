#!/bin/sh
# Пересборка templates/master_template.docx из исходника заказчика build/source.docx.
# Запускать из Git Bash: sh build/rebuild.sh
set -e
cd "$(dirname "$0")"

echo "1/4 распаковываю source.docx"
rm -rf tpl && mkdir tpl
unzip -o -q source.docx -d tpl

echo "2/4 перестраиваю document.xml"
perl build_template.pl tpl/word/document.xml tpl/word/document.built.xml

echo "3/4 сверяю, что текст договора не пострадал"
perl verify.pl tpl/word/document.xml tpl/word/document.built.xml

echo "4/4 собираю .docx"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "repack.ps1" "$(cd .. && pwd -W)"

echo
echo "Готово. Обязательно прогоните build/test.html — все 20 комбинаций должны быть зелёными."
