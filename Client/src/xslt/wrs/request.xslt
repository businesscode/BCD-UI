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
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <!--
    This template gets a binding set/group name and a list of dimensions and measures and builds a generic WrsRequest -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="guiStatus" select="/*[1=0]"/>
  <xsl:param name="paramModel" select="$guiStatus"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>

  <xsl:variable name="paramSet" select="$paramModel//xp:Request[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!--
   -->
  <xsl:param name="dimensions" select="$paramSet/xp:Dimensions/xp:Dim"/>
  <xsl:param name="measures" select="$paramSet/xp:Measures/xp:Meas"/>
  <xsl:param name="bindingSet" select="$paramSet/xp:BindingSet"/>

  <xsl:template match="/">
    <wrq:WrsRequest>
      <wrq:Select>
        <wrq:Columns>
          <xsl:for-each select="$dimensions">
            <wrq:C bRef="{.}"/>
          </xsl:for-each>
          <xsl:for-each select="$measures">
            <wrq:C bRef="{.}"/>
          </xsl:for-each>
        </wrq:Columns>
        <wrq:From><wrq:BindingSet><xsl:value-of select="$bindingSet"/></wrq:BindingSet></wrq:From>
        <xsl:copy-of select="$guiStatus//f:Filter"/>
        <wrq:Grouping>
          <xsl:for-each select="$dimensions">
            <wrq:C bRef="{.}"/>
          </xsl:for-each>
        </wrq:Grouping>
        <wrq:Ordering>
          <xsl:for-each select="$dimensions">
            <wrq:C bRef="{.}"/>
          </xsl:for-each>
        </wrq:Ordering>
      </wrq:Select>
    </wrq:WrsRequest>
  </xsl:template>

</xsl:stylesheet>