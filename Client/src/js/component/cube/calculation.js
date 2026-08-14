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
 * Applies cube calculations (plain measures + calc:Calc expressions) to a WRS.
 *
 * Parameters:
 *   paramModel - DOM or DataProvider containing xp:CubeCalculation and cube:Layout
 *   paramSetId - optional id selecting the xp:CubeCalculation parameter set
 *
 * What it does:
 *   1. Rebuilds wrs:Columns from cube:Layout/cube:Dimensions + cube:Measures.
 *   2. For each wrs:R: copies dim cells, then emits one cell per measure.
 *        dm:MeasureRef  – copies the existing cell from the source column.
 *        dm:Measure     – evaluates its calc:Calc via bcdui.wrs.calculationFormulars.
 *   3. When any calc:ValueRef uses a total-row reference (magic-char idRef prefix
 *      &#xE0F0;1R / &#xE0F0;2R / &#xE0F0;1C / &#xE0F0;2C), it pre-builds four
 *      lookup Maps (matching the XSLT keys columnKeyAboveTotal, columnKeyOuterTotal,
 *      rowKeyAboveTotal, rowKeyOuterTotal) and resolves each row's totals at
 *      evaluation time.
 *   4. Appends a <TotalHelper> element (containing the source header and the pre-
 *      calculation total rows) for downstream pipeline compatibility, mirroring
 *      the output of calculationTemplate.xslt when total refs are present.
 *
 * Returns a new WRS document, or undefined if there is nothing to do.
 *
 * Requires bcdui.wrs.calculationFormulars (calculationFormulars.js).
 */
bcdui.wrs.calculation = function(docIn, params) {

  // Starting Transformer bcdui.wrs.calculation
  const CUBE_NS = "http://www.businesscode.de/schema/bcdui/cube-2.0.0";
  const WRS_NS  = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  const XP_NS   = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
  const CALC_NS = "http://www.businesscode.de/schema/bcdui/calc-1.0.0";
  const DM_NS   = "http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0";
  const MAGIC   = bcdui.core.magicChar.dimEmpty; // base char for total idRefs

  // ---- helpers ----
  const childElems = (el, ln) => {
    const res = [];
    if (!el) return res;
    for (let c = el.firstChild; c; c = c.nextSibling)
      if (c.nodeType === 1 && (!ln || c.localName === ln)) res.push(c);
    return res;
  };

  const copyAttrs = (dst, src) => {
    for (let i = 0; i < src.attributes.length; i++) {
      const a = src.attributes[i];
      dst.setAttribute(a.name, a.value);
    }
  };

  // ---- resolve inputs ----
  let src = docIn;
  if (src && typeof src.getData === "function") src = src.getData();
  if (!src) return;

  let pm = params.paramModel;
  if (pm && typeof pm.getData === "function") pm = pm.getData();
  if (!pm) return;

  // xp:CubeCalculation parameter set (provides lastRowDim / lastColDim for total lookups)
  const psId = params.paramSetId || "";
  const paramSet = Array.from(pm.getElementsByTagNameNS(XP_NS, "CubeCalculation"))
    .find(ps => (ps.getAttribute("paramSetId") || "") === psId ||
                (!ps.getAttribute("paramSetId") && !psId));

  const lastColDim = paramSet ? (paramSet.getAttribute("lastColDim") || "") : "";
  const lastRowDim = paramSet ? (paramSet.getAttribute("lastRowDim") || "") : "";

  // ---- cube layout ----
  const layoutEl = Array.from(pm.getElementsByTagNameNS(CUBE_NS, "Layout"))[0];
  if (!layoutEl) return;

  // Collect all @bRef under cube:Dimensions (any depth), preserving document order
  const dimBRefs = [];
  const collectBRefs = el => {
    for (let c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const bRef = c.getAttribute("bRef");
      if (bRef) dimBRefs.push(bRef);
      collectBRefs(c);
    }
  };
  const dimsEl = childElems(layoutEl, "Dimensions")[0];
  if (dimsEl) collectBRefs(dimsEl);

  // Measures: $paramModel/*/cube:Layout/cube:Measures/*/*
  const measEl = childElems(layoutEl, "Measures")[0];
  const measures = measEl ? childElems(measEl).flatMap(grp => childElems(grp)) : [];
  if (!measures.length) return;

  // dm:MeasureRef[@idRef] (no @bRef) references a dm:Measure definition — resolve it now
  const dmMeasMap = new Map(
    Array.from(pm.getElementsByTagNameNS(DM_NS, "Measure")).map(m => [m.getAttribute("id"), m])
  );
  const resolvedMeasures = measures.map(m =>
    (m.localName === "MeasureRef" && !m.getAttribute("bRef") && m.getAttribute("idRef"))
      ? (dmMeasMap.get(m.getAttribute("idRef")) || m)
      : m
  );

  // ---- source WRS metadata ----
  const root      = src.documentElement;
  const hdrColsEl = childElems(childElems(root, "Header")[0], "Columns")[0];
  if (!hdrColsEl) return;
  const srcCols = childElems(hdrColsEl, "C");

  // @id → 0-based cell index; first occurrence wins (fallback when aggr is absent/unmatched)
  const colIdxById = new Map();
  srcCols.forEach((c, i) => { const id = c.getAttribute("id"); if (!colIdxById.has(id)) colIdxById.set(id, i); });

  // @id + "||" + @aggr → 0-based cell index; used when calc:ValueRef carries @aggr
  const colIdxByIdAndAggr = new Map(srcCols.map((c, i) => [c.getAttribute("id") + "||" + (c.getAttribute("aggr") || ""), i]));

  // 0-based indices of dimension columns in source rows (matched by @id === dimBRef)
  const dimColIdxs = dimBRefs.map(bRef => colIdxById.get(bRef)).filter(i => i !== undefined);

  // maxDimPos: count of @dimId columns (1-based count; used for key positions)
  const maxDimPos = srcCols.filter(c => c.getAttribute("dimId")).length;

  // lastRowDim / lastColDim column positions (1-based @pos attribute value)
  const lastRowDimCol = srcCols.find(c => c.getAttribute("id") === lastRowDim || c.getAttribute("bRef") === lastRowDim);
  const lastColDimCol = srcCols.find(c => c.getAttribute("id") === lastColDim || c.getAttribute("bRef") === lastColDim);
  const maxRowDimPos  = lastRowDimCol ? Number(lastRowDimCol.getAttribute("pos")) : 0; // 1-based; 0 = absent
  const maxColDimPos  = lastColDimCol ? Number(lastColDimCol.getAttribute("pos")) : NaN;
  const gotRowDims    = maxRowDimPos > 0;
  const gotColDims    = !isNaN(maxColDimPos);

  // ---- check for total references in any measure's calc:Calc ----
  const hasTotalRefs = Array.from(layoutEl.getElementsByTagNameNS(CALC_NS, "ValueRef"))
    .some(vr => { const id = vr.getAttribute("idRef") || ""; return id.startsWith(MAGIC + "1") || id.startsWith(MAGIC + "2"); });

  // ---- key position arrays (0-based cell indices) ----
  // These mirror the XSLT key definitions in cube/calculation.xslt generator:Keys
  const ckatPos = maxDimPos > 0 ? Array.from({length: maxDimPos - 1}, (_, i) => i) : [];
  const ckotPos = gotRowDims   ? Array.from({length: maxRowDimPos},     (_, i) => i) : [];
  const lastRowDimIdx0 = gotRowDims ? maxRowDimPos - 1 : -1;
  const rkatPos = Array.from({length: maxDimPos}, (_, i) => i).filter(i => i !== lastRowDimIdx0);
  const rkotPos = gotRowDims
    ? Array.from({length: maxDimPos - maxRowDimPos}, (_, i) => maxRowDimPos + i)
    : [];

  // Composite key string: concat of cell text + @bcdGr for a set of column positions
  const makeKey = (cells, positions) =>
    positions.map(i => "|" + (cells[i] ? cells[i].textContent : "") +
                        "|" + (cells[i] ? (cells[i].getAttribute("bcdGr") || "") : "")).join("");

  // ---- build total lookup maps ----
  // Maps: key string → array of cell arrays (one entry per matching source row)
  const colAboveMap = new Map(); // columnKeyAboveTotal: cell[maxDimPos-1]/@bcdGr='1'
  const colOuterMap = new Map(); // columnKeyOuterTotal: cell[maxRowDimPos]/@bcdGr='1'
  const rowAboveMap = new Map(); // rowKeyAboveTotal:    cell[maxRowDimPos-1]/@bcdGr='1'
  const rowOuterMap = new Map(); // rowKeyOuterTotal:    cell[0]/@bcdGr='1'

  if (hasTotalRefs) {
    const addToMap = (map, key, cells) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(cells);
    };

    for (const row of childElems(childElems(root, "Data")[0], "R")) {
      const cells = childElems(row, "C");

      if (maxDimPos > 0 && cells[maxDimPos - 1] && cells[maxDimPos - 1].getAttribute("bcdGr") === "1")
        addToMap(colAboveMap, makeKey(cells, ckatPos), cells);

      if (gotRowDims && cells[maxRowDimPos] && cells[maxRowDimPos].getAttribute("bcdGr") === "1")
        addToMap(colOuterMap, makeKey(cells, ckotPos), cells);

      if (gotRowDims && cells[maxRowDimPos - 1] && cells[maxRowDimPos - 1].getAttribute("bcdGr") === "1")
        addToMap(rowAboveMap, makeKey(cells, rkatPos), cells);

      if (cells[0] && cells[0].getAttribute("bcdGr") === "1")
        addToMap(rowOuterMap, makeKey(cells, rkotPos), cells);
    }
  }

  const firstOf = map => map && map.length ? map[0] : null;

  // ---- build output document ----
  const doc     = bcdui.core.browserCompatibility.cloneDocument(src);
  const newRoot = doc.documentElement;

  // Rebuild wrs:Columns from layout
  const newHdrColsEl = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
  if (newHdrColsEl) {
    while (newHdrColsEl.firstChild) newHdrColsEl.removeChild(newHdrColsEl.firstChild);
    let pos = 1;

    // Dimension columns — copied from source header, @pos renumbered
    for (const bRef of dimBRefs) {
      const srcCol = srcCols.find(c => c.getAttribute("id") === bRef);
      if (!srcCol) continue;
      const c = srcCol.cloneNode(true);
      c.setAttribute("pos", String(pos++));
      newHdrColsEl.appendChild(c);
    }

    // Measure columns
    for (const m of resolvedMeasures) {
      if (m.localName === "MeasureRef") {
        const srcCol = srcCols.find(c => c.getAttribute("id") === m.getAttribute("bRef"));
        if (!srcCol) continue;
        const c = srcCol.cloneNode(true);
        c.setAttribute("pos", String(pos++));
        newHdrColsEl.appendChild(c);

      } else if (m.localName === "Measure") {
        const c = doc.createElementNS(WRS_NS, "C");
        c.setAttribute("pos",     String(pos++));
        c.setAttribute("id",      m.getAttribute("id")      || "");
        c.setAttribute("caption", m.getAttribute("caption") || "");
        c.setAttribute("valueId", m.getAttribute("id")      || "");
        if (m.getAttribute("userDefined") === "true")
          c.setAttribute("bcdVmeas", m.getAttribute("id"));

        const calcEl = childElems(m).find(ce => ce.namespaceURI === CALC_NS && ce.localName === "Calc");
        if (calcEl) {
          ["type-name", "scale", "unit"].forEach(attr => {
            const v = calcEl.getAttribute(attr);
            if (v) c.setAttribute(attr, v);
          });
          // denominator marker: present when calc has a single calc:Div with exactly 2 operands
          const hasDiv2 = Array.from(calcEl.getElementsByTagNameNS(CALC_NS, "Div"))
            .some(d => childElems(d).length === 2);
          if (hasDiv2) {
            const a = doc.createElementNS(WRS_NS, "A");
            a.setAttribute("name",    "denominator");
            a.setAttribute("caption", "Denominator");
            c.appendChild(a);
          }
        }
        newHdrColsEl.appendChild(c);
      }
    }
  }

  // ---- rebuild data rows ----
  const newDataEl = childElems(newRoot, "Data")[0];
  if (newDataEl) {
    while (newDataEl.firstChild) newDataEl.removeChild(newDataEl.firstChild);

    for (const srcRow of childElems(childElems(root, "Data")[0])) {
      // Non-R rows (D, I, M) pass through unchanged
      if (srcRow.localName !== "R") {
        newDataEl.appendChild(srcRow.cloneNode(true));
        continue;
      }

      const srcCells = childElems(srcRow, "C");

      // Resolve the four total-row groups for this source row
      let colGroupTotal = null, colGroupOuterTotal = null;
      let rowGroupTotal = null, rowGroupOuterTotal = null;
      if (hasTotalRefs) {
        if (gotColDims) {
          colGroupTotal      = firstOf(colAboveMap.get(makeKey(srcCells, ckatPos)));
          colGroupOuterTotal = firstOf(colOuterMap.get(makeKey(srcCells, ckotPos)));
        } else {
          // No col dims: each row is its own group (mirrors XSLT ident key behaviour)
          colGroupTotal = colGroupOuterTotal = srcCells;
        }
        if (gotRowDims) {
          rowGroupTotal      = firstOf(rowAboveMap.get(makeKey(srcCells, rkatPos)));
          rowGroupOuterTotal = firstOf(rowOuterMap.get(makeKey(srcCells, rkotPos)));
        } else {
          rowGroupTotal = rowGroupOuterTotal = srcCells;
        }
      }

      // Resolver for calc:ValueRef — handles plain and magic-char total idRefs
      const resolver = (idRef, aggr = "") => {
        if (idRef && idRef.startsWith(MAGIC)) {
          // idRef format: MAGIC + "1R" | measureId   (length: 1+2+1 = 4 chars before measureId)
          const prefix  = idRef.substring(0, MAGIC.length + 2); // e.g. "1R"
          const measId  = idRef.substring(MAGIC.length + 3);    // after the '|'
          const idx     = colIdxById.get(measId);
          if (idx === undefined) return NaN;
          let totalCells;
          if      (prefix === MAGIC + "1R") totalCells = colGroupTotal;
          else if (prefix === MAGIC + "2R") totalCells = colGroupOuterTotal;
          else if (prefix === MAGIC + "1C") totalCells = rowGroupTotal;
          else if (prefix === MAGIC + "2C") totalCells = rowGroupOuterTotal;
          const cell = totalCells && totalCells[idx];
          return cell ? +cell.textContent : NaN;
        }
        const idx  = colIdxByIdAndAggr.get(idRef + "||" + aggr) ?? colIdxById.get(idRef);
        const cell = idx !== undefined ? srcCells[idx] : null;
        return cell ? +cell.textContent : NaN;
      };

      const newRow = doc.createElementNS(WRS_NS, "R");
      copyAttrs(newRow, srcRow);

      // Dimension cells
      for (const idx of dimColIdxs) {
        const cell = srcCells[idx];
        newRow.appendChild(cell ? cell.cloneNode(true) : doc.createElementNS(WRS_NS, "C"));
      }

      // Measure cells
      for (const m of resolvedMeasures) {
        const outCell = doc.createElementNS(WRS_NS, "C");

        if (m.localName === "MeasureRef") {
          const srcCell = srcCells[colIdxById.get(m.getAttribute("bRef"))];
          if (srcCell) {
            copyAttrs(outCell, srcCell);
            if (srcCell.textContent) outCell.textContent = srcCell.textContent;
          }

        } else if (m.localName === "Measure") {
          const calcEl = childElems(m).find(ce => ce.namespaceURI === CALC_NS && ce.localName === "Calc");
          if (calcEl) {
            const typeName = calcEl.getAttribute("type-name") || "";
            if (typeName && !bcdui.wrs.jsUtil.isNumericTypeName(typeName)) {
              // non-numeric type: resolve the first ValueRef directly as a string
              const vrEl = childElems(calcEl).find(c => c.localName === "ValueRef");
              if (vrEl) {
                const strIdx = colIdxByIdAndAggr.get(vrEl.getAttribute("idRef") + "||" + (vrEl.getAttribute("aggr") || ""))
                             ?? colIdxById.get(vrEl.getAttribute("idRef"));
                const strCell = strIdx !== undefined ? srcCells[strIdx] : null;
                if (strCell && strCell.textContent) outCell.textContent = strCell.textContent;
              }
            } else {
              const val = bcdui.wrs.calculationFormulars.eval(calcEl, resolver);
              if (!isNaN(val)) {
                outCell.textContent = String(val);
                // @denominator: value of the 2nd operand of the first calc:Div with 2 children
                const divEl = Array.from(calcEl.getElementsByTagNameNS(CALC_NS, "Div"))
                  .find(d => childElems(d).length === 2);
                if (divEl) {
                  const denomVal = bcdui.wrs.calculationFormulars.evalExpr(childElems(divEl)[1], resolver);
                  if (!isNaN(denomVal)) outCell.setAttribute("denominator", String(denomVal));
                }
              }
            }
          }
        }

        newRow.appendChild(outCell);
      }

      newDataEl.appendChild(newRow);
    }
  }

  // ---- TotalHelper (mirrors calculationTemplate.xslt output) ----
  // Holds pre-calculation header + total rows so downstream steps can reference
  // original totals even after this transformation changes measure values.
  if (hasTotalRefs) {
    const th      = doc.createElement("TotalHelper");
    const thData  = doc.createElementNS(WRS_NS, "Data");
    th.appendChild(childElems(root, "Header")[0].cloneNode(true));
    for (const row of childElems(childElems(root, "Data")[0], "R")) {
      const cells = childElems(row, "C");
      const isTotal =
        (maxRowDimPos > 0 && cells[maxRowDimPos - 1] && cells[maxRowDimPos - 1].getAttribute("bcdGr") === "1") ||
        (cells[0] && cells[0].getAttribute("bcdGr") === "1");
      if (isTotal) thData.appendChild(row.cloneNode(true));
    }
    th.appendChild(thData);
    newRoot.appendChild(th);
  }

  return doc;
};

bcdui.wrs.calculation.bcdName = "bcdui.wrs.calculation";
