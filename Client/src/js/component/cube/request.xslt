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
<!--  Takes the cube's configuration and build a Wrq from it -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" />

  <xsl:param name="statusModel" select="/*[1=0]"/>

  <xsl:template match="/*">

    <wrq:WrsRequest>
      <wrq:Select>

        <xsl:apply-templates select="/*/cube:Layout/cube:TopNDimMembers" mode="toWrqNs"/>

        <xsl:copy-of select="/*/cube:DistinctMeasures/wrq:Columns"/>
        <wrq:From>
          <xsl:copy-of select="/*/wrq:BindingSet"/>
        </wrq:From>

        <xsl:copy-of select="$statusModel/*/f:Filter"/>

        <wrq:Grouping>

          <!-- Distinct for row and column dimensions -->
          <xsl:for-each select="/*/cube:Layout/cube:Dimensions/*[self::cube:Rows or self::cube:Columns]">
            <wrq:GroupingSets>

              <!-- Lowest level is always there -->
              <wrq:Set>
                <xsl:for-each select="dm:LevelRef">
                  <wrq:C bRef="{@bRef}"/>
                  <xsl:if test="@captionBRef"><wrq:C bRef="{@captionBRef}"/></xsl:if>
                  <xsl:if test="@orderBRef"><wrq:C bRef="{@orderBRef}"/></xsl:if>
                </xsl:for-each>
              </wrq:Set>

              <!-- For each aggregate -->
              <xsl:for-each select="dm:LevelRef[@total]">
                <wrq:Set>
                  <xsl:for-each select="preceding-sibling::dm:LevelRef">
                    <wrq:C bRef="{@bRef}"/>
                    <xsl:if test="@captionBRef"><wrq:C bRef="{@captionBRef}"/></xsl:if>
                    <xsl:if test="@orderBRef"><wrq:C bRef="{@orderBRef}"/></xsl:if>
                  </xsl:for-each>
                </wrq:Set>
              </xsl:for-each>

            </wrq:GroupingSets>
          </xsl:for-each>

        </wrq:Grouping>

        <wrq:Ordering>
          <xsl:for-each select="/*/cube:Layout/cube:Dimensions/*[self::cube:Rows or self::cube:Columns]/dm:LevelRef">
            <!-- If a dimension has totals shown, move then to the right place -->
            <xsl:if test="@total">
              <wrq:C bRef="{@bRef}" aggr="GROUPING">
                <xsl:if test="@total='leading'">
                  <xsl:attribute name="order">desc</xsl:attribute>
                </xsl:if>
              </wrq:C>
            </xsl:if>
            <wrq:C bRef="{@orderBRef | @bRef[not(../@orderBRef)]}">
              <xsl:if test="@sort='descending'">
                <xsl:attribute name="order">desc</xsl:attribute>
              </xsl:if>
            </wrq:C>
          </xsl:for-each>
        </wrq:Ordering>

      </wrq:Select>
    </wrq:WrsRequest>

  </xsl:template>

  <!-- Most nodes are copied 1:1 but element nodes need to become wrq: because all expressions of top-n are fully evaluated server-side -->
  <xsl:template match="@*|node()" mode="toWrqNs">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="toWrqNs"/>
    </xsl:copy>
  </xsl:template>
  <xsl:template match="*" mode="toWrqNs">
    <xsl:element name="{local-name()}" namespace="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">
      <xsl:apply-templates select="@*|node()" mode="toWrqNs"/>
    </xsl:element>
  </xsl:template>
  <!-- For ValueRefs with Calc children, only their content survives (ValueRef itself and Calc are skipped) -->
  <xsl:template match="*[(local-name(.)='ValueRef' and local-name(child::*)='Calc') or (local-name()='Calc' and local-name(..)='ValueRef')]" mode="toWrqNs">
    <xsl:apply-templates select="node()" mode="toWrqNs"/>
  </xsl:template>
  <xsl:template match="dm:MeasureRef[@bRef]" mode="toWrqNs">
    <wrq:Measure bRef="{@bRef}"/>
  </xsl:template>

</xsl:stylesheet>