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
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns="http://www.w3.org/1999/xhtml"
>

  <xsl:import href="generator_misc.xslt"/>

  <xsl:template match="BcdObject" mode="xslt">
  
    <xsl:variable name="isWidgetNg" select="boolean(starts-with(@implementationPackage,'bcdui.widgetNg.'))"/>
    <xsl:variable name="isWidget" select="boolean(starts-with(@implementationPackage,'bcdui.widget.'))"/>
    <xsl:variable name="skipParams" select="@skipParams"/>
    <xsl:variable name="gotJSPParent" select="boolean(Api/Param[@isJSPParent='true'])"/>
    <xsl:variable name="gotImplementationPackage" select="boolean(@implementationPackage!='')"/>
    <xsl:variable name="allowsChilds" select="boolean(Api/Impl/Jsp[@allowsChildren='true'])"/>
    <xsl:variable name="extendsDataProvider" select="boolean(Api/extends[contains(.,'dataProvider')])"/>
    <xsl:variable name="extendsHasInputModel" select="boolean(Api/extends[contains(.,'hasInputModel')])"/>
    <xsl:variable name="extendsTransformationChain" select="boolean(Api/extends[contains(.,'transformationChain')])"/>
    <xsl:variable name="gotId" select="boolean(Api/Param[@name='id'])"/>
    <xsl:variable name="gotBodyFunction" select="boolean(Api/Param[contains(@type, 'function') and @isJSPChild='true'])"/>
    <xsl:variable name="isDataProviderAlias" select="boolean(Api[contains(@type, 'dataProviderAlias')])"/>
    <xsl:variable name="noDoBody" select="boolean($gotBodyFunction or $isDataProviderAlias or Api/Impl/Jsp/AddCode[contains(., 'jsp:doBody')])"/>
    <xsl:variable name="gotUrl" select="boolean(Api/Param[@name='url' or @name='stylesheetUrl'])"/>
    <xsl:variable name="containerElement">
      <xsl:choose>
        <xsl:when test="@isBlockContainer='true'">div</xsl:when>
        <xsl:otherwise>span</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    
    <!-- get uppercase name for xapi template match  -->
    
    <xsl:variable name="upperCaseName">
      <xsl:call-template name="addPrefix">
        <xsl:with-param name="name" select="@name"/>
        <xsl:with-param name="prefix" select="''"/>
      </xsl:call-template>
    </xsl:variable>
    
    <xsl:variable name="ngPostfix">
      <xsl:if test="$isWidgetNg">Ng</xsl:if>
    </xsl:variable>

    <!-- generate a data provider alias  -->

    <xsl:if test="$isDataProviderAlias">
      <xsl:text>&#10;</xsl:text>
      <xsl:variable name="finalName">
        <xsl:choose>
          <xsl:when test="Api/@alias!=''"><xsl:value-of select="Api/@alias"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="Api/@name"/></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsla:template match="xapi:{$upperCaseName}{$ngPostfix}">
        <!-- standard widgets do call their own xslt template implementation, so we don't write a template name here -->
        <xsl:if test="not($isWidget)">
          <xsl:attribute name="name"><xsl:value-of select="@name"/></xsl:attribute>
        </xsl:if>
  <xsl:text>&#10;  </xsl:text><xsl:comment>paramBag push</xsl:comment>
  bcdui.core.bcdParamBag.push(new Object());
  <xsl:comment>call nested xapi elements</xsl:comment>
  (function(){<xsla:apply-templates select="xapi:*" />}());
  <xsl:comment>paramBag pop</xsl:comment>
  bcdui.core.bcdParamBagChild = bcdui.core.bcdParamBag.pop();
  <xsl:comment>dataProvider alias</xsl:comment>
  bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1].<xsl:value-of select="$finalName"/> = bcdui.core.bcdParamBagChild.dataProviders;<xsl:text>&#10;</xsl:text>
      </xsla:template>
      <xsl:text>&#10;</xsl:text>
    </xsl:if>

    <!-- generate bcdOnLoad script in case we got an implementation function  -->

    <xsl:if test="@implementationFunction!='' or $gotImplementationPackage">
      <xsl:text>&#10;</xsl:text>
      <xsla:template match="xapi:{$upperCaseName}{$ngPostfix}">
        <!-- standard widgets do call their own xslt template implementation, so we don't write a template name here -->
        <xsl:if test="not($isWidget)">
          <xsl:attribute name="name"><xsl:value-of select="concat(@name, $ngPostfix)"/></xsl:attribute>
        </xsl:if>

      <!-- generate parameter list -->
      <!-- widgets, components, core ignore targetHTMLElementIds since they get autogenerated -->

      <xsl:for-each select="Api/Param">
        <xsl:choose>
          <xsl:when test="$isWidgetNg"><xsl:text>&#10;  </xsl:text><xsla:param name="{@name}" select="@{@name}"/></xsl:when>
          <xsl:when test="$isWidget">
            <xsl:if test="@name='targetModelXPath'">
              <xsl:text>&#10;  </xsl:text><xsla:param name="targetModelId" select="@targetModelId"/>
            </xsl:if>
            <xsl:if test="@name='optionsModelXPath'">
              <xsl:text>&#10;  </xsl:text><xsla:param name="optionsModelId" select="@optionsModelId"/>
            </xsl:if>
            <xsl:if test="not(@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid'))">
              <xsl:text>&#10;  </xsl:text><xsla:param name="{@name}" select="@{@name}"/>
            </xsl:if>
          </xsl:when>
          <xsl:otherwise>
            <xsl:choose>
              <xsl:when test="@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid')"></xsl:when>
              <xsl:when test="@name='id'">
              <xsl:text>&#10;  </xsl:text><xsla:param name="id" select="concat(@id,substring(concat('bcdCId_{../@name}_', generate-id(.)),0,1 div string-length(@id)))"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:text>&#10;  </xsl:text><xsla:param name="{@name}" select="@{@name}"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
      <!--  in case we got targetHtmlElementIds but no id, we need to generate the id, since it's used for targetHtmlElementId generation -->
      <xsl:if test="not(Api/Param[@name='id']) and Api/Param[@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid')]">
	    <xsl:text>&#10;  </xsl:text><xsla:param name="id" select="concat(@id,substring(concat('bcdCId_{@name}_', generate-id(.)),0,1 div string-length(@id)))"/>
      </xsl:if>
      
      <!-- we do support parameterString as extra param in case we're inherit transformation chain -->

      <xsl:if test="$extendsTransformationChain">
        <xsl:text>&#10;  </xsl:text><xsla:param name="parameterString" select="''"/>
      </xsl:if>
      
      <xsl:choose>
      
        <!-- standard widget case, simply 1:1 mapping of the parameters, ignore targetHtmlElements since they are auto generated  -->      
      
      	<xsl:when test="$isWidget and $gotImplementationPackage">
          <xsl:text>&#10;&#10;  </xsl:text><xsl:comment>forwarding attributes and calling widget template</xsl:comment><xsl:text></xsl:text>
          <xsl:text>&#10;  </xsl:text><xsla:call-template name="{@name}">
            <xsl:for-each select="Api/Param">
              <xsl:if test="@name='targetModelXPath'">
                <xsl:text>&#10;    </xsl:text><xsla:with-param name="targetModelId" select="$targetModelId"/>
              </xsl:if>
              <xsl:if test="@name='optionsModelXPath'">
                <xsl:text>&#10;    </xsl:text><xsla:with-param name="optionsModelId" select="$optionsModelId"/>
              </xsl:if>
              <xsl:if test="not(@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid'))">
                <xsl:text>&#10;    </xsl:text><xsla:with-param name="{@name}" select="${@name}"/>
              </xsl:if>
            </xsl:for-each>
          <xsl:text>&#10;  </xsl:text></xsla:call-template><xsl:text>&#10;&#10;</xsl:text>
        </xsl:when>

        <!-- widgetNgs case translate params into bcd<Param>  -->

        <xsl:when test="$isWidgetNg and $gotImplementationPackage">
          <xsl:text>&#10;&#10;  </xsl:text><xsl:comment>htmlElement container start</xsl:comment><xsl:text></xsl:text>
          <xsl:text>&#10;  </xsl:text><xsla:element name="{$containerElement}">
            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>convert each param to bcd attributes</xsl:comment><xsl:text></xsl:text>
            <xsl:for-each select="Api/Param">
              <xsl:variable name="bcdPrefix">
                <xsl:call-template name="addPrefix">
                  <xsl:with-param name="name" select="@name"/>
                  <xsl:with-param name="prefix" select="'bcd'"/>
                </xsl:call-template>
              </xsl:variable>
              <xsl:text>&#10;    </xsl:text><xsla:if test="${@name}">
              <xsl:text>&#10;      </xsl:text><xsla:attribute name="{$bcdPrefix}">
              <xsl:text>&#10;        </xsl:text><xsla:value-of select="${@name}"/>
              <xsl:text>&#10;      </xsl:text></xsla:attribute>
              <xsl:text>&#10;    </xsl:text></xsla:if>
            </xsl:for-each>
            
            
            <!-- and finally build bcdOnLoad to trigger the implementation function -->
            
            <xsl:variable name="x">
              <xsl:call-template name="lastIndexOf">
                <xsl:with-param name="s" select="@implementationPackage"/>
                <xsl:with-param name="c" select="'.'"/>
              </xsl:call-template>
            </xsl:variable>

            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>bcdOnLoad attribute with js implementation call</xsl:comment><xsl:text></xsl:text>
            <xsl:text>&#10;    </xsl:text><xsla:attribute name="bcdOnLoad"><xsl:value-of select="concat(substring(@implementationPackage, 1, number($x)),@name,'.init(this);')"/></xsla:attribute>
            <xsl:text>&#10;    </xsl:text><xsla:value-of select="*[false()]"/>
          <xsl:text>&#10;&#10;  </xsl:text></xsla:element>
          <xsl:text>&#10;  </xsl:text><xsl:comment>htmlElement container end</xsl:comment><xsl:text>&#10;&#10;</xsl:text>
          
        </xsl:when>

        <!-- core/component case -->

        <xsl:otherwise>

          <!-- generate unique targetHTMLElementId if not given and only if we're not in a sub xapi call-->

          <xsl:variable name="hasDeprecatedTarget" select="count(Api/Param[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'targethtmlelementid']) &gt; 0"/>
          <xsl:variable name="hasNewTarget" select="count(Api/Param[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'targethtml']) &gt; 0"/>
          <xsl:variable name="deprecatedName" select="Api/Param[translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'targethtmlelementid']/@name"/>

          <xsl:if test="$hasNewTarget or $hasDeprecatedTarget">
            <xsl:text>&#10;&#10;  </xsl:text><xsl:comment>generate targetHtmlElement if not given</xsl:comment>
            <xsl:choose>
              <xsl:when test="$hasDeprecatedTarget and $hasNewTarget">
                <xsl:text>&#10;  </xsl:text><xsla:variable name="{$deprecatedName}">
                <xsl:text>&#10;    </xsl:text><xsla:choose>
                <xsl:text>&#10;      </xsl:text><xsla:when test="@{$deprecatedName}!=''">
                <xsl:text>&#10;        </xsl:text><xsla:value-of select="@{$deprecatedName}"/>
                <xsl:text>&#10;      </xsl:text></xsla:when>
	            <xsl:text>&#10;      </xsl:text><xsla:when test="@targetHtml!=''">
                <xsl:text>&#10;        </xsl:text><xsla:value-of select="@targetHtml"/>
                <xsl:text>&#10;      </xsl:text></xsla:when>
                <xsl:text>&#10;      </xsl:text><xsla:otherwise>
                <xsl:text>&#10;        </xsl:text><xsla:value-of select="concat($id,'_tE')"/>
                <xsl:text>&#10;      </xsl:text></xsla:otherwise>
                <xsl:text>&#10;    </xsl:text></xsla:choose>
                <xsl:text>&#10;  </xsl:text></xsla:variable>
                <xsl:text>&#10;  </xsl:text><xsla:if test="not(@{$deprecatedName}) and not(../self::xapi:*)">
                <xsl:text>&#10;    </xsl:text><xsl:element name="{$containerElement}"><xsl:attribute name="id"><xsl:value-of select="concat('{$', $deprecatedName, '}')"/></xsl:attribute>
                <xsl:text>&#10;      </xsl:text><xsla:value-of select="*[false()]"/>
                <xsl:text>&#10;    </xsl:text></xsl:element>
                <xsl:text>&#10;  </xsl:text></xsla:if><xsl:text>&#10;</xsl:text>
              </xsl:when>
              <xsl:when test="not($hasDeprecatedTarget) and $hasNewTarget">
                <xsl:text>&#10;  </xsl:text><xsla:variable name="targetHtml" select="concat(substring(concat($id,'_tE'),0,1 div string-length(@targetHtml)),@targetHtml)"/>
                <xsl:text>&#10;  </xsl:text><xsla:if test="not(@targetHtml) and not(../self::xapi:*)">
                <xsl:text>&#10;    </xsl:text><xsl:element name="{$containerElement}"><xsl:attribute name="id"><xsl:value-of select="concat('{$', 'targetHtml', '}')"/></xsl:attribute>
                <xsl:text>&#10;      </xsl:text><xsla:value-of select="*[false()]"/>
                <xsl:text>&#10;    </xsl:text></xsl:element>
                <xsl:text>&#10;  </xsl:text></xsla:if><xsl:text>&#10;</xsl:text>
              </xsl:when>
              <xsl:otherwise>
                <xsl:text>&#10;  </xsl:text><xsla:variable name="{$deprecatedName}" select="concat(substring(concat($id,'_tE'),0,1 div string-length(@{$deprecatedName})),@{$deprecatedName})"/>
                <xsl:text>&#10;  </xsl:text><xsla:if test="not(@{$deprecatedName}) and not(../self::xapi:*)">
                <xsl:text>&#10;    </xsl:text><xsl:element name="{$containerElement}"><xsl:attribute name="id"><xsl:value-of select="concat('{$', $deprecatedName, '}')"/></xsl:attribute>
                <xsl:text>&#10;      </xsl:text><xsla:value-of select="*[false()]"/>
                <xsl:text>&#10;    </xsl:text></xsl:element>
                <xsl:text>&#10;  </xsl:text></xsla:if><xsl:text>&#10;</xsl:text>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:if>

          <xsl:for-each select="Api/Param">
            <xsl:if test="contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid') and translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') != 'targethtmlelementid'">
              <xsl:text>&#10;  </xsl:text><xsla:variable name="{@name}" select="concat(substring(concat($id,'_tE'),0,1 div string-length(@{@name})),@{@name})"/>
              <xsl:text>&#10;  </xsl:text><xsla:if test="not(@{@name}) and not(../self::xapi:*)">
              <xsl:text>&#10;    </xsl:text><xsl:element name="{$containerElement}"><xsl:attribute name="id"><xsl:value-of select="concat('{$', @name, '}')"/></xsl:attribute>
              <xsl:text>&#10;      </xsl:text><xsla:value-of select="*[false()]"/>
              <xsl:text>&#10;    </xsl:text></xsl:element>
              <xsl:text>&#10;  </xsl:text></xsla:if><xsl:text>&#10;</xsl:text>
            </xsl:if>
          </xsl:for-each>
          
          <!-- prepare bcdOnLoad attribute -->
    
          <xsl:text>&#10;  </xsl:text><xsla:variable name="onLoad">

            <!-- remember possible parent data provider (e.g. modelUpdater) -->
            <xsl:if test="$gotJSPParent">
            <xsl:text>&#10;    </xsl:text><xsl:comment>get parentDataProvider before paramBag's push operation</xsl:comment>
    var parentDataProvider = bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1].parentDataProvider;</xsl:if>

            <!-- generate unique id if not given for data providers -->
            <xsl:if test="$gotId">
            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>paramBag push</xsl:comment>
    bcdui.core.bcdParamBag.push(new Object());<xsl:text></xsl:text>
            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>create unique id if not given</xsl:comment>
    var id = '<xsla:value-of select="$id"/>';<xsl:text></xsl:text>
            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>set parentDataProvider</xsl:comment>
    bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1].parentDataProvider = id;<xsl:text></xsl:text>
            </xsl:if>
    
            <!-- call nested xapi elements (test taken from jsp allowChildren defintion) -->
            <xsl:if test="$allowsChilds">
            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>call nested xapi elements</xsl:comment>
    (function(){<xsla:apply-templates select="xapi:*" />}());<xsl:text></xsl:text>
            </xsl:if>
    
            <!-- add context path in case of using an url starting with / -->
            <xsl:if test="$gotUrl">
            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>auto prepend context path if url starts with /</xsl:comment>
              <xsl:variable name="urlVar">
                <xsl:choose>
                  <xsl:when test="Api/Param[@name='stylesheetUrl']">stylesheetUrl</xsl:when>
                  <xsl:otherwise>url</xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              <xsl:text>&#10;    </xsl:text><xsla:variable name="urlFinal">
              <xsl:text>&#10;      </xsl:text><xsla:choose>
              <xsl:text>&#10;        </xsl:text><xsla:when test="starts-with(${$urlVar},'/')">
	          <xsl:text>&#10;          </xsl:text><xsla:value-of select="concat($bcdContextPath,${$urlVar})" />
              <xsl:text>&#10;        </xsl:text></xsla:when>
              <xsl:text>&#10;        </xsl:text><xsla:otherwise>
              <xsl:text>&#10;          </xsl:text><xsla:value-of select="${$urlVar}" />
              <xsl:text>&#10;        </xsl:text></xsla:otherwise>
              <xsl:text>&#10;      </xsl:text></xsla:choose>
              <xsl:text>&#10;    </xsl:text></xsla:variable>
            </xsl:if>
    
            <!-- transformation chain automatically adds parameters -->

            <xsl:if test="$extendsTransformationChain">
              <xsl:text>&#10;&#10;    </xsl:text><xsla:call-template name="extractJsParameters">
              <xsl:text>&#10;      </xsl:text><xsla:with-param name="parameterString" select="$parameterString"/>
              <xsl:text>&#10;    </xsl:text></xsla:call-template>
            </xsl:if>
            
            <!-- build up actual implementation function call name -->

            <xsl:variable name="functionCall">
              <xsl:choose>
                <xsl:when test="$gotImplementationPackage">
                  <xsl:variable name="x">
                    <xsl:call-template name="lastIndexOf">
                      <xsl:with-param name="s" select="@implementationPackage"/>
                      <xsl:with-param name="c" select="'.'"/>
                    </xsl:call-template>
                  </xsl:variable>
                  <xsl:value-of select="substring(@implementationPackage, 1, number($x))"/><xsl:call-template name="addPrefix"><xsl:with-param name="name" select="@name"/><xsl:with-param name="prefix" select="'create'"/></xsl:call-template>
                </xsl:when>
                <xsl:otherwise><xsl:value-of select="@implementationFunction"/></xsl:otherwise>
              </xsl:choose>
            </xsl:variable>

            <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>js implementation call with all parameters</xsl:comment>
            <xsl:value-of select="concat('&#10;    ', $functionCall, '({')"/>
            
            <!-- and the single attributes -->

            <xsl:for-each select="Api/Param[not(contains(@type, 'jsattr'))]">
              <xsl:if test="not(contains($skipParams, concat('|', @name, '|')))">
                <xsl:if test="position() = 1"><xsl:text>&#10;        </xsl:text></xsl:if>
                <xsl:if test="position() &gt; 1"><xsl:text>&#10;      , </xsl:text></xsl:if>
                <xsl:choose>
                  <xsl:when test="@jsName"><xsl:value-of select="concat(@jsName,': ')"/></xsl:when>
                  <xsl:when test="@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid')"></xsl:when>
                  <xsl:otherwise><xsl:value-of select="concat(@name,': ')"/></xsl:otherwise>
                </xsl:choose>
                <xsl:choose>
                  <xsl:when test="@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid')">
                  <xsl:text>&#10;        </xsl:text><xsla:choose>
                  <xsl:text>&#10;          </xsl:text><xsla:when test="../self::xapi:*">bcdSyntaxDummy: null</xsla:when>
                  <xsl:choose>
                    <xsl:when test="$hasDeprecatedTarget and @name='targetHtml'">
                      <xsl:text>&#10;          </xsl:text><xsla:otherwise><xsl:value-of select="concat(@name,': ')"/>'<xsla:value-of select="${$deprecatedName}"/>'</xsla:otherwise>
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:text>&#10;          </xsl:text><xsla:otherwise><xsl:value-of select="concat(@name,': ')"/>'<xsla:value-of select="${@name}"/>'</xsla:otherwise>
                    </xsl:otherwise>
                  </xsl:choose>
                  <xsl:text>&#10;        </xsl:text></xsla:choose>
                  </xsl:when>
                  <xsl:when test="@name='id'">id</xsl:when>
                  <xsl:when test="@name='url' or @name='stylesheetUrl'">'<xsla:value-of select="$urlFinal"/>'</xsl:when>
                  <xsl:when test="Impl/Xslt"><xsl:value-of select="Impl/Xslt"/></xsl:when>
                  <xsl:when test="starts-with(@isJSPChild, 'paramBag')">
                    <xsl:choose>
                      <xsl:when test="contains(@type, 'dataProvider')">bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1]<xsl:value-of select="substring-after(@isJSPChild, 'paramBag')"/> || '<xsla:value-of select="${@name}"/>' || null</xsl:when>
                      <xsl:otherwise>bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1]<xsl:value-of select="substring-after(@isJSPChild, 'paramBag')"/> || '<xsla:value-of select="${@name}"/>'</xsl:otherwise>
                    </xsl:choose>
                  </xsl:when>
                  <xsl:when test="@isJSPParent='true'">('<xsla:value-of select="${@name}"/>' != '' ? '<xsla:value-of select="${@name}"/>' : parentDataProvider)</xsl:when>
                  <xsl:when test="contains(@type, 'booleanWithDefault')">
                    <xsl:text>&#10;      (</xsl:text><xsla:choose>
                    <xsl:text>&#10;         </xsl:text><xsla:when test="${@name}">'<xsla:value-of select="${@name}"/>'=='true'</xsla:when>
                    <xsl:text>&#10;         </xsl:text><xsla:otherwise><xsl:value-of select="@default"/></xsla:otherwise>
                    <xsl:text>&#10;      </xsl:text></xsla:choose><xsl:text>)</xsl:text>
                  </xsl:when>
                  <xsl:when test="contains(@type, 'boolean')">('<xsla:value-of select="${@name}"/>'=='true')</xsl:when>
                  <xsl:when test="contains(@type, 'function') and @functionAttribute!=''">function(<xsl:value-of select="@functionAttribute"/>){<xsla:value-of select="${@name}"/>(<xsl:value-of select="@functionAttribute"/>);}</xsl:when>
                  <xsl:when test="contains(@type, 'function')">function(){<xsla:value-of select="${@name}"/>}</xsl:when>
                  <xsl:otherwise>'<xsla:value-of select="${@name}"/>'</xsl:otherwise>
                </xsl:choose>
              </xsl:if>
            </xsl:for-each>
    
            <!-- transformation chain automatically adds parameters -->

            <xsl:if test="$extendsTransformationChain">
              <xsl:text>&#10;      </xsl:text>, parameters: parameters<xsl:text></xsl:text>
            </xsl:if>

            <!-- add possible jsattributes (e.g. pdfexporter offers such attributes) -->

            <xsl:for-each select="Api/Param[contains(@type, 'jsattr')]">
              <xsl:text>&#10;    </xsl:text><xsla:if test="${@name}!=''">,<xsla:value-of select="${@name}"/></xsla:if>
            </xsl:for-each>

            <!-- add possible post operation (e.g. pdfexporter runs an execute) -->

            <xsl:text>&#10;    })</xsl:text><xsl:value-of select="@implementationFunctionPost"/><xsl:text>;</xsl:text>

            <!-- param bag pop and publish id -->

            <xsl:if test="$gotId">
              <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>paramBag pop</xsl:comment>
              <xsl:text>&#10;    </xsl:text>bcdui.core.bcdParamBag.pop();<xsl:text></xsl:text>
              <xsl:text>&#10;&#10;    </xsl:text><xsl:comment>publish id</xsl:comment>
              <xsl:text>&#10;    </xsl:text>bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1].dataProviders = id;<xsl:text></xsl:text>
            </xsl:if>

          <xsl:text>&#10;&#10;  </xsl:text></xsla:variable>

          <!-- write either bcdOnload or print out text depending if we're already a xapi child or not -->
          <xsl:text>&#10;&#10;  </xsl:text><xsl:comment>write generated js source as bcdOnLoad or directly (xapi)</xsl:comment>
          <xsl:text>&#10;  </xsl:text><xsla:choose>
          <xsl:text>&#10;    </xsl:text><xsla:when test="../self::xapi:*">
          <xsl:text>&#10;      </xsl:text><xsla:value-of select="$onLoad" />
          <xsl:text>&#10;    </xsl:text></xsla:when>
          <xsl:text>&#10;    </xsl:text><xsla:otherwise>
          <xsl:text>&#10;      </xsl:text><span bcdComment="{@name}">
          <xsl:text>&#10;        </xsl:text><xsla:attribute name="bcdOnLoad">
          <xsl:text>&#10;          </xsl:text><xsla:value-of select="$onLoad"/>
          <xsl:text>&#10;        </xsl:text></xsla:attribute>
          <xsl:text>&#10;        </xsl:text><xsla:value-of select="*[false()]"/>
          <xsl:text>&#10;      </xsl:text></span>
          <xsl:text>&#10;    </xsl:text></xsla:otherwise>
          <xsl:text>&#10;  </xsl:text></xsla:choose>

        </xsl:otherwise>
      </xsl:choose>
      </xsla:template><xsl:text>&#10;</xsl:text>
    </xsl:if>
    
    <xsl:if test="$isWidget">
      <xsl:text>&#10;</xsl:text>
      <xsla:template name="{@name}">
        <xsl:for-each select="Api/Param">
          <xsl:if test="not(@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid'))">
            <xsl:text>&#10;  </xsl:text>
            <xsl:choose>
              <xsl:when test="@default">
                <xsla:param name="{@name}" select="{@default}"/>
              </xsl:when>
              <xsl:otherwise>
                <xsla:param name="{@name}"/>
              </xsl:otherwise>
            </xsl:choose>
            <xsl:if test="@name='targetModelXPath'"><xsl:text>&#10;  </xsl:text><xsla:param name="targetModelId"/></xsl:if>
            <xsl:if test="@name='optionsModelXPath'"><xsl:text>&#10;  </xsl:text><xsla:param name="optionsModelId"/></xsl:if>
          </xsl:if>
        </xsl:for-each>
        <xsl:text>&#10;  </xsl:text>
        <xsl:element name="{$containerElement}">
          <xsl:for-each select="Api/Param">
            <xsl:if test="not(@name='targetHtml' or contains(translate(@name, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'targethtmlelementid'))">
              <xsl:variable name="upperCaseName">
                <xsl:choose>
                  <xsl:when test="@name='id'">id</xsl:when>
                  <xsl:otherwise>
                    <xsl:call-template name="addPrefix">
                      <xsl:with-param name="name" select="@name"/>
                      <xsl:with-param name="prefix" select="'bcd'"/>
                    </xsl:call-template>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              <xsl:attribute name="{$upperCaseName}"><xsl:value-of select="concat('{$',@name,'}')"/></xsl:attribute>
              <xsl:if test="@name='targetModelXPath'"><xsl:attribute name="bcdTargetModelId">{$targetModelId}</xsl:attribute></xsl:if>
              <xsl:if test="@name='optionsModelXPath'"><xsl:attribute name="bcdOptionsModelId">{$optionsModelId}</xsl:attribute></xsl:if>
            </xsl:if>
          </xsl:for-each>
          <xsl:attribute name="bcdOnLoad">
            <xsl:variable name="x">
              <xsl:call-template name="lastIndexOf">
                <xsl:with-param name="s" select="@implementationPackage"/>
                <xsl:with-param name="c" select="'.'"/>
              </xsl:call-template>
            </xsl:variable>
            <xsl:value-of select="concat(substring(@implementationPackage, 1, number($x)),@name,'.init(this);')"/>
          </xsl:attribute>
          <xsl:text>&#10;    </xsl:text>
          <xsla:value-of select="*[false()]"/>
          <xsl:for-each select="Api/Param[@xapiAttribute!='']">
          <xsl:text>&#10;    </xsl:text><xsla:if test="self::xapi:*">
          <xsl:text>&#10;      </xsl:text><xsla:attribute name="{@xapiAttribute}">
          <xsl:text>&#10;        </xsl:text><xsla:apply-templates/>
          <xsl:text>&#10;      </xsl:text></xsla:attribute>
          <xsl:text>&#10;    </xsl:text></xsla:if>
          </xsl:for-each>
        <xsl:text>&#10;  </xsl:text></xsl:element>
      </xsla:template>
      <xsl:text>&#10;</xsl:text>
    </xsl:if> 

  </xsl:template>

</xsl:stylesheet>