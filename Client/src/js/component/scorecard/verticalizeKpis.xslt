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
  Takes the result of the scorecard calculation and optionally partly transposes it to make rows for each kpi
  Also sorts out which aspects to include in which order and transfers attribute AspectRefs to wrs:A
  Does the number formatting on attributes and the row sorting. Not column sorting by KPI, sorting by col-dims is done later on colDim.
  Input: Wrs
  Parameter: Scorecard definition
 -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  bcdxml:wrsHeaderIsEnough="true">

<xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt" />

<xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

<xsl:param name="sccDefinition" select="/*[1=0]"/>
<xsl:param name="paramSet" select="$sccDefinition/*/scc:Internal/scc:VerticalizeKpis"/>

<xsl:key name="colHeadById"   match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>

<xsl:variable name="doc" select="/*"/>
<xsl:variable name="sqlTypesDoc" select="document('../../../xslt/renderer/sqlTypes.xml')"/>
<xsl:variable name="doVerticalize" select="$paramSet/@doVerticalize='true'"/>

<xsl:template match="/*">

  <xsla:stylesheet version="1.0" xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
    xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
    xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
    xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
    xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

    <xsla:import href="../../../xslt/renderer/numberFormatting.xslt"/>

    <xsla:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

    <xsla:param name="sccDefinition" select="/*[1=0]"/>

    <xsla:key name="colHeadById"   match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
    <xsla:key name="aspectDefById" match="/*/scc:Aspects/scc:Aspect" use="@id"/>
    <xsla:key name="aspectRefByIdRef" match="/*/scc:Layout/scc:AspectRefs/scc:AspectRef" use="@idRef"/>
    <xsla:key name="kpiDefById"    match="/*/scc:Kpis/scc:Kpi" use="@id"/>
    <xsla:key name="aspectCalcsByAspId" match="/*/scc:Aspects/scc:Aspect/*[local-name(.)='Calc' or local-name(.)='chooseCalc']" use="../@id"/>

    <xsla:variable name="doc" select="/"/>
    <xsla:variable name="aspectRefs" select="$sccDefinition/*/scc:Layout/scc:AspectRefs"/>
    <xsla:variable name="kpiRefs"    select="$sccDefinition/*/scc:Layout/scc:KpiRefs/scc:KpiRef[@idRef = $sccDefinition/*/scc:Kpis/scc:Kpi/@id]"/>

    <!-- Root -->
    <xsla:template match="/">
      <wrs:Wrs>
        <xsla:apply-templates select="@*"/>
        <xsla:call-template name="header"/>
        <xsla:call-template name="data"/>
      </wrs:Wrs>
    </xsla:template>


    <!-- Generate wrs:Data section for do/nonVerticalize -->
    <xsl:choose>
      <xsl:when test="$doVerticalize">
        <!--
          Generate wrs:Data section and turn kpis into rows
          -->
        <xsla:template name="data">
          <wrs:Data>
            <xsla:apply-templates select="@*"/>
            <xsla:variable name="levelrefs" select="$sccDefinition/*/scc:Layout/scc:Dimensions//*[self::dm:LevelRef or self::scc:LevelKpi]"/>

            <!-- One row for each dimension member combination / kpi. KPIs in the order they appear as KpiRefs (not in the order of kpi def ) -->
            <xsla:for-each select="$kpiRefs">
              <xsla:variable name="kpiId" select="@idRef"/>
              <xsla:variable name="kpiDef" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$kpiId]"/>
              <xsla:variable name="kpiColPos">
                <xsla:for-each select="$doc">
                  <xsla:value-of select="key('colHeadById',concat('kpi_',$kpiId))/@pos"/>
                </xsla:for-each>
              </xsla:variable>

              <xsla:for-each select="$doc/*/wrs:Data/wrs:R">

                <xsl:call-template name="rowSorting"/>

                <xsla:variable name="allCols" select="wrs:C"/>
                <wrs:R id="R{{position()}}_{{$kpiId}}">

                  <!-- Start with the dimensions -->
                  <xsla:for-each select="$levelrefs">
                    <xsla:choose>
                      <xsla:when test="self::dm:LevelRef">
                        <xsla:variable name="p" select="number(@posInWrsBeforeVerticalizeKpis)"></xsla:variable>
                        <xsla:variable name="c" select="$allCols[ $p ]"></xsla:variable>
                        <wrs:C>
                          <xsla:copy-of  select="$c/@*"/>
                          <xsla:value-of select="$c"/>
                        </wrs:C>
                      </xsla:when>
                      <xsla:otherwise>
                        <wrs:C caption="{{$kpiDef/@caption}}">
                          <xsla:copy-of select="$kpiDef/@bcdTranslate"/>
                          <xsla:value-of select="$kpiId"/>
                        </wrs:C>
                      </xsla:otherwise>
                    </xsla:choose>
                  </xsla:for-each>

                  <xsla:call-template name="measureData">
                    <xsla:with-param name="kpiDef" select="$kpiDef"/>
                    <xsla:with-param name="kpiColPos" select="number($kpiColPos)"/>
                    <xsla:with-param name="allCols" select="$allCols"/>
                  </xsla:call-template>

                </wrs:R>
              </xsla:for-each>

            </xsla:for-each>

          </wrs:Data>
        </xsla:template>
      </xsl:when>

      <xsl:otherwise>
        <!--
          Generate wrs:Data section, do not kpis into rows
          -->
        <xsla:template name="data">
          <wrs:Data>
            <xsla:apply-templates select="@*"/>
            <xsla:variable name="levelrefs" select="$sccDefinition/*/scc:Layout/scc:Dimensions//dm:LevelRef"/>

            <xsla:for-each select="$doc/*/wrs:Data/wrs:R">

              <xsl:call-template name="rowSorting"/>

              <xsla:variable name="allCols" select="wrs:C"/>
              <wrs:R id="{{@id}}">

                <!-- Start with the dimensions -->
                <xsla:for-each select="$levelrefs">
                  <xsla:variable name="p" select="number(@posInWrsBeforeVerticalizeKpis)"/>
                  <xsla:variable name="c" select="$allCols[ $p ]"/>
                  <wrs:C>
                    <xsla:copy-of  select="$c/@*"/>
                    <xsla:value-of select="$c"/>
                  </wrs:C>
                </xsla:for-each>

                <!-- Within each row create values for each kpi. KPIs in the order they appear as KpiRefs (not in the order of kpi def ) -->
                <xsla:for-each select="$kpiRefs">
                  <xsla:variable name="kpiDef" select="key('kpiDefById',@idRef)"/>
                  <xsla:variable name="kpiColPos">
                    <xsla:for-each select="$doc">
                      <xsla:value-of select="key('colHeadById',concat('kpi_',$kpiDef/@id))/@pos"/>
                    </xsla:for-each>
                  </xsla:variable>

                  <xsla:call-template name="measureData">
                    <xsla:with-param name="kpiDef" select="$kpiDef"/>
                    <xsla:with-param name="kpiColPos" select="number($kpiColPos)"/>
                    <xsla:with-param name="allCols" select="$allCols"/>
                  </xsla:call-template>

                </xsla:for-each>

              </wrs:R>
            </xsla:for-each>

          </wrs:Data>
        </xsla:template>
      </xsl:otherwise>
    </xsl:choose>


    <!-- Generate wrs:Header section for do/nonVerticalize -->
    <xsl:choose>
      <xsl:when test="$doVerticalize">
        <!--
          Generate wrs:Header section and turn kpis into rows
          -->
        <xsla:template name="header">
          <wrs:Header>
            <xsla:apply-templates select="@*"/>

            <!-- Columns are kpi, dimensions, performance and one for each aspect or aspect calc -->
            <wrs:Columns>

              <!-- First dimension columns and the "KPI dimension" -->
              <xsla:for-each select="$sccDefinition/*/scc:Layout/scc:Dimensions//*[self::dm:LevelRef or self::scc:LevelKpi]">
                <xsla:choose>
                  <xsla:when test="self::dm:LevelRef">
                    <xsla:variable name="dimHead" select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@bRef]"/>
                    <wrs:C pos="{{position()}}" id="{{$dimHead/@id}}" caption="{{$dimHead/@caption}}" dimId="{{$dimHead/@id}}" type-name="{{$dimHead/@type-name}}">
                      <xsla:copy-of select="$dimHead/wrs:A"/>
                    </wrs:C>
                  </xsla:when>
                  <xsla:otherwise>
                    <wrs:C pos="{{position()}}" id="bcd_kpi_id"  dimId="bcd_kpi_id"
                           caption="{{concat(@caption,substring($sccDefinition/*/scc:Kpis/@levelKpiCaption,0,1 div boolean(@caption)))}}">
                      <wrs:A name="caption" id="bcd_kpi_id_caption"/>
                    </wrs:C>
                  </xsla:otherwise>
                </xsla:choose>
              </xsla:for-each>

              <xsla:call-template name="measureHeaders">
                <xsla:with-param name="countDims" select="count($sccDefinition/*/scc:Layout/scc:Dimensions//*[self::dm:LevelRef or self::scc:LevelKpi])"/>
                <xsla:with-param name="aspects"   select="$aspectRefs/scc:AspectRef | $aspectRefs/scc:AspectKpi"/>
              </xsla:call-template>

            </wrs:Columns>
          </wrs:Header>

        </xsla:template>
      </xsl:when>

      <xsl:otherwise>
        <!--
          Generate wrs:Header section and no not turn kpis into rows
          -->
        <xsla:template name="header">
          <wrs:Header>
            <xsla:apply-templates select="@*"/>

            <xsla:variable name="aspCount"  select="count($aspectRefs/scc:AspectRef | $aspectRefs/scc:AspectKpi)"/>

            <!-- Columns are kpi, dimensions, performance and one for each aspect or aspect calc -->
            <wrs:Columns>

              <!-- First dimension columns and the "KPI dimension" -->
              <xsla:for-each select="$sccDefinition/*/scc:Layout/scc:Dimensions//self::dm:LevelRef">
                <xsla:variable name="dimHead" select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@bRef]"/>
                <wrs:C pos="{{position()}}" id="{{$dimHead/@id}}" caption="{{$dimHead/@caption}}" dimId="{{$dimHead/@id}}" type-name="{{$dimHead/@type-name}}">
                  <xsla:copy-of select="$dimHead/wrs:A"/>
                </wrs:C>
              </xsla:for-each>

              <xsla:for-each select="$kpiRefs">
                <xsla:variable name="kpiId" select="@idRef"/>

                <xsla:call-template name="measureHeaders">
                  <xsla:with-param name="countDims" select="count($sccDefinition/*/scc:Layout/scc:Dimensions//self::dm:LevelRef)"/>
                  <xsla:with-param name="aspects"   select="$aspectRefs/scc:AspectRef | $aspectRefs/scc:AspectKpi"/>
                  <xsla:with-param name="kpiOffset" select="$aspCount*(position()-1)"/>
                  <xsla:with-param name="kpiDef"    select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$kpiId]"/>
                </xsla:call-template>
              </xsla:for-each>

            </wrs:Columns>
          </wrs:Header>

        </xsla:template>

      </xsl:otherwise>
    </xsl:choose>

    <!--
      Generate the header for the aspects (incl. KPIs), common for do- and no-Verticalize of KPIs
     -->
    <xsla:template name="measureHeaders">
      <xsla:param name="countDims"/>
      <xsla:param name="aspects"/>
      <xsla:param name="kpiOffset" select="number(0)"/>
      <xsla:param name="kpiDef" select="/*[1=0]"/>

      <!-- Only if KPIs are horizontally, in exactly that case we get kpiDef from the out loop -->
      <xsla:variable name="kpiCaptionPrefix">
        <xsla:if test="$kpiDef"><xsla:value-of select="concat($kpiDef/@caption,'|')"/></xsla:if>
      </xsla:variable>
      <xsla:variable name="kpiIdPrefix">
        <xsla:if test="$kpiDef"><xsla:value-of select="concat($kpiDef/@id,'|')"/></xsla:if>
      </xsla:variable>

      <!-- Now the aspect columns -->
      <xsla:for-each select="$aspects">
        <xsla:variable name="aspId"  select="@idRef"/>
        <xsla:variable name="aspRef" select="."/>
        <xsla:variable name="precedingAspCalcs" select="count($sccDefinition/*/scc:Aspects/scc:Aspect[@id=$aspRef/preceding-sibling::scc:AspectRef/@idRef]/*[local-name(.)='Calc' or local-name(.)='chooseCalc'])"/>
        <xsla:variable name="precedingAsp" select="$precedingAspCalcs+count($sccDefinition/*/scc:Aspects/scc:Aspect[not(calc:Calc) and not(scc:chooseCalc) and @id=$aspRef/preceding-sibling::scc:AspectRef/@idRef])"/>
        <xsla:variable name="preceding" select="$precedingAsp+count($aspRef/preceding-sibling::scc:AspectKpi)"/>

        <xsla:choose>
          <xsla:when test="self::scc:AspectKpi"> <!-- Does only apply to doVerticalize -->
            <wrs:C pos="{{1+$kpiOffset+$countDims+$preceding}}" id="{{$kpiIdPrefix}}performance" valueId="{{$kpiIdPrefix}}performance"
                   caption="{{concat($kpiCaptionPrefix,@caption,substring($sccDefinition/*/scc:Kpis/@aspectKpiCaption,0,1 div boolean(@caption)))}}">
              <xsla:copy-of select="$kpiDef/calc:Calc/@type-name"/>
              <xsla:copy-of select="$kpiDef/calc:Calc/@scale"/>
              <xsla:copy-of select="$kpiDef/calc:Calc/@unit"/>
              <xsla:apply-templates select="./scc:AspectRef" mode="headerCAttributes"/>
            </wrs:C>
          </xsla:when>
          <xsla:when test="key('aspectCalcsByAspId',@idRef)">
            <!-- Aspects with calcs -->
            <xsla:variable name="aspectRef" select="."/>
            <xsla:for-each select="key('aspectCalcsByAspId',$aspId)">
              <wrs:C pos="{{position()+$kpiOffset+$countDims+$preceding}}" valueId="{{concat($aspId,'.',@id)}}">
                <xsla:attribute name="id"><xsla:value-of select="concat($kpiIdPrefix,'asp_',$aspId,'.',@id)"/></xsla:attribute>
                <xsla:variable name="caption">
                  <xsla:if test="count(../*[local-name(.)='Calc' or local-name(.)='chooseCalc'])>1"><xsla:value-of select="concat('|',@caption)"/></xsla:if>
                </xsla:variable>
                <xsla:attribute name="caption">
                  <xsla:choose>
                    <xsla:when test="$aspectRef/@caption">
                      <xsla:value-of select="concat($kpiCaptionPrefix,$aspectRef/@caption,$caption)"/>
                    </xsla:when>
                    <xsla:otherwise>
                      <xsla:value-of select="concat($kpiCaptionPrefix,../@caption,$caption)"/>
                    </xsla:otherwise>
                  </xsla:choose>
                </xsla:attribute>
                <xsla:copy-of select="@type-name"/>
                <xsla:copy-of select="@scale"/>
                <xsla:copy-of select="@unit"/>
                <xsla:apply-templates select="$aspectRef/scc:AspectRef" mode="headerCAttributes"/>
              </wrs:C>
            </xsla:for-each>
          </xsla:when>
          <xsla:otherwise>
            <!-- Aspects without calcs -->
            <wrs:C pos="{{1+$kpiOffset+$countDims+$preceding}}" valueId="{{$aspId}}">
              <xsla:attribute name="id"><xsla:value-of select="concat($kpiIdPrefix,'asp_',@idRef)"/></xsla:attribute>
              <xsla:attribute name="caption">
                <xsla:choose>
                  <xsla:when test="@caption">
                    <xsla:value-of select="concat($kpiCaptionPrefix,@caption)"/>
                  </xsla:when>
                  <xsla:otherwise>
                    <xsla:value-of select="concat($kpiCaptionPrefix,key('aspectDefById',@idRef)/@caption)"/>
                  </xsla:otherwise>
                </xsla:choose>
              </xsla:attribute>
              <xsla:copy-of select="$kpiDef/calc:Calc/@type-name"/>
              <xsla:copy-of select="$kpiDef/calc:Calc/@scale"/>
              <xsla:copy-of select="$kpiDef/calc:Calc/@unit"/>
              <xsla:apply-templates select="./scc:AspectRef" mode="headerCAttributes"/>
            </wrs:C>
          </xsla:otherwise>
        </xsla:choose>

      </xsla:for-each>

    </xsla:template>


    <!--
      Generate one Wrs row, the part for one kpi. common for do- and no-Verticalize of KPIs
      -->
    <xsla:template name="measureData">
      <xsla:param name="kpiDef"/>
      <xsla:param name="kpiColPos"/>
      <xsla:param name="allCols"/>

      <xsla:variable name="kpiId" select="$kpiDef/@id"/>
      <xsla:variable name="kpiCalc" select="$kpiDef/calc:Calc"/>

      <!-- Dimensions have already been written before. -->

      <!--
        AspectsRefs
        For each AspectRef, each property will be written as a cell, possible with sub-aspects as attributes attached
        -->
      <xsla:for-each select="$aspectRefs/scc:AspectRef | $aspectRefs/scc:AspectKpi">
        <xsla:variable name="aspId" select="@idRef"/>
        <xsla:variable name="aspectRef" select="."/>
        <xsla:choose>
          <xsla:when test="self::scc:AspectKpi">
            <!-- Performance / KPI value -->
            <wrs:C>
              <xsl:if test="$doVerticalize">
                <xsla:copy-of select="$kpiCalc/@type-name"/> <!-- Each KPI can have a different type -->
                <xsla:copy-of select="$kpiCalc/@scale"/>
                <xsla:copy-of select="$kpiCalc/@unit"/>
              </xsl:if>
              <!-- Take care for 'sub' AspectsRefs, they become attributes for this cell -->
              <xsla:apply-templates select="$aspectRef/scc:AspectRef">
                <xsla:with-param name="kpiId" select="$kpiId"/>
                <xsla:with-param name="allCols" select="$allCols"/>
              </xsla:apply-templates>
              <xsla:value-of select="$allCols[$kpiColPos]"/>
            </wrs:C>
          </xsla:when>
          <xsla:when test="key('aspectCalcsByAspId',$aspId)">
            <!-- Aspects with calcs, they come with properties, one for each calc -->
            <xsla:for-each select="key('aspectCalcsByAspId',$aspId)">
              <xsla:variable name="property">
                <xsla:if test="count(../*[local-name(.)='Calc' or local-name(.)='chooseCalc'])>1"><xsla:value-of select="concat('.',@id)"/></xsla:if>
              </xsla:variable>
              <wrs:C>
                <!-- Take care for 'sub' AspectsRefs, they become attributes for this cell -->
                <xsla:apply-templates select="$aspectRef/scc:AspectRef">
                  <xsla:with-param name="kpiId" select="$kpiId"/>
                  <xsla:with-param name="allCols" select="$allCols"/>
                </xsla:apply-templates>

                <xsla:for-each select="$doc">
                  <xsla:variable name="colHead" select="key('colHeadById',concat('asp_',$aspId,'_',$kpiId,$property))"/>
                  <xsla:variable name="colIdx"  select="number($colHead/@pos)"/>
                  <xsla:variable name="col"     select="$allCols[$colIdx]"/>
                  <xsl:if test="$doVerticalize">
                    <xsla:copy-of select="$colHead/@type-name | $colHead/@scale | $colHead/@unit"/>
                    <xsla:copy-of select="$col/@type-name | $col/@scale | $col/@unit"/>
                  </xsl:if>
                  <xsla:value-of select="$col"/>
                </xsla:for-each>
              </wrs:C>
            </xsla:for-each>
          </xsla:when>
          <xsla:otherwise>
            <!-- Aspects without calcs, they do not come with properties but with a 'kpi' value -->
            <xsla:for-each select="$doc">
              <xsla:variable name="colHead" select="key('colHeadById',concat('asp_',$aspId,'_kpi_',$kpiId))"/>
              <!-- Can be that this is a cross-kpi value -->
              <xsla:if test="$colHead">
                <wrs:C>
                  <!-- Take care for 'sub' AspectsRefs, they become attributes for this cell -->
                  <xsla:apply-templates select="$aspectRef/scc:AspectRef">
                    <xsla:with-param name="kpiId" select="$kpiId"/>
                    <xsla:with-param name="allCols" select="$allCols"/>
                  </xsla:apply-templates>

                  <xsl:if test="$doVerticalize">
                    <xsla:apply-templates select="$colHead/@type-name | $colHead/@scale | $colHead/@unit"/>
                  </xsl:if>
                  <xsla:value-of select="$allCols[number($colHead/@pos)]"/>
                </wrs:C>
              </xsla:if>
            </xsla:for-each>
          </xsla:otherwise>
        </xsla:choose>
      </xsla:for-each>

    </xsla:template>

    <!--
      Template for sub AspectRefs
      Each AspectRef may have child AspectRef nodes, whose value is than attached to the cell as attributes
      -->
    <xsla:template match="scc:AspectRef/scc:AspectRef | scc:AspectKpi/scc:AspectRef">
      <xsla:param name="kpiId"/>
      <xsla:param name="allCols"/>
      <xsla:variable name="attrAspId" select="@idRef"/>
      <xsla:choose>
        <xsla:when test="key('aspectCalcsByAspId',$attrAspId)[1]">
          <xsla:variable name="numCalcsGt1" select="boolean(key('aspectCalcsByAspId',$attrAspId)[2])"/>
          <xsla:for-each select="key('aspectCalcsByAspId',$attrAspId)">
            <xsla:variable name="attrProperty">
              <xsla:if test="$numCalcsGt1"><xsla:value-of select="concat('.',@id)"/></xsla:if>
            </xsla:variable>
            <xsla:for-each select="$doc">
              <xsla:variable name="colHead" select="key('colHeadById',concat('asp_',$attrAspId,'_',$kpiId,$attrProperty))"/>
              <xsla:variable name="colIdx" select="number($colHead/@pos)"/>
              <xsla:variable name="value"  select="number($allCols[ $colIdx ])"/>
              <xsla:if test="$value=$value">
                <xsla:attribute name="{{concat($attrAspId,$attrProperty)}}">
                  <xsla:call-template name="formatNumber">
                    <xsla:with-param name="value" select="$value"/>
                    <xsla:with-param name="columnDefinition" select="$colHead"/>
                  </xsla:call-template>
                </xsla:attribute>
              </xsla:if>
            </xsla:for-each>
          </xsla:for-each>
        </xsla:when>
        <xsla:otherwise>
          <xsla:variable name="def" select="key('kpiDefById',$kpiId)/calc:Calc"/>
          <xsla:for-each select="$doc">
            <xsla:variable name="colIdx" select="number(key('colHeadById',concat('asp_',$attrAspId,'_kpi_',$kpiId))/@pos)"/>
            <xsla:attribute name="{{$attrAspId}}">
              <xsla:call-template name="formatNumber">
                <xsla:with-param name="value" select="$allCols[ $colIdx ]"/>
                <xsla:with-param name="columnDefinition" select="$def"/>
              </xsla:call-template>
            </xsla:attribute>
          </xsla:for-each>
        </xsla:otherwise>
      </xsla:choose>
    </xsla:template>

    <!-- Each aspect attribute is put to the header as a standard wrs:C attribute -->
    <xsla:template match="scc:AspectRef/scc:AspectRef | scc:AspectKpi/scc:AspectRef" mode="headerCAttributes">
      <xsla:variable name="aspDef" select="key('aspectDefById',@idRef)"/>
      <xsla:choose>
        <xsla:when test="$aspDef/*[local-name(.)='Calc' or local-name(.)='chooseCalc']">
          <xsla:for-each select="$aspDef/*[local-name(.)='Calc' or local-name(.)='chooseCalc']">
            <wrs:A id="{{concat(../@id,substring('.',0,1 div not(boolean(@id))),@id)}}" caption="{{concat(../@caption,substring(' - ',0,1 div not(boolean(@id))),@caption)}}">
              <xsla:copy-of select="@type-name | @scale | @unit"/>
            </wrs:A>
          </xsla:for-each>
        </xsla:when>
        <xsla:otherwise>
          <wrs:A><xsla:copy-of select="$aspDef/@*"/></wrs:A>
        </xsla:otherwise>
      </xsla:choose>
    </xsla:template>

    <!-- Preserve any attributes -->
    <xsla:template match="@*">
      <xsla:copy/>
    </xsla:template>

  </xsla:stylesheet>
