<?xml version="1.0" encoding="UTF-8"?>
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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="statusModel" select="/*[1=0]"/>
  <xsl:param name="gridModel" select="/*[1=0]"/>
  <xsl:param name="gridModelId"/>

  <!-- default copy -->
  <xsl:template match="@*|node()"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:template>
  
  <xsl:template match="/">
    <grid:GridConfiguration>

      <xsl:copy-of select="/*/xp:Paginate"/>

      <!-- either take config or wrs column information -->
      <grid:Columns>
        <xsl:choose>
          <xsl:when test="/*/grid:SelectColumns/wrq:Columns//wrq:C">
            <xsl:for-each select="/*/grid:SelectColumns/wrq:Columns//wrq:C">
              <xsl:call-template name="generateColumn">
                <xsl:with-param name="bRef" select="@bRef"/>
              </xsl:call-template>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="$gridModel/*/wrs:Header/wrs:Columns/wrs:C">
              <xsl:call-template name="generateColumn">
                <xsl:with-param name="bRef" select="@id"/>
              </xsl:call-template>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
      </grid:Columns>

    </grid:GridConfiguration>
  </xsl:template>
          
  <xsl:template name="generateColumn">
    <xsl:param name="bRef"/>
      <xsl:variable name="wrsC" select="$gridModel/*/wrs:Header/wrs:Columns/wrs:C[@id=$bRef]"/>
      <wrq:C bRef="{$bRef}" pos="{$wrsC/@pos}">
        <xsl:variable name="colCaption" select="@caption|$wrsC/@caption"/>
        <xsl:variable name="typeName" select="@type-name|$wrsC/@type-name"/>
        <xsl:variable name="isNumeric" select="contains('|BIGINT|BIT|DECIMAL|DOUBLE|FLOAT|INTEGER|NUMERIC|REAL|SMALLINT|TINYINT|', concat('|', $typeName, '|'))"/>
        <xsl:variable name="displaySize" select="@display-size|$wrsC/@display-size"/>

        <xsl:attribute name="isKey"><xsl:value-of select="boolean((@isKey|$wrsC/@isKey)='true')"/></xsl:attribute>
        <xsl:attribute name="caption"><xsl:value-of select="$colCaption"/></xsl:attribute>
        <xsl:attribute name="id"><xsl:value-of select="@id|$wrsC/@id"/></xsl:attribute>
        <xsl:attribute name="readOnly"><xsl:value-of select="boolean((@isReadOnly|$wrsC/@isReadOnly)='true')"/></xsl:attribute>
        <xsl:attribute name="class"><xsl:value-of select="@class"/></xsl:attribute>
        <xsl:attribute name="isHidden"><xsl:value-of select="@isHidden"/></xsl:attribute>
        <xsl:attribute name="columnFilter"><xsl:value-of select="@columnFilter"/></xsl:attribute>
        <xsl:attribute name="scale"><xsl:value-of select="@scale|$wrsC/@scale"/></xsl:attribute>
        <xsl:attribute name="nullable"><xsl:value-of select="@nullable|$wrsC/@nullable"/></xsl:attribute>
        <xsl:attribute name="display-size"><xsl:value-of select="$displaySize"/></xsl:attribute>
        <xsl:attribute name="type-name"><xsl:value-of select="$typeName"/></xsl:attribute>
        <xsl:attribute name="isDocument"><xsl:value-of select="boolean(grid:Editor[@type='bcduiStatusModelEditor'] or grid:Editor[@type='bcduiModelDropDown'])"/></xsl:attribute>
        <xsl:attribute name="width"><xsl:value-of select="@width"/></xsl:attribute>
        <xsl:attribute name="isCheckbox"><xsl:value-of select="@isCheckbox"/></xsl:attribute>

        <grid:Editor>
          <xsl:attribute name="type">
            <xsl:choose>
              <xsl:when test="grid:Editor/@type">  <xsl:value-of select="grid:Editor/@type"/></xsl:when>
              <xsl:when test="$wrsC/wrs:References/wrs:Wrs/wrs:Data/wrs:R"> <xsl:value-of select="'bcduiSimpleDropDown'"/> </xsl:when>
              <xsl:when test="$typeName='DATE'">   <xsl:value-of select="'bcduiPeriodChooser'"/></xsl:when>
              <xsl:when test="$isNumeric">         <xsl:value-of select="'bcduiSimpleNumericInput'"/></xsl:when>
              <xsl:otherwise>                      <xsl:value-of select="'bcduiSimpleInput'"/></xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:copy-of select="grid:Editor/grid:Param"/>

          <!-- set default periodchooser parameter -->              
          <xsl:if test="not(grid:Editor/@type) and $typeName='DATE'">
            <grid:Param name="useSimpleXPath" value="true"/>
            <grid:Param name="autoPopup" value="true"/>
            <grid:Param name="suppressButtons" value="true"/>
            <grid:Param name="showClearButton" value="false"/>
          </xsl:if>

          <!-- set default suggestInput parameter -->              
          <xsl:if test="grid:Editor/@type='bcduiSuggestInput'">
            <grid:Param name="isSync" value="true"/>
          </xsl:if>

          <!-- set default numeric input parameter -->              
          <xsl:if test="not(grid:Editor/@type) and $isNumeric">
            <grid:Param name="type" value="numeric"/>
          </xsl:if>

          <!-- take over wrs display-size as maxlength if not provided as param and not using an optionsModelXPath (dropdown)-->
          <xsl:if test="$displaySize and (not(grid:Editor/grid:Param) or not(grid:Editor/grid:Param[@name='maxlength'] or grid:Editor/grid:Param[@name='optionsModelXPath']))">
            <grid:Param name="maxlength" value="{$displaySize}"/>
          </xsl:if>

          <!-- use wrs references as optionsmodel for singleSelect/simpleDropDown with no optionsModelXPath given -->
          <xsl:if test="((grid:Editor/@type='bcduiSimpleDropDown' or grid:Editor/@type='bcduiSingleSelect') and (not(grid:Param) or grid:Editor/grid:Param[@name != 'optionsModelXPath'])) or $wrsC/wrs:References/wrs:Wrs/wrs:Data/wrs:R">
            <xsl:if test="$wrsC/wrs:References/wrs:Wrs/wrs:Data/wrs:R">
              <grid:Param name="optionsModelXPath" value="${$gridModelId}/*/wrs:Header/wrs:Columns/wrs:C[@id='{$bRef}']/wrs:References/wrs:Wrs/wrs:Data/wrs:R/wrs:C[1]"/>
              <grid:Param name="optionsModelRelativeValueXPath" value="../wrs:C[2]"/>
            </xsl:if>
          </xsl:if>
        </grid:Editor>

        <grid:Renderer>
          <xsl:attribute name="type">
            <xsl:choose>
              <xsl:when test="grid:Renderer/@type"><xsl:value-of select="grid:Renderer/@type"/></xsl:when>
              <xsl:when test="grid:Editor[@type='bcduiStatusModelEditor']">bcduiStatusModelRenderer</xsl:when>
              <xsl:when test="grid:Editor[@type='bcduiModelDropDown']">bcduiModelDropDownRenderer</xsl:when>
              <xsl:when test="boolean((@isReadOnly|$wrsC/@isReadOnly)='true')"><xsl:value-of select="'Handsontable.renderers.TextRenderer'"/></xsl:when> <!-- render read-only cells in standard text mode for now -->
              <xsl:when test="$typeName='DATE'"><xsl:value-of select="'Handsontable.renderers.DateRenderer'"/></xsl:when>
              <xsl:when test="$isNumeric"><xsl:value-of select="'Handsontable.renderers.NumericRenderer'"/></xsl:when>
              <xsl:otherwise><xsl:value-of select="'Handsontable.renderers.TextRenderer'"/></xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:attribute name="gotReferences">
            <xsl:value-of select="boolean(grid:Editor/grid:Param[@name='optionsModelXPath'] or $wrsC/wrs:References/wrs:Wrs/wrs:Data/wrs:R)"/>
          </xsl:attribute>
          <xsl:copy-of select="grid:Renderer/grid:Param"/>
        </grid:Renderer>

        <grid:Validator>
          <xsl:attribute name="type">
            <xsl:choose>
              <xsl:when test="grid:Validator/@type"><xsl:value-of select="grid:Validator/@type"/></xsl:when>
              <xsl:otherwise></xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:copy-of select="grid:Validator/grid:Param"/>
        </grid:Validator>

      </wrq:C>
  </xsl:template>
</xsl:stylesheet>