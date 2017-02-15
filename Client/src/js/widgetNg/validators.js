/*
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
*/
/**
 * validators package, common API all validators share:
 *
 * validator functions are simple functions taking argument object as parameter and returning
 * either NULL (for successful validation) or a validationError object in case of a failed validtion.
 *
 * the validationErrorObject properties:
 *
 * validationMessage{i18nToken}
 *
 * validation function MUST not run asynchronously! it is expected to block and return once validation is done.
 * the argument object is arbitrary and defined by particular validation function.
 *
 */

/**
 * A namespace for the BCD-UI widget validation (general).
 * @namespace bcdui.widgetNg.validation.validators.general
 */
bcdui.util.namespace("bcdui.widgetNg.validation.validators.general",
/** @lends bcdui.widgetNg.validation.validators.general */
{}
);

/**
 * widget validator adaptors, which implement widget API and use general validators.
 * the widget validator API:
 * takes only one parameter: htmlElementId
 * expects the referenced element to provide settings  of widget configuration API via PrototypeJS Element.retrieve('_args_')
 */
/**
 * A namespace for the BCD-UI widget validation (specific).
 * @namespace bcdui.widgetNg.validation.validators.widget
 */
bcdui.util.namespace("bcdui.widgetNg.validation.validators.widget",
/** @lends bcdui.widgetNg.validation.validators.widget */
{}
);

/**
 * validates on string length, params:
 * - value {String}, may be null
 * - max {int}: maximum string length
 */
bcdui.widgetNg.validation.validators.general.valueLengthValidator = function(args){
  if(args.value==null || args.value.length<=args.max)return null;
  return {
    validationMessage : bcdui.i18n.TAG + "bcd_ValidDisplaySize"
  }
}

/**
 * validates the string against given regex pattern, params:
 * - value {String}, may be null
 * - pattern {String} regular expression
 */
bcdui.widgetNg.validation.validators.general.patternValidator = function(args){
  if(args.value==null || !args.value.trim())return null;
  return new RegExp(args.pattern).test(args.value) ? null : {validationMessage: bcdui.i18n.TAG + "bcd_ValidPattern"};
}

/**
 * validates that value is neither null nor blank,params:
 * - value
 */
bcdui.widgetNg.validation.validators.general.notEmptyValidator = function(args){
  return (args.value == null || !args.value.trim()) ? {validationMessage: bcdui.i18n.TAG + "bcd_ValidNullable"} : null;
}

/**
 * generic type validators, input parameter is only a value:
 * - value, nulls / empty values are valid!
 *
 * @return null if valid, object with validationMessage property otherwise
 */
bcdui.widgetNg.validation.validators.general.TYPE_VALIDATORS={
    "int" : function(value){
      if(value==null || !value.trim())return null;
      return /^[0-9]+$/.test(value) ? null : {validationMessage: bcdui.i18n.TAG + "bcd_ValidTypeName_INTEGER"};
    },
    "number": function(value){
      if(value==null || !value.trim())return null;
      return !isNaN(value) ? null : {validationMessage: bcdui.i18n.TAG + "bcd_ValidTypeName_NUMERIC"};
    },
    "email": function(value){
      if(value==null || !value.trim())return null;
      return /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/.test(value) ? null : {validationMessage: bcdui.i18n.TAG + "bcd_ValidEmail"};
    }
}


// ### WIDGET VALIDATORS ###

/**
 * this getter we have to use which is compliant to the non-native placeholder
 * feature
 *
 * @see implementation at bcdui.widgetNg.input.isFieldEmpty
 *
 * @return value of the field or "" if the field is empty
 */
bcdui.widgetNg.validation.validators.widget.getValue = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  if(el.get(0).value==null||!el.get(0).value.trim()||el.data("bcdIsValuePlaceholder")){
    return "";
  }else{
    return el.get(0).value;
  }
}

/**
 * checks the value of element for its length constraints,
 * widget configuration API used:
 * - maxlength
 *
 * @return null if valid, validationMessageObject otherwise
 */
bcdui.widgetNg.validation.validators.widget.valueLength = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  var args = el.data("_args_");
  return bcdui.widgetNg.validation.validators.general.valueLengthValidator({
    value: bcdui.widgetNg.validation.validators.widget.getValue(el.get(0)),
    max: args.maxlength
  });
}

/**
 * @see bcdui.widgetNg.validation.validators.general.patternValidator
 */
