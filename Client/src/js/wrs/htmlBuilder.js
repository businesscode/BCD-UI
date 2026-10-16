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
 * Creates an HTML table from a Wrs document, use default it like `chain: bcdui.wrs.htmlBuilder`
 * It can do row- and colspans for documents that have a grouping in the first n columns.
 * It can sort rows and columns by domension values
 * The colspans require that the header columns have pipe-separated captions for each column dimension.
 * Additionally, it formats numeric values by applying scale and unit, especially %.
 * All parameters are defined in xsltParams-1.0.0.xsd and at transform() method and can be provided per XML or JavaScript.
 *
 * Extension point: Rendering of wrs:R/wrs:C can be overwritten by
 * a) deriving class GenericHtmlBuilder and overriding createMeasureCell(), createDimensionCell(), createHeaderCell() and/or createTableHeader()
 * b) then providing the transform() method bound to the instance as a transformer
 * @example
 * // Create your specialized HtmlBuilder by overwriting createMeasureCell()
 * class MyHtmlBuilder extends bcdui.wrs.GenericHtmlBuilder {
 *   createMeasureCell(args) {
 *     // Available are {tr, colId, rowData, wrsJs, parameters}, pass args to super unchanged
 *     const {colId, rowData} = args;
 *     const value = rowData.wrsC[colId];
 *     // A. Overwrite the value here, goes to the underlying WrsJs
 *     rowData.wrsC[colId] = 42;
 *     let td = super.createMeasureCell(args);
 *     // B. ... or, to not touch the underlying WrsJs:
 *     let td = super.createMeasureCell({...args, rowData: {...rowData, wrsC: {...rowData.wrsC, [colId]: 42}}});
 *     // Furher change the created td here ...
 *     if( value < 42 ) td.classList.add( "mySpecialClass" );
 *     return td;
 *   }
 *   // Dimension cells work mainly the same way as measure cells
 *   createDimensionCell(args) {
 *     // Available are {tr, colId, rowData, wrsJs, parameters, rowspan, colspan}
 *     const {colId, rowData} = args;
 *     let th = super.createDimensionCell(args);
 *     const myLink = rowData.wrsA?.[colId]?.myLink;
 *     if( myLink ) th.innerHTML = `<a href='${myLink}'>${th.textContent}</a>`;
 *     return th;
 *   }
 * }
 *
 * // Instantiate and bind your instance like this
 * let myHtmlBuilder = new MyHtmlBuilder();
 * let myTransformer = myHtmlBuilder.transform.bind(myHtmlBuilder);
 *
 * // Provide your transformer to a chain
 * let renderer = new bcdui.core.Renderer({
 *   myTargetHtml, inputModel: myModel,
 *   chain: [myTransformer]
 * });
 */
