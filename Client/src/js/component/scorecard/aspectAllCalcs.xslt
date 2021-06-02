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
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)" exclude-result-prefixes="generator"
  bcdxml:wrsHeaderIsEnough="true">

  <!--
    This stylesheet combines all aspect calcs used by a concrete scorecard into one xslt, which is then exected
  -->

  <xsl:import href="../../../xslt/calculation/calculation.xslt"/>

  <xsl:output method="xml" media-type="text/xslt" version="1.0" indent="no" encoding="UTF-8"/>

  <xsl:param name="sccDefinition"/>

  <xsl:param name="aspectIds"/>
  <xsl:variable name="aspectIdsNormalized" select="concat(' ',normalize-space($aspectIds),' ')"/>

  <xsl:key name="colHeadById" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="kpiExtNameVal" match="/*/scc:Kpis/scc:Kpi/scc:Extensions/@*" use="concat(../../@id,'&#xE0F1;',name(),'&#xE0F1;',.)"/>
  <xsl:key name="kpiExtName" match="/*/scc:Kpis/scc:Kpi/scc:Extensions/@*" use="concat(../../@id,'&#xE0F1;',name())"/>

  <xsl:key name="kpiAttrByName" match="/*/scc:Kpis/scc:Kpi/@*" use="concat(../@id,'_',name())"/>

  <xsl:variable name="doc" select="/"/>

  <xsl:variable name="templateDoc" select="document('aspectAllCalcsTemplate.xslt')"/>

  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="$sccDefinition/*/scc:Aspects//scc:Aspect[contains($aspectIdsNormalized,concat(' ',@id,' ')) and (local-name(child::*)='Calc' or local-name(child::*)='chooseCalc')]">
        <xsl:apply-templates select="$templateDoc" mode="generateXSLT"/>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="@*|node()" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

  <!-- Creates a new column for each calculation given in an aspect, does this for each Kpi -->
  <xsl:template match="generator:Calcs" mode="generateXSLT">

    <!-- Loop over all calc:Calc (and calc:ChooseCalc), which are children of an aspect -->
    <xsl:for-each select="$sccDefinition/*/scc:Aspects//scc:Aspect[contains($aspectIdsNormalized,concat(' ',@id,' ')) and (local-name(child::*)='Calc' or local-name(child::*)='chooseCalc')]">
      <xsl:variable name="aspect" select="."/>

      <!-- Loop over Kpi, as each aspect calc is executed for each KPI -->
      <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
        <xsl:variable name="kpi" select="."/>

        <!-- Loop over calc:Calc (and calc:ChooseCalc) child of the aspect -->
        <xsl:for-each select="$aspect/*[local-name(.)='Calc' or local-name(.)='chooseCalc']">
          <xsl:variable name="calcOrChoose" select="."/>
          <xsl:choose>

            <!-- scc:Kpi/@skipAspects allows to list per kpi aspects, which do not apply -->
            <xsl:when test="contains(concat(' ',$kpi/@skipAspects,' '),concat(' ',$aspect/@id,' '))">
              <wrs:C/>
            </xsl:when>

            <!-- Simple case: plain calc -->
            <xsl:when test="local-name($calcOrChoose)='Calc' and $calcOrChoose/calc:*">
              <wrs:C>
                <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                  <xsl:attribute name="select">
                    <xsl:apply-templates select="$calcOrChoose/calc:*[1]" mode="calc">
                      <xsl:with-param name="customId" select="$kpi/@id"/>
                    </xsl:apply-templates>
                  </xsl:attribute>
                </xsl:element>
              </wrs:C>
            </xsl:when>

            <!-- Second case: the exact calc depends on an extended param given on the KPI (like positive/neg for achievement)  -->
            <xsl:when test="local-name($calcOrChoose)='chooseCalc'">
              <wrs:C>
                <!-- Our node is the matching whenExtension or otherwise  -->
                <xsl:variable name="calcParentPos">
                  <xsl:for-each select="$sccDefinition">
                    <xsl:value-of select="count(($calcOrChoose/scc:whenExtension[key('kpiExtNameVal',concat($kpi/@id,'&#xE0F1;',@name,'&#xE0F1;',@value))]
                    | $calcOrChoose/scc:whenKpiAttr[@value=key('kpiAttrByName',concat($kpi/@id,'_',@name))]
                    | $calcOrChoose/scc:otherwise)[1]/preceding-sibling::*)"/>
                  </xsl:for-each>
                </xsl:variable>

                <xsl:variable name="calcParent" select="$calcOrChoose/scc:*[position()=number($calcParentPos)+1]"/>
                <xsl:if test="$calcParent[1]/calc:Calc[1]/calc:*[1]">
                  <xsl:copy-of select="$calcParent[1]/calc:Calc[1]/@type-name | $calcParent[1]/calc:Calc[1]/@scale | $calcParent[1]/calc:Calc[1]/@unit"/>
                  <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                    <xsl:attribute name="select">
                      <xsl:apply-templates select="$calcParent[1]/calc:Calc[1]/calc:*[1]" mode="calc">
                        <xsl:with-param name="customId" select="$kpi/@id"/>
                      </xsl:apply-templates>
                    </xsl:attribute>
                  </xsl:element>
                </xsl:if>
              </wrs:C>
            </xsl:when>

          </xsl:choose>
        </xsl:for-each>
      </xsl:for-each>
    </xsl:for-each>
  </xsl:template>

  <!-- References to other aspects simply resolve to a reference to the column, created by the referenced aspect -->
  <xsl:template match="calc:AspectRef" mode="calc">
    <xsl:param name="customId"/>
    <xsl:variable name="bindingItemId" select="concat(substring-before(@idRef,'$'),$customId,substring-after(@idRef,'$'))"/>
    <xsl:variable name="colIndex">
      <xsl:for-each select="$doc">
        <xsl:value-of select="key('colHeadById', $bindingItemId)/@pos"/>
      </xsl:for-each>
    </xsl:variable>
    <xsl:value-of select="concat('wrs:C[', number($colIndex), ']')"/> <!-- number() in case no match, we would get [] otherwise -->
  </xsl:template>

  <!-- Refer to a value given in the Kpi definition's  scc:Extensions/@myExtensionId='myValue' -->
  <xsl:template match="calc:ExtensionRef" mode="calc">
    <xsl:param name="customId"/>
    <xsl:variable name="quot">'</xsl:variable>
    <xsl:variable name="value" select="key('kpiExtName',concat($customId,'&#xE0F1;',@idRef))"/>
    <xsl:variable name="valueNum" select="number($value)"/>
    <xsl:choose>
      <xsl:when test="$valueNum=$valueNum"><xsl:value-of select="concat('number(',$value,')')"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="concat($quot,$value,$quot)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    There is an implicit 'lead-'measure for a KPI when the KPI only uses one measure in its calc
    In this case, that is the measure used in AggregatorRef
  -->
  <xsl:template match="calc:AggregatorRef" mode="calc">
    <xsl:param name="customId"/>
    <xsl:variable name="uniqueMeasure">
      <xsl:variable name="firstMeasure">
        <xsl:value-of select="substring-before($sccDefinition/*/scc:Kpis/scc:Kpi[@id=$customId]/calc:Calc//@idRef,'.')"/>
      </xsl:variable>
      <xsl:choose>
        <xsl:when test="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$customId]/calc:Calc//@idRef[substring-before(.,'.')!=$firstMeasure]">
          <xsl:value-of select="concat('NoUniqueMeasureFoundFor_',$customId)"/>
        </xsl:when>
        <xsl:otherwise><xsl:value-of select="$firstMeasure"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="bindingItemId">
      <xsl:choose>
        <xsl:when test="count(@bindingItemId)=1"><xsl:value-of select="@bindingItemId"/></xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="concat(substring-before(@idRef,'$'),$uniqueMeasure,substring-after(@idRef,'$'))"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="colIndex">
      <xsl:for-each select="$doc">
        <xsl:value-of select="key('colHeadById', $bindingItemId)/@pos"/>
      </xsl:for-each>
    </xsl:variable>
    <xsl:value-of select="concat('wrs:C[', number($colIndex), ']')"/> <!-- number() in case no match, we would get [] otherwise -->
  </xsl:template>

  <!-- KpiRefs are resolved to the column holding the Kpi's calculated result (in the previous kpi calc step of the scorecard chain)
      Usually, the Kpi referenced in this aspect calc is the Kpi for which we run the aspect (for example achievement for a Kpi)
      But alternatively, the user may refer to a different Kpi (for example to use another Kpi as target in an achievement calc)
      If it is not an absolute path, the xPath is assumed to be relative to the current Kpi's definition (for example in extended attributes) -->
  <xsl:template match="calc:KpiRef" mode="calc">
    <xsl:param name="customId"/>
    <xsl:variable name="name" select="@name"/>

    <xsl:variable name="colIndex">
      <xsl:for-each select="$doc">
        <xsl:choose>
          <xsl:when test="$name">
            <xsl:value-of select="key('colHeadById', concat('kpi_',$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$customId]/scc:KpiRef[@name=$name]/@idRef))/@pos"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="key('colHeadById', concat('kpi_',$customId))/@pos"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </xsl:variable>

    <xsl:value-of select="concat('wrs:C[', number($colIndex), ']')"/>
  </xsl:template>

</xsl:stylesheet>