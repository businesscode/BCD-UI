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
 * Filters rows and/or col-dim columns of a WRS according to an f:Filter inside an
 * xp:OrderRowsAndCols parameter set.  JavaScript equivalent of the f:Filter part of
 * orderRowsAndCols.xslt + orderRowsAndColsTemplate.xslt.
 *
 * Parameters:
 *   paramModel - DOM or DataProvider containing xp:OrderRowsAndCols
 *   paramSetId - optional id selecting the parameter set
 *
 * Two kinds of filter, distinguished by which bRef the f:Expression targets:
 *
 *   Row filter   – bRef matches a header column with @dimId (a row dimension).
 *                  f:Expression is evaluated against the row's wrs:C cell values.
 *                  Special @value constants:
 *                    dimNull  (bcdui.core.magicChar.dimEmpty = \uE0F0) – keep rows where the cell is non-empty OR @bcdGr='1'
 *                    dimTotal (bcdui.core.magicChar.dimTotal = \uE0F0 + '1') – compare the cell's @bcdGr attribute against '1'
 *                  Operator @op: =, !=, <, >, <=, >= (< > <= >= use numeric comparison).
 *
 *   Column filter – bRef matches one of the col-dim level IDs stored in
 *                   wrs:Columns/@colDimLevelIds.  The bRef's 1-based position in that
 *                   pipe-separated list determines which pipe-segment of the col-dim
 *                   measure column's @id is compared.  Only columns with @valueId where
 *                   @id != @valueId (i.e. pivoted col-dim measure columns) are affected;
 *                   row-dim columns and row-only measure columns always pass.
 *
 * f:And / f:Or nesting is supported at any depth.  Multiple direct children of f:Filter
 * are AND-ed.  An f:Expression whose bRef does not belong to the current filter context
 * (row vs. col) is ignored (treated as passing) so that row and col expressions can
 * coexist in the same f:And / f:Or without interfering.
 *
 * Was part of orderRowsAndColumns.xslt in the XSLT world. Our paramset is top-level xp:Filter now,
 * Not a child of xp:OrderRowsAndColumns anymore
 * 
 * Returns a new WRS document, or undefined if there is nothing to do.
 */
