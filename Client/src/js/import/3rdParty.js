import "../3rdParty/modernizr.js"
import "../3rdParty/log4javascript/log4javascript.js"
import "../3rdParty/jquery.js"

// if eval is allowed, import doT.js, otherwise don't use dott rendering/templates
let _tpl = null;
try {
  eval("const _evalTest=42;");
  _tpl = await import ("../3rdParty/doT.js");
} catch (e) { }

export const _bcdTemplateLib = _tpl;
