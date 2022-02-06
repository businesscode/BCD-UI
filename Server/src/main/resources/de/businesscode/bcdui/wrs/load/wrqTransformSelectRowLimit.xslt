<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
  Turns a wrq:Request with @rowStart[>0]/@rowEnd[>rowStart] into a query with a subquery and a row_number expression
  It does not support server side ordering

  Generated format:
  Inner select is the normal SELECT plus ROW_NUMBER and without standard ORDER BY
  For order of ROW_NUMBER we use the given wrq:Order expression or otherwise the keys of the BindingSet
  In this sample item_id is the key of the BindingSet

  SELECT * FROM (
    SELECT t41.ITEM_ID v1, t41.cost v2, ROW_NUMBER() OVER(  ORDER BY t41.ITEM_ID DESC NULLS LAST ) bcdPagination
      FROM BCDUITEST_DEMO_SHIPMENT t41
      WHERE t41.DY BETWEEN ? AND ?
  ) bcdBase
  WHERE bcdPagination>=10 AND bcdPagination<=12
  ORDER BY bcdBase.v2 DESC NULLS LAST
 -->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
                xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:param name="allBindingItems"/>
  <xsl:param name="allKeyBindingItems"/>

  <xsl:key name="implicitBRefs" match="/*/f:Filter//f:Expression | /*/wrq:Grouping//wrq:C | /*/wrq:Having//wrq:C | /*/wrq:Ordering/wrq:C" use="@bRef"/>

  <!--
    Match our root, which needs to be a wrs:Select
   -->
  <xsl:template match="/*">
  
    <xsl:variable name="imputSelect" select="."/>
  
    <!-- Outer Select -->
    <xsl:copy>
      <xsl:apply-templates select="@*"/>

      <!-- Per convention BCD-UI handles rowEnd without rowStart restriction without the subselect we create here -->
      <xsl:choose>
        <xsl:when test="number(./@rowStart) > 1">
        
          <wrq:Columns>
            <!-- If a column list is not given, return all BindingItems. -->
            <xsl:choose>
              <xsl:when test="count(./wrq:Columns/wrq:C) != 0">
                <!-- Skip aggregation, the aggregation is taken care for in the inner SELECT  -->
                <xsl:for-each select="./wrq:Columns/*">
                  <xsl:copy>
                    <xsl:copy-of select="@*[not(local-name()='aggr')]"/>
                    <!-- Set @dimId/@valueId -->
                    <xsl:choose>
                      <xsl:when test="$imputSelect/wrq:Grouping//wrq:C[@bRef=current()/@bRef]">
                        <xsl:attribute name="dimId"><xsl:value-of select="current()/@bRef"/></xsl:attribute>
                      </xsl:when>
                      <xsl:otherwise>
                        <xsl:attribute name="valueId"><xsl:value-of select="current()/@bRef"/></xsl:attribute>
                      </xsl:otherwise>
                    </xsl:choose>
                  </xsl:copy>
                </xsl:for-each>
              </xsl:when>
              <xsl:otherwise>
                <xsl:call-template name="colList">
                  <xsl:with-param name="bRefList" select="$allBindingItems"/>
                  <xsl:with-param name="grouping" select="$imputSelect/wrq:Grouping"/>
                </xsl:call-template>
              </xsl:otherwise>
            </xsl:choose>
          </wrq:Columns>
          <wrq:From>
          
            <!-- Inner Select -->
            <wrq:Select>
              <xsl:copy-of select="./@*[not(name()='rowStart') and not(name()='rowEnd')]"/>

              <wrq:Columns>
                <xsl:copy-of select="./wrq:Columns/@*"/>

                <!-- If a column list is not given, return all BindingItems -->
                <xsl:choose>
                  <xsl:when test="count(./wrq:Columns/wrq:C) != 0">
                    <xsl:copy-of select="./wrq:Columns/*"/>
                    <!-- Add columns from other expressions -->
                    <xsl:for-each select="./f:Filter//f:Expression | ./wrq:Grouping//wrq:C | ./wrq:Having//wrq:C | ./wrq:Ordering/wrq:C">
                      <xsl:if test="generate-id(.)=generate-id(key('implicitBRefs', @bRef)) and not(@bRef=$imputSelect/wrq:Columns//@bRef)">
                        <wrq:C bRef="{@bRef}"/>
                      </xsl:if>
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:call-template name="colList">
                      <xsl:with-param name="bRefList" select="$allBindingItems"/>
                    </xsl:call-template>
                    <!-- Add columns from other expressions -->
                    <xsl:for-each select="./f:Filter//f:Expression | ./wrq:Grouping//wrq:C | ./wrq:Having//wrq:C | ./wrq:Ordering/wrq:C">
                      <xsl:if test="generate-id(.)=generate-id(key('implicitBRefs', @bRef)) and not(contains(concat(' ',$allBindingItems,' '), concat(' ',@bRef,' ')))">
                        <wrq:C bRef="{@bRef}"/>
                      </xsl:if>
                    </xsl:for-each>
                  </xsl:otherwise>
                </xsl:choose>

                <!-- Add a virtual column for the row limitations -->
                <wrq:C bRef="bcdPagination" type-name="INTEGER"> <!-- TODO -->
                  <wrq:Calc type-name="INTEGER"> <!-- TODO -->
                    <wrq:RowNumber>
                      <wrq:OrderBy nullsOrder="nullsLast">
                        <xsl:copy-of select="./wrq:Ordering/wrq:C/@order"/> <!-- TODO -->

                        <xsl:choose>
                          <xsl:when test="count(./wrq:Ordering/wrq:C) != 0">
                            <xsl:for-each select="./wrq:Ordering/wrq:C">
                              <wrq:ValueRef idRef="{@bRef}"/>
                            </xsl:for-each>
                          </xsl:when>
                          <!-- Unless we have groupings, we implicitly order by the key -->
                          <xsl:when test="not(./wrq:Grouping//wrq:C)">
                            <xsl:call-template name="valueRefList">
                              <xsl:with-param name="bRefList" select="$allKeyBindingItems"/>
                            </xsl:call-template>
                          </xsl:when>
                        </xsl:choose>

                      </wrq:OrderBy>
                    </wrq:RowNumber>
                  </wrq:Calc>
                </wrq:C>
              </wrq:Columns>
              
              <xsl:copy-of select="./wrq:From"/>
              <xsl:copy-of select="./f:Filter"/>
              <xsl:copy-of select="./wrq:Grouping"/>
              <xsl:copy-of select="./wrq:Having"/>
            </wrq:Select>
            
          </wrq:From>

          <f:Filter>
            <xsl:if test="./@rowStart">
              <f:Expression bRef="bcdPagination" op=">=" value="{./@rowStart}"/>
            </xsl:if>
            <xsl:if test="./@rowEnd">
              <f:Expression bRef="bcdPagination" op="&lt;=" value="{./@rowEnd}"/>
            </xsl:if>
          </f:Filter>

          <!-- If a sort is not given, sort by keys -->
          <xsl:choose>
            <xsl:when test="count(./wrq:Ordering/wrq:C) != 0">
              <xsl:copy-of select="./wrq:Ordering"/>
            </xsl:when>
            <!-- Unless we have groupings, we implicitly order by the key -->
            <xsl:when test="not(./wrq:Grouping//wrq:C)">
              <wrq:Ordering>
                <xsl:call-template name="colList">
                  <xsl:with-param name="bRefList" select="$allKeyBindingItems"/>
                </xsl:call-template>
              </wrq:Ordering>
            </xsl:when>
          </xsl:choose>

        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates select="*"/>
        </xsl:otherwise>
      </xsl:choose>

    </xsl:copy>
  
  </xsl:template>

  <!-- 
    Generate a list of wrq:C / wrq:ValueRef based on a string with a space separated list of bRefs
    Recurse into bRefList / valueRefList which is a space-separated list of bRefs to be created
    -->
  <xsl:template name="colList">
    <xsl:param name="bRefList"/>
    <xsl:param name="grouping" select="/*[1=0]"/>
    <xsl:if test="$bRefList != ''">
      <xsl:variable name="bRef" select="substring-before($bRefList,' ')"/>
      <wrq:C bRef="{$bRef}">
        <!-- Set @dimId/@valueId -->
        <xsl:choose>
          <xsl:when test="$grouping//wrq:C[@bRef=$bRef]">
            <xsl:attribute name="dimId"><xsl:value-of select="$bRef"/></xsl:attribute>
          </xsl:when>
          <xsl:otherwise>
            <xsl:attribute name="valueId"><xsl:value-of select="$bRef"/></xsl:attribute>
          </xsl:otherwise>
        </xsl:choose>
      </wrq:C>
      <xsl:call-template name="colList">
        <xsl:with-param name="bRefList" select="substring-after($bRefList,' ')"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>
  <xsl:template name="valueRefList">
    <xsl:param name="bRefList"/>
    <xsl:if test="$bRefList != ''">
      <wrq:ValueRef idRef="{substring-before($bRefList,' ')}"/>
      <xsl:call-template name="valueRefList">
        <xsl:with-param name="bRefList" select="substring-after($bRefList,' ')"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

 
  <!--
    Standard copy 1:1
   -->
  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>
  

</xsl:stylesheet>