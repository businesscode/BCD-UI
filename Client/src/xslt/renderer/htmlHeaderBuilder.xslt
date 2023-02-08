<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <xsl:variable name="paramSet" select="$paramModel//xp:HtmlBuilder[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!-- Here we define which rows to include -->
  <xsl:variable name="rowsIncluded">
    <xsl:choose>
      <xsl:when test="$showDeletedRows and $boolHideTotals">*[self::wrs:R[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')] | self::wrs:I[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')] | self::wrs:M[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')] | self::wrs:D[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')]]</xsl:when>
      <xsl:when test="$showDeletedRows">*[self::wrs:R | self::wrs:I | self::wrs:M | self::wrs:D]</xsl:when>
      <xsl:when test="$boolHideTotals">*[self::wrs:R[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')] | self::wrs:I[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')] | self::wrs:M[not(wrs:C[<xsl:value-of select="$headerColsNum"/>]/@bcdGr='1')]]</xsl:when>
      <xsl:otherwise>*[self::wrs:R | self::wrs:I | self::wrs:M]</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!-- For the max-cells limit, taking into account whether totals are excluded or hidden here -->
  <xsl:variable name="maxCells">
    <xsl:choose>
      <xsl:when test="$paramSet/xp:MaxCells"><xsl:value-of select="$paramSet/xp:MaxCells"/></xsl:when>
      <xsl:otherwise>500000</xsl:otherwise><!-- Default limit -->
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="maxRows">
    <xsl:choose>
      <xsl:when test="$boolHideTotals"><xsl:value-of select="$maxCells div count(/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1'))])"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="$maxCells div count(/*/wrs:Header/wrs:Columns/wrs:C)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!--
    (Integer) The number of header columns (i.e. number of dimensions).
    Set to 0 to deactivate the feature.
    If no value is given and wrs:Columns:wrs:C/@dimId attributes are detected, they are counted
  -->
  <xsl:variable name="headerColsCountDefault">
    <xsl:choose>
      <xsl:when test="string-length($paramSet/xp:HeaderColsCount) = 0 and $columnDefinitions[@dimId]">
        <xsl:value-of select="count($columnDefinitions[@dimId])"/>
      </xsl:when>
      <xsl:when test="string-length($paramSet/xp:HeaderColsCount) = 0">
        <xsl:value-of select="0"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$paramSet/xp:HeaderColsCount"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:param name="headerColsCount" select="$headerColsCountDefault"/>

  <xsl:variable name="headerColsAreUniqueDefault">
    <xsl:choose>
      <xsl:when test="string-length($paramSet/xp:HeaderColsAreUnique) = 0">
        <xsl:value-of select="'true'"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$paramSet/xp:HeaderColsAreUnique"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!--
    (Boolean) A boolean flag indicating if the header columns form
    a unique row key in the webRowSet.
   -->
  <xsl:param name="headerColsAreUnique" select="$headerColsAreUniqueDefault"/>

  <xsl:variable name="makeColSpanDefault">
    <xsl:choose>
      <xsl:when test="string-length($paramSet/xp:MakeColSpan) = 0">
        <xsl:value-of select="'true'"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$paramSet/xp:MakeColSpan"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  
  <!--
    (Boolean) Set to "true" to enable colspanning.
   -->
  <xsl:param name="makeColSpan" select="$makeColSpanDefault"/>

  <!--
    (Boolean) Show deleted rows
   -->
  <xsl:param name="showDeletedRows" select="boolean($paramSet/xp:ShowDeletedRows='true')"/>

  <!--
    (Boolean) Show hide totals (rows and columns)
   -->
  <xsl:param name="hideTotals" select="$paramSet/xp:HideTotals"/>
  <xsl:variable name="boolHideTotals" select="boolean(translate($hideTotals,'0false',''))"/>

  <xsl:param name="bcdControllerVariableName"/>

  <!-- For context switches -->
  <xsl:variable name="doc" select="/"/>

  <!--
    The document containing a mapping from sql type codes to readable names and
    numeric / string classification.
   -->
  <xsl:variable name="sqlTypesDoc" select="document('sqlTypes.xml')"/>

  <!--
    The number of header columns.
   -->
  <xsl:variable name="headerColsNum" select="number($headerColsCount)"/>

  <!--
    The column definition elements.
   -->
  <xsl:variable name="columnDefinitions" select="/*/wrs:Header/wrs:Columns/wrs:C[not($boolHideTotals) or not(contains(@id,'&#xE0F0;1'))]"/>
  <xsl:variable name="columnDefinitionsStr">
    <xsl:choose>
      <xsl:when test="$boolHideTotals">/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1'))]</xsl:when>
      <xsl:otherwise>/*/wrs:Header/wrs:Columns/wrs:C</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!--
    A boolean variable indicating if the output should have colspan. It is converted to a
    boolean from the respective input parameter.
   -->
  <xsl:variable name="hasColSpan" select="starts-with(string($makeColSpan), 'true')"/>

  <!--
    See "headerRowCount"
   -->
  <xsl:variable name="headerRowCount_raw">
    <xsl:for-each select="$columnDefinitions/@caption">
      <xsl:sort select="string-length(translate(., translate(., '|', ''), ''))" data-type="number" order="descending"/>
      <xsl:if test="position() = 1">
        <xsl:value-of select="string-length(translate(., translate(., '|', ''), '')) + 1"/>
      </xsl:if>
    </xsl:for-each>
  </xsl:variable>
  
  <!--
    Counts the number of header rows by splitting the column captions by pipe (|) and counting
    the tokens. The maximum number of tokens is then the header row count, in pseudo code
  
        headerRowCount =    MAX        [ Count[C/@caption, '|') ]
                          column C
  
    This means that if there are for example 3 header rows "country", "station", "facility"
    there must be columns with caption like "DE|CGN|CGN1".
    -->
  <xsl:variable name="headerRowCount" select="number($headerRowCount_raw)"/>

  <!--
    Copy template for stylesheet template
   -->
  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

  <!--
    Creates an XPath expression (for generating xsl:value-of or xsl:variable) which
    extracts the n-th part ("level" parameter) of a pipe-separated string. The latter
    comes from the "columnNameExpression" parameter which is "@caption" by default.
  
    Example:
  
       When level is set to "2" it is
  
          substring-before(concat(substring-after(@caption, '|'),'|'),'|')
  
       to extract the second token from the @caption attribute.
  
    This function is useful to display the header rows because the values of the
    header rows are concatenated in the header columns with pipe, for example
    "DE|CGN|CGN1" when the column dimensions are "country", "station", "facility".
   -->
  <xsl:template name="fetchValueOutOfPipeSeparatedListExpression">
    <xsl:param name="level"/>
    <xsl:param name="initialized" select="false()"/>
    <xsl:param name="columnNameExpression">@caption</xsl:param>
  
    <xsl:if test="not($initialized)">
      substring-before(concat(
    </xsl:if>
  
    <xsl:choose>
      <xsl:when test="$level &lt; 1">''</xsl:when>
      <xsl:when test="$level = 1"><xsl:value-of select="$columnNameExpression"/></xsl:when>
      <xsl:otherwise>
        substring-after(
          <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
            <xsl:with-param name="level" select="$level - 1"/>
            <xsl:with-param name="initialized" select="true()"/>
            <xsl:with-param name="columnNameExpression" select="$columnNameExpression"/>
          </xsl:call-template>
          , '|')
      </xsl:otherwise>
    </xsl:choose>
  
    <xsl:if test="not($initialized)">
      , '|'), '|')
    </xsl:if>
  </xsl:template>
  
  <!--
    Generates xsl:variable elements which are related to colspan. These elements are
    only generated when colspan is activated with the $makeColSpan parameter.
   -->
  <xsl:template match="generator:ColSpanVariables" mode="generateXSLT">
    <xsl:param name="level" select="1"/>
  
    <xsl:if test="$hasColSpan">
  
      <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">colSpanLevel<xsl:value-of select="$level"/></xsl:attribute>
  
        <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="select"><xsl:value-of select="$columnDefinitionsStr"/></xsl:attribute>
  
          <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="select">string-length(substring-before($columnOrderingList, concat(':', @pos, '|')))</xsl:attribute>
            <xsl:attribute name="data-type">number</xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">previousColumnIndex</xsl:attribute>
            <xsl:attribute name="select">
              number(substring-before(substring-after($columnOrderingListReversed, concat('|', @pos, '|')), '|'))
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">previousName</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
                <xsl:with-param name="columnNameExpression">
                  ../wrs:C[@pos = $previousColumnIndex]/@caption
                </xsl:with-param>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">previousId</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
                <xsl:with-param name="columnNameExpression">
                  ../wrs:C[@pos = $previousColumnIndex]/@id
                </xsl:with-param>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">levelUpId</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level -1"/>
                <xsl:with-param name="columnNameExpression">@id</xsl:with-param>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">previousLevelUpId</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level -1"/>
                <xsl:with-param name="columnNameExpression">../wrs:C[@pos = $previousColumnIndex]/@id</xsl:with-param>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">name</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
          <!-- We need the id to prevent Total/Empty captions to be spanned (can happen when they are together since both have an empty caption) -->
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">id</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
                <xsl:with-param name="columnNameExpression" select="'@id'"/>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="choose" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
              <!-- We need to prevent a span across empty and total. They share the same name but can be distinguished via contains($id,'&#xE0F0;0/1'), also we only span where two cells have the same parent -->
              <xsl:attribute name="test">$name = $previousName and position() > <xsl:value-of select="$headerColsCount"/> and (not(contains($id,'&#xE0F0;')) or $id=$previousId) and $levelUpId=$previousLevelUpId and (not(contains($id,'&#xE0F0;1') and $onlyMeasureForTotal))</xsl:attribute>
              <xsl:value-of select="'x'"/>
            </xsl:element>
            <xsl:element name="otherwise" namespace="http://www.w3.org/1999/XSL/Transform">
              <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="select">concat('|', @pos, ':x')</xsl:attribute>
              </xsl:element>
            </xsl:element>
          </xsl:element>
  
        </xsl:element>
        <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="select">'|'</xsl:attribute>
        </xsl:element>
      </xsl:element>
  
      <xsl:if test="$level &lt; $headerRowCount">
        <xsl:apply-templates select="." mode="generateXSLT">
          <xsl:with-param name="level" select="$level + 1"/>
        </xsl:apply-templates>
      </xsl:if>
    </xsl:if>
  </xsl:template>

  <!--
    This element is used to create an XSLT fragment for generating the header rows and
    cells. It generates the colspan and rowspan if appropriate and extracts the
    required token from the @caption attribute of the respective column header by splitting
    it by the pipe (|) symbol.
    The rows are generated by this template, the cells are created by the body inside
    the generator:ForEachHeaderRowAndCol element.
   -->
  <xsl:template match="generator:ForEachHeaderRowAndCol" mode="generateXSLT">
    <xsl:param name="level" select="1"/>
    <tr>

      <!-- add a @levelId to rows containing col dims -->
      <xsl:choose>
        <xsl:when test="$level != $headerRowCount">
          <xsla:attribute name="levelId">
            <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
              <xsl:attribute name="select">
                <xsl:text>substring-before(concat(</xsl:text>
                <xsl:for-each select="$doc/*/wrs:Header/descendant-or-self::*[position()&lt;$level]">substring-after(</xsl:for-each>
                <xsl:text>/*/wrs:Header/wrs:Columns/@colDimLevelIds</xsl:text>
                <xsl:for-each select="$doc/*/wrs:Header/descendant-or-self::*[position()&lt;$level]">,'|')</xsl:for-each>
                <xsl:text>,'|'),'|')</xsl:text>
              </xsl:attribute>
            </xsl:element>
          </xsla:attribute>
        </xsl:when>
        <xsl:otherwise>
          <xsla:attribute name="bcdRowIdent">bcdMeasureHeader</xsla:attribute>
        </xsl:otherwise>
      </xsl:choose>
      <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select"><xsl:value-of select="$columnDefinitionsStr"/></xsl:attribute>
  
        <xsl:apply-templates select="*[local-name()='sort']" mode="generateXSLT"/>
  
        <xsl:if test="$hasColSpan and $level != $headerRowCount">
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">previousColumnIndex</xsl:attribute>
            <xsl:attribute name="select">
              number(substring-before(substring-after($columnOrderingListReversed, concat('|', @pos, '|')), '|'))
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">previousName</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
                <xsl:with-param name="columnNameExpression">
                  ../wrs:C[@pos = $previousColumnIndex]/@caption
                </xsl:with-param>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
        </xsl:if>
  
        <!-- Let's see whether the current dimemsion member represents a sub-total value -->
        <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">isTotal</xsl:attribute>
          <xsl:attribute name="select">
            <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
              <xsl:with-param name="level" select="$level"/>
              <xsl:with-param name="columnNameExpression">@id</xsl:with-param>
            </xsl:call-template>
            ='&#xE0F0;1'
          </xsl:attribute>
        </xsl:element>
  
        <!-- This is the value being displayed -->
        <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">name</xsl:attribute>
          <xsl:attribute name="select">
            <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
              <xsl:with-param name="level" select="$level"/>
              <xsl:with-param name="columnNameExpression"><xsl:choose>
                <xsl:when test="$level=1 and (string($headerRowCount) = 'NaN' or $headerRowCount = 0)">concat(@caption,self::*[not(@caption)]/@id)</xsl:when>
                <xsl:otherwise>@caption</xsl:otherwise>
               </xsl:choose></xsl:with-param>
            </xsl:call-template>
          </xsl:attribute>
        </xsl:element>
  
        <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">levelUpId</xsl:attribute>
          <xsl:attribute name="select">
            <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
              <xsl:with-param name="level" select="$level -1"/>
              <xsl:with-param name="columnNameExpression">@id</xsl:with-param>
            </xsl:call-template>
          </xsl:attribute>
        </xsl:element>
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">id</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
                <xsl:with-param name="columnNameExpression">@id</xsl:with-param>
              </xsl:call-template>
            </xsl:attribute>
          </xsl:element>
  
        <xsla:variable name="level" select="{$level}"/>
        <xsla:variable name="isInnerMostDim" select="{concat($level = $headerRowCount - 1,'()')}"/>
        <xsla:variable name="isMeasure" select="{concat($level = $headerRowCount,'() or @valueId=@id')}"/>
  
        <xsl:if test="$hasColSpan">
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">colSpan</xsl:attribute>
            <xsl:attribute name="select">
              <xsl:choose>
                <xsl:when test="$level = $headerRowCount">
                  <xsl:value-of select="1"/>
                </xsl:when>
                <xsl:otherwise>
                  string-length(
                    substring-before(
                      substring-after(
                        $colSpanLevel<xsl:value-of select="$level"/>,
                        concat('|', @pos, ':')
                      ),
                      '|'
                    )
                  )
                </xsl:otherwise>
              </xsl:choose>
            </xsl:attribute>
          </xsl:element>
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">colRowCount</xsl:attribute>
            <xsl:attribute name="select">
              string-length(translate(@caption, translate(@caption, '|', ''), '')) + 1
            </xsl:attribute>
          </xsl:element>
  
          <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">rowSpan</xsl:attribute>
            <xsl:element name="choose" namespace="http://www.w3.org/1999/XSL/Transform">
  
              <!-- Rowspan. For "total" headers, we substract the number of non-total dim members at the beginning of @id from the number of all header rows
                   Subsequent cells we skip (because the top-most one is spanning)
                   In case of xp:OnlyMeasureForTotal, our top-most total cell spans down including the measures, we sho the measure name -->
              <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="test">$id='&#xE0F0;1' and $levelUpId='&#xE0F0;1'</xsl:attribute>
                <xsl:value-of select="0"/>
              </xsl:element>
              <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="test">$id='&#xE0F0;1' and $onlyMeasureForTotal</xsl:attribute>
                <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                  <xsl:attribute name="select">
                    <xsl:value-of select="$headerRowCount"/> - string-length(translate(substring-before(@id,'&#xE0F0;1|'), translate(@id, '|', ''), ''))
                  </xsl:attribute>
                </xsl:element>
              </xsl:element>
              <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="test">$id='&#xE0F0;1'</xsl:attribute>
                <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                  <xsl:attribute name="select">
                    <xsl:value-of select="$headerRowCount"/> - string-length(translate(substring-before(@id,'&#xE0F0;1|'), translate(@id, '|', ''), '')) -1
                  </xsl:attribute>
                </xsl:element>
              </xsl:element>
              <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="test">$levelUpId='&#xE0F0;1' and $onlyMeasureForTotal</xsl:attribute>
                <xsl:value-of select="0"/>
              </xsl:element>
  
              <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="test">
                  $colRowCount > <xsl:value-of select="$level"/>
                </xsl:attribute>
                <xsl:value-of select="1"/>
              </xsl:element>
              <xsl:element name="when" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="test">
                  $colRowCount = <xsl:value-of select="$level"/>
                </xsl:attribute>
                <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                  <xsl:attribute name="select">
                    <xsl:value-of select="$headerRowCount + 1"/> - $colRowCount
                  </xsl:attribute>
                </xsl:element>
              </xsl:element>
              <xsl:element name="otherwise" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:value-of select="0"/>
              </xsl:element>
            </xsl:element>
          </xsl:element>
        </xsl:if>
  
        <xsl:apply-templates select="*[local-name()!='sort']" mode="generateXSLT"/>
      </xsl:element>
  
    </tr>
  
    <xsl:if test="$level &lt; $headerRowCount">
      <xsl:apply-templates select="." mode="generateXSLT">
        <xsl:with-param name="level" select="$level + 1"/>
      </xsl:apply-templates>
    </xsl:if>
  </xsl:template>

  <!--
    Creates various variables used in the generated XSLT document.
   -->
  <xsl:param name="createHeaderFilters" select="false()"/>
  <xsl:param name="createFixHeader" select="false()"/>
  <xsl:param name="expandCollapseCells" select="false()"/>

  <!-- sticky table cells parameters -->  

  <xsl:param name="stickyHeader"    select="'false'"/>
  <xsl:param name="stickyFooter"    select="'false'"/>
  <xsl:param name="stickyDims"      select="'false'"/>
  <xsl:param name="stickyHeight"    select="''"/>
  <xsl:param name="stickyWidth"     select="''"/>
  <xsl:param name="stickyFirstCols" select="''"/>
  <xsl:param name="stickyFirstRows" select="''"/>
  <xsl:param name="stickyLastCols"  select="''"/>
  <xsl:param name="stickyLastRows"  select="''"/>

  <!-- inline chart -->
  <xsl:param name="inlineChart" select="boolean($paramSet/xp:InlineChart='true')"/>
  <xsl:param name="inlineChartInnerRowDim" select="boolean($paramSet/xp:InlineChartInnerRowDim='true')"/>
  <xsl:param name="inlineChartType1" select="$paramSet/xp:InlineChartType1"/>
  <xsl:param name="inlineChartType2" select="$paramSet/xp:InlineChartType2"/>
  <xsl:param name="inlineChartMinMaxRow" select="$paramSet/xp:InlineChartMinMaxRow"/>

  <xsl:template match="generator:VariablesForHeader" mode="generateXSLT">
  
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">headerColsNum</xsl:attribute>
      <xsl:value-of select="$headerColsNum"/>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">bcdControllerVariableName</xsl:attribute>
      <xsl:value-of select="$bcdControllerVariableName"/>
    </xsl:element>
    <xsla:variable name="boolHideTotals" select="{$boolHideTotals}()"/>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">onlyMeasureForTotal</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:OnlyMeasureForTotal='true'">true()</xsl:when>
          <xsl:otherwise>false()</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">maxRowsExceeded</xsl:attribute>
      <xsl:attribute name="select">/*/wrs:Footer/wrs:MaxRowsExceeded='true' or <xsl:value-of select="concat('count(/*/wrs:Data/',$rowsIncluded,') >= ', $maxRows -1)"/></xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">isCreateFixHeader</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:CreateFixHeader='true' or $createFixHeader='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">isExpandCollapseCells</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:ExpandCollapseCells='true' or $expandCollapseCells='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">isCreateHeaderFilters</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:CreateHeaderFilters='true' or $createHeaderFilters='true'"/>()</xsl:attribute>
    </xsl:element>

    <!-- sticky table cells parameters -->

    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyHeader</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:StickyHeader='true' or $stickyHeader='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyFooter</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:StickyFooter='true' or $stickyFooter='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyDims</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:StickyDims='true' or $stickyDims='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyHeight</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:StickyHeight!=''">'<xsl:value-of select="$paramSet/xp:StickyHeight"/>'</xsl:when>
          <xsl:when test="$stickyHeight!=''">'<xsl:value-of select="$stickyHeight"/>'</xsl:when>
          <xsl:otherwise>'0'</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyWidth</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:StickyWidth!=''">'<xsl:value-of select="$paramSet/xp:StickyWidth"/>'</xsl:when>
          <xsl:when test="$stickyWidth!=''">'<xsl:value-of select="$stickyWidth"/>'</xsl:when>
          <xsl:otherwise>'0'</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyFirstCols</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:StickyFirstCols!=''"><xsl:value-of select="$paramSet/xp:StickyFirstCols"/></xsl:when>
          <xsl:when test="$stickyFirstCols!=''"><xsl:value-of select="$stickyFirstCols"/></xsl:when>
          <xsl:otherwise>0</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyFirstRows</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:StickyFirstRows!=''"><xsl:value-of select="$paramSet/xp:StickyFirstRows"/></xsl:when>
          <xsl:when test="$stickyFirstRows!=''"><xsl:value-of select="$stickyFirstRows"/></xsl:when>
          <xsl:otherwise>0</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyLastCols</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:StickyLastCols!=''"><xsl:value-of select="$paramSet/xp:StickyLastCols"/></xsl:when>
          <xsl:when test="$stickyLastCols!=''"><xsl:value-of select="$stickyLastCols"/></xsl:when>
          <xsl:otherwise>0</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyLastRows</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:StickyLastRows!=''"><xsl:value-of select="$paramSet/xp:StickyLastRows"/></xsl:when>
          <xsl:when test="$stickyLastRows!=''"><xsl:value-of select="$stickyLastRows"/></xsl:when>
          <xsl:otherwise>0</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>

    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">stickyEnabled</xsl:attribute>
      <xsl:attribute name="select">$stickyHeader or $stickyFooter or $stickyDims or $stickyWidth!='0' or $stickyWidth!='0' or $stickyHeight!='0' or $stickyFirstRows!='0' or $stickyFirstCols!='0' or $stickyLastRows!='0' or $stickyLastCols!='0'</xsl:attribute>
    </xsl:element>

    <!-- inline chart parameters -->

    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">inlineChart</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:InlineChart='true' or $inlineChart='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">inlineChartInnerRowDim</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:InlineChartInnerRowDim='true' or $inlineChartInnerRowDim='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">inlineChartMinMaxRow</xsl:attribute>
      <xsl:attribute name="select"><xsl:value-of select="$paramSet/xp:InlineChartMinMaxRow='true' or $inlineChartMinMaxRow='true'"/>()</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">inlineChartType1</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:InlineChartType1!=''">'<xsl:value-of select="$paramSet/xp:InlineChartType1"/>'</xsl:when>
          <xsl:when test="$inlineChartType1!=''">'<xsl:value-of select="$inlineChartType1"/>'</xsl:when>
          <xsl:otherwise>''</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">inlineChartType2</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$paramSet/xp:InlineChartType2!=''">'<xsl:value-of select="$paramSet/xp:InlineChartType2"/>'</xsl:when>
          <xsl:when test="$inlineChartType2!=''">'<xsl:value-of select="$inlineChartType2"/>'</xsl:when>
          <xsl:otherwise>''</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

  <!--
    This template writes its element's body content to the output only if
    rowspan is set. Otherwise it does not produce any output.
  -->
  <xsl:template match="generator:OnlyIfColSpan" mode="generateXSLT">
    <xsl:if test="$hasColSpan">
      <xsl:apply-templates select="*" mode="generateXSLT"/>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>