<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2021 BusinessCode GmbH, Germany

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
  Turns a wrq:Request with wrq:GroupingSets into a wrq:UnionAll of wrq:Select with standard wrq:Grouping
  This is to support database which cannot handle GROUPING SETs
  Limitation: we only support 2 GroupingSets
  TODO recursive or not? Also adjust in Java
 -->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <!--
    Match root
   -->
  <xsl:template match="/*">
  
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  
  </xsl:template>


  <!--
    Match on any wrq:Select with a wrq:GroupingSet
   -->
  <xsl:template match="wrq:Select[wrq:Grouping/wrq:GroupingSets/wrq:Set]">

    <xsl:variable name="select" select="."/>
    <xsl:variable name="allGrs" select="./wrq:Grouping/wrq:GroupingSets[wrq:Set]"/>

    <!--
      Each "effective" grouping set turns into a wrq:Select, all connected by UNION
      1. Each wrq:Set within a single wrq:GroupingSets is an effective grouping set
      2. If there is a second wrq:GroupingSets,, the cross join between the first and the second become effective grouping sets
      3. If there is a grouping outside of wrq:GroupingSets, those columns take part in any effective grouping set
      GROUP BY a GROUPING SET ( (b,c), (d) ) GROUPING SET ( (e), (f) ) -> ( (a,b,c,e), (a,b,c,f), (a,d,e), (a,d,f) )
      Limitation: We currently support only 0, 1 and 2 wrq:GroupingSets.
    -->

    <!-- Loop over grouping sets in first wrq:GroupingSets -->
    <xsl:for-each select="$allGrs[1]/wrq:Set">
      
      <xsl:variable name="outer" select="."/>
      <xsl:variable name="outerIsLast" select="position() = last()"/>
    
      <!-- 
        Loop over grouping sets in second wrq:GroupingSets
        In cases there are none, we add wrq:Grouping to enter the inner part of the loop. 
        (in that case wrq:C and $select/wrq:Grouping/wrq:C are the same, which does not matter)
        -->
      <xsl:for-each select="$allGrs[2]/wrq:Set | $select/wrq:Grouping[not($allGrs[2]/wrq:Set)]">
  
        <xsl:variable name="groupingSet" select="$select/wrq:Grouping/wrq:C | $outer/wrq:C | wrq:C"/>

        <!-- Create a wrq:Select -->
        <xsl:apply-templates select="$select" mode="generateSelect">
          <xsl:with-param name="select" select="$select"/>
          <xsl:with-param name="groupingSet" select="$groupingSet"/>
        </xsl:apply-templates>

        <xsl:if test="position()!=last() or not($outerIsLast)">
          <wrq:UnionAll/>
        </xsl:if>

      </xsl:for-each>

    </xsl:for-each>

    <!--
      ORDER BY 
      In UNIONs the ORDER BY follows as the sibling of the last SELECT and applies to the UNION of all SELECTS
     -->
    <xsl:if test="position() = last() and count($allGrs/wrq:Set) > 1">
      <xsl:apply-templates select="/wrq:WrsRequest/wrq:Select/wrq:Ordering" mode="afterUnion">
        <xsl:with-param name="select" select="$select"/>
        <xsl:with-param name="allGrs" select="$allGrs"/>
      </xsl:apply-templates>
    </xsl:if>

  </xsl:template>


  <!--
    Select for the current grouping combination
    -->
  <xsl:template match="wrq:Select" mode="generateSelect">
    <xsl:param name="groupingSet"/>
    
    <wrq:Select>
      <xsl:apply-templates select="@*"/>

      <!-- 
        All children of wrq:Select. 
        f:Filter, wrq:From, wrq:Having are 1:1
        wrq:Columns, wrq:Grouping have a template below
        wrq:Ordering is only applied here, if we have no need for union
        -->
      <xsl:apply-templates select="*[not(local-name()='Ordering') or count(current()/wrq:Grouping/wrq:GroupingSets/wrq:Set) &lt;= 1]" mode="generateSelect">
        <xsl:with-param name="select" select="."/>
        <xsl:with-param name="groupingSet" select="$groupingSet"/>
      </xsl:apply-templates>

    </wrq:Select>

  </xsl:template>


  <!--
    In the select list take care for the grouping columns
    I.e. set them to null for higher aggregates and add a replacement for the GROUPING() function
    -->
  <xsl:template match="wrq:Select/wrq:Columns" mode="generateSelect">
    <xsl:param name="select"/>
    <xsl:param name="groupingSet"/>

    <wrq:Columns>
      <xsl:apply-templates select="@*"/>

      <xsl:for-each select="wrq:C">
        <xsl:choose>

          <!-- Columns that take part in any grouping need a virtual @bcdGr (GROUING() function)
               and they need to be set to NULL value, if they are not also in the current grouping -->
          <xsl:when test="@bRef=/wrq:WrsRequest/wrq:Select/wrq:Grouping//wrq:C/@bRef">
          
            <xsl:choose>

              <!-- If we are not in the current grouping set, mark it as "total". There is no @bRef as this is a virtual value -->
              <xsl:when test="not(@bRef = $groupingSet/@bRef)">
                <xsl:copy>
                  <xsl:attribute name="id"><xsl:value-of select="@bRef"/></xsl:attribute>
                  <xsl:attribute name="dimId"><xsl:value-of select="@bRef"/></xsl:attribute>
                  <!-- Ok, if it overwrites @id or @dimId defaults from line before. No @bRef as we have are a wrq:Calc -->
                  <xsl:copy-of select="@*[name()!='bRef']"/>

                  <!-- We are on a higher aggregation, nullify with right type -->                  
                  <wrq:Calc>
                    <wrq:CastAsBRef bRef="{@bRef}">
                      <wrq:Max>
                        <wrq:MakeNull>
                          <wrq:ValueRef idRef="{@bRef}"/> <!-- While this value is null at the end, we need its reference for calculation of Other -->
                        </wrq:MakeNull>
                      </wrq:Max>
                    </wrq:CastAsBRef>
                  </wrq:Calc>
                  <!-- Corresponds to GROUPING() function -->
                  <wrq:A name="bcdGr" id="{concat('bcd_virt_',position())}">
                    <wrq:Calc><wrq:Value>1</wrq:Value></wrq:Calc>
                  </wrq:A>
                  
                  <!-- Keep all user wrq:A, like caption etc, but nullify them with the right type -->
                  <xsl:for-each select="wrq:A">
                    <xsl:copy>
                      <xsl:copy-of select="@*"/>
                      <wrq:Calc>
                        <wrq:CastAsBRef bRef="{@bRef}">
                          <wrq:Value><null xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"/></wrq:Value>
                        </wrq:CastAsBRef>
                      </wrq:Calc>
                    </xsl:copy>
                  </xsl:for-each>

                </xsl:copy>
              </xsl:when>
              
              <!-- If we are in the current grouping set, use its value (as it is grouped by) and set the @bcdGr to false -->
              <xsl:otherwise>
                <xsl:copy>
                  <xsl:copy-of select="@*"/>
                  <wrq:A name="bcdGr" id="{concat('bcd_virt_',position())}">
                    <wrq:Calc><wrq:Value>0</wrq:Value></wrq:Calc>
                  </wrq:A>
                  <!-- Keep all user wrq:A, like caption etc -->
                  <xsl:copy-of select="wrq:A"/>
                </xsl:copy>
              </xsl:otherwise>
            
            </xsl:choose>

          </xsl:when>
           
          <!-- Columns not taking part in any grouping are copied 1:1 -->
          <xsl:otherwise>
            <xsl:apply-templates select="." mode="generateSelect"/>
          </xsl:otherwise>

        </xsl:choose>
      </xsl:for-each>

    </wrq:Columns>

  </xsl:template>


  <!-- 
    Add a plain grouping with the columns of the current GroupingSet 
    -->
  <xsl:template match="wrq:Grouping" mode="generateSelect">
    <xsl:param name="select"/>
    <xsl:param name="groupingSet"/>
    <wrq:Grouping>
      <xsl:copy-of select="@*"/>
      
      <!-- Grand total: enforce aggregation (even without having a column in group by) -->      
      <xsl:if test="not($groupingSet)">
        <xsl:attribute name="bcdIsGrandTotal">true</xsl:attribute>
      </xsl:if>

      <!-- Columns we wan to group by -->
      <xsl:for-each select="$groupingSet">
        <xsl:copy-of select="."/>
      </xsl:for-each>

    </wrq:Grouping>
  </xsl:template>


  <!-- 
    Ordering applying to the full union
   -->
  <xsl:template match="wrq:Ordering" mode="afterUnion">
    <xsl:param name="select"/>
    <xsl:param name="allGrs"/>
    <xsl:variable name="grpCs" select="$allGrs/wrq:Set/wrq:C"/>
    <wrq:Ordering>
      <xsl:copy-of select="@*"/>
      <!-- Dimensions -->
      <xsl:for-each select="wrq:C[not(@bRef = preceding-sibling::wrq:C/@bRef)]">
        <xsl:variable name="posC"  select="count($select/wrq:Columns/wrq:C[@bRef=current()/@bRef]/preceding-sibling::wrq:C)"/>
        <xsl:variable name="posCA" select="$posC + count($select/wrq:Columns/wrq:C[@bRef=current()/@bRef]/preceding-sibling::wrq:C/wrq:A)"/>
        <xsl:variable name="pos" select="$posCA + count($select/wrq:Columns/wrq:C[@bRef=current()/@bRef]/preceding-sibling::wrq:C[@bRef = $grpCs/@bRef])"/>
        <xsl:if test="@bRef = $grpCs/@bRef">
          <wrq:C pos="{$pos + 2}"/> <!-- GROUPING() function (i.e. is total) -->
        </xsl:if>
        <wrq:C pos="{$pos + 1}"/> <!-- Value -->
      </xsl:for-each>
    </wrq:Ordering>
  </xsl:template>
 
 
  <!--
    Standard copy 1:1
   -->
  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>
  
  <xsl:template match="@*|node()" mode="generateSelect">
    <xsl:param name="select"/>
    <xsl:param name="groupingSet"/>
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="generateSelect">
          <xsl:with-param name="select" select="$select"/>
          <xsl:with-param name="groupingSet" select="$groupingSet"/>
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>
  
  <xsl:template match="@*|node()" mode="afterUnion">
    <xsl:param name="select"/>
    <xsl:param name="allGrs"/>
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="afterUnion">
        <xsl:with-param name="select" select="$select"/>
        <xsl:with-param name="allGrs" select="$allGrs"/>
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>