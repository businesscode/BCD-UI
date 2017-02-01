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
//
// Diese Datei wurde mit der JavaTM Architecture for XML Binding(JAXB) Reference Implementation, v2.2.8-b130911.1802 generiert 
// Siehe <a href="http://java.sun.com/xml/jaxb">http://java.sun.com/xml/jaxb</a> 
// �nderungen an dieser Datei gehen bei einer Neukompilierung des Quellschemas verloren. 
// Generiert: 2016.08.24 um 11:53:43 AM CEST 
//


package de.businesscode.bcdui.binding.subjectFilter.jaxb;

import javax.xml.bind.JAXBElement;
import javax.xml.bind.annotation.XmlElementDecl;
import javax.xml.bind.annotation.XmlRegistry;
import javax.xml.namespace.QName;


/**
 * This object contains factory methods for each 
 * Java content interface and Java element interface 
 * generated in the a package. 
 * <p>An ObjectFactory allows you to programatically 
 * construct new instances of the Java representation 
 * for XML content. The Java representation of XML 
 * content can consist of schema derived interfaces 
 * and classes representing the binding of schema 
 * type definitions, element declarations and model 
 * groups.  Factory methods for each of these are 
 * provided in this class.
 * 
 */
@XmlRegistry
public class ObjectFactory {

    private final static QName _SubjectFilters_QNAME = new QName("http://www.businesscode.de/schema/bcdui/bindings-1.0.0", "SubjectFilters");
    private final static QName _TypeSubjectFilterConnectiveAnd_QNAME = new QName("http://www.businesscode.de/schema/bcdui/bindings-1.0.0", "And");
    private final static QName _TypeSubjectFilterConnectiveOr_QNAME = new QName("http://www.businesscode.de/schema/bcdui/bindings-1.0.0", "Or");
    private final static QName _TypeSubjectFilterConnectiveSubjectFilter_QNAME = new QName("http://www.businesscode.de/schema/bcdui/bindings-1.0.0", "SubjectFilter");

    /**
     * Create a new ObjectFactory that can be used to create new instances of schema derived classes for package: a
     * 
     */
    public ObjectFactory() {
    }

    /**
     * Create an instance of {@link TypeSubjectFilters }
     * 
     */
    public TypeSubjectFilters createTypeSubjectFilters() {
        return new TypeSubjectFilters();
    }

    /**
     * Create an instance of {@link TypeSubjectFilter }
     * 
     */
    public TypeSubjectFilter createTypeSubjectFilter() {
        return new TypeSubjectFilter();
    }

    /**
     * Create an instance of {@link TypeSubjectFilterConnective }
     * 
     */
    public TypeSubjectFilterConnective createTypeSubjectFilterConnective() {
        return new TypeSubjectFilterConnective();
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilters }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "SubjectFilters")
    public JAXBElement<TypeSubjectFilters> createSubjectFilters(TypeSubjectFilters value) {
        return new JAXBElement<TypeSubjectFilters>(_SubjectFilters_QNAME, TypeSubjectFilters.class, null, value);
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilterConnective }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "And", scope = TypeSubjectFilterConnective.class)
    public JAXBElement<TypeSubjectFilterConnective> createTypeSubjectFilterConnectiveAnd(TypeSubjectFilterConnective value) {
        return new JAXBElement<TypeSubjectFilterConnective>(_TypeSubjectFilterConnectiveAnd_QNAME, TypeSubjectFilterConnective.class, TypeSubjectFilterConnective.class, value);
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilterConnective }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "Or", scope = TypeSubjectFilterConnective.class)
    public JAXBElement<TypeSubjectFilterConnective> createTypeSubjectFilterConnectiveOr(TypeSubjectFilterConnective value) {
        return new JAXBElement<TypeSubjectFilterConnective>(_TypeSubjectFilterConnectiveOr_QNAME, TypeSubjectFilterConnective.class, TypeSubjectFilterConnective.class, value);
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilter }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "SubjectFilter", scope = TypeSubjectFilterConnective.class)
    public JAXBElement<TypeSubjectFilter> createTypeSubjectFilterConnectiveSubjectFilter(TypeSubjectFilter value) {
        return new JAXBElement<TypeSubjectFilter>(_TypeSubjectFilterConnectiveSubjectFilter_QNAME, TypeSubjectFilter.class, TypeSubjectFilterConnective.class, value);
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilterConnective }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "And", scope = TypeSubjectFilters.class)
    public JAXBElement<TypeSubjectFilterConnective> createTypeSubjectFiltersAnd(TypeSubjectFilterConnective value) {
        return new JAXBElement<TypeSubjectFilterConnective>(_TypeSubjectFilterConnectiveAnd_QNAME, TypeSubjectFilterConnective.class, TypeSubjectFilters.class, value);
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilterConnective }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "Or", scope = TypeSubjectFilters.class)
    public JAXBElement<TypeSubjectFilterConnective> createTypeSubjectFiltersOr(TypeSubjectFilterConnective value) {
        return new JAXBElement<TypeSubjectFilterConnective>(_TypeSubjectFilterConnectiveOr_QNAME, TypeSubjectFilterConnective.class, TypeSubjectFilters.class, value);
    }

    /**
     * Create an instance of {@link JAXBElement }{@code <}{@link TypeSubjectFilter }{@code >}}
     * 
     */
    @XmlElementDecl(namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", name = "SubjectFilter", scope = TypeSubjectFilters.class)
    public JAXBElement<TypeSubjectFilter> createTypeSubjectFiltersSubjectFilter(TypeSubjectFilter value) {
        return new JAXBElement<TypeSubjectFilter>(_TypeSubjectFilterConnectiveSubjectFilter_QNAME, TypeSubjectFilter.class, TypeSubjectFilters.class, value);
    }

}
