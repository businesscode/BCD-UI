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
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:chart="http://www.businesscode.de/schema/bcdui/charts-1.0.0"
  >

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
<!--

  Creates chart legend from given over chart metadata document
-->

  <!-- default style of color elements -->
  <xsl:param name="elementStyle">width:4em; height:0.8em;</xsl:param>

  <xsl:param name="drawSeriesLegend" select="/*/chart:DrawSeriesLegend"/>
  <xsl:param name="chartsDrawn" select="/*/chart:Computed/chart:ChartsDrawn"/>

  <!-- colors defined from colorProvider -->
  <xsl:variable name="colors" select="/*/chart:Computed/chart:Colors"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    renders Series Legend
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/*">

    <xsl:variable name="legendOnClick" select="//chart:DrawSeriesLegend/@onClick"/>
    <xsl:variable name="legendMouseOver" select="//chart:DrawSeriesLegend/@onMouseOver"/>
    <xsl:variable name="legendMouseOut" select="//chart:DrawSeriesLegend/@onMouseOut"/>
    <xsl:variable name="defaultMouseOver">document.body.style.cursor = 'pointer'</xsl:variable>
    <xsl:variable name="defaultMouseOut">document.body.style.cursor = 'default'</xsl:variable>


    <table class="bcdChartLegend" drawSeriesLegend="{not($drawSeriesLegend = 'false')}" chartsDrawn="{$chartsDrawn}">
      <xsl:if test="not($drawSeriesLegend = 'false') and $chartsDrawn = 'true'">

      <xsl:for-each select="/*/chart:Series/chart:Series">
        <xsl:variable name="curPos" select="position()"/>
        <xsl:variable name="curSeries" select="."/>

        <!-- because of attachEvent JS function we must concat brackets to event listener -->
        <xsl:variable name="onClick">
          <xsl:choose>
            <xsl:when test="string-length($legendOnClick) &gt; 0"><xsl:value-of select="concat($legendOnClick, '(jQuery.event.fix(event))')"/></xsl:when>
            <xsl:when test="@onClick"><xsl:value-of select="concat(@onClick, '(jQuery.event.fix(event))')"/></xsl:when>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="onMouseOver">
          <xsl:choose>
            <xsl:when test="string-length($legendMouseOver) &gt; 0"><xsl:value-of select="concat($legendMouseOver, '(jQuery.event.fix(event))')"/></xsl:when>
            <xsl:when test="$onClick != ''"><xsl:value-of select="$defaultMouseOver"/></xsl:when>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="onMouseOut">
          <xsl:choose>
            <xsl:when test="string-length($legendMouseOut) &gt; 0"><xsl:value-of select="concat($legendMouseOut, '(jQuery.event.fix(event))')"/></xsl:when>
            <xsl:when test="$onClick != ''"><xsl:value-of select="$defaultMouseOut"/></xsl:when>
          </xsl:choose>
        </xsl:variable>

        <xsl:choose>
          <xsl:when test="@chartType = 'PIECHART'">
            <!--
              goes through all value, thus one value is one piece of PIE chart,
            -->
            <xsl:variable name="xAxisVals" select="/*/chart:XAxis/*/chart:Value"/>
            <xsl:for-each select="chart:YData/chart:Value">
              <xsl:variable name="vPos" select="position()"/>
              <!-- prefers colors from Series -->
              <xsl:variable name="bColor">background-color:<xsl:value-of select="$colors//chart:Color[$vPos]/@rgb"/></xsl:variable>
              <xsl:call-template name="oneColorElement">
                <xsl:with-param name="className">series_<xsl:value-of select="$vPos"/></xsl:with-param>
                <xsl:with-param name="onClick" select="$onClick"/>
                <xsl:with-param name="onMouseOver" select="$onMouseOver"/>
                <xsl:with-param name="onMouseOut" select="$onMouseOut"/>
                <xsl:with-param name="stylezz" select="concat($elementStyle, ' ', $bColor)"/>
                <xsl:with-param name="caption" select="$xAxisVals[$vPos]"/>
              </xsl:call-template>
            </xsl:for-each>

          </xsl:when>
          <xsl:otherwise>
            <!-- prefers colors from Series -->
            <xsl:variable name="bColor">
              <xsl:choose>
                <xsl:when test="@rgb">background-color:<xsl:value-of select="@rgb"/></xsl:when>
                <xsl:when test="$colors/chart:Color[$curPos]/@rgb">background-color:<xsl:value-of select="$colors/chart:Color[$curPos]/@rgb"/></xsl:when>
                <xsl:when test="$colors/chart:Color[$curPos]">background-color:<xsl:value-of select="$colors/chart:Color[$curPos]"/></xsl:when>
              </xsl:choose>
            </xsl:variable>

            <xsl:call-template name="oneColorElement">
              <xsl:with-param name="className">series_<xsl:value-of select="position()"/></xsl:with-param>
              <xsl:with-param name="onClick" select="$onClick"/>
              <xsl:with-param name="onMouseOver" select="$onMouseOver"/>
              <xsl:with-param name="onMouseOut" select="$onMouseOut"/>
              <xsl:with-param name="stylezz" select="concat($elementStyle, ' ', $bColor)"/>
              <xsl:with-param name="caption" select="concat(@caption, ' ', @description)"/>
            </xsl:call-template>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>

      </xsl:if>
    </table>
  </xsl:template>


  <!-- ====================================

  ======================================= -->
  <xsl:template name="oneColorElement">
    <xsl:param name="className"/>
    <xsl:param name="onClick"/>
    <xsl:param name="onMouseOver"/>
    <xsl:param name="onMouseOut"/>
    <xsl:param name="stylezz"/>
    <xsl:param name="caption"/>

    <tr class="{$className}">
      <xsl:if test="string-length($onClick) &gt; 0">
        <xsl:attribute name="onclick"><xsl:value-of select="normalize-space($onClick)"/></xsl:attribute>
      </xsl:if>
      <xsl:if test="string-length($onMouseOver) &gt; 0">
        <xsl:attribute name="onmouseover"><xsl:value-of select="normalize-space($onMouseOver)"/></xsl:attribute>
      </xsl:if>
      <xsl:if test="string-length($onMouseOut) &gt; 0">
        <xsl:attribute name="onmouseout"><xsl:value-of select="normalize-space($onMouseOut)"/></xsl:attribute>
      </xsl:if>
      <td style="{normalize-space($stylezz)}; width:1em">&#160;&#160;</td><td style="width:auto;text-align:left" bcdTranslate="{$caption}">&#160;<xsl:value-of select="$caption"/></td>
    </tr>
  </xsl:template>

</xsl:stylesheet>