bcdui.widgetNg.validation.validators.widget.patternValidator = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  var args = el.data("_args_");
  return bcdui.widgetNg.validation.validators.general.patternValidator({
    value: bcdui.widgetNg.validation.validators.widget.getValue(el.get(0)),
    pattern: args.pattern
  });
}

/**
 * @see bcdui.widgetNg.validation.validators.general.notEmptyValidator
 */
bcdui.widgetNg.validation.validators.widget.notEmptyValidator = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  return bcdui.widgetNg.validation.validators.general.notEmptyValidator({
    value: bcdui.widgetNg.validation.validators.widget.getValue(el.get(0))
  });
}

/**
 * checks that target data node is not tagged invalid with bcdInvalid attribute. The attribute
 * itself carries the validation-message. This validator shall not be used generally by sticking
 * it to other widget validators, since it does NOT validate widget's validity but the model's
 * validity. This validator shall be handled manually by a widget only during SYNC_READ, so that
 * it is always able to SYNC_WRITE (write back) widget's data to the model. General widget validation
 * API supports this case as of widget.validator.validateElement(htmlElementId, checkDataValidity) function.
 *
 * extended widget configuration api used:
 *  - config.target.modelId
 *  - config.target.xPath
 */
bcdui.widgetNg.validation.validators.widget.invalidModelDataValidator = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  var config = el.data("_config_");
  var node = bcdui.factory.objectRegistry.getObject(config.target.modelId).dataDoc.selectSingleNode(config.target.xPath);
  var bcdInvalidValue = null;

  if(node!=null){
    if(node.nodeType == 2){
      // is ATTRIBUTE
      node = bcdui.util.xml.getParentNode(node);
    }
    bcdInvalidValue = node.getAttribute("bcdInvalid");
  }

  return bcdInvalidValue == null ? null : { validationMessage: bcdInvalidValue };
}

/**
 * type validator adapters
 */
bcdui.widgetNg.validation.validators.widget.TYPE_VALIDATORS = {
    "int" : function(htmlElementId){
      return bcdui.widgetNg.validation.validators.general.TYPE_VALIDATORS["int"](bcdui.widgetNg.validation.validators.widget.getValue(htmlElementId));
    },
    "number" : function(htmlElementId){
      return bcdui.widgetNg.validation.validators.general.TYPE_VALIDATORS["number"](bcdui.widgetNg.validation.validators.widget.getValue(htmlElementId));
    },
    "email" : function(htmlElementId){
      return bcdui.widgetNg.validation.validators.general.TYPE_VALIDATORS["email"](bcdui.widgetNg.validation.validators.widget.getValue(htmlElementId));
    }
}

// TODO refactor packages, rename validators.js to validationPackage.js

/**
 * this function carries out validation via native html5 constraint validation api (if available)
 * and optionally marks the field as invalid in case customValidationMessages are provided (i.e.
 * already has been validation with custom validators), additionally it displays the validationMessages
 * to the user. Also resets the field to valid if neither customValidationMessages has been provided nor
 * native validation has returned negative result.
 *
 * @param htmlElementId - validatable element
 * @param validationMessages{string[]} array of custom validation messages to display for this element (optional)
 *
 * @return TRUE if field has been validated and has no errors, false otherwise
 */
