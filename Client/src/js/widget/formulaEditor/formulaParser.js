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
"use strict";
/**
 * Formula parser, based on shunting_yard algorithm in C, found at Wikipedia 2012
 * Adopted to support functions and to create BCD-UI calc:Calc formulas, extended to support functions with a non-fixed number of args
 *
 * TODO: 6/2/-3 can only be written as 6/2/(0-3)
 */

/**
 * A namespace for the BCD-UI formulaParser widget.
 * @namespace bcdui.widget.formulaEditor.Parser
 */
bcdui.widget.formulaEditor.Parser = Object.assign(bcdui.widget.formulaEditor.Parser,
/** @lends bcdui.widget.formulaEditor.Parser */
{

  // List of operators/functions known to the parser.
  // Of course the server also needs to know them also if a subtree is to be applied there
  op_info:
  {
    '+':           { preced: 2, opName: 'Add',         isLeftAssoc: true,  argsCnt: 2,        isFct: false, isAgg: false, isServerOnly: false },
    '-':           { preced: 3, opName: 'Sub',         isLeftAssoc: true,  argsCnt: 2,        isFct: false, isAgg: false, isServerOnly: false },
    '*':           { preced: 4, opName: 'Mul',         isLeftAssoc: true,  argsCnt: 2,        isFct: false, isAgg: false, isServerOnly: false },
    '/':           { preced: 4, opName: 'Div',         isLeftAssoc: true,  argsCnt: 2,        isFct: false, isAgg: false, isServerOnly: false },
    '%':           { preced: 4, opName: 'Mod',         isLeftAssoc: true,  argsCnt: 2,        isFct: false, isAgg: false, isServerOnly: false },
    '!':           { preced: 5, opName: 'Not',         isLeftAssoc: false, argsCnt: 1,        isFct: false, isAgg: false, isServerOnly: false },

    'min':         { preced: 6, opName: 'Min',         isLeftAssoc: false, argsCnt: 2,        isFct: true,  isAgg: false, isServerOnly: false },
    'max':         { preced: 6, opName: 'Max',         isLeftAssoc: false, argsCnt: 2,        isFct: true,  isAgg: false, isServerOnly: false },
    'abs':         { preced: 6, opName: 'Abs',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: false, isServerOnly: false },
    'zin':         { preced: 6, opName: 'Zin',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: false, isServerOnly: false },
    'niz':         { preced: 6, opName: 'Niz',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: false, isServerOnly: false },
    'igt':         { preced: 6, opName: 'Igt',         isLeftAssoc: false, argsCnt: 2,        isFct: true,  isAgg: false, isServerOnly: false },
    'ian':         { preced: 6, opName: 'Ian',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: false, isServerOnly: false },
    'coalesce':    { preced: 5, opName: 'Coa',         isLeftAssoc: false, argsCnt: 2,        isFct: true,  isAgg: false, isServerOnly: false },
    'avgWeighted': { preced: 5, opName: 'AvgWeighted', isLeftAssoc: false, argsCnt: Infinity, isFct: true,  isAgg: false, isServerOnly: false },

    // Per convention, server side-only calcs are starting upper-case. It will help users in the future and also help distinguishing max(a,b) and Max(aggr)
    'Concat':      { preced: 6, opName: 'Concat',      isLeftAssoc: false, argsCnt: Infinity, isFct: true,  isAgg: false, isServerOnly: true },
    'Distinct':    { preced: 6, opName: 'Distinct',    isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: false, isServerOnly: true },
    'Sum':         { preced: 6, opName: 'Sum',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true },
    'Avg':         { preced: 6, opName: 'Avg',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true },
    'Count':       { preced: 6, opName: 'Count',       isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true },
    'Max':         { preced: 6, opName: 'Max',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true, acceptsVarchar: true },
    'Min':         { preced: 6, opName: 'Min',         isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true, acceptsVarchar: true },
    'CntDist':     { preced: 6, opName: 'CntDist',     isLeftAssoc: false, argsCnt: Infinity, isFct: true,  isAgg: true,  isServerOnly: true, acceptsVarchar: true },

    'SumOver':     { preced: 6, opName: 'SumOver',     isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true },
    'AvgOver':     { preced: 6, opName: 'AvgOver',     isLeftAssoc: false, argsCnt: 1,        isFct: true,  isAgg: true,  isServerOnly: true }
  },

  /**
   * @private
   */
  _op_preced: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.preced : 0;
  },

  /**
   * @private
   */
  _op_name: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.opName : null;
  },

  /**
   * @private
   */
  _op_left_assoc: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.isLeftAssoc : false;
  },

  /**
   * @private
   */
  _op_arg_count: function(c,parsedArgsCount)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    if( ! opInfo )
      return c - 'A';
    // For Infinity allowed args-count, we check how many we actually found during parsing
    return opInfo.argsCnt != Infinity ? opInfo.argsCnt : parsedArgsCount;
  },

  /**
   * @private
   */
  _is_operator: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo && !opInfo.isFct; // Don't skip the test on opInfo, otherwise it will match idents as well, this is not simply !_is_function()
  },

  /**
   * @private
   */
  _is_function: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.isFct : false;
  },

  /**
   * @private
   */
  _is_acceptsVarchar: function(c) {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.acceptsVarchar : false;
  },

  /**
   * @private
   */
  _is_ident: function(c)
  {
    if( bcdui.widget.formulaEditor.Parser._is_function(c) )
      return false;
    return ((c.charAt(0) >= '0' && c.charAt(0) <= '9') ||
        (c.charAt(0) >= 'a' && c.charAt(0) <= 'z') ||
        (c.charAt(0) >= 'A' && c.charAt(0) <= 'Z') ||
        c.charAt(0) == '"' || c.charAt(0) == "'");
  },

  /**
   * @private
   */
  _is_number: function(c)
  {
    return (c.charAt(0) >= '0' && c.charAt(0) <= '9') || c.charAt(0) == '.';
  },

  /**
   * Function is an aggregation -> everything inside needs to be done on the server
   * @private
   */
  _is_aggregation: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.isAgg : false;
  },

  /**
   * Function is only available on the server
   * @private
   */
  _is_serverOnly: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.isServerOnly : false;
  },

  /**
   * Analytical function need some extra syntax checking
   * @private
   */
  _is_analyticalFct: function(c)
  {
    var opInfo = bcdui.widget.formulaEditor.Parser.op_info[c];
    return opInfo ? opInfo.opName.endsWith("Over") : false;
  },

  /**
   * Checks if input string (i.e. variable name) contains some formula part (operator, function etc)
   * Returns false of string s is a syntactically valid variable name which can stay unquoted for example, otherwise true
   * @private
   */
  _is_string_contain_operators: function(s){
    if (bcdui.widget.formulaEditor.Parser._is_function(s))
      return true;
    return s.match(/(^[a-zA-Z][a-zA-Z0-9\._]*$)|(^"[^"]*"$)/)==null ? true : false;
  },

  /**
   * Parse a maths formula in input like "2+3*A" into a calc:Calc expression
   * If optionsModel and optionsModelXPath are given, only variable names (like A) are allowed which exist in the options model
   */
  shunting_yard: function(input, optionsModel, optionsModelXPath, optionsModelRelativeValueXPath, skipVariablesValidation, skipServerSidedFunctions)
  {
    var fullInput = input;
    var last = "";
    var output = new Array(32);
    output.argsCnt = new Array(32);    // Parallel to output the number of args found for a function at the same index
    var c = "";
    var stack = new Array(32);         // Stack of operators and functions
    stack.argsCnt = new Array(32);     // Parallel to stack the number of args found for a function at the same index
    var parenthesesCommaCount = new Array();   // A stack following the current depth of parentheses, counting commas in it
    parenthesesCommaCount.lastClosedCount = 0; // When closing a parentheses and popping from the stack, this number of commas in the just closed part. Is reset to 0 when a function consumes them
    var sl = 0; // current stack pos
    var sc;
    var oPos = 0;

    var resultObject = {xml: "", error: "", result: false, errorPos: null}
    // syntax checking: empty brackets
    c = input.match(/\(\s*\)/);
    if( c!=null ) {
      resultObject.error = "Empty brackets";
      return resultObject;
    }
    c = "";
    while(input.length>0)
    {
      if(c != ' ')
        last = c;

      // read one token from the input stream
      c = input.match(/([a-zA-Z][a-zA-Z0-9\._]*$)|("[^"]*"$)/);
      if( c==null )
        c = input.match(/[0-9\.]+$/);
      if( c!=null )
        c = c[0];
      else
        c = input.charAt(input.length-1);
      input = input.substring(0,input.length-c.length);

      // Some syntax checks
      if(    ( (bcdui.widget.formulaEditor.Parser._is_ident(c) || c==')') && (bcdui.widget.formulaEditor.Parser._is_ident(last) || bcdui.widget.formulaEditor.Parser._is_function(last)) )
          || ( bcdui.widget.formulaEditor.Parser._is_ident(c) && last=='(' ) ) {
        resultObject.errorPos = (input.length+c.length+1);
        resultObject.error = "Missing operator between '"+c+"' and '"+last+"' at pos "+resultObject.errorPos;
        return resultObject;
      } else if( bcdui.widget.formulaEditor.Parser._is_function(c) && last!='(' ) {
        resultObject.errorPos = (input.length+c.length+1);
        resultObject.error = "Missing opening parenthesis between function '"+c+"' and '"+last+"' at pos "+resultObject.errorPos;
        return resultObject;
      } else if(    bcdui.widget.formulaEditor.Parser._is_operator(c) && ( bcdui.widget.formulaEditor.Parser._is_operator(last) || last=="" || last==")")
                 || ( c=="(" && !bcdui.widget.formulaEditor.Parser._is_ident(last) && !bcdui.widget.formulaEditor.Parser._is_function(last) && last!="(" ) ) {
        resultObject.errorPos = (input.length+c.length+1);
        resultObject.error = "Missing operand between '"+c+"' and '"+last+"' at pos "+resultObject.errorPos;
        return resultObject;
      }

      if(c != ' ') {
        // If the token is a number (identifier), then add it to the output queue.
        if(bcdui.widget.formulaEditor.Parser._is_ident(c)) {
          output[oPos++] = c;
        }
        // If the token is a function token, then push it onto the stack.
        else if(bcdui.widget.formulaEditor.Parser._is_function(c)) {
          // We have one more args than commas. Implicitly, we assume at least one param here
          stack.argsCnt[sl] = parenthesesCommaCount.lastClosedCount + 1;
          stack[sl++] = c;
          parenthesesCommaCount.lastClosedCount = 0; // All arguments are 'eaten' for the just closed parentheses hierarchy
        }

        // If the token is a function argument separator (e.g., a comma):
        else if(c == ',') {
          parenthesesCommaCount[parenthesesCommaCount.length-1]++;
          var pe = false;
          while(sl > 0)   {
            sc = stack[sl - 1];
            if(sc == ')')  {
              pe = true;
              break;
            }
            else {
              // Until the token at the top of the stack is a left parenthesis,
              // pop operators off the stack onto the output queue.
              output.argsCnt[oPos] = stack.argsCnt[sl - 1];
              output[oPos++] = sc;
              sl--;
            }
          }
          // If no left parentheses are encountered, either the separator was misplaced
          // or parentheses were mismatched.
          if(!pe) {
            resultObject.error = "Unmatched parentheses";
            return resultObject;
          }
        }
        // If the token is an operator, op1, then:
        else if(bcdui.widget.formulaEditor.Parser._is_operator(c)) {
          while(sl > 0) {
            sc = stack[sl - 1];
            // While there is an operator token, o2, at the top of the stack
            // op1 is left-associative and its precedence is less than or equal to that of op2,
            // or op1 is right-associative and its precedence is less than that of op2,
            if((bcdui.widget.formulaEditor.Parser._is_operator(sc) || bcdui.widget.formulaEditor.Parser._is_function(sc)) &&
               ((!bcdui.widget.formulaEditor.Parser._op_left_assoc(c) && (bcdui.widget.formulaEditor.Parser._op_preced(c) <= bcdui.widget.formulaEditor.Parser._op_preced(sc))) ||
                  (bcdui.widget.formulaEditor.Parser._op_preced(c) < bcdui.widget.formulaEditor.Parser._op_preced(sc))))   {
                // Pop o2 off the stack, onto the output queue;
              output.argsCnt[oPos] = stack.argsCnt[sl - 1];
              output[oPos++] = sc;
              sl--;
            }
            else {
                break;
            }
          }
          // push op1 onto the stack.
          stack[sl++] = c;
        }
        // If the token is a left parenthesis, then push it onto the stack.
        else if(c == ')') {
          stack[sl++] = c;
          parenthesesCommaCount.push(0);
        }
        // If the token is a right parenthesis:
        else if(c == '(') {
          var pe = false;
          parenthesesCommaCount.lastClosedCount += parenthesesCommaCount.pop(); // += because we may have left overs from parentheses without fcts
          // Until the token at the top of the stack is a left parenthesis,
          // pop operators off the stack onto the output queue
          while(sl > 0) {
            sc = stack[sl - 1];
            if(sc == ')')    {
              pe = true;
              break;
            }
            else  {
              output[oPos++] = sc;
              sl--;
            }
          }
          // If the stack runs out without finding a left parenthesis, then there are mismatched parentheses.
          if(!pe)  {
            resultObject.error = "Unmatched parentheses";
            return resultObject;
          }
          // Pop the left parenthesis from the stack, but not onto the output queue.
          sl--;
          // If the token at the top of the stack is a function token, pop it onto the output queue.
          if(sl > 0)   {
            sc = stack[sl - 1];
            if(bcdui.widget.formulaEditor.Parser._is_function(sc)) {
              output.argsCnt[oPos] = stack.argsCnt[sl - 1];
              output[oPos++] = sc;
              sl--;
            }
          }
        }
        else  {
          resultObject.error = "Unknown token '"+c+"'";
          return resultObject; // Unknown token
        }
      }
    }
    // When there are no more tokens to read:
    // While there are still operator tokens in the stack:
    while(sl > 0)  {
      sc = stack[sl - 1];
      if(sc == '(' || sc == ')')   {
        resultObject.error = "Unmatched parentheses";
        return resultObject;
      }
      if( bcdui.widget.formulaEditor.Parser._is_function(sc) )
        output.argsCnt[oPos] = stack.argsCnt[sl - 1];
      output[oPos++] = sc;
      sl--;
    }

    var oStr = "";
    for( var o=0; o<oPos; o++ )
      oStr += output[o]+" ";

    var xmlDoc = bcdui.core.browserCompatibility.createDOMFromXmlString("<formula><calc:Calc xmlns:calc=\"http://www.businesscode.de/schema/bcdui/calc-1.0.0\" type-name=\"NUMERIC\" scale=\"1\" unit=\"%\"></calc:Calc></formula>");

    var elem = xmlDoc.selectSingleNode("//*/calc:Calc");
    // Each change of operator creates a new level.
    var equalOps = new Array();       // This is the number of same operators following each other immediately on each level
    var operators = new Array();      // operator we found for each level
    operators.argsCnt = new Array();  // operator we found for each level
    var operandsForOp = new Array();  // This is the number of operands we found for one level
    var ns = "calc:";                 // This indicates the namespace of the created calc elements. calc is client, from aggr down we use wrq: for server
    var nsEnteredSeverCalcAt = null;     // If !=null this is the index of the operator on the current subtree's stack where we entered server side calc downwards
    for( var o=oPos-1; o>=0; o-- ) {

      // Each operator 'eats' as many operands as defined. An expression like max(1,2,3) will be detected here
      var l = 0;
      if (elem.childNodes) { jQuery.makeArray(elem.childNodes).forEach( function(e) { if (e.nodeType == 1) l++; }); }

      if( elem.nodeName=="calc:Calc" && l > 0 ) {
        resultObject.error = "Found too many operands for a function.";
        return resultObject;
      }

      // A) We found a known operator or function:
      if( bcdui.widget.formulaEditor.Parser._op_name(output[o])!=null )
      {
        // If this is a server-side-only calc, we switch
        
        if (bcdui.widget.formulaEditor.Parser._is_serverOnly(output[o]) && skipServerSidedFunctions) 
        {
          resultObject.error = "Server sided functions are not allowed here.";
          return resultObject;
        }
        
        if( bcdui.widget.formulaEditor.Parser._is_serverOnly(output[o]) )
        {
          if( ns == "calc:" ) // We cross the border right here
            nsEnteredSeverCalcAt = operators.length+1;
          ns = "wrq:";

          // Check: We cannot nest aggregators by nature, exception: in an analytical aggr, there can be one other aggr.
          if( bcdui.widget.formulaEditor.Parser._is_aggregation(output[o]) )
          {
            var numAgg = 0, numAggOver = 0;
            jQuery.each( operators, function(eachIndx,eachOp){
              if( bcdui.widget.formulaEditor.Parser._is_aggregation(eachOp) ) {
                if( bcdui.widget.formulaEditor.Parser._is_analyticalFct(eachOp) )
                  numAggOver++;
                else
                  numAgg++;
              }
            });
            if( numAggOver>1 || numAgg>0 || (bcdui.widget.formulaEditor.Parser._is_analyticalFct(output[o]) && numAggOver>0) ) {
              resultObject.error = "Aggregators cannot be nested, but '"+output[o]+"' is.";
              return resultObject;
            }
          }
        }

        // Put the operator on the stack
        // If this is the same operator, just add its children, don't create another level
        var operator = bcdui.widget.formulaEditor.Parser._op_name(output[o]);
        if( elem.nodeName!=ns+operator ) {
          operandsForOp[operandsForOp.length-1]++;
          elem = bcdui.core.browserCompatibility.appendElementWithPrefix(elem, ns+operator);
          equalOps.push(1);
          operandsForOp.push(0);
          operators.push(output[o]);
          operators.argsCnt.push(output.argsCnt[o])
        }
        else
          equalOps[equalOps.length-1]++;
      }
      // B) We found a number constant
      else if (bcdui.widget.formulaEditor.Parser._is_number(output[o])){
        operandsForOp[operandsForOp.length-1]++;
        var newElem = bcdui.core.browserCompatibility.appendElementWithPrefix(elem, ns+"Value");
        newElem.text = output[o];
      }
      // C) We found a measure-id
      else {
        // Its detected to be a variable name.
        operandsForOp[operandsForOp.length-1]++;
        var caption = output[o].charAt(0) == '"' ? output[o].substring(1, output[o].length - 1) : output[o];
        var variable = caption;

        // If we have an options model given, we only accept the variable if we find it in there
        // And we may need to translate the given caption into its code
        if( optionsModel && optionsModelXPath) {
          var v = caption.replace(/\"/g,"");
          var xPath = optionsModelXPath + "[normalize-space(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\"', 'abcdefghijklmnopqrstuvwxyz')) = normalize-space(translate(\"" + v + "\", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]/";

          // If id!=caption (==optionsModelRelativeValueXPath given),
          // the user will always provide the caption and we need to return the id
          var captionPath = "";
          if (optionsModelRelativeValueXPath != null && !!optionsModelRelativeValueXPath.trim() )
            captionPath = optionsModelRelativeValueXPath;

          var result = bcdui.widget._getDataFromXML(optionsModel, xPath+captionPath);
          if (result) {
            variable = result; // get the id
          } else if (!result && !skipVariablesValidation) {
            resultObject.error = "Undefined variable '"+ caption +"'";
            return resultObject;
          } // else we use the caption

          // Sub-totals cannot be used inside a server-side calculation
          var containsAgg = bcdui.widget._getDataFromXML(optionsModel, xPath+"../@containsAgg");
          if( ns=="wrq:" && containsAgg=="true" ) {
            resultObject.error = "Aggregators cannot be nested. '"+caption+"' contains an aggregator."; // TODO Message could say "within a server-calc", but currently, users won't understand that as they only know aggregators as trigger for a server calc.
            return resultObject;
          }
          // Dimensions can only be used in some places as they are treated as char data
          // TODO, allow also concat but enforce that to be in CntDist and so on.
          // In essence check which operators accept strings and which make numbers out of it and check the nesting
          var resultType = bcdui.widget._getDataFromXML(optionsModel, xPath+"../@type-name");
          if( resultType=="VARCHAR" && (operators.length==0 || ! bcdui.widget.formulaEditor.Parser._is_acceptsVarchar(operators[operators.length-1]) ) ) {
            resultObject.error = "String data '"+result+"' is needs an operator which accepts strings.";
            return resultObject;
          }
        }

        var newElem = bcdui.core.browserCompatibility.appendElementWithPrefix(elem, ns+"ValueRef");
        newElem.setAttribute("idRef", variable);
        newElem.setAttribute("dmRef", variable);
      }
      // The operator (and some of its anchestors) may be complete in terms of operands.
      while( operandsForOp[operandsForOp.length-1] == equalOps[equalOps.length-1]+bcdui.widget.formulaEditor.Parser._op_arg_count(operators[operators.length-1],operators.argsCnt[operators.length-1])-1 ) {

        // Here we apply some shortcuts which create whole structures from the dom which was build so far

        // avgWeighted has a special handling as its output is not 1:1 but a whole structure
        // avgWeighted(A,B,C) -> sum(A,B,C)/sum(count(A),count(B),count(C))
        if( operators[operators.length-1]=='avgWeighted' ) {
          var avgD = bcdui.core.browserCompatibility.appendElementWithPrefix(elem.parentNode, "calc:Div");
          var avgNum = bcdui.core.browserCompatibility.appendElementWithPrefix(avgD, "calc:Add");
          var avgDen = bcdui.core.browserCompatibility.appendElementWithPrefix(avgD, "calc:Add");
          jQuery.makeArray(elem.childNodes).forEach( function(e) {
            if (e.nodeType == 1) {
              if( e.nodeName!="calc:ValueRef" )
                resultObject.error = "No calculations allowed inside avgWeighted.";
              avgNum.appendChild(e.cloneNode(true));
              e.setAttribute("aggr", "count");
              avgDen.appendChild(e);
            }
          });
          if( resultObject.error )
            return resultObject;
          elem.parentNode.removeChild(elem);
          elem = avgD;
        }
        // Special handling for CntDist(a,b,c,..)
        else if( operators[operators.length-1]=='CntDist' ) {
          var cnt = bcdui.core.browserCompatibility.appendElementWithPrefix(elem.parentNode, "wrq:Count");
          var dist = bcdui.core.browserCompatibility.appendElementWithPrefix(cnt, "wrq:Distinct");
          var cnct = bcdui.core.browserCompatibility.appendElementWithPrefix(dist, "wrq:Concat");
          cnct.setAttribute("separator","\uE0F1"); // A char that is not expeced in any data
          jQuery.makeArray(elem.childNodes).forEach( function(e) {
            if (e.nodeType == 1)
              cnct.appendChild(e);
          });
          elem.parentNode.removeChild(elem);
          elem = cnt;
        }

        // Operator is finished, move one level up
        // In case we cross an aggregation, we switch back to client calc
        if( operators.length == nsEnteredSeverCalcAt ) {
          nsEnteredSeverCalcAt = null;
          ns = "calc:";
        }
        elem = elem.parentNode;
        operandsForOp.pop();
        equalOps.pop();
        operators.pop();
      }
    }
    if( elem.nodeName!="calc:Calc" ) {
      resultObject.error = "Not enough operands for a function.";
      return resultObject;
    }
    resultObject.xml = elem;
    resultObject.result = true;
    return resultObject;
  }
});