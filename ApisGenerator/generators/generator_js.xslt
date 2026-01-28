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
>

  <xsl:import href="generator_misc.xslt"/>

  <xsl:variable name="qq">"</xsl:variable>
  <!-- used to store/retrieve the costruction params on element via jQuery(el).prop(..) -->
  <xsl:variable name="ELEMENT_PROPERTY_PARAMS">bcduiWidgetParams</xsl:variable>
  <xsl:variable name="isString">["string", "xPath", "i18nToken", "modelXPath", "writableModelXPath", "enumString", "stringList", "url"]</xsl:variable>


  <xsl:template match="BcdObject" mode="jsFactory">
   <xsl:variable name="createName">
      <xsl:call-template name="addPrefix">
        <xsl:with-param name="name" select="@name"/>
        <xsl:with-param name="prefix" select="'create'"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="package">
      <xsl:variable name="x">
        <xsl:if test="@implementationPackage!=''">
          <xsl:call-template name="lastIndexOf">
            <xsl:with-param name="s" select="@implementationPackage"/>
            <xsl:with-param name="c" select="'.'"/>
          </xsl:call-template>
        </xsl:if>
      </xsl:variable>
      <xsl:if test="number($x) &gt; 1">
        <xsl:value-of select="substring(@implementationPackage, 1, number($x - 1))"/>
      </xsl:if>
    </xsl:variable>

/**
  * <xsl:value-of select="normalize-space(Api/Doc[position()=last()])"/>
  * @param {Object}  args  The parameter map contains the following properties.<xsl:for-each select="Api/Param">
      <xsl:sort select="concat(translate(substring(concat(@required,substring('false',0,1 div string-length(@required))), 1, 1), 'tf', '01'), @name)" order="ascending"/>
      <xsl:apply-templates select="." mode="jsDoc"/>
    </xsl:for-each>
*/<xsl:value-of select="concat('&#10;', $package, '.', $createName)"/> = function( args ) {
  args = jQuery.extend(true, {bcdApi: "JS"}, args);
  var htmlE = jQuery(bcdui.widgetNg.utils._getAndFixTargetHtmlElement(args, "<xsl:value-of select="concat(@name, '_')"/>"));
  htmlE.prop("<xsl:value-of select="$ELEMENT_PROPERTY_PARAMS"/>", args);

  <xsl:value-of select="concat('&#10;&#10;  ', $package, '.', @name,'.init(htmlE.get(0));')"/>
};<xsl:text/>
  </xsl:template>

  <xsl:template match="Api/Param" mode="jsDoc">
    <xsl:if test="@name!='targetHTMLElementId' and @name!='targetHtmlElementId'">
      <xsl:variable name="default">
        <xsl:choose>
          <xsl:when test="@default and contains($isString,@type) and not(starts-with(@default,'&quot;') or starts-with(@default,'&amp;apos;'))">="<xsl:value-of select="@default"/>"</xsl:when>
          <xsl:when test="@default">=<xsl:value-of select="@default"/></xsl:when>
        </xsl:choose>
      </xsl:variable>
      <xsl:variable name="required1"><xsl:if test="not(@required) or @required!='true'">[</xsl:if></xsl:variable>
      <xsl:variable name="required2"><xsl:if test="not(@required) or @required!='true'">]</xsl:if></xsl:variable>
      <xsl:variable name="jsDocType">
        <xsl:choose>
          <xsl:when test="@type='stringList' or @type='enumString'">string</xsl:when>
          <xsl:when test="@type='dataProvider'">bcdui.core.DataProvider</xsl:when>
          <xsl:otherwise><xsl:value-of select="@type"/></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:value-of select="concat('&#10;  * @param {', $jsDocType, '}  ', $required1, 'args.', @name, $default, $required2, '  ', normalize-space(Doc))"/>
    </xsl:if>
  </xsl:template>

  <!-- *****************
    JsInitReadParams, used in widget's init() function to read params from html
     -->
  <xsl:template match="BcdObject" mode="jsInitReadParams">
    <xsl:variable name="package">
      <xsl:variable name="x">
        <xsl:if test="@implementationPackage!=''">
          <xsl:call-template name="lastIndexOf">
            <xsl:with-param name="s" select="@implementationPackage"/>
            <xsl:with-param name="c" select="'.'"/>
          </xsl:call-template>
        </xsl:if>
      </xsl:variable>
      <xsl:if test="number($x) &gt; 1">
        <xsl:value-of select="substring(@implementationPackage, 1, number($x - 1))"/>
      </xsl:if>
    </xsl:variable>
  
