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
  Takes bcdRowIdent and bcdColIdent and a filterModel and creates filters from the combined information
  If dimension model is given, is also translates filters for details using dimension translation
  Can be easily imported and overwritten for specific levels
  Main result are three variables containing a guiStatus:Status element with f:Filter subnodes
    cellFilter
      -> f:Filter, purely derived from the dimensions belonging to the cell's position in the report
    cellAndGuiStatusFilter
      -> cellFilter merged with the guiStatus filters, where cell filters win conflicts
    cellAndGuiStatusFilterDetailTranslated
      -> cellAndGuiStatusFilter but also Details/DimensionTranslate information applied and a Status/BindingSet element
  to be used in an importing stylesheet
 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="guiStatus"          select="/*[1=0]"/>
  <xsl:param name="filterModel"        select="$guiStatus"/> <!-- guiStatus is default, but can be overwritten -->
  <xsl:param name="targetChoosers"     select="/*[1=0]"/>
  <xsl:param name="dimensionModel"     select="/*[1=0]"/>
  <xsl:param name="bcdRowIdent"/>
  <xsl:param name="bcdColIdent"/>

  <!-- Where these are found is context specific. Overwrite them when including this stylesheet or set it as a parameter -->
  <xsl:param name="detailData"         select="/*[1=0]"/>    <!-- dm:DetailData used for bRef translations -->
  <xsl:param name="detailDataDefaults" select="/*[1=0]"/>    <!-- dm:DetailDataDefaults used for bRef translations -->


  <!-- Overwrite filterFromCellIncludebcdGr if necessary in including stylesheet -->
  <xsl:variable name="filterFromCellIncludebcdGr" select="false()"/>
  <!-- We either take local or the default dm:Translations, we do not merge an that level -->
  <xsl:variable name="translations"  select="$detailData/dm:Translations | $detailDataDefaults/dm:Translations[not($detailData/dm:Translations)]"/>
  <xsl:variable name="transFromDims" select="$dimensionModel/*/dm:Dimension[@id=$translations/dm:DT/@from]"/>

  <!--
    These three variables are the main result of this stylesheet
    -->
  <xsl:variable name="cellFilter" select="exslt:node-set($cellFilterVar)"/>
  <xsl:variable name="cellAndGuiStatusFilter" select="exslt:node-set($cellAndGuiStatusFilterVar)"/>
  <xsl:variable name="cellAndGuiStatusFilterDetailTranslated" select="exslt:node-set($cellAndGuiStatusFilterDetailTranslatedVar)"/>

  <!--
    Filter derived purely from the cell's position
    If includebcdGr is true, includes information about dimension members representing totals
    -->
  <xsl:variable name="cellFilterVar">
    <f:Filter>

      <!-- One f:Expression per row dimension level -->
      <xsl:variable name="row" select="/*/wrs:Data/wrs:R[@id=$bcdRowIdent]"/>
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@dimId]">
        <xsl:variable name="cell" select="$row/wrs:C[number(current()/@pos)]"/>
        <xsl:choose>
          <xsl:when test="not($cell/@bcdGr='1')">
            <f:Expression bRef="{@dimId}" op="=" value="{$cell}"/>
          </xsl:when>
          <xsl:when test="$filterFromCellIncludebcdGr">
            <f:Expression bRef="{@dimId}" op="=" value="" bcdGr="1"/>
          </xsl:when>
        </xsl:choose>
      </xsl:for-each>

      <!-- One f:Expression per column dimension level -->
      <xsl:if test="contains($bcdColIdent,'|')">
        <xsl:call-template name="helperColLevels">
          <xsl:with-param name="colDimLevelIds" select="concat(/*/wrs:Header/wrs:Columns/@colDimLevelIds,'|')"/>
          <xsl:with-param name="colDimMembers"  select="concat($bcdColIdent,'|')"/>
        </xsl:call-template>
      </xsl:if>

    </f:Filter>
  </xsl:variable>


  <!-- Helper, creates for one f:Expression per column dimension level -->
  <xsl:template name="helperColLevels">
    <xsl:param name="colDimLevelIds"/>
    <xsl:param name="colDimMembers"/>
    <xsl:if test="substring-before($colDimMembers,'|')">
      <xsl:choose>
        <xsl:when test="substring-before($colDimMembers,'|')='&#xE0F0;1'"> <!-- total (optional output) -->
          <xsl:if test="$filterFromCellIncludebcdGr">
          <f:Expression bRef="{substring-before($colDimLevelIds,'|')}" op="=" value="" bcdGr="1"/>
          </xsl:if>
        </xsl:when>
        <xsl:when test="substring-before($colDimMembers,'|')='&#xE0F0;0'"> <!-- [Empty] -->
          <f:Expression bRef="{substring-before($colDimLevelIds,'|')}" op="="/>
        </xsl:when>
        <xsl:otherwise>
          <f:Expression bRef="{substring-before($colDimLevelIds,'|')}" op="=" value="{substring-before($colDimMembers,'|')}"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
    <xsl:if test="substring-after($colDimLevelIds,'|')">
      <xsl:call-template name="helperColLevels">
        <xsl:with-param name="colDimLevelIds" select="substring-after($colDimLevelIds,'|')"/>
        <xsl:with-param name="colDimMembers"  select="substring-after($colDimMembers,'|')"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!--
    Filters of the cell merged with filters from guiStatus, cell filters having higher priority
    don't include combined (cw)yr/mo/cw/qr bRefs, assuming they were correctly used to replace sidebar filters
    -->
  <xsl:variable name="cellAndGuiStatusFilterVar">
    <guiStatus:Status>
      <f:Filter>
        <xsl:apply-templates select="$cellFilter/f:Filter/f:Expression[not(@bRef=$filterModel/*/f:Filter//f:Expression/@bRef)
        and not(@bRef='yrqr' or @bRef='cwyrcw' or @bRef='yrmo')
        ]"/>
        <xsl:apply-templates select="$filterModel/*/f:Filter/*" mode="merge"/>
      </f:Filter>
    </guiStatus:Status>
  </xsl:variable>

  <!-- Special handling period chooser, drop @dateFrom and @dateFrom, so that f:Expression win (they may come from cell pos) -->
  <xsl:template match="f:*[@dateFrom and @dateTo]" mode="merge">
    <xsl:copy>
      <xsl:apply-templates select="@*[not(local-name()='dateFrom') and not(local-name()='dateTo')]" mode="merge"/>
      <xsl:apply-templates select="node()" mode="merge"/>
    </xsl:copy>
  </xsl:template>

  <!-- Special handling for building combined cell/sidebar filter for period-style filter blocks when you got a complex range over
    multiple years f:And/f:Or/ with 2 or more embedded f:And
    In this case we completely rebuild the period filter with the following steps:
    - check if the cell filter values belongs to the >= or <= filter group
    - copy cell filter non-year brefs, then check if cell filter year brefs are available (take them)
    - or otherwise use the year brefs from >= (or <=) filter group
  -->
  <xsl:template match="f:*[count(*/*/f:Expression[@bRef='cwyr' or @bRef='yr']) &gt; 1]" mode="merge">
    <xsl:choose>
      <!-- match on outer complex period node and -if a cell filer with year info is present, use this -->
      <xsl:when test="$cellFilter/f:Filter//*[@bRef='yrmo' or @bRef='yrqr' or @bRef='cwyrcw']">
        <xsl:variable name="cellbRef" select="$cellFilter/f:Filter//*[@bRef='yrmo' or @bRef='yrqr' or @bRef='cwyrcw']/@bRef"/>
        <xsl:variable name="cellValue" select="$cellFilter/f:Filter//*[@bRef='yrmo' or @bRef='yrqr' or @bRef='cwyrcw']/@value"/>
        <xsl:variable name="value1" select="substring-before($cellValue, '-')"/>
        <xsl:variable name="value2" select="substring-after($cellValue, '-')"/>
        <xsl:variable name="bRef1">
          <xsl:choose>
            <xsl:when test="$cellbRef='cwyrcw'">cwyr</xsl:when>
            <xsl:otherwise>yr</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="bRef2">
          <xsl:choose>
            <xsl:when test="$cellbRef='cwyrcw'">cw</xsl:when>
            <xsl:when test="$cellbRef='yrqr'">qr</xsl:when>
            <xsl:otherwise>mo</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:copy>
          <xsl:copy-of select="@*"/>
          <f:Expression bRef="{$bRef1}" op="=" value="{$value1}"/>
          <f:Expression bRef="{$bRef2}" op="=" value="{$value2}"/>
        </xsl:copy>
      </xsl:when>
      <xsl:when test="$cellFilter/f:Filter//*[@bRef='mo' or @bRef='cw' or @bRef='qr']">
        <xsl:variable name="expGreater" select=".//*[@op='&gt;=' and @bRef=$cellFilter/f:Filter//*/@bRef]"/>
        <xsl:variable name="expSmaller" select=".//*[@op='&lt;=' and @bRef=$cellFilter/f:Filter//*/@bRef]"/>
        <xsl:choose>
          <xsl:when test="$cellFilter/f:Filter//*[@bRef = $expGreater//@bRef]/@value &gt;= $expGreater/@value">
            <xsl:copy>
              <xsl:copy-of select="@*"/>
              <xsl:copy-of select="$cellFilter/f:Filter//*[@bRef='qr' or @bRef='cw' or @bRef='mo']"/>
              <xsl:choose>
                <xsl:when test="$cellFilter/f:Filter//*[@bRef='cwyr' or @bRef='yr']">
                  <xsl:copy-of select="$cellFilter/f:Filter//*[@bRef='cwyr' or @bRef='yr']"/>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:copy-of select="$expGreater/../f:Expression[@bRef='cwyr' or @bRef='yr']"/>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:copy>
          </xsl:when>
          <xsl:when test="$cellFilter/f:Filter//*[@bRef = $expSmaller//@bRef]/@value &lt;= $expSmaller/@value">
            <xsl:copy>
              <xsl:copy-of select="@*"/>
              <xsl:copy-of select="$cellFilter/f:Filter//*[@bRef='qr' or @bRef='cw' or @bRef='mo']"/>
              <xsl:choose>
                <xsl:when test="$cellFilter/f:Filter//*[@bRef='cwyr' or @bRef='yr']">
                  <xsl:copy-of select="$cellFilter/f:Filter//*[@bRef='cwyr' or @bRef='yr']"/>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:copy-of select="$expSmaller/../f:Expression[@bRef='cwyr' or @bRef='yr']"/>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:copy>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy><xsl:apply-templates select="@*|node()" mode="merge"/></xsl:copy>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy><xsl:apply-templates select="@*|node()" mode="merge"/></xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- Each filter in the original filter is replaced by a filter for the same bRef coming from the cell position -->
  <xsl:template match="f:Expression" mode="merge">
    <xsl:choose>
      <xsl:when test="@bRef=$cellFilter/f:Filter//*/@bRef">
        <xsl:if test="not(preceding::*[@bRef=current()/@bRef])">
          <xsl:copy-of select="$cellFilter/f:Filter//*[@bRef=current()/@bRef]"/>
        </xsl:if>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy>
          <xsl:apply-templates select="@*|node()" mode="merge"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="@*|node()" mode="merge">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="merge"/>
    </xsl:copy>
  </xsl:template>


  <!--
    These are the cell+guiStatus filters with detail dimension translation being applied
    -->
  <xsl:variable name="cellAndGuiStatusFilterDetailTranslatedVar">
    <guiStatus:Status>
      <f:Filter>
        <xsl:choose>
          <xsl:when test="$translations">
            <xsl:apply-templates select="$cellAndGuiStatusFilter/*/f:Filter/*" mode="detailTranslate"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy-of select="$cellAndGuiStatusFilter/*/f:Filter/*"/>
          </xsl:otherwise>
        </xsl:choose>
      </f:Filter>
    </guiStatus:Status>
  </xsl:variable>

  <!-- 
    @bRef is translated if it appears in any Dimension mentioned in DimensionTranslate
    As bRef does not carry hierarchy information, we can only a matching bRef in any hierarchy of the dimension (we take the first).
    Same is true for to, so in end effect we rely on the a (very likely) setup, where within a single dim:Dimension each dm:Level with the same @type maps to the same @bRef even if belonging to different hierarchies
    -->

  <xsl:template match="f:Or[@bcdDimension]" mode="detailTranslate">
    <xsl:variable name="fromDim" select="$transFromDims[./dm:Hierarchy/dm:Level/@bRef=current()/f:And/f:Expression/@bRef][1]"/>
    <xsl:variable name="toDimId" select="$translations/dm:DT[@from=$fromDim/@id]/@to"/>
    <f:Or>
      <xsl:attribute name="bcdDimension">
        <xsl:choose>
          <xsl:when test="$toDimId!=''"><xsl:value-of select="$toDimId"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="@bcdDimension"/></xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:apply-templates select="f:And" mode="detailTranslate"/>
    </f:Or>
  </xsl:template>

  <xsl:template match="f:And[@bcdDimension]" mode="detailTranslate">
    <xsl:variable name="fromDim" select="$transFromDims[./dm:Hierarchy/dm:Level/@bRef=current()/f:Or/f:Expression/@bRef][1]"/>
    <xsl:variable name="toDimId" select="$translations/dm:DT[@from=$fromDim/@id]/@to"/>
    <f:And>
      <xsl:variable name="dimName">
        <xsl:choose>
          <xsl:when test="$toDimId!=''"><xsl:value-of select="$toDimId"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="@bcdDimension"/></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:attribute name="bcdDimension">
        <xsl:value-of select="concat($dimName, '_exclude')"/>
      </xsl:attribute>
      <xsl:apply-templates select="f:Or" mode="detailTranslate"/>
    </f:And>
  </xsl:template>

  <xsl:template match="f:Expression" mode="detailTranslate">
    <xsl:variable name="fromDim"     select="$transFromDims[./dm:Hierarchy/dm:Level/@bRef=current()/@bRef][1]"/>
    <xsl:variable name="filterTrans" select="$translations/dm:FT[@from=current()/@bRef]"/>
    <xsl:choose>
      <!-- levels which are part of any detail dimension translation get a prefix handling -->
      <xsl:when test="$fromDim">
        <xsl:variable name="toDimId" select="$translations/dm:DT[@from=$fromDim/@id]/@to"/>
        <xsl:variable name="toDim"   select="$dimensionModel/*/dm:Dimension[@id=$toDimId]"/>
        <xsl:copy>
          <xsl:copy-of select="@*"/>
          <xsl:attribute name="bRef">
            <xsl:value-of select="$toDim/*/dm:Level[@type=$transFromDims/dm:Hierarchy/dm:Level[@bRef=current()/@bRef][1]/@type]/@bRef"/>
          </xsl:attribute>
        </xsl:copy>
      </xsl:when>
      <!-- Maybe we have a FilterTranslation -->
      <xsl:when test="$filterTrans/@to">
        <xsl:copy>
          <xsl:copy-of select="@*"/>
          <xsl:attribute name="bRef">
            <xsl:value-of select="$filterTrans/@to"/>
          </xsl:attribute>
        </xsl:copy>
      </xsl:when>
      <xsl:when test="$filterTrans">
        <!-- We have a from and no to: drop it -->
      </xsl:when>
      <!-- Leave it untranslated -->
      <xsl:otherwise>
        <xsl:copy-of select="."/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Per default, all gets copied 1:1 -->
  <xsl:template match="@*|node()" mode="detailTranslate">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="detailTranslate"/>
    </xsl:copy>
  </xsl:template>

  <!--
    Root, overwrite this if you want an f:And node instead or the detail filters for example
    -->
  <xsl:template match="/">
    <guiStatus:Status>
      <f:Filter>
        <xsl:apply-templates select="$cellFilter/f:Filter/*"/>
      </f:Filter>
    </guiStatus:Status>
  </xsl:template>

  <!-- In general, take everything one to one,
    overwrite this if you need special handling for certain filters -->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- match on outer simple period node and -if a cell filer with year info is present, use this -->
  <xsl:template match="f:*[f:Expression[@bRef='cwyr' or @bRef='yr']]" mode="merge">
    <xsl:choose>
      <xsl:when test="$cellFilter/f:Filter//*[@bRef='yrmo' or @bRef='yrqr' or @bRef='cwyrcw']">
        <xsl:variable name="cellbRef" select="$cellFilter/f:Filter//*[@bRef='yrmo' or @bRef='yrqr' or @bRef='cwyrcw']/@bRef"/>
        <xsl:variable name="cellValue" select="$cellFilter/f:Filter//*[@bRef='yrmo' or @bRef='yrqr' or @bRef='cwyrcw']/@value"/>
        <xsl:variable name="value1" select="substring-before($cellValue, '-')"/>
        <xsl:variable name="value2" select="substring-after($cellValue, '-')"/>
        <xsl:variable name="bRef1">
          <xsl:choose>
            <xsl:when test="$cellbRef='cwyrcw'">cwyr</xsl:when>
            <xsl:otherwise>yr</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="bRef2">
          <xsl:choose>
            <xsl:when test="$cellbRef='cwyrcw'">cw</xsl:when>
            <xsl:when test="$cellbRef='yrqr'">qr</xsl:when>
            <xsl:otherwise>mo</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:copy>
          <xsl:copy-of select="@*"/>
          <f:Expression bRef="{$bRef1}" op="=" value="{$value1}"/>
          <f:Expression bRef="{$bRef2}" op="=" value="{$value2}"/>
        </xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy><xsl:apply-templates select="@*|node()" mode="merge"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="f:Or[@bcdDimension]" mode="merge">
    <xsl:variable name="dimName" select="@bcdDimension"/>
    <xsl:variable name="dimension" select="$dimensionModel/*/dm:Dimension[@id=$dimName]"/>
    <xsl:copy-of select="."/>
    <f:And>
      <xsl:copy-of select="$cellFilter/f:Filter//*[@bRef=$dimension/*/dm:Level/@bRef]"/>
    </f:And>
  </xsl:template>

</xsl:stylesheet>