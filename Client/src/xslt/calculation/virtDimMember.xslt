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
<xsl:stylesheet version="1.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">

  <xsl:import href="calculation.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:VirtDimMembers[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>


  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
  <xsl:key name="colHeadByIdTotal" match="/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C" use="@id"/>

  <xsl:variable name="doc" select="/"/>
  <xsl:variable name="virtDimMemberTemplate" select="document('virtDimMemberTemplate.xslt')"/>
  <!-- There can be only one virt dim members for one (the last) row-dim -->
  <xsl:variable name="rowBRef" select="$paramSet/xp:VirtDimMember/@bRef[.=($doc/*/wrs:Header/wrs:Columns/wrs:C[@dimId])[position()=last()]/@dimId]"/>
  <!-- outerTotalLevelBRef is for row vdm the most outer total and for col vdm the most outer col-dim -->
  <xsl:variable name="outerTotalLevelBRef" select="$paramSet/@outerTotalLevelBRef | $doc/*/wrs:Header/wrs:Columns/wrs:C[1]/@dimId[not($paramSet/@outerTotalLevelBRef)]"/>
  <xsl:variable name="maxRowDimPos" select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>
  <xsl:variable name="q">'</xsl:variable>

  <!-- Root match, empty output if we have nothing to do
    We only work on the last row-dim. One reason is that we only support that but it also allows us to be called twice,
    once before and once after the colDims, where we first take care for the col-dims (being row-dims before the colDims)
    and during the second run for the (then-) row dims.
    -->
  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="$paramSet/xp:VirtDimMember[@bRef=$rowBRef]">
        <xsla:stylesheet>
          <xsl:copy-of select="$virtDimMemberTemplate/*/@*"/>
          <xsl:apply-templates select="$virtDimMemberTemplate/*/*" mode="generateXSLT"/>
        </xsla:stylesheet>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    This key maps all non-total rows to a group defined by the dim-levels above $maxRowDimPos
   -->
  <xsl:template match="generator:Keys" mode="generateXSLT">

    <!-- keys for later sub total and total of column calculation in ratio add / sub -->
    <xsla:key name="currSubTotalColumnKey" match="/*/TotalHelper/wrs:Data/wrs:R[wrs:C[{$doc/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C[@bRef=$outerTotalLevelBRef]/@pos} -1]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C[not(position()=$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$outerTotalLevelBRef]/@pos -1) and position()&lt;$maxRowDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

    <xsla:key name="currTotalColumnKey" match="/*/TotalHelper/wrs:Data/wrs:R[wrs:C[1]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C[position() &gt; $maxRowDimPos and position() &lt;= $maxRowDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

    <!-- key holds all rows sharing the same values for all levels excep tthe most inner one -->
    <xsla:key name="rowKeyAbove" match="/*/wrs:Data/wrs:R[not(wrs:C[{$maxRowDimPos}]/@bcdGr='1')]">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$rowBRef]/preceding-sibling::wrs:C">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

    <xsla:key name="rowKeyAboveTotal" match="/*/wrs:Data/wrs:R[wrs:C[{$maxRowDimPos}]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$rowBRef]/preceding-sibling::wrs:C">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

    <xsla:key name="rowKeyOuterTotal" match="/*/wrs:Data/wrs:R[wrs:C[{$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$outerTotalLevelBRef]/@pos}]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$outerTotalLevelBRef]/preceding-sibling::wrs:C">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

  </xsl:template>

  <!-- Whenever a new row-group (a set of rows having the same value for the next outer level) is entered, some variables are defined here -->
  <xsl:template match="generator:variableCurrRowGroup" mode="generateXSLT">

    <!-- For extra case div SubTotal -->
    <xsla:variable name="currSubTotalColumn">
      <xsl:attribute name="select">
        <xsl:text>key('currSubTotalColumnKey',concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C[not(position()=$doc/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C[@bRef=$outerTotalLevelBRef]/@pos -1) and position()&lt;$maxRowDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>))</xsl:text>
      </xsl:attribute>
    </xsla:variable>

    <xsla:variable name="currTotalColumn">
      <xsl:attribute name="select">
        <xsl:text>key('currTotalColumnKey',concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/TotalHelper/wrs:Header/wrs:Columns/wrs:C[position() &gt; $maxRowDimPos and position() &lt;= $maxRowDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>))</xsl:text>
      </xsl:attribute>
    </xsla:variable>

    <!-- All rows belonging to the current row-group -->
    <xsla:variable name="currRowGroup">
      <xsl:attribute name="select">
        <xsl:text>key('rowKeyAbove',concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$rowBRef]/preceding-sibling::wrs:C">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>))</xsl:text>
      </xsl:attribute>
    </xsla:variable>

    <!-- The total belonging to the current row-group -->
    <xsla:variable name="currRowGroupTotal">
      <xsl:attribute name="select">
        <xsl:text>key('rowKeyAboveTotal',concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$rowBRef]/preceding-sibling::wrs:C">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>))</xsl:text>
      </xsl:attribute>
    </xsla:variable>

    <!-- The total belonging to the current row-group -->
    <xsla:variable name="currRowGroupOuterTotal">
      <xsl:attribute name="select">
        <xsl:text>key('rowKeyOuterTotal',concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$outerTotalLevelBRef]/preceding-sibling::wrs:C">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>))</xsl:text>
      </xsl:attribute>
    </xsla:variable>

  </xsl:template>

  <xsl:template match="generator:generateVirtRows" mode="generateXSLT">
    <xsl:for-each select="$paramSet/xp:VirtDimMember[@bRef=$rowBRef]">
      <xsl:variable name="vdm" select="."/>
      <wrs:R id="{{concat('bcdVirDimMember_',@id,'_')}}{$vdm/@id}" bcdVdm="{$vdm/@id}">

        <!-- Copy outer dim columns -->
        <xsla:copy-of select="$currRowGroup[1]/wrs:C[position() &lt; $maxRowDimPos]"/>

        <!-- Create dim column for out virt dim member -->
        <wrs:C bcdGr="0"><xsl:value-of select="$vdm/@caption"/></wrs:C>

        <!-- Measure columns -->
        <xsl:variable name="calc" select="$vdm/calc:Calc"/>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C">
          <xsl:variable name="currPos" select="position()"/>
          <xsl:if test="$currPos > $maxRowDimPos">
            <wrs:C>
              <xsl:copy-of select="$calc/@type-name | $calc/@scale | $calc/@unit"/>
              <xsl:apply-templates select="$calc" mode="calc">
                <xsl:with-param name="colPos" select="$currPos"/>
              </xsl:apply-templates>
            </wrs:C>
          </xsl:if>
        </xsl:for-each>
      </wrs:R>
    </xsl:for-each>
  </xsl:template>

  <!-- This template overwrites the standard one from calculation.xslt -->
  <xsl:template match="calc:Div | calc:Add | calc:Mul | calc:Sub" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:if test="parent::calc:*">
      <xsl:value-of select="'('"/>
    </xsl:if>

    <!-- Special handling of adding ratios: a/b + c/d is calculated as (a+b)/(c+d) so that they are weigthed with b,d in effect
      Only supported  for plain Add or Sub, nothing nested (beside Add resp Sub again, which is the same as a flat Add/Sub, no mix)
      Also special handling for sub-totals: Take subtotals not from value denominator (since the value does not necessarily exist)
      but take it from the 'atomic' subtotal value instead.
       -->
    <xsl:variable name="isRatio">
      <xsl:for-each select="$doc/*">
        <xsl:value-of select="count(key('colHeadByPos',$colPos)/wrs:A[@name='denominator'])=1"/>
      </xsl:for-each>
    </xsl:variable>
    <xsl:choose>
      <!--  Ratio-sum special behaviour TODO, we do not write a @denominator on our wrs:C, even if we create a ratio ourselfes -->
      <xsl:when test="self::calc:Sub and $isRatio='true' and count(.//calc:*[self::calc:Sub or self::calc:Zin or self::calc:Niz or self::calc:ValueRef])=count(.//calc:*)">
        <xsl:call-template name="ratioAdd">
          <xsl:with-param name="root" select="."/>
          <xsl:with-param name="currPos" select="$colPos"/>
          <xsl:with-param name="isRatioSub" select="true()"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="self::calc:Add and $isRatio='true' and count(.//calc:*[self::calc:Add or self::calc:Zin or self::calc:Niz or self::calc:ValueRef])=count(.//calc:*)">
        <xsl:call-template name="ratioAdd">
          <xsl:with-param name="root" select="."/>
          <xsl:with-param name="currPos" select="$colPos"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <!-- Standard behaviour -->
        <xsl:variable name="operator" select="$operators/*/*[local-name()=local-name(current())]"/>
        <xsl:for-each select="calc:*">
          <xsl:if test="position() != 1">
            <xsl:value-of select="$operator"/>
          </xsl:if>
          <xsl:apply-templates select="." mode="calc">
            <xsl:with-param name="colPos" select="$colPos"/>
          </xsl:apply-templates>
        </xsl:for-each>
      </xsl:otherwise>
    </xsl:choose>

    <xsl:if test="parent::calc:*">
      <xsl:value-of select="')'"/>
    </xsl:if>
  </xsl:template>

  <!-- This template overwrites the standard one from calculation.xslt -->
  <xsl:template match="calc:ValueRef[@dmRef]" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:param name="disableZeroIfNullOp" select="false()"/>
    <xsl:variable name="zeroIfNullOp" select="ancestor::calc:Calc[1]/@zeroIfNullOp='true' and not($disableZeroIfNullOp)"/>
    <xsl:if test="$zeroIfNullOp">
      <xsl:text>translate(number(</xsl:text>
    </xsl:if>
    <xsl:choose>
      <xsl:when test="@dmRef='&#xE0F0;2'"> <!--  special case outer most total -->
        <xsl:value-of select="concat('$currRowGroupOuterTotal/wrs:C[',$colPos,']')"/>
      </xsl:when>
      <xsl:when test="@dmRef='&#xE0F0;1'">
        <xsl:value-of select="concat('$currRowGroupTotal/wrs:C[',$colPos,']')"/>
      </xsl:when>
      <xsl:when test="@dmRef='&#xE0F0;0'">
        <xsl:value-of select="concat('$currRowGroup[wrs:C[$maxRowDimPos]=',$q,$q,']/wrs:C[',$colPos,']')"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat('$currRowGroup[wrs:C[$maxRowDimPos]=&quot;', @dmRef ,'&quot;]/wrs:C[',$colPos,']')"/>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="$zeroIfNullOp">
      <xsl:text>),'aN','0')</xsl:text>
    </xsl:if>
  </xsl:template>

  <!-- Calculates a subtree of calc:Add/calc:Sub nodes for ratios by adding nominator and denominator seperately and dividing then -->
  <xsl:template name="ratioAdd">
    <xsl:param name="root"/>
    <xsl:param name="currPos"/>
    <xsl:param name="isRatioSub" select="false()"/>
    <xsl:variable name="zeroIfNullOp" select="ancestor::calc:Calc[1]/@zeroIfNullOp='true'"/>
    <xsl:variable name="numerator">
      <xsl:for-each select="$root//calc:ValueRef">
        <xsl:if test="position() != 1">
          <xsl:choose>
            <xsl:when test="$isRatioSub"> - </xsl:when>
            <xsl:otherwise>+</xsl:otherwise>
          </xsl:choose>
        </xsl:if>
        <xsl:if test="$zeroIfNullOp">
          <xsl:text>translate(number(</xsl:text>
        </xsl:if>
        <xsl:apply-templates select="." mode="calc">
          <xsl:with-param name="colPos" select="$currPos"/>
          <xsl:with-param name="disableZeroIfNullOp" select="true()"/>
        </xsl:apply-templates>
        <xsl:text>/@denominator * </xsl:text>
        <xsl:apply-templates select="." mode="calc">
          <xsl:with-param name="colPos" select="$currPos"/>
          <xsl:with-param name="disableZeroIfNullOp" select="true()"/>
        </xsl:apply-templates>
        <xsl:if test="$zeroIfNullOp">
          <xsl:text>),'aN','0')</xsl:text>
        </xsl:if>
      </xsl:for-each>
    </xsl:variable>

    <!--
      Denominator handling is straight forward except if you're using (sub)totals. In this case
      a key lookup on the real total values is done (instead of using the @denominator which might not exist for not exising rows).
      Also add up totals only once for a colDim when using row totals and vice versa.
     -->
    <xsl:variable name="denominator">
      <xsl:for-each select="$root//calc:ValueRef">
        <xsl:if test="position() != 1">
          <xsl:choose>
            <xsl:when test="$isRatioSub"> - </xsl:when>
            <xsl:otherwise>+</xsl:otherwise>
          </xsl:choose>
        </xsl:if>
        <xsl:if test="$zeroIfNullOp">
          <xsl:text>translate(number(</xsl:text>
        </xsl:if>

        <!--
          look up id in current (possibly already reduced) wrs header
          the actual total column is then taken from the original wrs header since it only exists there
          (in case of measures which use measures which are not present as single columns)

          this special lookup handling is only needed for column (sub)totals, for row (sub)totals, the value either exists anyway
          or the row itself is missing completely (also for the calculation).
         -->

        <xsl:variable name="subTotalIdColumn">
          <xsl:for-each select="$doc">
            <xsl:variable name="id" select="key('colHeadByPos',$currPos)/@id"/>
            <xsl:value-of select="substring-after($paramModel/*/cube:Layout/cube:Measures//dm:Measure[@id=$id]/calc:Calc//calc:Div/calc:ValueRef[2]/@idRef,'&#xE0F0;1C|')"/>
          </xsl:for-each>
        </xsl:variable>
        <xsl:variable name="totalIdColumn">
          <xsl:for-each select="$doc">
            <xsl:variable name="id" select="key('colHeadByPos',$currPos)/@id"/>
            <xsl:value-of select="substring-after($paramModel/*/cube:Layout/cube:Measures//dm:Measure[@id=$id]/calc:Calc//calc:Div/calc:ValueRef[2]/@idRef,'&#xE0F0;2C|')"/>
          </xsl:for-each>
        </xsl:variable>
        <xsl:variable name="subTotalIdRow">
          <xsl:for-each select="$doc">
            <xsl:variable name="id" select="key('colHeadByPos',$currPos)/@id"/>
            <xsl:value-of select="substring-after($paramModel/*/cube:Layout/cube:Measures//dm:Measure[@id=$id]/calc:Calc//calc:Div/calc:ValueRef[2]/@idRef,'&#xE0F0;1R|')"/>
          </xsl:for-each>
        </xsl:variable>
        <xsl:variable name="totalIdRow">
          <xsl:for-each select="$doc">
            <xsl:variable name="id" select="key('colHeadByPos',$currPos)/@id"/>
            <xsl:value-of select="substring-after($paramModel/*/cube:Layout/cube:Measures//dm:Measure[@id=$id]/calc:Calc//calc:Div/calc:ValueRef[2]/@idRef,'&#xE0F0;2R|')"/>
          </xsl:for-each>
        </xsl:variable>

        <!-- subTotalIdColumn & subTotalPosColumn are separed on purpose (better error detection in case of failure you run into an empty C xpath) -->

        <xsl:variable name="subTotalPosColumn"><xsl:for-each select="$doc"><xsl:value-of select="key('colHeadByIdTotal',$subTotalIdColumn)/@pos"/></xsl:for-each></xsl:variable>
        <xsl:variable name="totalPosColumn"><xsl:for-each select="$doc"><xsl:value-of select="key('colHeadByIdTotal',$totalIdColumn)/@pos"/></xsl:for-each></xsl:variable>
        <xsl:variable name="subTotalPosRow"><xsl:for-each select="$doc"><xsl:value-of select="key('colHeadById',$subTotalIdRow)/@pos"/></xsl:for-each></xsl:variable>
        <xsl:variable name="totalPosRow"><xsl:for-each select="$doc"><xsl:value-of select="key('colHeadById',$totalIdRow)/@pos"/></xsl:for-each></xsl:variable>

        <xsl:choose>

          <!-- count in rowtotal values only one for column dims and vice versa -->
          <xsl:when test="$paramSetId='colDims' and position() &gt; 1 and ($subTotalIdRow!='' or $totalIdRow!='')">0</xsl:when>
          <xsl:when test="$paramSetId='rowDims' and position() &gt; 1 and ($subTotalIdColumn!='' or $totalIdColumn!='')">0</xsl:when>

          <!-- Column Sub Total, also be aware of bRef being a total for itself, in this case check for @bcdGr = 1 -->
          <xsl:when test="$subTotalIdColumn!='' and (@idRef='&#xE0F0;1' or @idRef='&#xE0F0;2')">
            <xsl:value-of select="concat('$currSubTotalColumn[wrs:C[position()=',$maxRowDimPos,' and @bcdGr=', $q, '1', $q,']]/wrs:C[',$subTotalPosColumn,']')"/>
          </xsl:when>
          <xsl:when test="$subTotalIdColumn!=''">
            <xsl:value-of select="concat('$currSubTotalColumn[wrs:C[',$maxRowDimPos,']=',$q,@idRef,$q,']/wrs:C[',$subTotalPosColumn,']')"/>
          </xsl:when>

          <!-- Column Total, also be aware of bRef being a total for itself, in this case check for @bcdGr = 1 -->
          <xsl:when test="totalIdColumn!='' and (@idRef='&#xE0F0;1' or @idRef='&#xE0F0;2')">
            <xsl:value-of select="concat('$currTotalColumn[wrs:C[position()=',$maxRowDimPos,' and @bcdGr=', $q,'1', $q,']]/wrs:C[',$totalPosColumn,']')"/>
          </xsl:when>
          <xsl:when test="totalIdColumn!=''">
            <xsl:value-of select="concat('$currTotalColumn[wrs:C[',$maxRowDimPos,']=',$q,@idRef,$q,']/wrs:C[',$totalPosColumn,']')"/>
          </xsl:when>

          <!--  handle row (sub) total -->
          <xsl:when test="$subTotalIdRow!=''">
            <xsl:value-of select="concat('$currRowGroupTotal/wrs:C[',$subTotalPosRow,']')"/>
          </xsl:when>
           <xsl:when test="$totalIdRow!=''">
            <xsl:value-of select="concat('$currRowGroupOuterTotal/wrs:C[',$totalPosRow,']')"/>
          </xsl:when>

          <!-- default case, we use denominator -->
          <xsl:otherwise>
            <xsl:apply-templates select="." mode="calc">
              <xsl:with-param name="colPos" select="$currPos"/>
              <xsl:with-param name="disableZeroIfNullOp" select="true()"/>
            </xsl:apply-templates>
            <xsl:text>/@denominator</xsl:text>
          </xsl:otherwise>

        </xsl:choose>
        <xsl:if test="$zeroIfNullOp">
          <xsl:text>),'aN','0')</xsl:text>
        </xsl:if>
      </xsl:for-each>
    </xsl:variable>
    <xsl:value-of select="concat('(',$numerator,') div (',$denominator,')')"/>
  </xsl:template>


  <!-- Per default copy all nodes from the template to the generated stylesheet -->
  <xsl:template match="@*|node()" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>