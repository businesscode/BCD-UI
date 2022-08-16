/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
package de.businesscode.util;

import java.io.File;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.activation.FileDataSource;
import javax.mail.Authenticator;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import com.sun.mail.util.MailSSLSocketFactory;

/**
 * Set these jndi properties.
   de.businesscode.bcdui.localjndi.smtp.host      = mysmtphost
   de.businesscode.bcdui.localjndi.smtp.password  = mysmtppassword
   de.businesscode.bcdui.localjndi.smtp.sender    = NOREPLY@myemail.com
   de.businesscode.bcdui.localjndi.smtp.user      = mysmtpuser
   de.businesscode.bcdui.localjndi.smtp.port      = 25
   de.businesscode.bcdui.localjndi.smtp.starttls  = true|false
   de.businesscode.bcdui.localjndi.smtp.subject   = Scheduled Report
   de.businesscode.bcdui.localjndi.smtp.body      = Please find your report attached.
 */
public class SendEmail 
{
  public static String JNDI_SMTP_HOST =     "de.businesscode.bcdui.localjndi.smtp.host";
  public static String JNDI_SMTP_PORT =     "de.businesscode.bcdui.localjndi.smtp.port";
  public static String JNDI_SMTP_STARTTLS = "de.businesscode.bcdui.localjndi.smtp.starttls";
  public static String JNDI_SMTP_USER =     "de.businesscode.bcdui.localjndi.smtp.user";
  public static String JNDI_SMTP_PASSWORD = "de.businesscode.bcdui.localjndi.smtp.password";
  public static String JNDI_SMTP_SENDER   = "de.businesscode.bcdui.localjndi.smtp.sender";
  public static String JNDI_SMTP_BODY     = "de.businesscode.bcdui.localjndi.smtp.body";
  public static String JNDI_SMTP_SUBJECT  = "de.businesscode.bcdui.localjndi.smtp.subject";
  
  protected Session session;
  protected String  host;
  protected int     port = 25;
  protected boolean starttls = true;
  protected String  user;
  protected String  password;
  protected String  subject = "Example Subject";
  protected String  body = "Example Body";
  protected InternetAddress fromInternetAddress;
  
  protected MimeMessage nextMessage;

  private static Logger log = LogManager.getLogger( SendEmail.class );

  /**
   * Create once, use send() multiple times
   * @param host
   * @param port
   * @param sender
   * @param user
   * @param password
   * @throws AddressException
   */
  public SendEmail(String host, Integer port, boolean starttls, String sender, String user, String password) throws AddressException, GeneralSecurityException
  {
    this.host     = host;
    this.port     = port;
    this.starttls = starttls;
    this.user     = user;
    this.password = password;
    this.fromInternetAddress = new InternetAddress(sender);
    
    initSession();
  }

  /**
   * Reads email account settings from JNDI context
   * @param host
   * @param port
   * @param sender
   * @param user
   * @param password
   * @throws AddressException
   * @throws NamingException 
   */
  public SendEmail() throws AddressException, NamingException, GeneralSecurityException
  {
    InitialContext initCtx = new InitialContext();
    Context ctx = (Context)initCtx.lookup("java:comp/env");

    this.host     = (String)ctx.lookup(JNDI_SMTP_HOST);
    this.starttls = Boolean.parseBoolean((String)ctx.lookup(JNDI_SMTP_STARTTLS));
    this.user     = (String)ctx.lookup(JNDI_SMTP_USER);
    this.password = (String)ctx.lookup(JNDI_SMTP_PASSWORD);
    this.fromInternetAddress = new InternetAddress((String)ctx.lookup(JNDI_SMTP_SENDER));
    try { this.port = Integer.parseInt((String)ctx.lookup(JNDI_SMTP_PORT)); } catch( Exception e ) {};
    try { this.starttls = Boolean.parseBoolean((String)ctx.lookup(JNDI_SMTP_STARTTLS)); } catch( Exception e ) {};
    try { this.body      = (String)ctx.lookup(JNDI_SMTP_BODY); } catch( Exception e ) {};
    try { this.subject   = (String)ctx.lookup(JNDI_SMTP_SUBJECT); } catch( Exception e ) {};
  
    initSession();
  }
  
  /**
   * Create a Session object to represent a mail session with the specified properties.
   * Sessions do not need to be closed
   * @param port
   * @throws GeneralSecurityException 
   */
  protected void initSession() throws GeneralSecurityException 
  {
    Properties props = System.getProperties();
    props.put("mail.transport.protocol", "smtp");
    props.put("mail.smtp.host", host);
    props.put("mail.smtp.port", port); 
    props.put("mail.smtp.starttls.enable", starttls);
    props.put("mail.smtp.auth", "true");

    MailSSLSocketFactory sf = new MailSSLSocketFactory();
    sf.setTrustAllHosts(true); 
    props.put("mail.smtp.ssl.trust", "*");
    props.put("mail.smtp.ssl.socketFactory", sf); 

    session = Session.getInstance(props, new Authenticator() {
      @Override
      protected PasswordAuthentication getPasswordAuthentication() {
          return new PasswordAuthentication(user, password);
      }
    });
  }

