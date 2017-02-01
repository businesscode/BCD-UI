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
 |
 | XSLT string utilities
 |
 |
 | trim, trim-left, trim-right
 | stringRepeater
 | printRows
 +-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
                version="1.0">

  <!-- Prints a multi-line string with an indent row by row -->
  <xsl:template name="printRows">
    <xsl:param name="content" />
    <xsl:param name="indent"/>
    <xsl:param name="emptyRowsSoFar" select="true()" />
    <xsl:variable name="row" select="substring-before(concat($content, '&#10;'), '&#10;')"/>
    <xsl:variable name="rest" select="substring-after($content, '&#10;')" />
    <xsl:if test="normalize-space($row) != '' or not($emptyRowsSoFar)">
      <xsl:value-of select="concat($indent, $row, '&#10;')"/>
    </xsl:if>
    <xsl:if test="string-length(normalize-space($rest)) > 0">
      <xsl:call-template name="printRows">
        <xsl:with-param name="content" select="$rest" />
        <xsl:with-param name="indent" select="$indent" />
        <xsl:with-param name="emptyRowsSoFar" select="$emptyRowsSoFar and normalize-space($row) = ''"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>


  <xsl:template name="left-trim">
    <xsl:param name="s" />
    <xsl:choose>
      <xsl:when test="substring($s, 1, 1) = ''">
        <xsl:value-of select="$s" />
      </xsl:when>
      <xsl:when test="normalize-space(substring($s, 1, 1)) = ''">
        <xsl:call-template name="left-trim">
          <xsl:with-param name="s" select="substring($s, 2)" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$s" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="right-trim">
    <xsl:param name="s" />
    <xsl:choose>
      <xsl:when test="substring($s, 1, 1) = ''">
        <xsl:value-of select="$s" />
      </xsl:when>
      <xsl:when test="normalize-space(substring($s, string-length($s))) = ''">
        <xsl:call-template name="right-trim">
        <xsl:with-param name="s" select="substring($s, 1, string-length($s) - 1)" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$s" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="trim">
    <xsl:param name="s" />
    <xsl:call-template name="right-trim">
      <xsl:with-param name="s">
        <xsl:call-template name="left-trim">
          <xsl:with-param name="s" select="$s" />
        </xsl:call-template>
      </xsl:with-param>
    </xsl:call-template>
  </xsl:template>

  <!-- Simply repeats a string s i times -->
  <xsl:template name="stringRepeater">
    <xsl:param name="s" />
    <xsl:param name="i" select="0" />
    <xsl:if test="$i > 0">
      <xsl:call-template name="stringRepeater">
        <xsl:with-param name="i" select="$i - 1" />
      </xsl:call-template>
      <xsl:value-of select="$s" />
    </xsl:if>
  </xsl:template>

  <!-- Finds the last occurrence of a character c in a string s -->
  <xsl:template name="lastIndexOf">
    <xsl:param name="s" />
    <xsl:param name="c" />
    <xsl:param name="index" select="0" />
    <xsl:choose>
      <xsl:when test="contains($s,$c)">
        <xsl:call-template name="lastIndexOf">
          <xsl:with-param name="s" select="substring-after($s,$c)" />
          <xsl:with-param name="c" select="$c" />
        <xsl:with-param name="index" select="$index+string-length(substring-before($s,$c))+1"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="number($index)" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="replaceString">
    <xsl:param name="str" />
    <xsl:param name="find" />
    <xsl:param name="replacement" />

    <xsl:choose>
      <xsl:when test="contains($str, $find)">
      <xsl:value-of select="concat(substring-before($str, $find), $replacement)"/>
        <xsl:call-template name="replaceString">
        <xsl:with-param name="str" select="substring-after($str, $find)"/>
          <xsl:with-param name="find" select="$find" />
          <xsl:with-param name="replacement" select="$replacement" />
        </xsl:call-template>
      </xsl:when>

      <xsl:otherwise>
        <xsl:value-of select="$str" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

 <xsl:template name="tokenize">
    <xsl:param name="string" />
    <xsl:param name="delimiter" select="' '" />
    <wrs:Wrs>
      <!-- We are using element here as a wrokaround for issues with the ant xslt task -->
      <xsl:element name="Data" namespace="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
        <xsl:call-template name="_tokenize">
          <xsl:with-param name="string" select="$string" />
          <xsl:with-param name="delimiter" select="$delimiter" />
        </xsl:call-template>
      </xsl:element>
    </wrs:Wrs>
  </xsl:template>
  <xsl:template name="_tokenize">
    <xsl:param name="string" />
    <xsl:param name="delimiter" select="' '" />
    <xsl:choose>
      <xsl:when test="$delimiter and contains($string, $delimiter)">
        <wrs:R>
          <!-- We are using element here as a wrokaround for issues with the ant xslt task -->
          <xsl:element name="C" namespace="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
            <xsl:value-of select="substring-before($string, $delimiter)" />
          </xsl:element>
        </wrs:R>
        <xsl:call-template name="_tokenize">
          <xsl:with-param name="string"
            select="substring-after($string, $delimiter)" />
          <xsl:with-param name="delimiter" select="$delimiter" />
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="string-length($string)">
        <wrs:R>
          <!-- We are using element here as a wrokaround for issues with the ant xslt task -->
          <xsl:element name="C" namespace="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
            <xsl:value-of select="$string" />
          </xsl:element>
        </wrs:R>
      </xsl:when>
    </xsl:choose>
  </xsl:template>

  <!-- Gets the n-th token starting at 1 of a del separeted string -->
  <xsl:template name="nthToken">
    <xsl:param name="string"/>
    <xsl:param name="n"/>
    <xsl:param name="default"/>
    <xsl:param name="del" select="' '"/>
    <xsl:param name="c" select="1" /> <!-- Internal counter -->
    <xsl:choose>
      <xsl:when test="$c=$n">
        <xsl:value-of select="substring-before(concat($string,$del),$del)"/>
      </xsl:when>
      <xsl:when test="$c>$n">
        <xsl:value-of select="$default"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:call-template name="nthToken">
          <xsl:with-param name="string" select="substring-after($string,$del)"/>
          <xsl:with-param name="n" select="$n"/>
          <xsl:with-param name="default" select="$default"/>
          <xsl:with-param name="c" select="$c+1" />
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>