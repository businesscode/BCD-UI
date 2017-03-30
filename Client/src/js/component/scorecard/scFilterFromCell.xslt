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
  Adds scorecard specific logic to filterFromCell.xslt
  I.e. the knowledge where DetailData(Defaults) nodes are defined
 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0">

  <xsl:import href="../../../xslt/renderer/filterFromCell.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Use scope to externally control sets of export, for example to provide 2 different exports in context menu for an item via "chainParameters: { scope: 'myScope2' }" -->
  <xsl:param name="kpiId"/>
  <xsl:param name="scope"         select="''"/>
  <xsl:param name="sccDefinition" select="/*[1=0]"/>

  <!-- Overwrite xsl:params in filterFromCell.xslt -->
  <xsl:param name="detailData"         select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$kpiId]/dm:DetailData[not(@scope) or @scope=$scope][1]"/>
  <xsl:param name="detailDataDefaults" select="$sccDefinition/*/scc:Kpis/dm:DetailDataDefaults/dm:DetailData[(not(@name) or @name=$detailData/@defaults) and (not(@scope)  or @scope=$scope)][1]"/>

</xsl:stylesheet>