  /**
   * Actually send an email to multiple receipients
   * @param receipients semicolon separated
   * @param subject
   * @param body
   * @param attachments may be null
   * @throws MessagingException
   */
  public void send(String receipients, String subject, String body ) throws MessagingException 
  {
    send(receipients, subject, body, null);
  }

  /**
   * Actually send an email to multiple receipients
   * @param receipients semicolon separated
   * @param subject
   * @param body
   * @param attachments may be null
   * @throws MessagingException
   */
  public void send(String receipients, String subject, String body, String attachmentName, File attachment) throws MessagingException 
  {
    Map<String,DataSource> attachments = new HashMap<>();
    DataSource source = new FileDataSource(attachment);
    attachments.put(attachmentName, source);
    send(receipients, subject, body, attachments);
  }
  
  /**
   * Actually send an email to multiple receipients
   * @param receipients
   * @param subject
   * @param body
   * @param attachments attachmentname - filename
   * @throws MessagingException
   */
  public void sendWithFilenames(String receipients, String subject, String body, Map<String,String> attachmentFilenames ) throws MessagingException 
  {
    Map<String,DataSource> attachments = new HashMap<>();
    for( String atn: attachmentFilenames.keySet() ) {
      String fileName = attachmentFilenames.get(atn);
      DataSource source = new FileDataSource(fileName);
      attachments.put(atn, source);
    }
    send(receipients, subject, body, attachments);
  }
  
  /**
   * Actually send an email to multiple receipients
   * @param receipients semicolon separated
   * @param subject
   * @param body
   * @param attachments attachmentname - file
   * @throws MessagingException
   */
  public void sendWithFiles(String receipients, String subject, String body, Map<String,File> attachmentFiles ) throws MessagingException 
  {
    Map<String,DataSource> attachments = new HashMap<>();
    for( String atn: attachmentFiles.keySet() ) {
      File file = attachmentFiles.get(atn);
      DataSource source = new FileDataSource(file);
      attachments.put(atn, source);
    }
    send(receipients, subject, body, attachments);
  }

  /**
   * Actually send an email to multiple receipients
   * @param receipients semicolon separated
   * @param subject
   * @param body
   * @param attachments
   * @throws MessagingException
   */
  public void send(String receipients, String subject, String body, Map<String,DataSource> attachments ) throws MessagingException 
  {
    sendCC(receipients, "", subject, body, attachments );
  }

  /**
   * Actually send an email to multiple receipients
   * @param receipients semicolon separated
   * @param cc receipients semicolon separated
   * @param subject
   * @param body
   * @param attachments
   * @throws MessagingException
   */
  public void sendCC(String receipients, String receipientsCc, String subject, String body, Map<String,DataSource> attachments ) throws MessagingException 
  {
    String b = body == null ? this.body : body;
    String s = subject == null ? this.subject : subject;
    
    // Create a default MimeMessage object.
    MimeMessage message = new MimeMessage(session);

    message.setFrom(fromInternetAddress);
    message.setSubject(s);
    message.setText(b);

    // Set To: header field of the header.
    for( String receipient: receipients.split(";") )
      message.addRecipient(Message.RecipientType.TO, new InternetAddress(receipient));
  
    // Set cc: header field of the header.
    if( receipientsCc != null && !receipientsCc.isEmpty() )
      for( String receipientCc: receipientsCc.split(";") )
        message.addRecipient(Message.RecipientType.CC, new InternetAddress(receipientCc));
    
    // Attachment handling
    if( attachments!=null && !attachments.isEmpty() ) {
      Multipart multipart = new MimeMultipart();
      BodyPart messageBodyPartText = new MimeBodyPart();
      messageBodyPartText.setContent(b,"text/html; charset=utf-8");
      multipart.addBodyPart(messageBodyPartText);

      for( String attachName: attachments.keySet() ) {
        BodyPart messageBodyPart = new MimeBodyPart();
        messageBodyPart.setDataHandler(new DataHandler(attachments.get(attachName)));
        messageBodyPart.setFileName(attachName);
        multipart.addBodyPart(messageBodyPart);
      }
    
      message.setContent(multipart);
    }

    // Go!
    Transport.send(message, message.getAllRecipients());
    log.info("Successfully sent email to " + receipients);
  }
}