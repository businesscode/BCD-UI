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

        <xsl:choose>
          <xsl:when test="/*/cube:DistinctMeasures/@storedInRows='true'">
            <wrq:Columns>
              <xsl:copy-of select="/*/cube:DistinctMeasures/wrq:Columns/wrq:C[@dimId]"/>
              <xsl:for-each select="/*/cube:DistinctMeasures/wrq:Columns/wrq:C[not(@dimId)]">
                <wrq:C>
                  <xsl:copy-of select="@*[not(name()='aggr')]"/>
                  <xsl:variable name="aggr">
                    <xsl:choose>
                      <xsl:when test="@aggr='avg'">Avg</xsl:when>
                      <xsl:when test="@aggr='min'">Min</xsl:when>
                      <xsl:when test="@aggr='max'">Max</xsl:when>
                      <xsl:when test="@aggr='count'">Count</xsl:when>
                      <xsl:otherwise>Sum</xsl:otherwise>
                    </xsl:choose>
                  </xsl:variable>
                  <wrq:Calc>
                    <xsl:element namespace="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0" name="{$aggr}">
                      <wrq:Case>
                        <wrq:When>
                          <wrq:Eq>
                            <wrq:ValueRef idRef="bcd_measure_id"/>
                            <wrq:Value><xsl:value-of select="@bRef"/></wrq:Value>
                          </wrq:Eq>
                          <wrq:ValueRef idRef="bcd_measure_value"/>
                        </wrq:When>
                      </wrq:Case>
                    </xsl:element>
                  </wrq:Calc>
                </wrq:C>
              </xsl:for-each>
            </wrq:Columns>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy-of select="/*/cube:DistinctMeasures/wrq:Columns"/>
          </xsl:otherwise>
        </xsl:choose>

        <wrq:From>
          <xsl:copy-of select="/*/wrq:BindingSet"/>
        </wrq:From>

        <xsl:choose>
          <xsl:when test="/*/cube:DistinctMeasures/@storedInRows='true'">
            <f:Filter>
              <xsl:for-each select="$statusModel/*/f:Filter/*">
                <xsl:copy-of select="."/>
              </xsl:for-each>
              <f:Expression op="in" bRef="bcd_measure_id">
                <xsl:attribute name="value">
                  <xsl:for-each select="/*/cube:DistinctMeasures/wrq:Columns/wrq:C[not(@dimId)]/@bRef">
                    <xsl:sort select="."/>
                    <xsl:value-of select="."/><xsl:if test="position()!=last()">,</xsl:if>
                  </xsl:for-each>
                </xsl:attribute>
              </f:Expression>
            </f:Filter>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy-of select="$statusModel/*/f:Filter"/>
          </xsl:otherwise>
        </xsl:choose>

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
            <wrq:C>
              <xsl:attribute name="bRef">
                <xsl:choose>
                  <xsl:when test="@orderBRef">
                    <xsl:value-of select="@orderBRef"/>
                  </xsl:when>
                  <xsl:when test="@captionBRef">
                    <xsl:value-of select="@captionBRef"/>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="@bRef"/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:attribute>
              <xsl:if test="@sort='descending'">
                <xsl:attribute name="order">desc</xsl:attribute>
              </xsl:if>
            </wrq:C>
          </xsl:for-each>
        </wrq:Ordering>

        <wrq:Vdms>
          <xsl:for-each select="/*/cube:Layout/cube:Dimensions/*/dm:LevelRef[cube:VDM/cube:Map]">
            <wrq:Vdm bRef="{@bRef}">
              <xsl:for-each select="cube:VDM/cube:Map">
                <wrq:VdmMap to="{@to}" from="{@from}"/>
              </xsl:for-each>
            </wrq:Vdm>
          </xsl:for-each>
        </wrq:Vdms>

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