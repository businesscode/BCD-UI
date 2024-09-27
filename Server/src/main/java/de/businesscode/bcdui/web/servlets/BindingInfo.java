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
package de.businesscode.bcdui.web.servlets;

import java.io.IOException;
import java.util.ArrayList;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamWriter;
import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingItemFromRel;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.util.StandardNamespaceContext;

public class BindingInfo extends HttpServlet {

  private static final long serialVersionUID = 1L;

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", -1);

    String bindingSetId = request.getParameter("bindingSetId");
    String bindingItems = request.getParameter("bRefs");
    
    ArrayList<String> bRefs = new ArrayList<>();
    if (bindingItems != null) {
      for (String s : bindingItems.split(",")) {
        bRefs.add(s.trim());
      }
    }

    StandardBindingSet bs = null;
    if (bindingSetId != null && ! bindingSetId.isEmpty())
      try { bs = Bindings.getInstance().get(bindingSetId, new ArrayList<String>()); } catch (BindingException e) {}

    // not all allowed to select all, and no bRefs given, leave!
    if (!bs.isAllowSelectAllColumns() && bRefs.isEmpty()) {
      response.setStatus(403);
      return;
    }

    boolean success = false;

    if (bs != null) {
      XMLStreamWriter writer = null;
      try {
        writer = XMLOutputFactory.newInstance().createXMLStreamWriter(response.getWriter());
        writer.writeStartDocument();
        writer.writeStartElement("BindingSet");
        writer.writeAttribute("id", bs.getName());
        writer.writeDefaultNamespace(StandardNamespaceContext.BINDINGS_NAMESPACE);

        for( BindingItem bi: bs.getBindingItems() ) {
          String bRef = bi.getId();

          if ((! bRefs.isEmpty() && bRefs.contains(bRef)) || bRefs.isEmpty()) {
            writer.writeStartElement("C");
            writer.writeAttribute("id", bi.getId());
            writer.writeAttribute("caption", bi.getCaption());
            String description = bi.getDescription();
            if (description != null && ! description.isEmpty()) {
              writer.writeStartElement("Description");
             writer.writeCharacters(description);
              writer.writeEndElement();
            }
            writer.writeEndElement();
          }
        }

        for (Relation r : bs.getRelations()) {
          for (BindingItemFromRel i :  r.getImportItems()) {
            String bRef = i.getId();
            if ((! bRefs.isEmpty() && bRefs.contains(bRef)) || bRefs.isEmpty()) {
              writer.writeStartElement("C");
              writer.writeAttribute("binding", r.getId());
              writer.writeAttribute("id", i.getId());
              writer.writeAttribute("caption", i.getCaption());
              String description = i.getDescription();
              if (description != null && ! description.isEmpty()) {
                writer.writeStartElement("Description");
               writer.writeCharacters(description);
                writer.writeEndElement();
              }
              writer.writeEndElement();
            }
          }
        }

        writer.writeEndElement();
        writer.writeEndDocument();

        success = true;
      }
      catch (Exception e) {/* void */ }
    }
    if (!success)    
      response.setStatus(403);

    return;
  }
}
