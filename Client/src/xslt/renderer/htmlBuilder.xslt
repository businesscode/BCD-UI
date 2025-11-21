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
<!--

  This stylesheet creates an HTML table from a Wrs document. It can either produce
  HTML directly (which is the default) or put the HTML inside XML to support further
  processing. It can do row- and colspans for documents that have a grouping in the
  first n columns. The colspans require that the header columns have pipe-separated
  captions for each column dimension. Additionally it is responsible for sorting rows
  and columns and formatting numeric values.

  Customization:
  To add specific cell renderer, just
  1) import this stylesheet, 2) overwrite template match="/*", 3) add namespace-alias for xsla
  and 4) put your specific cell renderers before your closing xsla:stylesheet.

  Limitations: TODO
  - hideTotals cannot be combined with colSort and must be combined with colSpan.
  - rowSpan=true and rowSort=false cannot be combined
  - makeRowSpan=false leads to wrong number format (% stay 0.93)
-->
<xsl:stylesheet version="1.0"
  xmlns:html="http://www.w3.org/1999/xhtml"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <xsl:import href="htmlHeaderBuilder.xslt"/>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:variable name="rowsIncludedWithMaxRowLimit">
    <xsl:value-of select="concat($rowsIncluded,' [position() &lt;= ', $maxRows, ']')"/>
  </xsl:variable>

<xsl:variable name="sortTotalsFirstDefault">
  <xsl:choose>
    <xsl:when test="string-length($paramSet/xp:SortTotalsFirst) = 0">
      <xsl:value-of select="'false'"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$paramSet/xp:SortTotalsFirst"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:variable>

<!--
  (Boolean) A boolean value controlling if the total rows should
  come first.
 -->
<xsl:param name="sortTotalsFirst" select="$sortTotalsFirstDefault"/>

<!-- standard or accounting -->
<xsl:param name="numberFormattingOption">
  <xsl:choose>
    <xsl:when test="string-length($paramSet/xp:NumberFormattingOption) = 0">standard</xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$paramSet/xp:NumberFormattingOption"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:param>

<!--
  (Boolean) This can be set to 'false' if the columns are already sorted
  correctly and do not need to be sorted anymore. The default value is 'true'.
  Please note that if 'makeColSpan' is set to 'true' and this 'sortCols' is
  set to 'false' the columns must be ordered properly.
 -->
<xsl:variable name="sortColsDefault">
  <xsl:choose>
    <xsl:when test="string-length($paramSet/xp:SortCols) = 0">
      <xsl:value-of select="'true'"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$paramSet/xp:SortCols"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:variable>
<xsl:param name="sortCols" select="$sortColsDefault"/>
<xsl:variable name="boolSortCols" select="boolean(translate($sortCols,'0false',''))"/>

<!--
  (Boolean) This can be set to 'false' if the rows should not be sorted.
 -->
<xsl:variable name="sortRowsDefault">
  <xsl:choose>
    <xsl:when test="string-length($paramSet/xp:SortRows) = 0">
      <xsl:value-of select="'true'"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$paramSet/xp:SortRows"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:variable>
<xsl:param name="sortRows" select="$sortRowsDefault"/>

<xsl:variable name="makeRowSpanDefault">
  <xsl:choose>
    <xsl:when test="string-length($paramSet/xp:MakeRowSpan) = 0">
      <xsl:value-of select="'true'"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$paramSet/xp:MakeRowSpan"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:variable>

<!--
  (Boolean) Set to "true" to enable rowspanning.
 -->
<xsl:param name="makeRowSpan" select="$makeRowSpanDefault"/>

<xsl:template match="generator:ColumnDefinitionLookupKey" mode="generateXSLT">
  <xsla:key name="columnDefinitionLookup" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
</xsl:template>

<xsl:template match="generator:ForEachRow" mode="generateXSLT">
  <xsla:for-each select="{concat('/*/wrs:Data/',$rowsIncluded)}">
    <xsl:apply-templates mode="generateXSLT"/>
  </xsla:for-each>
</xsl:template>

