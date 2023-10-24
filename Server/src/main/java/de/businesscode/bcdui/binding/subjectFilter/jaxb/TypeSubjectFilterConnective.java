/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
// Aenderungen an dieser Datei gehen bei einer Neukompilierung des Quellschemas verloren. 
// Generiert: 2016.08.24 um 11:53:43 AM CEST 
//


package de.businesscode.bcdui.binding.subjectFilter.jaxb;

import java.util.ArrayList;
import java.util.List;
import javax.xml.bind.JAXBElement;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElementRef;
import javax.xml.bind.annotation.XmlElementRefs;
import javax.xml.bind.annotation.XmlType;


/**
 * <p>Java-Klasse fuer TypeSubjectFilterConnective complex type.
 * 
 * <p>Das folgende Schemafragment gibt den erwarteten Content an, der in dieser Klasse enthalten ist.
 * {@code
 * <pre>
 * <complexType name="TypeSubjectFilterConnective">
 *   <complexContent>
 *     <restriction base="{http://www.w3.org/2001/XMLSchema}anyType">
 *       <choice maxOccurs="unbounded">
 *         <element name="SubjectFilter" type="{http://www.businesscode.de/schema/bcdui/bindings-1.0.0}TypeSubjectFilter"/>
 *         <element name="And" type="{http://www.businesscode.de/schema/bcdui/bindings-1.0.0}TypeSubjectFilterConnective"/>
 *         <element name="Or" type="{http://www.businesscode.de/schema/bcdui/bindings-1.0.0}TypeSubjectFilterConnective"/>
 *       </choice>
 *     </restriction>
 *   </complexContent>
 * </complexType>
 * </pre>
 * }
 * 
 */
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "TypeSubjectFilterConnective", propOrder = {
    "subjectFilterOrAndOrOr"
})
public class TypeSubjectFilterConnective {

    @XmlElementRefs({
        @XmlElementRef(name = "SubjectFilter", namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", type = JAXBElement.class, required = false),
        @XmlElementRef(name = "Or", namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", type = JAXBElement.class, required = false),
        @XmlElementRef(name = "And", namespace = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0", type = JAXBElement.class, required = false)
    })
    protected List<JAXBElement<?>> subjectFilterOrAndOrOr;

    /**
     * Gets the value of the subjectFilterOrAndOrOr property.
     * 
     * <p>
     * This accessor method returns a reference to the live list,
     * not a snapshot. Therefore any modification you make to the
     * returned list will be present inside the JAXB object.
     * This is why there is not a <CODE>set</CODE> method for the subjectFilterOrAndOrOr property.
     * 
     * <p>
     * For example, to add a new item, do as follows:
     * <pre>
     *    getSubjectFilterOrAndOrOr().add(newItem);
     * </pre>
     * 
     * 
     * <p>
     * Objects of the following type(s) are allowed in the list
     * {@link JAXBElement }{@code <}{@link TypeSubjectFilterConnective }{@code >}
     * {@link JAXBElement }{@code <}{@link TypeSubjectFilter }{@code >}
     * {@link JAXBElement }{@code <}{@link TypeSubjectFilterConnective }{@code >}
     * 
     * 
     */
    public List<JAXBElement<?>> getSubjectFilterOrAndOrOr() {
        if (subjectFilterOrAndOrOr == null) {
            subjectFilterOrAndOrOr = new ArrayList<JAXBElement<?>>();
        }
        return this.subjectFilterOrAndOrOr;
    }

}
