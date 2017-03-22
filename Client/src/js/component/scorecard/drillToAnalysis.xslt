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
  Just delivers the status model as created by $cellAndGuiStatusFilterDetailTranslated in filterFromCell.xslt
 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <!-- Creates filters from the cell position in the report (using bcdRow/ColIdent) in $cellFiltersNodeSet -->
  <xsl:import href="scFilterFromCell.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:variable name="kpiDef" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$cellFilter/*//f:Expression[@bRef='bcd_kpi_id']/@value]"/>

  <xsl:template match="/">
    <guiStatus:Status xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0">

      <xsl:copy-of select="$cellAndGuiStatusFilterDetailTranslated/guiStatus:Status/@*"/>
      <xsl:copy-of select="$cellAndGuiStatusFilterDetailTranslated/guiStatus:Status/*[not(name()='f:Filter')]"/>

      <f:Filter>
        <xsl:copy-of select="$cellAndGuiStatusFilterDetailTranslated/guiStatus:Status/f:Filter/*"/>
        <xsl:copy-of select="$detailDataDefaults/f:Filter[not($detailData/f:Filter)]/* | $detailData/f:Filter/*"/>
      </f:Filter>

      <!-- If dm:Translations has a @cubeId attribute, we even prepare a cube layout in addition to filters -->
      <xsl:if test="$translations/@cubeId">
        <cube:Layout cubeId="{$translations/@cubeId}">
          <cube:Dimensions>
            <cube:Rows>
              <xsl:if test="$filterModel//f:Expression[@bRef='qr'] and not($kpiDef//dm:FilterTranslation[contains(@toRangeWhen,'qr')])"><dm:LevelRef bRef="yr" sort="ascending" total="trailing"/><dm:LevelRef bRef="qr" sort="ascending" total="trailing"/></xsl:if>
              <xsl:if test="$filterModel//f:Expression[@bRef='mo'] and not($kpiDef//dm:FilterTranslation[contains(@toRangeWhen,'mo')])"><dm:LevelRef bRef="yr" sort="ascending" total="trailing"/><dm:LevelRef bRef="mo" sort="ascending" total="trailing"/></xsl:if>
              <xsl:if test="$filterModel//f:Expression[@bRef='cw'] and not($kpiDef//dm:FilterTranslation[contains(@toRangeWhen,'cw')])"><dm:LevelRef bRef="cwyr" sort="ascending" total="trailing"/><dm:LevelRef bRef="cw" sort="ascending" total="trailing"/></xsl:if>
              <xsl:if test="$filterModel//f:Expression[@bRef='dy']"><dm:LevelRef bRef="dy" sort="ascending" total="trailing"/></xsl:if>
            </cube:Rows>
          </cube:Dimensions>
          <cube:Measures>
            <cube:AllDims>
              <xsl:for-each select="$detailData/dm:Columns/wrq:C/@bRef">
                <dm:MeasureRef idRef="{.}"/>
              </xsl:for-each>
            </cube:AllDims>
          </cube:Measures>
        </cube:Layout>
      </xsl:if>
    </guiStatus:Status>
  </xsl:template>


</xsl:stylesheet>