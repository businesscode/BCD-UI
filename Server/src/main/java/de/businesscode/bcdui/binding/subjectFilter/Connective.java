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
package de.businesscode.bcdui.binding.subjectFilter;

import java.util.LinkedList;
import java.util.List;

/**
 * the connective containing {@link SubjectFilter} or further {@link Connective} elements,
 * connectives are: {@link ConnectiveAnd}, {@link ConnectiveOr}
 */
public abstract class Connective extends SubjectFilterNode {
  public static enum SYMBOL {
    AND,OR;
  }
  private final SYMBOL symbol;

  private Connective(SYMBOL symbol) {
    this.symbol = symbol;
  }

  private List<SubjectFilterNode> elements;

  public List<SubjectFilterNode> getElements() {
    if (elements == null) {
      elements = new LinkedList<>();
    }
    return elements;
  }

  public SYMBOL getSymbol() {
    return symbol;
  }

  public static class ConnectiveAnd extends Connective {
    public ConnectiveAnd() {
      super(SYMBOL.AND);
    }
  }

  public static class ConnectiveOr extends Connective {
    public ConnectiveOr() {
      super(SYMBOL.OR);
    }
  }
}
