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
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  >

<xsl:import href="../../../../xslt/stringUtil.xslt"/>
<!--
  Creates a list of additional settings like sorting or hiding for a cube
  input model is the cube's status model with the cube layout
  -->

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="guiStatus" select="*[false()]"/>
  <xsl:param name="bcdI18nModel" select="*[false()]"/>
  <xsl:param name="dndOptionsModel"/>
  <xsl:param name="cubeId"/>

  <xsl:template match="/">
    <div class="bcdDnDSummary">
      <xsl:choose>
        <xsl:when test="$guiStatus/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId=$cubeId and @disableClientRefresh='true']">
          <span style="font-weight:bold">The report definition is modified and client side refresh is disabled. Please press apply first.</span>
        </xsl:when>
        <xsl:otherwise>
          <ul>
            <xsl:call-template name="dimensions"/>
            <xsl:call-template name="columnDimensions"/>
            <xsl:call-template name="measures"/>
          </ul>
        </xsl:otherwise>
      </xsl:choose>
    </div>
  </xsl:template>

  <!-- Output row dimensions -->
  <xsl:template name="dimensions">
    <xsl:apply-templates select="/*/cube:Layout[@cubeId=$cubeId]/cube:Dimensions/cube:Rows/dm:LevelRef">
      <xsl:with-param name="rowColCaption" select="'Row'"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Output col dimensions -->
  <xsl:template name="columnDimensions">
    <xsl:apply-templates select="/*/cube:Layout[@cubeId=$cubeId]/cube:Dimensions/cube:Columns/dm:LevelRef">
      <xsl:with-param name="rowColCaption" select="'Column'"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Helper for dimension output -->
  <xsl:template match="dm:LevelRef">
    <xsl:param name="rowColCaption"/>

    <!-- Collect the messages -->
    <xsl:variable name="levelOutput">
       <xsl:if test="@sortBy">
         <li>Is sorted <xsl:value-of select="@sort"/> by measure <xsl:value-of select="($dndOptionsModel/cube:CubeConfiguration/cube:Measures/dm:MeasureRef[@idRef=current()/@sortBy] | /*/cube:Layout[@cubeId=$cubeId]/cube:Measures//dm:Measure[@id=current()/@sortBy])/@caption"/></li>
       </xsl:if>
       <xsl:if test="@total!='trailing'">
         <li>has a <xsl:value-of select="@total"/> total</li>
       </xsl:if>
       <xsl:call-template name="hiddenDimensionValues"><xsl:with-param name="bRef" select="@bRef"/></xsl:call-template>
       <xsl:call-template name="excludedDimensionsValues"><xsl:with-param name="bRef" select="@bRef"/></xsl:call-template>

       <xsl:for-each select="cube:VDM/cube:Map">
         <xsl:variable name="list">
           <xsl:call-template name="replaceString">
             <xsl:with-param name="str" select="@from"/>
             <xsl:with-param name="find" select="'&#xe0f2;'"/>
             <xsl:with-param name="replacement" select="', '"/>
           </xsl:call-template>
         </xsl:variable>
         <li><xsl:value-of select="@to"/>: <xsl:value-of select="$list"/></li>
       </xsl:for-each>

    </xsl:variable>

    <!-- If there are messages, output them together with the dimension's caption -->
    <xsl:if test="normalize-space($levelOutput)">
      <li>
        <xsl:value-of select="$rowColCaption"/> dimension <span style="font-weight:bold"><xsl:value-of select="@caption"/></span>
        <ul>
          <xsl:copy-of select="$levelOutput"/>
        </ul>
      </li>
    </xsl:if>
  </xsl:template>

  <!-- Helper for cube hide -->
  <xsl:template name="hiddenDimensionValues">
    <xsl:param name="bRef"/>
    <xsl:if test="count( /*/cube:Layout[@cubeId=$cubeId]/cube:Hide/f:Filter/*[@bRef = $bRef]/descendant-or-self::f:Expression) > 0">
      <li><xsl:text>Hidden values: </xsl:text>
        <xsl:for-each select="/*/cube:Layout[@cubeId=$cubeId]/cube:Hide/f:Filter/*[@bRef = $bRef]">
          <xsl:if test="position() > 1">, </xsl:if>
          <xsl:choose>
            <!-- Don't show each level for total (they are all total), but just 'total' -->
            <xsl:when test="descendant-or-self::f:Expression[1]/@value='&#xE0F0;1' and descendant-or-self::f:Expression[2]/@value='&#xE0F0;1'">
              <xsl:value-of select="$bcdI18nModel/*/bcd_Total"/>
            </xsl:when>
            <!-- non-total case -->
            <xsl:otherwise>
              <xsl:for-each select="descendant-or-self::f:Expression">
                <xsl:if test="position() > 1"> / </xsl:if>
                <xsl:choose>
                  <xsl:when test="@value='&#xE0F0;1'"><xsl:value-of select="$bcdI18nModel/*/bcd_Total"/></xsl:when>
                  <xsl:when test="@value='&#xE0F0;0'"><xsl:value-of select="$bcdI18nModel/*/bcd_EmptyDimmember"/></xsl:when>
                  <xsl:otherwise><xsl:value-of select="@value"/></xsl:otherwise>
               </xsl:choose>
              </xsl:for-each>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:for-each>
      </li>
    </xsl:if>
  </xsl:template>

  <!-- Helper for cube exclude-->
  <xsl:template name="excludedDimensionsValues">
    <xsl:param name="bRef"/>
    <xsl:if test="count(/*/f:Filter/*[@type=concat('bcdCubeExclude_',$cubeId) and @exclBRef=$bRef])">
      <li><xsl:text>Excluded values: </xsl:text>
        <xsl:for-each select="/*/f:Filter/*[@type=concat('bcdCubeExclude_',$cubeId) and @exclBRef=$bRef]">
          <xsl:if test="position() > 1">, </xsl:if>
            <xsl:for-each select="descendant-or-self::f:Expression[@value or not(@op='=')]"> <!-- skip those with empty @value as they just serve allowing null for these in the sql -->
              <xsl:if test="position() > 1"> / </xsl:if>
              <xsl:choose>
                <xsl:when test="not(@value)"><xsl:value-of select="$bcdI18nModel/*/bcd_EmptyDimmember"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="@value"/></xsl:otherwise>
             </xsl:choose>
            </xsl:for-each>
        </xsl:for-each>
      </li>
    </xsl:if>
  </xsl:template>

  <!-- Output measure settings -->
  <xsl:template name="measures">

    <!-- Collect the messages -->
    <xsl:for-each select="/*/cube:Layout[@cubeId=$cubeId]/cube:Measures//dm:MeasureRef | /*/cube:Layout[@cubeId=$cubeId]/cube:Measures//dm:Measure">
      <xsl:variable name="measureOutput">
        <xsl:if test="@sort">
          <li>Is sorted <xsl:value-of select="@sort"/></li>
        </xsl:if>
        <xsl:if test="@cumulateCol">
          <li>Is cumulated column wise</li>
        </xsl:if>
        <xsl:if test="@cumulateRow">
          <li>Is cumulated row wise</li>
        </xsl:if>
      </xsl:variable>

    <!-- If there are messages, output them together with the measure's caption -->
      <xsl:if test="normalize-space($measureOutput)">
        <li>
          <xsl:variable name="measure" select="self::*[self::dm:Measure|self::dm:MeasureRef]"/>
          Measure <span style="font-weight:bold"><xsl:value-of select="($dndOptionsModel/cube:CubeConfiguration/cube:Measures/dm:MeasureRef[@idRef=current()/@idRef] | $measure)/@caption"/></span>
          <ul>
            <xsl:copy-of select="$measureOutput"/>
          </ul>
        </li>
      </xsl:if>
    </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>