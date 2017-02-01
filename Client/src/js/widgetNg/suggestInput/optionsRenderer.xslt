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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <!--

    renders visible options data for the options list,
    as a root-element it shall output a DIV and every option element shall be a DIV too.
    the root-div will become a child or internal widgets options container element which
    displays the options DIVs as their are. An option DIV may render complex content but has
    to implement the OPTION-Schema, that is the output has to be compliant to:

    OPTION-Schema on option DIV element:

    - attribute "bcdCaption" provides a value which a widget obtains once user selects this option, that value
      is written to the targetXPath and to the widget input as well
    - currently selected item has to have a CSS classname 'bcdOptionIsSelected'

    See also the input parameters to this stylesheet which are provided on transformation from
    widget scope. Also be aware that your own parameters do not conflict by name with these internal ones.

   -->
  <xsl:output method="html" indent="no" version="1.0"  encoding="UTF-8"/>

  <xsl:param name="bcdWidgetValue"/>
  <xsl:param name="bcdIsNative"/>
  <xsl:param name="suggestItemCount" select="'10'"/>

  <xsl:variable name="_suggestItemCount" select="number($suggestItemCount)"/>

  <!-- convert bcdWidgetValue to lowercase for ingore-case lookup -->
  <xsl:variable name="lowerValue" select="translate($bcdWidgetValue,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')"/>

  <xsl:template match="/*">
    <div>
      <xsl:choose>
        <xsl:when test="$bcdWidgetValue=''">
          <xsl:apply-templates select="/Values/Value[position() &lt;= $_suggestItemCount]"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates select="/Values" mode="filter_by_contains"/>
        </xsl:otherwise>
      </xsl:choose>
    </div>
  </xsl:template>

  <!-- filters entries applying 'contains' lookup -->
  <xsl:template match="Values" mode="filter_by_contains">
    <xsl:apply-templates select="Value[ contains(@lowerCaseCaption,$lowerValue) ][position() &lt;= $_suggestItemCount]"/>
  </xsl:template>

  <xsl:template match="Value">
    <div bcdCaption="{.}">
      <xsl:if test=".=$bcdWidgetValue">
        <xsl:attribute name="class"><xsl:text>bcdOptionIsSelected</xsl:text></xsl:attribute>
      </xsl:if>
      <xsl:value-of select="@caption"/>
    </div>
  </xsl:template>
</xsl:stylesheet>