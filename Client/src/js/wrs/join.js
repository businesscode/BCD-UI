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
 * Joins two WRS documents: the right doc is docIn, the left doc is params.leftDoc.
 *
 * Join modes:
 *   INNER JOIN     — (default) only rows with a match in both docs
 *   LEFT OUTER JOIN — @makeLeftOuterJoin='true': all left rows; unmatched rows get wrs:null right cells
 *   CROSS JOIN     — no join columns specified: every left × right combination
 *
 * Parameters (all optional except leftDoc):
 *   leftDoc                — left WRS DataProvider or DOM  (required)
 *   rightWrsCol            — space-separated right-doc join column IDs
 *   leftWrsCol             — space-separated left-doc join column IDs (parallel to rightWrsCol)
 *   dimensions             — space-separated column IDs present in both docs; added to both join lists
 *   rightIdPrefix          — ID prefix for right non-join columns
 *   rightCaptionPrefix     — caption prefix for right non-join columns
 *   leftIdPrefix           — ID prefix for left non-join columns
 *   leftCaptionPrefix      — caption prefix for left non-join columns
 *   makeLeftOuterJoin      — "true" to enable LEFT OUTER JOIN
 *   joinColumnIdPrefix     — ID prefix for join columns
 *   joinColumnCaptionPrefix — caption prefix for join columns (defaults to joinColumnIdPrefix)
 *   paramModel + paramSetId — DOM containing xp:Join parameter set
 *
 * Output column order: all left columns (with prefixes), then right non-join columns.
 * Columns listed in the raw 'dimensions' string parameter are never prefixed.
 *
 * Returns a new WRS document, or undefined if inputs are missing.
 */
