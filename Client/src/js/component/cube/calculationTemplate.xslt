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
  Template for generated cube calculations
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <xsl:output method="xml" encoding="UTF-8" version="1.0" indent="no"/>

  <xsl:param name="paramModel"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="doc" select="/"/>
  <xsl:variable name="lastRowDim" select="$paramModel//xp:CubeCalculation/@lastRowDim"/>
  <xsl:variable name="lastRowDimPos" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$lastRowDim]/@pos)"/>
  <xsl:variable name="dimensionLevels" select="$paramModel/*/cube:Layout/cube:Dimensions//@bRef"/>
  <xsl:variable name="dimensionLevelsPos" select="/*/wrs:Header/wrs:Columns/wrs:C[@id=$dimensionLevels]/@pos"/>
  <xsl:variable name="countDimensionLevels" select="count($paramModel/*/cube:Layout/cube:Dimensions//@bRef)"/>

  <generator:Keys/>

  <xsl:template match="/">
    <wrs:Wrs>
      <xsl:apply-templates select="/*/*"/>

      <!--
        for later (sub)total lookup we create a helper area holding the total information
        since it might not survive the calculation, i.e. when a measure uses totals of measures which are not part of the cube
       -->

      <xsl:if test="$paramModel/*/cube:Layout//calc:ValueRef[starts-with(@idRef, '&#xE0F0;1') or starts-with(@idRef, '&#xE0F0;2')]">
        <TotalHelper>
          <xsl:copy-of select="/*/wrs:Header"/>
          <wrs:Data>
            <xsl:copy-of select="/*/wrs:Data/wrs:R[(wrs:C[position()=$lastRowDimPos and @bcdGr='1'] or wrs:C[position()=1 and @bcdGr='1'])]"/>
          </wrs:Data>
        </TotalHelper>
     </xsl:if>

    </wrs:Wrs>
  </xsl:template>

  <!-- wrs:Header/wrs:Columns -->
  <xsl:template match="/*/wrs:Header/wrs:Columns">
    <xsl:copy>
      <xsl:copy-of select="@*"/>

      <!-- Dimensions -->
      <xsl:copy-of select="/*/wrs:Header/wrs:Columns/wrs:C[@id=$dimensionLevels]"/>

      <!-- (Calculated) measures -->
      <xsl:apply-templates select="$paramModel/*/cube:Layout/cube:Measures/*/*" mode="generateHeader"/>

    </xsl:copy>
  </xsl:template>

  <!-- Header for calculated measures -->
  <xsl:template match="dm:Measure" mode="generateHeader">
    <wrs:C pos="{$countDimensionLevels + position()}" id="{@id}" caption="{@caption}" valueId="{@id}">
      <xsl:copy-of select="calc:Calc/@type-name"/>
      <xsl:copy-of select="calc:Calc/@scale"/>
      <xsl:copy-of select="calc:Calc/@unit"/>
      <xsl:if test="@userDefined='true'"><xsl:attribute name="bcdVmeas"><xsl:value-of select="@id"/></xsl:attribute></xsl:if>
      <!-- Special handling for ratios and %, keep the denominator as an attribute for later calculations. Due to a possible calc:Niz node you need to check on // -->
      <xsl:if test="count(calc:Calc//calc:Div/calc:*)=2">
        <wrs:A name="denominator" caption="Denominator"/>
      </xsl:if>
    </wrs:C>
  </xsl:template>

  <!-- Header for plain measures -->
  <xsl:template match="dm:MeasureRef" mode="generateHeader">
    <wrs:C>
      <xsl:copy-of select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@bRef]/@*"/>
      <xsl:attribute name="pos"><xsl:value-of select="$countDimensionLevels + position()"/></xsl:attribute>
    </wrs:C>
  </xsl:template>

  <!-- Each wrs:R gets a wrs:R in the output but with different content -->
  <xsl:template match="wrs:R">
    <xsl:variable  name="row" select="."/>
    <wrs:R>
      <xsl:copy-of select="@*"/>

      <!-- Dimensions -->
      <xsl:apply-templates select="wrs:C[position()=$dimensionLevelsPos]"/>

      <!-- Output Measures -->
      <xsl:call-template name="measureColumns"/>

    </wrs:R>
  </xsl:template>

  <xsl:template name="measureColumns">
    <xsl:variable name="row" select="."/>
        <generator:variableCurrRowGroup/>
    <generator:MeasureColumns/>
  </xsl:template>

  <!-- Per default, copy everything 1:1  -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>