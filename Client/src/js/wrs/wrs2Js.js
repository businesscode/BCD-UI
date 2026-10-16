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
 * JavaScript representation of a wrs:Wrs document, see wrs-1.0.0.xsd.
 * It is a detached snapshot: it can be read, passed on and changed locally, but changes are not written back to the Wrs DOM it was created from.
 * To change a DataProvider use its tbl* methods and create a new snapshot.
 * It is lossless, i.e. it holds all information of the Wrs, so it could later also serve as the master of a JS-based model.
 * Only exception: attributes of wrs:O are not kept, see {@link WrsJsRow}.
 * It is JSON-safe, i.e. it holds no DOM nodes or functions.
 * Conventions:
 *  - Elements become properties with their local name in lowerCamelCase, like wrs:Header -> header.
 *  - Attributes keep their name 1:1, like 'type-name', and their value as string.
 *  - wrs:C elements become wrsC and wrs:A elements become wrsA, in the header as well as in the data.
 *  - The type of each element is fixed by the schema, never by the data. A text-only element becomes a string,
 *    the text of an element that also has attributes becomes bcdText. Optional elements and attributes are left out if not present,
 *    for rows this also applies to wrsA and wrsO, see {@link WrsJsRow}.
 *  - Only bcdType and bcdText are not found in the XML, both are reserved names.
 * @example
 * { wrs: { ts: '1760000000000' },
 *   requestDocument: '<wrq:WrsRequest xmlns:wrq="...">...</wrq:WrsRequest>',
 *   header: { bindingSet: [{ bcdText: 'cube', alias: 't1' }], keySet: [{ bRef: 'ctr_code' }],
 *             columns: { wrsC: [{ id: 'ctr_code', pos: '1', 'type-name': 'VARCHAR', wrsA: [{ name: 'caption' }] },
 *                               { id: 'high', pos: '2', 'type-name': 'NUMERIC' }] } },
 *   data:   [ { row: { id: 'R1' }, wrsC: { ctr_code: 'DE', high: '1434' }, wrsA: { ctr_code: { caption: 'Germany' } } } ],
 *   footer: { maxRowsExceeded: { bcdText: 'true', maxRows: '1000' } } }
 * @typedef {Object} WrsJs
 * @property {Object<string, string>} wrs          - Attributes of wrs:Wrs, like ts or bcdValidationId
 * @property {string}       [requestDocument]      - wrs:RequestDocument/wrq:WrsRequest serialized as an XML string
 * @property {WrsJsHeader}  header                 - wrs:Header
 * @property {WrsJsRow[]}   data                   - wrs:Data, rows in document order. Contains all row types, wrs:D included
 * @property {WrsJsFooter}  [footer]               - wrs:Footer
 */

/**
 * JavaScript representation of wrs:Wrs/wrs:Header, see {@link WrsJs}
 * @typedef {Object} WrsJsHeader
 * @property {Array<Object<string, string>>} [bindingSet] - wrs:BindingSet elements, bcdText is the BindingSet id, alias is 1:1
 * @property {Array<Object<string, string>>} [keySet]     - wrs:KeySet/wrs:Key elements with their attributes, i.e. bRef
 * @property {Object}          columns                    - wrs:Columns, its attributes 1:1 like colDimLevelIds, plus wrsC
 * @property {WrsJsColumn[]}   columns.wrsC               - wrs:Columns/wrs:C in document order
 * @property {WrsJs[]}         [validationResult]         - wrs:ValidationResult/wrs:Wrs, each is a full WrsJs
 * @property {string}          [transactionsNumber]       - wrs:TransactionsNumber
 */

