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
  xmlns:c="DummyNamespaceFromJspTagC"
  xmlns:webpage="DummyNamespaceFromJspTagWebpage"
>

  <xsl:import href="generator_misc.xslt"/>

  <xsl:variable name="qq">"</xsl:variable>
  
  <xsl:template match="BcdObject" mode="jspTag">
    <xsl:variable name="skipParams" select="@skipParams"/>
    <xsl:variable name="isBlockContainer" select="boolean(@isBlockContainer='true')"/>
    <xsl:variable name="gotJSPParent" select="boolean(Api/Param[@isJSPParent='true'])"/>
    <xsl:variable name="gotImplementationPackage" select="boolean(@implementationPackage!='')"/>
    <xsl:variable name="allowsChilds" select="boolean(Api/Impl/Jsp[@allowsChildren='true'])"/>
    <xsl:variable name="gotDataProviderChild" select="Api/Param[starts-with(@isJSPChild, 'paramBag.')]"/>
    <xsl:variable name="gotParamBagParam" select="boolean(Api/Param/Impl/Jsp[contains(., 'webpage:paramBag')])"/>
    <xsl:variable name="extendsDataProvider" select="boolean(Api/extends[contains(.,'dataProvider')])"/>
    <xsl:variable name="extendsTransformationChain" select="boolean(Api/extends[contains(.,'transformationChain')])"/>
    <xsl:variable name="gotId" select="boolean(Api/Param[@name='id'])"/>
    <xsl:variable name="gotBodyFunction" select="boolean(Api/Param[contains(@type, 'function') and @isJSPChild='true'])"/>
    <xsl:variable name="isDataProviderAlias" select="boolean(Api[@type='dataProviderAlias'])"/>
    <xsl:variable name="noDoBody" select="boolean($gotBodyFunction or $isDataProviderAlias or Api/Impl/Jsp/AddCode[contains(., 'jsp:doBody')])"/>

    <xsl:variable name="upperCaseName">
      <xsl:call-template name="addPrefix">
        <xsl:with-param name="name" select="@name"/>
        <xsl:with-param name="prefix" select="''"/>
      </xsl:call-template>
    </xsl:variable>

    <!-- generate taglib uris -->

    <xsl:text>&lt;%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>&#10;</xsl:text>
    <xsl:text>&lt;%@ taglib uri="http://de.businesscode.web/jsp/taglib/bcdui/webpage" prefix="webpage" %>&#10;</xsl:text>
    <xsl:if test="$extendsDataProvider">
      <xsl:text>&lt;%@ taglib uri="http://de.businesscode.web/jsp/taglib/bcdui/bcdui" prefix="b" %>&#10;</xsl:text>
    </xsl:if>
    <xsl:if test="not(Api/Impl/Jsp/@allowsChildren='true')">&lt;%@ tag body-content="empty" %>&#10;</xsl:if>

    <!-- generate tag description -->

    <xsl:text>&#10;&lt;%@ tag description="&#10;</xsl:text>
      <xsl:call-template name="printRowsNormalize">
        <xsl:with-param name="content"   select="Api/Doc[position()=last()]"/>
        <xsl:with-param name="indent"    select="'  '"/>
      </xsl:call-template>
    <xsl:text>" %>&#10;&#10;</xsl:text>

    <!-- generate tag example -->

    <xsl:if test="Api/Examples[position()=last()]/Example[@type='jsp']">
      <xsl:text>&#10;&lt;%@ tag example="&#10;</xsl:text>

      <xsl:variable name="example">
        <xsl:call-template name="replaceString">
          <xsl:with-param name="str" select="Api/Examples[position()=last()]/Example[@type='jsp']"/>
          <xsl:with-param name="find" select="'&lt;'"/>
          <xsl:with-param name="replacement" select="'&amp;lt;'"/>
        </xsl:call-template>
      </xsl:variable>

      <xsl:call-template name="printRowsNormalize">
        <xsl:with-param name="content"   select="$example"/>
        <xsl:with-param name="indent"    select="'  '"/>
      </xsl:call-template>

      <xsl:text>" %>&#10;&#10;</xsl:text>
    </xsl:if>

    <!-- generate tag attributes, type=functions and isJSPChild elements are not considered to be attributes -->

    <xsl:for-each select="Api/Param">
      <xsl:sort select="concat(translate(substring(concat(@required,substring('false',0,1 div string-length(@required))), 1, 1), 'tf', '01'), @name)" order="ascending"/>
      <xsl:if test="not(@isJSPChild)">
        <xsl:value-of select="concat('&#10;&lt;%@ attribute name=',$qq,@name,$qq)"/>
        <xsl:if test="@required='true'"> required="true"</xsl:if>
        <xsl:variable name="typeName">
          <xsl:choose>
            <xsl:when test="contains(@type, 'number')">Number</xsl:when>
            <xsl:when test="contains(@type, 'numeric')">Number</xsl:when>
            <xsl:when test="contains(@type, 'integer')">Integer</xsl:when>
            <xsl:when test="contains(@type, 'int')">Integer</xsl:when>
            <xsl:when test="contains(@type, 'string') or contains(@type, 'i18nToken')">String</xsl:when>
            <xsl:when test="contains(@type, 'boolean') or contains(@type, 'booleanWithDefault')">Boolean</xsl:when>
            <!-- Types like jsattr or array (e.g. in pdfexport) are also handled as a string -->
            <xsl:otherwise>String</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:choose>
          <xsl:when test="contains(@type, 'fragment')"> fragment="true"</xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="concat(' type=',$qq,'java.lang.',$typeName,$qq,'')"/>
          </xsl:otherwise>
        </xsl:choose>

        <xsl:if test="Doc">
          <xsl:text> description="&#10;</xsl:text>
          <xsl:choose>
            <xsl:when test="@deprecated!=''">Deprecated:</xsl:when>
            <xsl:when test="@required='true'">Required:</xsl:when>
            <xsl:otherwise>Optional:</xsl:otherwise>
          </xsl:choose>
          <xsl:call-template name="printRowsNormalize">
            <xsl:with-param name="content"   select="Doc"/>
            <xsl:with-param name="indent"    select="' '"/>
          </xsl:call-template>
          <xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:text> %>&#10;</xsl:text>
      </xsl:if>
    </xsl:for-each>

    <!-- set parent data provider variable in case we need them (currently only modelupdater) -->

    <xsl:if test="$gotJSPParent">
      <xsl:text>&#10;&lt;%-- get parentDataProvider before paramBag's push operation --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;c:set var="parentDataProvider" value="${paramBag.parentDataProvider}"/></xsl:text>
      <xsl:text>&#10;</xsl:text>
    </xsl:if>

    <!-- push -->

    <xsl:if test="$extendsDataProvider or $gotDataProviderChild or $gotParamBagParam">
      <xsl:text>&#10;&lt;%-- paramBag push --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;webpage:paramBag>&#10;</xsl:text>
    </xsl:if>

    <!-- generate unique id if not given -->

    <xsl:if test="$gotId or Api/Param[@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid')]">
      <xsl:text>&#10;&lt;%-- create unique id if not given --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;c:if test="${empty id}">&#10;</xsl:text>
      <xsl:text>  &lt;c:set var="id">&lt;webpage:uniqueId prefix="</xsl:text><xsl:value-of select="concat(@name,'_')"/><xsl:text>"/>&lt;/c:set>&#10;</xsl:text>
      <xsl:text>&lt;/c:if>&#10;</xsl:text>
    </xsl:if>

    <!-- generate unique targetHTMLElementId if not given -->

    <xsl:variable name="hasDeprecatedTarget" select="count(Api/Param[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'targethtmlelementid']) &gt; 0"/>
    <xsl:variable name="hasNewTarget" select="count(Api/Param[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'targethtml']) &gt; 0"/>
    <xsl:variable name="deprecatedName" select="Api/Param[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'targethtmlelementid']/@name"/>
    
    <xsl:if test="$hasNewTarget or $hasDeprecatedTarget">
      <xsl:text>&#10;&lt;%-- generate targetHtmlElement if not given --%&gt;</xsl:text>
      <xsl:choose>
        <xsl:when test="$hasDeprecatedTarget and $hasNewTarget">
          <xsl:text>&#10;&lt;c:if test="${empty targetHtml and empty </xsl:text><xsl:value-of select="$deprecatedName"/><xsl:text>}">&#10;</xsl:text>
          <xsl:call-template name="writeContainer">
            <xsl:with-param name="name" select="$deprecatedName"/>
            <xsl:with-param name="isBlockContainer" select="$isBlockContainer"/>
          </xsl:call-template>
          <xsl:text>&lt;/c:if>&#10;</xsl:text>
        </xsl:when>
        <xsl:when test="not($hasDeprecatedTarget) and $hasNewTarget">
          <xsl:text>&#10;&lt;c:if test="${empty targetHtml}">&#10;</xsl:text>
          <xsl:call-template name="writeContainer">
            <xsl:with-param name="name" select="'targetHtml'"/>
            <xsl:with-param name="isBlockContainer" select="$isBlockContainer"/>
          </xsl:call-template>
          <xsl:text>&lt;/c:if>&#10;</xsl:text>
        </xsl:when>
        <xsl:otherwise>
          <xsl:text>&#10;&lt;c:if test="${empty </xsl:text><xsl:value-of select="$deprecatedName"/><xsl:text>}">&#10;</xsl:text>
          <xsl:call-template name="writeContainer">
            <xsl:with-param name="name" select="$deprecatedName"/>
            <xsl:with-param name="isBlockContainer" select="$isBlockContainer"/>
          </xsl:call-template>
          <xsl:text>&lt;/c:if>&#10;</xsl:text>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>

    <xsl:for-each select="Api/Param">
      <xsl:if test="contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid')">
        <xsl:variable name="postfix">
          <xsl:if test="translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') != 'targethtmlelementid'"><xsl:value-of select="concat('_', position())"/></xsl:if>
        </xsl:variable>
        <xsl:if test="string-length($postfix) &gt; 0">
          <xsl:text>&#10;&lt;c:if test="${empty </xsl:text><xsl:value-of select="@name"/><xsl:text>}">&#10;</xsl:text>
          <xsl:text>  &lt;c:set var="</xsl:text><xsl:value-of select="@name"/><xsl:text>">${id}_tE</xsl:text><xsl:value-of select="$postfix"/><xsl:text>&lt;/c:set>&#10;</xsl:text>
          <xsl:choose>
            <xsl:when test="$isBlockContainer">
              <xsl:text>  &lt;div class="</xsl:text><xsl:value-of select="concat('bcd', $upperCaseName)"/><xsl:text>" id="${</xsl:text><xsl:value-of select="@name"/><xsl:text>}">&lt;/div>&#10;</xsl:text>
            </xsl:when>
            <xsl:otherwise>
              <xsl:text>  &lt;span class="</xsl:text><xsl:value-of select="concat('bcd', $upperCaseName)"/><xsl:text>" id="${</xsl:text><xsl:value-of select="@name"/><xsl:text>}">&lt;/span>&#10;</xsl:text>
            </xsl:otherwise>
          </xsl:choose>
          <xsl:text>&lt;/c:if>&#10;</xsl:text>
        </xsl:if>
      </xsl:if>
    </xsl:for-each>


    <!-- set parentDataProvider -->

    <xsl:if test="$extendsDataProvider">
      <xsl:text>&#10;&lt;%-- remember id as parentDataProvider (for encapsulated calls) --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;webpage:paramBag.add key="parentDataProvider" value="${id}"/>&#10;</xsl:text>
    </xsl:if>

    <!-- add possible additional jsp code -->

    <xsl:if test="Api/Impl/Jsp/AddCode">
      <xsl:text>&#10;&lt;%-- static code start --%&gt;</xsl:text>
      <xsl:text>&#10;</xsl:text><xsl:value-of select="Api/Impl/Jsp/AddCode"/>
      <xsl:text>&#10;&lt;%-- static code end --%&gt;</xsl:text>
    </xsl:if>

    <!-- write body if childs are allowed but doBody is not written by some jsp overwrite itself dataprovider alias-->

    <xsl:if test="$allowsChilds and not($noDoBody)">
      <xsl:text>&#10;&lt;%-- evaluate child --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;jsp:doBody/>&#10;</xsl:text>
    </xsl:if>

    <!-- for dataprovider alias elements, write the forwarding parambag-->

    <xsl:if test="$isDataProviderAlias">
      <xsl:variable name="finalName">
        <xsl:choose>
          <xsl:when test="Api/@alias!=''"><xsl:value-of select="Api/@alias"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="Api/@name"/></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:text>
