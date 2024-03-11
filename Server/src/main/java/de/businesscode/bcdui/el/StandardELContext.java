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
package de.businesscode.bcdui.el;

import jakarta.el.ArrayELResolver;
import jakarta.el.BeanELResolver;
import jakarta.el.CompositeELResolver;
import jakarta.el.ELContext;
import jakarta.el.ELResolver;
import jakarta.el.FunctionMapper;
import jakarta.el.ListELResolver;
import jakarta.el.MapELResolver;
import jakarta.el.VariableMapper;

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
    elResolver.add(new MapELResolver()); // needs to be added before BeanELResolver, otherwise you run into Property Not Found exceptions
    elResolver.add(new BeanELResolver());
    elResolver.add(new ListELResolver());
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