/**
 * JavaScript representation of a column definition wrs:Header/wrs:Columns/wrs:C, see {@link WrsJs}.
 * All attributes are taken 1:1, like id, pos, caption, 'type-name', scale, dimId, valueId, bcdVdm.
 * Therefore wrsA and references are reserved and may not be used as attribute names.
 * @typedef {Object} WrsJsColumn
 * @property {string} id                                 - Column id, used as property name in WrsJsRow.wrsC and WrsJsRow.wrsA
 * @property {string} pos                                - Position starting with 1
 * @property {Array<Object<string, string>>} [wrsA]      - wrs:A child elements with their attributes, declaring the attributes found at the data's wrs:C
 * @property {WrsJs} [references]                        - wrs:References/wrs:Wrs, the allowed values as a full WrsJs
 */

/**
 * JavaScript representation of a data row wrs:Wrs/wrs:Data/wrs:R|I|M|D, see {@link WrsJs}.
 * row and wrsC are always present, wrsA and wrsO are left out if they have no content. Large data usually only has row and wrsC,
 * wrsA comes with cell attributes and wrsO from editing, so the most common case stays small.
 * Hidden classes, i.e. how JavaScript engines optimize objects with the same properties in the same order:
 *  - All objects in wrsC and wrsO of a WrsJs share one hidden class, the hot path wrsC[colId] stays monomorphic.
 *  - The row objects themselves have at most 4 hidden classes (with/without wrsA, with/without wrsO), which engines still handle as polymorphic.
 * Therefore, when creating rows:
 *  - Set the wrsC (and wrsO) properties for all columns in header order, a missing cell becomes null.
 *  - Set row.id first and row.bcdType, if not R, second.
 *  - Create each variant with its own object literal, in the order row, wrsC, wrsA, wrsO, instead of adding wrsA or wrsO later.
 * When changing rows, only assign to existing properties of wrsC and wrsO, do not add or delete properties.
 * @example
 * { row: { id: 'R1' }, wrsC: { ctr_code: 'DE', high: '1434' } }
 * { row: { id: 'R2' }, wrsC: { ctr_code: 'CZ', high: '1434' }, wrsA: { high: { target: '1010' } } }
 * { row: { id: 'R3', bcdType: 'M' }, wrsC: { ctr_code: 'AT', high: '99' },   wrsO: { ctr_code: 'AT', high: '17' } }
 * @typedef {Object} WrsJsRow
 * @property {Object<string, string>} row        - Attributes of the row element 1:1, like id, plus bcdType
 * @property {?string} row.id                    - wrs:R/@id, null if the row has no id, which is allowed for example in wrs:References
 * @property {string} [row.bcdType='R']          - Local name of the row element: I, M or D. Left out for R, which is by far the most common one,
 *    so check row types like `(r.row.bcdType ?? 'R') === 'R'` or `r.row.bcdType === 'M'`
 * @property {Object<string, ?string>} wrsC     - Cell values by column id, wrs:null becomes null. For wrs:M the new value
 * @property {Object<string, Object<string, string>>} [wrsA] - Attributes of the cells by column id. Only cells having attributes are present, left out if there are none
 * @property {Object<string, ?string>} [wrsO]   - Only for wrs:M, the original values (wrs:O) by column id, wrs:M holds them for all columns.
 *    Attributes of wrs:O, i.e. the cell attributes before the change, are not kept
 */

/**
 * JavaScript representation of wrs:Wrs/wrs:Footer, see {@link WrsJs}
 * @typedef {Object} WrsJsFooter
 * @property {string} [errorDuringQuery]                         - wrs:ErrorDuringQuery
 * @property {Object<string, string>} [maxRowsExceeded]          - wrs:MaxRowsExceeded with bcdText and maxRows
 */

