/*
  Copyright 2026-2026 BusinessCode GmbH, Germany

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
 * @file debugPanel.js
 */

/**
 * WeakRefs of all AbstractExecutables, used for debugging purposes
 * to be reachable by id even if not officially registered in the registry.
 * @private
 */
bcdui.debug._debugObjectRegistry = new class {
  cleanup = new FinalizationRegistry(id => bcdui.debug._debugObjectRegistryInternalStore.delete(id))

  registerObject(obj) {
    bcdui.debug._debugObjectRegistryInternalStore.set(obj.id, new WeakRef(obj))
    this.cleanup.register(obj, obj.id)  // auto-removes entry when GC'd
  }

  getObject(id) {
    return bcdui.debug._debugObjectRegistryInternalStore.get(id)?.deref()
  }
}

bcdui.factory = bcdui.factory || new Object();
/**
 * DebuggerPanel
 *
 * Allows hovering over Renderer or Widgets and inspecting properties with ctrl/cmd click
 * Loaded and started with ?debug=true
 * Manually start with DebugPanel.init();
 */
bcdui.factory.DebugPanel = (() => {

  const docuLink = "https://businesscode.github.io/BCD-UI-Docu/jsdoc/index.html#/generated/elements/";

  let registry = bcdui.debug._debugObjectRegistry;
  let activeEl = null;
  const LS_LOGLEVEL_KEY = 'bcd-dbg-loglevel';

  let overlay, tooltip, panel, panelTitle, panelBody, closeBtn, modal, modalTitle, modalBody;

  /**
   * Our css styles
   */
  const CSS = `
    #bcd-dbg-overlay {
    position: fixed;
      pointer-events: none;
      border: 2px solid #378ADD;
      background: rgba(56,138,221,0.08);
      border-radius: 4px;
      z-index: 2147483640;
      transition: top 0.07s, left 0.07s, width 0.07s, height 0.07s;
      display: none;
    }
    #bcd-dbg-overlay-inner {
      position: fixed;
      pointer-events: none;
      border: 2px solid #E8920A;
      background: rgba(232,146,10,0.10);
      border-radius: 3px;
      z-index: 2147483641;
      display: none;
    }
    #bcd-dbg-tooltip {
    position: fixed;
      pointer-events: none;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 3px 10px;
      font: 12px/1.5 monospace;
      z-index: 2147483641;
      white-space: nowrap;
      display: none;
      color: #222;
    }
    @media (prefers-color-scheme: dark) {
      #bcd-dbg-tooltip { background: #2a2a2a; border-color: #555; color: #f0f0f0; }
    }
    #bcd-dbg-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      width: clamp(400px, 800px, 1200px);
      max-height: 90vh;
      overflow-y: auto;
      z-index: 2147483642;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      display: none;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    }
    @media (prefers-color-scheme: dark) {
      #bcd-dbg-panel { background: #242424; border-color: #4a4a4a; color: #f0f0f0; }
    }
    #bcd-dbg-panel.bcd-visible { display: block; }
    .bcd-ph {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid #eee;
      position: sticky; top: 0;
      background: inherit;
      z-index: 1;
    }
    @media (prefers-color-scheme: dark) { .bcd-ph { border-color: #3a3a3a; } }
    .bcd-ph-title { font-size: 14px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bcd-ph-close {
      cursor: pointer; background: none; border: none;
      font-size: 20px; line-height: 1; padding: 0;
      color: #888;
    }
    .bcd-ph-close:hover { color: #333; }
    @media (prefers-color-scheme: dark) { .bcd-ph-close:hover { color: #f0f0f0; } }
    .bcd-node { border: 1px solid #eee; border-radius: 8px; margin: 10px 14px; padding: 10px 12px; }
    @media (prefers-color-scheme: dark) { .bcd-node { border-color: #3a3a3a; } }
    .bcd-row { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; margin-bottom: 4px; }
    .bcd-lbl { color: #888; min-width: 70px; }
    @media (prefers-color-scheme: dark) { .bcd-lbl { color: #aaa; } }
    .bcd-val { font-family: monospace; word-break: break-all; }
    .bcd-exec-time { color: #185FA5; }
    @media (prefers-color-scheme: dark) { .bcd-exec-time { color: #85B7EB; } }
    .bcd-badge {
      font-size: 11px; padding: 1px 8px; border-radius: 99px;
      display: inline-block;
    }
    .bcd-badge.ready    { background: #EAF3DE; color: #27500A; }
    .bcd-badge.notready { background: #FCEBEB; color: #791F1F; }
    @media (prefers-color-scheme: dark) {
      .bcd-badge.ready    { background: #1a3a10; color: #97C459; }
      .bcd-badge.notready { background: #3a1010; color: #F09595; }
    }
    .bcd-sec { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin: 10px 0 4px; }
    @media (prefers-color-scheme: dark) { .bcd-sec { color: #aaa; } }
    .bcd-dep-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
    .bcd-expand-btn, .bcd-data-btn {
      font-size: 11px; border: 1px solid #ccc; border-radius: 4px;
      padding: 1px 7px; cursor: pointer; background: transparent;
      color: inherit; white-space: nowrap;
    }
    .bcd-expand-btn:hover, .bcd-data-btn:hover { background: #f5f5f5; }
    @media (prefers-color-scheme: dark) {
      .bcd-expand-btn:hover, .bcd-data-btn:hover { background: #333; }
      .bcd-expand-btn, .bcd-data-btn { border-color: #555; color: #e0e0e0; }
    }
    .bcd-dep-name { font-size: 12px; font-family: monospace; }
    .bcd-nested { margin: 6px 0 0 12px; border-left: 2px solid #ddd; padding-left: 10px; }
    @media (prefers-color-scheme: dark) { .bcd-nested { border-color: #4a4a4a; } }
    .bcd-tree-row { display: flex; gap: 10px; align-items: flex-start; }
    .bcd-tree-main { flex: 0 0 auto; }
    .bcd-params-col { display: flex; flex-direction: column; gap: 4px; padding-top: 2px; min-width: 140px; }
    .bcd-param-item { display: flex; align-items: center; gap: 5px; font-size: 11px; border: 1px solid #eee; border-radius: 5px; padding: 3px 7px; }
    @media (prefers-color-scheme: dark) { .bcd-param-item { border-color: #3a3a3a; } }
    .bcd-param-name { font-family: monospace; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
    .bcd-input-chain { margin-top: 2px; padding-left: 14px; border-left: 2px solid #378ADD; }
    .bcd-chain-label { font-size: 120%; color: #378ADD; margin: 3px 0; }  
    .bcd-xslt-chain { margin-top: 6px; }
    .bcd-xslt-steps { border-spacing: 4px 4px; border-collapse: separate; }
    .bcd-xslt-steps td:nth-child(n+3) {
      text-align: right;
    }
    @media (prefers-color-scheme: dark) { .bcd-xslt-step { border-color: #4a4a4a; } }
    .bcd-xslt-header { display: flex; align-items: center; gap: 5px; font-size: 11px; }
    .bcd-xslt-idx { background: #E6F1FB; color: #185FA5; border-radius: 99px; padding: 0 6px; font-size: 10px; flex-shrink: 0; }
    @media (prefers-color-scheme: dark) { .bcd-xslt-idx { background: #0C447C; color: #B5D4F4; } }
    .bcd-xslt-out { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #555; }
    @media (prefers-color-scheme: dark) { .bcd-xslt-out { color: #ccc; } }
    #bcd-dbg-modal-backdrop {
      display: none;
      position: fixed; inset: 0;
      background: transparent;
      z-index: 2147483643;
      align-items: center; justify-content: center;
      pointer-events: none;
    }
    #bcd-dbg-modal-backdrop.bcd-visible { display: flex; }
    #bcd-dbg-modal {
      pointer-events: all;
    }
    #bcd-dbg-modal {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      width: 80vw;
      max-height: 80vh;
      display: flex; flex-direction: column;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    position: relative;
    }
    @media (prefers-color-scheme: dark) {
      #bcd-dbg-modal { background: #242424; border-color: #4a4a4a; color: #f0f0f0; }
    }
    .bcd-modal-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    }
    @media (prefers-color-scheme: dark) { .bcd-modal-header { border-color: #3a3a3a; } }
    .bcd-modal-title { font-size: 13px; font-weight: 600; flex: 1; font-family: monospace; }
    .bcd-modal-body {
      flex: 1; overflow-y: auto; padding: 14px 16px;
    }
    .bcd-modal-body pre {
      margin: 0; font-size: 12px; font-family: monospace;
      white-space: pre-wrap; word-break: break-all;
      line-height: 1.6;
      color: inherit;
    }
    .bcd-modal-body .bcd-xml-el   { color: #185FA5; }
    .bcd-modal-body .bcd-xml-attr { color: #3B6D11; }
    .bcd-modal-body .bcd-xml-val  { color: #A32D2D; }
    .bcd-modal-body .bcd-xml-text { color: #333; }
    @media (prefers-color-scheme: dark) {
      .bcd-modal-body .bcd-xml-el   { color: #85B7EB; }
      .bcd-modal-body .bcd-xml-attr { color: #97C459; }
      .bcd-modal-body .bcd-xml-val  { color: #F09595; }
      .bcd-modal-body .bcd-xml-text { color: #d0d0d0; }
    }
    .bcd-modal-type-badge {
      font-size: 10px; padding: 1px 8px; border-radius: 99px;
      background: #E6F1FB; color: #185FA5;
    }
    @media (prefers-color-scheme: dark) {
      .bcd-modal-type-badge { background: #0C447C; color: #B5D4F4; }
    }
  
    /* TODO lign with general visXml styles */
    @media (prefers-color-scheme: dark) {
      #bcd-dbg-modal span.visXml_telem { color: #9292ff; }
      #bcd-dbg-modal span.visXml_tattr { color: #ed4343 !important; }
      #bcd-dbg-modal span.visXml_m { color: #ffffff !important; }
  }
  `;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function uid() {
    return 'bcd-' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Indicates whether a DataProvider is ready
   * @param isReady
   * @returns {string}
   */
  function badgeHtml(isReady) {
    return isReady
      ? '<span class="bcd-badge ready">ready</span>'
      : '<span class="bcd-badge notready">not ready</span>';
  }

  // Check if we need to use XmlVisualizer for displaying the data
  function isXmlDocument(val) {
    return val instanceof Document || val instanceof DocumentFragment || (val && typeof val === 'object' && val.nodeType === 9);
  }

  /**
   * Show a popup with data of a DataProvider
   * @param dp
   */
  function openDataModal(dp) {
    let data = dp.getData();
    let name = dp.getName();
    
    // If we have sef, we treat it as it's original XSLT
    if( typeof data === "string" && data.startsWith("http") && data.includes(".sef.json") ) {
      let xsltLink = data.substring(data.indexOf(".sef.json")+10);
      jQuery.ajax({
        url: xsltLink,
        async: false,
        dataType: 'xml',
        success: function(xsltData, status, xhr) {
          name = name + "  " + xsltLink + "  [executed as .sef.json]"
          dp = new bcdui.core.StaticModel({data: xsltData, name});
          dp.execute();
          data = dp.getData();
        }
      });
    };
    
    const isXml   = isXmlDocument(data);
    const targetId = 'bcd-modal-content-' + uid();

    modalTitle.innerHTML = `
      <span>${escapeHtml(name)}</span>
      <span class="bcd-modal-type-badge">${isXml ? 'XMLDocument' : typeof data}</span>
    `;

    if (isXml) {
      // Use bcdui.widget.visualizeXml if available, else fall back to pretty-print
      modalBody.innerHTML = `<div id="${targetId}" style="min-height:200px;"></div>`;
      let visModel = new bcdui.core.StaticModel(dp.getData());
      visModel.execute();
      bcdui.widget.visualizeXml.visualizeModel({
        targetHtml: '#' + targetId,
        inputModel: visModel
      });
    } else if( typeof data === "function" ) {
      modalBody.innerHTML = `See function header in console`;
      console.log(data);
    } else {
      modalBody.innerHTML = `<pre>${escapeHtml(data)}</pre>`;
    }

    modal.classList.add('bcd-visible');
  }

  /**
   * We skip DataProviderHolders transparently, we are interested in the real thing
   * @param dp
   * @returns {*}
   */
  function resolveDataProviderHolder(dp) {
    if (!dp) return dp;
    try {
      // DataProviderHolder — delegate to its source
      if (dp.source && typeof dp.source === 'object' && dp.source.getName) {
        return resolveDataProviderHolder(dp.source);
      }
    } catch(e) { /* bcdui not available, ignore */ }
    return dp;
  }

  /**
   * dp reference map — keyed by uid, so we can retrieve the live dp on button click,
   * For example, the xslt steps are going here   * @type {{}}
   */
  const dpMap = {};

  /**
   * Show information about a DataProvider in a modal dialog
   * @param dp
   * @param inputModelDepth we must show inputModels of inputModels ... up to depth of 8
   * @returns {string}
   */
  function buildNode(dp, inputModelDepth) {
    dp = resolveDataProviderHolder(dp);
    if (inputModelDepth > 8) {
      return '<span style="font-size:11px;color:#aaa;">max depth reached</span>';
    }

    const deps = (dp.dataProviders || []);
    const inputModel = deps[0] || null;
    const params = deps.slice(1);
    const dpId   = uid();
    dpMap[dpId]  = dp;

    // Get exec time of TransformationChains
    const processorExecTime = (() => {
      try {
        const map = bcdui && bcdui.debug && bcdui.debug._totalProcessorExecutionTime;
        if (!map) return null;
        const id  = dp.id || null;
        if (!id || !(id in map)) return null;
        return map[id];
      } catch(e) { return null; }
    })();

    const execHtml = processorExecTime !== null
      ? `<div class="bcd-row"><span class="bcd-lbl">exec time</span><span class="bcd-val bcd-exec-time">${processorExecTime} ms</span></div>`
      : '';

    // TransformationChains have parameters, which we show here
    // Parameters — collapsed behind [+], preview first 4 names
    const paramsSub     = uid();
    const previewNames  = params.slice(0, 4).map(p => escapeHtml(p.getName())).join(', ');
    const previewSuffix = params.length > 4 ? ` +${params.length - 4}` : '';
    const paramsDetail  = params.map(p => {
      const pId   = uid();
      const subId = uid();
      dpMap[pId]  = p;
      return `
        <div>
          <div class="bcd-param-item">
            <span class="bcd-param-name" title="${escapeHtml(p.getName())}">${escapeHtml(p.getName())}</span>
            ${badgeHtml(p.isReady())}
            <button class="bcd-expand-btn" data-sub="${subId}">[+]</button>
            <button class="bcd-data-btn" data-dp="${pId}">getData()</button>
          </div>
          <div id="${subId}" class="bcd-nested" style="display:none;">
            ${buildNode(p, inputModelDepth + 1)}
          </div>
        </div>`;
    }).join('');

    const paramsHtml = params.length ? `
      <div class="bcd-params-col">
        <button class="bcd-expand-btn" data-sub="${paramsSub}">[+] Parameters: ${previewNames}${previewSuffix}</button>
        <div id="${paramsSub}" style="display:none;">${paramsDetail}</div>
      </div>` : '';

    // TransformationChain — dp.chain?.phases?.[0]?.xslts
    const xslts = (() => {
      try { return dp.chain?.phases?.[0]?.xslts || []; }
      catch(e) { return []; }
    })();

    const xsltHtml = xslts.length ? (() => {
      const chainId = uid();
      const steps = xslts.map((xslt, i) => {
        // output
        const outObj = xslt.output;
        const outIsXml = isXmlDocument(outObj);
        const outLabel = outObj == null ? 'output [empty]' : (outIsXml ? 'output [xml]' : 'output');

        let outLink = `<span class="bcd-xslt-out" style="color:#aaa;">${outLabel}</span>`;
        if (outObj != null) {
          const fakeId = uid();
          dpMap[fakeId] = {
            getName: () => `xslt[${i}].output`,
            isReady: () => true,
            getData: () => outIsXml ? outObj : String(outObj),
            dataProviders: []
          };
          outLink = `<button class="bcd-data-btn" style="font-size:11px;" data-dp="${fakeId}">${outLabel}</button>`;
        }

        // transformer (model)
        const modelObj   = xslt.model;
        const modelData  = typeof modelObj?.getData === 'function' ? modelObj.getData() : modelObj;
        const modelIsXml = isXmlDocument(modelData);
        let transformerType = "";
        if( typeof modelData === "function" ) transformerType += " [function]";
        else if( xslt.processor?.sefJson ) transformerType += " xslt.processor?.sefJson";
        else if( xslt.model?.urlProvider?.getData() ) transformerType += ` ${xslt.model.urlProvider.getData().split('/').pop()}`;
        else if( modelIsXml ) transformerType += " [xslt]";

        let modelLink = '';
        if (modelObj != null) {
          const modelId = uid();
          dpMap[modelId] = {
            getName: () => `xslt[${i}].model ${xslt.model?.urlProvider?.getData() ? xslt.model?.urlProvider?.getData() : transformerType}`,
            isReady: () => typeof modelObj.isReady === 'function' ? modelObj.isReady() : true,
            getData: () => modelData,
            dataProviders: []
          };
          modelLink = `<button class="bcd-data-btn" style="font-size:11px;" data-dp="${modelId}">${transformerType}</button>`;
        }
        let execTime = xslt.traceXsltProcTimeMs ? ` (${xslt.traceXsltProcTimeMs}ms)` : "";

        // processor.params — collapsed behind [+]
        const procParams  = xslt.processor?.params || xslt.processor?.parameters || {};
        const procEntries   = Object.entries(procParams);
        const paramsSub     = uid();
        const procParamsHtml = procEntries.map(([pname, pval]) => {
          const pIsXml = isXmlDocument(pval);
          const pStr   = pIsXml ? '[XMLDocument]' : String(pval ?? '—').slice(0, 60);
          let pBtn = '';
          if (pval != null) {
            const fakeId = uid();
            dpMap[fakeId] = {
              getName: () => `param: ${pname}`,
              isReady: () => true,
              getData: () => pIsXml ? pval : String(pval),
              dataProviders: []
            };
            pBtn = `<button class="bcd-data-btn" data-dp="${fakeId}"></button>`;
          }
          return `
              <div class="bcd-param-item">
                <span class="bcd-param-name" title="${escapeHtml(pname)}">${escapeHtml(pname)}</span>
              <span class="bcd-xslt-out" title="${escapeHtml(pStr)}">${escapeHtml(pStr)}</span>
              ${pBtn}
            </div>`;
        }).join('');

        const paramsToggle = procEntries.length ? `
          <button class="bcd-expand-btn" data-sub="${paramsSub}">[+] params (${procEntries.length})</button>
          <div id="${paramsSub}" class="bcd-nested" style="display:none;">${procParamsHtml}</div>` : '';

        return `
          <tr>
            <td><span class="bcd-xslt-idx">${i + 1}</span></td>
            <td>${modelLink}</td>
            <td style="text-align: right">${execTime}</td>
            <td>${outLink}</td>
            <td>${paramsToggle}</td>
          </tr>`;
      }).join('');

      return `
        <div class="bcd-xslt-chain">
          <div class="bcd-sec" style="cursor:pointer;" data-sub="${chainId}">
            &rsaquo; transformation chain (${xslts.length})
          </div>
          <table class="bcd-xslt-steps" id="${chainId}" style="display:none;">${steps}</table>
        </div>`;
    })() : '';

    /**
     * We do show default properies for all DataProvoder sub-classes
     * But here we have specific properties we want to show for a specific DataProvider sub-class
     * Each entry: { test(dp) => bool, collect(dp) => Array<{label, value, isXml}> }
     * value can be a string, XMLDocument, or a DataProvider-like object with getData()   * @type {[{test: function(*): (*|boolean|undefined), collect: function(*): ([]|[{label: string, value: *, isXml: *}]|undefined)},{test: function(*): (*|boolean|undefined), collect: function(*): ({label: *, value: *, isXml: *, dp: *}[]|[]|undefined)},{test: function(*): (*|boolean|undefined), collect: function(*): [{label: string, value: *, isXml: boolean}]}]}
     */
    const dataProviderSpecificsMap = [
      {
        // SimpleModel — has a urlProvider
        test: dp => {
          try { return bcdui.core?.SimpleModel && dp instanceof bcdui.core.SimpleModel; }
          catch(e) { return false; }
        },
        collect: dp => {
          try {
            const rm = dp.urlProvider?.requestModel;
            if (!rm) return [];
            const val   = typeof rm.getData === 'function' ? rm.getData() : rm;
            const isXml = isXmlDocument(val);
            return [{ label: 'urlProvider.requestModel', value: val, isXml }];
          } catch(e) { return []; }
        }
      },
      {
        // ScorecardModel — show all _bcdImpl_ sub-objects
        test: dp => {
          try { return bcdui.component?.scorecard?.ScorecardModel && dp instanceof bcdui.component.scorecard.ScorecardModel; }
          catch(e) { return false; }
        },
        collect: dp => {
          try {
            const prefix  = dp.id + '_bcdImpl_';
            const objMap  = bcdui.debug._debugObjectRegistryInternalStore || {};
            return objMap.keys()
              .filter(k => k.startsWith(prefix))
              .map(k => {
                const impl = bcdui.debug._debugObjectRegistry.getObject(k);
                const val  = typeof impl.getData === 'function' ? impl.getData() : impl;
                return { label: k.slice(dp.id.length + 1), value: val, isXml: isXmlDocument(val), dp: impl };
              });
          } catch(e) { return []; }
        }
      },
      {
        // Chart — show chart's config
        test: dp => {
          try { return typeof bcdui.component?.chart?.ChartEchart && dp instanceof bcdui.component.chart.ChartEchart; }
          catch(e) { return false; }
        },
        collect: dp => {
          return [{ label: 'chartConfig', value: dp.config.getData(), isXml: true}];
        }
      }
    ];

    /**
     * Check if a data provider has specific extras that can be collected
     * @param dp
     * @returns {*[]}
     */
    function collectExtras(dp) {
      const results = [];
      for (const entry of dataProviderSpecificsMap) {
        try {
          if (entry.test(dp)) results.push(...entry.collect(dp));
        } catch(e) { /* skip failing extras silently */ }
      }
      return results;
    }

    // Show the extras of dataProviderSpecificsMap — class-specific additional fields
    const extras     = collectExtras(dp);
    const extrasHtml = extras.map(ex => {
      const fakeId = uid();
      dpMap[fakeId] = {
        getName: () => ex.label,
        isReady: () => true,
        getData: () => ex.value,
        dataProviders: []
      };
      let expandHtml = '';
      if (ex.dp) {
        const subId = uid();
        expandHtml = `
          <button class="bcd-expand-btn" data-sub="${subId}">[+]</button>
          <div id="${subId}" style="display:none;margin-top:4px;">${buildNode(ex.dp, inputModelDepth + 1)}</div>`;
      }
      return `<div style="margin-top:3px;display:flex;flex-direction:column;gap:2px;">
        <div style="display:flex;align-items:center;gap:4px;">
          <button class="bcd-data-btn" data-dp="${fakeId}">${escapeHtml(ex.label)}</button>
          ${ex.dp ? `<button class="bcd-expand-btn" data-sub="${fakeId}-sub">[+]</button>` : ''}
        </div>
        ${ex.dp ? `<div id="${fakeId}-sub" style="display:none;margin-top:4px;">${buildNode(ex.dp, inputModelDepth + 1)}</div>` : ''}
      </div>`;
    }).join('');

    // Node card
    const nodeCard = `
      <div class="bcd-node">
        <div class="bcd-row"><span class="bcd-lbl">name</span><span class="bcd-val">${escapeHtml(dp.getName())}</span></div>
        <div class="bcd-row">
          <span class="bcd-lbl">class</span>
            <span class="bcd-val" style="color:#888;font-size:11px;">${escapeHtml(dp.getClassName ? dp.getClassName() : '?')}</span>
            <button class="bcd-data-btn" data-dp-docu="${dpId}">docu</button>
        </div>
        <div class="bcd-row"><span class="bcd-lbl">status</span>${badgeHtml(dp.isReady())}</div>
        ${execHtml}
        <button class="bcd-data-btn" style="margin-top:4px;" data-dp="${dpId}">getData()</button>
        <button class="bcd-data-btn" data-dp-data-console="${dpId}">data >_</button>
        <button class="bcd-data-btn" data-dp-console="${dpId}">object >_</button>
        ${extrasHtml}
        ${xsltHtml}
      </div>`;

    // Input model
    const inputHtml = inputModel
      ? `<div style="margin-top:4px;">
           <div class="bcd-chain-label">input model</div>
           ${buildNode(inputModel, inputModelDepth + 1)}
         </div>`
      : '';

    return `
      <div>
      <div class="bcd-tree-row">
        <div class="bcd-tree-main">${nodeCard}</div>
          ${paramsHtml}
      </div>
        ${inputHtml}
      </div>`;
  }


  /**
   * Making the DebugPanel draggable.
   * @param el
   * @param handle
   */
  function makeDraggable(el, handle) {
    let startX, startY, startLeft, startTop;
    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button, select')) return; // don't drag when clicking buttons
      startX    = e.clientX;
      startY    = e.clientY;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left;
      startTop  = rect.top;
      el.style.right  = 'auto';
      el.style.left   = startLeft + 'px';
      el.style.top    = startTop  + 'px';
      el.style.margin = '0';

      function onMove(e) {
        el.style.left = Math.max(0, startLeft + e.clientX - startX) + 'px';
        el.style.top  = Math.max(0, startTop  + e.clientY - startY) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
      e.preventDefault();
    });
  }

  /**
   * Making the DebugPanel resizable.
   * @param el
   */
  function makeResizable(el) {
    const handle = document.createElement('div');
    handle.style.cssText = `
      position:absolute; bottom:0; right:0;
      width:14px; height:14px; cursor:se-resize;
      background: linear-gradient(135deg, transparent 50%, #aaa 50%);
      border-radius: 0 0 10px 0;
    `;
    el.style.position = 'fixed';
    el.appendChild(handle);

    handle.addEventListener('mousedown', e => {
      const startX = e.clientX, startY = e.clientY;
      const startW = el.offsetWidth, startH = el.offsetHeight;

      function onMove(e) {
        el.style.width    = Math.max(280, startW + e.clientX - startX) + 'px';
        el.style.maxWidth  = 'none';
        el.style.maxHeight = 'none';
        el.style.height   = Math.max(120, startH + e.clientY - startY) + 'px';
        el.style.overflow = 'auto';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
      e.stopPropagation();
      e.preventDefault();
    });
  }

  function showPanel(rid) {
    const dp = registry.getObject(rid);
    panelTitle.textContent = `'${rid}' - [${dp.getClassName()}]`;

    if (!dp) {
      panelBody.innerHTML = `<div style="padding:12px 14px;color:#888;">No object registered for id <code>${escapeHtml(rid)}</code></div>`;
    } else {
      panelBody.innerHTML = `<div style="padding:0 14px 12px;">${buildNode(dp, 0)}</div>`;
    }

    panel.classList.add('bcd-visible');

    // Expand/collapse buttons
    panelBody.querySelectorAll('[data-sub]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = document.getElementById(btn.dataset.sub);
        if (!sub) return;
        const open = sub.style.display !== 'none';
        sub.style.display = open ? 'none' : 'block';
        btn.textContent = open ? '[+]' : '[−]';
      });
    });
    // Open documentation, a popup for data or visualize on console
    panelBody.querySelectorAll('[data-dp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dp];
        if(dp) openDataModal(dp);
      });
    });
    panelBody.querySelectorAll('[data-dp-data-console]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dpDataConsole];
        if(dp) console.log(dp.id, dp.getData());
      });
    });
    panelBody.querySelectorAll('[data-dp-console]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dpConsole];
        if(dp) console.log(dp.id, dp);
      });
    });
    panelBody.querySelectorAll('[data-dp-docu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dpDocu];
        if(dp) window.open(docuLink+dp.getClassName(), "_blank");
      });
    });
  }

  /**
   * Custom tags starting with bcd- that are widgets (others are excluded)
   * @type {Set<string>}
   */
  const WIDGET_CLASSES = new Set([
    'bcdBlindUpDown', 'bcdDimensionChooser', 'bcdFormulaEditor', 'bcdInputField', 'bcdCredentialsMenu', 'bcdMenu',
    'bcdMultiSelect', 'bcdPeriodChooser', 'bcdSingleSelect', 'bcdTab', 'bcdWidget', 'bcdButton', 'bcdBaseInput',
    'bcdChipsChooser', 'bcdMultiCheck', 'bcdSideBySideChooser', 'bcdConnectable', 'bcdScorecardConfigurator',
    'bcdFarConfigurator', 'bcdUniversalFilter', 'bcdComment', 'bcdLabel', 'bcdLogin', 'bcdRankingChooser'
  ]);
  /**
   * CSS classes that identify bcdXXX widgets
   * @type {Set<string>}
   */
  const WIDGET_TAGS = new Set([
    'bcd-chart',              'bcd-cube',                'bcd-far',                'bcd-scorecard',          'bcd-renderer',
    'bcd-checkboxng',         'bcd-buttonng',            'bcd-inputng',            'bcd-dateinputng',        'bcd-singleselectng',
    'bcd-suggestinputng',     'bcd-textareang',          'bcd-pastelistng',        'bcd-sidebysidechooserng','bcd-chipschooserng',
    'bcd-connectableng',      'bcd-universalfilterng',   'bcd-sliderng',           'bcd-commentng',          'bcd-labelng',
    'bcd-inputlookupng',      'bcd-multicheckng',        'bcd-rankingchooserng',   'bcd-loginng',            'bcd-inputfield',
    'bcd-dimensionchooser',   'bcd-singleselect',        'bcd-multiselect',        'bcd-periodchooser',      'bcd-formulaeditor',
    'bcd-menu',               'bcd-credentialsmenu',     'bcd-tabmenu',            'bcd-blindupdownarea',    'bcd-contextmenu',
    'bcd-tooltip',            'bcd-navpath',
  ]);

  /**
   * The current widget may have been created by a parent Widget, like an InputField from a DimensionChooser.
   * We also want to show the parent then along with the Widget
   * @param target
   * @returns {*|null}
   */
  function findWidgetEl(target) {
    // Walk up from target — find closest widget element
    let el = target;
    let classMatch = null;
    while (el && el !== document.body) {
      const tag = el.tagName?.toLowerCase();
      // bcd-* tag always wins — return immediately
      if (tag && WIDGET_TAGS.has(tag)) return el;
      // remember first class match but keep walking up
      if (!classMatch && [...el.classList].some(c => WIDGET_CLASSES.has(c))) classMatch = el;
      el = el.parentElement;
    }
    // only use class match if no bcd-* ancestor was found above it
    return classMatch || null;
  }

  /**
   * List all attributes of the Widget, also resolve DataProviders referenced
   * @param el
   * @param label
   * @returns {string}
   */
  function renderWidgetAttributes(el, label) {
    if (!el) return '';
    const attrs = [...el.attributes].sort((a, b) => a.name.localeCompare(b.name));
    if (!attrs.length) return '';

    const rows = attrs.map(a => {
      const val = a.value;
      // Find all $identifier references in the value (DataProvider ids)
      const dpRefs = [];
      const refRegex = /\$([A-Za-z_][\w]*)/g;
      let match;
      while ((match = refRegex.exec(val)) !== null) {
        const refId = match[1];
        const refDp = (() => { try { return registry.getObject(refId); } catch(e) { return null; } })();
        if (refDp) dpRefs.push({ refId, refDp });
      }

      const dp  = val ? (() => { try { return registry.getObject(val); } catch(e) { return null; } })() : null;
      let dpInline = '';
      if (dp) {
        const dpId  = uid();
        const subId = uid();
        dpMap[dpId] = dp;
        dpInline = `
          <button class="bcd-data-btn" data-dp="${dpId}">getData()</button>
          <button class="bcd-expand-btn" data-sub="${subId}">[+]</button>
          <div id="${subId}" style="display:none;margin-top:4px;">${buildNode(dp, 0)}</div>`;
      }

      // $ref links in xPaths shown below the value
      const refHtml = dpRefs.map(({ refId, refDp }) => {
        const refFakeId = uid();
        const refSubId  = uid();
        dpMap[refFakeId] = refDp;
        return `
          <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
            <span class="bcd-val" style="color:#888;font-size:11px;">$${escapeHtml(refId)}</span>
            <button class="bcd-data-btn" data-dp="${refFakeId}">getData()</button>
            <button class="bcd-expand-btn" data-sub="${refSubId}">[+]</button>
            <div id="${refSubId}" style="display:none;margin-top:4px;">${buildNode(refDp, 0)}</div>
          </div>`;
      }).join('');
      return `
        <div class="bcd-row" style="flex-wrap:wrap;">
          <span class="bcd-lbl" style="min-width:90px;">${escapeHtml(a.name)}</span>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
              <span class="bcd-val">${escapeHtml(val)}</span>
              ${dpInline}
            </div>
            ${refHtml}
          </div>
        </div>`;
    }).join('');

    return `<div style="margin-top:8px;">
      <div class="bcd-sec">${escapeHtml(label)}</div>
      ${rows}
    </div>`;
  }

  /**
   * Show attributes for a widget
   * @param el
   * @returns {string}
   */
  function renderWidgetEl(el) {
    const wc = [...el.classList].find(c => WIDGET_CLASSES.has(c)) || '';
    const tag = el.tagName.toLowerCase();
    const label = wc ? `.${wc}` : `<${tag}>`;
    const isBcdTag = tag.startsWith('bcd-');
    const attrsHtml = renderWidgetAttributes(el, label);
    const firstChildHtml = !isBcdTag && el.firstElementChild
      ? renderWidgetAttributes(el.firstElementChild, 'first child attributes')
      : '';
    return attrsHtml + firstChildHtml;
  }

  /**
   * Main Widget rendering function
   * @param el
   * @param ownerEl
   */
  function inspectWidget(el, ownerEl) {
    const tag        = el.tagName.toLowerCase();
    const widgetClass = [...el.classList].find(c => WIDGET_CLASSES.has(c)) || '';
    const label      = widgetClass ? `.${widgetClass}` : `<${tag}>`;

    panelTitle.textContent = label;

    // Header badge
    const headerHtml = `
      <div class="bcd-node">
        ${ tag && WIDGET_TAGS.has(tag) ? `
        <div class="bcd-row">
          <span class="bcd-lbl">tag</span>
          <span class="bcd-val">${escapeHtml(tag)}</span>
          <button class="bcd-data-btn" data-widget-docu="${tag}">docu</button>
        </div>` : '' }
        ${widgetClass ? `<div class="bcd-row">
          <span class="bcd-lbl">class</span>
          <span class="bcd-val">${escapeHtml(widgetClass)}</span>
            <button class="bcd-data-btn" 
                    ${ownerEl.dataset.bcduiWidgetName?(`data-widget-name="${ownerEl.dataset.bcduiWidgetName}"`):''} 
                    data-widget-owner="${ownerEl.tagName}" data-widget-docu="${widgetClass}"
                    >docu</button>
        </div>` : ''}
        <div class="bcd-row">
          <span class="bcd-lbl">type</span>
          <span class="bcd-val" style="color:#888;font-size:11px;">widget</span>
        </div>
      </div>`;

    const isBcdTag= tag.startsWith('bcd-');
    const attrsHtml = renderWidgetEl(el);

    // For bcd-* tags: also show any inner bcdXXX class elements
    let innerWidgetsHtml = '';
    if (isBcdTag) {
      const innerEls = [...el.querySelectorAll('*')]
        .filter(child => [...child.classList].some(c => WIDGET_CLASSES.has(c)));
      if (innerEls.length) {
        const subId = uid();
        const innerHtml = innerEls.map(child => renderWidgetEl(child)).join('');
        innerWidgetsHtml = `
          <div style="margin-top:6px;">
            <button class="bcd-expand-btn" data-sub="${subId}">[+] inner widgets (${innerEls.length})</button>
            <div id="${subId}" style="display:none;">${innerHtml}</div>
          </div>`;
      }
    }

    // For class-based widgets: first child shown inside renderWidgetEl already
    const ownerHtml = ownerEl
      ? renderWidgetAttributes(ownerEl, `owner <${escapeHtml(ownerEl.tagName.toLowerCase())}>`)
      : '';

    panelBody.innerHTML = `<div style="padding:0 14px 12px;">${headerHtml}${ownerHtml}${attrsHtml}${innerWidgetsHtml}</div>`;
    panel.classList.add('bcd-visible');

    // Wire expand/data/documentation buttons for Widgets
    panelBody.querySelectorAll('[data-sub]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = document.getElementById(btn.dataset.sub);
        if (!sub) return;
        const open = sub.style.display !== 'none';
        sub.style.display = open ? 'none' : 'block';
        btn.textContent = open ? '[+]' : '[−]';
      });
    });
    panelBody.querySelectorAll('[data-dp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dp];
        if(dp) openDataModal(dp);
      });
    });
    panelBody.querySelectorAll('[data-dp-data-console]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dpDataConsole];
        if(dp) console.log(dp.id ?? btn.dataset.dpDataConsole, dp.getData());
      });
    });
    panelBody.querySelectorAll('[data-dp-console]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dpConsole];
        if(dp) console.log(dp.id ?? btn.dataset.dpConsole, dp);
      });
    });
    panelBody.querySelectorAll('[data-widget-docu]').forEach(btn => {
      btn.addEventListener('click', () => {
        let woBcd = btn.dataset.widgetDocu.replace(/^bcd-?/, '');
        let widgetName = woBcd.charAt(0).toUpperCase() + woBcd.slice(1)
        let elemLink = "bcdui.widget.create" + widgetName;
        // widgetNG tag or create
        if( WIDGET_TAGS.has(btn.dataset.widgetDocu) ) elemLink = "bcdui.widgetNg.create" + widgetName.substring(0, widgetName.length-2);
        else if( btn.dataset.widgetName ) elemLink = "bcdui.widgetNg.create" + btn.dataset.widgetName.substring("bcdui-bcdui".length, btn.dataset.widgetName.length-2);
        window.open( docuLink + elemLink, '_blank' );
      });
    });
    panelBody.querySelectorAll('[data-dp-docu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dp = dpMap[btn.dataset.dpDocu];
        if(dp) window.open(docuLink+dp.getClassName(), "_blank");
      });
    });
  }

  let overlayInner; // second overlay for inner class widget

  function findActiveEl(target) {
    const renderer = target.closest('[bcdrendererid]');
    if (renderer) return { el: renderer, mode: 'renderer' };

    // Check if target is directly inside a class-based widget within a bcd- tag
    let el = target;
    while (el && el !== document.body) {
      const tag = el.tagName?.toLowerCase();
      if (tag?.startsWith('bcd-')) break; // hit the bcd- owner — stop
      if ([...el.classList].some(c => WIDGET_CLASSES.has(c))) {
        // found inner class widget — find its bcd- owner above
        const owner    = (() => {
          let p = el.parentElement;
          while (p && p !== document.body) {
            if (p.tagName?.toLowerCase().startsWith('bcd-') || p.dataset.bcduiWidgetName) return p;
            p = p.parentElement;
          }
          return null;
        })();
        return { el: owner || el, mode: 'widget', innerEl: el, owner };
      }
      el = el.parentElement;
    }

    const widget = findWidgetEl(target);
    if (widget) return { el: widget, mode: 'widget', innerEl: null, owner: null };
    return null;
  }

  /**
   * Show a clickable overlay over the area being produced by the Render or Widget
   * @param el
   * @param mode
   * @param innerEl
   */
  function highlightEl(el, mode, innerEl) {
    const rect   = el.getBoundingClientRect();
    const color   = mode === 'widget' ? '#E8920A' : '#378ADD';

    overlay.style.borderColor = color;
    overlay.style.background  = mode === 'widget' ? 'rgba(232,146,10,0.08)' : 'rgba(56,138,221,0.08)';
    overlay.style.display = 'block';
    overlay.style.top     = (rect.top  - 2) + 'px';
    overlay.style.left    = (rect.left - 2) + 'px';
    overlay.style.width   = (rect.width  + 4) + 'px';
    overlay.style.height  = (rect.height + 4) + 'px';

    // Inner widget — dashed border on owner (outer) + solid on inner itself
    if (innerEl) {
      const ir = innerEl.getBoundingClientRect();
      overlayInner.style.display     = 'block';
      overlayInner.style.top         = (ir.top  - 2) + 'px';
      overlayInner.style.left        = (ir.left - 2) + 'px';
      overlayInner.style.width       = (ir.width  + 4) + 'px';
      overlayInner.style.height      = (ir.height + 4) + 'px';
      // outer (owner bcd- tag) gets dashed border
      overlay.style.borderStyle = 'dashed';
    } else {
      overlayInner.style.display = 'none';
      overlay.style.borderStyle = 'solid';
    }

    tooltip.style.display = 'block';
    tooltip.style.top     = Math.max(0, rect.top - 28) + 'px';
    tooltip.style.left    = rect.left + 'px';

    // Show a title, can be a Widget or a Render
    if (mode === 'renderer') {
      const rid = el.getAttribute('bcdrendererid');
      tooltip.innerHTML = `<span style="color:#888;">bcdrendererid=</span><strong>${escapeHtml(rid)}</strong>`;
    } else {
      const tag = el.tagName.toLowerCase();
      const wc  = innerEl ? ([...innerEl.classList].find(c => WIDGET_CLASSES.has(c)) || '') : ([...el.classList].find(c => WIDGET_CLASSES.has(c)) || '');
      const ownerLabel = innerEl ? ` <span style="color:#aaa;font-size:10px;">in &lt;${escapeHtml(tag)}&gt;</span>` : '';
      tooltip.innerHTML = `<span style="color:#E8920A;">widget</span> <strong>${escapeHtml(wc || tag)}</strong>${ownerLabel}`;
    }
  }

  /**
   * Remove highlight area
   */
  function clearHighlight() {
    overlay.style.display = 'none';
    overlayInner.style.display = 'none';
    tooltip.style.display = 'none';
  }

  // Event handlers for the highlight area
  function onHighlightAreaMouseover(e) {
    if (!e.ctrlKey && !e.metaKey) { clearHighlight(); return; }
    const found = findActiveEl(e.target);
    if (!found || found.el === activeEl) return;
    activeEl = found.el;
    highlightEl(found.el, found.mode, found.innerEl || null);
  }

  function onHighlightAreaMouseout(e) {
    const found = findActiveEl(e.target);
    if (!found) return;
    if (e.relatedTarget && found.el.contains(e.relatedTarget)) return;
    activeEl = null;
    clearHighlight();
  }

  /**
   * User clicked a highlight area, show info for the Widget or Render
   * @param e
   */
  function onHighlightClick(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    const found = findActiveEl(e.target);
    if (!found) return;
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
    if (found.mode === 'renderer') showPanel(found.el.getAttribute('bcdrendererid'));
    else inspectWidget(found.innerEl || found.el, found.innerEl ? found.el : null);
  }

  /**
   * We only highlight during ctlr/cmd being pressed
   * @param e
   */
  function onHighlightAreaKeyup(e) {
    // When Ctrl is released, clear the highlight
    if (e.key === 'Control') clearHighlight();
  }

  /**
   * Show DebugPanel
   */
  function injectDOM() {
    // Styles
    const style = document.createElement('style');
    style.id = 'bcd-dbg-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    // Overlay
    overlay = document.createElement('div');
    overlay.id = 'bcd-dbg-overlay';
    document.body.appendChild(overlay);

    // Inner widget overlay (dashed)
    overlayInner = document.createElement('div');
    overlayInner.id = 'bcd-dbg-overlay-inner';
    document.body.appendChild(overlayInner);
    tooltip = document.createElement('div');
    tooltip.id = 'bcd-dbg-tooltip';
    document.body.appendChild(tooltip);

    // Panel
    panel = document.createElement('div');
    panel.id = 'bcd-dbg-panel';
    panel.innerHTML = `
      <div class="bcd-ph">
        <span class="bcd-ph-title" id="bcd-dbg-title">BCD-UI Inspector</span>
        <button class="bcd-ph-close" id="bcd-dbg-close" aria-label="Close">×</button>
      </div>
      <div id="bcd-dbg-body"></div>
    `;
    document.body.appendChild(panel);

    panelTitle = panel.querySelector('#bcd-dbg-title');
    panelBody  = panel.querySelector('#bcd-dbg-body');
    closeBtn   = panel.querySelector('#bcd-dbg-close');

    closeBtn.addEventListener('click', () => panel.classList.remove('bcd-visible'));
    closeBtn = panel.querySelector('#bcd-dbg-close');
    injectLogLevelIntoHeader();

    makeDraggable(panel, panel.querySelector('.bcd-ph'));
    makeResizable(panel);

    // Modal
    modal = document.createElement('div');
    modal.id = 'bcd-dbg-modal-backdrop';
    modal.innerHTML = `
      <div id="bcd-dbg-modal">
        <div class="bcd-modal-header">
          <span class="bcd-modal-title" id="bcd-modal-title"></span>
          <button class="bcd-ph-close" id="bcd-modal-close" aria-label="Close">×</button>
        </div>
        <div class="bcd-modal-body" id="bcd-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modalTitle = modal.querySelector('#bcd-modal-title');
    modalBody  = modal.querySelector('#bcd-modal-body');

    const modalBox = modal.querySelector('#bcd-dbg-modal');
    makeDraggable(modalBox, modal.querySelector('.bcd-modal-header'));
    makeResizable(modalBox);

    modal.querySelector('#bcd-modal-close').addEventListener('click', () => modal.classList.remove('bcd-visible'));
    // Click backdrop to close
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('bcd-visible'); });
    // Escape key to close
    document.addEventListener('keydown', e => { if (e.key === 'Escape')
      modal.classList.length > 0 ? modal.classList.remove('bcd-visible') : panel.classList.remove('bcd-visible'); });
  }

  const LOG_LEVELS = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];

  /**
   * Log level was chosen by user
   * @param levelName
   */
  function applyLogLevel(levelName) {
    try {
      const level = log4javascript.Level[levelName];
      if (level) bcdui.log.setLevel(level);
    } catch(e) { /* bcdui/log4javascript not ready yet, skip */ }
  }

  /**
   * Initially derive log level from local store, or use its current value
   */
  function restoreLogLevel() {
    const saved = localStorage.getItem(LS_LOGLEVEL_KEY) ?? bcdui.log.getLevel().name;
    if (saved && LOG_LEVELS.includes(saved)) applyLogLevel(saved);
  }

  /**
   * Allow setting the loglevel
   * @returns {HTMLDivElement}
   */
  function injectLogLevelIntoHeader() {
    const saved = localStorage.getItem(LS_LOGLEVEL_KEY) || bcdui.log.getLevel().name || 'WARN';

    const lbl = document.createElement('span');
    lbl.textContent = 'Console log level';
    lbl.style.cssText = 'font-size:11px;color:#888;font-family:monospace;white-space:nowrap;';

    const sel = document.createElement('select');
    sel.style.cssText = 'font-size:11px;font-family:monospace;border:1px solid #ccc;border-radius:4px;padding:1px 4px;background:transparent;color:inherit;cursor:pointer;';
    LOG_LEVELS.forEach(lv => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = lv;
      if (lv === saved) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      localStorage.setItem(LS_LOGLEVEL_KEY, sel.value);
      applyLogLevel(sel.value);
    });

    // Insert before the close button so it sits at the right, just left of ×
    closeBtn.before(lbl, sel);
  }

  /**
   * Init the DebugPanel
   * @param options
   */
  function init(options = {}) {

    restoreLogLevel();
    injectDOM();

    // Event handler for the highlight area
    document.addEventListener('mouseover', onHighlightAreaMouseover, true);
    document.addEventListener('mouseout',  onHighlightAreaMouseout,  true);
    document.addEventListener('click',     onHighlightClick,     true);
    document.addEventListener('scroll',    onHighlightAreaScroll,    true);
    document.addEventListener('keyup',     onHighlightAreaKeyup,     true);

    console.info('[DebugPanel] initialized. Hover over [bcdrendererid] elements to inspect.');
  }

  /**
   * Move the highlight along wiht its area
   */
  function onHighlightAreaScroll() {
    if (!activeEl) return;
    const found = findActiveEl(activeEl);
    if (found) highlightEl(found.el, found.mode);
    else clearHighlight();
  }

  return { init }

})();

/*
 * If we are loaded, we want to become active
 */
bcdui.factory.DebugPanel.init();