<xsl:template match="generator:ForEachRowWithMaxRowLimit" mode="generateXSLT">
  <xsla:for-each select="{concat('/*/wrs:Data/',$rowsIncludedWithMaxRowLimit)}">
    <xsl:apply-templates mode="generateXSLT"/>
  </xsla:for-each>
</xsl:template>

<!--
  (Boolean) True if the HTML table should be returned as XML document instead of HTML.
            This feature is useful when the HTML should be further processed.
 -->
<xsl:param name="outputXML">false</xsl:param>

<xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

<!--
  The base XSLT document for the output of the stylesheet.
 -->
<xsl:variable name="htmlBuilderTemplate" select="document('htmlBuilderTemplate.xslt')"/>
<xsl:variable name="htmlHeaderBuilderTemplate" select="document('htmlHeaderBuilderTemplate.xslt')"/>

<!--
  A boolean variable indicating if the output should have rowspan. It is converted to a
  boolean from the respective input parameter.
 -->
<xsl:variable name="hasRowSpan" select="starts-with(string($makeRowSpan), 'true')"/>

<!--
  This boolean flag indicates if the row dimensions are uniquely identifying a row. If
  this is not the case an additional column is used to make it unique.
 -->
<xsl:variable name="headerColsUnique" select="starts-with(string($headerColsAreUnique), 'true')"/>


<!--
  (String) i18n key for empty Report (default is bcd_emptyReport)
 -->
<xsl:variable name="emptyMessage">
  <xsl:choose>
    <xsl:when test="string-length($paramSet/xp:EmptyMessage) = 0">
      <xsl:value-of select="'bcd_EmptyReport'"/>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$paramSet/xp:EmptyMessage"/>
    </xsl:otherwise>
  </xsl:choose>
</xsl:variable>

<!-- ========================================================================================
                                           Templates
     ======================================================================================== -->


<!--
  Root template
 -->
<xsl:template match="/*">
  <xsla:stylesheet>
    <xsl:copy-of select="$htmlBuilderTemplate/*/@*"/>
    <xsl:comment>Generated htmlBuilder</xsl:comment>

    <!-- We make sure that no logic is applied if there is not data
      Makes it faster and logic can rely on data being existing
     -->
    <xsl:choose>
      <xsl:when test="/*/wrs:Data/wrs:*/wrs:*">
        <xsl:apply-templates select="$htmlBuilderTemplate/*/*" mode="generateXSLT"/>
        <xsl:apply-templates select="$htmlHeaderBuilderTemplate/*/*[local-name()!='import']" mode="generateXSLT"/>
      </xsl:when>
      <xsl:otherwise>
        <xsla:output method="html" encoding="UTF-8" indent="no"/>
        <xsla:template match="/*">
          <div class="bcdInfoBox"><span bcdTranslate="{$emptyMessage}"></span></div>
        </xsla:template>
      </xsl:otherwise>
    </xsl:choose>

  </xsla:stylesheet>
</xsl:template>

<!--
  Copy template for stylesheet template
 -->
<!-- <xsl:template match="node()|@*" mode="generateXSLT">
  <xsl:copy><xsl:apply-templates select="node()|@*" mode="generateXSLT"/></xsl:copy>
</xsl:template>
 -->
<!--
  The xsl:output element of the stylesheet can be modified when the parameter
  $outputXML is set to "true" (false by default). Then the output element is
  modified to "XML" instead of "HTML".
 -->
<xsl:template match="*[local-name()='output']" mode="generateXSLT">
  <xsl:element name="output" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:copy-of select="@*"/>
    <xsl:if test="$outputXML = 'true'">
      <xsl:attribute name="method">xml</xsl:attribute>
    </xsl:if>
  </xsl:element>
</xsl:template>

<!--
  Creates a list of <xsl:sort> elements with on <xsl:sort> for each row dimension.
  The sorting is based on the "@caption" attribute.
 -->
