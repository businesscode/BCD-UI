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
 * Sorts/reorders rows and columns of a WRS according to xp:OrderRowsAndCols parameters defined in xsltParams-1.0.0.xsd
 *
 * Compared to orderRowsAndCols.xslt the filter is not present but handled in filterRowsAndColumns.js
 * But cols not listed in xp:ColsOrder are still dropped
 *
 * Parameters (via params object):
 *   paramModel - DOM or DataProvider containing xp:OrderRowsAndCols
 *   paramSetId - optional id selecting the parameter set
 *
 * Three ordering mechanisms, all optional and combinable:
 *
 *   xp:RowsOrder/Columns/C[@id, @sort, @total, @sortBy]
 *     Sorts data rows. @sort = "ascending"|"descending". @total = "leading"|"trailing" places
 *     rows with @bcdGr='1' at the front or back, winning over value sort.
 *     @sortBy = measure valueId: sort a dimension by a related measure's subtotal value
 *     (sort-dim-by-measure); the subtotal is found by locating the sibling total row for
 *     the next inner dimension within the current group.
 *
 *   xp:ColsOrder
 *     Explicit column order. Direct child elements with @id define surviving columns in order.
 *     Columns not listed are dropped.
 *
 *   xp:ColDimsOrder/wrs:Columns/wrs:C[@id, @sort, @total, @sortBy]
 *     Sorts col-dim groups (pivoted columns). @id = a colDimLevelId bRef.
 *     @sortBy = measure valueId whose subtotal value drives the sort.
 *     Requires wrs:Columns/@colDimLevelIds on the source header (set by colDims.js/colDims.xslt).
 *
 * Returns a new WRS document, or undefined if there is nothing to do.
 *
 * Intentional deviations from the XSLT:
 *   - JavaScript stable sort (Array.prototype.sort) is used instead of xsl:sort.
 *   - @sortBy for rows: finds the first matching total-row via linear scan; XSLT node-set
 *     ordering may differ in edge cases.
 *   - ColDimsOrder sort value: taken from the first non-subtotal row with a matching measure cell; 
 *     XSLT takes the string-value of the full matching node-set (same first-node semantics).
 *   - ColDimsOrder sort key: coalesce(@order, @caption, id); each source uses its own type-name
 *     (colDimLevelOrderTypeNames / colDimLevelCaptionTypeNames / colDimLevelTypeNames) so that
 *     a string caption ("Nokia") on an INTEGER id column sorts as a string, not numerically.
 */
