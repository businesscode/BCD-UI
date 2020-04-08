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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="paramModel" select="/*[0=1]"/>
  <xsl:param name="statusModel" select="/*[0=1]"/>
  <xsl:param name="paramSetId"/>
  <xsl:param name="paramSet" select="$paramModel//xp:CubeCalculation[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>
  <xsl:param name="paramSetExpandCollapse" select="$paramModel//xp:ExpandCollapseCells[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>
  <xsl:param name="statusModelExpandCollapse" select="$statusModel/*/guiStatus:ClientSettings/guiStatus:ExpandCollapseCells"/>

  <xsl:variable name="isInitiallyCollapsed" select="starts-with($paramSetExpandCollapse/@apply,'collapse')"/>

  <xsl:variable name="maxRowDimPosRaw" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$paramSet/@lastRowDim]/@pos)"/>
  <xsl:variable name="maxColDimPosRaw" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$paramSet/@lastColDim]/@pos)"/>
  <xsl:variable name="gotColDims" select="string($maxColDimPosRaw)!='NaN'"/>
  <xsl:variable name="gotRowDims" select="string($maxRowDimPosRaw)!='NaN'"/>
  <xsl:variable name="maxRowDimPos"> <xsl:choose> <xsl:when test="$gotRowDims"><xsl:value-of select="$maxRowDimPosRaw"/></xsl:when> <xsl:otherwise>0</xsl:otherwise> </xsl:choose> </xsl:variable>
  <xsl:variable name="maxColDimPos"> <xsl:choose> <xsl:when test="$gotColDims"><xsl:value-of select="$maxColDimPosRaw"/></xsl:when> <xsl:otherwise>0</xsl:otherwise> </xsl:choose> </xsl:variable>
  <xsl:variable name="firstColDimIndex"> <xsl:choose> <xsl:when test="$gotColDims"><xsl:value-of select="number($maxRowDimPos) + 1"/></xsl:when> <xsl:otherwise>-1</xsl:otherwise> </xsl:choose> </xsl:variable>
  <xsl:variable name="firstRowDimIndex" select="number(1)"/>

  <!-- default copy -->
  <xsl:template match="@*|node()"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:template>
  
    <!-- We only run if requested, otherwise we create a XsltNop to indicate that our input is to be used as out output -->
  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="starts-with($paramSetExpandCollapse/@apply, 'collapse') or $paramSetExpandCollapse/@apply='expand'">
        <xsl:copy>
          <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- either initially collapsed or expanded -->
  <xsl:template match="wrs:R">
    <xsl:call-template name="filterRow"/>
  </xsl:template>

  <!-- gets the lowest or highest level count out of the matches in match list; determines level count by counting the separator chars + 1 -->
  <xsl:template name="getLevel">
    <xsl:param name="nodeList"/>
    <xsl:param name="level"/>
    <xsl:param name="getLowest"/>
    <xsl:param name="idx" select="number(1)"/>
    <xsl:variable name="curLevel" select="1 + number(string-length($nodeList[position()=$idx]) - string-length(translate($nodeList[position()=$idx], '&#xE0F2;', '')))"/>
    <xsl:variable name="newLevel">
      <xsl:choose>
        <xsl:when test="$getLowest = 'true'  and $nodeList[position()=$idx] and $curLevel &lt; $level"><xsl:value-of select="$curLevel"/></xsl:when>
        <xsl:when test="$getLowest = 'false' and $nodeList[position()=$idx] and $curLevel &gt; $level"><xsl:value-of select="$curLevel"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="$level"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:choose>   
      <xsl:when test="$nodeList[position()=$idx]">
        <xsl:call-template name="getLevel">
          <xsl:with-param name="nodeList" select="$nodeList"/>
          <xsl:with-param name="idx" select="number($idx) + 1"/>
          <xsl:with-param name="level" select="$newLevel"/>
          <xsl:with-param name="getLowest" select="$getLowest"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$newLevel"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  <xsl:template name="getLowestLevel"> <xsl:param name="nodeList"/><xsl:call-template name="getLevel"><xsl:with-param name="nodeList" select="$nodeList"/><xsl:with-param name="level" select="number(99999999999)"/><xsl:with-param name="getLowest" select="'true'"/> </xsl:call-template></xsl:template>
  <xsl:template name="getHighestLevel"><xsl:param name="nodeList"/><xsl:call-template name="getLevel"><xsl:with-param name="nodeList" select="$nodeList"/><xsl:with-param name="level" select="number(00000000000)"/><xsl:with-param name="getLowest" select="'false'"/></xsl:call-template></xsl:template>

  <!-- concatenates the values of a wrs:C range and uses a separator -->
  <xsl:template name="concatCells">
    <xsl:param name="idx"/>
    <xsl:param name="max"/>
    <xsl:param name="value" select="''"/>
    <xsl:param name="init" select="number(1)"/>
    <xsl:param name="R" select="."/>
    <xsl:variable name="separator"><xsl:if test="$init != '1'">&#xE0F2;</xsl:if></xsl:variable>
    <xsl:variable name="dimEmpty">&#xE0F0;</xsl:variable>
    <xsl:choose>
      <xsl:when test="$idx &lt;= $max">
        <xsl:variable name="theValue">
        <xsl:choose>
          <xsl:when test="$R/wrs:C[position()=$idx]/wrs:null"><xsl:value-of select="$dimEmpty"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="$R/wrs:C[position()=$idx]"/></xsl:otherwise>
        </xsl:choose>
        </xsl:variable>
        <xsl:call-template name="concatCells">
          <xsl:with-param name="R" select="$R"/>
          <xsl:with-param name="idx" select="number($idx) + 1"/>
          <xsl:with-param name="value" select="concat($value, $separator, $theValue)"/>
          <xsl:with-param name="max" select="$max"/>
          <xsl:with-param name="init" select="number(0)"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:choose>
          <xsl:when test="./wrs:null"><xsl:value-of select="$dimEmpty"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- determine if row gets removed or stays in -->
  <xsl:template name="filterRow">
  
    <!-- determine row status -->
    <xsl:variable name="rowFilter">
      <xsl:choose>
        <xsl:when test="$gotRowDims">
          <xsl:call-template name="testRow">
            <xsl:with-param name="filterList" select="$statusModelExpandCollapse/guiStatus:Row"/>
            <xsl:with-param name="start" select="$firstRowDimIndex"/>
            <xsl:with-param name="stop" select="$maxRowDimPos"/>
          </xsl:call-template>
        </xsl:when>
        <xsl:otherwise><xsl:value-of select="$isInitiallyCollapsed"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <!-- determine col status -->
    <xsl:variable name="colFilter">
      <xsl:choose>
        <xsl:when test="$gotColDims">
          <xsl:call-template name="testRow">
            <xsl:with-param name="filterList" select="$statusModelExpandCollapse/guiStatus:Col"/>
            <xsl:with-param name="start" select="$firstColDimIndex"/>
            <xsl:with-param name="stop" select="$maxColDimPos"/>
          </xsl:call-template>
        </xsl:when>
        <xsl:otherwise><xsl:value-of select="$isInitiallyCollapsed"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <!-- and finally some minimum visible criteria -->
    <xsl:variable name="isRowLevel1TotalCell" select="boolean($gotRowDims and wrs:C[position() = $firstRowDimIndex + 1 and @bcdGr='1'])"/>
    <xsl:variable name="isColLevel1TotalCell" select="boolean($gotColDims and wrs:C[position() = $firstColDimIndex + 1 and @bcdGr='1'])"/>
    <xsl:variable name="showMinimumRow" select="not($gotRowDims) or $isRowLevel1TotalCell or $firstRowDimIndex = $maxRowDimPos"/>
    <xsl:variable name="showMinimumCol" select="not($gotColDims) or $isColLevel1TotalCell or $firstColDimIndex = $maxColDimPos"/>

    <!-- finally skip or keep row -->
    <xsl:if test="($rowFilter = 'true' or $showMinimumRow) and ($colFilter = 'true' or $showMinimumCol)"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:if>
  </xsl:template>

  <!-- test row:
    - generate a concatenated key-like value for the row/col dim values of the current row and check if this is part of the stored list (e.g. created by the frontend
    - if it is part of it, determine the highest or lowest matching level of it and decide if the current row represents a total of the selection of not
   -->
  <xsl:template name="testRow">
    <xsl:param name="filterList"/>
    <xsl:param name="start"/>
    <xsl:param name="stop"/>
    <xsl:variable name="myKey"><xsl:call-template name="concatCells"><xsl:with-param name="max" select="$stop"/><xsl:with-param name="idx" select="$start"/></xsl:call-template></xsl:variable>
    <xsl:variable name="match" select="$filterList[starts-with($myKey, .)]"/>
    <xsl:choose>
      <xsl:when test="boolean($match)">
        <xsl:variable name="level">
          <xsl:choose>
            <xsl:when test="$isInitiallyCollapsed">
              <xsl:call-template name="getHighestLevel"><xsl:with-param name="nodeList" select="$match"/></xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
              <xsl:call-template name="getLowestLevel"><xsl:with-param name="nodeList" select="$match"/></xsl:call-template>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:choose>
          <xsl:when test="not($isInitiallyCollapsed) and wrs:C[position()=$start + $level]/@bcdGr='0'">false</xsl:when> <!-- to do: double check if these when statements can be combined to one -->
          <xsl:when test="$isInitiallyCollapsed      and wrs:C[position()=$start + $level + 1]/@bcdGr='1' or $start + $level &gt;= $stop">true</xsl:when> <!-- to do: double check if these when statements can be combined to one -->
          <xsl:otherwise><xsl:value-of select="not($isInitiallyCollapsed)"/></xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise><xsl:value-of select="not($isInitiallyCollapsed)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>