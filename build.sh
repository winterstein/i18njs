echo "This script assumes you have a winterwell setup!"
# Useful script for updating the files from their Winterwell dev-versions

echo ...Copy in from creole
cp ~/winterwell/code/creole/web/static/code/i18n/i18n.js .
cp ~/winterwell/code/creole/web/static/code/i18n/i18nTest.html .

echo ...JSDoc
rm -rf out
jsdoc i18n.js
echo ...compress
yuicompressor -o i18n.min.js i18n.js

echo ...Copy in+out from www
rm -rf ~/winterwell/www/software/i18njs/out
cp -R out ~/winterwell/www/software/i18njs/out

cp ~/winterwell/www/software/i18njs/HelloWorld.html .

echo ...git here
git commit -a -m "build"

echo "Done :)"

