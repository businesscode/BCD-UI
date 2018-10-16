# Install
  https://www.npmjs.com/package/jison
# Docu
  https://gerhobbelt.github.io/jison/docs/#installation
# Build
$ jison jison/filterExpressionParser.jison -m js -o build/gensrc/js/jison/bcdui_util_xml_filterExpressionParser.js
# Testrun
$ cd jison
$ jison bcdui_util_xml_filterExpressionParser.jison; node testdrive.js
