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
  Part of validationWrs.xslt
-->
<xsl:stylesheet version="1.0"
  xmlns:gen="http://businesscode.de/generated"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:import href="validate.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:param name="columnRules" select="/"/> <!--  use per default header or Wrs -->
  <xsl:param name="standAlone"  select="'false'"/>
  <!-- the bcdValidationId which is set to every wrs:Wrs document inside ValidationResult/wrs:Wrs -->
  <xsl:param name="bcdValidationId"/>

  <!-- overwrite global variables of validate.xslt -->
  <xsl:variable name="invalidDateRange">bcd_ValidTypeName_TIMESTAMP</xsl:variable>
  <xsl:variable name="invalidDateFormat">bcd_ValidTypeName_TIMESTAMP</xsl:variable>
  <xsl:variable name="emptyDate">bcd_ValidNullable</xsl:variable>

  <gen:keyGeneration/>

  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="$standAlone = 'true'">
        <ValidationResult xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
          <xsl:call-template name="FailureWrs" />
        </ValidationResult>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates select="." mode="merge"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="/wrs:Wrs/wrs:Header/wrs:ValidationResult" mode="merge">
    <xsl:copy>
      <xsl:copy-of select="@*|wrs:Wrs[not(@bcdValidationId=$bcdValidationId)]"/>
      <xsl:call-template name="FailureWrs" />
    </xsl:copy>
  </xsl:template>

  <!-- merge ValidationResult/Wrs -->
  <xsl:template match="/wrs:Wrs/wrs:Header" mode="merge">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates mode="merge"/>
      <xsl:if test="not(wrs:ValidationResult)">
        <ValidationResult xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
          <xsl:call-template name="FailureWrs" />
        </ValidationResult>
      </xsl:if>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="*" mode="merge">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates mode="merge"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template name="FailureWrs">
    <Wrs bcdValidationId="{$bcdValidationId}" xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
      <Header>
        <Columns>
          <C pos="1" id="RowId" type-name="NUMERIC">
          </C>
          <C pos="2" id="ColPos" type-name="NUMERIC">
          </C>
          <C pos="3" id="error" type-name="VARCHAR">
          </C>
        </Columns>
      </Header>
      <Data>
        <xsl:apply-templates select="$columnRules/*/wrs:Header/wrs:Columns/wrs:C"/>
        <xsl:apply-templates select="/*/wrs:Data/wrs:*[not(self::wrs:D)]"/>
      </Data>
    </Wrs>
  </xsl:template>

  <!-- Check references -->
  <xsl:template match="wrs:References[not(@rowFilterXPath)]">
    <xsl:variable name="bindingItemId" select="../@id"/>
    <xsl:variable name="colPos" select="number(../@pos)"/>
    <xsl:variable name="refValueColNo" select="1 + number(boolean(*/wrs:Header/wrs:Columns/wrs:C[2]))"/>
    <xsl:variable name="allowedValues" select="*/wrs:Data/*/wrs:C[$refValueColNo]"/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[not(self::wrs:D) and wrs:C[$colPos][not(wrs:null) and not(. = $allowedValues)]]">
      <wrs:R>
        <wrs:C><xsl:value-of select="@id"/></wrs:C>
        <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
        <wrs:C>bcd_ValidReferences</wrs:C>
      </wrs:R>
    </xsl:for-each>
  </xsl:template>

  <!-- Check references with rowFilterXPath:
    only xsl: and gen: children expected.
    check with match=node() mode=rowFilterXPath in validateWrs.xslt -->
  <gen:ReferencesCheckWithRowFilterXPath>
    <xsl:variable name="bindingItemId" select="../@id"/>
    <xsl:variable name="colPos" select="number(../@pos)"/>
    <xsl:variable name="referenceElement" select="."/>
    <xsl:variable name="refValueColNo" select="1 + number(boolean(*/wrs:Header/wrs:Columns/wrs:C[2]))"/>
    <xsl:for-each select="/*/wrs:Data/wrs:*">
      <xsl:variable name="value" select="wrs:C[$colPos]"/>
      <xsl:variable name="rowNum" select="position()"/>
      <xsl:if test = "not(self::wrs:D) and wrs:C[$colPos][not(wrs:null)]" >
        <gen:DynamicXPathTest baseXPath="$referenceElement/*/wrs:Data/*[wrs:C[$refValueColNo] = $value]">
          <wrs:R>
            <wrs:C><xsl:value-of select="@id"/></wrs:C>
            <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
            <wrs:C>bcd_ValidReferences</wrs:C>
          </wrs:R>
        </gen:DynamicXPathTest>
      </xsl:if>
    </xsl:for-each>
  </gen:ReferencesCheckWithRowFilterXPath>

  <!-- Apply checks on a column -->
  <xsl:template match="/*/wrs:Header/wrs:Columns/wrs:C">

    <xsl:apply-templates select="@*">
      <xsl:with-param name="bindingItemId" select="@id"/>
      <xsl:with-param name="colPos" select="number(@pos)"/>
    </xsl:apply-templates>

    <xsl:apply-templates select="@*" mode="customValidation">
      <xsl:with-param name="bindingItemId" select="@id"/>
      <xsl:with-param name="colPos" select="number(@pos)"/>
    </xsl:apply-templates>

    <xsl:apply-templates select="wrs:References"/>

  </xsl:template>

  <!-- Apply type-name UNIQ check -->
  <xsl:template match="/*/wrs:Data/wrs:*[not(self::wrs:D)]">
    <gen:currentValueGeneration/>
    <xsl:variable name = "errors" select="key('keyRows',$currentValue)"/>
    <xsl:variable name = "rowID" select="@id"/>
    <xsl:if test="count($errors) > 1">
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@isKey = 'true']">
        <wrs:R>
          <wrs:C><xsl:value-of select="$rowID"/></wrs:C>
          <wrs:C><xsl:value-of select="@id"/></wrs:C>
          <wrs:C>bcd_ValidUniq</wrs:C>
        </wrs:R>
      </xsl:for-each>
    </xsl:if>
  </xsl:template>

  <xsl:template match="@*[local-name(.)='type-name' and contains('DECIMAL|DOUBLE|FLOAT|NUMERIC|REAL',.)]"> <!-- INTEGER is handled blow -->
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[ not(self::wrs:D) and not(wrs:C[$colPos]/wrs:null) and string-length(wrs:C[$colPos]) and string(number(wrs:C[$colPos])) = 'NaN' ]">
      <wrs:R>
        <wrs:C><xsl:value-of select="@id"/></wrs:C>
        <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
        <wrs:C>bcd_ValidTypeName_NUMERIC</wrs:C>
      </wrs:R>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="@*[local-name(.)='type-name' and .='INTEGER']">
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[ not(self::wrs:D) and not(wrs:C[$colPos]/wrs:null) and string-length(wrs:C[$colPos]) and number(wrs:C[$colPos])!=round(wrs:C[$colPos]) ]">
      <wrs:R>
        <wrs:C><xsl:value-of select="@id"/></wrs:C>
        <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
        <wrs:C>bcd_ValidTypeName_INTEGER</wrs:C>
      </wrs:R>
    </xsl:for-each>
  </xsl:template>

  <!-- Apply display-size check -->
  <xsl:template match="@*[local-name(.)='display-size' and contains('VARCHAR|CHAR',../@type-name)]">
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:variable name="attr" select="."/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[not(self::wrs:D) and (string-length(wrs:C[$colPos]) &gt; $attr) and not(wrs:C[$colPos]/wrs:null)]">
      <wrs:R>
        <wrs:C><xsl:value-of select="@id"/></wrs:C>
        <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
        <wrs:C>bcd_ValidDisplaySize</wrs:C>
      </wrs:R>
    </xsl:for-each>
  </xsl:template>

  <!-- Apply nullable="0" (mandatory) check -->
  <xsl:template match="@*[local-name(.)='nullable' and .='0']">
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:variable name="attr" select="."/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[not(self::wrs:D) and (string-length(wrs:C[$colPos]) = 0 or wrs:C[$colPos]/wrs:null)]">
        <wrs:R>
           <wrs:C><xsl:value-of select="@id"/></wrs:C>
           <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
           <wrs:C>bcd_ValidNullable</wrs:C>
        </wrs:R>
    </xsl:for-each>
  </xsl:template>

  <!-- Apply scale check -->
  <xsl:template match="@*[local-name(.)='scale']">
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:variable name="attr" select="."/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[not(self::wrs:D) and string-length(substring-after(number(wrs:C[$colPos]), '.')) > number($attr) ]">
        <wrs:R>
           <wrs:C><xsl:value-of select="@id"/></wrs:C>
           <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
           <wrs:C>bcd_ValidScale</wrs:C>
        </wrs:R>
    </xsl:for-each>
  </xsl:template>


  <!-- Apply type-name="DATE" yyyy-MM-dd check -->
  <xsl:template match="@*[local-name(.)='type-name' and .='DATE']">
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:variable name="attr" select="."/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[not(self::wrs:D) and not(wrs:C[$colPos]/wrs:null) and string-length(wrs:C[$colPos]) ]/wrs:C[$colPos]">
      <xsl:choose>
        <xsl:when test="string-length(.) = 10 and not(wrs:null) and substring(.,5,1)='-' and substring(.,8,1)='-'">
          <xsl:variable name ="yearToken" select ="number(substring(.,1,4))"/>
          <xsl:variable name ="monthToken" select ="number(substring(.,6,2))"/>
          <xsl:variable name ="dayToken" select ="number(substring(.,9,2))"/>
          <xsl:choose>
            <xsl:when test="not(number($yearToken)) or not(number($monthToken)) or not(number($dayToken))">
              <wrs:R>
                <wrs:C><xsl:value-of select="../@id"/></wrs:C>
                <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
                <wrs:C>bcd_ValidTypeName_DATE</wrs:C>
              </wrs:R>
            </xsl:when>
            <xsl:otherwise>
              <xsl:choose>
                <xsl:when test="((
                        (number($yearToken) mod 4) = 0
                          and
                        (number($yearToken) mod 100) != 0
                        )
                        or
                        (
                          (number($yearToken) mod 400) = 0
                        ))"
                      >
                  <xsl:if test="number($monthToken) = 2 and (number($dayToken) &lt; 1 or number($dayToken) &gt; 29)">
                   <wrs:R>
                     <wrs:C><xsl:value-of select="../@id"/></wrs:C>
                     <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
                     <wrs:C>bcd_ValidTypeName_DATE</wrs:C>
                   </wrs:R>
                  </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:if test="number($dayToken) &lt; 1 or (number($monthToken) = 2 and number($dayToken) &gt; 28)">
                    <wrs:R>
                       <wrs:C><xsl:value-of select="../@id"/></wrs:C>
                       <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
                       <wrs:C>bcd_ValidTypeName_DATE</wrs:C>
                    </wrs:R>
                  </xsl:if>
                </xsl:otherwise>
              </xsl:choose>
              <xsl:choose>
                <xsl:when test="$monthToken &lt; 1 or $monthToken &gt; 12 or $yearToken &lt; 1 or (($monthToken &lt; 7 and $monthToken mod 2 = 0 and $dayToken &gt; 30) or ($monthToken &gt; 7 and $monthToken mod 2 != 0 and $dayToken &gt; 30)) or $dayToken &gt; 31">
                  <wrs:R>
                    <wrs:C><xsl:value-of select="../@id"/></wrs:C>
                    <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
                    <wrs:C>bcd_ValidTypeName_DATE</wrs:C>
                  </wrs:R>
                </xsl:when>
                <xsl:otherwise>
                  <!-- else: apply custom validation -->
                  <xsl:apply-templates select="." mode="validation.DATE">
                    <xsl:with-param name="bindingItemId" select="$bindingItemId"/>
                  </xsl:apply-templates>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:when>
        <xsl:otherwise>
          <wrs:R>
            <wrs:C><xsl:value-of select="../@id"/></wrs:C>
            <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
            <wrs:C>bcd_ValidTypeName_DATE</wrs:C>
          </wrs:R>
       </xsl:otherwise>
      </xsl:choose>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="@type-name[.='TIMESTAMP']">
    <xsl:param name="bindingItemId"/>
    <xsl:param name="colPos"/>
    <xsl:for-each select="/*/wrs:Data/wrs:*[not(self::wrs:D) and not(wrs:C[$colPos]/wrs:null) and string-length(wrs:C[$colPos]) ]/wrs:C[$colPos]">
      <xsl:variable name="validationCode">
        <xsl:call-template name="validateDate">
          <xsl:with-param name="value" select="."/>
          <xsl:with-param name="mandatory" select="false()"/>
        </xsl:call-template>
      </xsl:variable>
      <xsl:choose>
        <xsl:when test="$validationCode!=''">
          <wrs:R>
            <wrs:C><xsl:value-of select="../@id"/></wrs:C>
            <wrs:C><xsl:value-of select="$bindingItemId"/></wrs:C>
            <wrs:C><xsl:value-of select="$validationCode"/></wrs:C>
          </wrs:R>
        </xsl:when>
        <xsl:otherwise>
          <!-- else: apply custom validation -->
          <xsl:apply-templates select="." mode="validation.TIMESTAMP">
            <xsl:with-param name="bindingItemId" select="$bindingItemId"/>
          </xsl:apply-templates>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:for-each>
  </xsl:template>

  <!-- All other attributes do not lead to a check -->
  <xsl:template match="@*"/>
  <xsl:template match="@*" mode="customValidation"/>

  <!-- default, empty extension points -->
  <xsl:template match="text()" mode="validation.DATE"/>
  <xsl:template match="text()" mode="validation.TIMESTAMP"/>

</xsl:stylesheet>
