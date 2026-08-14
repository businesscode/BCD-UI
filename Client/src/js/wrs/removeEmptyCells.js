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
 * Removes empty rows and columns from a WRS cube document.
 * Empty meanign all measures are NaN, including blank or wrs:null
 *
 * Parameters:
 *   paramModel - DOM or DataProvider containing xp:RemoveEmptyCells, see xsltParams-1.0.0.xsd
 *   paramSetId - optional id selecting the parameter set
 *
 * The parameter set must have @apply='rowCol' for the transformation to run.
 * Optional attributes on xp:RemoveEmptyCells:
 *   @ignorePos       - space-separated list of 1-based column positions to skip, i.e. leave even if empty
 *   @ignoreValueIds  - space-separated list of @valueId values to skip
 *
 * Returns a new WRS document with empty rows (wrs:R only) and empty columns removed and @pos attributes renumbered, 
 * or undefined if nothing changed to indicate NoOp
 */
bcdui.wrs.removeEmptyCells = function(docIn, params) {

  // Starting Transformer bcdui.wrs.removeEmptyCells
  // Helper
  const XP_NS = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
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

  // Same paramSetId or both none
  const psId = params.paramSetId || "";
  const paramSet = Array.from(pm.getElementsByTagNameNS(XP_NS, "RemoveEmptyCells"))
    .find(ps => (ps.getAttribute("paramSetId") || "") === psId ||
                (!ps.getAttribute("paramSetId") && !psId));

  if (!paramSet || paramSet.getAttribute("apply") !== "rowCol") return;

  // ---- Source WRS metadata ----
  const root = src.documentElement;
  const headerColsElem = childElems(childElems(root, "Header")[0], "Columns")[0];
  if (!headerColsElem) return;
  const srcCols = childElems(headerColsElem, "C");

  // ---- Build ignoreCols: set of 1-based @pos values excluded from empty checks ----
  const ignoreCols = new Set();

  // Columns to skip
  // Skip dimension columns, we only look at measures, skip @ignorePos and @ignoreValueIds
  srcCols.forEach(c => { if (c.getAttribute("dimId")) ignoreCols.add(Number(c.getAttribute("pos"))); });

  const ignorePos = (paramSet.getAttribute("ignorePos") || "").trim();
  if (ignorePos) ignorePos.split(/\s+/).forEach(p => { if (p) ignoreCols.add(Number(p)); });

  const ignoreValueIds = (paramSet.getAttribute("ignoreValueIds") || "").trim();
  if (ignoreValueIds) {
    const ignoreVIdSet = new Set(ignoreValueIds.split(/\s+/));
    srcCols.forEach(c => {
      if (ignoreVIdSet.has(c.getAttribute("valueId"))) ignoreCols.add(Number(c.getAttribute("pos")));
    });
  }

  // Our definition of a cell being empty
  const isNonEmpty = text => text != null && text.trim() !== "" && text !== "NaN";

  //------------------------------------------------
  // Find empty columns (measure columns only, not in ignoreCols)
  const measureCols = srcCols.filter(c => !c.getAttribute("dimId") && !ignoreCols.has(Number(c.getAttribute("pos"))));

  const dataElem = childElems(root, "Data")[0];
  const allDataChildren = dataElem ? childElems(dataElem) : [];

  const emptyColPos = new Set();
  for (const hc of measureCols) {
    const pos = Number(hc.getAttribute("pos")); // 1-based
    let hasContent = false;
    for (let ri = 0; ri < allDataChildren.length && !hasContent; ri++) {
      const cell = childElems(allDataChildren[ri])[pos - 1];
      if (cell && isNonEmpty(cell.textContent)) hasContent = true;
    }
    if (!hasContent) emptyColPos.add(pos);
  }

  //------------------------------------------------
  // Find empty rows
  const emptyRowIdx = new Set(); // 0-based indices into allDataChildren
  for (let ri = 0; ri < allDataChildren.length; ri++) {
    const cells = childElems(allDataChildren[ri]);
    let hasContent = false;
    for (let ci = 0; ci < cells.length && !hasContent; ci++) {
      if (!ignoreCols.has(ci + 1) && isNonEmpty(cells[ci].textContent)) hasContent = true;
    }
    if (!hasContent) emptyRowIdx.add(ri);
  }

  //------------------------------------------------
  // Return undefined, if all rows and column should be preserved
  if (emptyColPos.size === 0 && emptyRowIdx.size === 0) return;
  
  //------------------------------------------------
  // Build a new result document
  const doc     = bcdui.core.browserCompatibility.cloneDocument(src);
  const newRoot = doc.documentElement;

  // Rebuild header columns: skip empty ones, renumber @pos
  const newHeaderColsElem = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
  if (newHeaderColsElem) {
    while (newHeaderColsElem.firstChild) newHeaderColsElem.removeChild(newHeaderColsElem.firstChild);
    let newPos = 1;
    for (const srcCol of srcCols) {
      if (emptyColPos.has(Number(srcCol.getAttribute("pos")))) continue;
      const c = srcCol.cloneNode(true);
      c.setAttribute("pos", String(newPos++));
      newHeaderColsElem.appendChild(c);
    }
  }

  // Rebuild data: skip empty wrs:R rows, strip empty-column cells from kept rows
  const newDataElem = childElems(newRoot, "Data")[0];
  if (newDataElem) {
    while (newDataElem.firstChild) newDataElem.removeChild(newDataElem.firstChild);
    for (let ri = 0; ri < allDataChildren.length; ri++) {
      const srcRow = allDataChildren[ri];
      // Empty rows: only wrs:R is removed; other row types (D, I, M) pass through
      if (emptyRowIdx.has(ri) && srcRow.localName === "R") continue;

      if (emptyColPos.size > 0 && srcRow.localName === "R") {
        const newRow = doc.createElementNS(srcRow.namespaceURI, srcRow.localName);
        for (let i = 0; i < srcRow.attributes.length; i++) {
          const a = srcRow.attributes[i];
          newRow.setAttribute(a.name, a.value);
        }
        const cells = childElems(srcRow);
        for (let ci = 0; ci < cells.length; ci++) {
          if (!emptyColPos.has(ci + 1)) newRow.appendChild(cells[ci].cloneNode(true));
        }
        newDataElem.appendChild(newRow);
      } else {
        newDataElem.appendChild(srcRow.cloneNode(true));
      }
    }
  }
  
  // Return reduced document
  return doc;
};

bcdui.wrs.removeEmptyCells.bcdName = "bcdui.wrs.removeEmptyCells";