<xsl:value-of select="concat('&#10;', $package, '.')"/>impl.readParams.<xsl:value-of select="@name"/>= function( htmlElement ) {
  var params;

  var jqEl = jQuery( htmlElement );

  if( params = jqEl.prop("<xsl:value-of select="$ELEMENT_PROPERTY_PARAMS"/>") ){ // params from JS API
    jqEl.removeProp("<xsl:value-of select="$ELEMENT_PROPERTY_PARAMS"/>");

    // autofix boolean
    <xsl:apply-templates select="Api/Param[contains(@type, 'boolean')]" mode="jsInitBooleanAutofix"/>

    // set defaults
    <xsl:apply-templates select="Api/Param[@default]" mode="jsInitDefaultsInParams"/>
  } else { // params from HTML API
    params = {
    <xsl:apply-templates select="Api/Param" mode="jsInitReadParams"/>
    }
  }

  return params;
};
  </xsl:template>

  <!-- *****************
    jsInitValidateParams, used in widget's _create() function to validate params
     -->
  <xsl:template match="BcdObject" mode="jsInitValidateParams">
    <xsl:variable name="package">
      <xsl:variable name="x">
        <xsl:if test="@implementationPackage!=''">
          <xsl:call-template name="lastIndexOf">
            <xsl:with-param name="s" select="@implementationPackage"/>
            <xsl:with-param name="c" select="'.'"/>
          </xsl:call-template>
        </xsl:if>
      </xsl:variable>
      <xsl:if test="number($x) &gt; 1">
        <xsl:value-of select="substring(@implementationPackage, 1, number($x - 1))"/>
      </xsl:if>
    </xsl:variable>
  
<xsl:value-of select="concat('&#10;', $package, '.')"/>impl.validateParams.<xsl:value-of select="@name"/>= function( params ) {
  <xsl:apply-templates select="Api/Param[contains(@type, 'enum')]" mode="jsValidateEnumParamBag"/>
  <xsl:apply-templates select="Api/Param[@required = 'true']" mode="jsValidateRequired"/>
};&#10;</xsl:template>

  <!-- 
    sets property to real boolean if content equals 'true' or 'false'
   -->
  <xsl:template match="Api/Param[contains(@type, 'boolean')]" mode="jsInitBooleanAutofix">
  <xsl:variable name="param" select="concat('params.', @name)"/>
<xsl:value-of select="concat('&#10;    if( ', $param, ' === &quot;true&quot; || &quot;false&quot; === ', $param, ' ) ', $param, ' = ', $param, ' === &quot;true&quot; ;')"/>
  </xsl:template>

  <!-- defaults for boolean -->
  <xsl:template match="Api/Param[contains(@type, 'boolean')]" mode="jsInitDefaultsInParams">
  <!-- may be i.e. string, so we dont force boolean type -->
  <xsl:variable name="isStrictBoolean" select="@type = 'boolean'"/>
  <xsl:variable name="param" select="concat('params.', @name)"/>
  <xsl:variable name="strictPrefix">
    <xsl:choose>
      <xsl:when test="$isStrictBoolean">!!</xsl:when>
      <xsl:otherwise></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
<xsl:value-of select="concat('&#10;    ', $param, ' = ', $param, ' == null ? ', @default, ' : ', $strictPrefix, $param, ';')"/>
  </xsl:template>

  <!-- defaults for non-boolean -->
  <xsl:template match="Api/Param[not(contains(@type, 'boolean'))]" mode="jsInitDefaultsInParams">
    <xsl:variable name="defaultValue">
      <xsl:choose>
        <xsl:when test="contains(@type,'number') or contains(@type,'integer')"><xsl:value-of select="@default"/></xsl:when>
        <xsl:when test="contains($isString,@type) and (starts-with(@default,'&quot;') or starts-with(@default,$qq))"><xsl:value-of select="@default"/></xsl:when>
        <xsl:otherwise>"<xsl:value-of select="@default"/>"</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="param" select="concat('params.', @name)"/>