&#10;&lt;%-- dataProvider alias --%&gt;
&lt;webpage:paramBag forwarding="dataProviders=></xsl:text><xsl:value-of select="$finalName"/><xsl:text>">
  &lt;jsp:doBody/>
&lt;/webpage:paramBag>
</xsl:text>
    </xsl:if>

    <!-- add js call if implementation function is given -->

    <xsl:if test="@implementationFunction!='' or $gotImplementationPackage">

      <xsl:variable name="functionCall">
        <xsl:choose>
          <xsl:when test="@implementationFunction"><xsl:value-of select="@implementationFunction"/></xsl:when>
          <xsl:when test="$gotImplementationPackage">
            <xsl:variable name="x">
              <xsl:call-template name="lastIndexOf">
                <xsl:with-param name="s" select="@implementationPackage"/>
                <xsl:with-param name="c" select="'.'"/>
              </xsl:call-template>
            </xsl:variable>
            <xsl:value-of select="substring(@implementationPackage, 1, number($x))"/><xsl:call-template name="addPrefix"><xsl:with-param name="name" select="@name"/><xsl:with-param name="prefix" select="'create'"/></xsl:call-template>
          </xsl:when>
        </xsl:choose>
      </xsl:variable>

      <xsl:text>&#10;&lt;%-- js implementation call with all parameters --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;webpage:script>&#10;  </xsl:text><xsl:value-of select="$functionCall"/><xsl:text>({bcdSyntaxDummy: null&#10;</xsl:text>
      <xsl:for-each select="Api/Param">

        <!--  get final js name, either name or overwrite from jsName -->

        <xsl:variable name="name">
          <xsl:choose>
            <xsl:when test="@jsName"><xsl:value-of select="@jsName"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>

        <!-- set single js params depending on type or overwrites from Impl/Jsp -->

        <xsl:choose>
          <xsl:when test="contains($skipParams, concat('|', @name, '|'))">
            <xsl:text>    &lt;%-- skipped </xsl:text><xsl:value-of select="@name"/><xsl:text> --%&gt;</xsl:text>
          </xsl:when>
          <xsl:when test="Impl/Jsp">
            <xsl:text>    , </xsl:text><xsl:value-of select="@name"/><xsl:text>:</xsl:text> <xsl:value-of select="Impl/Jsp"/><xsl:text> &lt;%-- static code --%&gt;</xsl:text>
          </xsl:when>
          <xsl:when test="@isJSPParent='true'">
            <xsl:text>    , </xsl:text><xsl:value-of select="$name"/><xsl:text>: ${webpage:coalesceJSString(</xsl:text><xsl:value-of select="@name"/><xsl:text>, parentDataProvider)}</xsl:text>
          </xsl:when>
          <xsl:when test="starts-with(@isJSPChild, 'paramBag')">
            <xsl:text>    ${webpage:optionalJsStringParam("</xsl:text><xsl:value-of select="$name"/>", <xsl:value-of select="@isJSPChild"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'string') or contains(@type, 'i18nToken')">
            <xsl:text>    ${webpage:optionalJsStringParam("</xsl:text><xsl:value-of select="$name"/>", <xsl:value-of select="@name"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'jsattr')">
            <xsl:text>    &lt;c:if test="${ not empty </xsl:text><xsl:value-of select="@name"/><xsl:text> }">, ${</xsl:text><xsl:value-of select="@name"/><xsl:text>}&lt;/c:if></xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'integer')">
            <xsl:text>    ${webpage:optionalJsNumberParam("</xsl:text><xsl:value-of select="$name"/>", <xsl:value-of select="@name"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'number')">
            <xsl:text>    ${webpage:optionalJsNumberParam("</xsl:text><xsl:value-of select="$name"/>", <xsl:value-of select="@name"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'array')">
            <xsl:text>    , </xsl:text><xsl:value-of select="$name"/><xsl:text>: ${webpage:stringToJsArray(</xsl:text><xsl:value-of select="@name"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'booleanWithDefault')">
            <xsl:text>    , </xsl:text><xsl:value-of select="$name"/><xsl:text>: ${webpage:jsBooleanWithDefault(</xsl:text><xsl:value-of select="@name"/>, <xsl:value-of select="@default"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'boolean')">
            <xsl:text>    ${webpage:optionalJsBooleanParam("</xsl:text><xsl:value-of select="$name"/>", <xsl:value-of select="@name"/><xsl:text>)}</xsl:text>
          </xsl:when>
          <xsl:when test="contains(@type, 'function') and @isJSPChild='true'">
            <xsl:value-of select="concat('    , ',$name,': function(){ &lt;jsp:doBody/> }')"/>
          </xsl:when>
          <xsl:when test="contains(@type, 'function') and not(@isJSPChild) and @functionAttribute!=''">
            <xsl:value-of select="concat('    , ',$name,': function(',@functionAttribute,'){${',@name,'}(',@functionAttribute,');}')"/>
          </xsl:when>
          <xsl:when test="contains(@type, 'function') and not(@isJSPChild)">
            <xsl:value-of select="concat('    , ',$name,': function(){${',@name,'}}')"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:text>    ${webpage:optionalJsStringParam("</xsl:text><xsl:value-of select="$name"/>", <xsl:value-of select="@name"/><xsl:text>)}</xsl:text>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="following-sibling::Param[1]"><xsl:text>&#10;</xsl:text></xsl:if>
      </xsl:for-each>

      <!-- transformation chain automatically adds dataproviders and parameters -->
      <xsl:if test="$extendsTransformationChain">
        <xsl:text>&#10;    , dataProviders: ${webpage:jsArray(paramBag.dataProviders)}</xsl:text>
        <xsl:text>&#10;    , parameters: &lt;webpage:paramBag.extractJSParams/></xsl:text>
      </xsl:if>

      <xsl:text>&#10;  })</xsl:text><xsl:value-of select="@implementationFunctionPost"/><xsl:text>;&#10;&lt;/webpage:script>&#10;</xsl:text>
    </xsl:if>

    <!-- pop -->

    <xsl:if test="$extendsDataProvider or $gotDataProviderChild or $gotParamBagParam">
      <xsl:text>&#10;&lt;%-- paramBag pop --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;/webpage:paramBag>&#10;</xsl:text>
    </xsl:if>
    <xsl:if test="$extendsDataProvider">
      <xsl:text>&#10;&lt;%-- publish id --%&gt;</xsl:text>
      <xsl:text>&#10;&lt;b:ref idRef="${id}"/>&#10;</xsl:text>
    </xsl:if>

  </xsl:template>

  <xsl:template name="writeContainer">
    <xsl:param name="name"/>
    <xsl:param name="isBlockContainer"/>
     <xsl:text>  &lt;c:set var="</xsl:text><xsl:value-of select="$name"/><xsl:text>">${id}_tE&lt;/c:set>&#10;</xsl:text>
     <xsl:choose>
      <xsl:when test="$isBlockContainer">
        <xsl:text>  &lt;div id="${</xsl:text><xsl:value-of select="$name"/><xsl:text>}">&lt;/div>&#10;</xsl:text>
      </xsl:when>
      <xsl:otherwise>
        <xsl:text>  &lt;span id="${</xsl:text><xsl:value-of select="$name"/><xsl:text>}">&lt;/span>&#10;</xsl:text>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>