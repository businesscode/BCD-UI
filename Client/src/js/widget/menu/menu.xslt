<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
  xmlns:bcd="http://www.businesscode.de/schema/bcdui/html-extensions-1.0.0"
  xmlns:menu="http://www.businesscode.de/schema/bcdui/menu-1.0.0"
  >

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no" />

  <!-- application context path -->
  <xsl:param name="contextPath" select="'/'"/>
  <xsl:param name="bcdControllerVariableName" select="'root_'"/>
  <xsl:param name="legacyTheme" select='false'/>
  <xsl:param name="isCredentialMenu" select='false'/>
  <xsl:param name="userName"/>
  <xsl:param name="userEmail"/>
  <xsl:param name="userLogin"/>
  <!-- menu Id -->
  <xsl:param name="menuId"
    select="
    substring(concat('bcdDefault',/menu:Menu/@id), 1 + 10 * number( boolean(/menu:Menu/@id != '') ) )"
    />
  <!--
    root UL element Id
   -->
  <xsl:param name="rootElementId" select="concat($bcdControllerVariableName, 'MenuRoot')"/>
  <xsl:param name="selectedMenuItemId" select="''"/>
  <xsl:param name="location"/>
  <xsl:param name="bcdPageIdParam"/>

  <xsl:variable name="I18N_TAG" select="'&#xE0FF;'"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
              root template
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/*">
    <nav class="bcdMenu">
      <xsl:if test="$legacyTheme='true'">
        <xsl:attribute name="style">display:none</xsl:attribute>
      </xsl:if>
      <ul id="{$rootElementId}" class="bcdLevel1" db="{count(//menu:Entry)}">
        <xsl:for-each select="menu:Entry">
          <xsl:call-template name="getEntry">
            <xsl:with-param name="entry" select="."/>
            <xsl:with-param name="depth" select="number('2')"/>
            <xsl:with-param name="pos" select="position()"/>
          </xsl:call-template>
        </xsl:for-each>
      </ul>
    </nav>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getEntry">
    <xsl:param name="entry"/>
    <xsl:param name="depth" select="number('1')"/>
    <xsl:param name="pos"/>

    <xsl:for-each select="$entry">
      <xsl:variable name="node" select="."/>
      <li>
        <xsl:choose>
          <xsl:when test="$node[@separator='true']"><hr/></xsl:when>
          <xsl:otherwise>
            <xsl:variable name="activeClassName">
              <xsl:call-template name="determineActiveClass">
                <xsl:with-param name="node" select="$node"/>
              </xsl:call-template>
            </xsl:variable>
    
            <xsl:attribute name="class">
              <xsl:if test="$activeClassName!='' and not($isCredentialMenu)"> bcd__active-item</xsl:if>
              <xsl:if test="$node[@disable='true']"> bcdDisabled</xsl:if>
              <xsl:if test="$node[@hide='true']"> bcdHidden</xsl:if>
            </xsl:attribute>
    
            <xsl:choose>
              <xsl:when test="$isCredentialMenu='true' and $depth=2 and $pos=1">
                <a href="#" class="bcd__header_credentials_toggle">
                  <span class="initials"><xsl:value-of select="substring(translate($userName, 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 1, 1)"/></span>
                  <span><xsl:value-of select="$userName"/></span>
                  <i class="fas fa-caret-down"></i>
                </a>
              </xsl:when>
              <xsl:otherwise>
                <xsl:call-template name="getLink">
                <xsl:with-param name="node" select="$node"/>
                <xsl:with-param name="activeClassName" select="$activeClassName"/>
              </xsl:call-template>
              </xsl:otherwise>
            </xsl:choose>
    
            <xsl:if test="$node/menu:Entry">
              <ul>
                <xsl:variable name="addCredentials" select="$isCredentialMenu='true' and $depth=2 and $pos=1 and ($userLogin!='' or $userEmail != '')"/>
                <xsl:attribute name="class"><xsl:value-of select="concat('bcdLevel',$depth)"/><xsl:if test="$addCredentials"> credentials</xsl:if></xsl:attribute>
                <xsl:if test="$addCredentials">
                  <xsl:if test="$userLogin!=''">
                    <li class="bcdDisabled user login"><a><xsl:value-of select="$userLogin"/></a></li>
                  </xsl:if>
                  <xsl:if test="$userEmail!=''">
                    <li class="bcdDisabled user email"><a><xsl:value-of select="$userEmail"/></a></li>
                  </xsl:if>
                </xsl:if>
                <xsl:call-template name="getEntry">
                  <xsl:with-param name="entry" select="$node/menu:Entry"/>
                  <xsl:with-param name="depth" select="$depth+1"/>
                </xsl:call-template>
              </ul>
            </xsl:if>
          </xsl:otherwise>
        </xsl:choose>
      </li>
    </xsl:for-each>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <xsl:template name="determineActiveClass">
    <xsl:param name="node"/>
    <xsl:choose>
      <xsl:when test="$selectedMenuItemId != ''">
        <xsl:if test="$selectedMenuItemId = $node/@id"> bcdActive</xsl:if>
        <xsl:if test="$node//*[@id=$selectedMenuItemId]"> bcdActivePath</xsl:if>
      </xsl:when>
      <xsl:otherwise>
        <xsl:variable name="locationCheck">
          <xsl:choose>
            <xsl:when test="substring($location, string-length($location) - string-length('/') + 1) = '/'">
              <xsl:value-of select="concat($location, 'index.')"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="$location"/>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:if test="$locationCheck != ''">
          <xsl:choose>
            <xsl:when test="$bcdPageIdParam != ''">
              <xsl:if test="contains($node/@href, $locationCheck) and contains($node/@href, $bcdPageIdParam)"> bcdActive</xsl:if>
              <xsl:if test="$node//*[contains(@href, $locationCheck) and contains(@href, $bcdPageIdParam)]"> bcdActivePath</xsl:if>
            </xsl:when>
            <xsl:otherwise>
              <xsl:if test="starts-with($node/@href, $locationCheck)"> bcdActive</xsl:if>
              <xsl:if test="$node//*[starts-with(@href, $locationCheck)]"> bcdActivePath</xsl:if>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:if>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getLink">
    <xsl:param name="node"/>
    <xsl:param name="hasSubMenu" select="$node/menu:Entry"/>
    <xsl:param name="activeClassName"/>
    <xsl:variable name="isClickable" select="not($node[@disable = 'true' or @hide = 'true'])"/>

    <xsl:variable name="hRef">
      <xsl:choose>
        <xsl:when test="starts-with($node/@href,'/')"><xsl:value-of select="concat($contextPath,$node/@href)"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="$node/@href"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <a>
      <xsl:if test="$isClickable">
        <xsl:attribute name="href">
          <xsl:value-of select="substring(concat('#', $hRef), 1 + 1 * number(boolean(string-length($hRef) &gt; 0)))"/>
        </xsl:attribute>
      </xsl:if>

      <xsl:attribute name="class">
        <xsl:value-of select="$activeClassName"/>
        <xsl:if test="$isClickable"> isClickable</xsl:if> 
        <xsl:if test="$node[@disable='true']"> bcdDisabled</xsl:if>
        <xsl:if test="$node[@hide='true']"> bcdHidden</xsl:if>
        <xsl:if test="$hasSubMenu"> bcdSubMenuContainer</xsl:if>
      </xsl:attribute>

      <xsl:if test="$isClickable and $node/@onClick">
        <xsl:attribute name="bcdAction"><xsl:value-of select="$node/@onClick"/></xsl:attribute>
      </xsl:if>

      <xsl:if test="$isClickable and $node/@newWindow = 'true'">
        <xsl:attribute name="target">_blank</xsl:attribute>
      </xsl:if>

      <xsl:if test="$node/@title != ''">
        <xsl:attribute name="title"><xsl:value-of select="$node/@title"/></xsl:attribute>
        <!-- translate @title if it is i18n key -->
        <xsl:if test="starts-with($node/@title, $I18N_TAG)">
          <xsl:attribute name="bcdTranslateAttrs">title</xsl:attribute>
        </xsl:if>
      </xsl:if>
      <xsl:if test="$node/@id != ''">
        <xsl:attribute name="id"><xsl:value-of select="$node/@id"/></xsl:attribute>
      </xsl:if>
      <xsl:if test="starts-with($node/@caption, $I18N_TAG)">
        <xsl:attribute name="bcdTranslate"><xsl:value-of select="$node/@caption"/></xsl:attribute>
      </xsl:if>
      <xsl:value-of select="$node/@caption"/>
    </a>
  </xsl:template>

</xsl:stylesheet>
