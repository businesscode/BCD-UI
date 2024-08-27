import "../3rdParty/modernizr.js"
import "../3rdParty/log4javascript/log4javascript.js"
import "../3rdParty/jquery.js"
let _tpl = null;
try {
  eval("const _evalTest=42;");
  _tpl = await import ("../3rdParty/doT.js");
} catch (e) {
  _tpl = await import ("../3rdParty/liquid.js").then(function(mod){  
    window.bcdLiquid = new mod.Liquid();
    window.doT = {};
    doT.template = (tpl) => {
      const liqTemplate = bcdLiquid.parse(tpl.replace(/=it\[/g, "=it.[").replace(/=it\./g, ""));
      return (obj) => { return bcdLiquid.renderSync(liqTemplate, obj); }
    }
    doT.compile = (tpl) => { return doT.template(tpl); }
  });
}

export const _bcdTemplateLib = _tpl;
