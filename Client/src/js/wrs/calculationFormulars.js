/*
  Copyright 2010-2026 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
"use strict";

/**
 * Evaluates calc:* expression trees against provided cell values.
 * JavaScript equivalent of Client/src/xslt/calculation/calculation.xslt.
 *
 * The XSLT is a code generator that emits XPath strings; this module is a
 * direct evaluator — same semantics, no code generation step.
 *
 * Supported operators (n-ary, same precedence rules as XPath):
 *   calc:Add  +    calc:Sub  -    calc:Mul  *    calc:Div  /
 *
 * Supported functions (XPath 1.0 string-trick equivalents):
 *   calc:Max(a,b)  calc:Min(a,b)  calc:Coa(a,b)  calc:Zin(a)
 *   calc:Niz(a)    calc:Abs(a)    calc:Igt(a,b)  calc:Ian(a)  calc:Sgn(a)
 *
 * Leaf nodes:
 *   calc:ValueRef  @idRef looked up via resolver(idRef) → number
 *   calc:Value     constant (text content)
 *
 * Entry points:
 *   bcdui.wrs.calculationFormulars.eval(calcElem, resolver)
 *     Evaluates a <calc:Calc> element, handling @zeroIfNullOp='true'.
 *
 *   bcdui.wrs.calculationFormulars.evalExpr(node, resolver)
 *     Evaluates any single calc:* node (no zeroIfNullOp wrapping).
 *     Used by bcdui.wrs.calculation to evaluate sub-expressions such as
 *     the denominator operand of calc:Div.
 *
 * resolver: function(idRef: string) => number
 *   Called for each calc:ValueRef.  Must return NaN for missing/empty cells.
 */
bcdui.wrs.calculationFormulars = (function() {

  const CALC_NS = "http://www.businesscode.de/schema/bcdui/calc-1.0.0";

  const calcKids = el => {
    const res = [];
    for (let c = el.firstChild; c; c = c.nextSibling)
      if (c.nodeType === 1 && c.namespaceURI === CALC_NS) res.push(c);
    return res;
  };

  /**
   * Evaluate any calc:* node (no zeroIfNullOp handling).
   * @param {Element} node
   * @param {function} resolver
   * @returns {number}
   */
  const evalExpr = (node, resolver) => {
    const ln = node.localName;

    // --- Leaf: column reference ---
    if (ln === "ValueRef") return +resolver(node.getAttribute("idRef"), node.getAttribute("aggr") || "");

    // --- Leaf: constant ---
    if (ln === "Value") return +node.textContent;

    // --- N-ary operators ---
    if (ln === "Add" || ln === "Sub" || ln === "Mul" || ln === "Div") {
      const ch = calcKids(node);
      let r = +evalExpr(ch[0], resolver);
      for (let i = 1; i < ch.length; i++) {
        const v = +evalExpr(ch[i], resolver);
        if      (ln === "Add") r += v;
        else if (ln === "Sub") r -= v;
        else if (ln === "Mul") r *= v;
        else                   r /= v;   // JS Infinity / NaN semantics match XPath 1.0
      }
      return r;
    }

    // --- Functions ---
    const ch = calcKids(node);
    const a = () => +evalExpr(ch[0], resolver);
    const b = () => +evalExpr(ch[1], resolver);

    switch (ln) {
      // Max: if av > bv take av else bv (NaN comparisons are false → bv wins, matching XPath)
      case "Max": { const av = a(), bv = b(); return av > bv ? av : bv; }
      // Min: if bv > av take av else bv
      case "Min": { const av = a(), bv = b(); return bv > av ? av : bv; }
      // Coa (coalesce): return a if not NaN, else b
      case "Coa": { const av = a(); return isNaN(av) ? b() : av; }
      // Zin (zero-if-null): NaN → 0
      case "Zin": { const av = a(); return isNaN(av) ? 0 : av; }
      // Niz (null-if-zero): 0 → NaN
      case "Niz": { const av = a(); return av === 0 ? NaN : av; }
      // Abs: strip sign
      case "Abs": return Math.abs(a());
      // Igt (is-greater-than): 1 or 0
      case "Igt": return a() > b() ? 1 : 0;
      // Ian (is-a-number): 1 or 0
      case "Ian": return isNaN(a()) ? 0 : 1;
      // Sgn (sign): -1 or +1 (0 yields +1, matching XPath string-trick)
      case "Sgn": return a() < 0 ? -1 : 1;
    }

    return NaN;
  };

  return {
    evalExpr,

    /**
     * Evaluate a <calc:Calc> element with full @zeroIfNullOp support.
     *
     * @zeroIfNullOp='true' semantics (matching the XSLT):
     *   - Each calc:ValueRef returns 0 instead of NaN during evaluation.
     *   - BUT if every ValueRef in the Calc is NaN, the overall result is NaN.
     *
     * @param {Element} calcElem  The <calc:Calc> element.
     * @param {function} resolver  function(idRef) => number
     * @returns {number}
     */
    eval(calcElem, resolver) {
      const kids = calcKids(calcElem);
      if (!kids.length) return NaN;

      if (calcElem.getAttribute("zeroIfNullOp") !== "true")
        return evalExpr(kids[0], resolver);

      // zeroIfNullOp: bail out entirely only if ALL value references are NaN
      const allRefs = Array.from(calcElem.getElementsByTagNameNS(CALC_NS, "ValueRef"));
      if (allRefs.length > 0 && allRefs.every(vr => isNaN(+resolver(vr.getAttribute("idRef"), vr.getAttribute("aggr") || ""))))
        return NaN;

      const zinRes = (id, aggr) => { const v = +resolver(id, aggr); return isNaN(v) ? 0 : v; };
      return evalExpr(kids[0], zinRes);
    }
  };
})();