bcdui.wrs.filterRowsAndCols = function(docIn, params) {
  
  // Starting Transformer bcdui.wrs.filterRowsAndCols
  const WRS_NS = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  const XP_NS  = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
  const F_NS   = "http://www.businesscode.de/schema/bcdui/filter-1.0.0";
  const MAGIC  = bcdui.core.magicChar.dimEmpty;  // \uE0F0 – bare prefix, bcdGr digit appended

  const childElems = (el, localName) => {
    const res = [];
    if (!el) return res;
    for (let c = el.firstChild; c; c = c.nextSibling)
      if (c.nodeType === 1 && (!localName || c.localName === localName)) res.push(c);
    return res;
  };

  // ---- Resolve inputs ----
  let src = docIn;
  if (src && typeof src.getData === "function") src = src.getData();
  if (!src) return;

  let pm = params.paramModel;
  if (pm && typeof pm.getData === "function") pm = pm.getData();
  if (!pm) return;

  const psId = params.paramSetId || "";
  const paramSet = Array.from(pm.getElementsByTagNameNS(XP_NS, "Filter"))
    .find(ps => (ps.getAttribute("paramSetId") || "") === psId ||
                (!ps.getAttribute("paramSetId") && !psId));
  if (!paramSet) return;

  const filterNodes = childElems(paramSet);
  if (!filterNodes.length) return;

  // ---- Source WRS metadata ----
  const root = src.documentElement;
  const headerColsElem = childElems(childElems(root, "Header")[0], "Columns")[0];
  if (!headerColsElem) return;
  const srcCols = childElems(headerColsElem, "C");

  // id -> { idx (0-based), dimId, valueId }
  const colById = new Map(srcCols.map((c, i) => [c.getAttribute("id"), {
    idx: i,
    dimId: c.getAttribute("dimId"),
    valueId: c.getAttribute("valueId")
  }]));

  const dimIdSet = new Set(srcCols.map(c => c.getAttribute("dimId")).filter(Boolean));

  // col-dim level IDs from header attribute (only present after colDims transformation)
  const colDimLevelIds = (headerColsElem.getAttribute("colDimLevelIds") || "").split("|").filter(Boolean);
  const colDimLevelSet = new Set(colDimLevelIds);

  // ---- Value comparison ----
  const compareOp = (a, op, b) => {
    switch (op) {
      case "=":  return a === b;
      case "!=": return a !== b;
      // < > <= >= follow XPath 1.0 semantics: numeric conversion
      case "<":  return parseFloat(a) < parseFloat(b);
      case ">":  return parseFloat(a) > parseFloat(b);
      case "<=": return parseFloat(a) <= parseFloat(b);
      case ">=": return parseFloat(a) >= parseFloat(b);
    }
    return true;
  };

  // ---- Row filter evaluation (bRefs matching dimIdSet) ----
  const evalRowNode = (node, cells) => {
    const ln = node.localName;
    if (ln === "Expression") {
      const bRef = node.getAttribute("bRef");
      if (!dimIdSet.has(bRef)) return true;   // not a row-dim expression, skip
      const col = colById.get(bRef);
      if (!col) return true;
      const cell    = cells[col.idx];
      const bcdGr   = cell ? (cell.getAttribute("bcdGr") || "") : "";
      const cellVal = cell ? cell.textContent : "";
      const op      = node.getAttribute("op");
      const value   = node.getAttribute("value");
      if (value === MAGIC + "0") return cellVal !== "" || bcdGr === "1"; // dimNull: non-empty or total
      if (value === MAGIC + "1") return compareOp(bcdGr, op, "1");       // dimTotal: compare @bcdGr
      return compareOp(cellVal, op, value);
    }
    if (ln === "And") return childElems(node).every(c => evalRowNode(c, cells));
    if (ln === "Or")  return childElems(node).some(c  => evalRowNode(c, cells));
    return true;
  };

  // ---- Column filter evaluation (bRefs matching colDimLevelSet) ----
  // colId is the @id of a pivoted col-dim measure column, e.g. "DE|AWD|mProductivity"
  const evalColNode = (node, colId) => {
    const ln = node.localName;
    if (ln === "Expression") {
      const bRef = node.getAttribute("bRef");
      if (!colDimLevelSet.has(bRef)) return true;  // not a col-dim expression, skip
      const levelIdx = colDimLevelIds.indexOf(bRef);
      const parts    = colId.split("|");
      const segVal   = levelIdx < parts.length ? parts[levelIdx] : "";
      return compareOp(segVal, node.getAttribute("op"), node.getAttribute("value"));
    }
    if (ln === "And") return childElems(node).every(c => evalColNode(c, colId));
    if (ln === "Or")  return childElems(node).some(c  => evalColNode(c, colId));
    return true;
  };

  // ---- Determine which filter categories are active ----
  const hasExpressionFor = checkFn =>
    filterNodes.some(n =>
      n.localName === "Expression"
        ? checkFn(n.getAttribute("bRef"))
        : Array.from(n.getElementsByTagNameNS(F_NS, "Expression")).some(e => checkFn(e.getAttribute("bRef")))
    );

  const hasRowFilter = hasExpressionFor(bRef => dimIdSet.has(bRef));
  const hasColFilter = colDimLevelIds.length > 0 && hasExpressionFor(bRef => colDimLevelSet.has(bRef));
  if (!hasRowFilter && !hasColFilter) return;

  // ---- Determine kept column indices (0-based) ----
  // Only pivoted col-dim measure columns (valueId present, id != valueId) can be dropped.
  const keptColIdxs = srcCols.reduce((acc, c, i) => {
    const valueId = c.getAttribute("valueId");
    const id      = c.getAttribute("id");
    if (hasColFilter && valueId && id !== valueId && !filterNodes.every(n => evalColNode(n, id)))
      return acc;
    acc.push(i);
    return acc;
  }, []);

  // ---- Build result document ----
  const doc      = bcdui.core.browserCompatibility.cloneDocument(src);
  const newRoot  = doc.documentElement;
  const mkElem   = ln => doc.createElementNS(WRS_NS, ln);
  const copyAttrs = (dst, from) => {
    for (let i = 0; i < from.attributes.length; i++) {
      const a = from.attributes[i];
      dst.setAttribute(a.name, a.value);
    }
  };

  // Rebuild header if columns were dropped
  if (hasColFilter) {
    const newHeaderColsElem = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
    while (newHeaderColsElem.firstChild) newHeaderColsElem.removeChild(newHeaderColsElem.firstChild);
    let pos = 1;
    for (const idx of keptColIdxs) {
      const srcCol = srcCols[idx];
      const c = mkElem("C");
      copyAttrs(c, srcCol);
      c.setAttribute("pos", String(pos++));
      for (let ch = srcCol.firstChild; ch; ch = ch.nextSibling) c.appendChild(ch.cloneNode(true));
      newHeaderColsElem.appendChild(c);
    }
    // Column set changed: remove ValidationResult to avoid stale data
    const valRes = childElems(newRoot, "ValidationResult")[0];
    if (valRes) valRes.parentNode.removeChild(valRes);
  }

  // Rebuild data
  const dataElem    = childElems(root, "Data")[0];
  if (!dataElem) return doc;
  const newDataElem = childElems(newRoot, "Data")[0];
  while (newDataElem.firstChild) newDataElem.removeChild(newDataElem.firstChild);

  for (const row of childElems(dataElem)) {  // handles R, I, M, D
    // Row filter: test wrs:C cells only (current values, not originals)
    if (hasRowFilter) {
      const cells = childElems(row, "C");
      if (!filterNodes.every(n => evalRowNode(n, cells))) continue;
    }

    const newRow = doc.createElementNS(WRS_NS, row.localName);
    copyAttrs(newRow, row);

    if (hasColFilter) {
      // wrs:M rows carry both current (wrs:C) and original (wrs:O) values, indexed in parallel
      const cCells = childElems(row, "C");
      const oCells = childElems(row, "O");
      for (const idx of keptColIdxs) {
        newRow.appendChild(cCells[idx] ? cCells[idx].cloneNode(true) : mkElem("C"));
        if (idx < oCells.length) newRow.appendChild(oCells[idx].cloneNode(true));
      }
    } else {
      for (let ch = row.firstChild; ch; ch = ch.nextSibling) newRow.appendChild(ch.cloneNode(true));
    }

    newDataElem.appendChild(newRow);
  }

  return doc;
};

bcdui.wrs.filterRowsAndCols.bcdName = "bcdui.wrs.filterRowsAndCols";