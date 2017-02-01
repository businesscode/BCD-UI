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
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:template match="@*|node()"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:template>
  <xsl:template match="@*|node()" mode="defintion"><xsl:copy><xsl:apply-templates select="@*|node()" mode="defintion"/></xsl:copy></xsl:template>

  <!--
    rebuild cube configuration
    purpose of this stylesheet is to replace measures with server sided calcs with measurerefs (layout) and valuerefs (definition)
    and create a new measure definition for replaced measurerefs (layout) entries
  -->

  <xsl:template match="/">

    <cube:CubeConfiguration>

      <!-- copy everything but Measures and apply wrq replacement -->
      <xsl:apply-templates select="/cube:CubeConfiguration/*[not(name()='dm:Measures')]"></xsl:apply-templates>

      <!--
        build up Measures by simply copying all existing ones and adding a new measure for each (first) wrq element
        the first wrq part inside a measure is a wrq:* object within a calc:Calc where its parent is not a wrq element.
      -->
      <dm:Measures>
        <xsl:copy><xsl:apply-templates select="/cube:CubeConfiguration/dm:Measures/*" mode="defintion"/></xsl:copy>
        <xsl:apply-templates select="/*/cube:Layout//wrq:*[not(parent::wrq:*) and ancestor::calc:Calc]" mode="generate"/>
      </dm:Measures>

   </cube:CubeConfiguration>

  </xsl:template>

  <!--
    replace wrq elemens with a generated value refs
    this is within layout only
   -->
  <xsl:template match="wrq:*[not(parent::wrq:*) and ancestor::calc:Calc]">
    <xsl:variable name="id" select="ancestor::dm:Measure/@id"/>
    <xsl:variable name="cnt"><xsl:number/></xsl:variable>
    <dm:MeasureRef idRef="bcd_{$id}_{$cnt}"></dm:MeasureRef>
  </xsl:template>

  <!--
    replace wrq elemens with a generated value refs within defintion
    in this case we write a valueref since we're insinde atomic measures
   -->

  <xsl:template match="wrq:*[not(parent::wrq:*) and ancestor::calc:Calc]" mode="defintion">
    <xsl:variable name="id" select="ancestor::dm:Measure/@id"/>
    <xsl:variable name="cnt"><xsl:number/></xsl:variable>
    <calc:ValueRef idRef="bcd_{$id}_{$cnt}">
      <wrq:Calc>
        <xsl:copy><xsl:apply-templates select="@*|node()" mode="defintion"/></xsl:copy>
      </wrq:Calc>
    </calc:ValueRef>
  </xsl:template>

  <!--  generate measures for replaced wrq elements -->
  <xsl:template match="*" mode="generate">

    <xsl:variable name="id" select="ancestor::dm:Measure/@id"/>
    <xsl:variable name="caption" select="ancestor::dm:Measure/@caption"/>
    <xsl:variable name="cnt"><xsl:number/></xsl:variable>

    <!-- create new measure, take over calc attributes from outer calc and insert aggregator -->
    <dm:Measure id="bcd_{$id}_{$cnt}" caption="{$caption}">
      <wrq:Calc>
        <xsl:copy-of select="ancestor::calc:Calc/@*"/>
        <xsl:copy-of select="."/>
      </wrq:Calc>
    </dm:Measure>
  </xsl:template>

</xsl:stylesheet>