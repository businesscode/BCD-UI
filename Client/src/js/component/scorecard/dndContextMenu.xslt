<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2017 BusinessCode GmbH, Germany

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

  <!-- Root -->
  <xsl:template match="/*">
    <ContextMenu>
      <xsl:if test="/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=substring-before($bcdRowIdent,'|')]">
        <Context id="bcdDim">
          <ContextMenuEntryGroup caption="Total" >
            <xsl:choose>
              <xsl:when test="/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=substring-before($bcdRowIdent,'|')]/@total='trailing'">
                <Entry caption="{concat('Hide total for ', /*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=substring-before($bcdRowIdent,'|')]/@caption)}">
                  <JavaScriptAction>bcdui.component.scorecardConfigurator._hideTotals('<xsl:value-of select="$scorecardId"/>')</JavaScriptAction>
                </Entry>
              </xsl:when>
              <xsl:otherwise>
                <Entry caption="{concat('Show total for ', /*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=substring-before($bcdRowIdent,'|')]/@caption)}">
                  <JavaScriptAction>bcdui.component.scorecardConfigurator._showTotals('<xsl:value-of select="$scorecardId"/>')</JavaScriptAction>
                </Entry>
              </xsl:otherwise>
            </xsl:choose>
          </ContextMenuEntryGroup>
        </Context>
      </xsl:if>
    </ContextMenu>
  </xsl:template>

</xsl:stylesheet>