bcdui.wrs.join = function(docIn, params) {
  
  // Starting Transformer bcdui.wrs.join
  const WRS_NS = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  const XP_NS  = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";

  // Helper
  const childElems = (el, ln) => {
    const res = [];
    if (!el) return res;
    for (let c = el.firstChild; c; c = c.nextSibling)
      if (c.nodeType === 1 && (!ln || c.localName === ln)) res.push(c);
    return res;
  };

  const copyAttrs = (dst, from) => {
    for (let i = 0; i < from.attributes.length; i++) {
      const a = from.attributes[i];
      if (a.name === "xmlns" || a.name.startsWith("xmlns:")) continue; // mirrors XSLT @* (namespace nodes excluded)
      dst.setAttribute(a.name, a.value);
    }
  };

  // ---- Resolve inputs ----
  let right = docIn;
  if (right && typeof right.getData === "function") right = right.getData();
  if (!right) return;

  let left = params.leftDoc;
  if (left && typeof left.getData === "function") left = left.getData();
  if (!left) return;

  let pm = params.paramModel;
  if (pm && typeof pm.getData === "function") pm = pm.getData();
  const psId     = params.paramSetId || "";
  const paramSet = pm
    ? Array.from(pm.getElementsByTagNameNS(XP_NS, "Join"))
        .find(ps => (ps.getAttribute("paramSetId") || "") === psId || (!ps.getAttribute("paramSetId") && !psId))
    : null;

  // ---- Parameters ----
  const rightParamEl    = childElems(paramSet, "Right")[0];
  const leftParamEl     = childElems(paramSet, "Left")[0];
  const rightIdPrefix   = params.rightIdPrefix       || (rightParamEl && rightParamEl.getAttribute("idPrefix"))      || "";
  const rightCapPfx     = params.rightCaptionPrefix  || (rightParamEl && rightParamEl.getAttribute("captionPrefix")) || "";
  const leftIdPrefix    = params.leftIdPrefix        || (leftParamEl  && leftParamEl.getAttribute("idPrefix"))       || "";
  const leftCapPfx      = params.leftCaptionPrefix   || (leftParamEl  && leftParamEl.getAttribute("captionPrefix"))  || "";
  const _makeLeftOuterRaw = params.makeLeftOuterJoin ?? (paramSet && paramSet.getAttribute("makeLeftOuterJoin"));
  const makeLeftOuter   = _makeLeftOuterRaw === "true" || _makeLeftOuterRaw === true;
  const joinIdPfx       = params.joinColumnIdPrefix  || (paramSet && paramSet.getAttribute("joinColumnIdPrefix"))    || "";
  const joinCapPfx      = params.joinColumnCaptionPrefix || joinIdPfx;   // matches XSLT: joinColumnCaptionPrefix defaults to joinColumnIdPrefix

  // Columns in the raw $dimensions string are never prefixed (matching XSLT captionAndIdWithPrefixes)
  const dimensionSet = new Set((params.dimensions || "").trim().split(/\s+/).filter(Boolean));

  // ---- Source column metadata ----
  const leftRoot    = left.documentElement;
  const rightRoot   = right.documentElement;
  const leftHdrCols = childElems(childElems(leftRoot,  "Header")[0], "Columns")[0];
  const rightHdrCols= childElems(childElems(rightRoot, "Header")[0], "Columns")[0];
  if (!leftHdrCols || !rightHdrCols) return;

  const leftSrcCols  = childElems(leftHdrCols,  "C");
  const rightSrcCols = childElems(rightHdrCols, "C");
  if (!leftSrcCols.length) return;

  const leftColById  = new Map(leftSrcCols.map(c  => [c.getAttribute("id"), c]));
  const rightColById = new Map(rightSrcCols.map(c => [c.getAttribute("id"), c]));

  // ---- Build parallel join column ID lists ----
  // effLeftIds[i] in left doc joins with effRightIds[i] in right doc
  const effLeftIds  = [];
  const effRightIds = [];

  // 1. String params rightWrsCol / leftWrsCol (positionally paired)
  const leftStr  = (params.leftWrsCol  || "").trim();
  const rightStr = (params.rightWrsCol || "").trim();
  if (leftStr)  leftStr.split(/\s+/).forEach(id  => effLeftIds.push(id));
  if (rightStr) rightStr.split(/\s+/).forEach(id => effRightIds.push(id));

  // 2. Raw dimensions string: add IDs present in both docs to both lists
  for (const id of dimensionSet)
    if (leftColById.has(id) && rightColById.has(id)) { effLeftIds.push(id); effRightIds.push(id); }

  // 3. paramModelDimensions from paramSet: same IDs to both lists
  const dimsEl = childElems(childElems(paramSet, "Dimensions")[0], "Columns")[0];
  for (const c of childElems(dimsEl, "C")) {
    const id = c.getAttribute("id");
    if (leftColById.has(id) && rightColById.has(id)) { effLeftIds.push(id); effRightIds.push(id); }
  }

  // 4. Explicit per-side column lists from paramSet
  const rightParamCols = childElems(childElems(rightParamEl, "Columns")[0], "C");
  const leftParamCols  = childElems(childElems(leftParamEl,  "Columns")[0], "C");
  rightParamCols.forEach(c => effRightIds.push(c.getAttribute("id")));
  leftParamCols.forEach(c  => effLeftIds.push(c.getAttribute("id")));

  // Counts must match (XSLT emits an error WRS otherwise; we return undefined)
  if (effLeftIds.length !== effRightIds.length) return;

  // ---- Resolve 0-based column indices ----
  const leftJoinIdxs  = effLeftIds.map(id  => { const c = leftColById.get(id);  return c ? Number(c.getAttribute("pos")) - 1 : -1; });
  const rightJoinIdxs = effRightIds.map(id => { const c = rightColById.get(id); return c ? Number(c.getAttribute("pos")) - 1 : -1; });
  const leftJoinIdxSet  = new Set(leftJoinIdxs.filter(i => i >= 0));
  const rightJoinIdxSet = new Set(rightJoinIdxs.filter(i => i >= 0));

  const crossJoin = effLeftIds.length === 0;

  //------------------------------------------------------
  // Build right-row index keyed by join column values
  // Key: concat of (cellText + "|" + (bcdGr==="1")) for each join column, mirroring the XSLT
  // concat(wrs:C[pos], '|', boolean(wrs:C[pos]/@bcdGr=1), ...) key expression.
  const makeKey = (cells, idxs) =>
    idxs.map(idx => {
      const cell  = idx >= 0 ? cells[idx] : null;
      return (cell ? cell.textContent : "") + "|" + (cell ? cell.getAttribute("bcdGr") === "1" : false);
    }).join("|");

  const rightDataEl = childElems(rightRoot, "Data")[0];
  const rightRows   = rightDataEl ? childElems(rightDataEl) : [];
  const rightIndex  = new Map();

  if (!crossJoin) {
    for (const rr of rightRows) {
      const key = makeKey(childElems(rr, "C"), rightJoinIdxs);
      if (!rightIndex.has(key)) rightIndex.set(key, []);
      rightIndex.get(key).push(rr);
    }
  }

  //------------------------------------------------------
  // Build output document (clone of left doc as base)
  const doc     = bcdui.core.browserCompatibility.cloneDocument(left);
  const newRoot = doc.documentElement;
  const mkElem  = ln => doc.createElementNS(WRS_NS, ln);

  // Drop RequestDocument if present
  for (const rd of childElems(newRoot, "RequestDocument"))
    rd.parentNode.removeChild(rd);

  // ---- Rebuild wrs:Columns ----
  const newHdrCols = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
  while (newHdrCols.firstChild) newHdrCols.removeChild(newHdrCols.firstChild);

  const nLeft = leftSrcCols.length;

  // All left columns (join columns get joinCol prefix; others get leftId prefix)
  for (const lc of leftSrcCols) {
    const lcId      = lc.getAttribute("id") || "";
    const lcPos     = Number(lc.getAttribute("pos")) - 1;  // 0-based
    const isJoinCol = leftJoinIdxSet.has(lcPos);
    const c         = mkElem("C");

    // Right matching column attributes first (base), then left overrides
    const rc = rightColById.get(lcId);
    if (rc) copyAttrs(c, rc);
    copyAttrs(c, lc);

    // Apply prefix — but never to $dimensions columns
    if (!dimensionSet.has(lcId)) {
      const idPfx  = isJoinCol ? joinIdPfx  : leftIdPrefix;
      const capPfx = isJoinCol ? joinCapPfx : leftCapPfx;
      if (idPfx)  c.setAttribute("id",      idPfx  + lcId);
      if (capPfx) c.setAttribute("caption", capPfx + (lc.getAttribute("caption") || lcId));
    }

    for (const a of childElems(lc, "A")) c.appendChild(a.cloneNode(true));
    newHdrCols.appendChild(c);
  }

  // Right non-join columns (pos = nLeft + sequential position among non-join right cols)
  let rightNonJoinPos = 1;
  for (const rc of rightSrcCols) {
    if (rightJoinIdxSet.has(Number(rc.getAttribute("pos")) - 1)) continue;
    const rcId = rc.getAttribute("id") || "";
    const c    = mkElem("C");
    copyAttrs(c, rc);
    c.setAttribute("pos", String(nLeft + rightNonJoinPos++));

    if (!dimensionSet.has(rcId)) {
      if (rightIdPrefix) c.setAttribute("id",      rightIdPrefix + rcId);
      if (rightCapPfx)   c.setAttribute("caption", rightCapPfx   + (rc.getAttribute("caption") || rcId));
    }

    for (const a of childElems(rc, "A")) c.appendChild(a.cloneNode(true));
    newHdrCols.appendChild(c);
  }

  // ---- Rebuild wrs:Data ----
  const newDataEl  = childElems(newRoot, "Data")[0];
  while (newDataEl.firstChild) newDataEl.removeChild(newDataEl.firstChild);

  const leftDataEl = childElems(leftRoot, "Data")[0];
  const leftRows   = leftDataEl ? childElems(leftDataEl) : [];

  for (const lr of leftRows) {
    const leftCells = childElems(lr, "C");
    const leftId    = lr.getAttribute("id") || "";

    const matchedRight = crossJoin
      ? rightRows
      : (rightIndex.get(makeKey(leftCells, leftJoinIdxs)) || []);

    const multiMatch = matchedRight.length > 1;

    // Matched rows (INNER JOIN / CROSS JOIN path)
    for (const rr of matchedRight) {
      const rightCells = childElems(rr, "C");
      const newRow     = mkElem(lr.localName);

      // Row attributes: right first, then left overrides (left wins)
      copyAttrs(newRow, rr);
      copyAttrs(newRow, lr);
      newRow.setAttribute("id", multiMatch ? leftId + "-" + (rr.getAttribute("id") || "") : leftId);

      // Left cells (all of them in left order)
      for (let i = 0; i < leftCells.length; i++) {
        const lc      = leftCells[i];
        const newCell = mkElem("C");
        // For join columns: merge right join cell attributes (right as base, left wins)
        const jPos = leftJoinIdxs.indexOf(i);
        if (jPos >= 0) {
          const rjCell = rightCells[rightJoinIdxs[jPos]];
          if (rjCell) copyAttrs(newCell, rjCell);
        }
        copyAttrs(newCell, lc);
        for (let ch = lc.firstChild; ch; ch = ch.nextSibling) newCell.appendChild(ch.cloneNode(true));
        newRow.appendChild(newCell);
      }

      // Right non-join cells
      for (let i = 0; i < rightCells.length; i++) {
        if (rightJoinIdxSet.has(i)) continue;
        newRow.appendChild(rightCells[i].cloneNode(true));
      }

      newDataEl.appendChild(newRow);
    }

    // LEFT OUTER JOIN: emit left row with null right cells when no match
    if (makeLeftOuter && matchedRight.length === 0) {
      const newRow = mkElem(lr.localName);
      copyAttrs(newRow, lr);
      newRow.setAttribute("id", leftId);

      for (const lc of leftCells) {
        const newCell = mkElem("C");
        copyAttrs(newCell, lc);
        for (let ch = lc.firstChild; ch; ch = ch.nextSibling) newCell.appendChild(ch.cloneNode(true));
        newRow.appendChild(newCell);
      }
      // One empty wrs:C per right non-join column
      for (let i = 0; i < rightSrcCols.length; i++) {
        if (rightJoinIdxSet.has(i)) continue;
        const ec = mkElem("C");
        ec.appendChild(mkElem("null"));
        newRow.appendChild(ec);
      }

      newDataEl.appendChild(newRow);
    }
  }

  // return new doc
  return doc;
};

bcdui.wrs.join.bcdName = "bcdui.wrs.join";