<xsl:template match="generator:SortCols" mode="generateXSLT">
  <xsl:param name="level" select="1"/>

  <xsl:if test="starts-with(string($sortCols), 'true')">

    <xsl:if test="$level = 1">
      <!--
        The first (outermost) sorting is by number of pipe symbols. This assures
        that the row measures (with no pipe symbols) come before the cell measures.
       -->
      <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select">
          string-length(translate(@caption, translate(@caption, '|', ''), ''))
          <xsl:if test="string($headerRowCount) != 'NaN'">
            * number(number(@pos) > <xsl:value-of select="$headerColsNum"/>)
          </xsl:if>
        </xsl:attribute>
        <xsl:attribute name="data-type">number</xsl:attribute>
      </xsl:element>
    </xsl:if>

    <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="select">
        <xsl:if test="string($headerRowCount) != 'NaN'">
          substring(
        </xsl:if>
        <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
          <xsl:with-param name="level" select="$level"/>
          <xsl:with-param name="columnNameExpression">@caption</xsl:with-param>
        </xsl:call-template>
        <xsl:if test="string($headerRowCount) != 'NaN'">
          , 1 div boolean(number(@pos) > <xsl:value-of select="$headerColsNum"/>)
          )
        </xsl:if>
      </xsl:attribute>
      <xsl:if test="$level &lt;= $headerRowCount">
        <xsl:attribute name="data-type">{
          substring-before(
            substring(
              'text|number|',
              1 + number($dim<xsl:value-of select="$level"/>Numeric) * 5
            )
            , '|'
          )
        }</xsl:attribute>
      </xsl:if>
    </xsl:element>

    <xsl:if test="$level &lt; $headerRowCount">
      <xsl:apply-templates select="." mode="generateXSLT">
        <xsl:with-param name="level" select="$level + 1"/>
      </xsl:apply-templates>
    </xsl:if>
  </xsl:if>
</xsl:template>


<!--
  A utility function to generate a concatenated pipe-separated string from a
  number of dimension columns. It is used to generate row/column dimension
  keys and the respective key(...) statements.
 -->
<xsl:template name="createSimpleDimensionExpression">
  <xsl:param name="dimCount"/>
  <xsl:variable name="separator">, '|', </xsl:variable>
  <xsl:value-of select="'concat('"/>
  <xsl:for-each select="$columnDefinitions[position() &lt;= $dimCount]">
    <xsl:if test="position() > 1"><xsl:value-of select="$separator"/></xsl:if>
    <xsl:value-of select="concat('wrs:C[', position(), ']')"/>
    <xsl:value-of select="$separator"/>
    <xsl:value-of select="concat('wrs:C[', position(), ']/@bcdGr')"/>
  </xsl:for-each>
  <xsl:value-of select="')'"/>
</xsl:template>


<xsl:template match="generator:VariablesForBody" mode="generateXSLT">

  <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="name">headerOffsetValue</xsl:attribute>
    <xsl:choose>
      <xsl:when test="$headerColsNum > 0">
        <xsl:value-of select="$headerColsNum - 1"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="0"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:element>
  <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="name">numericSQLTypes</xsl:attribute>
    <xsl:value-of select="' '"/>
    <xsl:for-each select="$sqlTypesDoc/*/rnd:Numeric/rnd:Type">
      <xsl:value-of select="concat(@name, ' ')"/>
    </xsl:for-each>
  </xsl:element>
  <xsl:if test="$hasRowSpan">
    <xsl:for-each select="$columnDefinitions[position() &lt;= $headerColsNum - number($headerColsUnique)]">
      <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">rowDimKey_Level<xsl:value-of select="position()"/></xsl:attribute>
        <xsl:attribute name="match">
          <xsl:value-of select="concat('/*/wrs:Data/',$rowsIncluded)"/>
        </xsl:attribute>
        <xsl:attribute name="use">
          <xsl:call-template name="createSimpleDimensionExpression">
            <xsl:with-param name="dimCount" select="position()"/>
          </xsl:call-template>
        </xsl:attribute>
      </xsl:element>
    </xsl:for-each>
  </xsl:if>

  <xsl:call-template name="numericColumnDimensionBooleanVariables"/>
  
  <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="name">numberFormattingOption</xsl:attribute>
    <xsl:value-of select="$numberFormattingOption"/>
  </xsl:element>

  <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="name">dims</xsl:attribute>
    <xsl:value-of select="count($columnDefinitions[@dimId])"/>
  </xsl:element>
  <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="name">measures</xsl:attribute>
    <xsl:value-of select="count($columnDefinitions[not(@dimId)])"/>
  </xsl:element>

