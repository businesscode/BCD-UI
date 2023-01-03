<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
  generates a chart config based on a given wrs

  - either you have a measure and a transformed inner row dimension, you get one series for each dimension value
  - otherwise you get one series per measure
 -->
 
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:chart="http://www.businesscode.de/schema/bcdui/charts-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:import href="bcduicp://bcdui/xslt/stringUtil.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="rowId" select="''"/>
  <xsl:param name="chartType1" select="''"/>
  <xsl:param name="chartType2" select="''"/>

  <xsl:key name="measureKey" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@valueId"/>
  <xsl:key name="unitKey" match="/*/wrs:Header/wrs:Columns/wrs:C" use="concat('|', @unit)"/>
  <xsl:key name="dimValuesKey" match="/*/wrs:Data/wrs:R/wrs:Dim" use="text()"/>
  <xsl:variable name="categoryDims" select="/*/wrs:Data/wrs:R/wrs:Dim[generate-id(.)=generate-id(key('dimValuesKey', text()))]"/>

  <xsl:variable name="measureCount" select="count(/*/wrs:Header/wrs:Columns/wrs:C[generate-id(.)=generate-id(key('measureKey', @valueId))])"/>
  
  <xsl:template match="/*">

    <chart:Chart title="" xmlns:chart="http://www.businesscode.de/schema/bcdui/charts-1.0.0">
    
      <!-- build up categories, only take the number of 1 measure since categories count is identical for all measures -->
      <chart:XAxis>
        <chart:Categories>
          <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[generate-id(.)=generate-id(key('measureKey', @valueId))][1]">
            <xsl:variable name="measure" select="@valueId"/>
            <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId=$measure]">
              <xsl:variable name="captionIdx">
                <xsl:call-template name="lastIndexOf">
                  <xsl:with-param name="s" select="@caption"/>
                  <xsl:with-param name="c" select="'|'"/>
                </xsl:call-template>
              </xsl:variable>
              <xsl:variable name="caption">
                <xsl:choose>
                  <xsl:when test="$categoryDims"><xsl:value-of select="concat(@caption, '|', /*/wrs:Header/wrs:Columns/@innerRowDimCaption)"/></xsl:when>
                  <xsl:when test="$captionIdx=0"><xsl:value-of select="@caption"/></xsl:when>
                  <xsl:otherwise><xsl:value-of select="substring(@caption, 0, $captionIdx)"/></xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              <chart:Value><xsl:value-of select="$caption"/></chart:Value>
            </xsl:for-each>
          </xsl:for-each>
        </chart:Categories>
      </chart:XAxis>

      <!-- determine up to 2 units (order should be from first measure to last to match js part min/max determination -->
      <!-- unit 1 is simply the first appearing unit (or no unit) of measure non total columns -->
      <xsl:variable name="unit1">
        <xsl:choose>
          <xsl:when test="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId][1]/@unit"><xsl:value-of select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId][1]/@unit"/></xsl:when>
          <xsl:otherwise></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>

      <!-- second unit depends on first unit and is selected by taking the unit which differs from first one (if available) -->
      <xsl:variable name="unit2">
        <xsl:choose>
          <xsl:when test="$unit1 ='' and /*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and @unit and @unit!='']"><xsl:value-of select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and @unit!='']/@unit"/></xsl:when>
          <xsl:when test="$unit1!='' and /*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and (not(@unit) or @unit='')]"></xsl:when>
          <xsl:when test="$unit1!='' and /*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and @unit != $unit1]"><xsl:value-of select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and @unit != $unit1]"/></xsl:when>
          <xsl:otherwise></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>

      <!-- do we have 1 or 2 units (more aren't supported since we only support 2 y axis -->
      <xsl:variable name="unitCount">
        <xsl:choose>
          <xsl:when test="(/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and (not(@unit) or @unit='')]) and (/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId and @unit!=''])">2</xsl:when>
          <xsl:otherwise>1</xsl:otherwise>
        </xsl:choose>
      </xsl:variable>

      <!-- write unit for 1 or 2 y axis -->
      <chart:YAxis1 unit="{$unit1}"/>
      <xsl:if test="$unitCount=2">
        <chart:YAxis2 unit="{$unit2}"/>
      </xsl:if>

      <chart:Series>
        <xsl:choose>

          <!-- in case of an innerRowDim inlineChart (and only 1 measure), we generate one series for each dim value -->
          <xsl:when test="$measureCount=1 and $categoryDims">

            <xsl:variable name="chartType">
              <xsl:choose>
                <xsl:when test="$chartType1 != ''"><xsl:value-of select="$chartType1"/></xsl:when>
                <xsl:when test="not(/*/wrs:Header/wrs:Columns/@colDimLevelIds)">BARCHART</xsl:when>
                <xsl:when test="$unit1='%'">LINECHART</xsl:when>
                <xsl:otherwise>BARCHART</xsl:otherwise>
              </xsl:choose>
            </xsl:variable>

            <xsl:for-each select="$categoryDims">
            <xsl:sort select="."/>
              <xsl:variable name="dimValue" select="text()"/>
              <chart:Series caption="{$dimValue}" chartType="{$chartType}" yAxis1Or2="1">
                <chart:YData>
                  <xsl:choose>
                  <xsl:when test="/*/wrs:Data/wrs:R[@id=$rowId]/wrs:Dim[text()=$dimValue]/wrs:Value">
                    <xsl:for-each select="/*/wrs:Data/wrs:R[@id=$rowId]/wrs:Dim[text()=$dimValue]/wrs:Value">
                      <chart:Value><xsl:value-of select="."/></chart:Value>
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:otherwise>
                    <!-- no values for current dim value, then fill up with zeros -->
                    <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId]">
                      <chart:Value>0</chart:Value>
                    </xsl:for-each>
                  </xsl:otherwise>
                  </xsl:choose>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>

          <!-- generate a series for each measure -->
          <xsl:otherwise>
            <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[generate-id(.)=generate-id(key('measureKey', @valueId))]">
    
              <xsl:variable name="measure" select="@valueId"/>
    
              <!-- get current measure -->
              <xsl:variable name="unit">
                <xsl:choose>
                  <xsl:when test="@unit"><xsl:value-of select="@unit"/></xsl:when>
                  <xsl:otherwise></xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
    
              <!-- determine yAxis assignment -->
              <xsl:variable name="yAxis">
                <xsl:choose>
                  <xsl:when test="$unit=$unit1">1</xsl:when>
                  <xsl:when test="$unit=$unit2">2</xsl:when>
                  <xsl:otherwise>1</xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
    
              <!-- determine current caption by taking the last string after dims (|-separated)-->
              <xsl:variable name="captionIdx">
                <xsl:call-template name="lastIndexOf">
                  <xsl:with-param name="s" select="@caption"/>
                  <xsl:with-param name="c" select="'|'"/>
                </xsl:call-template>
              </xsl:variable>
              <xsl:variable name="caption">
                <xsl:choose>
                  <xsl:when test="$captionIdx=0"><xsl:value-of select="@caption"/></xsl:when>
                  <xsl:otherwise><xsl:value-of select="substring(@caption, $captionIdx + 1)"/></xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
    
              <!-- percentage unit draws a linechart, absolute values a barchart, if there is no col dimensions, use a bar chart  -->
              <xsl:variable name="chartType">
                <xsl:choose>
                  <xsl:when test="$chartType1 != '' and $yAxis=1"><xsl:value-of select="$chartType1"/></xsl:when>
                  <xsl:when test="$chartType2 != '' and $yAxis=2"><xsl:value-of select="$chartType2"/></xsl:when>
                  <xsl:when test="not(/*/wrs:Header/wrs:Columns/@colDimLevelIds)">BARCHART</xsl:when>
                  <xsl:when test="$unit='%'">LINECHART</xsl:when>
                  <xsl:otherwise>BARCHART</xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              <chart:Series caption="{$caption}" chartType="{$chartType}" yAxis1Or2="{$yAxis}">
                <!-- copy row data without totals -->
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R[@id=$rowId]/wrs:C[position()=/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id, '&#xE0F0;')) and @valueId=$measure]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
      </chart:Series>
    </chart:Chart>

  </xsl:template>
</xsl:stylesheet>