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
 * Applies types cumulate, cumulate% and % calculations along rows (top-down) or columns (left-to-right) of a Wrs.
 *
 * Parameters:
 *   paramModel  - DOM with xp:CumulAndPercOfTotal parameter sets
 *   paramSetId  - optional id selecting the parameter set (chain uses 'rowCumul' / 'colCumul')
 *
 * The Wrs DOM is modified in place
 *
 * Intentional deviations from the XSLT pair:
 *  - Rows whose last dim cell has no @bcdGr attribute are treated as normal rows and take part in
 *    cumulation. The XSLT's keys silently dropped such rows from the output.
 *  - Column groups are derived per column id instead of from the segment count of the last header
 *    column, which only matters for Wrs with mixed-depth column dimensions.
 */
bcdui.wrs.cumulAndPercOfTotal = function( docIn, params )
{
  const XP_NS = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
  const COL_TOTAL = bcdui.core.magicChar.dimTotal;   // marker of a (sub)total member in a col-dim part of @id
  const TYPES = ["cumulate", "cumulate%", "%"];   // order = precedence, as the xsl:when order

  // Helper
  const childElems = (el, localName) => {
    const res = [];
    for( let c = el && el.firstChild; c; c = c.nextSibling )
      if( c.nodeType === 1 && c.localName === localName )
        res.push(c);
    return res;
  };
  // XPath number() semantics: empty or non-numeric -> NaN (Number('') would be 0)
  const num = el => {
    if( !el ) return NaN;
    const t = el.textContent.trim();
    return t === "" ? NaN : Number(t);
  };

  //-------------------------------------
  // Get the parameter set
  const paramSetId = params.paramSetId || "";
  let paramModel = params.paramModel;
  if( paramModel && typeof paramModel.getData === "function" )
    paramModel = paramModel.getData();
  if( !paramModel )
    return;

  const paramSets = Array.from( paramModel.getElementsByTagNameNS(XP_NS, "CumulAndPercOfTotal") )
    .filter( ps => ps.getAttribute("paramSetId") === paramSetId || (!ps.getAttribute("paramSetId") && !paramSetId) );

  const readSpecs = elemName => {
    const specs = [];
    paramSets.forEach( ps => childElems(ps, elemName).forEach( cum => childElems(cum, "C").forEach( c =>
          specs.push({ valueId: c.getAttribute("valueId"), type: c.getAttribute("type"), cumulateColDim: c.getAttribute("cumulateColDim") })
    )));
    return specs;
  };
  const colSpecs = readSpecs("ColCumulate");   // cumulate top-down over the rows of a column
  const rowSpecs = readSpecs("RowCumulate");   // cumulate left-to-right over the columns of a row

  // We may have nothing to do. We return nothing to indicate the transformatino can continue with our input
  if( colSpecs.length === 0 && rowSpecs.length === 0 )
    return;

  //-------------------------------------
  // OK, we have work to do
  const doc = bcdui.core.browserCompatibility.cloneDocument( docIn );
  
  const rowDimIds = [];
  paramSets.forEach( ps => childElems(ps, "RowDimensions").forEach( rd => childElems(rd, "Columns").forEach( cols =>
    childElems(cols, "C").forEach( c => rowDimIds.push(c.getAttribute("id")) )
  )));

  //-------------------------------------
  // Header: mark cumulated columns and determine per column position what to calculate
  const headerColsElem = childElems( childElems(doc.documentElement, "Header")[0] || null, "Columns" )[0];
  const headerCols = headerColsElem ? childElems(headerColsElem, "C") : [];
  const dimCount = headerCols.filter( c => c.getAttribute("dimId") ).length;

  // Mark the header in the output
  headerCols.forEach( c => {
    const vId = c.getAttribute("valueId");
    const cSpec = colSpecs.find( s => s.valueId === vId );
    if( cSpec ) c.setAttribute("bcdColCumulate", cSpec.type);
    const rSpec = rowSpecs.find( s => s.valueId === vId );
    if( rSpec ) c.setAttribute("bcdRowCumulate", rSpec.type);
  });

  // colCumulType/rowCumulType: calculation type per 0-based cell position, null if none
  const nCols = headerCols.length;
  const colCumulType = new Array(nCols).fill(null);
  const rowCumulType = new Array(nCols).fill(null);
  // Column groups for row cumulation: same col-dims except the last one and same valueId
  const groupOfCol = new Array(nCols).fill(null);
  const groupMembers = new Map();   // group key -> ascending cell positions

  headerCols.forEach( (c, i) => {
    const id = c.getAttribute("id") || "";
    const vId = c.getAttribute("valueId");
    colCumulType[i] = TYPES.find( t => colSpecs.some( s =>
      s.type === t && (s.cumulateColDim ? id === s.cumulateColDim + "|" + s.valueId : s.valueId === vId) ) ) || null;
    if( id.indexOf(COL_TOTAL) !== -1 )   // columns of a col-dim (sub)total neither get row-cumulated nor count as group member
      return;
    rowCumulType[i] = TYPES.find( t => rowSpecs.some( s => s.type === t && s.valueId === vId ) ) || null;
    const parts = id.split("|");         // colDim1|...|colDimN|valueId
    const key = parts.slice(0, Math.max(parts.length - 2, 0)).join("|") + "|" + (vId || "");
    groupOfCol[i] = key;
    if( !groupMembers.has(key) )
      groupMembers.set(key, []);
    groupMembers.get(key).push(i);
  });

  //-------------------------------------
  // Group the rows: same row-dims except the last one; (sub)total rows (@bcdGr='1' on the last
  // dim cell) keep their position and form their own group
  // Allows for cumulation/% in respect to an inner dimensions
  const data = childElems(doc.documentElement, "Data")[0];
  if( !data )
    return;
  const rows = childElems(data, "R");
  const cellsOf = r => childElems(r, "C");
  const isTotal = cells => dimCount > 0 && cells[dimCount - 1] && cells[dimCount - 1].getAttribute("bcdGr") === "1";

  const rowDimPos = rowDimIds.map( id => headerCols.findIndex( c => c.getAttribute("id") === id ) );
  const keyPos = rowDimPos.slice(0, -1);

  const dimGroups = [];   // each dimGroup is an array of rows forming one cumulation scope, in doc order
  if( rowDimIds.length === 0 ) {
    if( rows.length )
      dimGroups.push(rows);
  } else {
    const groups = new Map();
    rows.forEach( r => {
      const cells = cellsOf(r);
      if( isTotal(cells) ) {
        dimGroups.push([r]);
      } else {
        // We concat the dim values with | and that becomes our key
        const key = keyPos.map( p => (cells[p] ? cells[p].textContent : "") + "|" ).join("");
        let g = groups.get(key);
        if( !g ) {
          g = [];
          groups.set(key, g);
          dimGroups.push(g);
        }
        g.push(r);
      }
    });
    // Like the XSLT we output each group en block at the position of its first row
    dimGroups.forEach( dimGroup => dimGroup.forEach( r => data.appendChild(r) ) );
  }

  //-------------------------------------
  // Calculate
  const writeCell = (cell, value, isPercent) => {
    if( isPercent ) {
      cell.setAttribute("unit", "%");
      cell.setAttribute("scale", "1");
    }
    while( cell.firstChild )
      cell.removeChild(cell.firstChild);
    cell.appendChild( doc.createTextNode(String(value)) );
  };

  // Each dimGroup holds all rows with the same dimension values.
  // vals is snapshotted before any writes so neither col- nor row-wise steps see overwritten values when summing previous values
  dimGroups.forEach( dimGroup => {
    const cellEls = dimGroup.map(cellsOf);
    const vals = cellEls.map( cs => { const v = []; for( let i = 0; i < nCols; i++ ) v[i] = num(cs[i]); return v; } );
    const totalRow = cellEls.map( cs => isTotal(cs) );

    // Column-wise (top-down): total rows contribute to sums where grouped in (no-row-dim case) but keep their value
    for( let ci = 0; ci < nCols; ci++ ) {
      const type = colCumulType[ci];
      if( !type )
        continue;
      let subTotal = 0;
      if( type !== "cumulate" )
        vals.forEach( v => { if( !isNaN(v[ci]) ) subTotal += v[ci]; } );
      let running = 0;
      dimGroup.forEach( (r, ri) => {
        if( !isNaN(vals[ri][ci]) )
          running += vals[ri][ci];
        const cell = cellEls[ri][ci];
        if( !cell || totalRow[ri] )
          return;
        if( type === "cumulate" )
          writeCell(cell, running, false);
        else if( type === "cumulate%" )
          writeCell(cell, running / subTotal, true);
        else
          writeCell(cell, vals[ri][ci] / subTotal, true);
      });
    }

    // Row-wise (left-to-right) within the column group; also applies to total rows
    dimGroup.forEach( (r, ri) => {
      const v = vals[ri];
      for( let ci = 0; ci < nCols; ci++ ) {
        const type = rowCumulType[ci];
        // on normal rows a column cumulation on the same column wins (xsl:when order)
        if( !type || (colCumulType[ci] && !totalRow[ri]) )
          continue;
        const cell = cellEls[ri][ci];
        if( !cell )
          continue;
        let cumul = 0, total = 0;
        groupMembers.get(groupOfCol[ci]).forEach( m => {
          if( !isNaN(v[m]) ) {
            total += v[m];
            if( m <= ci )
              cumul += v[m];
          }
        });
        // cumulate, % or cumulate %
        if( type === "cumulate" )
          writeCell(cell, cumul, false);
        else if( type === "cumulate%" )
          writeCell(cell, cumul / total, true);
        else
          writeCell(cell, v[ci] / total, true);
      }
    });
  });
  
  // Done
  return doc;
};