</xsl:template>

<!--
  This template generates a variable "dimXXXNumeric" for each column dimension
  where XXX stands for the number of the dimension. This variable is a boolean
  value which indicates if all values of this column dimension are numbers. In
  that case the boolean is true, otherwise false. This information is required,
  because there is no meta data element for header rows (<wrs:R> elements) so
  that the string / numeric sorting can only be decided by testing if all values
  are numbers.
 -->
<xsl:template name="numericColumnDimensionBooleanVariables">
  <xsl:param name="level" select="1"/>
  <xsl:if test="$level &lt;= $headerRowCount">
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">dim<xsl:value-of select="$level"/>Numeric_raw</xsl:attribute>
      <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select"><xsl:value-of select="$columnDefinitionsStr"/>[contains(@caption, '|')]</xsl:attribute>
        <xsl:element name="if" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="test">
            normalize-space(
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
              </xsl:call-template>
            ) != ''
            and
            string(number(
              <xsl:call-template name="fetchValueOutOfPipeSeparatedListExpression">
                <xsl:with-param name="level" select="$level"/>
              </xsl:call-template>
            )) = 'NaN'
          </xsl:attribute>
          <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="select">'x'</xsl:attribute>
          </xsl:element>
        </xsl:element>
      </xsl:element>
    </xsl:element>

    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">dim<xsl:value-of select="$level"/>Numeric</xsl:attribute>
      <xsl:attribute name="select">string-length($dim<xsl:value-of select="$level"/>Numeric_raw) = 0</xsl:attribute>
    </xsl:element>

    <xsl:call-template name="numericColumnDimensionBooleanVariables">
      <xsl:with-param name="level" select="$level + 1"/>
    </xsl:call-template>
  </xsl:if>
</xsl:template>

<!--
  Generates an xsl:template element for each row dimension matching the
  respeective level. The content of the generated xsl:element is taken from
  the body of the generator:MatchHeaderColumn element.
 -->
<xsl:template match="generator:MatchHeaderColumn" mode="generateXSLT">
  <xsl:variable name="content" select="."/>
  <xsl:for-each select="$columnDefinitions[position() &lt;= $headerColsNum]">
    <xsl:element name="template" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="match">
        <xsl:value-of select="$rowsIncluded"/>
        <xsl:if test="position() &lt; -$headerColsNum">
          [
            generate-id() = generate-id(
              key(
                'rowDimKey_Level<xsl:value-of select="position()"/>',
                <xsl:call-template name="createSimpleDimensionExpression">
                  <xsl:with-param name="dimCount" select="position()"/>
                </xsl:call-template>
              )
            )
          ]
        </xsl:if>
        /wrs:C[<xsl:value-of select="position()"/>]
      </xsl:attribute>
      <xsla:param name="isInnerMostDim" select="{concat(position()=$headerColsNum,'()')}"/>
      <xsl:apply-templates select="$content/node()" mode="generateXSLT"/>
    </xsl:element>
  </xsl:for-each>
</xsl:template>

<!--
  Creates <xsl:sort> elements for sorting wrs:R rows by the row dimensions.
 -->
<xsl:template match="generator:SortRows" mode="generateXSLT">
  <xsl:if test="starts-with(string($sortRows), 'true')">
    <xsl:for-each select="$columnDefinitions[position() &lt;= $headerColsNum]">
      <xsl:variable name="level" select="position()"/>
      <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select">
          wrs:C[<xsl:value-of select="position()"/>]/@bcdGr='1'
        </xsl:attribute>
        <xsl:if test="starts-with(string($sortTotalsFirst), 'true')">
          <xsl:attribute name="order">descending</xsl:attribute>
        </xsl:if>
      </xsl:element>
        <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="select">
            wrs:C[<xsl:value-of select="position()"/>]
          </xsl:attribute>
          <xsl:if test="@type-name = $sqlTypesDoc/*/wrs:Numeric/wrs:Type/@name">
            <xsl:attribute name="data-type">number</xsl:attribute>
          </xsl:if>
        </xsl:element>
    </xsl:for-each>
  </xsl:if>