{ // Block scope keeps the helpers private

/**
 * DOM helpers for converting Wrs elements, the Wrs namespace is read once per call
 * @private
 */
const createHelpers = () => {
  const NS_WRS = bcdui.core.xmlConstants.namespaces.wrs;
  const NS_XMLNS = "http://www.w3.org/2000/xmlns/";

  // Attributes 1:1, namespace declarations are skipped. Values are assigned to target to control the property order
  const attrsTo = (target, elem) => {
    for (const a of elem.attributes)
      if (a.namespaceURI !== NS_XMLNS) target[a.name] = a.value;
    return target;
  };
  const attrs = elem => attrsTo({}, elem);
  const hasAttrs = elem => Array.prototype.some.call(elem.attributes, a => a.namespaceURI !== NS_XMLNS);

  // Child elements in the Wrs namespace, optionally only those with the given local name
  const wrsChildren = (elem, localName) => {
    const result = [];
    for (let c = elem?.firstElementChild; c; c = c.nextElementSibling)
      if (c.namespaceURI === NS_WRS && (!localName || c.localName === localName)) result.push(c);
    return result;
  };
  const wrsChild = (elem, localName) => wrsChildren(elem, localName)[0] || null;

  // Text of an element that also has attributes becomes bcdText
  const textAndAttrs = elem => attrsTo({ bcdText: elem.textContent }, elem);

  // wrs:C value, wrs:null becomes null
  const cellValue = cell => wrsChild(cell, "null") ? null : cell.textContent;

  return { NS_WRS, attrsTo, attrs, hasAttrs, wrsChildren, wrsChild, textAndAttrs, cellValue };
};

/**
 * Creates a function converting a data row element wrs:R|I|M|D into a {@link WrsJsRow}.
 * Shared by {@link bcdui.wrs.wrs2Js} and the tbl* methods of {@link bcdui.core.DataProvider}.
 * @param {Array<?string>} colIdsByPos - Column id for each wrs:C position, index 0 is pos 1. Positions without a column id are skipped
 * @param {string[]} [colIds]          - Column ids in the order of the properties of wrsC and wrsO, defaults to the ones of colIdsByPos
 * @return {function(Element): WrsJsRow}
 * @private
 */
bcdui.wrs._createRow2Js = function(colIdsByPos, colIds)
{
  const { NS_WRS, attrsTo, attrs, hasAttrs, cellValue } = createHelpers();
  colIds = colIds || colIdsByPos.filter(colId => colId != null);

  // All wrsC and wrsO get all columns in the same order, so they share one hidden class
  const newCells = () => {
    const cells = {};
    for (const colId of colIds) cells[colId] = null;
    return cells;
  };

  return rowElem => {
    // id first and bcdType second, so that the row objects share one hidden class as far as possible. bcdType defaults to R
    const row = attrsTo(rowElem.localName === "R" ? { id: rowElem.getAttribute("id") } : { id: rowElem.getAttribute("id"), bcdType: rowElem.localName }, rowElem);
    const wrsC = newCells();
    let wrsA = null;
    const wrsO = rowElem.localName === "M" ? newCells() : null;

    // wrs:M holds wrs:C and wrs:O pairs, the n-th of each belongs to the n-th column
    let cPos = 0, oPos = 0;
    for (let cell = rowElem.firstElementChild; cell; cell = cell.nextElementSibling) {
      if (cell.namespaceURI !== NS_WRS) continue;
      if (cell.localName === "C") {
        const colId = colIdsByPos[cPos++];
        if (colId == null) continue;
        wrsC[colId] = cellValue(cell);
        if (hasAttrs(cell))
          (wrsA ??= {})[colId] = attrs(cell);
      }
      else if (cell.localName === "O" && wrsO) {
        const colId = colIdsByPos[oPos++];
        if (colId != null)
          wrsO[colId] = cellValue(cell);
      }
    }

    // wrsA and wrsO are left out if empty. One literal per variant, adding a property later would need an extra property store
    if (wrsO)
      return wrsA ? { row, wrsC, wrsA, wrsO } : { row, wrsC, wrsO };
    return wrsA ? { row, wrsC, wrsA } : { row, wrsC };
  };
};

/**
 * Converts a wrs:Wrs document into its JavaScript representation {@link WrsJs}.
 * Can also be used as a step in a chain, a non-DOM input is returned as is.
 * @param {(XMLDocument|Element|Object)} wrsDoc - wrs:Wrs document or element
 * @return {WrsJs}
 * @example
 * const wrsJs = bcdui.wrs.wrs2Js(myModel.getData());
 * const renderer = new bcdui.core.Renderer({ targetHtml, inputModel: myModel, chain: [bcdui.wrs.wrs2Js, (wrsJs, params) => `...`] });
 */
bcdui.wrs.wrs2Js = function(wrsDoc)
{
  if (!wrsDoc?.nodeType)
    return wrsDoc;

  const { NS_WRS, attrs, wrsChildren, wrsChild, textAndAttrs } = createHelpers();

  const convertWrs = wrsElem =>
  {
    if (wrsElem.namespaceURI !== NS_WRS || wrsElem.localName !== "Wrs")
      throw Error("bcdui.wrs.wrs2Js: input is not a wrs:Wrs document but " + wrsElem.nodeName);

    const result = { wrs: attrs(wrsElem) };

    //-------------------------------------
    // wrs:RequestDocument, kept as XML string
    const wrq = wrsChild(wrsElem, "RequestDocument")?.firstElementChild;
    if (wrq)
      result.requestDocument = new XMLSerializer().serializeToString(wrq);

    //-------------------------------------
    // wrs:Header
    const headerElem = wrsChild(wrsElem, "Header");
    const header = {};
    const bindingSets = wrsChildren(headerElem, "BindingSet");
    if (bindingSets.length)
      header.bindingSet = bindingSets.map(textAndAttrs);
    const keySet = wrsChild(headerElem, "KeySet");
    if (keySet)
      header.keySet = wrsChildren(keySet, "Key").map(attrs);

    const columnsElem = wrsChild(headerElem, "Columns");
    header.columns = columnsElem ? attrs(columnsElem) : {};
    header.columns.wrsC = wrsChildren(columnsElem, "C").map(headC => {
      const col = attrs(headC);
      const wrsA = wrsChildren(headC, "A").map(attrs);
      if (wrsA.length)
        col.wrsA = wrsA;
      const refWrs = wrsChild(wrsChild(headC, "References"), "Wrs");
      if (refWrs)
        col.references = convertWrs(refWrs);
      return col;
    });

    const validationResult = wrsChild(headerElem, "ValidationResult");
    if (validationResult)
      header.validationResult = wrsChildren(validationResult, "Wrs").map(convertWrs);
    const transactionsNumber = wrsChild(headerElem, "TransactionsNumber");
    if (transactionsNumber)
      header.transactionsNumber = transactionsNumber.textContent;
    result.header = header;

    //-------------------------------------
    // wrs:Data
    // Column id defaults to bRef, see wrs-1.0.0.xsd
    const colIds = header.columns.wrsC.map(col => col.id ?? col.bRef);
    // Cells are addressed by column id, a column with a duplicate id would overwrite the values of the first one
    if (new Set(colIds).size !== colIds.length)
      bcdui.log.warn("bcdui.wrs.wrs2Js: duplicate column ids, only the last one of each is kept in wrsC: " + colIds.filter((id, i) => colIds.indexOf(id) !== i).join(", "));

    // wrsC and wrsO get all columns in header order, a duplicate id is only kept once
    result.data = wrsChildren(wrsChild(wrsElem, "Data")).map(bcdui.wrs._createRow2Js(colIds, [...new Set(colIds)]));

    //-------------------------------------
    // wrs:Footer
    const footerElem = wrsChild(wrsElem, "Footer");
    if (footerElem) {
      const footer = {};
      const errorDuringQuery = wrsChild(footerElem, "ErrorDuringQuery");
      if (errorDuringQuery)
        footer.errorDuringQuery = errorDuringQuery.textContent;
      const maxRowsExceeded = wrsChild(footerElem, "MaxRowsExceeded");
      if (maxRowsExceeded)
        footer.maxRowsExceeded = textAndAttrs(maxRowsExceeded);
      result.footer = footer;
    }

    return result;
  };

  return convertWrs(wrsDoc.documentElement || wrsDoc);
};

bcdui.wrs.wrs2Js.bcdName = "bcdui.wrs.wrs2Js";

} // End of block scope
