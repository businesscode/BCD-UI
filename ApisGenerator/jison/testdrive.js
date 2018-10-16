const bcdui_util_xml_filterExpressionParser = require('./bcdui_util_xml_filterExpressionParser');

const parseFilterExpression = (expression, params) => {
  var parser = new bcdui_util_xml_filterExpressionParser.Parser();
  parser.yy = {
    resolveVariable : v => params[parser.yy.escapeHtml(v.substring(1))],
    escapeHtml : v => v.replace(/</g,'&lt;')
  };
  return parser.parse(expression);
};

console.info(parseFilterExpression("countryId='DE'"));
console.info(parseFilterExpression("id=:id and date <= :now42",{id:'myId', now42:new Date()}));
console.info(parseFilterExpression("initiativeId= 'initId'"));
console.info(parseFilterExpression("initiativeId_32!='initId'"));
console.info(parseFilterExpression("op in 'a,b,c'"));
console.info(parseFilterExpression("op notIn 'a,b,c'"));
console.info(parseFilterExpression("op like 'a*b'"));
console.info(parseFilterExpression("op notLike 'a*b'"));
console.info(parseFilterExpression("op bitand '0'"));
console.info(parseFilterExpression("(op = '2' or op = '3') and not(op = '4')"));