</xsl:template>

<!--
  Because we do only simple row sorting by dimension, we do not call orderRowsAndColumns.xslt but have a local solution
  This is mainly a webkit-mobile optimization.
  -->
<xsl:template name="rowSorting">
  <xsl:variable name="headerCs" select="/*/wrs:Header/wrs:Columns/wrs:C"/>

  <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[@sort | @total]">
    <xsl:variable name="elem" select="."/>

    <!-- Take care of the position of the (sub)totals, they win over the other sorting  -->
    <xsl:for-each select="$doc">
      <xsl:choose>
        <xsl:when test="$elem/@total='leading'">
          <xsla:sort select="wrs:C[{key('colHeadById',$elem/@id)/@pos}]/@bcdGr" order="descending"/>
        </xsl:when>
        <xsl:when test="$elem/@total='trailing'">
          <xsla:sort select="wrs:C[{key('colHeadById',$elem/@id)/@pos}]/@bcdGr" order="ascending"/>
        </xsl:when>
      </xsl:choose>

      <!-- Sort order (except totals) -->
      <xsl:if test="$elem/@sort">
        <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="order"><xsl:value-of select="$elem/@sort"/></xsl:attribute>
          <xsl:variable name="sortColPos" select="number($headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/@pos)"/>
          <xsl:attribute name="select">
            <xsl:choose>
              <xsl:when test="$headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/wrs:A[@name='order']">
                <xsl:value-of select="concat('wrs:C[',$sortColPos,']/@order')"/>
              </xsl:when>
              <xsl:otherwise>wrs:C[<xsl:value-of select="$sortColPos"/>]</xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>

          <!-- Now check for alphanumeric/numeric sorting. @sortBy (order dim-level by measure) is assumes to always be numeric.
            Otherwise we check for the type of the data itself or - if any - preferred for the type of the @order attribute. -->
          <xsl:choose>
            <xsl:when test="$elem/@sortBy"><xsl:attribute name="data-type">number</xsl:attribute></xsl:when>
            <xsl:when test="$headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/wrs:A[@name='order']/@type-name=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name">
              <xsl:attribute name="data-type">number</xsl:attribute>
            </xsl:when>
            <xsl:when test="$headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/@type-name=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name">
              <xsl:attribute name="data-type">number</xsl:attribute>
            </xsl:when>
          </xsl:choose>
        </xsl:element>
      </xsl:if>
    </xsl:for-each>
  </xsl:for-each>
</xsl:template>

</xsl:stylesheet>
