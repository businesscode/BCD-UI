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
<!-- Merges the various Scorecard refdata into one document
     TODO: Improve handling of recursion (Aspects using Aspects etc)
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xslTmp="http://www.w3.org/1999/XSL/Transform/webkitTemp"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="bcdContextPath"/>
  <xsl:param name="bcdAggregators" select="/*[1=0]"/>
  <xsl:param name="bcdAspects" select="/*[1=0]"/>
  <xsl:param name="statusModel" select="/*[1=0]"/>

  <!-- If we want the KPIs column-wise anyway and to be the inner most dim, we do not need to verticalize them before.
       Instead we treat them "measure-like" from a colDim's perspective -->
  <xsl:variable name="doVerticalizeKpis" select="not($configPrecalc/*/scc:Layout/scc:Dimensions/scc:Columns/*[position()=last() and self::scc:LevelKpi])"/>

  <!-- Pre-apply some global work on the given Layout  -->
  <xsl:variable name="configPrecalcString">
    <xsl:apply-templates select="/*" mode="configPrecalc"/>
  </xsl:variable>
  <xsl:variable name="configPrecalc" select="exslt:node-set($configPrecalcString)"/>

  <!-- Root -->
  <xsl:template match="/scc:ScorecardConfiguration">
    <scc:ScorecardConfiguration
      xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
      xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
      xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
      xmlns:sec="http://www.businesscode.de/schema/bcdui/subjectsettings-1.0.0"
      xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
      xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
      xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
      xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

      <xsl:apply-templates select="@*"/>

      <scc:Layout>
        <xsl:copy-of select="$configPrecalc/*/scc:Layout/@*"/>
        <xsl:apply-templates select="$configPrecalc/*/scc:Layout/*"/>
      </scc:Layout>

      <!-- We need the definitions (and data) from all Kpis referenced a) in scc:Layout or b) referenced in an Aspect using scc:KpiRef in its calculation, here we only want those KPI/@idRefs, where the KPI using it is itself in scc:Layout. -->
      <xsl:variable name="requiredKpiIds" select="$configPrecalc/*/scc:Layout/scc:KpiRefs/scc:KpiRef/@idRef | $configPrecalc/*/scc:Kpis/scc:Kpi[@id=$configPrecalc/*/scc:Layout/scc:KpiRefs/scc:KpiRef/@idRef]/scc:KpiRef[@name=$configPrecalc/*/scc:Aspects/scc:Aspect//calc:Calc//calc:KpiRef/@name]/@idRef"/>

      <scc:Kpis levelKpiCaption="KPI" aspectKpiCaption="Performance">
        <xsl:copy-of select="$configPrecalc/*/scc:Kpis/@*"/>
        <xsl:apply-templates select="$configPrecalc/*/scc:Kpis/scc:Kpi[@id=$requiredKpiIds]"/>
        <!-- We could merge defaults into Kpi-local DetailData, but that would quite a bit increase the document size with repeated values,
             plus it would only help us here and they are not scc specific
          -->
        <xsl:copy-of select="$configPrecalc/*/scc:Kpis/dm:DetailDataDefaults"/>
      </scc:Kpis>

      <scc:Aggregators>
        <xsl:copy-of select="*/scc:Aggregators/@*"/>
        <!-- Let only those definitions survive, which are actually needed -->
        <xsl:apply-templates select="$configPrecalc/*/scc:Aggregators/scc:Aggregator[@id=$configPrecalc/*/scc:Kpis/scc:Kpi[@id=$requiredKpiIds]/descendant-or-self::*/@aggr]"/>
      </scc:Aggregators>

      <scc:Aspects>
        <xsl:copy-of select="$configPrecalc/*/scc:Aspects/@*"/>
        <xsl:copy-of select="$configPrecalc/*/scc:Aspects/*"/>
      </scc:Aspects>

      <xsl:copy-of select="$configPrecalc/*/scc:CategoryTypes"/>

      <!-- Controlling xsltLib -->
      <xp:XSLTParameters>
        <xp:ColDims>
          <xp:Measures>
            <xp:AllDims>
              <xsl:choose>
                <!-- We treat the KPIs "measure-like" here if they become the innermost column dimension -->
                <xsl:when test="not($doVerticalizeKpis)">
                  <xsl:for-each select="$configPrecalc/*/scc:Layout/scc:KpiRefs/scc:KpiRef[@idRef = $configPrecalc/*/scc:Kpis/scc:Kpi/@id]">
                    <xsl:variable name="kpiId" select="@idRef"/>
                    <xsl:apply-templates select="$configPrecalc/*/scc:Layout/scc:AspectRefs/*" mode="xsltParameters">
                      <xsl:with-param name="kpiPrefix" select="concat($kpiId,'|')"/>
                    </xsl:apply-templates>
                  </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:apply-templates select="$configPrecalc/*/scc:Layout/scc:AspectRefs/*" mode="xsltParameters"/>
                </xsl:otherwise>
              </xsl:choose>
              </xp:AllDims>
          </xp:Measures>
          <xp:Dimensions>
            <xsl:apply-templates select="$configPrecalc/*/scc:Layout/scc:Dimensions/*" mode="xsltParameters"/>
          </xp:Dimensions>
        </xp:ColDims>
        
        <xp:RemoveEmptyCells apply="{/*/scc:Layout/@removeEmptyCells}">
          <!-- If an aspect has @removeEmptyRows=true, we add his valueId(s) here to ignoreValueIds -->
          <xsl:variable name="ignoreValueIds">
            <xsl:for-each select="$configPrecalc/*/scc:Aspects/scc:Aspect[@id=$configPrecalc/*/scc:Layout/scc:AspectRefs/scc:AspectRef/@idRef and @removeEmptyRows='true']/calc:Calc">
              <xsl:value-of select="concat(../@id,'.',@id,' ')"/>
            </xsl:for-each>
          </xsl:variable>
          <xsl:attribute name="ignoreValueIds"><xsl:value-of select="$ignoreValueIds"/></xsl:attribute>
        </xp:RemoveEmptyCells>
        
        <xsl:if test="$configPrecalc/*/scc:Layout/scc:AspectRefs/*[@sort!=''] or $configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember">

          <xsl:variable name="aspectId">
            <xsl:choose>
              <xsl:when test="$configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember/scc:AspectRef/@idRef='bcdKpi'">performance</xsl:when>
              <xsl:when test="$configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember/scc:AspectRef/@idRef"><xsl:value-of select="concat('asp_', $configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember/scc:AspectRef/@idRef, '.')"/></xsl:when>
              <xsl:when test="$configPrecalc/*/scc:Layout/scc:AspectRefs/scc:AspectRef[@sort!='']"><xsl:value-of select="concat('asp_', $configPrecalc/*/scc:Layout/scc:AspectRefs/scc:AspectRef[@sort!='']/@idRef, '.')"/></xsl:when>
              <xsl:otherwise>performance</xsl:otherwise>
            </xsl:choose>
          </xsl:variable>

          <xsl:variable name="direction">
            <xsl:choose>
              <xsl:when test="$configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember[scc:AspectRef]/@tb='top'">descending</xsl:when>
              <xsl:when test="$configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember[scc:AspectRef]/@tb='bottom'">ascending</xsl:when>
              <xsl:otherwise><xsl:value-of select="$configPrecalc/*/scc:Layout/scc:AspectRefs/*[@sort!='']/@sort"/></xsl:otherwise>
            </xsl:choose>
          </xsl:variable>

          <xp:OrderAndCut>
            <xp:RowsOrder>
              <xsl:if test="$configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember[scc:AspectRef]/@n">
                <xsl:attribute name="limit"><xsl:value-of select="$configPrecalc/*/scc:Layout/scc:TopNDimMembers/scc:TopNDimMember[scc:AspectRef]/@n"/></xsl:attribute>
              </xsl:if>
              <wrs:Columns>
                <xsl:for-each select="$configPrecalc/*/scc:Layout/scc:Dimensions/*/scc:LevelKpi/preceding-sibling::dm:LevelRef">
                  <wrs:C id="{@bRef}" sort="{@sort}" total="{@total}"/>
                </xsl:for-each>
                <wrs:C id="bcd_kpi_id" sort="ascending"/>
                <xsl:for-each select="$configPrecalc/*/scc:Layout/scc:Dimensions/*/scc:LevelKpi/following-sibling::dm:LevelRef">
                  <wrs:C id="{@bRef}" sort="{$direction}" total="{@total}" sortBy="{$aspectId}"/>
                </xsl:for-each>
              </wrs:Columns>
            </xp:RowsOrder>
          </xp:OrderAndCut>
        </xsl:if>
        
      </xp:XSLTParameters>

      <!--  XSLT parameters for scorecard-only stylesheets -->
      <scc:Internal>
        <!-- We only need to aggrs as input to AspectAllCalcs if they refer to them -->
        <scc:KpiAllCalcs dropAggrs="{not($configPrecalc/*/scc:Aspects/scc:Aspect/calc:*)}"/>
        <scc:AspectAllCalcs dropAggrs="{not($configPrecalc/*/scc:Aspects/scc:Aspect[*[@aggrNeeded='true']]/calc:*)}"/>
        <scc:VerticalizeKpis doVerticalize="{$doVerticalizeKpis}">
          <xp:RowsOrder>
            <wrs:Columns>  <!-- Columns are sorted by colDim and KPIs are sorted according to their KpiRef, not here -->
             <xsl:for-each select="$configPrecalc/*/scc:Layout/scc:Dimensions/scc:Rows/dm:LevelRef[@sort | @total]">
                <wrs:C id="{@bRef}">
                  <xsl:copy-of select="@sort | @total"/>
                </wrs:C>
              </xsl:for-each>
            </wrs:Columns>
          </xp:RowsOrder>
        </scc:VerticalizeKpis>
      </scc:Internal>

    </scc:ScorecardConfiguration>
  </xsl:template>

  <xsl:template match="dm:LevelRef">
    <dm:LevelRef>
      <xsl:copy-of select="@*"/>
      <!-- Optimization for verticalizeKpis -->
      <xsl:attribute name="posInWrsBeforeVerticalizeKpis"><xsl:value-of select="count(preceding::dm:LevelRef)+1"/></xsl:attribute>
    </dm:LevelRef>
  </xsl:template>

  <!-- Resolve calculations of KpiRef used in Kpi calculations  -->
  <xsl:template match="scc:KpiRef[ancestor::calc:Calc]">
    <xsl:comment> Resolved scc:KpiRef idRef='<xsl:value-of select="@idRef"/>' </xsl:comment>
    <xsl:apply-templates select="$configPrecalc/*/scc:Kpis/scc:Kpi[@id=current()/@idRef]/calc:Calc/*"/>
  </xsl:template>

  <!-- Translate idRefs of Measures to bRefs, because they became ordinary columns in the doc used by colDims -->
  <xsl:template match="scc:AspectRef" mode="xsltParameters">
    <xsl:param name="kpiPrefix" select="''"/>
    <xsl:variable name="aspectRef" select="."/>
    <xsl:variable name="measureIdAspPrefix" select="concat($kpiPrefix,'asp_',$aspectRef/@idRef | $aspectRef/@bRef)"/>
    <xsl:variable name="aspectCalcs" select="$configPrecalc/*/scc:Aspects/scc:Aspect[@id=$aspectRef/@idRef]/*[self::calc:Calc or self::scc:chooseCalc]"/>
    <xsl:choose>
      <xsl:when test="$aspectCalcs"> <!-- Aspect with calc -->
        <xsl:for-each select="$aspectCalcs">
          <xsl:element name="MeasureRef" namespace="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0">
            <!-- Maybe we have to append an asp property id -->
            <xsl:attribute name="bRef"><xsl:value-of select="concat($measureIdAspPrefix,substring(concat('.',@id),(1 div count($aspectCalcs))))"/></xsl:attribute>
          </xsl:element>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise> <!-- Aspect without calc (but with scc:WrqModifier / WrqBuilder) -->
        <xsl:element name="MeasureRef" namespace="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0">
          <xsl:attribute name="bRef"><xsl:value-of select="$measureIdAspPrefix"/></xsl:attribute>
        </xsl:element>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  <xsl:template match="scc:AspectKpi" mode="xsltParameters">
    <xsl:param name="kpiPrefix" select="''"/>
    <dm:MeasureRef bRef="{concat($kpiPrefix,'performance')}"/>
  </xsl:template>
  <xsl:template match="scc:LevelKpi" mode="xsltParameters">
    <xsl:if test="$doVerticalizeKpis">
      <dm:LevelRef bRef="bcd_kpi_id">
        <xsl:copy-of select="@sort | @total"/>
      </dm:LevelRef>
    </xsl:if>
  </xsl:template>
  <!-- Per default, copy everything 1:1 but into xp namespace -->
  <xsl:template match="scc:Columns | scc:Rows" mode="xsltParameters">
    <xsl:element name="{local-name()}" namespace="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">
      <xsl:apply-templates select="node()|@*" mode="xsltParameters"/>
    </xsl:element>
  </xsl:template>
  <xsl:template match="node()|@*" mode="xsltParameters">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" mode="xsltParameters"/>
    </xsl:copy>
  </xsl:template>
  
  <!-- remove sort/sortBy if we got a aspect sorting -->
  <xsl:template match="dm:LevelRef" mode="xsltParameters">
    <xsl:choose>
      <xsl:when test="$configPrecalc/*/scc:Layout/scc:AspectRefs/scc:*[@sort!='']">
        <xsl:copy><xsl:apply-templates select="node()|@*[name()!='sort' and name()!='sortBy']" mode="xsltParameters"/></xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy><xsl:apply-templates select="node()|@*" mode="xsltParameters"/></xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Per default, copy everything one:one  -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>


  <!-- 
    Resolve built-in Aspects, Aggregators and KPI validAt restrictions, we need this in the next step
   -->
  <xsl:template match="/scc:ScorecardConfiguration" mode="configPrecalc">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates select="scc:Layout" mode="configPrecalc"/>
      <xsl:apply-templates select="scc:Kpis" mode="configPrecalc"/>
      <xsl:copy-of select="scc:CategoryTypes"/>
      <scc:Aspects>
        <xsl:copy-of select="/*/scc:Aspects/@*"/>
  
        <!-- User defined aspects, including handling of those, using bcdAspectDefaultWrqBuilder -->
        <xsl:apply-templates select="/*/scc:Aspects/scc:Aspect" mode="configPrecalc"/>
  
        <!-- Import definitions for used bcdui-well-known aspects (in AspectRef or in a user Aspect), we simply take all then. But wel allow overwriting them with an aspect of the same id by the user -->
        <xsl:if test="/*/scc:Layout/scc:AspectRefs//scc:AspectRef[starts-with(@idRef,'bcd')] or /*/scc:Aspects/scc:Aspect//calc:AspectRef[starts-with(@idRef,'asp_bcd')]">
          <xsl:apply-templates select="$bcdAspects/*/scc:Aspect[@id!='bcdAspectDefaultWrqBuilder']"  mode="configPrecalc"/>
        </xsl:if>
      </scc:Aspects>
      <scc:Aggregators>
        <xsl:copy-of select="/*/scc:Aggregators/@*"/>
  
        <!-- Take over user defined aggrs, also resolve those with scc:BcdAggregator -->
        <xsl:apply-templates select="/*/scc:Aggregators/scc:Aggregator" mode="configPrecalc"/>
  
        <!-- Copy over definitions for all referenced bcdui-well-known aggregators, they contain scc:BcdAggregator-->
        <xsl:variable name="allAggrs">
          <xsl:for-each select="/*/scc:Kpis/scc:Kpi//@aggr"><xsl:value-of select="concat(' ',.,' ')"/></xsl:for-each>
        </xsl:variable>
        <xsl:apply-templates select="$bcdAggregators/*/scc:Aggregator[contains($allAggrs, concat(' ',@id,' '))]"  mode="configPrecalc"/>
      </scc:Aggregators>
    </xsl:copy>
  </xsl:template>

  <!-- 
    Because we embed for Webkit and Edge the parameters bcdAggregators and bcdAspects as text in the stylesheet,
    (BCD-UI-wide workaround as they don't understand nodes as parameters natively) 
    the nsmaspace of the aspects' aggregators' stylesheets were temporarely changed to xslTmp, we need to adjust they namespace here to xsl again.
    -->
  <xsl:template match="xslTmp:*" mode="configPrecalc">
    <xsl:element name="{local-name()}" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:apply-templates select="@*|node()" mode="configPrecalc"/>
    </xsl:element>
  </xsl:template>

  <!-- 
    Kpi defs and KpiRefs may have a @validFrom and @validTo, let's filter them accordingly
   -->
  <xsl:variable name="validAt" select="/*/@validAt"/>
  <xsl:template match="scc:Layout/scc:KpiRefs/scc:KpiRef" mode="configPrecalc">
    <xsl:if test="not($validAt &lt; @validFrom) and not($validAt &gt; @validUpTo) and @idRef=/*/scc:Kpis/scc:Kpi[not($validAt &lt; @validFrom) and not($validAt &gt; @validUpTo)]/@id">
      <xsl:copy>
        <xsl:apply-templates select="@*|node()" mode="configPrecalc"/>
      </xsl:copy>
    </xsl:if>
  </xsl:template>

  <xsl:template match="scc:Kpis/scc:Kpi" mode="configPrecalc">
    <xsl:if test="not($validAt &lt; @validFrom) and not($validAt &gt; @validUpTo)">
      <xsl:copy>
        <!-- Per default, we skip some Aspects if KPI does not look like an indicator KPI. @skipAspects can be overwritten by the user. -->
        <xsl:if test="count(calc:Calc/calc:Div/calc:ValueRef)!=2">
          <xsl:attribute name="skipAspects"> bcdFailure bcdFrequency </xsl:attribute>
        </xsl:if>
        <xsl:apply-templates select="@*|node()" mode="configPrecalc"/>
      </xsl:copy>
    </xsl:if>
  </xsl:template>

  <!-- 
    Here we take care for aggregators, which are base on bcdDefaultAggregator, may they be user defined or be wellknown
   -->
  <xsl:template match="scc:Aggregator[scc:BcdAggregator]" mode="configPrecalc">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="scc:BcdAggregator"/>
      <xsl:apply-templates select="$bcdAggregators/*/scc:Aggregator[@id='bcdDefaultAggregator']/*" mode="configPrecalc"/>
      <xsl:copy-of select="scc:PreCalc"/>
    </xsl:copy>
  </xsl:template>

  <!-- 
    Special handling for Aspects with scc:Aspect/scc:BcdAspectWrqBuilder
    Derives the scc:Aspect/calc:Calc expression from scc:BcdAspectWrqBuilder/scc:Property to prevent the user from having to learn the wired syntax in easy cases,
    Adds an include on /*/scc:Aspect[@id='bcdDefaultWrqBuilder']/* aspect from bcdAspects.xml
    -->
  <xsl:template match="scc:Aspect[scc:BcdAspectWrqBuilder]" mode="configPrecalc">
    <xsl:variable name="aspId" select="@id"/>
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:if test="not(calc:*)">
        <xsl:for-each select="scc:BcdAspectWrqBuilder/scc:Property">
          <calc:Calc id="{@bRef}">
            <xsl:copy-of select="@caption | @type-name | @scale | @unit"/>
            <calc:AspectRef idRef="{concat('asp_',$aspId,'_$.',@bRef)}"/>
          </calc:Calc>
        </xsl:for-each>
      </xsl:if>
      <xsl:copy-of select="scc:BcdAspectWrqBuilder"/>
      <xsl:apply-templates select="$bcdAspects/*/scc:Aspect[@id='bcdAspectDefaultWrqBuilder']/*" mode="configPrecalc"/>
    </xsl:copy>
  </xsl:template>

  <!-- scc:LevelPeriod will add a break down level on the period type found in statusModel -->
  <xsl:template match="scc:LevelPeriod" mode="configPrecalc">
    <xsl:variable name="levelPeriod" select="."/>
    <xsl:for-each select="$statusModel/*/f:Filter//f:Expression[$levelPeriod/@addYr='true' and (@bRef='yr' or @bRef='cwyr')]">
      <xsl:if test="not(preceding::f:Expression[@bRef=current()/@bRef and ancestor::f:Filter])">
        <dm:LevelRef bRef="{@bRef}" sort="descending"> <!-- descending is default -->
          <xsl:copy-of select="$levelPeriod/@*"/>
        </dm:LevelRef>
      </xsl:if>
    </xsl:for-each>
    <xsl:for-each select="$statusModel/*/f:Filter//f:Expression[@bRef='qr' or @bRef='mo' or @bRef='cw' or @bRef='dy'][1]"> <!-- dy can appear twice -->
      <xsl:if test="not(preceding::f:Expression[@bRef=current()/@bRef and ancestor::f:Filter])">
        <dm:LevelRef bRef="{@bRef}" sort="descending">
          <xsl:copy-of select="$levelPeriod/@*"/>
          <xsl:if test="contains($levelPeriod/@captionFor,@bRef)">
            <xsl:attribute name="captionBRef"><xsl:value-of select="concat(@bRef,'_caption')"/></xsl:attribute>
            <xsl:attribute name="sortBy"><xsl:value-of select="@bRef"/></xsl:attribute>
          </xsl:if>
        </dm:LevelRef>
      </xsl:if>
    </xsl:for-each>
  </xsl:template>


  <!-- Per default, copy everything one:one  -->
  <xsl:template match="@*|node()" mode="configPrecalc">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="configPrecalc"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>