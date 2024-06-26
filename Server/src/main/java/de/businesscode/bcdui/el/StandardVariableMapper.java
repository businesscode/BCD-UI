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

import java.util.HashMap;
import java.util.Map;

import jakarta.el.ValueExpression;
import jakarta.el.VariableMapper;

public class StandardVariableMapper extends VariableMapper {
  private Map<String, ValueExpression> vars = new HashMap<String, ValueExpression>();

  @Override
  public ValueExpression setVariable(String variable, ValueExpression expression) {
    vars.put(variable, expression);
    return expression;
  }

  @Override
  public ValueExpression resolveVariable(String variable) {
    return vars.get(variable);
  }
}