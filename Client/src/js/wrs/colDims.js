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
 * Pivots a WRS by turning some dimension columns into column headers (cross-tab).
 * JavaScript equivalent of the colDims.xslt + colDimsTemplate.xslt XSLT pair.
 *
 * Parameters:
 *   paramModel        - DOM or DataProvider with xp:ColDims parameter sets
 *   paramSetId        - optional id selecting the parameter set
 *   colDimNrOfColDims - simple mode: last N dim columns become col headers
 *
 * Returns a new WRS document, or undefined if there is nothing to do.
 *
 * Intentional deviations from the XSLT pair:
 *  - Sorting (@sort / @total on LevelRef) is not applied; column order follows
 *    document order of the first occurrence of each col-dim key, same as the
 *    XSLT when no ColSorting is active.
 *  - The row full-key uses \x00 as separator between row-dim key and col-dim key
 *    (the XSLT has none), which avoids ambiguity when values contain "|".
 */
bcdui.wrs.colDims = function(docIn, params) {

  // Starting Transformer bcdui.wrs.colDims  
  const WRS_NS = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  const XP_NS  = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
  const MAGIC  = bcdui.core.magicChar.dimEmpty;   // bare &#xE0F0; prefix; bcdGr ("1","0","") is appended to form the full marker

  const childElems = (el, localName) => {
    const res = [];
    if (!el) return res;
    for (let c = el.firstChild; c; c = c.nextSibling)
      if (c.nodeType === 1 && c.localName === localName) res.push(c);
    return res;
  };

  let src = docIn;
  if (src && typeof src.getData === "function") src = src.getData();
  if (!src) return;

  const root = src.documentElement;
  const headerColsElem = childElems(childElems(root, "Header")[0], "Columns")[0];
  const srcCols = headerColsElem ? childElems(headerColsElem, "C") : [];
  if (!srcCols.length) return;

  const colById = new Map(srcCols.map(c => [c.getAttribute("id"), c]));

  // ---- Determine layout ----
  let rowDimBRefs = [], colDimBRefs = [], rowMeasBRefs = [], allMeasBRefs = [];
  let colDimLevelCaptions = "";
  let firstColDimHasTotal = false;   // whether the first col-dim LevelRef carries @total
  const nrOfColDims = params.colDimNrOfColDims !== undefined ? Number(params.colDimNrOfColDims) : -1;

  if (nrOfColDims >= 0) {
    const dimCols  = srcCols.filter(c => c.getAttribute("dimId"));
    const measCols = srcCols.filter(c => c.getAttribute("valueId"));
    const nRow = dimCols.length - nrOfColDims;
    rowDimBRefs  = dimCols.slice(0, nRow).map(c => c.getAttribute("id"));
    colDimBRefs  = dimCols.slice(nRow).map(c => c.getAttribute("id"));
    allMeasBRefs = measCols.map(c => c.getAttribute("id"));
  } else {
    let pm = params.paramModel;
    if (pm && typeof pm.getData === "function") pm = pm.getData();
    const psId = params.paramSetId || "";
    if (!pm) return;
    const paramSet = Array.from(pm.getElementsByTagNameNS(XP_NS, "ColDims"))
      .find(ps => (ps.getAttribute("paramSetId") || "") === psId ||
                  (!ps.getAttribute("paramSetId") && !psId));
    if (!paramSet) return;

    const dims = childElems(paramSet, "Dimensions")[0];
    const meas  = childElems(paramSet, "Measures")[0];
    const rowDimElems  = childElems(childElems(dims, "Rows")[0],    "LevelRef");
    const colDimElems  = childElems(childElems(dims, "Columns")[0], "LevelRef");
    const rowMeasElems = childElems(childElems(meas, "RowDims")[0], "MeasureRef");
    const allMeasElems = childElems(childElems(meas, "AllDims")[0],  "MeasureRef");

    rowDimBRefs         = rowDimElems.map(r => r.getAttribute("bRef"));
    colDimBRefs         = colDimElems.map(r => r.getAttribute("bRef"));
    rowMeasBRefs        = rowMeasElems.map(r => r.getAttribute("bRef"));
    allMeasBRefs        = allMeasElems.map(r => r.getAttribute("bRef"));
    colDimLevelCaptions  = colDimElems.map(r => r.getAttribute("caption") || "").join("|");
    firstColDimHasTotal  = colDimElems.length > 0 && !!colDimElems[0].getAttribute("total");
  }

  if (!allMeasBRefs.length && !rowMeasBRefs.length) return;

  // 0-based position of a bRef in srcCols
  const bRefToIdx = id => {
    const c = colById.get(id);
    return c ? (parseInt(c.getAttribute("pos"), 10) - 1) : -1;
  };

  // Key for grand-total row (all col-dims are totals): &#xE0F0;1| repeated
  const emptyColDimKey = colDimBRefs.map(() => MAGIC + "1|").join("");

  // Key contribution of one cell: value, or &#xE0F0;+bcdGr when empty
  const cellKeyPart = (cells, idx) => {
    if (idx < 0) return MAGIC + "|";
    const cell  = cells[idx];
    const val   = cell ? cell.textContent : "";
    const bcdGr = cell ? (cell.getAttribute("bcdGr") || "") : "";
    return val === "" ? (MAGIC + bcdGr + "|") : (val + "|");
  };

  // Whether the header column has a caption wrs:A child (determines caption source)
  const hasACaption = id => {
    const c = colById.get(id);
    return c && childElems(c, "A").some(a => a.getAttribute("name") === "caption");
  };

  const getColDimKey     = cells => colDimBRefs.map(b => cellKeyPart(cells, bRefToIdx(b))).join("");
  const getRowDimKey     = cells => rowDimBRefs.map(b => cellKeyPart(cells, bRefToIdx(b))).join("");
  const getColDimCaption = cells =>
    colDimBRefs.map(b => {
      const idx  = bRefToIdx(b);
      const cell = idx >= 0 ? cells[idx] : null;
      const text = hasACaption(b)
        ? (cell ? (cell.getAttribute("caption") || "") : "")
        : (cell ? cell.textContent : "");
      return text + "|";
    }).join("");

  const getCells = r => childElems(r, "C");

  // ---- Scan rows ----
  const dataElem = childElems(root, "Data")[0];
  if (!dataElem) return;
  const rows = childElems(dataElem, "R");

  // fullKey -> first row with that combination
  const rowByFullKey = new Map();
  for (const row of rows) {
    const cells = getCells(row);
    const fk = getRowDimKey(cells) + "\x00" + getColDimKey(cells);
    if (!rowByFullKey.has(fk)) rowByFullKey.set(fk, row);
  }

  // Distinct col-dim keys in doc order.
  // The grand-total key (emptyColDimKey) is included only when the first col-dim
  // LevelRef has @total set, matching the XSLT's OR condition on that attribute.
  const colDimInfos = [];
  const seenCk = new Set();
  for (const row of rows) {
    const cells = getCells(row);
    const ck = getColDimKey(cells);
    if (!firstColDimHasTotal && (ck === emptyColDimKey || ck.includes("||"))) continue;
    if (!seenCk.has(ck)) {
      seenCk.add(ck);
      colDimInfos.push({ key: ck, caption: getColDimCaption(cells), row });
    }
  }

  // Distinct row-dim keys in doc order, tracking the first (lead) row
  const rowDimKeys = [];
  const seenRk = new Set();
  const leadRowByRk = new Map();
  for (const row of rows) {
    const cells = getCells(row);
    const rk = getRowDimKey(cells);
    if (!seenRk.has(rk)) {
      seenRk.add(rk);
      rowDimKeys.push(rk);
      leadRowByRk.set(rk, row);
    }
  }

  // ---- Build result document ----
  const doc = bcdui.core.browserCompatibility.cloneDocument(src);
  const newRoot = doc.documentElement;

  const mkElem = ln => doc.createElementNS(WRS_NS, ln);

  const copyAttrs = (dst, from) => {
    for (let i = 0; i < from.attributes.length; i++) {
      const a = from.attributes[i];
      dst.setAttribute(a.name, a.value);
    }
  };

  const copyCell = srcCell => {
    const c = mkElem("C");
    if (srcCell) {
      copyAttrs(c, srcCell);
      for (let ch = srcCell.firstChild; ch; ch = ch.nextSibling)
        c.appendChild(ch.cloneNode(true));
    }
    return c;
  };

  // ---- Rebuild wrs:Columns ----
  const newHeaderColsElem = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
  while (newHeaderColsElem.firstChild) newHeaderColsElem.removeChild(newHeaderColsElem.firstChild);
  Array.from(newHeaderColsElem.attributes)
    .filter(a => !a.name.startsWith("xmlns"))
    .forEach(a => newHeaderColsElem.removeAttribute(a.name));

  newHeaderColsElem.setAttribute("colDimLevelIds",      colDimBRefs.join("|"));
  newHeaderColsElem.setAttribute("colDimLevelCaptions", colDimLevelCaptions);
  newHeaderColsElem.setAttribute("colDimLevelTypeNames",     colDimBRefs.map(b => { const c = colById.get(b); return c ? (c.getAttribute("type-name") || "") : ""; }).join("|"));

  let pos = 1;

  // Row dimension columns
  for (const bRef of rowDimBRefs) {
    const srcCol = colById.get(bRef);
    if (!srcCol) continue;
    const c = mkElem("C");
    copyAttrs(c, srcCol);
    c.setAttribute("pos",   String(pos++));
    c.setAttribute("dimId", srcCol.getAttribute("id") || bRef);
    for (let ch = srcCol.firstChild; ch; ch = ch.nextSibling) c.appendChild(ch.cloneNode(true));
    newHeaderColsElem.appendChild(c);
  }

  // Row-only measure columns
  for (const bRef of rowMeasBRefs) {
    const srcCol = colById.get(bRef);
    if (!srcCol) continue;
    const c = mkElem("C");
    copyAttrs(c, srcCol);
    c.setAttribute("pos",     String(pos++));
    c.setAttribute("id",      srcCol.getAttribute("id") || bRef);
    c.setAttribute("caption", srcCol.getAttribute("caption") || "");
    c.setAttribute("valueId", srcCol.getAttribute("valueId") || srcCol.getAttribute("id") || bRef);
    childElems(srcCol, "A").forEach(a => c.appendChild(a.cloneNode(true)));
    newHeaderColsElem.appendChild(c);
  }

  // All-dims measure columns: one set per col-dim combination (or directly if no col dims)
  if (colDimInfos.length > 0) {
    for (const { key: ck, caption: ckCap, row: ckRow } of colDimInfos) {
      for (const bRef of allMeasBRefs) {
        const srcCol = colById.get(bRef);
        if (!srcCol) continue;
        const c = mkElem("C");
        copyAttrs(c, srcCol);
        copyAttrs(c, ckRow);  // preserves attributes like bcdVdm from the source row
        c.setAttribute("pos",     String(pos++));
        c.setAttribute("id",      ck + (srcCol.getAttribute("id") || bRef));
        c.setAttribute("caption", ckCap + (srcCol.getAttribute("caption") || ""));
        c.setAttribute("valueId", srcCol.getAttribute("valueId") || srcCol.getAttribute("id") || bRef);
        childElems(srcCol, "A").forEach(a => c.appendChild(a.cloneNode(true)));
        newHeaderColsElem.appendChild(c);
      }
    }
  } else {
    for (const bRef of allMeasBRefs) {
      const srcCol = colById.get(bRef);
      if (!srcCol) continue;
      const c = mkElem("C");
      copyAttrs(c, srcCol);
      c.setAttribute("pos",     String(pos++));
      c.setAttribute("id",      srcCol.getAttribute("id") || bRef);
      c.setAttribute("caption", srcCol.getAttribute("caption") || "");
      c.setAttribute("valueId", srcCol.getAttribute("valueId") || srcCol.getAttribute("id") || bRef);
      childElems(srcCol, "A").forEach(a => c.appendChild(a.cloneNode(true)));
      newHeaderColsElem.appendChild(c);
    }
  }

  // ---- Rebuild wrs:Data ----
  const newDataElem = childElems(newRoot, "Data")[0];
  while (newDataElem.firstChild) newDataElem.removeChild(newDataElem.firstChild);

  for (const rk of rowDimKeys) {
    const leadRow  = leadRowByRk.get(rk);
    const newRow   = mkElem("R");
    copyAttrs(newRow, leadRow);
    const leadCells = getCells(leadRow);

    // Row dim cells from the lead row of this row group
    for (const bRef of rowDimBRefs) {
      const idx = bRefToIdx(bRef);
      newRow.appendChild(copyCell(idx >= 0 ? leadCells[idx] : null));
    }

    // Row-only measure cells from the grand-total col-dim row (rowKey + emptyColDimKey)
    if (rowMeasBRefs.length) {
      const totalRow   = rowByFullKey.get(rk + "\x00" + emptyColDimKey);
      const totalCells = totalRow ? getCells(totalRow) : [];
      for (const bRef of rowMeasBRefs) {
        const idx = bRefToIdx(bRef);
        newRow.appendChild(copyCell(idx >= 0 ? totalCells[idx] : null));
      }
    }

    // All-dims measure cells per col-dim key; empty wrs:C when no matching row
    if (colDimInfos.length > 0) {
      for (const { key: ck } of colDimInfos) {
        const dataRow   = rowByFullKey.get(rk + "\x00" + ck);
        const dataCells = dataRow ? getCells(dataRow) : [];
        for (const bRef of allMeasBRefs) {
          const idx = bRefToIdx(bRef);
          newRow.appendChild(copyCell(idx >= 0 ? dataCells[idx] : null));
        }
      }
    } else {
      const dataRow   = rowByFullKey.get(rk + "\x00" + "");
      const dataCells = dataRow ? getCells(dataRow) : [];
      for (const bRef of allMeasBRefs) {
        const idx = bRefToIdx(bRef);
        newRow.appendChild(copyCell(idx >= 0 ? dataCells[idx] : null));
      }
    }

    newDataElem.appendChild(newRow);
  }

  return doc;
};

bcdui.wrs.colDims.bcdName = "bcdui.wrs.colDims";
