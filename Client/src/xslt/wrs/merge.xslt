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
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <!-- The template merges two WRS - the input WRS + cDoc -->
  <!-- The cDoc is a subset of the input model - columns and rows can be removed or reordered  -->
  <!-- All changes made on the cDoc are merged into input WRS: delete, insert, update -->

  <xsl:import href="deleteRows.xslt" />
  <xsl:import href="insertRow.xslt" />

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- The changed document - WRS contains changes to merge into input WRS -->
  <xsl:param name="cDoc" select="/*[1=0]" />

  <xsl:key name="oDocId" match="/wrs:Wrs/wrs:Data/wrs:*" use="@id"/>

  <!-- ========================================================================================================= -->

  <xsl:variable name="oColumns" select="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C" /><!-- original (input) document columns -->
  <xsl:variable name="cColumns" select="$cDoc/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C" /><!-- changed document columns -->
  <xsl:variable name="oRows" select="/wrs:Wrs/wrs:Data/wrs:*" /><!-- original (input) document rows -->

  <xsl:variable name="nodesIds">
    <xsl:for-each select="/wrs:Wrs/wrs:Data/wrs:*"><xsl:value-of select="concat(normalize-space(@id),' ')"></xsl:value-of></xsl:for-each>
  </xsl:variable>

  <!-- Get rows which are exists in cDoc and not exists in source doc -->
  <xsl:variable name="missedRows">
    <xsl:for-each select="$cDoc/wrs:Wrs/wrs:Data/wrs:*">
      <xsl:variable name="id" select="@id"/>
      <xsl:if test="not(contains($nodesIds, concat(normalize-space($id),' ')))">
        <xsl:variable name="copiedRow" select="."/>
        <xsl:variable name="currentPosition" select="position()"/>
        <xsl:variable name="nodesAfter" select="$cDoc/wrs:Wrs/wrs:Data/wrs:*[position() &gt; $currentPosition and (contains($nodesIds, concat(normalize-space(@id),' ')))]"/>
        <xsl:choose>
          <xsl:when test="$nodesAfter">
            <xsl:variable name="_id" select="$nodesAfter[1]/@id"/>
            <xsl:apply-templates mode="copy" select="$copiedRow">
              <xsl:with-param name="placeTo"><xsl:value-of select="$_id"/></xsl:with-param>
            </xsl:apply-templates>
          </xsl:when>
          <xsl:otherwise>
            <xsl:apply-templates mode="copy" select="$copiedRow">
              <xsl:with-param name="placeTo">last_row</xsl:with-param>
            </xsl:apply-templates>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:if>
    </xsl:for-each>
  </xsl:variable>

  <!-- Copying rows with addding special attribute which indicates rowId in source document (new rows will be inserted before this) -->
  <xsl:template match="wrs:*" mode="copy">
    <xsl:param name="placeTo"/>
    <xsl:copy>
      <xsl:attribute name="placeTo"><xsl:value-of select="$placeTo"/></xsl:attribute>
      <xsl:apply-templates select="@*|node()" />
    </xsl:copy>
  </xsl:template>

  <!-- ========================================================================================================= -->

  <!-- standard copy template -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" />
    </xsl:copy>
  </xsl:template>

  <!-- ========================================================================================================= -->

  <!-- Copy header without any changes. -->
  <xsl:template match="wrs:Header">
    <xsl:copy-of select="." />
  </xsl:template>

  <!-- Copy RequestDocument without any changes. -->
  <xsl:template match="/*/wrs:RequestDocument">
    <xsl:copy-of select="." />
  </xsl:template>

  <!-- ========================================================================================================= -->

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:copy-of select="@*" />
      <xsl:choose>
        <xsl:when test="count(wrs:*) &gt; 0">
          <!-- original document contains rows - process it -->
          <xsl:apply-templates select="node()" />
          <!-- if the last row from the changed document processed - we process also the inserted rows from the end of the changed document -->
          <xsl:for-each select="exslt:node-set($missedRows)/wrs:*[@placeTo='last_row']">
            <xsl:call-template name="insert">
              <xsl:with-param name="cRow" select="." />
            </xsl:call-template>
          </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
          <!-- original document has no rows - insert all rows from changed document -->
          <xsl:for-each select="$cDoc/*/wrs:Data/wrs:*">
            <xsl:call-template name="insert">
              <xsl:with-param name="cRow" select="." />
            </xsl:call-template>
          </xsl:for-each>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:copy>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <xsl:template match="/*/wrs:Data/wrs:*">
    <xsl:variable name="id" select="@id" />
    <xsl:variable name="cRow" select="$cDoc/*/wrs:Data/wrs:*[@id = $id]" />
    <xsl:choose>
      <xsl:when test="not($cRow)">
        <!-- current row was not in the changed document -->
        <xsl:copy-of select="." />
      </xsl:when>
      <xsl:otherwise>
        <xsl:for-each select="exslt:node-set($missedRows)/wrs:*[@placeTo=$id]">
          <xsl:call-template name="insert">
            <xsl:with-param name="cRow" select="." />
          </xsl:call-template>
        </xsl:for-each>

        <!-- process current row -->
        <xsl:choose>
          <xsl:when test="local-name($cRow) = 'R'">
            <!-- current row found but not modified - restore if was deleted or modifed -->
            <xsl:call-template name="restore">
              <xsl:with-param name="row" select="." />
              <xsl:with-param name="cRow" select="$cRow" />
            </xsl:call-template>
          </xsl:when>
          <xsl:when test="local-name($cRow) = 'D'">
            <!-- current row found and was deleted -->
            <xsl:call-template name="delete">
              <xsl:with-param name="row" select="." />
              <xsl:with-param name="cRow" select="$cRow" />
            </xsl:call-template>
          </xsl:when>
          <xsl:when test="local-name($cRow) = 'M'">
            <!-- current row found and was modified -->
            <xsl:call-template name="modify">
              <xsl:with-param name="row" select="." />
              <xsl:with-param name="cRow" select="$cRow" />
            </xsl:call-template>
          </xsl:when>
          <xsl:when test="local-name($cRow) = 'I'">
            <!-- inserted row was already merged -->
            <xsl:call-template name="mergeInsert">
              <xsl:with-param name="row" select="." />
              <xsl:with-param name="cRow" select="$cRow" />
            </xsl:call-template>
          </xsl:when>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ========================================================================================================= -->

  <!-- Insert a new row. -->
  <xsl:template name="insert">
    <xsl:param name="cRow" /><!-- the inserted row from the changed document -->
    <wrs:I>
      <xsl:copy-of select="$cRow/@*" />
      <!-- for each original column -->
      <xsl:for-each select="$oColumns">
        <xsl:variable name="columnId" select="@id" />
        <xsl:variable name="cColumnIndex" select="number($cColumns[@id = $columnId]/@pos)" />
        <xsl:choose>
          <xsl:when test="$cColumnIndex">
            <!-- copy column-value from the changed document -->
            <xsl:copy-of select="$cRow/wrs:C[$cColumnIndex]" />
          </xsl:when>
          <xsl:otherwise>
            <!-- add a default column value -->
            <wrs:C>
              <xsl:apply-templates select="." mode="getDefaultValue" /><!-- from insertRow.xslt -->
            </wrs:C>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </wrs:I>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <!-- Delete a row. -->
  <xsl:template name="delete">
    <xsl:param name="row" /><!-- the row to delete from the input document -->
    <xsl:param name="cRow" /><!-- the deleted row from the changed document -->
    <xsl:apply-templates select="$row" mode="deleteRow" /><!-- from deleteRows.xslt -->
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <!-- Modify a row. -->
  <xsl:template name="modify">
    <xsl:param name="row" /><!-- the row to modify from the input document -->
    <xsl:param name="cRow" /><!-- the modified row from the changed document -->
    <wrs:M>
      <xsl:copy-of select="$row/@*" />
      <!-- for each original column -->
      <xsl:for-each select="$oColumns">
        <xsl:variable name="columnId" select="@id" />
        <xsl:variable name="oColumnIndex" select="number(@pos)" />
        <xsl:variable name="cColumnIndex" select="number($cColumns[@id = $columnId]/@pos)" />
        <xsl:choose>
          <xsl:when test="$cColumnIndex">
            <!-- copy column-value from the changed document -->
            <xsl:copy-of select="$cRow/wrs:C[$cColumnIndex]" />
            <xsl:copy-of select="$cRow/wrs:O[$cColumnIndex]" />
          </xsl:when>
          <xsl:otherwise>
            <!-- copy column-value from the original document -->
            <xsl:copy-of select="$row/wrs:C[$oColumnIndex]" />
            <wrs:O>
              <xsl:copy-of select="$row/wrs:C[$oColumnIndex]/@*" />
              <xsl:value-of select="$row/wrs:C[$oColumnIndex]" />
            </wrs:O>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </wrs:M>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <!-- Merge values for an inserted row. -->
  <xsl:template name="mergeInsert">
    <xsl:param name="row" /><!-- the row to modify from the input document -->
    <xsl:param name="cRow" /><!-- the modified row from the changed document -->
    <wrs:I>
      <xsl:copy-of select="$row/@*" />
      <!-- for each original column -->
      <xsl:for-each select="$oColumns">
        <xsl:variable name="columnId" select="@id" />
        <xsl:variable name="oColumnIndex" select="number(@pos)" />
        <xsl:variable name="cColumnIndex" select="number($cColumns[@id = $columnId]/@pos)" />
        <xsl:choose>
          <xsl:when test="$cColumnIndex">
            <!-- copy column-value from the changed document -->
            <xsl:copy-of select="$cRow/wrs:C[$cColumnIndex]" />
          </xsl:when>
          <xsl:otherwise>
            <!-- copy column-value from the original document -->
            <xsl:copy-of select="$row/wrs:C[$oColumnIndex]" />
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </wrs:I>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <!-- Merge values for an inserted row. -->
  <xsl:template name="restore">
    <xsl:param name="row" /><!-- the row to modify from the input document -->
    <xsl:param name="cRow" /><!-- the modified row from the changed document -->
    <xsl:choose>
      <xsl:when test="local-name($row) = 'D'"><!-- restore if was deleted -->
        <wrs:R>
          <xsl:copy-of select="$row/@*|$row/wrs:C" />
        </wrs:R>
      </xsl:when>
      <xsl:when test="local-name($row) = 'M'"><!-- restore if was modifed -->
        <wrs:R>
          <xsl:copy-of select="$row/@*" />
          <xsl:for-each select="$row/wrs:O">
            <wrs:C>
              <xsl:apply-templates select="@*|node()" />
            </wrs:C>
          </xsl:for-each>
        </wrs:R>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy-of select="$row" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ========================================================================================================= -->

</xsl:stylesheet>