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

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBElement;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Unmarshaller;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.Subject;
import org.w3c.dom.Node;

import de.businesscode.bcdui.binding.subjectFilter.Connective.ConnectiveAnd;
import de.businesscode.bcdui.binding.subjectFilter.Connective.ConnectiveOr;
import de.businesscode.bcdui.binding.subjectFilter.jaxb.TypeSubjectFilter;
import de.businesscode.bcdui.binding.subjectFilter.jaxb.TypeSubjectFilterConnective;
import de.businesscode.bcdui.binding.subjectFilter.jaxb.TypeSubjectFilters;
import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;

/**
 * SubjectFilters definition in BindingSet. Contains subject filter definition, the {@link #getConnective()} returns the root {@link Connective}
 */
public class SubjectFilters {
  private final Connective connective;

  public SubjectFilters(Connective connective) {
    this.connective = connective;
  }

  private Collection<SubjectFilter> collectSubjectFilters(Connective connective, Collection<SubjectFilter> targetCollection) {
    for (SubjectFilterNode node : connective.getElements()) {
      if (node instanceof SubjectFilter) {
        targetCollection.add((SubjectFilter) node);
      } else if (node instanceof Connective) {
        collectSubjectFilters((Connective) node, targetCollection);
      } else {
        throw new RuntimeException("Unknown type: " + node);
      }
    }
    return targetCollection;
  }

  /**
   * 
   * @return unmutable collection of all {@link SubjectFilter}
   */
  public Collection<SubjectFilter> getPlainFilters() {
    return Collections.unmodifiableCollection(collectSubjectFilters(connective, new ArrayList<SubjectFilter>()));
  }

  /**
   * enriches binding items with those from subject filter definition
   * 
   * @param brefs
   */
  public void enrichBindingItems(Set<String> brefs) {
    // add possible missing subject filter bRef to add missing joins
    // can only be done here since subject filter bRefs are only known after binding parsing
    // If the user has any-right "*" for a SubjectFilter, we do not need any join
    Subject subject = SecurityUtils.getSubject();
    // TODO: what to do in case subject is not authenticated? 
    Session session = subject.getSession(false);
    SubjectSettings settings = SubjectSettings.getInstance();
    getPlainFilters().forEach(sf -> {
      SubjectFilterType ft = settings.getSubjectFilterTypeByName(sf.getType());
      // we have a wildcard in session
      if("*".equals(settings.getFilterTypeValue(session, ft))){
        return;
      }
      // we have a wildcard in subject settings
      if (subject.isPermitted(settings.getFilterType(ft) + ":*"))
        return;
      brefs.add(ft.getBindingItems().getC().getBRef());
    });
  }

  /**
   * @return root {@link Connective} element
   */
  public Connective getConnective() {
    return connective;
  }

  private static JAXBContext jaxbContext;

  static {
    try {
      jaxbContext = JAXBContext.newInstance("de.businesscode.bcdui.binding.subjectFilter.jaxb");
    } catch (JAXBException e) {
      throw new RuntimeException("Failed to initialize JAXBContext", e);
    }
  }

  /**
   * parses wrs:SubjectFilters node and returns SubjectFilters instance
   * 
   * @param subjectFiltersNode
   *          (wrs:SubjectFilters)
   * @return instance
   */
  public static SubjectFilters parse(Node subjectFiltersNode) {
    try {
      Unmarshaller um = jaxbContext.createUnmarshaller();
      TypeSubjectFilters filters = um.unmarshal(subjectFiltersNode, TypeSubjectFilters.class).getValue();
      int filtersTopLevel = filters.getSubjectFilterOrAndOrOr().size();
      final Connective rootConnective;

      if (filtersTopLevel == 0) {
        throw new RuntimeException("no SubjectFilter found in SubjectFilters!");
      } else if (filtersTopLevel == 1 && filters.getSubjectFilterOrAndOrOr().get(0).getValue() instanceof TypeSubjectFilterConnective) { // we have exactly 1 root connective
        TypeSubjectFilterConnective conn = (TypeSubjectFilterConnective) filters.getSubjectFilterOrAndOrOr().get(0).getValue();
        rootConnective = build(conn.getSubjectFilterOrAndOrOr(), toConnective(filters.getSubjectFilterOrAndOrOr().get(0)));
      } else {
        // create default root connective and add children to it
        rootConnective = build(filters.getSubjectFilterOrAndOrOr(), new ConnectiveAnd());
      }
      return new SubjectFilters(rootConnective);
    } catch (JAXBException e) {
      throw new RuntimeException("Failed to parse SubjectFilters", e);
    }
  }

  /**
   * @return either {@link ConnectiveAnd} or {@link ConnectiveOr}
   */
  private static Connective toConnective(JAXBElement<?> jaxbElement) {
    String name = jaxbElement.getName().getLocalPart();
    if ("Or".equals(name)) {
      return new ConnectiveOr();
    } else if ("And".equals(name)) {
      return new ConnectiveAnd();
    } else {
      throw new RuntimeException("'Or' or 'And' expected, got " + jaxbElement.getName());
    }
  }

  /**
   * 
   * @param filterNodes
   * @param rootConnective
   *          to attach SubjectFilter
   * @return Connective combining elements from filterNodes
   */
  private static Connective build(List<JAXBElement<?>> filterNodes, Connective rootConnective) {
    for (JAXBElement<?> jaxbEl : filterNodes) {
      Object val = jaxbEl.getValue();
      if (val instanceof TypeSubjectFilter) {
        // add to created connective
        rootConnective.getElements().add(new SubjectFilter(((TypeSubjectFilter) val).getType()));
      } else if (val instanceof TypeSubjectFilterConnective) {
        Connective conn = toConnective(jaxbEl);
        rootConnective.getElements().add(build(((TypeSubjectFilterConnective) val).getSubjectFilterOrAndOrOr(), conn));
      } else {
        throw new RuntimeException("Unknown type: " + val);
      }
    }
    return rootConnective;
  }
}
