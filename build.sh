
echo "This script assumes you have a winterwell setup!"
# Useful script for updating the files from their Winterwell dev-versions

cp ~/winterwell/code/creole/web/static/code/i18n/i18n.js i18n.js


rm -rf out
jsdoc i18n.js

yuicompressor -o i18n.min.js i18n.js

copy to www

echo "Done :)"
