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
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:bcd="http://www.businesscode.de/schema/bcdui/html-extensions-1.0.0">

  <xsl:output method="html" version="1.0" encoding="UTF-8"
    indent="no" />

  <!-- application context path -->
  <xsl:param name="contextPath" select="'/'"/>
  <xsl:param name="settingsNode" select="'ClientSettings'"/>
  <xsl:param name="handlerVariableName">bcdui.widget.tab</xsl:param>
  <!-- menu Id -->
  <xsl:param name="tabElementId"
    select="
    substring(concat('bcdDefault',/Items/@id), 1 + 10 * number( boolean(/Items/@id != '') ) )"
    />

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
              root template
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/*">
    <div class="bcdTab">
      <ul id="{$tabElementId}">
        <xsl:for-each select="Item">
          <xsl:call-template name="getEntry">
            <xsl:with-param name="entry" select="."/>
            <xsl:with-param name="depth" select="number('2')"/>
          </xsl:call-template>
        </xsl:for-each>
      </ul>
    </div>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getEntry">
    <xsl:param name="entry"/>
    <xsl:param name="depth" select="number('1')"/>

    <xsl:for-each select="$entry">
      <xsl:variable name="node" select="."/>
      <li id="li_{@id}" title="{@toolTip}">
        <xsl:attribute name="class">
          <xsl:if test="$node[@disable = 'true' or @enabled = 'false']"><!-- here visibility -->
            <xsl:value-of select="substring(' bcdDisabled', 1 + 12 * number( boolean($node/@disable = 'false' or not($node/@disable)) ) )"></xsl:value-of>
            <xsl:value-of select="substring(' bcdHidden', 1 + 10 * number( boolean($node/@hide = 'false' or not($node/@hide)) ) )"></xsl:value-of>
          </xsl:if>
        </xsl:attribute>

        <xsl:call-template name="getLink">
          <xsl:with-param name="node" select="$node"/>
        </xsl:call-template>
      </li>
    </xsl:for-each>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getLink">
    <xsl:param name="node"/>
    <xsl:variable name="isClickable" select="not($node[@disable = 'true' or @hide = 'true'])"/>
    <a parentId="{$tabElementId}" id="{@id}" href="javascript:void(0)">
      <xsl:attribute name="class">
        <xsl:if test="$node[@disable = 'true' or @hide = 'true']">
          <xsl:value-of select="substring(' bcdDisabled', 1 + 12 * number( boolean($node/@disable = 'false' or not($node/@disable)) ) )"></xsl:value-of>
          <xsl:value-of select="substring(' bcdHidden', 1 + 10 * number( boolean($node/@hide = 'false' or not($node/@hide)) ) )"></xsl:value-of>
        </xsl:if>
      </xsl:attribute>

      <xsl:if test="$isClickable">
        <xsl:attribute name="onclick">
        <!-- extra check for pre-IE8 browser which add onclick as a function and not as a string. In this case, the function needs to be called -->
          <xsl:if test="$node/@onclick"><xsl:value-of select="$node/@onclick"/></xsl:if> <xsl:if test="starts-with($node/@onclick, 'function onclick()')">onclick();</xsl:if> <xsl:value-of select="$handlerVariableName"/>.handleTabAction(jQuery.event.fix(event), '<xsl:value-of select="$settingsNode"/>');
        </xsl:attribute>
      </xsl:if>

      <xsl:if test="$node/@toolTip = ''">
        <xsl:attribute name="title"><xsl:value-of select="$node/@toolTip"/></xsl:attribute>
      </xsl:if>

      <xsl:value-of select="$node/@caption"/>
    </a>
  </xsl:template>

</xsl:stylesheet>
