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
  A) Does prepend one column where category type or mark the kpi cell (depends on @asKpiAttributes). 
  Categories group KPIs. /*/scc:Layout/scc:CategoryTypeRefs/ does say which category types are to be shown
  The category types are assigned to KPIs in /scc:Kpis/scc:Kpi/scc:Categories, where each attribute name is a type and its value is the value
  /*/scc:CategoryTypes holds the definitions
  B) Does turn /scc:Layout/@parentKpiType="typename" into wrs:C/@parentId at the bcd_kpi_id column
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

  <xsl:import href="../../../xslt/stringUtil.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set']= function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sccDefinition"/>
  <xsl:param name="bcdI18nModel" select="/*[0=1]"/>

  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos" />

  <xsl:variable name="colCategories" select="$sccDefinition/*/scc:Layout/scc:Dimensions/scc:Columns/scc:LevelKpi"/>
  <xsl:variable name="colKpiPos" select="count($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Columns/scc:LevelKpi/preceding-sibling::dm:LevelRef) + 1"/>

  <xsl:variable name="categoryColTypes"      select="$sccDefinition/*/scc:Layout/scc:CategoryTypeRefs/*[not(@asKpiAttribute='true')]"/>
  <xsl:variable name="categoryColTypeCount"  select="count($categoryColTypes)"/>
  <xsl:variable name="categoryAttrTypes"     select="$sccDefinition/*/scc:Layout/scc:CategoryTypeRefs/*[@asKpiAttribute='true']"/>
  <xsl:variable name="categoryAttrTypeCount" select="count($categoryAttrTypes)"/>
  
  <xsl:variable name="formatPos" select="translate(string(count(/*/wrs:Header/wrs:Columns/wrs:C)), '0123456789', '0000000000')"/>
  <xsl:variable name="formatCat" select="translate(string(count($categoryColTypes)), '0123456789', '0000000000')"/>

  <xsl:variable name="categoryTypeElements" select="$sccDefinition/*/scc:CategoryTypes/scc:CategoryType"/>

  <xsl:variable name="kpiIdColumnId">bcd_kpi_id</xsl:variable>
  <xsl:variable name="kpiIdColumnIndex" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@id = $kpiIdColumnId]/@pos)"/>

  <!-- Optionally we also want to define a parent-kpi hierarchy -->
  <xsl:variable name="parentKpiType" select="$sccDefinition/*/scc:Layout/scc:KpiRefs/@parentKpiType"/>

  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="($categoryColTypeCount = 0 and $categoryAttrTypeCount = 0) or not($categoryTypeElements) or (not($kpiIdColumnIndex) and not($colCategories))">
        <xsl:copy-of select="*"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns">

      <xsl:choose>

        <!-- kpi and category as column dimension -->
        <xsl:when test="$colCategories">
        
          <wrs:Columns>
            <xsl:copy-of select="@*"/>

            <!-- update @colDimLevelIds if available, add pipe delimited categories in front of kpi part -->
            <xsl:if test="@colDimLevelIds">
              <xsl:variable name="colDimLevelIdsStr">
                <xsl:call-template name="tokenize">
                  <xsl:with-param name="string" select="@colDimLevelIds" />
                  <xsl:with-param name="delimiter" select="'|'" />
                </xsl:call-template>
              </xsl:variable>
              <xsl:variable name="colDimLevelIdsTokens" select="exslt:node-set($colDimLevelIdsStr)" />
              <xsl:attribute name="colDimLevelIds">
                <xsl:for-each select="$colDimLevelIdsTokens/wrs:Wrs/wrs:Data/wrs:R">
                  <xsl:if test="position() &gt; 1">|</xsl:if>
                  <xsl:if test="position() = $colKpiPos">
                    <xsl:for-each select="$categoryColTypes">
                      <xsl:value-of select="concat('bcdCategory_', @idRef, '|')"/>
                    </xsl:for-each>
                  </xsl:if>
                  <xsl:value-of select="wrs:C"/>
                </xsl:for-each>
              </xsl:attribute>
            </xsl:if>

            <!-- update @colDimLevelCaptions if available, add pipe delimited categories in front of kpi part -->
            <xsl:if test="@colDimLevelCaptions">
              <xsl:variable name="colDimLevelCaptionsStr">
                <xsl:call-template name="tokenize">
                  <xsl:with-param name="string" select="@colDimLevelCaptions" />
                  <xsl:with-param name="delimiter" select="'|'" />
                </xsl:call-template>
              </xsl:variable>
              <xsl:variable name="colDimLevelCaptionsTokens" select="exslt:node-set($colDimLevelCaptionsStr)" />
              <xsl:attribute name="colDimLevelCaptions">
                <xsl:for-each select="$colDimLevelCaptionsTokens/wrs:Wrs/wrs:Data/wrs:R">
                  <xsl:if test="position() &gt; 1">|</xsl:if>
                  <xsl:if test="position() = $colKpiPos">
                    <xsl:for-each select="$categoryColTypes">
                      <xsl:value-of select="concat('Category_', @idRef, '|')"/>
                    </xsl:for-each>
                  </xsl:if>
                  <xsl:value-of select="wrs:C"/>
                </xsl:for-each>
              </xsl:attribute>
            </xsl:if>

            <!-- update each header column (if it belongs to a kpi) with pipe-delimited category information in front of kpi -->
            <xsl:for-each select="wrs:C">
            
              <xsl:variable name="pos" select="position()"/>

              <!-- split up id attribute and find belonging kpi  -->
              <xsl:variable name="idStr">
                <xsl:call-template name="tokenize">
                  <xsl:with-param name="string" select="@id" />
                  <xsl:with-param name="delimiter" select="'|'" />
                </xsl:call-template>
              </xsl:variable>
              <xsl:variable name="idTokens" select="exslt:node-set($idStr)" />

              <xsl:variable name="kpiId" select="$idTokens/wrs:Wrs/wrs:Data/wrs:R[$colKpiPos]/wrs:C"/>
              <xsl:variable name="kpiElement" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id = $kpiId]"/>

              <wrs:C>
                <xsl:apply-templates select="@*"/>

                <xsl:if test="$kpiElement">
                
                  <!-- update id -->
                  <xsl:attribute name="id">
                    <xsl:for-each select="$idTokens/wrs:Wrs/wrs:Data/wrs:R">
                      <xsl:if test="position() &gt; 1">|</xsl:if>
                      <xsl:if test="position() = $colKpiPos">
                        <xsl:for-each select="$categoryColTypes">
                          <xsl:variable name="categoryType" select="@idRef"/>
                          <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
                          <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
                          <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
                          <xsl:value-of select="concat($categoryValueElement/@id, '|')"/>
                        </xsl:for-each>
                      </xsl:if>
                      <xsl:value-of select="."/>
                    </xsl:for-each>
                  </xsl:attribute>

                  <!-- update caption -->
                  <xsl:variable name="captionStr">
                    <xsl:call-template name="tokenize">
                      <xsl:with-param name="string" select="@caption" />
                      <xsl:with-param name="delimiter" select="'|'" />
                    </xsl:call-template>
                  </xsl:variable>
                  <xsl:variable name="captionTokens" select="exslt:node-set($captionStr)" />
                  <xsl:attribute name="caption">
                    <xsl:for-each select="$captionTokens/wrs:Wrs/wrs:Data/wrs:R">
                      <xsl:if test="position() &gt; 1">|</xsl:if>
                      <xsl:if test="position() = $colKpiPos">
                        <xsl:for-each select="$categoryColTypes">
                          <xsl:variable name="categoryType" select="@idRef"/>
                          <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
                          <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
                          <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
                          <xsl:value-of select="concat($categoryValueElement/@id, '|')"/>
                        </xsl:for-each>
                      </xsl:if>
                      <xsl:value-of select="."/>
                    </xsl:for-each>
                  </xsl:attribute>
                  
                  <!-- build up a category order attribute for later sorting -->
                  <xsl:attribute name="catOrder">

                    <!-- order is a pipe delimited numeric sequence or the form PRE|CAT|POS
                         where PRE is an ordering number for dimensions before the KPI, CAT (one or more) category ordering values
                         and finally followed by the original KPI position POS
                     -->
                    <xsl:variable name="preId">
                      <xsl:for-each select="$idTokens/wrs:Wrs/wrs:Data/wrs:R[position() &lt; $colKpiPos]">
                        <xsl:value-of select="concat(., '|')"/>
                      </xsl:for-each>
                    </xsl:variable>
                    <xsl:variable name="lastIdStr">
                      <xsl:choose>
                        <xsl:when test="$pos=1"></xsl:when>
                        <xsl:otherwise>
                          <xsl:call-template name="tokenize">
                            <xsl:with-param name="string" select="/*/wrs:Header/wrs:Columns/wrs:C[position()=$pos - 1]/@id" />
                            <xsl:with-param name="delimiter" select="'|'" />
                          </xsl:call-template>
                        </xsl:otherwise>
                      </xsl:choose>
                    </xsl:variable>
                    <xsl:variable name="lastIdTokens" select="exslt:node-set($lastIdStr)" />
                    <xsl:variable name="lastPreId">
                      <xsl:for-each select="$lastIdTokens/wrs:Wrs/wrs:Data/wrs:R[position() &lt; $colKpiPos]">
                        <xsl:value-of select="concat(., '|')"/>
                      </xsl:for-each>
                    </xsl:variable>
                    <xsl:variable name="pre">
                      <xsl:choose>
                        <xsl:when test="$preId!=$lastPreId"><xsl:value-of select="format-number(@pos, $formatPos)"/></xsl:when>
                        <xsl:otherwise><xsl:value-of select="format-number(/*/wrs:Header/wrs:Columns/wrs:C[starts-with(@id, $lastPreId)]/@pos, $formatPos)"/></xsl:otherwise>
                      </xsl:choose>
                    </xsl:variable>

                    <xsl:value-of select="concat($pre, '|')"/>
                    <xsl:for-each select="$categoryColTypes">
                      <xsl:if test="position() &gt; 1">|</xsl:if>
                      <xsl:variable name="categoryType" select="@idRef"/>
                      <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
                      <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
                      <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
                      <xsl:value-of select="format-number(count($categoryValueElement/preceding-sibling::*) + 1, $formatCat)"/>
                    </xsl:for-each>
                    <xsl:value-of select="concat('|', format-number(@pos, $formatPos))"/>
                  </xsl:attribute>
                </xsl:if>

                <xsl:apply-templates select="*"/>
              </wrs:C>
            </xsl:for-each>
          </wrs:Columns>
 
        </xsl:when>

        <xsl:otherwise>

          <!-- kpi and category as row dimension -->
          <xsl:copy>
            <xsl:apply-templates select="@*"/>
  
            <!-- All columns before KPI -->
            <xsl:copy-of select="wrs:C[@pos &lt; $kpiIdColumnIndex]"/>
      
            <!-- Add one column for each category type -->
            <xsl:for-each select="$categoryColTypes">
              <xsl:variable name="categoryType" select="@idRef"/>
              <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
              <wrs:C id="{$categoryType}" pos="{position() + $kpiIdColumnIndex - 1}" dimId="{concat('bcdCategory_',$categoryType)}">
                <xsl:attribute name="caption">
                  <xsl:choose>
                    <xsl:when test="$categoryTypeElement/@caption">
                      <xsl:value-of select="$categoryTypeElement/@caption"/>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:value-of select="$categoryType"/>
                    </xsl:otherwise>
                  </xsl:choose>
                </xsl:attribute>
              </wrs:C>
            </xsl:for-each>
      
            <!-- KPI + all other columns -->
            <xsl:for-each select="wrs:C[@pos &gt;= $kpiIdColumnIndex]">
              <xsl:copy>
                <xsl:apply-templates select="@*"/>
                <xsl:attribute name="pos"><xsl:value-of select="position() + $kpiIdColumnIndex - 1 + $categoryColTypeCount"/></xsl:attribute>
                <xsl:if test="$parentKpiType and @id='bcd_kpi_id'">
                  <wrs:A id="parentId" name="parentId" caption="{$bcdI18nModel/*/bcd_sc_ParentKpi}"/>
                </xsl:if>
                <xsl:apply-templates select="*"/>
              </xsl:copy>
            </xsl:for-each>
          </xsl:copy>
        </xsl:otherwise>
      </xsl:choose>
  </xsl:template>

  <xsl:template match="wrs:R">
    <xsl:variable name="kpiId" select="wrs:C[$kpiIdColumnIndex]"/>
    <xsl:variable name="kpiElement" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id = $kpiId]"/>
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      
      <xsl:choose>
        <!-- nothing to do for column categories -->
        <xsl:when test="$colCategories">
          <xsl:apply-templates select="node()"/>
        </xsl:when>
        <xsl:otherwise>
    
          <!-- All columns before KPI -->
          <xsl:copy-of select="wrs:C[position() &lt; $kpiIdColumnIndex]"/>
    
          <!-- Add one column for each category type -->
          <xsl:for-each select="$categoryColTypes">
            <xsl:variable name="categoryType" select="@idRef"/>
            <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
            <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
            <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
            <wrs:C id="{$categoryValueElement/@id}" order="{count($categoryValueElement/preceding-sibling::*) + 1}">
              <xsl:copy-of select="$categoryValueElement/@bcdTranslate"/>
              <xsl:choose>
                <xsl:when test="$categoryValueElement/@caption">
                  <xsl:value-of select="$categoryValueElement/@caption"/>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="$categoryValueElement/@id"/>
                </xsl:otherwise>
              </xsl:choose>
            </wrs:C>
          </xsl:for-each>
    
          <!-- KPI + all other columns -->
          <xsl:copy-of select="wrs:C[position() &gt;= $kpiIdColumnIndex]"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:copy>
  </xsl:template>


  <!-- 
    Add categories as  attributes and @parentId to bcd_kpi_id
    -->
  <xsl:template match="wrs:R/wrs:C[key('colHeadByPos', position())/@dimId='bcd_kpi_id']">
    <xsl:variable name="kpiElement" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id = current()]"/>
    <xsl:copy>
      <xsl:apply-templates select="@*"/>

      <xsl:if test="not($colCategories)">

        <!-- category attributes -->
        <xsl:for-each select="$categoryAttrTypes">
          <xsl:variable name="categoryType" select="@idRef"/>
          <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
          <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
          <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
          <xsl:attribute name="{$categoryType}"><xsl:value-of select="$categoryValueElement/@id"/></xsl:attribute>
        </xsl:for-each>

        <!-- parentKpi -->
        <xsl:variable name="parentKpi" select="$kpiElement/scc:ParentKpis/@*[name()=$parentKpiType]"/>
        <xsl:if test="$parentKpi">
          <xsl:attribute name="parentId"><xsl:value-of select="$parentKpi"/></xsl:attribute>
        </xsl:if>

      </xsl:if>

      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