</xsl:template>

<!--
  This template loops over all row dimension columns with nested <xsl:for-each>
  elements using the respective keys. It then calls <xsl:apply-templates/> for
  each row to be generated in the output.
  This function is only useful when there are rowspans for the row dimension
  columns. Otherwise sorting is sufficient.
 -->
<xsl:template match="generator:LoopOverAllHeaderCols" mode="generateXSLT">
  <xsl:param name="level" select="1"/>

  <xsl:variable name="keyExpression">
    key(
      'rowDimKey_Level<xsl:value-of select="$level"/>',
      <xsl:call-template name="createSimpleDimensionExpression">
        <xsl:with-param name="dimCount" select="$level"/>
      </xsl:call-template>

    )
  </xsl:variable>
  <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="select">
      <xsl:choose>
        <xsl:when test="$level = 1"><xsl:value-of select="$rowsIncludedWithMaxRowLimit"/></xsl:when>
        <xsl:otherwise>$level<xsl:value-of select="$level - 1"/>Rows</xsl:otherwise>
      </xsl:choose>
      <xsl:if test="$level &lt; $headerColsNum">
        [generate-id() = generate-id(<xsl:value-of select="$keyExpression"/>)]
      </xsl:if>
    </xsl:attribute>

    <!-- Optional sorting of rows and totals -->
    <xsl:if test="starts-with(string($sortRows), 'true') and $level &lt;= $headerColsNum">
      <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select">
          wrs:C[<xsl:value-of select="$level"/>]/@bcdGr='1'
        </xsl:attribute>
        <xsl:if test="starts-with(string($sortTotalsFirst), 'true')">
          <xsl:attribute name="order">descending</xsl:attribute>
        </xsl:if>
      </xsl:element>
      <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select">
          wrs:C[<xsl:value-of select="$level"/>]
        </xsl:attribute>
        <xsl:if test="$columnDefinitions[$level]/@type-name = $sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name">
          <xsl:attribute name="data-type">number</xsl:attribute>
        </xsl:if>
      </xsl:element>
    </xsl:if>

    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">
        <xsl:value-of select="concat('positionLevel', $level)"/>
      </xsl:attribute>
      <xsl:attribute name="select">position()</xsl:attribute>
    </xsl:element>
    <xsl:choose>
      <xsl:when test="$level >= $headerColsNum">
        <xsl:element name="apply-templates" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="select">.</xsl:attribute>
          <!-- Usefull param when template is overwritten -->
          <xsl:element name="with-param" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">pos</xsl:attribute>
            <xsl:attribute name="select">position()</xsl:attribute>
          </xsl:element>
          <xsl:for-each select="$columnDefinitions[position() &lt; $headerColsNum]">
            <xsl:variable name="rowSpanLevel" select="position()"/>
            <xsl:element name="with-param" namespace="http://www.w3.org/1999/XSL/Transform">
              <xsl:attribute name="name">rowSpanSize<xsl:value-of select="position()"/></xsl:attribute>
              <xsl:attribute name="select">
                $level<xsl:value-of select="position()"/>RowsCount
                <xsl:for-each select="$columnDefinitions[position() &lt;= $headerColsNum]">
                  <xsl:if test="position() > $rowSpanLevel">
                    * number($positionLevel<xsl:value-of select="position()"/> = 1)
                  </xsl:if>
                </xsl:for-each>
              </xsl:attribute>
            </xsl:element>
          </xsl:for-each>
        </xsl:element>
      </xsl:when>
      <xsl:otherwise>
        <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">
            <xsl:value-of select="concat('level', $level, 'Rows')"/>
          </xsl:attribute>
          <xsl:attribute name="select">
            <xsl:value-of select="$keyExpression"/>
          </xsl:attribute>
        </xsl:element>
        <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">
            <xsl:value-of select="concat('level', $level, 'RowsCount')"/>
          </xsl:attribute>
          <xsl:attribute name="select">
            <xsl:value-of select="concat('count($level', $level, 'Rows)')"/>
          </xsl:attribute>
        </xsl:element>
        <xsl:apply-templates select="." mode="generateXSLT">
          <xsl:with-param name="level" select="$level + 1"/>
        </xsl:apply-templates>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:element>

