/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.servlets;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.UnsupportedEncodingException;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.w3c.dom.Document;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.web.taglib.webpage.Functions;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * Servlet for compression and uncompression of XML data. To compress
 * an XML document you need to POST it to this servlet and to uncompress
 * the data you must use GET with the parameter data=xxx (where xxx stands
 * for the compressed data).
 * The servlet offers two compression modes: XML string optimization for
 * small XML documents and GZIP compression. It also supports two encodings:
 * Alphabet translation (when the input has an alphabet of at most 64 characters)
 * and 6 bit 64-character encoding (similar to base 64). All encodings are chosen
 * so that the result does not need to be escaped for being used as an HTML
 * GET parameter.
 * <br>
 * It is possible to determine the encoding/compression combination from the
 * compressed document by testing the first character of the encoded data
 * <ul>
 *   <li>"z" uses XML string optimization with alphabet translation.</li>
 *   <li>"x" uses XML string optimization with 6 bit encoding.</li>
 *   <li>Otherwise GZIP compression with 6 bit encoding is used.</li>
 * </ul>
 *
 *
 * Extension to support tiny urls
 * e.g. in case browser limit is exceeded compressionPackage.js can rerun
 * the compression with url param 'tiny' (=limit) to return a 't' style string which
 * is followed by the size and encoded sha1 value. The sha1 value is used as key
 * element in a table specified via tinyUrlBindingName. The table needs the
 * following fields:
 *   tiny_url varchar (33) (size = 32 + digits count of allowed hash collisions)
 * , long_url (clob)
 * , creation_dt (date)
 * , last_used_dt (date)
 * Extension done by rs
 */
public class ZipLet extends HttpServlet {
  private static final long serialVersionUID = 1L;
  
  private static final String BCDTINYURLCONTROL = "bcd_tinyurl_control"; 


  /**
   * The 64 characters used for the encoding.
   */
  private static final String b64ToChar = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

  /**
   * The reverse-lookup map which maps the characters of the b64ToChar string
   * to their position in the string. This cache is used to improve the decoding
   * performance.
   */
  private static final Map<Character, Byte> charToB64;

  private static final Logger log = LogManager.getLogger(ZipLet.class);

