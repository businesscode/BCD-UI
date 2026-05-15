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
 * @private
 */
bcdui.wrs.HtmlBuilder = class {

  /**
   *  Empty construtor allows for wasily overwriting
   */  
  constructor() {

    // Standard parameters
    this.boolParams = [
      'makeRowSpan', 'makeColSpan', 'sortRows', 'sortCols', 'hideTotals', 'sortTotalsFirst', 'onlyMeasureForTotal',
      'createHeaderFilters', 'expandCollapseCells', 'createFixHeader', 'headerColsAreUnique',
      'stickyHeader', 'stickyFooter', 'stickyDims', 'showDeletedRows'
    ];
    this.intParams    = ['stickyFirstRows', 'stickyLastRows', 'stickyFirstCols', 'stickyLastCols', 'stickyWidth', 'stickyHeight', 'headerColsCount', 'maxCells'];
    this.stringParams = ['stickyWidthEmptyMessage', 'totalColumnText', 'emptyMessage'];
  }

  /**
   *  
   */  
  transform(wrsDom, parameters) 
  {
    //-------------------------------------
    // Read parameters, plain js and from XslParams
    this.readParameters(parameters);

    // Turn wrsDom to JavaScript object
    let {colDefs, rawRows} = this.transformDomToJs(wrsDom);
    const dimCols = colDefs.filter(c => c.isDim);
    const measureCols = colDefs.filter(c => !c.isDim);
    const numDims = dimCols.length;

    //-------------------------------------
    // No data
    if( rawRows.length == 0 ) {
      const div = document.createElement('div');
      div.className = 'bcdInfoBox';
      div.innerHTML = `<span bcdTranslate="${parameters.emptyMessage}"></span>`;
      return div; 
    }
    
    if(rawRows.some(r=>r.rowType!=="R")) {
      parameters.makeRowSpan = false;
      parameters.sortRows = false;
    }

    
    //-------------------------------------
    // hideTotals TODO also col totals?
    if(parameters.hideTotals) rawRows = rawRows.filter( r => !r.cells.some( c => c.bcdGr===1 ) );
    if(!parameters.showDeletedRows) rawRows = rawRows.filter( r => r.rowType!=="D" );

    //-------------------------------------
    // Sort rows: group details under their subtotals
    // Build a natural key that sorts detail rows before their subtotals
    const totalsSortVal = parameters.sortTotalsFirst ? '' : '\uFFFF';
    function sortKey(row) {
      const parts = [];
      for (let i = 0; i < numDims; i++) { // TODO
        const cell = row.cells[i];
        let value = '\uFFFF';
        if( cell.bcdGr === 1 ) value = totalsSortVal;
        else if( colDefs[i].isNumeric ) value = String(cell.value).padStart(10, '0');
        else if( cell.value ) value = cell.value;
        parts.push(value);
      }
      return parts.join('\x00');
    }
  
    // We want same values grouped but keep the order of the first value appearance
    function groupRows(rows) {
      // For each dim level, map the prefix up to that level → first appearance index
      const firstSeenAtLevel = Array.from({ length: numDims }, () => new Map());
  
      rows.forEach((row, idx) => {
        let prefix = '';
        for (let d = 0; d < numDims; d++) {
          prefix += (d ? '\x00' : '') + (row.cells[d].bcdGr === 1 ? totalsSortVal : (row.cells[d].value || ''));
          if (!firstSeenAtLevel[d].has(prefix)) firstSeenAtLevel[d].set(prefix, idx);
        }
      });
  
      return [...rows].sort((a, b) => {
        let prefixA = '', prefixB = '';
        for (let d = 0; d < numDims; d++) {
          prefixA += (d ? '\x00' : '') + (a.cells[d].bcdGr === 1 ? totalsSortVal : (a.cells[d].value || ''));
          prefixB += (d ? '\x00' : '') + (b.cells[d].bcdGr === 1 ? totalsSortVal : (b.cells[d].value || ''));
          const diff = firstSeenAtLevel[d].get(prefixA) - firstSeenAtLevel[d].get(prefixB);
          if (diff !== 0) return diff;
        }
        return 0;
      });
    }
    
    // We apply sortRows, or for backward compatibility group and leave first appearances of valuesin order where it is
    if(parameters.sortRows) rawRows.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    else if(parameters.makeRowSpan) rawRows = groupRows(rawRows);


    //-------------------------------------
    // Calculate rowspan for dim cells
    // For each dim column, count consecutive rows with the same value
    const rowspans = rawRows.map(() => dimCols.map(() => 1));
    const skip     = rawRows.map(() => dimCols.map(() => false));
  
    for (let d = 0; parameters.makeRowSpan && d < numDims; d++) {
      let i = 0;
      while (i < rawRows.length) {
        const cell = rawRows[i].cells[d];
        if (cell.bcdGr === 1) { i++; continue; } // total rows handle themselves
  
        // count consecutive rows with same value in this dim
        let span = 1;
        while (
          i + span < rawRows.length &&
          rawRows[i + span].cells[d].value === cell.value  &&
          rawRows[i + span].cells[d].bcdGr === 0 &&         
          // all preceding dim columns must have the same value for this row
          Array.from({ length: d }, (_, p) =>
            rawRows[i + span].cells[p].value === rawRows[i].cells[p].value
          ).every(Boolean)
        ) {
          span++;
        }
  
        rowspans[i][d] = span;
        for (let k = 1; k < span; k++) skip[i + k][d] = true;
        i += span;
      }
    }
    

    //-------------------------------------
    // Build table
    const table = document.createElement('table');
    // Set attributes
    table.className = 'bcdReport';
    table.setAttribute("controllerVariableName", parameters.bcdControllerVariableName);
    table.setAttribute("bcdOnLoad", "bcdui.util.htmlBuilderOnLoad");
    const toDataAttr = s => 'data-' + s[0].toLowerCase() + s.slice(1).replace(/([A-Z])/g, '-$1').toLowerCase();
    for (const name of this.boolParams)   table.setAttribute(toDataAttr(name), parameters[name]);
    for (const name of this.intParams)    table.setAttribute(toDataAttr(name), parameters[name]);
    for (const name of this.stringParams) table.setAttribute(toDataAttr(name), parameters[name]);
    

    //-------------------------
    // thead
    this.createTableHeader({table, colDefs});

    //-------------------------
    // tbody
    const tbody = table.createTBody();
  
    let that = this;
    rawRows.forEach((row, ri) => 
    {
      const tr = tbody.insertRow();
      tr.setAttribute('bcdrowident', row.id);
  
      // total level class
      if (row.grpLevel > 0) {
        const level = numDims - row.grpLevel + 1;
        tr.className = `bcdTL${level} bcdTotal`;
      }
  
      //-----------------------------
      // dimension cells
      dimCols.forEach((col, di) => 
      {
        if (skip[ri][di]) return; // covered by rowspan above
  
        const cell = row.cells[di];
        const th   = document.createElement('th');
  
        // total cell
        if (cell.bcdGr === 1) {
          const level      = row.grpLevel > 0 ? numDims - row.grpLevel + 1 : 1;
          th.className     = `bcdTL${level}`;
          th.setAttribute('bcdgr', '1');
          const colspanVal = Math.max(1, numDims - di);
          th.setAttribute('colspan', colspanVal);
          th.setAttribute("bcdTranslate", "bcd_Total");
  
          const bcdTranslate = "bcd_Total";
          th.setAttribute("bcdTranslate", bcdTranslate);
          if (col.isDimTotal) th.className += " bcdTotal";
  
          tr.appendChild(th);
  
          // skip the dim columns covered by this colspan
          di + colspanVal; // just for clarity — the forEach index can't be mutated
          // so we mark them in skip instead:
          for (let s = di + 1; s < di + colspanVal; s++) {
            skip[ri][s] = true;
          }
          return;
        }
        // non-total cell
        if (cell.caption) th.setAttribute('caption', cell.caption);
        if (rowspans[ri][di] > 1) th.setAttribute('rowspan', rowspans[ri][di]);
        if (!cell.caption && !cell.value) th.setAttribute("bcdTranslate", "bcd_EmptyDimmember");
        else th.textContent = cell.caption || cell.value || '';
  
        const bcdTranslate = cell.bcdOt === 1 ? "bcd_OtherDimmember" : undefined;
        if (bcdTranslate) th.setAttribute("bcdTranslate", bcdTranslate);
        if (col.isDimTotal) th.className += " bcdTotal";
  
        tr.appendChild(th);
      });
  
      // measure cells — skip if a total cell already spanned dims
      const alreadyTotaled = row.cells.slice(0, numDims).some(c => c.bcdGr === 1);
  
      //-----------------------------
      // Measures, i.e. all non-dims
      measureCols.forEach((colHead, idx) => {
        const cell = row.cells[numDims + idx];
        this.createMeasureCell({tr, cell, colHead, row, colDefs});
      });
    });
  
    return table;  
  }

  /**
   * Create a measure cell
   * Extension point
   */
  createMeasureCell({tr, cell, colHead, row, colDefs})
  {
    const isNumeric = cell.isNumeric || colHead.isNumeric; 
    const scale = cell.scale || colHead.scale; 
    const unit = cell.unit || colHead.unit; 
    const td   = document.createElement('td');
    td.textContent = isNumeric ? bcdui.wrs.jsUtil.format(cell.value, scale, 'en', unit) : cell.value; // TODO not allways en
    if(cell.value === null || cell.value === '') td.className += " bcdNoNumber";
    if(colHead.isDimTotal) td.className += " bcdTotal";
    tr.appendChild(td);    
  }
  
  
  /**
   * Create thead
   * 
   */
  createTableHeader({table, colDefs}) 
  {
    const thead = table.createTHead();
    const htr   = thead.insertRow();
    htr.setAttribute('bcdrowident', 'bcdMeasureHeader');

    const numLevels = Math.max(...colDefs.map(col => col.caption.split('|').length));

    // Plain header as one row
    if (numLevels === 1) {
      for (const col of colDefs) {
        const th = document.createElement('th');
        th.setAttribute('bcdcolident', col.id);
        th.setAttribute('jdbccolumntypename', col.typeName);
        th.className = col.isDim ? 'bcdDimension' : 'bcdMeasure';
        th.textContent = col.caption;
        htr.appendChild(th);
      }
    }

    // Handle column dimensions  , i.e. multiple header rows
    else {
      const headerRows = Array.from({ length: numLevels }, (_, d) => {
        const tr = document.createElement('tr');
        if (d === 0 && colDefs.colDimLevelIds) tr.setAttribute("levelId", colDefs.colDimLevelIds[0]);
        if (d === numLevels - 1) tr.setAttribute("bcdrowident", "bcdMeasureHeader");
        return tr;
      });
    
      const covered = Array.from({ length: numLevels }, () => new Array(colDefs.length).fill(false));
    
      // Loop over dimension levels
      for (let d = 0; d < numLevels; d++) {
        let i = 0;
        
        // Dimension cell
        while (i < colDefs.length) {
          if (covered[d][i]) { i++; continue; }
    
          const col   = colDefs[i];
          const parts = col.caption.split('|');
    
          // which part index to show at row d:
          // - single part → row 0 only (rowspan=numLevels)
          // - last row    → always the last part
          // - otherwise   → parts[d] if it exists, else covered by rowspan
          let partIndex;
          if (parts.length === 1) {
            partIndex = 0;
          } else if (d === numLevels - 1) {
            partIndex = parts.length - 1; // last part always at bottom
          } else if (d < parts.length - 1) {
            partIndex = d;
          } else {
            i++; continue; // covered by rowspan, shouldn't normally reach here
          }
    
          const label = parts[partIndex] ?? '';
    
          // rowspan:
          // - single part → spans all rows
          // - second-to-last part → spans gap between its row and the last row
          // - others → 1
          let rowspan = 1;
          if (parts.length === 1) {
            rowspan = numLevels;
            for (let dd = 1; dd < numLevels; dd++) covered[dd][i] = true;
          } else if (d === parts.length - 2) {
            // cover the gap rows between this and the last row
            rowspan = numLevels - 1 - d;
            for (let dd = d + 1; dd < numLevels - 1; dd++) covered[dd][i] = true;
          }
    
          
          // ── extend rowspan if next non-lowest levels are both dimTotal ids ──
          if (d < numLevels - 1 && parts.length > 1) {
            const ids = col.id.split('|');
            let dd = d + rowspan;
            while (dd < numLevels - 1) {
              const nextLabel = dd < parts.length - 1 ? parts[dd] : null;
              if (
                nextLabel !== label ||
                ids[d]  !== bcdui.core.magicChar.dimTotal ||
                ids[dd] !== bcdui.core.magicChar.dimTotal
              ) break;
              rowspan++;
              covered[dd][i] = true;
              dd++;
            }
          }
          
          // colspan: merge consecutive cols with same label at this level and same parent labels
          let colspan = 1;
          if (rowspan <= 1 || parts.length === 1) {
            while (
              i + colspan < colDefs.length &&
              !covered[d][i + colspan] &&
              (() => {
                const p2 = colDefs[i + colspan].caption.split('|');
                const pi2 = parts.length === 1 ? 0
                          : d === numLevels - 1 ? p2.length - 1
                          : d;
                return (p2[pi2] ?? '') === label &&
                  Array.from({ length: d }, (_, p) =>
                    (p2[p] ?? '') === (parts[p] ?? '')
                  ).every(Boolean);
              })()
            ) {
              colspan++;
            }
          }
    
          const th = document.createElement('th');
          th.setAttribute('bcdcolident', col.id);
          th.setAttribute('jdbccolumntypename', col.typeName);
          th.className = col.isDim ? 'bcdDimension' : 'bcdMeasure';
          if (col.isDimTotal) {
            th.className += ' bcdTotal';
            th.setAttribute('bcdTranslate', 'bcd_Total');
          }
          th.textContent = label;
          if (rowspan > 1) th.rowSpan = rowspan;
          if (colspan > 1) th.colSpan = colspan;
    
          headerRows[d].appendChild(th);
          i += colspan;
        }
      }
    
      htr.replaceWith(headerRows[0]);
      for (let d = 1; d < numLevels; d++) thead.appendChild(headerRows[d]);    
    } 
    
  }
  
  
  transformDomToJs(wrsDom) 
  {
    const NS_WRS = bcdui.core.xmlConstants.namespaces.wrs;
    const evaluate = (xPath) => wrsDom.evaluate(xPath, wrsDom, bcdui.core.browserCompatibility.resolveNamespace, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

    //-------------------------------------
    // Parse header columns
    const colDefs = [];
    colDefs.colDimLevelIds = evaluate("/*/wrs:Header/wrs:Columns/@colDimLevelIds").singleNode?.split("|");
    const headerCols = evaluate("/*/wrs:Header/wrs:Columns/wrs:C");

    for (let headC; (headC = headerCols.iterateNext()) !== null;) {
      colDefs.push({
        pos:       parseInt(headC.getAttribute('pos'), 10),
        id:        headC.getAttribute('id'),
        caption:   headC.getAttribute('caption') || headC.getAttribute('id'),
        typeName:  headC.getAttribute('type-name') || '',
        unit:      headC.getAttribute('unit'),
        isDim:     !!headC.getAttribute('dimId'),
        isDimTotal: headC.getAttribute('id').split("|")[headC.getAttribute('id').split("|").length-2] == bcdui.core.magicChar.dimTotal,
        isMeasure: headC.hasAttribute('valueId') || !!headC.getAttribute('valueId'),
        isNumeric: bcdui.wrs.jsUtil.isNumericTypeName(headC.getAttribute('type-name')),
        scale:     headC.getAttribute('scale') ? parseInt(headC.getAttribute('scale'), 10) : null,
      });
    }

    const dimCols     = colDefs.filter(c => c.isDim);
    let measureCols   = colDefs.filter(c => !c.isDim);
    const numDims     = dimCols.length;

    
    //-------------------------------------
    // Parse data rows
    let rawRows = [];
    const rowNodes = evaluate("/wrs:Wrs/wrs:Data/wrs:*");
    const dataRows = [];
    for (let node; (node = rowNodes.iterateNext()) !== null;) {
      dataRows.push(node);
    }


    //-------------------------------------
    // Parse data cells
    for (const r of dataRows) {
      const row = { id: r.getAttribute('id'), rowType: r.localName, cells: [] };
      const cells = r.getElementsByTagNameNS(NS_WRS, 'C'); // Missing M and D

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const isNull = cell.getElementsByTagNameNS(NS_WRS, 'null').length > 0;
        const caption = cell.getAttribute("caption");
        row.cells.push({
          value:   isNull ? null : cell.textContent,
          caption: cell.getAttribute("caption"),
          unit: cell.getAttribute("unit"),
          isNumeric: bcdui.wrs.jsUtil.isNumericTypeName(cell.getAttribute('type-name')),
          scale: cell.getAttribute("scale"),
          bcdGr:   parseInt(cell.getAttribute('bcdGr') || '0', 10), // TODO no need to parse
          bcdOt:   parseInt(cell.getAttribute('bcdOt') || '0', 10),
          colDef:  colDefs[i],
        });
      }

      // number of grouped (total) dim columns
      row.grpLevel = row.cells
        .filter((c, i) => i < numDims && c.bcdGr === 1)
        .length;

      // grouping key = values of non-total dim cells
      row.groupKey = row.cells
        .filter((c, i) => i < numDims && c.bcdGr === 0)
        .map(c => c.value)
        .join('|');

      rawRows.push(row);
    }

    return {colDefs, rawRows};
  }

  /**
   * Read parameters from JavaScipt object and from DOM given in parameters.paramModel xp:HtmlBuilder[@paramSetId=paramSetId]
   */
  readParameters(parameters) {
    const NS_XP = bcdui.core.xmlConstants.namespaces.xp;

    const paramSets = parameters.paramModel?.getElementsByTagNameNS(NS_XP, 'HtmlBuilder');
    let xmlParams = null;
    if( paramSets ) {
      for (const paramSet of paramSets) {
        if( (!paramSet.hasAttribute("paramSetId") && !parameters.paramSetId) || paramSet.getAttribute("paramSetId") === parameters.paramSetId ) {
          xmlParams = paramSet;
          break;
        }
      }
    }

    if( xmlParams ) {
      const parseBool = s => s === 'true' ? true : s === 'false' ? false : undefined;

      // TDOD line can be removed: parameters.rowSpan = parseBool( xmlParams.getElementsByTagNameNS(NS_XP, 'MakeRowSpan')[0]?.text );
      const getVal = name => xmlParams.getElementsByTagNameNS(NS_XP, name)[0]?.textContent?.trim();
      const ucFirst = s => s[0].toUpperCase() + s.slice(1);
    
      // Backward compatibility
      if(getVal('AdditionalTemplates')) console.error("AdditionalTemplates not implemented for JS HtmlBuilder");
      
      for (const name of this.boolParams)   parameters[name] = parameters[name] ?? parseBool(getVal(ucFirst(name)));
      for (const name of this.intParams)    parameters[name] = parameters[name] ?? (parseInt(getVal(ucFirst(name))) || 0);
      for (const name of this.stringParams) parameters[name] = parameters[name] ?? (getVal(ucFirst(name)) || "");
    }

    // Various defaults
    parameters.emptyMessage = parameters.emptyMessage ?? "bcd_EmptyReport";
    parameters.makeRowSpan = parameters.makeRowSpan ?? parameters.sortRows !== false;
    parameters.makeColSpan = parameters.makeColSpan ?? parameters.sortCols !== false;
    parameters.sortRows = parameters.sortRows ?? true;
    parameters.sortCols = parameters.sortCols ?? true;
    for (const name of this.boolParams)   parameters[name] = parameters[name] ?? false;
    for (const name of this.intParams)    parameters[name] = parameters[name] ??  0;
    for (const name of this.stringParams) parameters[name] = parameters[name] ??  "";

    // Backward compatibility bahaviour
    this.boolParams.push('isCreateHeaderFilters', 'isExpandCollapseCells', 'isCreateFixHeader', 'isJsHtmlbuilder');
    parameters["isCreateFixHeader"] = parameters["createFixHeader"];
    parameters["isCreateHeaderFilters"] = parameters["createHeaderFilters"];
    parameters["isExpandCollapseCells"] = parameters["expandCollapseCells"];
    parameters["isJsHtmlbuilder"] = "true";
  }


}

// We want a class for easier overwrite but need a function reference here for chains
// Use bcdui.wrs.htmlBuilder = bcdui.contextPath + "/bcdui/xslt/renderer/htmlBuilder.xslt"; to bring bach the xslt default
bcdui.wrs.htmlBuilder = (() => { const singleton = new bcdui.wrs.HtmlBuilder(); return singleton.transform.bind(singleton) })();
