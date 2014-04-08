echo "This script assumes you have a winterwell setup!"
# Useful script for updating the files from their Winterwell dev-versions

echo ...JSDoc
rm -rf out
jsdoc i18n.js
echo ...compress
yuicompressor -o i18n.min.js i18n.js
cp i18n.min.js ~/winterwell/code/creole/web/static/code/i18n/i18n.min.js

echo ...Copy to creole
cp i18n.js ~/winterwell/sodash/web/static/code/i18n/
cp i18n.min.js ~/winterwell/sodash/web/static/code/i18n/

echo ...Copy in+out from www
rm -rf ~/winterwell/www/software/i18njs/out
cp -R out ~/winterwell/www/software/i18njs/out

cp i18n.min.js ~/winterwell/www/software/i18njs/i18n.min.js
cp i18n.js ~/winterwell/www/software/i18njs/i18n.js
cp ~/winterwell/www/software/i18njs/HelloWorld.html .

echo ...git here
git commit -a -m "build"

echo "Done :)"