  private static int maxTinyUrlAge = -1;

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    try {
      maxTinyUrlAge = Integer.parseInt(config.getInitParameter("maxTinyUrlAge"));
    } catch(Exception e) {
      if( config.getInitParameter("maxTinyUrlAge") != null ) {
        log.warn("Parameter 'maxTinyUrlAge' for "+getServletName()+" could not be parsed");
      }
    }
    log.info("Using "+maxTinyUrlAge+" months for maxTinyUrlAge");
  }

  /**
   * Compresses the data which has been posted to this servlet. It will
   * write an XML document to the response with a single root element
   * named "data" containing a text node with the compressed and encoded
   * data (as provided by the compress method).
   * @see #compress(InputStream)
   */
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    try {
      response.setContentType("text/xml");
      response.setCharacterEncoding("UTF-8");
      response.addDateHeader("Expires", 1);
      String data = new String(IOUtils.toByteArray(request.getInputStream()),"UTF-8");

      String compressedString = compress(data);

      String limit = request.getParameter("tiny");
      boolean doTiny = false;
      try {doTiny = (limit != null && ! limit.isEmpty() && Integer.parseInt(limit) < compressedString.length());}
      catch (Exception ex) {/* parseInt may fail */}

      response.getWriter().write("<data>" + (doTiny ? makeTiny(compressedString) : compressedString) + "</data>");
    } catch (Exception ex) {
      if (ex instanceof ServletException) throw (ServletException) ex;
      if (ex instanceof IOException) throw (IOException) ex;
      throw new ServletException(ex);
    }
  }

  /**
   * Decompresses the XML document given in the "data" parameter and returns it
   * in the response object.
   * @param request The request holding the "data" parameter to be decoded.
   * @param response The response containing the (stringified) decompressed XML
   * document.
   */
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    try {
      //ServletUtils.setExpirationHeader(response, CacheType.STATIC_RESOURCE);
      response.setContentType("text/xml");
      response.setCharacterEncoding("UTF-8");
      String xml = request.getParameter("xml");
      if (xml != null) {
        String compressedString = compress(xml);
        response.getWriter().write("<data>" + compressedString + "</data>");
      } else {
        Document doc = decodeAndDecompressToXML(request.getParameter("data"), request);
        SecureXmlFactory.newTransformerFactory().newTransformer().transform(
            new DOMSource(doc),
            new StreamResult(response.getWriter()));
      }
    } catch (Exception ex) {
      if (ex instanceof ServletException) throw (ServletException) ex;
      if (ex instanceof IOException) throw (IOException) ex;
      throw new ServletException(ex);
    }
  }

  /**
   * This method removes all XML comments from the specified DOM document.
   * @param serializedDoc A string representation of a DOM document.
   * @return The cleaned up string without XML comments.
   */
  private static String removeXMLComments(String serializedDoc) {
    return serializedDoc.replaceAll("<!--[^-]+(-[^-]+)*-->", "");
  }

  /**
   *
   * @param request
   * @return returns unpacked XML String or NULL if guiStatusGZ parameter was null or empty
   */
  public static String getUnpackedGuiStatus(HttpServletRequest request) {
    String s = null;
    String compressed = request.getParameter("guiStatusGZ");

    if(compressed == null || compressed.isEmpty()){
      return null;
    }

    try {
      if (compressed.startsWith("t"))
        compressed = makeBig(compressed);
      Document doc = decodeAndDecompressToXML(compressed, request);
      // makeBig folled by decodeAndDecompressToXML can return null value when the tiny url value
      // cannot be found in the database anymore, so we need to check for null here again
      if (doc != null)
        s = Functions.jsString(Utils.serializeElement(doc));
    }
    catch (Exception ex) {
      log.warn("unable to get unpacked gui status for: " + compressed, ex);
    }
    return s;
  }

  /**
   * A convenience method for compressing a DOM document and returning an
   * encoded string representation.
   * @param doc The DOM document to be compressed.
   * @return An encoded String representation of the DOM document.
   */
  public static String compressAndEncode(Document doc) throws Exception {
    StringWriter result = new StringWriter();
    SecureXmlFactory.newTransformerFactory().newTransformer().transform(
        new DOMSource(doc),
        new StreamResult(result));
    return compress(result.toString());
  }

  /**
   * Compresses (and encodes) the string parameter. This is a string-argument
   * wrapper for the compress method taking an InputStream.
   * @see #compress(InputStream)
   * @param uncompressedString The string to be compressed.
   * @return A 64-character encoding of the compressed string.
   * @throws Exception If the compression fails.
   */
  public static String compress(String uncompressedString) throws Exception
  {
    // let's kill remarks first
    uncompressedString = removeXMLComments(uncompressedString);

    // First lets minimize the namespace related characters, be moving all unambiguous namespaces alias definitions to the root node
    Pattern singleXmlnsPattern = Pattern.compile(" xmlns:(\\w+?)=\"(.+?)\"");
    Matcher singleXmlnsMatcher = singleXmlnsPattern.matcher(uncompressedString);
    Map<String,String> aN = new HashMap<String,String>(); // This collects all aliases
    Set<String> ambiguousAilases = new TreeSet<String>(); // This collects aliases having more than one namespace assigned, they will stay
    while( singleXmlnsMatcher.find()) {
      String previous = aN.put(singleXmlnsMatcher.group(1),singleXmlnsMatcher.group(2));
      if( previous!=null && !previous.equals(singleXmlnsMatcher.group(2)) )
        ambiguousAilases.add(singleXmlnsMatcher.group(1));
    }

    // allXmlNsRegExp wil be a regexp matching all unambiguous ns alias definitions
    // allXmlNs will be a string containing all unambiguous ns alias definitions
    StringBuffer allXmlNsRegExp = new StringBuffer();
    StringBuffer allXmlNs = new StringBuffer();
    Iterator<String> aliasIt = aN.keySet().iterator();
    while( aliasIt.hasNext() ) {
      String alias = aliasIt.next();
      if( ambiguousAilases.contains(alias) ) {
        continue;
      } else {
        if(allXmlNsRegExp.length()>0)
          allXmlNsRegExp.append("|");
        allXmlNsRegExp.append("xmlns:").append(Pattern.quote(alias)).append("=\"").append(Pattern.quote(aN.get(alias))).append("\"");
        allXmlNs.append(" xmlns:").append(alias).append("=\"").append(aN.get(alias)).append("\"");
      }
    }

    // Now lets remove all unambiguous namespace alias definitions from the string
    Pattern allXmlnsPattern = Pattern.compile(allXmlNsRegExp.toString());
    Matcher allXmlnsMatcher = allXmlnsPattern.matcher(uncompressedString);
    String withoutNs = allXmlnsMatcher.replaceAll("");

    // And now lets add all unambiguous namespace alias definitions to the root element
    int endOfRoot = withoutNs.indexOf(">");
    if(withoutNs.charAt(endOfRoot-1)=='?')  // Skip processing instruction, we want the end of the root element
      endOfRoot += withoutNs.substring(endOfRoot+1).indexOf(">") + 1;
    String result = withoutNs.substring(0,endOfRoot);
    result += allXmlNs;
    result += withoutNs.substring(endOfRoot);

    // Done with minimizing namspace alias definitions in the document
    uncompressedString = result;

    boolean hasSpecialChars = false;
    for (char c : uncompressedString.toCharArray()) {
      if (((int)c) > 127) {
        hasSpecialChars = true;
        break;
      }
    }
    if (!hasSpecialChars) {
      String data = uncompressedString;
      if (data.startsWith("<?xml")) {
        data = data.substring(data.indexOf(">") + 1);
      }
      String compressedXMLString = compressXMLString(data);

      String alphabetMappingEncoding = encodeStringWithAlphabetMapping(compressedXMLString);
      if (alphabetMappingEncoding != null &&
          alphabetMappingEncoding.length() <= 1900)
        return "z" + alphabetMappingEncoding;

      String simpleEncoding = "x" + encodeBytes(compressedXMLString.getBytes("UTF-8"));
      if (simpleEncoding.length() <= 1900) return simpleEncoding;
    }
    return compress(new ByteArrayInputStream(uncompressedString.getBytes("UTF-8")));
  }

  /**
   * Compresses the data provided by the input stream with GZIP and encodes
   * it in a 64-character encoding.
   * @see #encodeBytes(byte[])
   * @param in The input stream for the data to be compressed and encoded.
   * @return A string containing the compressed data.
   * @throws Exception If the compression fails.
   */
  private static String compress(InputStream in) throws Exception {
    byte[] buffer = new byte[1024];
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    GZIPOutputStream gzipOut = new GZIPOutputStream(out);
    int len = 0;

    do {
      len = in.read(buffer);
      if (len > 0)
        gzipOut.write(buffer, 0, len);
    } while (len > 0);

    gzipOut.close();

    return encodeBytes(out.toByteArray());
  }

  /**
   * This method compresses a serialized XML document so that repeated tag
   * names are referenced by their occurence number and closing tags are
   * without a tag name. This simple compression method can easily be
   * decompressed by the client in JavaScript. After compressing it the
   * data is encoded.
   * @see #encodeBytes(byte[])
   * @param data The serialized XML document to be compressed.
   * @return A compressed and encoded representation of the XML document.
   */
  private static String compressXMLString(String data) {
    StringBuilder result = new StringBuilder();
    Map<String, Integer> tokenMap = new HashMap<String, Integer>();
    int currentTokenNo = 0;
    boolean withinTag = false;
    StringBuilder currentToken = new StringBuilder();
    for (int i = 0; i < data.length(); ++i) {
      char c = data.charAt(i);
      if (c == '<') {
        currentToken.setLength(0);
        result.append(c);
        if (i+1 < data.length() && data.charAt(i+1) == '/') {
          while (i < data.length() && data.charAt(i) != '>') {
            ++i;
          }
          result.append('>');
        } else {
          withinTag = true;
        }
      } else if (withinTag) {
        if (Character.isWhitespace(c) || c == '>' || c == '/' || c == '"') {
          if (currentToken.length() > 0) {
            if (currentToken.charAt(currentToken.length() - 1) == '=') {
              currentToken.deleteCharAt(currentToken.length() - 1);
            }
            if (!tokenMap.containsKey(currentToken.toString())) {
              tokenMap.put(currentToken.toString(), currentTokenNo++);
              for (int partLength = currentToken.length() - 1; partLength > 0; --partLength) {
                if (tokenMap.containsKey(currentToken.substring(0, partLength))
                    && !Character.isDigit(currentToken.charAt(partLength))) {
                  result.append(tokenMap.get(currentToken.substring(0, partLength)));
                  result.append(currentToken.substring(partLength));
                  currentToken.setLength(0);
                  break;
                }
              }
              if (currentToken.length() > 0) {
                result.append(currentToken);
              }
            } else {
              result.append(tokenMap.get(currentToken.toString()));
            }
            currentToken.setLength(0);
          }
          result.append(c);
          if (c == '"') {
            while (++i < data.length()) {
              c = data.charAt(i);
              result.append(c);
              if (c == '"') break;
            }
          }
          withinTag = (c != '>');
        } else {
          currentToken.append(c);
        }
      } else {
        result.append(c);
      }
    }

    return result.toString();
  }

  /**
   * This method is the inverted function of the compressXMLString method.
   * @param data The copmressed XML document to be reconstructed.
   * @return A decompressed serialized XML document. This can be processed by a DOM
   * parser for example.
   */
  private static String uncompressXMLString(String data) {
    StringBuilder result = new StringBuilder();
    List<String> reverseTokenMap = new ArrayList<String>();
    boolean withinTag = false;
    boolean tagBeginning = false;
    StringBuilder currentToken = new StringBuilder();
    LinkedList<String> tagStack = new LinkedList<String>();
    for (int i = 0; i < data.length(); ++i) {
      char c = data.charAt(i);
      if (c == '<') {
        currentToken.setLength(0);
        result.append(c);
        if (i+1 < data.length() && data.charAt(i+1) == '>') {
          result.append('/');
          result.append(tagStack.pop());
          result.append('>');
          ++i;
        } else {
          withinTag = true;
          tagBeginning = true;
        }
      } else if (withinTag) {
        if (Character.isWhitespace(c) || c == '>' || c == '/' || c == '"') {
          if (currentToken.length() > 0) {
            boolean isNewToken = true;
            String decodedToken = currentToken.toString();

            if (Character.isDigit(currentToken.charAt(0))) {
              int tokenPos = 0;
              while (tokenPos < currentToken.length() && Character.isDigit(currentToken.charAt(tokenPos))) {
                ++tokenPos;
              }
              int tokenNo = Integer.valueOf(currentToken.substring(0, tokenPos));
              String tokenSuffix = (tokenPos < currentToken.length() ? currentToken.substring(tokenPos) : "");
              decodedToken = reverseTokenMap.get(tokenNo) + tokenSuffix;
              isNewToken = (tokenSuffix.length() > 0);
            }

            if (isNewToken) {
              reverseTokenMap.add(decodedToken);
            }

            result.append(decodedToken);
            if (!tagBeginning) result.append('=');

            if (tagBeginning && c != '/') {
              tagStack.push(decodedToken);
            }
            tagBeginning = false;
            currentToken.setLength(0);
          } else if (!tagBeginning && c == '/') {
            tagStack.pop();
          }
          result.append(c);
          if (c == '"') {
            while (++i < data.length()) {
              c = data.charAt(i);
              result.append(c);
              if (c == '"') break;
            }
          }
          withinTag = (c != '>');
        } else {
          currentToken.append(c);
        }
      } else {
        result.append(c);
      }
    }

    return result.toString();
  }

  /**
   * Encodes the bytes provided in the method's argument. The encoded
   * string begins with the size of the input array as HEX number
   * followed by a "-" sign. Then the encoded data follows where each
   * 6 bits of the input will become one character of a 64-letter
   * alphabet consisting of [0-9,a-z,A-Z,-,_].
   * @param bytes The bytes to be encoded.
   * @return A stringified encoding of the byte array parameter.
   */
  private static String encodeBytes(byte[] bytes) {
    StringBuffer result = new StringBuffer();
    int b1, b2, b3;
    result.append(Integer.toHexString(bytes.length));
    result.append('-');
    for (int i = 0; i < bytes.length; i += 3) {
      b1 = bytes[i] & 255;
      b2 = i + 1 < bytes.length ? bytes[i+1] & 255 : 0;
      b3 = i + 2 < bytes.length ? bytes[i+2] & 255 : 0;

      result.append(b64ToChar.charAt( (b1 & 252) >> 2 ));
      result.append(b64ToChar.charAt( (b1 & 3) << 4 | b2 >> 4 ));
      result.append(b64ToChar.charAt( (b2 & 15) << 2 | b3 >> 6 ));
      result.append(b64ToChar.charAt(  b3 & 63 ));
    }
    return result.toString();
  }

  /**
   * Decodes the encoded bytes to the original byte array it was
   * generated from. This is the inverse function of the encodeByte
   * method.
   * @see #encodeBytes(byte[])
   * @param encodedBytes The string representing the encoded bytes.
   * @return The bytes encoded by the method's argument.
   */
  private static byte[] decodeBytes(String encodedBytes) {
    int offset = encodedBytes.indexOf('-');
    if (offset <= 0) return new byte[0];
    int size = Integer.parseInt(encodedBytes.substring(0, offset++), 16);
    byte[] result = new byte[size];

    int b1, b2;
    int pos = 0;
    for (int i = 0; i < size; ++i) {
      b1 = charToB64.get(encodedBytes.charAt(offset + pos));
      b2 = offset + pos + 1 < encodedBytes.length() ? charToB64.get(encodedBytes.charAt(offset + pos + 1)) : 0;

      switch (i % 3) {
        case 0:
          result[i] = (byte) (b1 << 2 | b2 >> 4);
          break;

        case 1:
          result[i] = (byte) ((b1 & 15) << 4 | b2 >> 2);
          break;

        default:
          result[i] = (byte) ((b1 & 3) << 6 | b2);
          ++pos;
      }
      ++pos;
    }

    return result;
  }

  /**
   * Decodes and decompresses the specified string to an XML document.
   * @param compressedString The stringified encoding of the compressed XML document.
   * @return The original XML document the compressed string has been generated from.
   * @throws Exception If the decompression or the XML parsing fails.
   */
  public static Document decodeAndDecompressToXML(String compressedString, HttpServletRequest request) throws Exception {
    if (compressedString == null || compressedString.isEmpty()) {
      return null;
    }
    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    DocumentBuilder builder = documentBuilderFactory.newDocumentBuilder();

    String compressed = compressedString;

    if (compressed.startsWith("t"))
      compressed = makeBig(compressed);

    if (compressed == null)
      return null;

    if (compressed.startsWith("x") || compressed.startsWith("z")) {
      String data = compressed.startsWith("x")
          ? new String(decodeBytes(compressed.substring(1)),"UTF-8")
          : decodeStringWithAlphabetMapping(compressed.substring(1));
      ByteArrayInputStream input = new ByteArrayInputStream(uncompressXMLString(data).getBytes("UTF-8"));
      Document doc = builder.parse(input);
      return doc;
    }

    Document doc = builder.parse(new ByteArrayInputStream(new String(
        IOUtils.toByteArray(new GZIPInputStream(new ByteArrayInputStream(decodeBytes(compressed)))), "UTF-8").getBytes("UTF-8")));
    return doc;
  }

  /**
   * Decodes and decompresses the specified string to an XML document.
   * @param compressedString The stringified encoding of the compressed XML document.
   * @return The original XML document the compressed string has been generated from.
   * @throws Exception If the decompression or the XML parsing fails.
   * @deprecated
   */
  @Deprecated
  public static Document decodeAndDecompressToXML(String compressedString) throws Exception {
    return decodeAndDecompressToXML(compressedString, null);
  }

  /**
   * Encodes a string by translating the input alphabet to a standard 64 character
   * alphabet. The target alphabet consists of characters which do not need to be
   * escaped in URLs. However since the standard alphabet has only 64 characters
   * the encoding may fail. Then NULL is returned and the "encodeBytes" method should
   * be used.
   * @param data The string to be encoded.
   * @return The encoded string or NULL if it is not possible to encode it with the
   * standard alphabet.
   * @throws UnsupportedEncodingException
   * @see #decodeStringWithAlphabetMapping
   * @see #b64ToChar
   */
  private static String encodeStringWithAlphabetMapping(String data) throws UnsupportedEncodingException {
    Map<Character, Integer> alphabetMapping = new HashMap<Character, Integer>();
    StringBuilder alphabet = new StringBuilder();
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < data.length(); ++i) {
      char c = data.charAt(i);
      if (!alphabetMapping.containsKey(c)) {
        alphabetMapping.put(c, alphabet.length());
        alphabet.append(c);
        if (alphabet.length() > b64ToChar.length()) return null;
      }
      result.append(b64ToChar.charAt(alphabetMapping.get(c)));
    }
    return encodeBytes(alphabet.toString().getBytes("UTF-8")) + result;
  }

  /**
   * Decoding method for the data encoded by "encodeStringWithAlphabetMapping".
   * @param encodedData The encoded data.
   * @return The decoded data.
   * @throws UnsupportedEncodingException
   * @see #encodeStringWithAlphabetMapping
   */
  private static String decodeStringWithAlphabetMapping(String encodedData) throws UnsupportedEncodingException {
    String alphabet = new String(decodeBytes(encodedData),"UTF-8");
    String data = encodedData.substring(encodeBytes(alphabet.getBytes("UTF-8")).length());
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < data.length(); ++i) {
      char c = data.charAt(i);
      result.append(alphabet.charAt(b64ToChar.indexOf(c)));
    }
    return result.toString();
  }

  /**
   * Static initialization of the "charToB64" reverse-lookup map for the encoding
   * characters.
   */
  static {
    charToB64 = new HashMap<Character, Byte>();
    for (byte i = 0; i < b64ToChar.length(); ++i) {
      charToB64.put(b64ToChar.charAt(i), i);
    }
  }

  /**
   * calculates the sha1 of the input data string
   * and writes this as key element together with the data string into the database.
   * In case of an existing key, the key last update stamp is updated.
   * @param data The string to be encoded.
   * @return The tiny string or NULL in case of an error
   * @throws Exception
   */
  private String makeTiny(String data) throws Exception
  {
    if (data == null)
      return null;

    // in case tiny binding set is not available return original (long) value
    if (! testTinyUrlBinding()) {
      return data;
    }

    // get sha1 hash for data
    MessageDigest sha1Data = MessageDigest.getInstance("SHA-1");
    sha1Data.reset();
    sha1Data.update(data.getBytes("utf8"));

    String key = null;

    String rawKey = encodeBytes(sha1Data.digest());

    int collisionCount = -1;
    while (++collisionCount < 10) {

      key = "t" + Integer.toString(collisionCount) + rawKey;

      String longUrl = readFile(key);

      if (longUrl == null) {
        createFile(key, data);  // insert new long url into table

        deleteFile(); // possible cleanup of old data if configured
        break;
      }
      else {
        // check if we got a hash collision or not
        // update last access date (write access) if there is a need
        String[] q = longUrl.split("\\|");
        if (data.equals(q[1])) {
          if (q != null && q.length == 2 && "1".equals(q[0]))
            updateFile(key);
          break;
        }
      }
      // else we have a hash collision for t0
      // then we check with t1 to t9...
    }
    if (collisionCount == 10)
      log.warn("detected tiny url hash collision for value: " + data);

    return key;
  }

  /**
   * counterpart of makeTiny. This will get the long data information from the given
   * tiny variant.
   * If key exists, last update stamp is updated.
   * @param tinyUrl The tiny string to be decoded.
   * @return The lstring or NULL in case of an error
   * @throws Exception
   */
    private static String makeBig(String tinyUrl) throws Exception {

    if (tinyUrl == null)
      return null;

    // in case tiny binding set is not available return error
    if (! testTinyUrlBinding()) {
      return null;
    }

    // get long url for tiny url...could return null if data was removed
    String longUrl = readFile(tinyUrl);

    if (longUrl != null) {

      // update last access date (read access) if there is a need
      String[] q = longUrl.split("\\|");
      if (q != null && q.length == 2) {
        if ("1".equals(q[0]))
          updateFile(tinyUrl);

        // and return long url
        return q[1];
      }
    }

    return null;
  }

  public static boolean testTinyUrlBinding() {
    boolean r = true;
    try { Bindings.getInstance().get(BCDTINYURLCONTROL, new ArrayList<String>()); }
    catch (BindingException e) { r = false; }
    return r;
  }

  public static Connection getControlConnection() throws Exception{
    BindingSet bs  = Bindings.getInstance().get(BCDTINYURLCONTROL, new ArrayList<String>());
    Connection con = Configuration.getInstance().getUnmanagedConnection(bs.getJdbcResourceName());
    return con;
  }

  public static String getTransformSQL(String sql){
    String fe = new SQLEngine().transform(sql);
    return fe;
  }

  private static final String createFileSQL=
      " #set( $k = $bindings." + BCDTINYURLCONTROL + " ) " +
      " INSERT INTO $k.getPlainTableName()" +
      "  (" +
      "    $k.tiny_url-"  +
      "  , $k.long_url-" +
      "  , $k.creation_dt-" +
      "  , $k.last_used_dt-" +
      "  ) VALUES (?,?,?,?)";

  /**
   * inserts a new entry for the given pair of long and tiny url in the database
   * @param tinyUrl The tiny url as string
   * @param longUrl The long url as string
   * @throws Exception
   */
  private static void createFile(String tinyUrl, String longUrl) throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();

    try{
      String sql = getTransformSQL(createFileSQL);
      stmt = connection.prepareStatement(sql);
      stmt.setString(1, tinyUrl);
      StringReader reader = new StringReader(longUrl);
      stmt.setCharacterStream(2, reader, longUrl.length());
      java.util.Date today = new java.util.Date();
      stmt.setDate(3, new java.sql.Date(today.getTime()));
      stmt.setDate(4, new java.sql.Date(today.getTime()));
      stmt.execute();
    }finally{
      Closer.closeAllSQLObjects(stmt, connection);
    }
  }

  private static final String updateFileSQL=
      " #set( $k = $bindings." + BCDTINYURLCONTROL + " )"+
      " UPDATE $k.getPlainTableName()"+
      " SET" +
      "   $k.last_used_dt- = ?" +
      " WHERE" +
      "   $k.tiny_url- = ?";

  /**
   * updates the last used timestamp for a given tiny url in the database
   * @param tinyUrl The tiny url as string to be touched
   * @throws Exception
   */
  private static void updateFile(String tinyUrl) throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();

    try{
      String sql = getTransformSQL(updateFileSQL);
      stmt = connection.prepareStatement(sql);
      java.util.Date today = new java.util.Date();
      stmt.setDate(1, new java.sql.Date(today.getTime()));
      stmt.setString(2, tinyUrl);
      stmt.execute();
    }finally{
      Closer.closeAllSQLObjects(stmt, connection);
    }
  }

  private static final String readFileSQL=
      " #set( $k = $bindings." + BCDTINYURLCONTROL + " ) "+
      " SELECT" +
      "   $k.long_url-" +
      "   , $k.last_used_dt-" +
      " FROM $k.getPlainTableName()" +
      " WHERE" +
      "   $k.tiny_url- = ?";

  /**
   * Returns the stored longUrl and an indicator if the entry needs an update or not for the given tinyUrl in the database  
   * If key exists, last update stamp is updated.
   * @param tinyUrl The tiny url as string to be decoded.
   * @return The corresponding longURL as String for the given tinyURL or null if no entry is found. The string is prefixed with 0| or 1| indicating that the entry needs to be touched later on or not
   * @throws Exception
   */
  private static String readFile(String tinyUrl) throws Exception {
    DateFormat df = new SimpleDateFormat("yyyy-MM-dd");
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    String today = df.format(new java.util.Date());
    String longUrlFromDB = null;

    try{
      String sql = getTransformSQL(readFileSQL);
      stmt = connection.prepareStatement(sql);
      stmt.setString(1, tinyUrl);
      rs = stmt.executeQuery();
      if (rs.next()) {
        String longUrl = DatabaseCompatibility.getInstance().getClob(BCDTINYURLCONTROL, rs, 1);
        java.util.Date lastUpdate = rs.getDate(2);

        if (lastUpdate != null) {
          longUrlFromDB = (df.format(lastUpdate).equals(today) ? "0" : "1") + "|" + longUrl;
        }
      }
    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }

    return longUrlFromDB;
  }

  private static final String deleteFileSQL=
      " #set( $k = $bindings." + BCDTINYURLCONTROL + " ) " +
      " DELETE FROM $k.getPlainTableName() WHERE $k.last_used_dt- < ?";

  /**
   * removes outdated stored tiny entries in the database
   * threshold given by maxTinyUrlAge
   * @throws Exception
   */
  private static void deleteFile() throws Exception {

    if (maxTinyUrlAge == -1)
      return;

    java.util.Date today = new java.util.Date();
    Calendar c1 = Calendar.getInstance();
    c1.setTime(today);
    c1.add(Calendar.MONTH, -1 * maxTinyUrlAge);

    PreparedStatement stmt = null;
    Connection connection = getControlConnection();

    try{
      String sql = getTransformSQL(deleteFileSQL);
      stmt = connection.prepareStatement(sql);
      stmt.setDate(1, new java.sql.Date(c1.getTimeInMillis()));
      stmt.execute();
    }finally{
      Closer.closeAllSQLObjects(stmt, connection);
    }
  }

}