bcdui.wrs.orderRowsAndCols = function(docIn, params) {

  // Starting Transformer bcdui.wrs.orderRowsAndCols
  const WRS_NS = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  const XP_NS  = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
  const MAGIC  = bcdui.core.magicChar.dimEmpty;  // ""; appending "1" = total marker

  // Helper
  // Numeric SQL type names (sqlTypes.xml)
  const NUMERIC_TYPES = new Set([
    "BIGINT","BIT","DECIMAL","DOUBLE","FLOAT","INTEGER","NUMERIC","REAL","SMALLINT","TINYINT"
  ]);
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

  // Same paramId or both none
  const psId = params.paramSetId || "";
  const paramSet = Array.from(pm.getElementsByTagNameNS(XP_NS, "OrderRowsAndCols"))
    .find(ps => (ps.getAttribute("paramSetId") || "") === psId ||
                (!ps.getAttribute("paramSetId") && !psId));
  if (!paramSet) return;

  // ---- Determine what work exists ----
  const rowsOrderElem    = childElems(paramSet, "RowsOrder")[0];
  const colsOrderElem    = childElems(paramSet, "ColsOrder")[0];
  const colDimsOrderElem = childElems(paramSet, "ColDimsOrder")[0];

  const rowSortSpecs = rowsOrderElem
    ? childElems(childElems(rowsOrderElem, "Columns")[0], "C")
        .filter(c => c.getAttribute("sort") || c.getAttribute("total"))
    : [];

  // xp:ColsOrder may wrap its C elements in wrs:Columns, or list them directly
  const colsOrderItems = (() => {
    if (!colsOrderElem) return [];
    const first = childElems(colsOrderElem)[0];
    if (first && first.localName === "Columns") return childElems(first, "C");
    return childElems(colsOrderElem).filter(c => c.getAttribute("id"));
  })();

  const colDimSortSpecs = colDimsOrderElem
    ? childElems(childElems(colDimsOrderElem, "Columns")[0], "C")
    : [];

  if (!rowSortSpecs.length && !colsOrderItems.length && !colDimSortSpecs.length) return;

  // ---- Source WRS metadata ----
  const root           = src.documentElement;
  const headerColsElem = childElems(childElems(root, "Header")[0], "Columns")[0];
  if (!headerColsElem) return;
  const srcCols = childElems(headerColsElem, "C");

  // id -> { col (element), idx (0-based) }
  const colById = new Map(srcCols.map((c, i) => [c.getAttribute("id"), { col: c, idx: i }]));

  const colDimLevelIds              = (headerColsElem.getAttribute("colDimLevelIds")              || "").split("|").filter(Boolean);
  const colDimLevelTypeNames        = (headerColsElem.getAttribute("colDimLevelTypeNames")        || "").split("|");
  const colDimLevelCaptionTypeNames = (headerColsElem.getAttribute("colDimLevelCaptionTypeNames") || "").split("|");
  const colDimLevelOrderTypeNames   = (headerColsElem.getAttribute("colDimLevelOrderTypeNames")   || "").split("|");

  const isNumericCol = col => {
    if (NUMERIC_TYPES.has(col.getAttribute("type-name"))) return true;
    return childElems(col, "A").some(a =>
      a.getAttribute("name") === "order" && NUMERIC_TYPES.has(a.getAttribute("type-name"))
    );
  };

  // Does the header column carry wrs:A[@name='order'] (custom cell sort key)?
  const hasCellOrder = col => childElems(col, "A").some(a => a.getAttribute("name") === "order");

  const dataElem = childElems(root, "Data")[0];
  if (!dataElem) return;
  const allRows = childElems(dataElem);  // R, I, M, D

  // ---------------------------------------
  // Row sorting
  let sortedRows = allRows.slice();

  if (rowSortSpecs.length) {

    // For each spec with @sortBy, precompute row -> numeric sort value.
    // The value comes from the "total sibling" of each row at the next inner dim level.
    const sortByMaps = rowSortSpecs.map(spec => {
      const sortBy = spec.getAttribute("sortBy");
      if (!sortBy) return null;

      const dimId   = spec.getAttribute("id");
      const dimInfo = colById.get(dimId);
      if (!dimInfo) return null;
      const ourIdx = dimInfo.idx;

      // Measure column: prefer direct id match, fall back to col-dim total version
      let sortByInfo = colById.get(sortBy);
      if (!sortByInfo) {
        for (const [, info] of colById) {
          if (info.col.getAttribute("valueId") === sortBy &&
              info.col.getAttribute("id") !== sortBy &&
              (info.col.getAttribute("id") || "").includes(MAGIC + "1")) {
            sortByInfo = info;
            break;
          }
        }
      }
      if (!sortByInfo) return null;
      const sortByIdx = sortByInfo.idx;

      // Index of the next dim column after ourIdx
      let nextDimIdx = -1;
      for (let i = ourIdx + 1; i < srcCols.length; i++) {
        if (srcCols[i].getAttribute("dimId")) { nextDimIdx = i; break; }
      }

      const isOutermost = ourIdx === 0;

      const map = new Map();
      for (const row of allRows) {
        const cells = childElems(row, "C");
        let val = NaN;

        if (nextDimIdx === -1) {
          // Innermost dim: use this row's own measure value
          val = parseFloat((cells[sortByIdx] || {}).textContent || "");
        } else {
          // Find the sibling row whose next-inner dim cell has @bcdGr='1'
          // and whose preceding dims (up to and including ourIdx) match this row
          for (const sibling of allRows) {
            const sc   = childElems(sibling, "C");
            const next = sc[nextDimIdx];
            if (!next || next.getAttribute("bcdGr") !== "1") continue;
            const matches = isOutermost
              ? ((cells[ourIdx] || {}).textContent || "") ===
                ((sc[ourIdx] || {}).textContent || "")
              : Array.from({length: ourIdx + 1}, (_, i) => i).every(pi =>
                  ((cells[pi] || {}).textContent || "") ===
                  ((sc[pi] || {}).textContent || "")
                );
            if (matches) {
              val = parseFloat((sc[sortByIdx] || {}).textContent || "");
              break;
            }
          }
        }
        map.set(row, val);
      }
      return map;
    });

    // Multi-key stable sort
    sortedRows.sort((a, b) => {
      const aC = childElems(a, "C");
      const bC = childElems(b, "C");

      for (let si = 0; si < rowSortSpecs.length; si++) {
        const spec  = rowSortSpecs[si];
        const id    = spec.getAttribute("id");
        const sort  = spec.getAttribute("sort") || "ascending";
        const total = spec.getAttribute("total");
        const info  = colById.get(id);
        if (!info) continue;
        const idx  = info.idx;
        const desc = sort === "descending";

        // Total placement wins over value sort
        if (total) {
          const aGr = (aC[idx] || {}).getAttribute ? (aC[idx].getAttribute("bcdGr") || "") : "";
          const bGr = (bC[idx] || {}).getAttribute ? (bC[idx].getAttribute("bcdGr") || "") : "";
          if ((aGr === "1") !== (bGr === "1")) {
            const leading = total === "leading";
            return (aGr === "1") ? (leading ? -1 : 1) : (leading ? 1 : -1);
          }
        }

        if (!spec.getAttribute("sort")) continue;

        // Determine sort values
        const sbMap    = sortByMaps[si];
        const useOrder = hasCellOrder(info.col);
        let aVal, bVal, numeric = false;

        if (sbMap) {
          aVal = sbMap.get(a);
          bVal = sbMap.get(b);
          numeric = true;
        } else if (isNumericCol(info.col)) {
          // Numeric type: parse @order (if present) or cell text as number
          const av = useOrder ? (aC[idx] ? (aC[idx].getAttribute("order") || "") : "") : ((aC[idx] || {}).textContent || "");
          const bv = useOrder ? (bC[idx] ? (bC[idx].getAttribute("order") || "") : "") : ((bC[idx] || {}).textContent || "");
          aVal = parseFloat(av);
          bVal = parseFloat(bv);
          numeric = true;
        } else if (useOrder) {
          aVal = aC[idx] ? (aC[idx].getAttribute("order") || "") : "";
          bVal = bC[idx] ? (bC[idx].getAttribute("order") || "") : "";
        } else {
          // String sort with empty-last (matches XSLT concat(boolean(empty),'&#xE0F0;',value))
          const at = (aC[idx] || {}).textContent || "";
          const bt = (bC[idx] || {}).textContent || "";
          aVal = (at === "" ? "true" : "false") + MAGIC + at;
          bVal = (bt === "" ? "true" : "false") + MAGIC + bt;
        }

        let cmp;
        if (numeric) {
          const an = typeof aVal === "number" ? aVal : parseFloat(aVal);
          const bn = typeof bVal === "number" ? bVal : parseFloat(bVal);
          if (isNaN(an) && isNaN(bn)) cmp = 0;
          else if (isNaN(an)) cmp = 1;
          else if (isNaN(bn)) cmp = -1;
          else cmp = an < bn ? -1 : an > bn ? 1 : 0;
        } else {
          cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
        if (cmp !== 0) return desc ? -cmp : cmp;
      }
      return 0;
    });
  }

  //-----------------------------------------
  // Column ordering — compute keptColIdxs (0-based indices, new order)
  let keptColIdxs = null;  // null = no column reordering

  if (colsOrderItems.length) {
    // Explicit list: each item's @id maps to a source column
    keptColIdxs = colsOrderItems
      .map(item => colById.get(item.getAttribute("id")))
      .filter(Boolean)
      .map(info => info.idx);

  } else if (colDimSortSpecs.length && colDimLevelIds.length) {
    // ColDimsOrder: sort col-dim groups, keep dim columns and row-measure columns in place
    const N = colDimLevelIds.length;

    const dimColIdxs     = srcCols.map((c, i) => ({c, i}))
      .filter(({c}) => c.getAttribute("dimId")).map(({i}) => i);
    const rowMeasColIdxs = srcCols.map((c, i) => ({c, i}))
      .filter(({c}) => { const id = c.getAttribute("id"), vid = c.getAttribute("valueId"); return vid && id === vid; })
      .map(({i}) => i);
    const pivotedColIdxs = srcCols.map((c, i) => ({c, i}))
      .filter(({c}) => { const id = c.getAttribute("id"), vid = c.getAttribute("valueId"); return vid && id !== vid; })
      .map(({i}) => i);

    if (pivotedColIdxs.length) {
      // N-segment col-dim key prefix extracted from a pivoted column's @id
      const getKey = id => id.split("|").slice(0, N).join("|");

      // Collect distinct col-dim keys in document order
      const seenKeys = new Set();
      const distinctKeys = [];
      for (const idx of pivotedColIdxs) {
        const k = getKey(srcCols[idx].getAttribute("id"));
        if (!seenKeys.has(k)) { seenKeys.add(k); distinctKeys.push(k); }
      }

      // For each colDimSortSpec with @sortBy, build: colDimKey -> numeric sort value.
      // The value comes from the appropriate total-column in non-subtotal data rows.
      //
      // For col-dim key ck at level li, the lookup column prefix is:
      //   ck.parts[0..li] joined by "|" + "|" + MAGIC+"1"   (if not the last level)
      //   ck.parts[0..N-1] joined by "|" + "|"               (at the last level)
      // This mirrors the XSLT's colDimCumul + '&#xE0F0;1' logic in sortColDims.
      const sortValMaps = colDimSortSpecs.map(spec => {
        const sortBy  = spec.getAttribute("sortBy");
        if (!sortBy) return null;
        const levelId = spec.getAttribute("id");
        const li      = colDimLevelIds.indexOf(levelId);
        if (li === -1) return null;
        const isLast  = li === N - 1;

        const map = new Map();
        for (const ck of distinctKeys) {
          const colDimCumul  = ck.split("|").slice(0, li + 1).join("|") + "|";
          const lookupPrefix = isLast ? colDimCumul : colDimCumul + MAGIC + "1";

          const sortCol = srcCols.find(c =>
            c.getAttribute("valueId") === sortBy &&
            (c.getAttribute("id") || "").startsWith(lookupPrefix)
          );
          if (!sortCol) { map.set(ck, NaN); continue; }
          const sortColIdx = srcCols.indexOf(sortCol);

          // Value from the first non-subtotal row that has a value in the sort column
          let val = NaN;
          for (const row of allRows) {
            const cells = childElems(row, "C");
            if (cells.some(cell => cell.getAttribute("bcdGr") === "0")) continue;
            const v = parseFloat((cells[sortColIdx] || {}).textContent || "");
            if (!isNaN(v)) { val = v; break; }
          }
          map.set(ck, val);
        }
        return map;
      });

      // Caption map: colDimKey -> [captionSeg0..N-1], or null when @caption is absent.
      const captionMap = new Map();
      for (const idx of pivotedColIdxs) {
        const col = srcCols[idx];
        const k = getKey(col.getAttribute("id"));
        if (!captionMap.has(k)) {
          const cap = col.getAttribute("caption");
          captionMap.set(k, cap !== null ? cap.split("|").slice(0, N) : null);
        }
      }

      // Order map: colDimKey -> [orderSeg0..N-1], or null when @order is absent.
      // Set by colDims.js only when at least one col-dim level carries wrs:A[@name='order'].
      const orderMap = new Map();
      for (const idx of pivotedColIdxs) {
        const col = srcCols[idx];
        const k = getKey(col.getAttribute("id"));
        if (!orderMap.has(k)) {
          const ord = col.getAttribute("order");
          orderMap.set(k, ord !== null ? ord.split("|").slice(0, N) : null);
        }
      }

      // Compare two col-dim keys level by level
      const compareKeys = (a, b) => {
        const aParts = a.split("|");
        const bParts = b.split("|");
        for (let li = 0; li < N; li++) {
          const spec = colDimSortSpecs.find(s => s.getAttribute("id") === colDimLevelIds[li]);
          if (!spec) continue;
          const total     = spec.getAttribute("total");
          const sort      = spec.getAttribute("sort") || "ascending";
          const desc      = sort === "descending";
          const specIdx   = colDimSortSpecs.indexOf(spec);
          const svMap     = sortValMaps[specIdx];
          const isNumeric = NUMERIC_TYPES.has(colDimLevelTypeNames[li] || "");

          // Total segment marker: value starts with MAGIC+"1"
          const aIsTotal = (aParts[li] || "").startsWith(MAGIC + "1");
          const bIsTotal = (bParts[li] || "").startsWith(MAGIC + "1");
          if (total && aIsTotal !== bIsTotal)
            return aIsTotal ? (total === "leading" ? -1 : 1) : (total === "leading" ? 1 : -1);

          if (svMap) {
            const aV = svMap.get(a), bV = svMap.get(b);
            let cmp = 0;
            if (!isNaN(aV) && !isNaN(bV)) cmp = aV < bV ? -1 : aV > bV ? 1 : 0;
            else if (isNaN(aV) && !isNaN(bV)) cmp = 1;
            else if (!isNaN(aV) && isNaN(bV)) cmp = -1;
            if (cmp !== 0) return desc ? -cmp : cmp;
          }

          // Sort key: coalesce(@order segment, @caption segment, key segment).
          // Each source uses its own numeric check: order → colDimLevelOrderTypeNames,
          // caption → colDimLevelCaptionTypeNames, key → colDimLevelTypeNames (isNumeric).
          // This prevents the id type (e.g. INTEGER) from being applied to a string caption
          // ("Nokia"), which would produce NaN/NaN → cmp=0 → city sort becoming primary.
          const aOrds = orderMap.get(a),  bOrds = orderMap.get(b);
          const aCaps = captionMap.get(a), bCaps = captionMap.get(b);
          const aOrd = (aOrds && aOrds[li] !== undefined && aOrds[li] !== "") ? aOrds[li] : null;
          const bOrd = (bOrds && bOrds[li] !== undefined && bOrds[li] !== "") ? bOrds[li] : null;
          const aCap = (aCaps !== null && aCaps !== undefined && aCaps[li] !== undefined) ? aCaps[li] : null;
          const bCap = (bCaps !== null && bCaps !== undefined && bCaps[li] !== undefined) ? bCaps[li] : null;
          let ac, bc, sortNumeric;
          if (aOrd !== null || bOrd !== null) {
            ac = aOrd !== null ? aOrd : (aParts[li] || "");
            bc = bOrd !== null ? bOrd : (bParts[li] || "");
            sortNumeric = NUMERIC_TYPES.has(colDimLevelOrderTypeNames[li] || "");
          } else if (aCap !== null || bCap !== null) {
            ac = aCap !== null ? aCap : (aParts[li] || "");
            bc = bCap !== null ? bCap : (bParts[li] || "");
            sortNumeric = NUMERIC_TYPES.has(colDimLevelCaptionTypeNames[li] || "");
          } else {
            ac = aParts[li] || "";
            bc = bParts[li] || "";
            sortNumeric = isNumeric;
          }
          if (ac !== bc) {
            if (sortNumeric) {
              const an = parseFloat(ac), bn = parseFloat(bc);
              const cmp = isNaN(an) && isNaN(bn) ? 0 : isNaN(an) ? 1 : isNaN(bn) ? -1 : an < bn ? -1 : an > bn ? 1 : 0;
              if (cmp !== 0) return desc ? -cmp : cmp;
            } else {
              return desc ? (ac < bc ? 1 : -1) : (ac < bc ? -1 : 1);
            }
          }
        }
        return 0;
      };

      distinctKeys.sort(compareKeys);

      // Final column index order: dim cols → row-measure cols → sorted col-dim measure cols
      keptColIdxs = [...dimColIdxs, ...rowMeasColIdxs];
      for (const ck of distinctKeys) {
        for (const idx of pivotedColIdxs) {
          if (getKey(srcCols[idx].getAttribute("id")) === ck) keptColIdxs.push(idx);
        }
      }
    }
  }

  //-----------------------------------------------------
  // Early exit if nothing actually changed
  const rowsChanged = sortedRows.some((r, i) => r !== allRows[i]);
  if (!rowsChanged && !keptColIdxs) return;

  //-----------------------------------------------------
  // Build result document
  const doc     = bcdui.core.browserCompatibility.cloneDocument(src);
  const newRoot = doc.documentElement;
  const mkElem  = ln => doc.createElementNS(WRS_NS, ln);

  const copyAttrs = (dst, from) => {
    for (let i = 0; i < from.attributes.length; i++) {
      const a = from.attributes[i];
      dst.setAttribute(a.name, a.value);
    }
  };

  if (keptColIdxs) {
    const newHdrCols = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
    while (newHdrCols.firstChild) newHdrCols.removeChild(newHdrCols.firstChild);
    let pos = 1;
    for (const idx of keptColIdxs) {
      const sc = srcCols[idx];
      const c  = mkElem("C");
      copyAttrs(c, sc);
      c.setAttribute("pos", String(pos++));
      for (let ch = sc.firstChild; ch; ch = ch.nextSibling) c.appendChild(ch.cloneNode(true));
      newHdrCols.appendChild(c);
    }
    const valRes = childElems(newRoot, "ValidationResult")[0];
    if (valRes) valRes.parentNode.removeChild(valRes);
  }

  const newData = childElems(newRoot, "Data")[0];
  while (newData.firstChild) newData.removeChild(newData.firstChild);

  for (const row of sortedRows) {
    const newRow = doc.createElementNS(WRS_NS, row.localName);
    copyAttrs(newRow, row);
    if (keptColIdxs) {
      // wrs:M rows carry parallel wrs:C (current) and wrs:O (original) sequences
      const cCells = childElems(row, "C");
      const oCells = childElems(row, "O");
      for (const idx of keptColIdxs) {
        newRow.appendChild(cCells[idx] ? cCells[idx].cloneNode(true) : mkElem("C"));
        if (idx < oCells.length) newRow.appendChild(oCells[idx].cloneNode(true));
      }
    } else {
      for (let ch = row.firstChild; ch; ch = ch.nextSibling) newRow.appendChild(ch.cloneNode(true));
    }
    newData.appendChild(newRow);
  }

  // Return sorted document
  return doc;
};

bcdui.wrs.orderRowsAndCols.bcdName = "bcdui.wrs.orderRowsAndCols";
