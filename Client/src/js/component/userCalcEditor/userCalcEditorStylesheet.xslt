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

<xsl:output method="html" encoding="UTF-8" indent="no"/>

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
      <bcd-inputField>
        <xsl:attribute name="targetModelXPath"><xsl:value-of select="concat($tempTargetModelXPath, '/@caption')"/></xsl:attribute>
        <xsl:attribute name="onBlur">bcdui.component.userCalcEditor._onNameUpdate(('<xsl:value-of select="$id"/>'), ('formulaEditor_<xsl:value-of select="$id"/>'), this)</xsl:attribute>
        <xsl:attribute name="mandatory">true</xsl:attribute>
      </bcd-inputField>
    </div>
    <div class="bcdUserCalcEditorFormula">
      <bcd-formulaeditor>
        <xsl:attribute name="id"><xsl:value-of select="concat('formulaEditor_',$id)"/></xsl:attribute>
        <xsl:attribute name="targetModelXPath"><xsl:value-of select="$tempTargetModelXPath"/></xsl:attribute>
        <xsl:attribute name="optionsModelXPath"><xsl:value-of select="$optionsModelXPath"/></xsl:attribute>
        <xsl:attribute name="optionsModelRelativeValueXPath"><xsl:value-of select="$optionsModelRelativeValueXPath"/></xsl:attribute>
        <xsl:attribute name="caption">Rule:</xsl:attribute>
        <xsl:attribute name="skipValidationCaption"><xsl:value-of select="$validateVariableNamesCaption"/></xsl:attribute>
        <xsl:attribute name="validateVariableNamesCheckbox"><xsl:value-of select="$validateVariableNamesCheckbox"/></xsl:attribute>
        <xsl:attribute name="validate">true</xsl:attribute>
        <xsl:attribute name="mandatory">true</xsl:attribute>
        <xsl:attribute name="skipServerSidedFunctions"><xsl:value-of select="$skipServerSidedFunctions"/></xsl:attribute>
      </bcd-formulaeditor>
    </div>
    <div class="bcdUserCalcEditorParameters">
      <xsl:if test="not(boolean($isFormatOptionsVisible))">
        <xsl:attribute name="style">display:none</xsl:attribute>
      </xsl:if>
      <label>Format:</label><input id="doScale" type="checkbox" class="bcdCalcEditorFormat checkboxes" checked="checked"/>
      <span class="bcdCalcEditorFormatComponents"><label>Fractional digits:</label>
        <bcd-inputfield>
          <xsl:attribute name="id">inputScale</xsl:attribute>
          <xsl:attribute name="targetModelXPath"><xsl:value-of select="concat($tempTargetModelXPath, '/calc:Calc/@scale')"/></xsl:attribute>
        </bcd-inputfield>
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
        <bcd-buttonng>
          <xsl:attribute name="caption">Ok</xsl:attribute>
          <xsl:attribute name="onClickAction">bcdui.component.userCalcEditor._save();</xsl:attribute>
        </bcd-buttonng>
      </div>
      <div class="col-sm-auto">
        <bcd-buttonng>
          <xsl:attribute name="caption">Cancel</xsl:attribute>
          <xsl:attribute name="onClickAction">bcdui.component.userCalcEditor._cancel();</xsl:attribute>
        </bcd-buttonng>
      </div>
    </div>
  </span>
</xsl:template>
</xsl:stylesheet>
