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
package de.businesscode.bcdui.el;

import javax.el.ArrayELResolver;
import javax.el.BeanELResolver;
import javax.el.CompositeELResolver;
import javax.el.ELContext;
import javax.el.ELResolver;
import javax.el.FunctionMapper;
import javax.el.ListELResolver;
import javax.el.MapELResolver;
import javax.el.VariableMapper;

public class StandardELContext extends ELContext {
  private final VariableMapper variableMapper;
  private final ELResolver elResolver;
  private final FunctionMapper functionMapper;

  public StandardELContext() {
    this(null, null);
  }

  public StandardELContext(String prefix, Class<?> staticFunctionProvider) {
    this.variableMapper = new StandardVariableMapper();
    this.functionMapper = new StandardFunctionMapper(prefix, staticFunctionProvider);
    CompositeELResolver elResolver = new CompositeELResolver();
    elResolver.add(new ArrayELResolver());
    elResolver.add(new BeanELResolver());
    elResolver.add(new ListELResolver());
    elResolver.add(new MapELResolver());
    this.elResolver = elResolver;
  }

  @Override
  public VariableMapper getVariableMapper() {
    return variableMapper;
  }

  @Override
  public FunctionMapper getFunctionMapper() {
    return functionMapper;
  }

  @Override
  public ELResolver getELResolver() {
    return elResolver;
  }
}