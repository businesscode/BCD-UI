/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.wrs.load.modifier;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * Changes a standard f:Filter element as created by the period chooser from mo/cw to dy
 * Useful to support table partitioning by dy while the client keeps "thinking" in mo etc
 */
public class Filter2DyModifier implements Modifier 
{
  private final XPath xp;
  private Document doc;
  private Element filterElem;

  public Filter2DyModifier() {
    xp = XPathUtils.newXPath();
  }
  
  public void process(Element selectElem) throws ParserConfigurationException 
  {
    doc = selectElem.getOwnerDocument();
    try {
      final XPathExpression filterXpathExpr = xp.compile(".//f:Filter[1]");
      filterElem = (Element) filterXpathExpr.evaluate(selectElem, XPathConstants.NODE);
    } catch (XPathExpressionException e) {
      throw new ParserConfigurationException("Could not concvert date formate to dy");
    }
    
    // Nothing to do
    if( filterElem==null ) return;

    periodTypeToDyRange();
  }
  
  public void periodTypeToDyRange() 
  {
    try {
  
      List<Map<String, String>> l = periodTypeToRange();
    
      if (! l.isEmpty()) {

        // remove affected period nodes
        XPathExpression xPath = xp.compile("//*[@bcdMarker]");
        XPathExpression xPath2 = xp.compile("./f:Expression[@bRef='yr' or @bRef='qr' or @bRef='mo' or @bRef='cw' or @bRef='cwyr']");
        NodeList remNodes = (NodeList) xPath.evaluate(filterElem, XPathConstants.NODESET);
        for (int r = 0; r < remNodes.getLength(); r++) {
          Node removeNode = remNodes.item(r);
          // do not remove not converted entries
          if ("true".equals(((Element)removeNode).getAttribute("bcdNotConverted")))
            continue;
          if (removeNode.getNodeName() == "f:And")  // f:And 'should' be a periodChooser like subnode, so we can remove it 
            removeNode.getParentNode().removeChild(removeNode);
          else { // otherwise we remove the single instances of the well known bRefs
            NodeList remNodes2 = (NodeList) xPath2.evaluate(removeNode, XPathConstants.NODESET);
            for (int r2 = 0; r2 < remNodes2.getLength(); r2++) {
              remNodes2.item(r2).getParentNode().removeChild(remNodes2.item(r2));
            }
          }
        }

        // and add new ranges (only valid ones were collected)
        for (int p = 0; p < l.size(); p++) {
          Element outer = doc.createElementNS("http://www.businesscode.de/schema/bcdui/filter-1.0.0", "f:And");
          Element from = doc.createElementNS("http://www.businesscode.de/schema/bcdui/filter-1.0.0", "f:Expression");
          Element to = doc.createElementNS("http://www.businesscode.de/schema/bcdui/filter-1.0.0", "f:Expression");
          from.setAttribute("bRef", "dy");
          from.setAttribute("op", ">=");
          from.setAttribute("value", l.get(p).get("from"));
          to.setAttribute("bRef", "dy");
          to.setAttribute("op", "<=");
          to.setAttribute("value", l.get(p).get("to"));
          outer.appendChild(from);
          outer.appendChild(to);
          filterElem.appendChild(outer);
        }
      }
      // finally remove markers (bcdNotConverted attribute's node is identical to the bcdMarker one)
      XPathExpression xPath = xp.compile("//*[@bcdMarker]");
      NodeList nl = (NodeList) xPath.evaluate(filterElem, XPathConstants.NODESET);
      for (int m = 0; m < nl.getLength(); m++) {
        ((Element)nl.item(m)).removeAttribute("bcdMarker");
        ((Element)nl.item(m)).removeAttribute("bcdNotConverted");
      }
    } catch (XPathExpressionException e) {throw new RuntimeException(e);}
}

