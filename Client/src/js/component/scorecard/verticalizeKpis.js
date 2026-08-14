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
 * Applies the verticalizeKpis transformation to a WRS scorecard result.
 * JavaScript equivalent of Client/src/js/component/scorecard/verticalizeKpis.xslt.
 *
 * The original XSLT was a two-stage pipeline: the outer XSLT generated a second
 * XSLT stylesheet at runtime which was then applied to the WRS.  This function
 * collapses both stages into one direct DOM pass.
 *
 * Two modes, driven by scc:Internal/scc:VerticalizeKpis/@doVerticalize:
 *   true  – Each KPI becomes a row.  Source rows × KPIs → output rows.
 *   false – KPIs remain as column groups, one group per KPI per source row.
 *
 * Parameters:
 *   sccDefinition – Scorecard definition DOM or DataProvider
 *
 * Returns a new WRS document or undefined if inputs are missing.
 */
bcdui.component.scorecard.verticalizeKpis = function(docIn, params) {

  // Starting Transformer bcdui.component.scorecard.verticalizeKpis
  const SCC_NS  = "http://www.businesscode.de/schema/bcdui/scorecard-1.0.0";
  const DM_NS   = "http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0";
  const WRS_NS  = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  const CALC_NS = "http://www.businesscode.de/schema/bcdui/calc-1.0.0";
  const MAGIC   = bcdui.core.magicChar.dimEmpty; // &#xE0F0; — used in pivot column @id matching

  // ---- helpers ----
  const childElems = (el, ln) => {
    const res = [];
    if (!el) return res;
    for (let c = el.firstChild; c; c = c.nextSibling)
      if (c.nodeType === 1 && (!ln || c.localName === ln)) res.push(c);
    return res;
  };

  const descendants = (el, localName, ns) => {
    const res = [];
    const walk = n => {
      for (let c = n && n.firstChild; c; c = c.nextSibling)
        if (c.nodeType === 1) {
          if ((!localName || c.localName === localName) && (!ns || c.namespaceURI === ns)) res.push(c);
          walk(c);
        }
    };
    walk(el);
    return res;
  };

  const copyAttrs = (dst, from) => {
    for (let i = 0; i < from.attributes.length; i++) {
      const a = from.attributes[i];
      dst.setAttribute(a.name, a.value);
    }
  };

  // ---- resolve inputs ----
  let src = docIn;
  if (src && typeof src.getData === "function") src = src.getData();
  if (!src) return;

  let sccDef = params.sccDefinition;
  if (sccDef && typeof sccDef.getData === "function") sccDef = sccDef.getData();
  if (!sccDef) return;

  const getNS = (ns, ln) => Array.from(sccDef.getElementsByTagNameNS ? sccDef.getElementsByTagNameNS(ns, ln) : []);

  // ---- scorecard definition elements ----
  const internalEl    = getNS(SCC_NS, "Internal")[0];
  const paramSet      = internalEl ? childElems(internalEl, "VerticalizeKpis")[0] : null;
  const doVerticalize = !!(paramSet && paramSet.getAttribute("doVerticalize") === "true");

  const layoutEl      = getNS(SCC_NS, "Layout")[0];
  const aspectRefsEl  = layoutEl ? childElems(layoutEl, "AspectRefs")[0]  : null;
  const kpiRefsEl     = layoutEl ? childElems(layoutEl, "KpiRefs")[0]     : null;
  const dimsEl        = layoutEl ? childElems(layoutEl, "Dimensions")[0]  : null;

  // aspects listed in layout (AspectRef + AspectKpi, in document order)
  const aspectsList = aspectRefsEl
    ? childElems(aspectRefsEl).filter(c => c.localName === "AspectRef" || c.localName === "AspectKpi")
    : [];

  const kpiDefsEl    = getNS(SCC_NS, "Kpis")[0];
  const kpiDefs      = kpiDefsEl ? childElems(kpiDefsEl, "Kpi") : [];
  const kpiDefById   = new Map(kpiDefs.map(k => [k.getAttribute("id"), k]));

  const aspectsEl    = getNS(SCC_NS, "Aspects")[0];
  const aspectDefs   = aspectsEl ? childElems(aspectsEl, "Aspect") : [];
  const aspectDefById = new Map(aspectDefs.map(a => [a.getAttribute("id"), a]));

  // aspect @id → [calc/chooseCalc children] (empty map entry = aspect has no calcs)
  const aspectCalcsByAspId = new Map();
  for (const asp of aspectDefs) {
    const calcs = childElems(asp).filter(c => c.localName === "Calc" || c.localName === "chooseCalc");
    if (calcs.length) aspectCalcsByAspId.set(asp.getAttribute("id"), calcs);
  }

  // only KpiRefs with a matching scc:Kpi definition
  const kpiRefs = kpiRefsEl
    ? childElems(kpiRefsEl, "KpiRef").filter(kr => kpiDefById.has(kr.getAttribute("idRef")))
    : [];

  // dimension level refs under scc:Layout/scc:Dimensions
  const allLevelRefs = dimsEl
    ? descendants(dimsEl).filter(c =>
        (c.localName === "LevelRef" && c.namespaceURI === DM_NS) ||
        (c.localName === "LevelKpi" && c.namespaceURI === SCC_NS))
    : [];
  const dimLevelRefs = allLevelRefs.filter(c => c.localName === "LevelRef");

  // ---- source WRS ----
  const root      = src.documentElement;
  const hdrColsEl = childElems(childElems(root, "Header")[0], "Columns")[0];
  const srcCols   = hdrColsEl ? childElems(hdrColsEl, "C") : [];
  const colHeadById = new Map(srcCols.map(c => [c.getAttribute("id"), c]));

  // ---- number formatting for sub-aspect cell attributes ----
  // Mirrors the formatNumber template from numberFormatting.xslt (scale-based rounding).
  const fmtNum = (rawVal, colDef) => {
    const n = Number(rawVal);
    if (isNaN(n)) return "";
    const scale = colDef ? colDef.getAttribute("scale") : null;
    return scale != null ? n.toFixed(Number(scale)) : String(n);
  };

  // ---- sub-aspect attribute writing ----
  // Mirrors the scc:AspectRef/scc:AspectRef template (applied to each cell).
  // Child scc:AspectRef elements of an AspectRef/AspectKpi become attributes on the data cell.
  const writeSubAspectAttrs = (parentAspectRef, kpiId, allCols, cellEl) => {
    for (const subRef of childElems(parentAspectRef, "AspectRef")) {
      const attrAspId = subRef.getAttribute("idRef");
      const aspCalcs  = aspectCalcsByAspId.get(attrAspId);
      if (aspCalcs && aspCalcs.length) {
        const multi = aspCalcs.length > 1;
        for (const calc of aspCalcs) {
          const prop    = multi ? "." + (calc.getAttribute("id") || "") : "";
          const colHead = colHeadById.get("asp_" + attrAspId + "_" + kpiId + prop);
          if (!colHead) continue;
          const srcCell = allCols[Number(colHead.getAttribute("pos")) - 1];
          const n       = Number(srcCell ? srcCell.textContent : NaN);
          if (!isNaN(n)) cellEl.setAttribute(attrAspId + prop, fmtNum(n, colHead));
        }
      } else {
        const colHead = colHeadById.get("asp_" + attrAspId + "_kpi_" + kpiId);
        if (!colHead) continue;
        const kpiDef  = kpiDefById.get(kpiId);
        const calcEl  = kpiDef ? childElems(kpiDef).find(c => c.localName === "Calc") : null;
        const srcCell = allCols[Number(colHead.getAttribute("pos")) - 1];
        cellEl.setAttribute(attrAspId, fmtNum(srcCell ? srcCell.textContent : "", calcEl));
      }
    }
  };

  // ---- header sub-aspect wrs:A elements (headerCAttributes mode) ----
  // Each child AspectRef of an AspectRef/AspectKpi becomes a wrs:A in the header column.
  const buildHeaderSubAspects = (parentAspectRef, doc) => {
    const result = [];
    for (const subRef of childElems(parentAspectRef, "AspectRef")) {
      const aspDef = aspectDefById.get(subRef.getAttribute("idRef"));
      if (!aspDef) continue;
      const calcs = childElems(aspDef).filter(c => c.localName === "Calc" || c.localName === "chooseCalc");
      if (calcs.length) {
        for (const calc of calcs) {
          const hasId = !!calc.getAttribute("id");
          const a = doc.createElementNS(WRS_NS, "A");
          a.setAttribute("id",
            aspDef.getAttribute("id") + (hasId ? "." + calc.getAttribute("id") : ""));
          a.setAttribute("caption",
            aspDef.getAttribute("caption") +
            (hasId && calc.getAttribute("caption") ? " - " + calc.getAttribute("caption") : ""));
          if (calc.getAttribute("type-name")) a.setAttribute("type-name", calc.getAttribute("type-name"));
          if (calc.getAttribute("scale"))     a.setAttribute("scale",     calc.getAttribute("scale"));
          if (calc.getAttribute("unit"))      a.setAttribute("unit",      calc.getAttribute("unit"));
          result.push(a);
        }
      } else {
        const a = doc.createElementNS(WRS_NS, "A");
        copyAttrs(a, aspDef);
        result.push(a);
      }
    }
    return result;
  };

  // Count total output columns produced by aspects[0..idx-1] (accounts for multi-calc aspects).
  // Mirrors the $preceding / $precedingAsp calculation in the measureHeaders template.
  const precedingCols = idx => {
    let n = 0;
    for (let i = 0; i < idx; i++) {
      const asp = aspectsList[i];
      if (asp.localName === "AspectKpi") n += 1;
      else { const c = aspectCalcsByAspId.get(asp.getAttribute("idRef")); n += c ? c.length : 1; }
    }
    return n;
  };

  // ---- measure header columns ----
  // Mirrors the measureHeaders named template.
  // kpiOffset: $aspCount*(kpiPosition-1) for non-verticalize, 0 for verticalize.
  // kpiDef:    null for verticalize (no prefix), defined for non-verticalize (adds id|/caption| prefix).
  const buildMeasureHeaders = (doc, countDims, kpiOffset, kpiDef) => {
    const kpiCap = kpiDef ? kpiDef.getAttribute("caption") + "|" : "";
    const kpiPfx = kpiDef ? kpiDef.getAttribute("id")      + "|" : "";
    const kpiCalcEl = kpiDef ? childElems(kpiDef).find(c => c.localName === "Calc") : null;
    const aspKpiCap = kpiDefsEl ? kpiDefsEl.getAttribute("aspectKpiCaption") || "" : "";

    const cols = [];
    for (let ai = 0; ai < aspectsList.length; ai++) {
      const asp  = aspectsList[ai];
      const prec = precedingCols(ai);
      const aspId = asp.getAttribute("idRef") || "";

      const setTyping = (c, src) => {
        if (src && src.getAttribute("type-name")) c.setAttribute("type-name", src.getAttribute("type-name"));
        if (src && src.getAttribute("scale"))     c.setAttribute("scale",     src.getAttribute("scale"));
        if (src && src.getAttribute("unit"))      c.setAttribute("unit",      src.getAttribute("unit"));
      };

      if (asp.localName === "AspectKpi") {
        const c = doc.createElementNS(WRS_NS, "C");
        c.setAttribute("pos",     String(1 + kpiOffset + countDims + prec));
        c.setAttribute("id",      kpiPfx + "performance");
        c.setAttribute("valueId", kpiPfx + "performance");
        c.setAttribute("caption", kpiCap + (asp.getAttribute("caption") || aspKpiCap));
        setTyping(c, kpiCalcEl);
        for (const a of buildHeaderSubAspects(asp, doc)) c.appendChild(a);
        cols.push(c);

      } else { // AspectRef
        const aspDef  = aspectDefById.get(aspId);
        const calcs   = aspectCalcsByAspId.get(aspId);
        const baseCap = asp.getAttribute("caption") || (aspDef ? aspDef.getAttribute("caption") || "" : "");

        if (calcs && calcs.length) {
          const multi = calcs.length > 1;
          for (let ci = 0; ci < calcs.length; ci++) {
            const calc = calcs[ci];
            const c    = doc.createElementNS(WRS_NS, "C");
            c.setAttribute("pos",     String(ci + 1 + kpiOffset + countDims + prec));
            c.setAttribute("id",      kpiPfx + "asp_" + aspId + "." + (calc.getAttribute("id") || ""));
            c.setAttribute("valueId", aspId + "." + (calc.getAttribute("id") || ""));
            c.setAttribute("caption", kpiCap + baseCap + (multi ? "|" + (calc.getAttribute("caption") || "") : ""));
            setTyping(c, calc);
            for (const a of buildHeaderSubAspects(asp, doc)) c.appendChild(a);
            cols.push(c);
          }
        } else {
          const c = doc.createElementNS(WRS_NS, "C");
          c.setAttribute("pos",     String(1 + kpiOffset + countDims + prec));
          c.setAttribute("id",      kpiPfx + "asp_" + aspId);
          c.setAttribute("valueId", aspId);
          c.setAttribute("caption", kpiCap + baseCap);
          setTyping(c, kpiCalcEl); // no calcs: borrow type from kpiDef/calc:Calc
          for (const a of buildHeaderSubAspects(asp, doc)) c.appendChild(a);
          cols.push(c);
        }
      }
    }
    return cols;
  };

  // ---- measure data cells for one (row, kpi) combination ----
  // Mirrors the measureData named template.
  const buildMeasureData = (doc, kpiDef, kpiColPos, allCols) => {
    const kpiId     = kpiDef ? kpiDef.getAttribute("id") || "" : "";
    const kpiCalcEl = kpiDef ? childElems(kpiDef).find(c => c.localName === "Calc") : null;
    const cells     = [];

    const setTyping = (c, src) => {
      if (src && src.getAttribute("type-name")) c.setAttribute("type-name", src.getAttribute("type-name"));
      if (src && src.getAttribute("scale"))     c.setAttribute("scale",     src.getAttribute("scale"));
      if (src && src.getAttribute("unit"))      c.setAttribute("unit",      src.getAttribute("unit"));
    };

    for (const asp of aspectsList) {
      const aspId = asp.getAttribute("idRef") || "";
      const calcs = aspectCalcsByAspId.get(aspId);

      if (asp.localName === "AspectKpi") {
        const c     = doc.createElementNS(WRS_NS, "C");
        if (doVerticalize) setTyping(c, kpiCalcEl);
        writeSubAspectAttrs(asp, kpiId, allCols, c);
        const srcCell = kpiColPos > 0 ? allCols[kpiColPos - 1] : null;
        if (srcCell) c.textContent = srcCell.textContent;
        cells.push(c);

      } else if (calcs && calcs.length) {
        const multi = calcs.length > 1;
        for (const calc of calcs) {
          const prop    = multi ? "." + (calc.getAttribute("id") || "") : "";
          const colHead = colHeadById.get("asp_" + aspId + "_" + kpiId + prop);
          const c       = doc.createElementNS(WRS_NS, "C");
          writeSubAspectAttrs(asp, kpiId, allCols, c);
          if (colHead) {
            const srcCell = allCols[Number(colHead.getAttribute("pos")) - 1];
            if (doVerticalize) {
              setTyping(c, colHead);
              if (srcCell) setTyping(c, srcCell); // cell attrs override header attrs
            }
            if (srcCell) c.textContent = srcCell.textContent;
          }
          cells.push(c);
        }
      } else {
        // No calcs: column id is asp_{aspId}_kpi_{kpiId}
        const colHead = colHeadById.get("asp_" + aspId + "_kpi_" + kpiId);
        if (colHead) {
          const c       = doc.createElementNS(WRS_NS, "C");
          writeSubAspectAttrs(asp, kpiId, allCols, c);
          if (doVerticalize) setTyping(c, colHead);
          const srcCell = allCols[Number(colHead.getAttribute("pos")) - 1];
          if (srcCell) c.textContent = srcCell.textContent;
          cells.push(c);
        }
      }
    }
    return cells;
  };

  // ---- row sorting ----
  // Mirrors the xsl:sort elements generated by the rowSorting named template.
  // Each $paramSet/xp:RowsOrder/wrs:Columns/* with @total and/or @sort produces
  // separate sort passes: total-order first, then value order (matching XSLT sort declaration order).
  const rowsOrderEl = paramSet ? childElems(paramSet, "RowsOrder")[0] : null;
  const sortSpecEls = rowsOrderEl
    ? childElems(rowsOrderEl).flatMap(childElems).filter(el => el.getAttribute("sort") || el.getAttribute("total"))
    : [];

  const resolvedSorts = sortSpecEls.map(spec => {
    const id = spec.getAttribute("id") || "";
    // find column: exact @id match, or pivoted col-dim total column (MAGIC+"1" in @id, @valueId matches)
    const col = srcCols.find(c =>
      c.getAttribute("id") === id ||
      (c.getAttribute("id") && c.getAttribute("id").includes(MAGIC + "1") && c.getAttribute("valueId") === id)
    );
    return {
      total:      spec.getAttribute("total"),
      sort:       spec.getAttribute("sort"),
      pos:        col ? Number(col.getAttribute("pos")) : -1,
      hasOrderA:  col ? childElems(col, "A").some(a => a.getAttribute("name") === "order") : false
    };
  });

  const sortRows = rows => {
    if (!resolvedSorts.length) return Array.from(rows);
    return Array.from(rows).sort((a, b) => {
      const ac = childElems(a, "C"), bc = childElems(b, "C");
      for (const s of resolvedSorts) {
        if (s.pos < 1) continue;
        const ac0 = ac[s.pos - 1], bc0 = bc[s.pos - 1];

        if (s.total) {
          const ag = ac0 ? ac0.getAttribute("bcdGr") || "0" : "0";
          const bg = bc0 ? bc0.getAttribute("bcdGr") || "0" : "0";
          const d  = s.total === "leading" ? bg.localeCompare(ag) : ag.localeCompare(bg);
          if (d !== 0) return d;
        }

        if (s.sort) {
          const av  = ac0 ? (s.hasOrderA ? ac0.getAttribute("order") || "" : ac0.textContent) : "";
          const bv  = bc0 ? (s.hasOrderA ? bc0.getAttribute("order") || "" : bc0.textContent) : "";
          const an  = Number(av), bn = Number(bv);
          const num = !isNaN(an) && !isNaN(bn) && (av !== "" || bv !== "");
          let d = num ? an - bn : av.localeCompare(bv);
          if (s.sort === "descending") d = -d;
          if (d !== 0) return d;
        }
      }
      return 0;
    });
  };

  // ---- build output document ----
  const doc     = bcdui.core.browserCompatibility.cloneDocument(src);
  const newRoot = doc.documentElement;

  // Rebuild wrs:Columns
  const newHdrColsEl = childElems(childElems(newRoot, "Header")[0], "Columns")[0];
  if (newHdrColsEl) {
    while (newHdrColsEl.firstChild) newHdrColsEl.removeChild(newHdrColsEl.firstChild);

    if (doVerticalize) {
      const levelKpiCaption = kpiDefsEl ? kpiDefsEl.getAttribute("levelKpiCaption") || "" : "";
      let pos = 1;
      for (const lvl of allLevelRefs) {
        const c = doc.createElementNS(WRS_NS, "C");
        c.setAttribute("pos", String(pos++));
        if (lvl.localName === "LevelRef") {
          const dh = srcCols.find(sc => sc.getAttribute("id") === lvl.getAttribute("bRef"));
          if (dh) {
            c.setAttribute("id",        dh.getAttribute("id")        || "");
            c.setAttribute("caption",   dh.getAttribute("caption")   || "");
            c.setAttribute("dimId",     dh.getAttribute("id")        || "");
            c.setAttribute("type-name", dh.getAttribute("type-name") || "");
            for (const a of childElems(dh, "A")) c.appendChild(a.cloneNode(true));
          }
        } else { // scc:LevelKpi
          c.setAttribute("id",      "bcd_kpi_id");
          c.setAttribute("dimId",   "bcd_kpi_id");
          c.setAttribute("caption", lvl.getAttribute("caption") || levelKpiCaption);
          const aEl = doc.createElementNS(WRS_NS, "A");
          aEl.setAttribute("name", "caption");
          aEl.setAttribute("id",   "bcd_kpi_id_caption");
          c.appendChild(aEl);
        }
        newHdrColsEl.appendChild(c);
      }
      // One shared set of measure columns (no KPI prefix — KPIs are rows)
      for (const c of buildMeasureHeaders(doc, allLevelRefs.length, 0, null))
        newHdrColsEl.appendChild(c);

    } else {
      // Dimension columns (dm:LevelRef only)
      let pos = 1;
      for (const lvl of dimLevelRefs) {
        const dh  = srcCols.find(sc => sc.getAttribute("id") === lvl.getAttribute("bRef"));
        const c   = doc.createElementNS(WRS_NS, "C");
        c.setAttribute("pos", String(pos++));
        if (dh) {
          c.setAttribute("id",        dh.getAttribute("id")        || "");
          c.setAttribute("caption",   dh.getAttribute("caption")   || "");
          c.setAttribute("dimId",     dh.getAttribute("id")        || "");
          c.setAttribute("type-name", dh.getAttribute("type-name") || "");
          for (const a of childElems(dh, "A")) c.appendChild(a.cloneNode(true));
        }
        newHdrColsEl.appendChild(c);
      }
      // Per-KPI measure column groups.
      // kpiOffset = aspCount*(ki) mirrors $aspCount*(position()-1) in the XSLT.
      // aspCount is the element count of AspectRef|AspectKpi (not output column count),
      // matching the XSLT variable $aspCount exactly.
      const aspCount = aspectsList.length;
      for (let ki = 0; ki < kpiRefs.length; ki++) {
        const kpiDef = kpiDefById.get(kpiRefs[ki].getAttribute("idRef"));
        for (const c of buildMeasureHeaders(doc, dimLevelRefs.length, aspCount * ki, kpiDef))
          newHdrColsEl.appendChild(c);
      }
    }
  }

  // Rebuild wrs:Data
  const newDataEl = childElems(newRoot, "Data")[0];
  if (newDataEl) {
    while (newDataEl.firstChild) newDataEl.removeChild(newDataEl.firstChild);

    const srcRows = childElems(childElems(root, "Data")[0], "R");

    if (doVerticalize) {
      const levelKpiCaption = kpiDefsEl ? kpiDefsEl.getAttribute("levelKpiCaption") || "" : "";
      // Outer loop: KPIs; inner loop: rows.
      // Sorting is applied per KPI pass, matching the XSLT for-each nesting.
      for (const kpiRef of kpiRefs) {
        const kpiId      = kpiRef.getAttribute("idRef");
        const kpiDef     = kpiDefById.get(kpiId);
        const kpiColHead = colHeadById.get("kpi_" + kpiId);
        const kpiColPos  = kpiColHead ? Number(kpiColHead.getAttribute("pos")) : 0;
        const sorted     = sortRows(srcRows);

        for (let ri = 0; ri < sorted.length; ri++) {
          const allCols = childElems(sorted[ri], "C");
          const newRow  = doc.createElementNS(WRS_NS, "R");
          newRow.setAttribute("id", "R" + (ri + 1) + "_" + kpiId);

          // Dimension cells
          for (const lvl of allLevelRefs) {
            const c = doc.createElementNS(WRS_NS, "C");
            if (lvl.localName === "LevelRef") {
              const p  = Number(lvl.getAttribute("posInWrsBeforeVerticalizeKpis"));
              const sc = p > 0 ? allCols[p - 1] : null;
              if (sc) { copyAttrs(c, sc); c.textContent = sc.textContent; }
            } else { // scc:LevelKpi
              const cap = kpiDef ? kpiDef.getAttribute("caption") || "" : "";
              c.setAttribute("caption", cap || levelKpiCaption);
              if (kpiDef && kpiDef.getAttribute("bcdTranslate"))
                c.setAttribute("bcdTranslate", kpiDef.getAttribute("bcdTranslate"));
              c.textContent = kpiId;
            }
            newRow.appendChild(c);
          }

          for (const c of buildMeasureData(doc, kpiDef, kpiColPos, allCols))
            newRow.appendChild(c);

          newDataEl.appendChild(newRow);
        }
      }
    } else {
      // Non-verticalize: one output row per source row, all KPIs as column groups
      for (const srcRow of sortRows(srcRows)) {
        const allCols = childElems(srcRow, "C");
        const newRow  = doc.createElementNS(WRS_NS, "R");
        newRow.setAttribute("id", srcRow.getAttribute("id") || "");

        for (const lvl of dimLevelRefs) {
          const p  = Number(lvl.getAttribute("posInWrsBeforeVerticalizeKpis"));
          const sc = p > 0 ? allCols[p - 1] : null;
          const c  = doc.createElementNS(WRS_NS, "C");
          if (sc) { copyAttrs(c, sc); c.textContent = sc.textContent; }
          newRow.appendChild(c);
        }

        for (const kpiRef of kpiRefs) {
          const kpiId      = kpiRef.getAttribute("idRef");
          const kpiDef     = kpiDefById.get(kpiId);
          const kpiColHead = colHeadById.get("kpi_" + kpiId);
          const kpiColPos  = kpiColHead ? Number(kpiColHead.getAttribute("pos")) : 0;
          for (const c of buildMeasureData(doc, kpiDef, kpiColPos, allCols))
            newRow.appendChild(c);
        }

        newDataEl.appendChild(newRow);
      }
    }
  }

  return doc;
};
bcdui.component.scorecard.verticalizeKpis.bcdName = "bcdui.component.scorecard.verticalizeKpis";

// Possible fallback XSLT: bcdui.component.scorecard.verticalizeKpis = bcdui.contextPath+"/bcdui/js/component/scorecard/verticalizeKpis.xslt";