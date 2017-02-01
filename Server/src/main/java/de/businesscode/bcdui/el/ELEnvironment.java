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

import java.util.Date;

import javax.el.ExpressionFactory;
import javax.servlet.http.HttpServletRequest;

import de.businesscode.bcdui.web.taglib.webpage.Functions;

public class ELEnvironment {

  private final ExpressionFactory factory;
  private final StandardELContext context;

  public static final String EXPRESSION_FACTORY_NAME = "org.apache.el.ExpressionFactoryImpl";

  /**
   * creates environment to evaluate on a given bean
   *
   * @param bean - the bean for evaluation
   * @param bindName of the bean to be bound
   * @throws Exception
   */
  public ELEnvironment(Object bean, String bindName) throws Exception {
    factory = (ExpressionFactory) Class.forName(EXPRESSION_FACTORY_NAME).getConstructors()[0].newInstance();
    context = new StandardELContext("webpage", Functions.class);
    setVariable(bindName, bean);
  }

  public ELEnvironment(HttpServletRequest request) throws Exception {
    factory = (ExpressionFactory) Class.forName(EXPRESSION_FACTORY_NAME).getConstructors()[0].newInstance();
    context = new StandardELContext("webpage", Functions.class);
    if (request != null) {
      setVariable("request", request);
      setVariable("session", request.getSession(false));
    }
  }

  public ELEnvironment(String prefix, Class<?> staticFunctionProvider) throws Exception {
    factory = (ExpressionFactory) Class.forName(EXPRESSION_FACTORY_NAME).getConstructors()[0].newInstance();
    context = new StandardELContext(prefix, staticFunctionProvider);
  }

  public Object eval(String expression) {
    return factory.createValueExpression(context, expression, Object.class).getValue(context);
  }

  public static void main(String[] args) throws Exception {
    ELEnvironment util = new ELEnvironment("webpage", Functions.class);
    util.setVariable("x", 5);
    util.setVariable("now", new Date());
    System.out.println(util.eval("<Date>#{fn:formatXMLTimestamp(now)}</Date>"));
  }

  public void setVariable(String variableName, Object value) {
    context.getVariableMapper().setVariable(variableName, factory.createValueExpression(value, Object.class));
  }

  /**
   * evaluates a String with possible EL with bcdBean in scope
   *
   * @param expression to evaluate
   * @param targetBean the bean to set into context
   * @param beanBindName name to bind the bean to in context
   * @return either a String if it does not contain expression, or evaluated expression, also may be null
   *
   * @throws RuntimeException in case the targetBean is null or the expression fails to evaluate
   */
  public static String evaluateExpression(String expression, Object targetBean, String beanBindName){
    if(expression != null && (expression.contains("${") || expression.contains("#{"))){
      if(targetBean == null) {
        throw new RuntimeException("you used EL expression '"+expression+"' but not supplied a column value bean");
      }
      try{
        final Object elValue = new ELEnvironment(targetBean,beanBindName).eval(expression);
        return elValue != null ? elValue.toString() : null;
      } catch (Exception e){
        // TODO fail or proceeed?
        throw new RuntimeException("failed to evaluate EL: '"+expression+"'", e);
      }
    }else{
      return expression;
    }
  }
}