</xsl:template>

<!--
  This template writes its element's body content to the output only if
  rowspan is set. Otherwise it does not produce any output.
-->
<xsl:template match="generator:OnlyIfRowSpan" mode="generateXSLT">
  <xsl:if test="$hasRowSpan">
    <xsl:apply-templates select="*" mode="generateXSLT"/>
  </xsl:if>
</xsl:template>

<!--
  The inverse functionality to OnlyIfRowSpan.
 -->
<xsl:template match="generator:IfNoRowSpan" mode="generateXSLT">
  <xsl:if test="not($hasRowSpan)">
    <xsl:apply-templates select="*" mode="generateXSLT"/>
  </xsl:if>
</xsl:template>

<!--
  Generates the <xsl:param> elements for the template matching <wrs:R> in
  case there is rowspan. This is required, because the number of rowspan
  columns is dynamic.
 -->
<xsl:template match="generator:RowSpanParameters" mode="generateXSLT">
  <xsl:if test="$hasRowSpan">
    <xsl:for-each select="$columnDefinitions[position() &lt; $headerColsNum]">
      <xsl:element name="param" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">rowSpanSize<xsl:value-of select="position()"/></xsl:attribute>
        <xsl:attribute name="select">1</xsl:attribute>
      </xsl:element>
    </xsl:for-each>
  </xsl:if>
</xsl:template>

<!--
  Generates the <apply-templates> elements for the content of a whole row (<wrs:R>/*)
  of data. This cannot be statically defined in htmlBuilderTemplate, because the number
  of rowspan columns is dynamically determined.
 -->
<xsl:template match="generator:ApplyColumnValues" mode="generateXSLT">
  <xsl:if test="$hasRowSpan">
    <xsl:for-each select="$columnDefinitions[position() &lt; $headerColsNum]">
      <xsl:element name="apply-templates" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select">wrs:C[<xsl:value-of select="position()"/>][not(@bcdGr='1')]</xsl:attribute>
        <xsl:element name="with-param" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">rowSpan</xsl:attribute>
          <xsl:attribute name="select">$rowSpanSize<xsl:value-of select="position()"/></xsl:attribute>
        </xsl:element>
        <xsla:with-param name="rowTotalCss" select="$rowTotalCss"/>
      </xsl:element>
    </xsl:for-each>
  </xsl:if>
  <xsl:element name="apply-templates" namespace="http://www.w3.org/1999/XSL/Transform">
    <xsl:attribute name="select">wrs:C
      <xsl:if test="$boolHideTotals">[not(contains(key('colHeadByPos',position())/@id,'&#xE0F0;1'))]</xsl:if>
      <xsl:if test="string($headerColsNum) != 'NaN' and $headerColsNum > 0 and $hasRowSpan">[position() > <xsl:value-of select="$headerColsNum - 1"/>]</xsl:if>
    </xsl:attribute>
    <xsla:with-param name="rowTotalCss" select="$rowTotalCss"/>
    <!-- TODO this is the reason why sort cols and hideTotals cannot be combined.
      If hideTotals=true, these columns are skipped and their position here does not fit anymore to the entry in columnOrderingList.
      One would need to say that columns missing in $columnOrderingList are skipped by that mechanism
      -->
    <xsl:if test="$boolSortCols">
      <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="select">string-length(substring-before($columnOrderingList, concat(':',position()<xsl:if test="string($headerColsNum) != 'NaN' and $headerColsNum > 0 and $hasRowSpan">+ <xsl:value-of select="$headerColsNum - 1"/>
            </xsl:if>
            , '|')))
        </xsl:attribute>
        <xsl:attribute name="data-type">number</xsl:attribute>
      </xsl:element>
    </xsl:if>
  </xsl:element>
</xsl:template>

</xsl:stylesheet>