  private List<Map<String,String>> periodTypeToRange() {

    List<Map<String,String>> ranges = new ArrayList<Map<String,String>>();

    String[] _dateRangeBindingItemNames = {"yr","qr","mo","cw","cwyr"};

    List<Node> targetModelNodes = new ArrayList<Node>();
    List<String> postFixes = new ArrayList<String>();

    // find possible parent nodes of period-type-like filters
    try {
      for (String x : _dateRangeBindingItemNames) {
        XPathExpression xPath = xp.compile("//f:Filter//f:Expression[@op and @value!='' and starts-with(@bRef, '" + x + "')]");
        NodeList nl = (NodeList) xPath.evaluate(doc, XPathConstants.NODESET);
        if (nl != null) {
          for (int n = 0; n < nl.getLength(); n++) {
            Node node = nl.item(n);

            // determine possible periodType
            String[] type = ((Element)node).getAttribute("bRef").split("_");
            String postfix = type.length > 1 && type[1] != "bcdEmpty" ? type[1] : "";

            if ( node != null && node.getParentNode() != null) {
              // use parent
              Node outerAnd = node.getParentNode();
              // for complex periodChooser like expressions we lookup outer f:And/f:Or/f:And/f:Expressions
              if (node.getParentNode().getNodeName().equals("f:And") && node.getParentNode().getParentNode() != null && node.getParentNode().getParentNode().getNodeName().equals("f:Or") && node.getParentNode().getParentNode().getParentNode() != null && node.getParentNode().getParentNode().getParentNode().getNodeName().equals("f:And"))
                outerAnd = node.getParentNode().getParentNode().getParentNode();
              if (!((Element)outerAnd).hasAttribute("bcdMarker")) {
                ((Element)outerAnd).setAttribute("bcdMarker", "true");
                targetModelNodes.add(outerAnd);
                postFixes.add(postfix);
              }
            }
          }
        }
      }
    } catch (XPathExpressionException e) {throw new RuntimeException(e);}

    // work on the found period-type-like blocks
    for (int t = 0; t < targetModelNodes.size(); t++) {
      String postfix = postFixes.get(t);
      // get correct names for current periodtype
      String[] __names = {"yr","qr","mo","cw","cwyr"};
      for (int x = 0; x < _dateRangeBindingItemNames.length; x++)
        __names[x] = _dateRangeBindingItemNames[x] + (postfix != "" ? "_" + postfix : "");
      
      Map<String, String> argsFrom = new HashMap<String, String>();
      Map<String, String> argsTo = new HashMap<String, String>();

      // grab simple =, >=, <= period types
      for (int x = 0; x < __names.length; x++) {
        String newName = __names[x].indexOf("_") == -1 ? __names[x] : __names[x].substring(0, __names[x].indexOf("_"));
        try {
          XPathExpression xPath = xp.compile("./f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='>=')]/@value");
          String value = (String) xPath.evaluate(targetModelNodes.get(t), XPathConstants.STRING);
          value = value == null ? "" : value;
          if (value != "") argsFrom.put(newName, value);
          xPath = xp.compile("./f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='<=')]/@value");
          value = (String) xPath.evaluate(targetModelNodes.get(t), XPathConstants.STRING);
          value = value == null ? "" : value;
          if (value != "") argsTo.put(newName, value);
          xPath = xp.compile("./f:Or/f:And[f:Expression[@op='>=']]/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='>=')]/@value");
          value = (String) xPath.evaluate(targetModelNodes.get(t), XPathConstants.STRING);
          value = value == null ? "" : value;
          if (value != "") argsFrom.put(newName, value);
          xPath = xp.compile("./f:Or/f:And[f:Expression[@op='<=']]/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='<=')]/@value");
          value = (String) xPath.evaluate(targetModelNodes.get(t), XPathConstants.STRING);
          value = value == null ? "" : value;
          if (value != "") argsTo.put(newName, value);
        } catch (XPathExpressionException e) { throw new RuntimeException(e); }
      }

      //  special filter case: you might have a filter structure like this (e.g. via a 2016-01-01 to 2017-12-31 plus cell filter 2016 filterFromCell result)
      //  f:Or
      //    f:And
      //      f:Expression[bRef='yr' value='2016' op='=']
      //      f:Expression[bRef='mo' value='01' op='>=']
      //    /f:And
      //    f:And
      //      f:Expression[bRef='mo' value='12' op='<=']
      //    /f:And
      //  /f:Or
      //  which would lead to a from "yr:2016, mo:01" and a to "mo:12". In this case the yr information from 'from' needs to be cloned to the 'to' part
      if (argsFrom.containsKey("yr")   && ! argsTo.containsKey("yr"))     argsTo.put("yr", argsFrom.get("yr"));
      if (argsTo.containsKey("yr")     && ! argsFrom.containsKey("yr"))   argsFrom.put("yr", argsTo.get("yr"));
      if (argsFrom.containsKey("cwyr") && ! argsTo.containsKey("cwyr"))   argsTo.put("cwyr", argsFrom.get("cwyr"));
      if (argsTo.containsKey("cwyr")   && ! argsFrom.containsKey("cwyr")) argsFrom.put("cwyr", argsTo.get("cwyr"));

      // now we've collected the to-be-transformed types and values, let's transform them to a range
      Map<String, String> periodFrom = periodToISORange(argsFrom);
      Map<String, String> periodTo = periodToISORange(argsTo);
      if ("".equals(periodFrom.get("from")) || "".equals(periodFrom.get("to")))
        ((Element)targetModelNodes.get(t)).setAttribute("bcdNotConverted", "true");
      else {
        Map<String, String> m = new HashMap<String, String>();
        m.put("from", periodFrom.get("from"));
        m.put("to", periodTo.get("to"));
        ranges.add(m);
      }
    }
    return ranges;
  }
  
