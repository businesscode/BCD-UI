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
  This stylesheet creates a webrowset request from a given list of bRefs a bindingSetId and list of guistatus filters.
  It can create a grouped <bRefs> and order by  <bRefs> request with isDistinct=true
  In addition to the filter taken from guiStatus other filter nodes at different location, i.e. /*/client-settings/f:Filter can be
  included as well. If they can be found at additionalFilterXPath.
  The stylesheet is used in autoModel and can be used as include template for custom templates used by autoModel. If the standard behavior
  is not sufficent.
 -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

  <xsl:import href="../../xslt/stringUtil.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set']= function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8"  indent="no" />

  <xsl:param name="bindingSetId" />
  <xsl:param name="bRefs" />
  <xsl:param name="filterBRefs" />
  <xsl:param name="orderByBRefs" />
  <xsl:param name="initialFilterBRefs" />
  <xsl:param name="mandatoryFilterBRefs" />
  <xsl:param name="isDistinct" />
  <xsl:param name="useCaptions" />
  <xsl:param name="maxRows" select="-1"/>
  <!-- type dataProviderWithXPathNodes -->
  <xsl:param name="additionalFilterXPath" select="/*[1=0]" />
  <!-- type dataProviderWithXPathNodes -->
  <xsl:param name="additionalPassiveFilterXPath" select="/*[1=0]" />
  <xsl:param name="guiStatus" />

  <xsl:variable name="boolIsDistinct" select="boolean(translate($isDistinct,'0false',''))"/>
  <xsl:variable name="boolUseCaptions" select="boolean(translate($useCaptions,'0false',''))"/>
  <!-- Split the blank separated list of bRfes and filterBRefs so that they can be used with for each later -->
  <xsl:variable name="bRefsStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$bRefs" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
 <xsl:variable name="filterRefIdsStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$filterBRefs" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
 <xsl:variable name="orderByRefIdsStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$orderByBRefs" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
 <xsl:variable name="initialFilterRefIdsStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$initialFilterBRefs" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
  <xsl:variable name="bRefTokens" select="exslt:node-set($bRefsStr)" />
  <xsl:variable name="filterTokens" select="exslt:node-set($filterRefIdsStr)" />
  <xsl:variable name="orderByTokens" select="exslt:node-set($orderByRefIdsStr)" />
  <xsl:variable name="initialFilterTokens" select="exslt:node-set($initialFilterRefIdsStr)" />
  <xsl:variable name="mandatoryfilterRefIdsStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$mandatoryFilterBRefs" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
  <xsl:variable name="mandatoryfilterTokens" select="exslt:node-set($mandatoryfilterRefIdsStr)" />
  <xsl:variable name="validfilterBRefs">
    <xsl:call-template name="checkFilterValues">
      <xsl:with-param name="filterTokens" select="$mandatoryfilterTokens" />
    </xsl:call-template>
  </xsl:variable>


  <!--  create a standard wrs request, the group by and order by is enabled/disabled by isDistinct -->
  <xsl:template match="/">
    <wrq:WrsRequest xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">
      <!-- add attribute rowEnd = 0 in case all there are mandatoryfilters and one is not set -->
      <xsl:comment>
       Mandatory: <xsl:value-of select="$mandatoryFilterBRefs"/>
       Valid:     <xsl:value-of select="$validfilterBRefs"/>
       MaxRows:   <xsl:value-of select="$maxRows"/>
      </xsl:comment>
      <wrq:Select>
        <xsl:choose>
          <xsl:when test="$mandatoryFilterBRefs and contains($validfilterBRefs ,'0')" >
            <xsl:attribute name="rowStart">0</xsl:attribute>
            <xsl:attribute name="rowEnd">0</xsl:attribute>
          </xsl:when>
          <xsl:when test="$maxRows > -1">
            <xsl:attribute name="rowStart">0</xsl:attribute>
            <xsl:attribute name="rowEnd"><xsl:value-of select="$maxRows"/></xsl:attribute>
          </xsl:when>
        </xsl:choose>
        <xsl:call-template name="createbRefList">
          <xsl:with-param name="useAttributes"><xsl:value-of select="true()"/></xsl:with-param>
        </xsl:call-template>
        <wrq:From>
          <wrq:BindingSet>
            <xsl:copy-of select="$bindingSetId" />
          </wrq:BindingSet>
        </wrq:From>
        <xsl:call-template name="createFilters" />
        <xsl:if test="$boolIsDistinct">
          <xsl:comment>isDistinct</xsl:comment>
          <xsl:call-template name="createbRefList">
            <xsl:with-param name="listName">Grouping</xsl:with-param>
          </xsl:call-template>
        </xsl:if>
        <xsl:if test="$boolIsDistinct or count($orderByTokens/wrs:Wrs/wrs:Data/wrs:R) &gt; 0">
          <xsl:call-template name="createbRefList">
            <xsl:with-param name="listName">Ordering</xsl:with-param>
          </xsl:call-template>
        </xsl:if>
      </wrq:Select>
    </wrq:WrsRequest>
  </xsl:template>


  <!-- Create a colums elements  the list name can be Columns, Grouping, Ordering-->
  <xsl:template name="createbRefList">
    <xsl:param name="listName">Columns</xsl:param>
    <xsl:param name="useAttributes" select="false()"/>
    <xsl:element name="{$listName}" namespace="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">
      <xsl:choose>
        <xsl:when test="$listName = 'Ordering' and count($orderByTokens/wrs:Wrs/wrs:Data/wrs:R) &gt; 0">
          <xsl:for-each select="$orderByTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <wrq:C bRef="{./wrs:C}"/>
          </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
          <xsl:for-each select="$bRefTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <wrq:C>
              <xsl:choose>
                <xsl:when test="$listName = 'Ordering' and $boolUseCaptions"> <!--  we sort by caption if captions are used -->
                  <xsl:attribute name="bRef">
                    <xsl:call-template name="createCaptionbRef">
                      <xsl:with-param name="bRef">
                        <xsl:value-of select="./wrs:C" />
                      </xsl:with-param>
                    </xsl:call-template>
                  </xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:attribute name="bRef">
                    <xsl:value-of select="./wrs:C" />
                  </xsl:attribute>
                </xsl:otherwise>
              </xsl:choose>
              <xsl:if test="$useAttributes and $boolUseCaptions">
                <wrq:A name="caption">
                  <xsl:attribute name="bRef"><xsl:call-template name="createCaptionbRef"><xsl:with-param name="bRef"><xsl:value-of select="./wrs:C" /></xsl:with-param></xsl:call-template></xsl:attribute>
                </wrq:A>
               </xsl:if>
            </wrq:C>
          </xsl:for-each>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:element>
  </xsl:template>


  <!--  create the filters, all filters having the same bRef (i.e. 'country')
        are within an OR expression, to cover multi select.

  -->
  <xsl:template name="createCaptionbRef">
    <xsl:param name="bRef"/>
    <xsl:variable name="suffix">_code</xsl:variable>
     <xsl:choose>
      <xsl:when test="substring($bRef, (string-length($bRef) - string-length($suffix)) + 1) = $suffix">
        <xsl:value-of select="concat( substring-before ($bRef,$suffix),'_caption')"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat($bRef, '_caption')"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="createFilters">
    <f:Filter>
      <xsl:if test="count($additionalFilterXPath/*/*) > 0">
        <f:And>
          <xsl:copy-of select="$additionalFilterXPath/*/*" />
        </f:And>
      </xsl:if>
      <xsl:if test="count($additionalPassiveFilterXPath/*/*) > 0">
        <f:And>
          <xsl:copy-of select="$additionalPassiveFilterXPath/*/*" />
        </f:And>
      </xsl:if>
      <xsl:if test="$filterTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
        <f:And>
          <xsl:for-each select="$filterTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <xsl:variable name="bRefName" select="./wrs:C" />
            <xsl:choose>
              <!-- see dimchooser comment below -->
              <xsl:when test="$guiStatus/*/f:Filter/*[@bcdDimension][descendant-or-self::*[@bRef=$bRefName]]">
                <xsl:element name="{name($guiStatus/*/f:Filter/*[@bcdDimension][descendant-or-self::*[@bRef=$bRefName]])}">
                  <xsl:apply-templates select="$guiStatus/*/f:Filter/*[@bcdDimension]/*[ descendant-or-self::*[@bRef=$bRefName] ]" />
                </xsl:element>
              </xsl:when>
              <xsl:otherwise>
                <xsl:apply-templates select="$guiStatus/*/f:Filter/*[ descendant-or-self::*[@bRef=$bRefName] ]" />
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
        </f:And>
      </xsl:if>
      <xsl:if test="$initialFilterTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
        <f:And>
          <xsl:for-each select="$initialFilterTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <xsl:variable name="bRefName" select="./wrs:C" />
            <xsl:choose>
              <!--
                if requested filter token is part of a dimension chooser structure we cannot simply copy the outer filter.
                We only want to copy sub elements (OR for include, AND for exclude mode) where the bRef matches.
                This is needed if you got a mixed mode multi selection where sub element groups can use different bRef
                combinations which even may belong to different bindings (e.g. via binding set group).
                For non-mixed mode filter structures, this when part is identical to the otherwise part.
               -->
              <xsl:when test="$guiStatus/*/f:Filter/*[@bcdDimension][descendant-or-self::*[@bRef=$bRefName]]">
                <xsl:element name="{name($guiStatus/*/f:Filter/*[@bcdDimension][descendant-or-self::*[@bRef=$bRefName]])}">
                  <xsl:apply-templates select="$guiStatus/*/f:Filter/*[@bcdDimension]/*[ descendant-or-self::*[@bRef=$bRefName] ]" />
                </xsl:element>
              </xsl:when>
              <xsl:otherwise>
                <xsl:apply-templates select="$guiStatus/*/f:Filter/*[ descendant-or-self::*[@bRef=$bRefName] ]" />
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
        </f:And>
      </xsl:if>
    </f:Filter>
  </xsl:template>

  <!-- standard copy template -->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- checkFilterValues test if each of the specified filterBRefs has an value attribute different from '' and returns
       a string having 1 or 0 for each bRefs.  I.e. country,station  => 10 if country value ='abc' and station = ''
       the resulting string can than be tested with contains('0') to set the wrs just for a dummy request.
   -->
  <xsl:template name="checkFilterValues">
    <xsl:param name="filterTokens" />
    <xsl:variable name="filterValues" />
    <xsl:for-each select="$filterTokens/wrs:Wrs/wrs:Data/wrs:R">
      <xsl:variable name="bRefName" select="./wrs:C" />
      <xsl:choose>
        <xsl:when test="$guiStatus//f:Filter//f:Expression[@bRef = ($bRefName) ]/@value !='' ">
          <xsl:value-of select="concat($filterValues, '1')" />
        </xsl:when>
        <xsl:when test="$additionalFilterXPath//f:Expression[@bRef = ($bRefName) ]/@value !='' ">
          <xsl:value-of select="concat($filterValues, '1')" />
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="concat($filterValues, '0')" />
        </xsl:otherwise>
      </xsl:choose>
    </xsl:for-each>
    <xsl:value-of select="$filterValues" />
  </xsl:template>
</xsl:stylesheet>