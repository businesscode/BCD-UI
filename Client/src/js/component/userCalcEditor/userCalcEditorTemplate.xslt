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

<xsl:import href="../../widget/widget.xslt"/>
<xsl:import href="../../widgetNg/widgetNg.xslt"/>

<xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

<xsl:param name="id"/>
<xsl:param name="targetModelXPath"/>
<xsl:param name="tempTargetModelXPath"/>
<xsl:param name="optionsModelXPath"/>
<xsl:param name="optionsModelRelativeValueXPath"/>
<xsl:param name="dialogCaption"/>
<xsl:param name="uniqueOptionsModelXpath"/>
<xsl:param name="isFormatOptionsVisible"/>
<xsl:param name="validateVariableNamesCheckbox"/>
<xsl:param name="validateVariableNamesCaption"/>
<xsl:param name="skipServerSidedFunctions"/>

<xsl:template match="/*">
  <xsl:call-template name="userCalcEditor">
    <xsl:with-param name="id" select="$id"/>
    <xsl:with-param name="targetModelXPath" select="$targetModelXPath"/>
    <xsl:with-param name="tempTargetModelXPath" select="$tempTargetModelXPath"/>
    <xsl:with-param name="optionsModelXPath" select="$optionsModelXPath"/>
    <xsl:with-param name="optionsModelRelativeValueXPath" select="$optionsModelRelativeValueXPath"/>
    <xsl:with-param name="dialogCaption" select="$dialogCaption"/>
    <xsl:with-param name="uniqueOptionsModelXpath" select="$uniqueOptionsModelXpath"/>
    <xsl:with-param name="isFormatOptionsVisible" select="$isFormatOptionsVisible"/>
    <xsl:with-param name="validateVariableNamesCheckbox" select="$validateVariableNamesCheckbox"/>
    <xsl:with-param name="validateVariableNamesCaption" select="$validateVariableNamesCaption"/>
    <xsl:with-param name="skipServerSidedFunctions" select="$skipServerSidedFunctions"/>
  </xsl:call-template>
</xsl:template>

<xsl:template name="userCalcEditor">
  <xsl:param name="id"/>
  <xsl:param name="targetModelXPath"/>
  <xsl:param name="tempTargetModelXPath"/>
  <xsl:param name="optionsModelXPath"/>
  <xsl:param name="optionsModelRelativeValueXPath"/>
  <xsl:param name="dialogCaption"/>
  <xsl:param name="uniqueOptionsModelXpath"/>
  <xsl:param name="isFormatOptionsVisible"/>
  <xsl:param name="validateVariableNamesCheckbox"/>
  <xsl:param name="validateVariableNamesCaption"/>
  <xsl:param name="skipServerSidedFunctions"/>

  <span class="bcdUserCalcEditor" id="{$id}" style="visibility: true"
    bcdTargetModelXPath="{$targetModelXPath}"
    bcdTempTargetModelXPath="{$tempTargetModelXPath}"
    bcdOptionsModelXPath="{$optionsModelXPath}"
    bcdUniqueOptionsModelXpath="{$uniqueOptionsModelXpath}"
    bcdOptionsModelRelativeValueXPath="{$optionsModelRelativeValueXPath}">
    <div class="bcdUserCalcEditorCaption">
      <xsl:attribute name="bcdTranslate"><xsl:value-of select="$dialogCaption"/></xsl:attribute>
      <xsl:value-of select="$dialogCaption"/>
    </div>
    <div class="bcdUserCalcEditorName">
      <label>Name:</label>
      <xsl:call-template name="inputField">
        <xsl:with-param name="targetModelXPath" select="concat($tempTargetModelXPath, '/@caption')"/>
        <xsl:with-param name="onBlur">bcdui.component.userCalcEditor._onNameUpdate('<xsl:value-of select="$id"/>', 'formulaEditor_<xsl:value-of select="$id"/>', this)</xsl:with-param>
        <xsl:with-param name="mandatory" select="true()"/>
      </xsl:call-template>
    </div>
    <div class="bcdUserCalcEditorFormula">
      <xsl:call-template name="formulaEditor">
        <xsl:with-param name="id" select="concat('formulaEditor_',$id)"/>
        <xsl:with-param name="targetModelXPath" select="$tempTargetModelXPath"/>
        <xsl:with-param name="optionsModelXPath" select="$optionsModelXPath"/>
        <xsl:with-param name="optionsModelRelativeValueXPath" select="$optionsModelRelativeValueXPath"/>
        <xsl:with-param name="caption">Rule:</xsl:with-param>
        <xsl:with-param name="skipValidationCaption" select="$validateVariableNamesCaption"/>
        <xsl:with-param name="validateVariableNamesCheckbox" select="$validateVariableNamesCheckbox"/>
        <xsl:with-param name="validate" select="true()"/>
        <xsl:with-param name="mandatory" select="true()"/>
        <xsl:with-param name="skipServerSidedFunctions" select="$skipServerSidedFunctions"/>
      </xsl:call-template>
    </div>
    <div class="bcdUserCalcEditorParameters">
      <xsl:if test="not(boolean($isFormatOptionsVisible))">
        <xsl:attribute name="style">display:none</xsl:attribute>
      </xsl:if>
      <label>Format:</label><input id="doScale" type="checkbox" class="bcdCalcEditorFormat checkboxes" checked="checked"/>
      <span class="bcdCalcEditorFormatComponents"><label>Fractional digits:</label>
        <xsl:call-template name="inputField">
          <xsl:with-param name="id" select="'inputScale'"/>
          <xsl:with-param name="targetModelXPath" select="concat($tempTargetModelXPath, '/calc:Calc/@scale')"/>
        </xsl:call-template>
        <label>Percent:</label> <input type="checkbox" class="bcdCalcEditorPercent checkboxes"/></span>
    </div>
    <br style="clear:both"/>
    <div class="bcdUserCalcEditorLabelDiv">
      <div>
        <input type="checkbox" class="bcdZeroIfNullOp checkboxes"/>
        <label class="bcdUserCalcEditorLabel"><xsl:attribute name="bcdTranslate">Auto ZeroIfNull on Operands</xsl:attribute>
          Auto ZeroIfNull on Operands
        </label>
      </div>
      <div>
        <input type="checkbox" class="bcdSuppressZero checkboxes"/>
        <label class="bcdUserCalcEditorLabel"><xsl:attribute name="bcdTranslate">Suppress Zero</xsl:attribute>
          Suppress Zero
        </label>
      </div>
    </div>
    <br style="clear:both"/>
    <div class="bcdUserCalcEditorButtons form-row">
      <div class="col-sm-auto">
        <xsl:call-template name="buttonNg">
          <xsl:with-param name="caption">Ok</xsl:with-param>
          <xsl:with-param name="onClickAction">bcdui.component.userCalcEditor._save();</xsl:with-param>
        </xsl:call-template>
      </div>
      <div class="col-sm-auto">
        <xsl:call-template name="buttonNg">
          <xsl:with-param name="caption">Cancel</xsl:with-param>
          <xsl:with-param name="onClickAction">bcdui.component.userCalcEditor._cancel();</xsl:with-param>
        </xsl:call-template>
      </div>
    </div>
  </span>
</xsl:template>
</xsl:stylesheet>
