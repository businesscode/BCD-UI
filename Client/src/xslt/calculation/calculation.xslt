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
  Translates calc expressions into <xsl:value-of select="xPath"/>
  Understands below operators and functions
  Operators can have any number of childs, all connected via the operator
  Functions have a defined number of childs, all others are ignored
  Note: $colPos and $customId are needed by some style-sheets importing (virt dim member etc) this, do not remove them
  -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="doc" select="/"/>
  <xsl:variable name="operatorsString">
    <Operators>
      <Add>+</Add>
      <Sub> - </Sub>
      <Mul>*</Mul>
      <Div> div </Div>
    </Operators>
  </xsl:variable>
  <xsl:variable name="operators" select="exslt:node-set($operatorsString)"/>
  <xsl:variable name="functionsString">
    <Functions>
      <Max>substring-before(concat(normalize-space(concat(substring(<V p="2"/>,0,1div(<V p="1"/>><V p="2"/>)),' ',<V p="1"/>)),' '),' ')</Max>
      <Min>substring-before(concat(normalize-space(concat(substring(<V p="2"/>,0,1div(<V p="2"/>><V p="1"/>)),' ',<V p="1"/>)),' '),' ')</Min>
      <Coa>concat(translate(number(<V p="1"/>),'aN',''),substring(<V p="2"/>, 0,1div(string(number(V p="1"))!='NaN'))</Coa>
      <Zin>translate(number(<V p="1"/>),'aN','0')</Zin>
      <Niz>substring(<V p="1"/>,0,1div(<V p="1"/>=0))</Niz>
      <Abs>translate(<V p="1"/>,'-','')</Abs>
      <Igt>boolean(<V p="1"/>><V p="2"/>)</Igt> <!-- One (true), if 1 greater than 2, otherwise 0. You can use -1 div 0 for p="2" to make 1 if number, 0 otherwise -->
      <Ian>boolean(string(number(<V p="1"/>))!='NaN')</Ian> <!-- One (true), if a number, 0 (false) otherwise -->
      <Sgn>concat(translate(<V p="1"/>,'0123456789,.',''),1)</Sgn> <!-- evaluates to -1 or +1, depending on sign -->
    </Functions>
  </xsl:variable>
  <xsl:variable name="functions" select="exslt:node-set($functionsString)"/>

  <!-- Default mode -> entry to handle a calculation -->
  <xsl:template match="calc:Calc" mode="calc">
    <xsl:param name="colPos" select="- 1"/>
    <xsl:param name="customId"/>
    <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="select">
        <!--
          A calc:Calc/@zeroIfNullOp='true' indicates that each calc::ValueRefs become 0 when evaluating to NaN.
          Yet: In case ALL calc:ValueRef evaluate to NaN, the overall calc result will still be NaN.
         -->
        <xsl:choose>
          <xsl:when test="@zeroIfNullOp='true'">
            <xsl:text>number(substring(</xsl:text>
            <xsl:apply-templates select="*" mode="calc">
              <xsl:with-param name="colPos" select="$colPos"/>
              <xsl:with-param name="customId" select="$customId"/>
            </xsl:apply-templates>
            <xsl:text>,0,</xsl:text>
            <xsl:text>string-length(translate(concat(''</xsl:text>
            <xsl:for-each select=".//calc:ValueRef">
              <xsl:text>,</xsl:text>
              <xsl:apply-templates select="." mode="calc">
                <xsl:with-param name="plain" select="true()"/>
                <xsl:with-param name="colPos" select="$colPos"/>
                <xsl:with-param name="customId" select="$customId"/>
              </xsl:apply-templates>
            </xsl:for-each>
            <xsl:text>),'aN',''))*1000))</xsl:text>
          </xsl:when>
          <xsl:otherwise>
            <xsl:apply-templates select="*" mode="calc">
              <xsl:with-param name="colPos" select="$colPos"/>
              <xsl:with-param name="customId" select="$customId"/>
            </xsl:apply-templates>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

  <!-- Functions -->
  <xsl:template match="calc:Max | calc:Min | calc:Coa | calc:Zin | calc:Niz | calc:Abs | calc:Igt | calc:Ian | calc:Sgn" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:param name="customId"/>
    <xsl:if test="parent::calc:*">
      <xsl:value-of select="'('"/>
    </xsl:if>
    <xsl:variable name="currElem" select="."/>
    <xsl:variable name="function" select="$functions/*/*[local-name()=local-name(current())]"/>
    <xsl:apply-templates select="$function/node()" mode="calc">
      <xsl:with-param name="colPos" select="$colPos"/>
      <xsl:with-param name="customId" select="$customId"/>
      <xsl:with-param name="currElem" select="$currElem"/>
    </xsl:apply-templates>
    <xsl:if test="parent::calc:*">
      <xsl:value-of select="')'"/>
    </xsl:if>
  </xsl:template>

  <!-- Function parameter -->
  <xsl:template match="V" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:param name="customId"/>
    <xsl:param name="currElem"/>
    <xsl:apply-templates select="$currElem/calc:*[number(current()/@p)]" mode="calc">
      <xsl:with-param name="colPos" select="$colPos"/>
      <xsl:with-param name="customId"  select="$customId"/>
      <xsl:with-param name="currElem" select="$currElem"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Operators -->
  <xsl:template match="calc:Div | calc:Add | calc:Mul | calc:Sub" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:param name="customId"/>
    <xsl:if test="parent::calc:*">
      <xsl:value-of select="'('"/>
    </xsl:if>
    <xsl:variable name="operator" select="$operators/*/*[local-name()=local-name(current())]"/>
    <xsl:for-each select="calc:*">
      <xsl:if test="position() != 1">
        <xsl:value-of select="$operator"/>
      </xsl:if>
      <xsl:apply-templates select="." mode="calc">
        <xsl:with-param name="colPos" select="$colPos"/>
        <xsl:with-param name="customId" select="$customId"/>
      </xsl:apply-templates>
    </xsl:for-each>
    <xsl:if test="parent::calc:*">
      <xsl:value-of select="')'"/>
    </xsl:if>
  </xsl:template>

  <!-- ValueRefs (loaded data) -->
  <xsl:template match="calc:ValueRef[@idRef]" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:param name="plain" select="false()"/>
    <xsl:variable name="idRef" select="@idRef"/>
    <xsl:variable name="colIndex">
      <xsl:for-each select="$doc">
        <xsl:value-of select="key('colHeadById', $idRef)/@pos"/>
      </xsl:for-each>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="not($plain) and ancestor::calc:Calc[1]/@zeroIfNullOp='true'">
        <xsl:text>translate(number(</xsl:text><xsl:value-of select="concat('wrs:C[',number($colIndex),']')"/><xsl:text>), 'aN', '0')</xsl:text>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat('wrs:C[',number($colIndex),']')"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Values (constants) -->
  <xsl:template match="calc:Value" mode="calc">
    <xsl:value-of select="text()"/>
  </xsl:template>

</xsl:stylesheet>