bcdui.widgetNg.validation.validateField = function(htmlElementId, customValidationMessages){
  var el = bcdui._migPjs._$(htmlElementId);
  var customMsg = null;
  var hasCustomMsg = customValidationMessages!=null && customValidationMessages.length>0;

  var nativeValidationMsg="";

  // if set to TRUE in case validation is natively supported and
  // the field has been validated by built-in
  // browser validator. In case of TRUE the browser native validation
  // message is stored in 'nativeValidationMsg' variable (in case of invalidity)
  var hasNativelyValidated=false;

  // if available, run native validation
  if(el.get(0).checkValidity || bcdui.browserCompatibility._hasFeature("inputtypes." + (el.attr("type")||"text"))){
    hasNativelyValidated = true;
    // reset custom validity if set set to trigger automatic validation
    if(el.get(0).validity.customError){
      el.get(0).setCustomValidity("");
    }
    bcdui.log.isTraceEnabled() && bcdui.log.trace("validateField: type " + el.attr("type") + " is supported or constraint validation API available");
    if(!el.get(0).checkValidity()){
      // some browsers store validation message in title, suppress it here
      // since we display that information in our balloon
      el.attr("title","");
      nativeValidationMsg = el.get(0).validationMessage;
      bcdui.log.isTraceEnabled() && bcdui.log.trace("native validation passed and detects field invalid: " + nativeValidationMsg);
    }else{
      bcdui.log.isTraceEnabled() && bcdui.log.trace("native validation passed - the field is valid.");
    }
  }else{
    bcdui.log.isTraceEnabled() && bcdui.log.trace("validateField: type " + el.attr("type") + " is NOT supported,skip native validation");
  }

  // collect custom and native validation messages
  var allInvalidationMessages=[];
  {
    // fill msg array with custom messages
    if(hasCustomMsg){
      allInvalidationMessages = allInvalidationMessages.concat(customValidationMessages);
    }
    // add the native validation message, if we have one.
    if(!!nativeValidationMsg.trim()){
      allInvalidationMessages.push(nativeValidationMsg);
    }
  }

  // store/reset the invalidation messages so balloon can extract the information
  if(allInvalidationMessages.length>0){
    el.data("_validationMessages_", allInvalidationMessages);
  }else{
    el.data("_validationMessages_", null);
  }

  /*
   * set / clean validity status depending on browser html5 capabilities
   * and custom validation results
   */

  if(hasNativelyValidated && el.get(0).validity.valid && hasCustomMsg){
    /*
     * if the field was natively validated, yet yielded the status VALID
     * but we have custom validation messages - we set the status to custom error
     */
    bcdui.widgetNg.validation.setCustomValidity(el.get(0), false);  // the content is provided by our balloon
  }else if(!hasNativelyValidated){
    /*
     * no native validation provided - the validation state depends on custom-validation
     */
    bcdui.widgetNg.validation.setCustomValidity(el.get(0), !hasCustomMsg);
  }

  return !bcdui.widgetNg.validation.indicateFieldValidity(el.get(0));
}

/**
 * sets custom validity, use html5 constraint validation API if available,
 * otherwise polyfill, ensures that following properties are set properly:
 *
 *  (Boolean) validity.valid
 *  (Boolean) validity.customError
 *  (String)  validationMessage (is set to "INVALID") in case of non-validity
 */
bcdui.widgetNg.validation.setCustomValidity = function(htmlElement, isValid){
  var el = bcdui._migPjs._$(htmlElement);
  bcdui.log.isTraceEnabled() && bcdui.log.trace("setCustomValidity: isValid: " + isValid);
  if(el.get(0).setCustomValidity){
    /*
     * natively supported
     */
    el.attr("title",""); // some browsers displays custom validation in title, we supress it
    el.get(0).setCustomValidity(isValid ? "" : "INVALID");
  }else{
    if(!htmlElement.validity){
      htmlElement.validity={}
    }
    htmlElement.validity.valid = isValid;
    htmlElement.validity.customError = isValid;
    htmlElement.validationMessage = isValid ? null : "INVALID";
  }
}

/**
 * checks the field for validity via html5 constraint validation api and indicate
 * by adding/removing particular CSS classes. The classes are always added, even in case
 * native validation is supported (via :invalid pseudo class)
 *
 * @return TRUE if validation message has been placed, so field is not valid, false otherwise.
 */
bcdui.widgetNg.validation.indicateFieldValidity = function(htmlElement){

  var el = bcdui._migPjs._$(htmlElement);

  if(!el.get(0).validity || el.get(0).validity.valid){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("indicateFieldValidity: field is valid. remove all markers");
    // remove all validation markers
    el.removeClass("bcdInvalid");
    // field is valid
    return false;
  }else{
    bcdui.log.isTraceEnabled() && bcdui.log.trace("indicateFieldValidity: field is invalid, set validation markers");
    // set validation marker
    el.addClass("bcdInvalid");
    // field is invalid
    return true;
  }
}

/**
 * NO REVALIDATION, just retrieval of current validity state, consideres
 * native (constraint validation api) state and bcdui-internal ( existence of 'bcdInvalid' class).
 * CSS case has to be considered because browsers native validation implementaion may
 * switch validity state so that we cannot detect the change without fully revalidating
 * the field.
 * @return true if valid, false otherwise
 */
bcdui.widgetNg.validation.hasValidStatus = function(htmlElement){
  return htmlElement.validity==null || (htmlElement.validity.valid && !bcdui._migPjs._$(htmlElement).hasClass("bcdInvalid"));
}