<?xml version="1.0" encoding="UTF-8"?>
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

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>
  <xsl:param name="scorecardId" />
  <xsl:param name="bcdRowIdent" />
  <xsl:param name="bcdColIdent" />
  <xsl:param name="sccConfig" select="/*[0=1]"/>

  <!-- Root -->
  <xsl:template match="/*">
    <xsl:variable name="itemId" select="substring-before($bcdRowIdent,'|')"/>
    <ContextMenu>
      <xsl:if test="/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=$itemId]">
        <Context id="bcdDim">
          <ContextMenuEntryGroup caption="{concat(/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=$itemId]/@caption, ' Totals')}" >
            <Entry caption="Hide total" data-bcd-action="hideTotals" data-scorecard-id="{$scorecardId}">
              <JavaScriptAction>bcdui.component.scorecardConfigurator._hideTotals('<xsl:value-of select="$scorecardId"/>')</JavaScriptAction>
            </Entry>
            <Entry caption="Show total" data-bcd-action="showTotals" data-scorecard-id="{$scorecardId}">
              <JavaScriptAction>bcdui.component.scorecardConfigurator._showTotals('<xsl:value-of select="$scorecardId"/>')</JavaScriptAction>
            </Entry>
          </ContextMenuEntryGroup>
        </Context>
      </xsl:if>
      <xsl:if test="/*/scc:Layout[@scorecardId=$scorecardId]/scc:AspectRefs/scc:AspectRef[@idRef=$itemId] or (/*/scc:Layout[@scorecardId=$scorecardId]/scc:AspectRefs/scc:AspectKpi and $itemId='bcdKpi' and $bcdColIdent='asp')">
        <Context id="bcdAsp">
          <xsl:variable name="aspNode" select="/*/scc:Layout[@scorecardId=$scorecardId]/scc:AspectRefs/scc:AspectRef[@idRef=$itemId]|/*/scc:Layout[@scorecardId=$scorecardId]/scc:AspectRefs/scc:AspectKpi[$itemId='bcdKpi' and $bcdColIdent='asp']"/>
          <xsl:if test="/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/scc:Rows/scc:LevelKpi">
            <ContextMenuEntryGroup caption="{concat($aspNode/@caption, ' Sorting')}" >
                <Entry caption="Sort ascending" data-bcd-action="sortAscending" data-scorecard-id="{$scorecardId}">
                  <JavaScriptAction>bcdui.component.scorecardConfigurator._sortAspect("<xsl:value-of select="$scorecardId"/>", "ascending", "")</JavaScriptAction>
                </Entry>
              <Entry caption="Sort descending" data-bcd-action="sortDescending" data-scorecard-id="{$scorecardId}">
                <JavaScriptAction>bcdui.component.scorecardConfigurator._sortAspect("<xsl:value-of select="$scorecardId"/>", "descending", "")</JavaScriptAction>
              </Entry>
              <Entry caption="Remove Sorting" data-bcd-action="clearSorting" data-scorecard-id="{$scorecardId}">
                <JavaScriptAction>bcdui.component.scorecardConfigurator._sortAspect("<xsl:value-of select="$scorecardId"/>", "", "")</JavaScriptAction>
              </Entry>
            </ContextMenuEntryGroup>
          </xsl:if>
        </Context>
      </xsl:if>
    </ContextMenu>
  </xsl:template>

</xsl:stylesheet>