  private Map<String, String> periodToISORange(Map<String, String> args) {

    int mo, cw, yr, cwyr, qr;
    mo = cw = yr = cwyr = qr = -1;
    String smo = args.get("mo");
    String scw = args.get("cw");
    String syr = args.get("yr");
    String scwyr = args.get("cwyr");
    String sqr = args.get("qr");
    String sdy = args.get("dy");
    String from, to;
    from = to = "";
    HashMap<String,String> map = new HashMap<String,String>();

    try {
      if (args.containsKey("mo")) mo = Integer.parseInt(smo, 10);
      if (args.containsKey("cw")) cw = Integer.parseInt(scw, 10);
      if (args.containsKey("yr")) yr = Integer.parseInt(syr, 10);
      if (args.containsKey("cwyr")) cwyr = Integer.parseInt(scwyr, 10);
      if (args.containsKey("qr")) qr = Integer.parseInt(sqr, 10);
      if (   (args.containsKey("mo") && (mo < 1 || mo > 12))
          || (args.containsKey("cw") && (cw < 1 || cw > 53))
          || (args.containsKey("qr") && (qr < 1 || qr > 4))) {
        map.put("from", from); map.put("to", to);
        return map;
      }
    }catch (Exception e) {
      map.put("from", from); map.put("to", to);
      return map;
    }
    
    // single day
    if (sqr == null && sdy != null && syr == null && smo == null && scw == null && scwyr == null) {
      from = to = sdy;
    }
    // single year
    else if (sqr == null && sdy == null && syr != null && smo == null && scw == null && scwyr == null) {
      from = syr + "-01-01";
      to = syr + "-12-31";
    }
    // single weekyear
    else if (sqr == null && sdy == null && syr == null && smo == null && scw == null && scwyr != null) {
      from = scwyr + "-01-01";
      to = scwyr + "-12-31";
    }
    // quarter
    else if (sqr != null && sdy == null && syr != null && smo == null && scw == null && scwyr == null) {
      String[] quarterArrayFrom = {"-01-01", "-04-01", "-07-01", "-10-01"};
      String[] quarterArrayTo = {"-03-31", "-06-30", "-09-30", "-12-31"};
      from = syr + quarterArrayFrom[qr - 1];
      to = syr + quarterArrayTo[qr - 1];
    }
    // month
    else if (sqr == null && sdy == null && syr != null && smo != null && scw  == null && scwyr == null) {
      int mocw = mo;
      int yrtmp = yr;
      // switch to next month and subtract one day
      if (mocw == 12) {yrtmp++; mocw=1;} else mocw++;
      Calendar cal = Calendar.getInstance();
      cal.set(yrtmp, mocw-1, 1);
      cal.add(Calendar.DATE, -1);
      from = yr + "-" + (mo < 10 ? "0":"") + mo + "-01";
      to = new SimpleDateFormat("yyyy-MM-dd").format(cal.getTime());
    }
    // week
    else if (sqr == null && sdy == null && syr == null && smo == null && scw != null && scwyr != null) {
      // set 1st of Jan of selected (calendarweek) year
      Calendar cal1 = Calendar.getInstance();
      Calendar cal2 = Calendar.getInstance();
      cal1.set(cwyr, 0, 1);
      cal2.set(cwyr, 0, 1);
      // jump back to Monday
      int dow = cal1.get(Calendar.DAY_OF_WEEK);
      int off = dow > 1 ? 2 - dow : -6;
      cal1.add(Calendar.DATE, off);
      // get Thursday of that week and check if it's in last or current year (if not, the 1st week starts a week later)
      cal2.add(Calendar.DATE, off + 3);
      if (cal2.get(Calendar.YEAR) != cwyr)
        cal1.add(Calendar.DATE, 7);
      // now we got the first week and we can simply add the weeks
      cal1.add(Calendar.DATE, 7 * (cw - 1));
      from = new SimpleDateFormat("yyyy-MM-dd").format(cal1.getTime());
      // end is 6 days later
      cal1.add(Calendar.DATE, 6);
      to = new SimpleDateFormat("yyyy-MM-dd").format(cal1.getTime());
    }
    
    map.put("from", from); map.put("to", to);
    return map;
  }

}