bcdui.wrs.GenericHtmlBuilder = class {

  /**
   *  Only needed when subclassing.
   *  Simply use global singleton `bcdui.wrs.htmlBuilder` in other cases.
   *  @constructor
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
   * Main entry point for transforming wrs:R/wrs:C to HTML
   * @param {XMLDocument} wrsDom - the wrs:R/wrs:C DOM
   * @param {Object} parameters - the parameters
   * @param {string} parameters.bcdControllerVariableName - the name of the controller variable
   * @param {boolean} [parameters.makeRowSpan=true] - if true, group rows with the same dimension values (defaults to the effective value of sortRows)
   * @param {boolean} [parameters.makeColSpan=true] - if true, group cols with the same dimension values (defaults to the effective value of sortCols)
   * @param {boolean} [parameters.sortRows=true] - if true, sort rows by dimension values
   * @param {boolean} [parameters.sortCols=true] - if true, sort cols by dimension values
   * @param {boolean} [parameters.hideTotals=false] - if true, hide total rows
   * @param {boolean} [parameters.sortTotalsFirst=false] - if true, sort totals first
   * @param {boolean} [parameters.onlyMeasureForTotal=false] - if true, the 'total' cell in the table header above the measure names is replaced by larger cells with the measure names (still styled as total)
   * @param {boolean} [parameters.createHeaderFilters=false] - if true, create header filters (enables column filters)
   * @param {boolean} [parameters.expandCollapseCells=false] - if true, enables the possibility to expand or collapse cells
   * @param {boolean} [parameters.createFixHeader=false] - if true, enables a fixed header (deprecated)
   * @param {boolean} [parameters.headerColsAreUnique=false] - if true, the row dimensions are uniquely identifying a row; if not, an additional column is used to make it unique
   * @param {boolean} [parameters.stickyHeader=false] - if true, enables a sticky header
   * @param {boolean} [parameters.stickyFooter=false] - if true, enables a sticky footer
   * @param {boolean} [parameters.stickyDims=false] - if true, enables sticky dimension cells
   * @param {boolean} [parameters.showDeletedRows=false] - if true, deleted (wrs:D) rows are shown instead of being filtered out
   * @param {number} [parameters.stickyFirstRows=0] - make the first n rows sticky
   * @param {number} [parameters.stickyLastRows=0] - make the last n rows sticky
   * @param {number} [parameters.stickyFirstCols=0] - make the first n columns sticky
   * @param {number} [parameters.stickyLastCols=0] - make the last n columns sticky
   * @param {number} [parameters.stickyWidth=0] - sets the width of the table's parent element
   * @param {number} [parameters.stickyHeight=0] - sets the height of the table's parent element
   * @param {number} [parameters.headerColsCount=0] - number of leading row-dimension columns that make up the sticky/fixed header (the XSLT renderer instead defaults this to the number of dimension columns when unset)
   * @param {number} [parameters.maxCells=0] - limit the output to approximately this number of cells; 0 means unlimited (the XSD documents a default of 25000, which this JS implementation does not currently apply)
   * @param {string} [parameters.stickyWidthEmptyMessage=""] - i18n key for a message shown in place of the content when the sticky width leaves no room to display it
   * @param {string} [parameters.totalColumnText=""] - text used as the caption for the totals column
   * @param {string} [parameters.emptyMessage="bcd_EmptyReport"] - i18n key shown when the report query returns no data
   * @param {XMLDocument} [parameters.paramModel] - optional XML document holding xp:HtmlBuilder parameter set(s), used as a fallback source for any of the parameters above that are not given directly in JavaScript
   * @param {string} [parameters.paramSetId] - optional; by default the parameter set is found in paramModel by element name; use this if paramModel contains multiple xp:HtmlBuilder sets, to match against the paramSetId attribute of the desired set
   */
  transform = (wrsDom, parameters) =>
  {
    this.wrsDom = wrsDom;
    // Wrapper to make it easier to get transform as a function
    return this.transformImpl(wrsDom, parameters);
  }

  /**
   * @private
   * @param wrsDom
   * @param parameters
   * @returns {HTMLElement}
   */
  transformImpl (wrsDom, parameters)
  {
    //-------------------------------------
    // Starting Transformer bcdui.wrs.HtmlBuilder
    // Read parameters, plain js and from XslParams
    this.readParameters(parameters);

    // Turn wrsDom to JavaScript
    // bcdui.wrs.wrs2Js does the main XML parsing, createLayoutData is for internal use
    const wrsJs = bcdui.wrs.wrs2Js(wrsDom);
    let {colDefs, rawRows} = this.createLayoutData(wrsJs);

    //-------------------------------------
    // hideTotals and per default wrs:D rows
    if(parameters.hideTotals) {
      rawRows = rawRows.filter( r => !r.cells.some( c => c.bcdGr===1 ) );
      rawRows.forEach( function(r) {
        r.cells = r.cells.filter( c => !c.colDef.isDimTotal==true);
      });
      colDefs = colDefs.filter( c => !c.isDimTotal==true)
    }
    if(!parameters.showDeletedRows) rawRows = rawRows.filter( r => r.rowType!=="D" );

    const dimCols = colDefs.filter(c => c.isDim);
    const measureCols = colDefs.filter(c => !c.isDim);
    const numDims = dimCols.length;
    // Internal column info for the default create*Cell() implementations
    this._colDefs = colDefs;
    this._colDefsById = new Map(colDefs.map(c => [c.id, c]));
    this._dimColIds = dimCols.map(c => c.id);

    //-------------------------------------
    // No data
    if( rawRows.length === 0 ) {
      const div = document.createElement('div');
      div.className = 'bcdInfoBox';
      div.innerHTML = `<span bcdTranslate="${parameters.emptyMessage}"></span>`;
      return div;
    }

    // If we edit rows, we do not want the defaults for sort and row span
    if(rawRows.some(r=>r.rowType!=="R")) {
      parameters.makeRowSpan = false;
      parameters.sortRows = false;
    }

    //-------------------------------------
    // Sort rows: group details under their subtotals
    // Build a natural key that sorts detail rows before their subtotals
    const totalsSortVal = parameters.sortTotalsFirst ? '' : '\uFFFF';
    function sortKey(row) {
      const parts = [];
      for (let i = 0; i < numDims; i++) { // TODO maybe all columns, at least if there are no dims?
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
    table.setAttribute('data-sticky-enabled',
      parameters.stickyHeader || parameters.stickyFooter || parameters.stickyDims ||
      parameters.stickyWidth || parameters.stickyHeight ||
      parameters.stickyFirstRows || parameters.stickyFirstCols ||
      parameters.stickyLastRows || parameters.stickyLastCols
    );


    //-------------------------
    // thead
    this.createTableHeader({table, wrsJs, parameters});

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
        const levelCss = level >= 4 ? 'bcdTLGe4' : `bcdTL${level}`;
        tr.className = `${levelCss} bcdTotal`;
      }

      //-----------------------------
      // dimension cells, layout (rowspan, colspan of totals) is decided here, rendering in createDimensionCell()
      dimCols.forEach((col, di) =>
      {
        if (skip[ri][di]) return; // covered by rowspan above or colspan to the left

        const cell = row.cells[di];
        const colspan = cell.bcdGr === 1 ? Math.max(1, numDims - di) : 1;
        // mark the dim columns covered by a total's colspan
        for (let s = di + 1; s < di + colspan; s++) {
          skip[ri][s] = true;
        }
		// Possible extension point
        this.createDimensionCell({tr, colId: cell.colDef.id, rowData: row.rowData, wrsJs, parameters, rowspan: rowspans[ri][di], colspan});
      });

      // measure cells — skip if a total cell already spanned dims
      const alreadyTotaled = row.cells.slice(0, numDims).some(c => c.bcdGr === 1);

      //-----------------------------
      // Measures, i.e. all non-dims
      measureCols.forEach((colHead, idx) => {
        const cell = row.cells[numDims + idx];
		// Possible extension point
        this.createMeasureCell({tr, colId: cell.colDef.id, rowData: row.rowData, wrsJs, parameters});
      });
    });

    // Display a warning when the server truncated the result set via maxRows
    if (wrsJs.footer?.maxRowsExceeded && table.tHead) {
      const warnTr = table.tHead.insertRow(0);
      const warnTd = document.createElement('td');
      warnTd.setAttribute('colspan', colDefs.length);
      warnTd.style.textAlign = 'left';
      const div = document.createElement('div');
      div.className = 'bcdInfoBox';
      const span = document.createElement('span');
      span.setAttribute('bcdTranslate', 'bcd_MaxRowsExceeded');
      span.textContent = 'Please note, not all values are displayed as the report exceeds the maximum size.';
      div.appendChild(span);
      warnTd.appendChild(div);
      warnTr.appendChild(warnTd);
    }

    return table;
  }

  /**
   * An extension point for overwriting.
   * Creates a dimension cell. Its layout, i.e. rowspan and colspan, is decided by the caller and only applied here.
   * @param {Object} args
   * @param {HTMLTableRowElement} args.tr - the row to append the cell to
   * @param {string} args.colId - id of the cell's column, the value is `rowData.wrsC[colId]`, its attributes like caption or bcdGr are `rowData.wrsA?.[colId]`
   * @param {WrsJsRow} args.rowData - the row. Before calling super, you can simply change the underlying WrsJs with `rowData.wrsC[colId] = 'new value'`,
   *   or overwrite the value for rendering only with `super.createDimensionCell({...args, rowData: {...rowData, wrsC: {...rowData.wrsC, [colId]: 'new value'}}});`
   * @param {WrsJs} args.wrsJs - the whole Wrs, for example the column definitions are `wrsJs.header.columns.wrsC`
   * @param {Object} args.parameters - the parameters of transform()
   * @param {number} args.rowspan - number of rows this cell spans, applies to non-total cells
   * @param {number} args.colspan - number of dimension columns this cell spans, applies to total cells
   * @returns {HTMLTableCellElement} th - created th
   */
  createDimensionCell({tr, colId, rowData, wrsJs, parameters, rowspan, colspan})
  {
    const colDef = this._colDefsById.get(colId);
    const value = rowData.wrsC[colId];
    const wrsA = rowData.wrsA?.[colId] || {};
    const numDims = this._dimColIds.length;
    const th = document.createElement('th');

    // total cell
    if (wrsA.bcdGr === "1") {
      const grpLevel = this._dimColIds.filter(id => rowData.wrsA?.[id]?.bcdGr === "1").length;
      const level = numDims - grpLevel + 1;
      th.className = level >= 4 ? 'bcdTLGe4' : `bcdTL${level}`;
      th.setAttribute('bcdgr', '1');
      th.setAttribute('colspan', colspan);
      th.setAttribute("bcdTranslate", "bcd_Total");
      if (colDef.isDimTotal) th.className += " bcdTotal";
    }
    // non-total cell
    else {
      if (wrsA.caption) th.setAttribute('caption', wrsA.caption);
      if (rowspan > 1) th.setAttribute('rowspan', rowspan);
      if (!wrsA.caption && !value) th.setAttribute("bcdTranslate", "bcd_EmptyDimmember");
      else th.textContent = wrsA.caption || value || '';
      if (wrsA.bcdOt === "1") th.setAttribute("bcdTranslate", "bcd_OtherDimmember");
      if (colDef.isDimTotal) th.className += " bcdTotal";
      if (rowData.row.bcdVdm && colDef.pos == numDims) th.className += " bcdVdm";
    }

    tr.appendChild(th);
    return th;
  }

  /**
   * An extension point for overwriting.
   * Creates a measure cell
   * @param {Object} args
   * @param {HTMLTableRowElement} args.tr - the row to append the cell to
   * @param {string} args.colId - id of the cell's column, the value is `rowData.wrsC[colId]`, its attributes like type-name, scale or unit are `rowData.wrsA?.[colId]`
   * @param {WrsJsRow} args.rowData - the row. Before calling super, you can simply change the underlying WrsJs with `rowData.wrsC[colId] = 'new value'`,
   *   or overwrite the value for rendering only with `super.createMeasureCell({...args, rowData: {...rowData, wrsC: {...rowData.wrsC, [colId]: 'new value'}}});`
   * @param {WrsJs} args.wrsJs - the whole Wrs, for example the column definitions are `wrsJs.header.columns.wrsC`
   * @param {Object} args.parameters - the parameters of transform()
   * @returns {HTMLTableCellElement} td - created td
   */
  createMeasureCell({tr, colId, rowData, wrsJs, parameters})
  {
    const colDef = this._colDefsById.get(colId);
    const value = rowData.wrsC[colId];
    const wrsA = rowData.wrsA?.[colId] || {};
	// Some header values can be overwritten per cell, so each row can have a different value for the same column
    const isNumeric = bcdui.wrs.jsUtil.isNumericTypeName(wrsA['type-name']) || colDef.isNumeric;
    const scale = wrsA.scale || colDef.scale;
    const unit = wrsA.unit || colDef.unit;
    const td   = document.createElement('td');
    // Browsers are making sure that <script> tags are not executed but its content is displayed, so no injection issue here
    td.innerHTML = isNumeric ? bcdui.wrs.jsUtil.format(value, scale, 'en', unit) : value; // TODO not always en
    if(value === null || value === '') td.className += " bcdNoNumber";
    if(colDef.isDimTotal) td.className += " bcdTotal";
    tr.appendChild(td);
    return td;
  }


  /**
   * Possible extension point for overwriting.
   * Creates the thead, decides the header layout (levels, rowspan, colspan) and calls createHeaderCell() for each cell.
   * Overwrite to post-process the whole thead, for example to add rows, or overwrite createHeaderCell() for single cells.
   * @param {Object} args
   * @param {HTMLTableElement} args.table - the table to append the thead to
   * @param {WrsJs} args.wrsJs - the whole Wrs, for example the column definitions are `wrsJs.header.columns.wrsC`
   * @param {Object} args.parameters - the parameters of transform()
   * @returns {HTMLTableSectionElement} thead - created thead
   */
  createTableHeader({table, wrsJs, parameters})
  {
    // The layout works on the internal column info, which for example already respects hideTotals
    const colDefs = this._colDefs;
    const thead = table.createTHead();
    const htr   = thead.insertRow();
    htr.setAttribute('bcdrowident', 'bcdMeasureHeader');

    const numLevels = Math.max(...colDefs.map(col => col.caption.split('|').length));

    // Plain header as one row
    if (numLevels === 1) {
      for (const col of colDefs) {
		// Possible extension point
        this.createHeaderCell({tr: htr, colId: col.id, label: col.caption, level: 0, numLevels: 1, rowspan: 1, colspan: 1, wrsJs, parameters});
      }
    }

    // Handle column dimensions  , i.e. multiple header rows
    else {
      const headerRows = Array.from({ length: numLevels }, (_, d) => {
        const tr = document.createElement('tr');
        if (colDefs.colDimLevelIds?.[d]) tr.setAttribute("levelId", colDefs.colDimLevelIds[d]);
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
            partIndex = parts.length - 1; // bottom row always shows last part
          } else if (d < parts.length) {
            partIndex = d; // intermediate part, or last part (will span down to bottom row)
          } else {
            i++; continue; // d >= parts.length, covered by rowspan above
          }

          const label = parts[partIndex] ?? '';

          // rowspan:
          // - single part → spans all rows
          // - last part but not yet at the bottom row → spans from here to the bottom row,
          //   so that intermediate-level labels (e.g. "My Target" in "2010|My Target" when
          //   numLevels=3) sit at their natural row and span down, instead of having "2010"
          //   rowspan over the intermediate row and force "My Target" to the bottom.
          // - others → 1
          let rowspan = 1;
          if (parts.length === 1) {
            rowspan = numLevels;
            for (let dd = 1; dd < numLevels; dd++) covered[dd][i] = true;
          } else if (d === parts.length - 1 && d < numLevels - 1) {
            // last part of this caption, but not yet at the bottom header row → span to bottom
            rowspan = numLevels - d;
            for (let dd = d + 1; dd < numLevels; dd++) covered[dd][i] = true;
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
          // never merge total with empty
          let colspan = 1;
          const colIdSegs = col.id.split('|');
          const colIdSeg = colIdSegs[d] || '';
          const colIdHasMagic = colIdSeg.includes(bcdui.core.magicChar.dimEmpty);
          if (rowspan <= 1 || parts.length === 1) {
            while (
              i + colspan < colDefs.length &&
              !covered[d][i + colspan] &&
              (() => {
                const p2 = colDefs[i + colspan].caption.split('|');
                const nextIdSegs = colDefs[i + colspan].id.split('|');
                const pi2 = parts.length === 1 ? 0
                          : d === numLevels - 1 ? p2.length - 1
                          : d;
                const nextIdSeg = nextIdSegs[d] || '';
                return (p2[pi2] ?? '') === label &&
                  (!colIdHasMagic || nextIdSeg === colIdSeg) &&
                  Array.from({ length: d }, (_, p) => {
                    if ((p2[p] ?? '') !== (parts[p] ?? '')) return false;
                    const pSeg = colIdSegs[p] || '';
                    return !pSeg.includes(bcdui.core.magicChar.dimEmpty) || (nextIdSegs[p] || '') === pSeg;
                  }).every(Boolean);
              })()
            ) {
              colspan++;
            }
          }

		  // Possible extension point
          this.createHeaderCell({tr: headerRows[d], colId: col.id, label, level: d, numLevels, rowspan, colspan, wrsJs, parameters});
          i += colspan;
        }
      }

      htr.replaceWith(headerRows[0]);
      for (let d = 1; d < numLevels; d++) thead.appendChild(headerRows[d]);
    }

    return thead;
  }

  /**
   * Possible extension point for overwriting.
   * Creates a header cell. Its layout, i.e. rowspan and colspan, is decided by the caller and only applied here.
   * @param {Object} args
   * @param {HTMLTableRowElement} args.tr - the header row to append the cell to
   * @param {string} args.colId - id of the (first) column this cell belongs to, its definition is in wrsJs.header.columns.wrsC
   * @param {string} args.label - the caption part shown at this header level
   * @param {number} args.level - header row index, 0 is the top row
   * @param {number} args.numLevels - number of header rows, 1 for a plain header without column dimensions
   * @param {number} args.rowspan - number of header rows this cell spans
   * @param {number} args.colspan - number of columns this cell spans
   * @param {WrsJs} args.wrsJs - the whole Wrs
   * @param {Object} args.parameters - the parameters of transform()
   * @returns {HTMLTableCellElement} th - created th
   */
  createHeaderCell({tr, colId, label, level, numLevels, rowspan, colspan, wrsJs, parameters})
  {
    const col = this._colDefsById.get(colId);
    const isSinglePart = col.caption.split('|').length === 1;
    const th = document.createElement('th');
    th.setAttribute('bcdcolident', col.id);
    th.setAttribute('jdbccolumntypename', col.typeName);
    th.className = col.isDim ? 'bcdDimension' : 'bcdMeasure';
    if (numLevels > 1 && col.isDimTotal) th.className += ' bcdTotal';
    if (col.isVMeas) th.className += ' bcdVmeas';
    // Cumulation markers only at the lowest level
    if (isSinglePart || level === numLevels - 1) {
      if (col.isColCum) {
        if (col.isRowCum)  {
          th.className += " bcdRowColCumulate"
        } else {
          th.className += " bcdColCumulate"
        }
      } else if (col.isRowCum)  {
        th.className += " bcdRowCumulate"
      }
    }
    if (col.isVdm && (isSinglePart || level === numLevels - 2)) th.className += " bcdVdm";
    // In multi-level headers an empty label is a total id segment → bcd_Total, otherwise a genuine empty dim → bcd_EmptyDimmember.
    if (label !== '' && bcdui.i18n.isI18nKey(label)) {
      th.setAttribute('bcdTranslate', label.substring(1));
    } else if (label !== '' || numLevels === 1) {
      th.textContent = label;
    } else if (col.id.split('|')[level] === bcdui.core.magicChar.dimTotal) {
      th.setAttribute('bcdTranslate', 'bcd_Total');
    } else {
      th.setAttribute('bcdTranslate', 'bcd_EmptyDimmember');
    }
    if (rowspan > 1) th.rowSpan = rowspan;
    if (colspan > 1) th.colSpan = colspan;

    tr.appendChild(th);
    return th;
  }

  /**
   * Derives the internal column info and cells from wrsJs, used for sorting, row- and colspans and totals
   * @private
   */
  createLayoutData(wrsJs)
  {
    //-------------------------------------
    // Column info
    const colDefs = [];
    colDefs.colDimLevelIds = wrsJs.header.columns.colDimLevelIds?.split("|");

    for (const headC of wrsJs.header.columns.wrsC) {
      const idParts = headC.id.split("|");
      colDefs.push({
        pos:       parseInt(headC.pos, 10),
        id:        headC.id,
        caption:   headC.caption || headC.id,
        typeName:  headC['type-name'] || '',
        unit:      headC.unit ?? null,
        isDim:     !!headC.dimId,
        isDimTotal: idParts[idParts.length-2] == bcdui.core.magicChar.dimTotal,
        isMeasure: headC.valueId != null,
        isNumeric: bcdui.wrs.jsUtil.isNumericTypeName(headC['type-name']),
        scale:     headC.scale ? parseInt(headC.scale, 10) : null,
        isVMeas:   !!headC.bcdVmeas,
        isVdm:     !!headC.bcdVdm,
        isColCum:  !!headC.bcdColCumulate,
        isRowCum:  !!headC.bcdRowCumulate
      });
    }

    const numDims = colDefs.filter(c => c.isDim).length;

    //-------------------------------------
    // Rows and cells
    // Layout (sorting, spans, totals) works on cells by position, rowData is the WrsJsRow handed to create*Cell()
    const rawRows = [];
    for (const rowData of wrsJs.data) {
      const row = { id: rowData.row.id, rowType: rowData.row.bcdType ?? 'R', cells: [], rowData };
      for (const colDef of colDefs) {
        row.cells.push({
          value:   rowData.wrsC[colDef.id],
          bcdGr:   rowData.wrsA?.[colDef.id]?.bcdGr === "1" ? 1 : 0,
          colDef
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
   * @private
   */
  readParameters(parameters) {
    const NS_XP = bcdui.core.xmlConstants.namespaces.xp;

    // First, let's check if there are any parameters giben in XML
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
      const getVal = name => xmlParams.getElementsByTagNameNS(NS_XP, name)[0]?.textContent?.trim();
      const ucFirst = s => s[0].toUpperCase() + s.slice(1);

      // Backward compatibility
      if(getVal('AdditionalTemplates')) console.error("AdditionalTemplates not implemented for JS HtmlBuilder");

      for (const name of this.boolParams)   parameters[name] = parseBool(getVal(ucFirst(name))) ?? parameters[name];
      for (const name of this.intParams)    parameters[name] = (parseInt(getVal(ucFirst(name))) || 0) ?? parameters[name];
      for (const name of this.stringParams) parameters[name] = (getVal(ucFirst(name)) || "") ?? parameters[name];
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

/**
 * Singleton for GenericHtmlBuilder for generating HTML from WRS data.
 * Default for Renderer but can be used in non-default chains
 * @example
 * let renderer = new bcdui.core.Renderer({
 *   myTargetHtml, inputModel: myModel, chain: [myTransformer, bcdui.wrs.htmlBuilder]
 * });
 */
bcdui.wrs.htmlBuilder = new bcdui.wrs.GenericHtmlBuilder().transform;
bcdui.wrs.htmlBuilder.bcdName = 'bcdui.wrs.htmlBuilder';

// Possible XSLT fallback: bcdui.wrs.htmlBuilder = bcdui.contextPath+"/bcdui/xslt/renderer/htmlBuilder.xslt";