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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:bcd="http://www.businesscode.de/schema/bcdui/html-extensions-1.0.0">

  <xsl:import href="../../../xslt/validate/validate.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8"/>

  <xsl:param name="from"/>
  <xsl:param name="to"/>
  <xsl:param name="mandatory" select="'false'"/>

  <xsl:template match="/*">
    <xsl:variable name="result_from">
      <xsl:call-template name="validateDate">
        <xsl:with-param name="value" select="$from"/>
        <xsl:with-param name="mandatory" select="$mandatory"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="result">
      <xsl:choose>
        <xsl:when test="normalize-space($result_from)"><xsl:value-of select="$result_from"/></xsl:when>
        <xsl:otherwise>
          <xsl:variable name="result_to">
            <xsl:call-template name="validateDate">
              <xsl:with-param name="value" select="$to"/>
              <xsl:with-param name="mandatory" select="$mandatory"/>
            </xsl:call-template>
          </xsl:variable>
          <xsl:choose>
            <xsl:when test="normalize-space($result_to)"><xsl:value-of select="$result_to"/></xsl:when>
            <xsl:otherwise>
              <xsl:call-template name="validateTwoDates">
                <xsl:with-param name="from" select="$from"/>
                <xsl:with-param name="to" select="$to"/>
              </xsl:call-template>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <validation-result><xsl:value-of select="normalize-space($result)"/></validation-result>
  </xsl:template>

</xsl:stylesheet>