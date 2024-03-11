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
package de.businesscode.bcdui.toolbox;

/**
 * This servlet mirrors content to the client
 * Its init params allow to set the headers, such as content type etc and the file name
 */

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class MirrorServlet extends HttpServlet
{
  private Map<String,String> headers;
  private static final long serialVersionUID = 9103767540296410884L;
  private boolean encodeUtf8 = false;

  @Override
  protected void service(HttpServletRequest request, HttpServletResponse response) throws ServletException ,IOException
  {
    String html = request.getParameter("htmlString");

    // Most servers, including Apache Tomcat server, are configured to parameter encoding with ISO-8859-1 by default
    // the following workaround fixes problems when utf-8 characters are not correctly encoded
    // this can be enabled with a web.xml EncodeUTF8=true init-param
    if (encodeUtf8) {
      byte[] bytes = html.getBytes(StandardCharsets.ISO_8859_1);
      html = new String(bytes, StandardCharsets.UTF_8);
    }

    Iterator<Map.Entry<String,String>> it = headers.entrySet().iterator();
    while( it.hasNext() ) {
      Map.Entry<String,String> header = it.next();
      response.setHeader( header.getKey(), header.getValue() );
    }

    // IE runs EVERYTHING through the cache, including file downloads. In the case of an SSL page, or one with
    // no-cache headers, the file will be downloaded into the cache, then immediately removed, even if it was a file
    // download requested by the user (IE downloads to cache, then copies to the download folder).
    // In addition append a changing param to the request
    response.setHeader( "Cache-Control", "cache, must-revalidate");

    response.getWriter().print(html);
  }

  @Override
  public void init(ServletConfig config) throws ServletException
  {
    super.init(config);

    @SuppressWarnings("unchecked")
    Enumeration<String> params = config.getInitParameterNames();
    headers = new HashMap<String,String>();
    while( params.hasMoreElements() )
    {
      String pName = params.nextElement();
      if( pName.startsWith("header:") )
        headers.put(pName.substring("header:".length()), config.getInitParameter(pName) );
    }
    String enc = config.getInitParameter("EncodeUTF8");
    encodeUtf8 = enc != null && "true".compareToIgnoreCase(enc) == 0;
  }
}