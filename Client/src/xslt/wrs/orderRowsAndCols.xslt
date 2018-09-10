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
  Orders rows and columns according to different criteria

  Limitations:
  - Col re-ordering of dimensions and sort-dim-by-measure will not work together as C[i+]/@bcdGr='1' is always used
  - Sort-dim-by-measure will fail in case of col dimensions ()
  - Currently only numeric is recognized for numeric sorting
  - Col dim value hiding does not work together with ColsOrder (but does work together with ColDimsOrder)
  -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:OrderRowsAndCols[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:param name="colDimsOrder" select="$paramSet/xp:ColDimsOrder"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="sqlTypesDoc" select="document('../renderer/sqlTypes.xml')"/>
  <xsl:variable name="orderRowsAndColsTemplate" select="document('orderRowsAndColsTemplate.xslt')"/>
  <xsl:variable name="headerCs" select="/*/wrs:Header/wrs:Columns/wrs:C"/>
  <xsl:variable name="doc" select="/"/>
  <xsl:variable name="colFilter" select="$paramSet/f:Filter/*[.//@bRef != $headerCs/@dimId or not($headerCs/@dimId)]"/>

  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="$paramSet/xp:RowsOrder/*/* | $paramSet/xp:ColsOrder/*/* | $paramSet/xp:ColDimsOrder/*/* | $paramSet/f:Filter/*">
        <xsla:stylesheet>
          <xsl:copy-of select="$orderRowsAndColsTemplate/*/@*"/>
          <xsl:comment>Generated from orderRowsAndColsTemplate</xsl:comment>
          <xsl:apply-templates select="$orderRowsAndColsTemplate/*/*" mode="generateXSLT"/>
        </xsla:stylesheet>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    Translates the row filters which come as normal f:Filter into a key, matching the allowed row
   -->
  <xsl:template match="generator:RowFilterKey" mode="generateXSLT">
    <xsl:if test="$paramSet/f:Filter//f:Expression[@bRef = $headerCs/@dimId]">
      <xsla:key name="rowFilter" use="generate-id(.)">
        <xsl:attribute name="match">
          <xsl:text>/*/wrs:Data/wrs:R[</xsl:text>
            <xsl:apply-templates select="$paramSet/f:Filter/*[.//@bRef = $headerCs/@dimId]" mode="rowFilter"/>
          <xsl:text>]</xsl:text>
        </xsl:attribute>
      </xsla:key>
    </xsl:if>
  </xsl:template>

  <!-- Helper for generator:RowFilterKey, creating a sub part for the row filter representing a single expression -->
  <xsl:template match="f:Expression" mode="rowFilter">
    <xsl:variable name="expr" select="."/>
    <xsl:for-each select="$doc">
      <xsl:choose>
        <xsl:when test="$expr/@value='&#xE0F0;0'">
          <xsl:value-of select="concat('(wrs:C[',key('colHeadById',$expr/@bRef)/@pos,']/text() or wrs:C[',key('colHeadById',$expr/@bRef)/@pos,']/@bcdGr=&quot;1&quot;)')"/>
        </xsl:when>
        <xsl:when test="$expr/@value='&#xE0F0;1'">
          <xsl:value-of select="concat('wrs:C[',key('colHeadById',$expr/@bRef)/@pos,']/@bcdGr',$expr/@op,'&quot;1&quot;')"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="concat('wrs:C[',key('colHeadById',$expr/@bRef)/@pos,']',$expr/@op,'&quot;',$expr/@value,'&quot;')"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:for-each>
    <xsl:choose>
      <xsl:when test="not(position()=last()) and local-name(..)='Or'"> or </xsl:when>
      <xsl:when test="not(position()=last())"> and </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!-- Helper for generator:RowFilterKey -->
  <xsl:template match="f:And | f:Or" mode="rowFilter">
    <xsl:text>(</xsl:text>
    <xsl:apply-templates select="*" mode="rowFilter"/>
    <xsl:text>)</xsl:text>
    <xsl:choose>
      <xsl:when test="not(position()=last()) and local-name(..)='Or'"> or </xsl:when>
      <xsl:when test="not(position()=last())"> and </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!--
    Depending on whether we have a row filter or not, we apply the row-filter key or not
   -->
  <xsl:template match="generator:ForEachRow" mode="generateXSLT">
    <xsl:choose>
      <xsl:when test="$paramSet/f:Filter//f:Expression[@bRef = $headerCs/@dimId]">
        <xsla:for-each select="*[key('rowFilter',generate-id(.))]">
          <xsl:apply-templates select="@*|node()" mode="generateXSLT"/>
        </xsla:for-each>
      </xsl:when>
      <xsl:otherwise>
        <xsla:for-each select="*">
          <xsl:apply-templates select="@*|node()" mode="generateXSLT"/>
        </xsla:for-each>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Generates the sorting expression for row dimensions (in their order) -->
  <xsl:template match="generator:RowsOrdering" mode="generateXSLT">
    <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[@sort | @total]">
      <xsl:call-template name="generateSort">
        <xsl:with-param name="elem" select="."/>
      </xsl:call-template>
    </xsl:for-each>
  </xsl:template>
  
  <!-- reusable sort generator (orderRowsAndCols and orderAndCut -->
  <xsl:template name="generateSort">
    <xsl:param name="elem" select="."/>

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
          <!--
            Now check for alphanumeric/numeric.
            We check for the type of the data itself or - if any - preferred for the type of the @order or current @sortBy attribute. -->
          <xsl:variable name="sortBy" select="$elem/@sortBy"/>
          <xsl:variable name="sortByType" select="$headerCs[@id=$sortBy]/@type-name"/>
          <xsl:variable name="isNumericSorting" select="
            ($sortBy and $sortByType=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name)
            or $headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/wrs:A[@name='order']/@type-name=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name
            or $headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/@type-name=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name
          "/>
          <!-- Sort by the column itself or by the sub-total-value of a measure -->
          <xsl:choose>
            <xsl:when test="$elem/@sortBy">
              <xsl:variable name="sortByPos" select="number($headerCs[@id=$elem/@sortBy or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@sortBy,'1|','') and @valueId=$elem/@sortBy)]/@pos)"/>
              <xsl:variable name="ourPos" select="number(key('colHeadById',$elem/@id)/@pos)"/>
              <xsl:choose>
                <xsl:when test="$ourPos > 1 and /*/wrs:Header/wrs:Columns/wrs:C[$ourPos+1]/@dimId">
                  <!-- If we are not the innermost and not the outermost dim, we need to search for the row which contains the total for our following dimension
                       within our group, i.e. all previous dimensions have the same value -->
                  <xsl:attribute name="select">../wrs:R[
                    <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@pos &lt;= $ourPos]">
                      wrs:C[<xsl:value-of select="@pos"/>]=current()/wrs:C[<xsl:value-of select="@pos"/>] and
                    </xsl:for-each>
                    wrs:C[number(<xsl:value-of select="$ourPos"/>+1)]/@bcdGr='1']/wrs:C[<xsl:value-of select="$sortByPos"/>]</xsl:attribute>
                </xsl:when>
                <xsl:when test="/*/wrs:Header/wrs:Columns/wrs:C[$ourPos+1]/@dimId">
                  <!-- If we are the outermost but not the innermost dim, we need to search for the row which contains the total for our following dimension and the same value for our dimension, but we do not have an outer group to watch -->
                  <xsl:attribute name="select">../wrs:R[wrs:C[<xsl:value-of select="$ourPos"/>]=current()/wrs:C[<xsl:value-of select="$ourPos"/>] and wrs:C[number(<xsl:value-of select="$ourPos"/>+1)]/@bcdGr='1']/wrs:C[<xsl:value-of select="$sortByPos"/>]</xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                  <!-- If we are innermost we can just sort by value, previous sortings make sure we do not cross dimension borders -->
                  <xsl:attribute name="select">wrs:C[<xsl:value-of select="$sortByPos"/>]</xsl:attribute>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:when>
            <!-- Sort by the column itself -->
            <xsl:otherwise>
              <xsl:variable name="sortColPos" select="number($headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/@pos)"/>
              <xsl:attribute name="select">
                <xsl:choose>
                  <xsl:when test="$headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/wrs:A[@name='order']">
                    <xsl:value-of select="concat('wrs:C[',$sortColPos,']/@order')"/>
                  </xsl:when>
                  <xsl:when test="$isNumericSorting">wrs:C[<xsl:value-of select="$sortColPos"/>]</xsl:when>
                  <!-- We do sort empty last as opposed to XSLT default, because db sorts them last per default as well their order should not depend on whether the order comes from db or us -->
                  <xsl:otherwise>concat(boolean(string-length(wrs:C[<xsl:value-of select="$sortColPos"/>])=0),'&#xE0F0;',wrs:C[<xsl:value-of select="$sortColPos"/>])</xsl:otherwise>
                </xsl:choose>
              </xsl:attribute>
            </xsl:otherwise>
          </xsl:choose>
          <!-- set type of sorting -->
          <xsl:if test="$isNumericSorting">
            <xsl:attribute name="data-type">number</xsl:attribute>
          </xsl:if>
        </xsl:element>
      </xsl:if>
    </xsl:for-each>
  </xsl:template>

  <!-- In case of given xp:ColDimsOrder: Generate the columns order, which controls the output -->
  <xsl:template match="generator:ColDimsOrdering" mode="generateXSLT">
    <xsl:if test="$paramSet/xp:ColDimsOrder or $colFilter">
      <xsla:variable name="colsOrderFromColDimsOrder">
        <wrs:Columns>
          <xsl:copy-of select="$doc/*/wrs:Header/wrs:Columns/@*"/>
          <!-- Dimension columns stay where they are -->
          <xsla:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@dimId]">
            <wrs:C>
              <xsla:attribute name="id"><xsla:value-of select="@id"/></xsla:attribute>
            </wrs:C>
          </xsla:for-each>
          <!-- Also row-dim-only measures keep their position -->
          <xsla:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@id=@valueId]">
            <wrs:C>
              <xsla:attribute name="id"><xsla:value-of select="@id"/></xsla:attribute>
            </wrs:C>
          </xsla:for-each>
          <!-- Measure columns which also depends on col dims are reordered -->
          <xsla:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@valueId and @id!=@valueId]">
            <xsl:call-template name="sortColDims"/>
            <!-- This skips and columns, which are excluded in $paramSet/f:Filter/f:Expression for dimensions which are col dimensions -->
            <xsla:if>
              <xsl:attribute name="test">
                <xsl:if test="not($colFilter)">true()</xsl:if>
                <!-- Lets append a condition for each dim value of a level being a col-level -->
                <xsl:apply-templates select="$colFilter" mode="colFilter"/>
              </xsl:attribute>
              <wrs:C id="{{@id}}"/> <!-- Note the double {, this is to be executed by the generated stylesheet, not here -->
            </xsla:if>
          </xsla:for-each>
        </wrs:Columns>
      </xsla:variable>
    </xsl:if>
  </xsl:template>

  <!-- Helper for ColDimsOrdering -->
  <xsl:template match="f:Expression"  mode="colFilter">
    <xsl:text>substring-before(</xsl:text>
    <xsl:variable name="pos">
      <xsl:call-template name="posOfColDim">
        <xsl:with-param name="colDim" select="@bRef"/>
      </xsl:call-template>
    </xsl:variable>
    <!-- for 1..n loop. $doc/*/wrs:Header/descendant-or-self::* should be a short but long enough dummy list -->
    <xsl:for-each select="$doc/*/wrs:Header/descendant-or-self::*[position()&lt;$pos]"><xsl:text>substring-after(</xsl:text></xsl:for-each>
      <xsl:text>@id</xsl:text>
    <xsl:for-each select="$doc/*/wrs:Header/descendant-or-self::*[position()&lt;$pos]"><xsl:text>,'|')</xsl:text></xsl:for-each>
    <xsl:text>,'|')</xsl:text><xsl:value-of select="concat(@op,'&quot;',@value,'&quot;')"/>
    <xsl:choose>
      <xsl:when test="not(position()=last()) and local-name(..)='Or'"> or </xsl:when>
      <xsl:when test="not(position()=last())"> and </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!-- Helper for ColDimsOrdering -->
  <xsl:template match="f:And | f:Or" mode="colFilter">
    <xsl:text>(</xsl:text>
    <xsl:apply-templates select="*" mode="colFilter"/>
    <xsl:text>)</xsl:text>
    <xsl:choose>
      <xsl:when test="not(position()=last()) and local-name(..)='Or'"> or </xsl:when>
      <xsl:when test="not(position()=last())"> and </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!-- Small helper to get the pos of a column dimension (starting at 1) -->
  <xsl:template name="posOfColDim">
    <xsl:param name="pos" select="1"/>
    <xsl:param name="colDimStringRest" select="$doc/*/wrs:Header/wrs:Columns/@colDimLevelIds"/>
    <xsl:param name="colDim"/>
    <xsl:choose>
      <xsl:when test="substring-before(concat($colDimStringRest,'|'),'|')=$colDim or $pos>10"><xsl:value-of select="$pos"/></xsl:when>
      <xsl:otherwise>
        <xsl:call-template name="posOfColDim">
          <xsl:with-param name="pos" select="$pos+1"/>
          <xsl:with-param name="colDimStringRest" select="substring-after($colDimStringRest,'|')"/>
          <xsl:with-param name="colDim" select="$colDim"/>
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    Helper for the generation of column order in case of xp:ColDimsOrder (sort dim level by measure)
    We loop over the col dims (via substring of wrs:Columns/@colDimLevelIds)
    For each such level, we check $colDimsOrder/wrs:Columns/wrs:C for sortings settings
    If any level is to be sorted, all more outer levels need to be sorted to assure that the totals sorting of each level does not break the col-dim groups
   -->
  <xsl:template name="sortColDims">
    <xsl:param name="colDimRest" select="$doc/*/wrs:Header/wrs:Columns/@colDimLevelIds"/>
    <!-- colDimCumul expands to substring-before(current()/@id,'|'),'|',substring-before(substring-after(current()/@id,'|'),'|')))
         i.e. it is the pipe separated id (the dimensions) up to and inclung the level we are working on, including trailing | -->
    <xsl:param name="colDimCumul">substring-before(current()/@id,substring-after(current()/@id,'|'))</xsl:param>
    <!-- substringAfterExpr derives is the part of the @id beyond the n-th |, it starts with the current level, it starts without but ends with |
         sample: substring-after(substring-after(current()/@id,'|'),'|') -->
    <xsl:param name="substringAfterExpr">current()/@id</xsl:param>
    <xsl:param name="substringAfterCaptionExpr">current()/@caption</xsl:param>

    <xsl:if test="$colDimRest"> <!-- We only need to sort for the colDims -->

      <xsl:variable name="colDim" select="substring-before(concat($colDimRest,'|'),'|')"/>
      <xsl:variable name="colDimSort" select="$colDimsOrder/wrs:Columns/wrs:C[@id=$colDim]"/>

      <xsl:if test="$colDimSort/@total and ($colDimSort/@sortBy or $colDimsOrder/wrs:Columns/wrs:C[@id=$colDim]/following-sibling::wrs:C/@sortBy)">

        <!-- Sort totals first, because independent of the value sorting below, it should be leading or trailing
             We rely on the fact the the next outer level was also sorted so that we only sort here within the group with equal dim members i.e. totals stay with them -->
        <xsl:variable name="totalDescAsc">
          <xsl:choose>
            <xsl:when test="$colDimSort/@total='leading'">descending</xsl:when>
            <xsl:otherwise>ascending</xsl:otherwise> <!-- default is also trailing -->
          </xsl:choose>
        </xsl:variable>
        <xsla:sort select="substring-before({$substringAfterExpr},'|')='&#xE0F0;1'" order="{$totalDescAsc}"/>

        <!-- Sort the values then. We search the total-row as we are to be sorted by the total.
          In addition, if we are to be sorted by a measure and there are col dims below us, we must search for the total of the next level -->
        <xsl:choose>
          <xsl:when test="$colDimSort/@sortBy and substring-after($colDimRest,'|')">
            <xsla:sort order="{concat(substring('ascending',0,1 div string-length($colDimSort/@sort)),$colDimSort/@sort)}">
              <xsl:attribute name="select">
                /*/wrs:Data/wrs:R[not(wrs:C/@bcdGr='0')]/wrs:C[
                starts-with(key('colHeadByPos',position())/@id,concat(<xsl:value-of select="$colDimCumul"/>,'&#xE0F0;1'))
                and key('colHeadByPos',position())/@valueId='<xsl:value-of select="$colDimSort/@sortBy"/>']
              </xsl:attribute>
              <xsl:attribute name="data-type">number</xsl:attribute>
            </xsla:sort>
          </xsl:when>
          <xsl:when test="$colDimSort/@sortBy">
            <xsla:sort order="{concat(substring('ascending',0,1 div string-length($colDimSort/@sort)),$colDimSort/@sort)}">
              <xsl:attribute name="select">
                /*/wrs:Data/wrs:R[not(wrs:C/@bcdGr='0')]/wrs:C[
                starts-with(key('colHeadByPos',position())/@id,concat(<xsl:value-of select="$colDimCumul"/>,''))
                and key('colHeadByPos',position())/@valueId='<xsl:value-of select="$colDimSort/@sortBy"/>']
              </xsl:attribute>
              <xsl:attribute name="data-type">number</xsl:attribute>
            </xsla:sort>
          </xsl:when>
        </xsl:choose>

        <!-- If two sub-totals have the same value in the above sorting, this assures that the values the affected groups are next to each other -->
        <xsla:sort select="substring-before({$substringAfterCaptionExpr},'|')"/>
      </xsl:if>

      <!-- Let's go to the next level recursion -->
      <xsl:variable name="q">,'|'</xsl:variable>
      <xsl:call-template name="sortColDims">
        <xsl:with-param name="colDimRest" select="substring-after($colDimRest,'|')"/>
        <xsl:with-param name="substringAfterExpr" select="concat('substring-after(',$substringAfterExpr,$q,')')"/>
        <xsl:with-param name="substringAfterCaptionExpr" select="concat('substring-after(',$substringAfterCaptionExpr,$q,')')"/>
        <xsl:with-param name="colDimCumul" select="concat('substring-before(current()/@id,substring-after(substring-after(',$substringAfterExpr,$q,')',$q,'))')"/>
      </xsl:call-template>

    </xsl:if>

  </xsl:template>

  <!-- Variable colsOrder can come directly from the parameters or can be calculated during template generation -->
  <xsl:template match="generator:ColsOrderVar" mode="generateXSLT">
    <xsl:choose>
      <xsl:when test="$paramSet/xp:ColDimsOrder or $colFilter">
        <xsla:variable name="colsOrder" select="exslt:node-set($colsOrderFromColDimsOrder)/*"/>
      </xsl:when>
      <xsl:otherwise>
        <xsla:param name="colsOrder" select="$paramSet/xp:ColsOrder"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Per default copy all nodes from the template to the generated stylesheet -->
  <xsl:template match="@*|node()" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>
