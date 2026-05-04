<!--
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
  Default context sensitive Tree context menu
  You may overwrite this file via parameter args.contextMenu when creating the tree to trigger a custom chain for producing the export Wrq or target url
  args.contextMenu represents the chain parameter of the tree-created context menu.
  Of course you may also set args.contextMenu to false and create your own context menu from scratch with full control.
  -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:tree="http://www.businesscode.de/schema/bcdui/tree-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Provided by the tree to its context menus -->
  <xsl:param name="bcdContextPath" />
  <xsl:param name="bcdColIdent" />
  <xsl:param name="bcdRowIdent" />
  <xsl:param name="bcdI18nModel"/>
  <xsl:param name="treeDefinition" />
  <xsl:param name="bcdPageAccess" select="''"/>
  <xsl:param name="treeDataModel" select="/*[0=1]"/>
  <xsl:param name="gotExport" select="'false'"/>

  <xsl:variable name="colHead" select="$treeDataModel/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id = $bcdColIdent]"/>
  <xsl:variable name="row" select="$treeDataModel/*/wrs:Data/wrs:*[@id=$bcdRowIdent]"/>
  <xsl:variable name="cell" select="$row/wrs:C[position()=$colHead/@pos]"/>

  <!-- Root -->
  <xsl:template match="/*">
    <ContextMenu>
      <xsl:if test="$gotExport='true'">
        <ContextMenuEntryGroup caption="{$bcdI18nModel/*/bcd_Tree_ActionsGlobalHdr}" >
          <Entry caption="{$bcdI18nModel/*/bcd_Tree_Export}" data-bcd-action="fullDataExport">
            <JavaScriptAction>jQuery("#" + this.eventSrcElement).trigger("treeActions:fullDataExport")</JavaScriptAction>
          </Entry>
        </ContextMenuEntryGroup>
      </xsl:if>
    </ContextMenu>
  </xsl:template>

</xsl:stylesheet>