<xsl:value-of select="concat('&#10;    ', $param, ' = ', $param, ' == null ? ', normalize-space($defaultValue), ' : ', $param, ';')"/>
  </xsl:template>

  <!-- Helper to validate required -->
  <xsl:template match="Api/Param" mode="jsValidateRequired">
    <xsl:choose>
      <xsl:when test="@name='targetHtml'">
  if (params.<xsl:value-of select="@name"/> == null &amp;&amp; params.bcdApi == "JS") throw new Error("Widget (id='"+params.id+"') init error: missing property '<xsl:value-of select="@name"/>'");</xsl:when>
      <xsl:otherwise>
  if (params.<xsl:value-of select="@name"/> == null) throw new Error("Widget (id='"+params.id+"') init error: missing property '<xsl:value-of select="@name"/>'");</xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    Helper to validate the parameters in the bag of type 'enum',
    bag name considered 'params'
  -->
  <xsl:template match="Api/Param" mode="jsValidateEnumParamBag">
    <xsl:variable name="package">
      <xsl:variable name="x">
        <xsl:if test="../../@implementationPackage!=''">
          <xsl:call-template name="lastIndexOf">
            <xsl:with-param name="s" select="../../@implementationPackage"/>
            <xsl:with-param name="c" select="'.'"/>
          </xsl:call-template>
        </xsl:if>
      </xsl:variable>
      <xsl:if test="number($x) &gt; 1">
        <xsl:value-of select="substring(../../@implementationPackage, 1, number($x - 1))"/>
      </xsl:if>
    </xsl:variable>

  <xsl:value-of select="concat('&#10;  ', $package, '.')"/>impl.readParams._validateEnumValues(params, '<xsl:value-of select="@name"/>', '<xsl:value-of select="@value"/>');
  </xsl:template>

  <!--
    Helper for JsInitReadParams: Read a single param for HTML
    -->
  <xsl:template match="Api/Param" mode="jsInitReadParams">
    <xsl:variable name="bcdName">
      <xsl:call-template name="addPrefix">
        <xsl:with-param name="name" select="@name"/>
      </xsl:call-template>
    </xsl:variable>

    <!-- Conventions attribute -> js:
      - Params are converted into their native types (string, number, boolean)
      - Empty strings are treated as and converted to undefined
      - A param not given (i.e. not found as an attribute) is set to its default,
        without a @default, is is handled as js type undefined, this also implies, a string can be empty
        exception is boolean, which is handled as false if not given and no default given
     -->
    <xsl:choose>
      <xsl:when test="contains(@type, 'number')">
        <xsl:value-of select="concat(@name,': Number(htmlElement.getAttribute(',$qq,$bcdName,$qq,'))')"/>
        <xsl:if test="@default"> || <xsl:value-of select="concat('Number(',@default,')')"/></xsl:if>
        <xsl:text> || undefined</xsl:text>
      </xsl:when>
      <xsl:when test="contains(@type, 'integer')">
        <xsl:value-of select="concat(@name,': parseInt(htmlElement.getAttribute(',$qq,$bcdName,$qq,'), 10)')"/>
        <xsl:if test="@default"> || <xsl:value-of select="concat('parseInt(',@default,', 10)')"/></xsl:if>
        <xsl:text> || undefined</xsl:text>
      </xsl:when>
      <xsl:when test="contains(@type, 'string') or contains(@type, 'i18nToken')">
        <xsl:value-of select="concat(@name,': htmlElement.getAttribute(',$qq,$bcdName,$qq,')')"/>
        <xsl:choose>
          <!-- if the type supports boolean and the default is true,false keep the type boolean -->
          <xsl:when test="contains('|false|true|', @default) and contains(@type, 'boolean')"> || <xsl:value-of select="@default"/></xsl:when>
          <xsl:when test="@default and contains(@default, '&quot;')"> || '<xsl:value-of select="@default"/>'</xsl:when>
          <xsl:when test="@default"> || "<xsl:value-of select="@default"/>"</xsl:when>
          <xsl:otherwise> || undefined</xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:when test="contains(@type, 'boolean') and @default='true'">
        <xsl:value-of select="concat(@name,': htmlElement.getAttribute(',$qq,$bcdName,$qq,') == ',$qq,'false',$qq,' ? false : true')"/>
      </xsl:when>
      <xsl:when test="contains(@type, 'boolean')">
        <xsl:value-of select="concat(@name,': htmlElement.getAttribute(',$qq,$bcdName,$qq,') == ',$qq,'true',$qq,' ? true : false')"/>
      </xsl:when>
      <xsl:when test="contains(@type, 'function')">
        <xsl:value-of select="concat(@name,': bcdui.util._toJsFunction( htmlElement.getAttribute(',$qq,$bcdName,$qq,') )')"/>
        <xsl:text> || undefined</xsl:text>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat(@name,': htmlElement.getAttribute(',$qq,$bcdName,$qq,')')"/>
        <xsl:choose>
          <xsl:when test="@default and contains(@default, '&quot;')"> || '<xsl:value-of select="@default"/>'</xsl:when>
          <xsl:when test="@default"> || "<xsl:value-of select="@default"/>"</xsl:when>
          <xsl:otherwise> || undefined</xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="following-sibling::Param[1]">,
    </xsl:if>
  </xsl:template>  

</xsl:stylesheet>