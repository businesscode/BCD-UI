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

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

public class MapsRequestFilter implements Filter
{

  Map<String,String> initSqls = new HashMap<String,String>();

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain fC)
    throws IOException, ServletException
  {
    ParamAddedRequest pAR = new ParamAddedRequest((HttpServletRequest)request);
    fC.doFilter(pAR, response);
  }

  @Override
  public void init(FilterConfig fConf) throws ServletException {
    Enumeration<String> en = fConf.getInitParameterNames();
    while( en.hasMoreElements() ) {
      String pName = en.nextElement();
      initSqls.put(pName, fConf.getInitParameter(pName));
    }
  }

  @Override
  public void destroy() {
  }

  protected class ParamAddedRequest extends HttpServletRequestWrapper
  {
    Map<String,String[]> myParams = new HashMap<String,String[]>(super.getParameterMap());
    ParamAddedRequest(HttpServletRequest request)
    {
      super(request);
      myParams.putAll(super.getParameterMap());

      String sqlId = request.getParameter("SQLTEMPLATE_ID");
      if(sqlId==null)
        return;
      String s = initSqls.get(sqlId);
      Enumeration<String> rP = request.getParameterNames();
      while( rP.hasMoreElements() ) {
        String p = rP.nextElement();
        if( p.startsWith("SQLTEMPLATE_") )
          s = s.replaceAll(p, request.getParameter(p) );
      }
      s = s.replaceAll("SQLTEMPLATE_.*\\W", "" ); // clean all template expressions which are not given
      myParams.put("SQLTEMPLATES", new String[]{s} );
    }

    @Override
    public String getParameter(String name) {
      String[] strings = myParams.get(name);
      if (strings != null)
      {
          return strings[0];
      }
      return null;
    }

    @Override
    public Enumeration<String> getParameterNames() {
      return Collections.enumeration(myParams.keySet());
    }

    @Override
    public Map<String,String[]> getParameterMap() {
      return Collections.unmodifiableMap(myParams);
    }

    @Override
    public String[] getParameterValues(String name) {
      if( myParams.keySet().contains(name)) {
        return myParams.get(name);
      } else
        return super.getParameterValues(name);
    }
  }
}
