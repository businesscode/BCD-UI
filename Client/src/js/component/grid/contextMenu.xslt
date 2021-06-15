<!--
  Copyright 2010-2019 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<!--
  Default context sensitive Grid context menu
  You may overwrite this file via parameter args.contextMenu when creating the grid to trigger a custom chain for producing the export Wrq or target url
  args.contextMenu represents the chain parameter of the grid-created context menu.
  Of course you may also set args.contextMenu to false and create your own context menu from scratch with full control.
  -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Provided by the grid to its context menus -->
  <xsl:param name="bcdContextPath" />
  <xsl:param name="bcdColIdent" />
  <xsl:param name="bcdRowIdent" />
  <xsl:param name="bcdI18nModel"/>
  <xsl:param name="gridDefinition" />
  <xsl:param name="allowNewRows" select="'true'"/>
  <xsl:param name="allowSorting" select="'false'"/>
  <xsl:param name="bcdPageAccess" select="''"/>
  <xsl:param name="gridModel" select="/*[0=1]"/>
  <xsl:param name="gotExport" select="'false'"/>
  <xsl:param name="rowIsDisabled" select="'false'"/>

  <xsl:variable name="colHead" select="$gridModel/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id = $bcdColIdent]"/>
  <xsl:variable name="row" select="$gridModel/*/wrs:Data/wrs:*[@id=$bcdRowIdent]"/>
  <xsl:variable name="cell" select="$row/wrs:C[position()=$colHead/@pos]"/>
  <xsl:variable name="ocell" select="$row/wrs:O[position()=$colHead/@pos]"/>

  <!-- Root -->
  <xsl:template match="/*">
    <ContextMenu>
      <xsl:if test="$bcdRowIdent and $bcdColIdent and local-name($row)='M' and $cell!=$ocell">
        <ContextMenuEntryGroup caption="{$bcdI18nModel/*/bcd_Grid_CellActionsHdr}" >
          <Entry caption="{$bcdI18nModel/*/bcd_Grid_CellRestore}">
            <JavaScriptAction>
              var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
              var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
              jQuery("#" + this.eventSrcElement).trigger("gridActions:cellRestore", {columnId: columnId, rowId: rowId } );
            </JavaScriptAction>
          </Entry>
        </ContextMenuEntryGroup>
      </xsl:if>

      <xsl:if test="$allowSorting='true'">
        <ContextMenuEntryGroup caption="{$bcdI18nModel/*/bcd_Grid_ColumnActionsHdr}" >
          <xsl:call-template name="columnSort"/>
        </ContextMenuEntryGroup>
      </xsl:if>

      <xsl:if test="$allowNewRows='true' or $bcdRowIdent">
        <ContextMenuEntryGroup caption="{$bcdI18nModel/*/bcd_Grid_RowActionsHdr}" >
          <xsl:if test="$allowNewRows='true'">
            <TwoColumns>
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowAdd_Above}">
                <xsl:if test="$gridDefinition/*/grid:Columns/@manualSort"><xsl:attribute name="isDisabled">true</xsl:attribute></xsl:if>
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                  jQuery("#" + this.eventSrcElement).trigger("gridActions:rowAdd", {columnId: columnId, rowId: rowId, mode: 'above' } );
                </JavaScriptAction>
              </Entry>
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowAdd_Top}">
                <xsl:if test="$gridDefinition/*/grid:Columns/@manualSort='descending'"><xsl:attribute name="isDisabled">true</xsl:attribute></xsl:if>
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                  jQuery("#" + this.eventSrcElement).trigger("gridActions:rowAdd", {columnId: columnId, rowId: rowId, mode: 'top' } );
                </JavaScriptAction>
              </Entry>
            </TwoColumns>
            <TwoColumns>
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowAdd_Below}">
                <xsl:if test="$gridDefinition/*/grid:Columns/@manualSort"><xsl:attribute name="isDisabled">true</xsl:attribute></xsl:if>
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                  jQuery("#" + this.eventSrcElement).trigger("gridActions:rowAdd", {columnId: columnId, rowId: rowId, mode: 'below' } );
                </JavaScriptAction>
              </Entry>
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowAdd_Bottom}">
                <xsl:if test="$gridDefinition/*/grid:Columns/@manualSort='ascending'"><xsl:attribute name="isDisabled">true</xsl:attribute></xsl:if>
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                  jQuery("#" + this.eventSrcElement).trigger("gridActions:rowAdd", {columnId: columnId, rowId: rowId, mode: 'bottom' } );
                </JavaScriptAction>
              </Entry>
            </TwoColumns>
            <xsl:if test="$bcdRowIdent and $rowIsDisabled!='true'">
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowDuplicate}">
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                  jQuery("#" + this.eventSrcElement).trigger("gridActions:rowDuplicate", {columnId: columnId, rowId: rowId } );
                </JavaScriptAction>
              </Entry>
            </xsl:if>
          </xsl:if>
          <xsl:if test="$bcdRowIdent">
            <xsl:if test="local-name($row)='M' or local-name($row)='D'">
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowRestore}">
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                jQuery("#" + this.eventSrcElement).trigger("gridActions:rowRestore", {columnId: columnId, rowId: rowId } );
                </JavaScriptAction>
              </Entry>
            </xsl:if>
            <xsl:if test="$rowIsDisabled!='true'">
              <Entry caption="{$bcdI18nModel/*/bcd_Grid_RowDelete}">
                <JavaScriptAction>
                  var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  var rowId = bcdui.factory.objectRegistry.getObject("bcdRowIdent").value;
                  jQuery("#" + this.eventSrcElement).trigger("gridActions:rowDelete", {columnId: columnId, rowId: rowId } );
                </JavaScriptAction>
              </Entry>
            </xsl:if>
          </xsl:if>
        </ContextMenuEntryGroup>
      </xsl:if>
      <xsl:if test="$gotExport='true'">
        <ContextMenuEntryGroup caption="{$bcdI18nModel/*/bcd_Grid_ActionsGlobalHdr}" >
          <Entry caption="{$bcdI18nModel/*/bcd_Grid_Export}">
            <JavaScriptAction>jQuery("#" + this.eventSrcElement).trigger("gridActions:fullDataExport")</JavaScriptAction>
          </Entry>
        </ContextMenuEntryGroup>
      </xsl:if>
    </ContextMenu>
  </xsl:template>

  <xsl:template name="columnSort">
    <ContextMenuSubHeader caption="Sort Column"/>
    <TwoColumns>
      <Entry caption="Ascending">
        <JavaScriptAction>
          var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
          jQuery("#" + this.eventSrcElement).trigger("gridActions:columnSort", {columnId: columnId, direction: "ascending" } );
        </JavaScriptAction>
      </Entry>
      <Entry caption="Descending">
        <JavaScriptAction>
          var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
          jQuery("#" + this.eventSrcElement).trigger("gridActions:columnSort", {columnId: columnId, direction: "descending" } );
        </JavaScriptAction>
      </Entry>
      <xsl:if test="$gridDefinition/*/grid:Columns/@manualSort">
        <Entry caption="Clear sorting">
          <JavaScriptAction>
            var columnId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
            jQuery("#" + this.eventSrcElement).trigger("gridActions:columnSort", {columnId: columnId, direction: null } );
          </JavaScriptAction>
        </Entry>
      </xsl:if>
    </TwoColumns>
  </xsl:template>

</xsl:stylesheet>