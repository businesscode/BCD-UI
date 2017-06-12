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
<!--
  Merges $statusModel//scc:Layout[@scorecardId=$scorecardId] into scorecard metaData
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="statusModel" select="/*[1=0]"/>
  <xsl:param name="scorecardId"/>

  <xsl:variable name="doc" select="/"/>

  <!-- default copy -->
  <xsl:template match="@*|node()"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:template>
  
  <xsl:template match="/">
    <scc:ScorecardConfiguration>

      <!--
        there might be no layout in given scorecardConfiguration, so we generate one and take over
        a possibly existing one (but we do prefer status model layout over metadata layout)
       -->
      <xsl:copy-of select="/*/*[not(self::scc:Layout)]"/>
      <scc:Layout>
        <xsl:copy-of select="/*/scc:Layout/@removeEmptyCells"/>
         <xsl:choose>
          <xsl:when test="$statusModel//scc:Layout[@scorecardId=$scorecardId]/*">
            <xsl:apply-templates select="$statusModel//scc:Layout[@scorecardId=$scorecardId]/*"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy-of select="/*/scc:Layout/@*" />
            <xsl:apply-templates select="/*/scc:Layout/*"/>
          </xsl:otherwise> 
        </xsl:choose>
      </scc:Layout>

      <!-- turn off row/col span for top-n and sorting -->
      <xp:XSLTParameters>
        <xp:HtmlBuilder>
          <xsl:choose>
           <xsl:when test="$statusModel//scc:Layout[@scorecardId=$scorecardId]/*">
             <xp:MakeColSpan><xsl:value-of select="string(not(boolean($statusModel//scc:Layout[@scorecardId=$scorecardId and (scc:AspectRefs/*[@sort!=''] or scc:TopNDimMembers/scc:TopNDimMember)]/scc:Dimensions/scc:Columns/scc:LevelKpi)))"/></xp:MakeColSpan>
             <xp:MakeRowSpan><xsl:value-of select="string(not(boolean($statusModel//scc:Layout[@scorecardId=$scorecardId and (scc:AspectRefs/*[@sort!=''] or scc:TopNDimMembers/scc:TopNDimMember)]/scc:Dimensions/scc:Rows/scc:LevelKpi)))"/></xp:MakeRowSpan>
           </xsl:when>
           <xsl:otherwise>
             <xp:MakeColSpan><xsl:value-of select="string(not(boolean(/*/scc:Layout[scc:AspectRefs/*[@sort!=''] or scc:TopNDimMembers/scc:TopNDimMember]/scc:Dimensions/scc:Columns/scc:LevelKpi)))"/></xp:MakeColSpan>
             <xp:MakeRowSpan><xsl:value-of select="string(not(boolean(/*/scc:Layout[scc:AspectRefs/*[@sort!=''] or scc:TopNDimMembers/scc:TopNDimMember]/scc:Dimensions/scc:Rows/scc:LevelKpi)))"/></xp:MakeRowSpan>
           </xsl:otherwise> 
          </xsl:choose>
          <xp:SortRows>false</xp:SortRows>
          <xp:SortCols>false</xp:SortCols>
        </xp:HtmlBuilder>
      </xp:XSLTParameters>

    </scc:ScorecardConfiguration>
  </xsl:template>

</xsl:stylesheet>
