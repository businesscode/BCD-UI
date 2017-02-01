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
//  A heavily modified version based on a calendar
//  written by Tan Ling Wee on 2 Dec 2001 - last updated 20 June 2003 - email: fuushikaden@yahoo.com

// True, if the calender should fire an "onChange" event on the visible date field
// when it is closed.

/*
 * Ignore the whole code in case there is already a popcalendar defined. This is
 * the case when BCDUI 3 is present.
 */

(function(){

var shouldFireChangeEventOnClose = true;

var showPopCalendarImages = (typeof bcdui.widget.periodChooser.bcdPopCalendarLegacy != "undefined" && bcdui.widget.periodChooser.bcdPopCalendarLegacy != null && bcdui.widget.periodChooser.bcdPopCalendarLegacy == true);
var utf8CharStyle = showPopCalendarImages ? "style='display:none'" : "";

var  fixedX = -1;      // x position (-1 if to appear below control)
var  fixedY = -1;      // y position (-1 if to appear below control)
var startAt = 1;      // 0 - sunday ; 1 - monday
var showWeekNumber = 1;  // 0 - don't show; 1 - show
var showToday = 1;    // 0 - don't show; 1 - show

//only define imgDir if it was not defined before
if(typeof(imgDir)=="undefined"){
  if (typeof bcdui.config.contextPath == "undefined") {
    var imgDir = "../bcdui/theme/images/calendar/";  // directory for images ... e.g. var imgDir="/img/"
  } else {
    var imgDir = bcdui.config.contextPath + "/bcdui/theme/images/calendar/";
  }
}

var gotoString = "Go To Current Month";
var todayString = "Today:";
var weekString = "Week";
var scrollLeftMessage = "Click to scroll to previous month. Hold mouse button to scroll automatically.";
var scrollRightMessage = "Click to scroll to next month. Hold mouse button to scroll automatically.";
var selectMonthMessage = "Click to select a month.";
var selectYearMessage = "Click to select a year.";
var selectDateMessage = "Select [date] as date."; // do not replace [date], it will be replaced by date.

var  crossobj, crossMonthObj, crossYearObj, monthSelected, yearSelected, dateSelected, omonthSelected, oyearSelected, odateSelected, monthConstructed, yearConstructed, intervalID1, intervalID2, timeoutID1, timeoutID2, ctlToPlaceValue, ctlNow, dateFormat, nStartingYear;

var  bPageLoaded=false;
var  ie=document.all;
var  dom=document.getElementById;

var  ns4=document.layers;
var  today =  new  Date();
var  dateNow   = today.getDate();
var  monthNow = today.getMonth();
var  yearNow   = today.getFullYear();
var  imgsrc = new Array("caldrop1_1.gif","caldrop1_2.gif","calleft1_1.gif","calleft1_2.gif","calright1_1.gif","calright1_2.gif");
var  img  = new Array();
var  firstDayOfWeek = null;
var  lastDayOfWeek = null;
var  firstDay = 0;
var  lastDay = 0;
var  bShow = false;
var  weekIsSelected = 0;
var  monthIsSelected = 0;
var  yearIsSelected = 0;
var  quarterIsSelected = 0;
var  currentWeek = 0;
var  tmpDay
var prevMonth, prevYear, nextMont,nextYear;
var isWeekSelectable = false;
var selectCurrentMonth;

var firstSelectableDay = 0;
var lastSelectableDay = 0;
if(typeof isDaySelectable == "undefined"){
  var isDaySelectable=true;
}

if(typeof isMonthSelectable == "undefined"){
    var isMonthSelectable=true;
}

if(typeof isYearSelectable == "undefined"){
  var isYearSelectable=false;
}

if(typeof isQuarterSelectable == "undefined"){
  var isQuarterSelectable=false;
}
// default calendar DIV heigth in px
var defCalendarHeight = 170;
var defCalendarWidth = 255;
var isFirstAppear = true;
// handler id of timeout
var handlerId;

/**
 * returns elements absolute position to BODY
 *
 * @param el
 * @return hash \{left, top\}
 * @ignore
 */
function getAbsolutePosition(el) {
  var left   = el.offsetLeft;
  var top    = el.offsetTop;
  var parent = el.offsetParent;

  while( parent != document.body )
  {
    left  += parent.offsetLeft;
    top   += parent.offsetTop;
    parent = parent.offsetParent;
  }

  return {left:left,top:top};
}

  /* hides <select> and <applet> objects (for IE only) */
  /* offset: hash of left,top */
/**
 * @ignore
 */
  function hideElement( elmID, overDiv, treatOverDivAbsolute )
  {
    if( ie )
    {
      treatOverDivAbsolute = typeof treatOverDivAbsolute!="undefined" ? treatOverDivAbsolute : false;

      var overDivLeft = overDiv.offsetLeft;
      var overDivTop = overDiv.offsetTop;

      if(treatOverDivAbsolute){
        var pos = getAbsolutePosition(overDiv);
        overDivLeft = pos.left;
        overDivTop = pos.top;
      }

      var potentialElements = document.body.getElementsByTagName( elmID );
      for( i = 0; i < potentialElements.length; i++ )
      {
        //obj = document.all.tags( elmID )[i];
        obj = potentialElements[i];
        if( !obj || !obj.offsetParent )
        {
          continue;
        }

        // Find the element's offsetTop and offsetLeft relative to the BODY tag.
        objLeft   = obj.offsetLeft;
        objTop    = obj.offsetTop;
        objParent = obj.offsetParent;

        while( objParent && objParent != document.body ) // IE has undefined obj.offsetParent so check it before accessing
        {
          objLeft  += objParent.offsetLeft;
          objTop   += objParent.offsetTop;
          objParent = objParent.offsetParent;
        }

        objHeight = obj.offsetHeight;
        objWidth = obj.offsetWidth;

        if((overDivLeft + overDiv.offsetWidth ) <= objLeft ){}
        else if(( overDivTop + overDiv.offsetHeight ) <= objTop ){}
        else if( overDivTop >= ( objTop + objHeight )){}
        else if( overDivLeft >= ( objLeft + objWidth )){}
        else
        {
          obj.style.visibility = "hidden";
        }
      }
    }
  }

 /**
  * unhides <select> and <applet> objects (for IE only)
  * @ignore
  */
  function showElement( elmID )
  {
    if( ie )
    {
      for( i = 0; i < document.all.tags( elmID ).length; i++ )
      {
        obj = document.all.tags( elmID )[i];

        if( !obj || !obj.offsetParent )
        {
          continue;
        }

        obj.style.visibility = "";
      }
    }
  }

/**
 * @ignore
 */
function HolidayRec (d, m, y, desc)
{
  this.d = d;
  this.m = m;
  this.y = y;
  this.desc = desc;
}

var HolidaysCounter = 0;
var Holidays = new Array();

/**
 * @ignore
 */
function addHoliday (d, m, y, desc)
{
  Holidays[HolidaysCounter++] = new HolidayRec ( d, m, y, desc );
}

var  monthName =  new  Array("January","February","March","April","May","June","July","August","September","October","November","December");
var  monthName2 = new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec");
if (startAt==0)
{
  dayName = new Array  ("Sun","Mon","Tue","Wed","Thu","Fri","Sat");
}
else
{
  dayName = new Array  ("Mon","Tue","Wed","Thu","Fri","Sat","Sun");
}
var  styleAnchor="text-decoration:none;color:black;";
var  styleLightBorder="border-style:solid;border-width:1px;border-color:#ffffff;";
var  styleUnselectableDay="color:red; background: gray;";

/**
 * @ignore
 */
function swapImage(srcImg, destImg){
  if (ie && showPopCalendarImages)  { document.getElementById(srcImg).setAttribute("src",imgDir + destImg); }
}

/**
 * @ignore
 * @private
 */
function _initPopupCalendar()  {
  /*
   * initWithoutImg: to avoid bad HTTP request for calendar images
   * see PTS Bug 3674: popcalendar.js makes status 404 requests for images on load
   *
   */
  if (dom && document.getElementById("bcdCalendar") == null) {
    var calDiv = "<div id='bcdCalendar' style='z-index:+9999;position:absolute;visibility:hidden;'><iframe id='menu4iframe' marginwidth='0' marginheight='0' align='bottom' scrolling='no' frameborder='0' style='height:100%; position:absolute; left:0; top:0px; width: 100%;display:block; z-index:-1;' src='javascript:false'></iframe><table class='popupBaseColor' style='width:auto;font-family:arial;font-size:11px;border-width:1px;border-style:solid;font-family:arial; font-size:11px}' ><tr class='popupBaseColor'><td><table width='"+((showWeekNumber==1)?248:218)+"'><tr><td style='padding:2px;font-family:arial; font-size:11px;'><font color='#ffffff'><B><span id='popCalCaption'></span></B></font></td><td class='calCloseImage'>" + (showPopCalendarImages ? "<IMG id='calCloseImage' WIDTH='15' HEIGHT='13' BORDER='0'></IMG>" : "") + "<SPAN " + utf8CharStyle + " class='calCloseImage'></SPAN></td></tr></table></td></tr><tr><td style='padding:5px' bgcolor=#ffffff><span id='popCalContent'></span></td></tr>";
    if (showToday==1)
      calDiv += "<tr class='popupBaseColor'><td style='padding:5px' align=center><span id='lblToday'></span></td></tr>";
    calDiv += "</table></div>";
    jQuery("head").append(calDiv); // will be moved to body during bcdLoadPost.js
    jQuery("#bcdCalendar").off();
    jQuery("#bcdCalendar").on("click", function() {bShow=true; clearCalendarTimeOut();});
    jQuery("#bcdCalendar td.calCloseImage").off();
    jQuery("#bcdCalendar td.calCloseImage").on("click", function() {hideCalendar();});
  }

  if (!ns4)
  {
    /* if (!ie) { yearNow += 1900;  } */

    crossobj=(dom)?document.getElementById("bcdCalendar").style : ie? document.all.bcdCalendar : document.bcdCalendar;
    hideCalendar();

    monthConstructed=false;
    yearConstructed=false;

    /*
    if (isWeekSelectable){
      selectCurrentMonth = monthName[monthNow].substring(0,3)+" |&nbsp;&nbsp;"
    }else{
      selectCurrentMonth=""
    }

    if (showToday==1)
    {
      document.getElementById("lblToday").innerHTML =selectCurrentMonth+todayString + " <a onmousemove='window.status=\""+gotoString+"\"' onmouseout='window.status=\"\"' title='"+gotoString+"' style='"+styleAnchor+"' href='javascript:monthSelected=monthNow;yearSelected=yearNow;bcdui.widget.periodChooser._constructCalendar();'>"+dayName[(today.getDay()-startAt==-1)?6:(today.getDay()-startAt)]+", " + dateNow + " " + monthName[monthNow].substring(0,3)  + "  " +  yearNow  + " Week " +(WeekNbr(new Date(yearNow,monthNow,dateNow)))+"</a>";
    }
    */



    sHTML1="<span id='spanLeft' class='popupStyle'>&nbsp";
    if (showPopCalendarImages) sHTML1+= "<IMG id='changeLeft' SRC='"+imgDir+imgsrc[2]+"' width=10 height=11 BORDER=0></img>";
    sHTML1 +="<SPAN class='changeLeft' " + utf8CharStyle + "></SPAN>&nbsp</span>&nbsp;";
    sHTML1 +="<span id='spanRight' class='popupStyle'>&nbsp;";
    if(showPopCalendarImages) sHTML1 +="<IMG id='changeRight' SRC='"+imgDir+imgsrc[4]+"' width=10 height=11 BORDER=0></img>";
    sHTML1 += "<SPAN class='changeRight' " + utf8CharStyle + "></SPAN>&nbsp</span>&nbsp;";
    sHTML1+="<div id='selectMonth' style='z-index:+999;position:absolute;visibility:hidden;top:26px;'></div>&nbsp;";
    sHTML1+="<span id='spanMonth' class='popupStyle'></span>&nbsp;";
    sHTML1+="<div id='selectYear' style='z-index:+999;position:absolute;visibility:hidden;top:26px;'></div>";
    sHTML1+="<span id='spanYear' class='popupStyle'></span>";
    document.getElementById("popCalCaption").innerHTML  =  sHTML1;

    jQuery("#spanLeft").off();
    jQuery("#spanLeft").on("mouseover", function() {jQuery("#spanLeft").attr("class", "popupStyleOver"); swapImage("changeLeft",imgsrc[3]); window.status=scrollLeftMessage;});
    jQuery("#spanLeft").on("mouseout", function() {jQuery("#spanLeft").attr("class", "popupStyle"); clearInterval(intervalID1);swapImage("changeLeft",imgsrc[2]);window.status="";});
    jQuery("#spanLeft").on("click", function() {decMonth()});
    jQuery("#spanLeft").on("mousedown", function() {clearTimeout(timeoutID1);timeoutID1=setTimeout(StartDecMonth,500)});
    jQuery("#spanLeft").on("mouseup", function() {clearTimeout(timeoutID1);clearInterval(intervalID1)});

    jQuery("#spanRight").off();
    jQuery("#spanRight").on("mouseover", function() {jQuery("#spanRight").attr("class", "popupStyleOver"); swapImage("changeRight",imgsrc[5]); window.status=scrollRightMessage;});
    jQuery("#spanRight").on("mouseout", function() {jQuery("#spanRight").attr("class", "popupStyle"); clearInterval(intervalID1);swapImage("changeRight",imgsrc[4]);window.status="";});
    jQuery("#spanRight").on("click", function() {incMonth()});
    jQuery("#spanRight").on("mousedown", function() {clearTimeout(timeoutID1);timeoutID1=setTimeout(StartIncMonth,500)});
    jQuery("#spanRight").on("mouseup", function() {clearTimeout(timeoutID1);clearInterval(intervalID1)});

    jQuery("#spanMonth").off();
    jQuery("#spanMonth").on("mouseover", function() {jQuery("#spanMonth").attr("class", "popupStyleOver"); swapImage("changeMonth",imgsrc[1]); window.status=selectMonthMessage;});
    jQuery("#spanMonth").on("mouseout", function() {jQuery("#spanMonth").attr("class", "popupStyle"); clearInterval(intervalID1);swapImage("changeMonth",imgsrc[0]);window.status="";});
    jQuery("#spanMonth").on("click", function() {popUpMonth()});

    jQuery("#spanYear").off();
    jQuery("#spanYear").on("mouseover", function() {jQuery("#spanYear").attr("class", "popupStyleOver"); swapImage("changeYear",imgsrc[1]); window.status="";});
    jQuery("#spanYear").on("mouseout", function() {jQuery("#spanYear").attr("class", "popupStyle"); clearInterval(intervalID1);swapImage("changeYear",imgsrc[0]);window.status="";});
    jQuery("#spanYear").on("click", function() {popUpYear()});

    crossMonthObj=(dom)?document.getElementById("selectMonth").style : ie? document.all.selectMonth  : document.selectMonth;
    crossYearObj=(dom)?document.getElementById("selectYear").style : ie? document.all.selectYear : document.selectYear;

    var calCloseImageElement = document.getElementById("calCloseImage");
    if (calCloseImageElement != null) {
      if(showPopCalendarImages) {
        calCloseImageElement.src = imgDir + "calclose.gif";
        calCloseImageElement.onmouseover = function() { document.getElementById("calCloseImage").src = imgDir + "calclose_2.gif" };
        calCloseImageElement.onmouseout = function() { document.getElementById("calCloseImage").src = imgDir + "calclose.gif" };
      }
    }

    bPageLoaded=true;

  }

}

/**
 * @ignore
 */
function setCalendarTimeOut(){
  handlerId = window.setTimeout(hideCalendar,500);
}

/**
 * @ignore
 */
function clearCalendarTimeOut()
{
  window.clearTimeout(handlerId);
}

/**
 * @ignore
 */
function hideCalendar()  {
  if (crossobj != null){crossobj.visibility="hidden";}
  if (crossMonthObj != null){crossMonthObj.visibility="hidden";}
  if (crossYearObj !=  null){crossYearObj.visibility="hidden";}

  showElement( 'SELECT' );
  showElement( 'APPLET' );
  clearCalendarTimeOut();

  if(typeof bcduiAutocorrect == 'function'){
    bcduiAutocorrect();
  }

}

/**
 * @ignore
 */
function padZero(num) {
  return (num  < 10)? '0' + num : num ;
}

/**
 * @ignore
 */
function constructDate(d,m,y)
{
  sTmp = dateFormat;
  sTmp = sTmp.replace  ("dd","<e>");
  sTmp = sTmp.replace  ("d","<d>");
  sTmp = sTmp.replace  ("<e>",padZero(d));
  sTmp = sTmp.replace  ("<d>",d);
  sTmp = sTmp.replace  ("mmmm","<p>");
  sTmp = sTmp.replace  ("mmm","<o>");
  sTmp = sTmp.replace  ("mm","<n>");
  sTmp = sTmp.replace  ("m","<m>");
  sTmp = sTmp.replace  ("<m>",m+1);
  sTmp = sTmp.replace  ("<n>",padZero(m+1));
  sTmp = sTmp.replace  ("<o>",monthName[m]);
  sTmp = sTmp.replace  ("<p>",monthName2[m]);
  sTmp = sTmp.replace  ("yyyy",y);
  return sTmp.replace ("yy",padZero(y%100));
}

/**
 * @private
 */
bcdui.widget.periodChooser._closeCalendar = function(args) {

  if (args) {
    if (typeof args.yearIsSelected != "undefined")
      yearIsSelected = args.yearIsSelected;
    if (typeof args.quarterIsSelected != "undefined")
      quarterIsSelected = args.quarterIsSelected;
    if (typeof args.monthIsSelected != "undefined")
      monthIsSelected = args.monthIsSelected;
    if (typeof args.firstDay != "undefined")
      firstDay = args.firstDay;
    if (typeof args.currentweek != "undefined")
      currentweek = args.currentweek;
    if (typeof args.weekIsSelected != "undefined")
      weekIsSelected = args.weekIsSelected;
    if (typeof args.dateSelected != "undefined")
      dateSelected = args.dateSelected;
  }

  var  sTmp;

  if (args.prevDay) {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); 
    ctlToPlaceValue.value = constructDateUserFormat(yesterday.getDate() ,yesterday.getMonth(),yesterday.getFullYear(),dateFormatStartRange)+" - "+constructDateUserFormat(yesterday.getDate(),yesterday.getMonth(),yesterday.getFullYear(),dateFormatEndRange);
    if( ctlToPlaceValue2 != null )
      ctlToPlaceValue2.value = constructDateUserFormat(yesterday.getDate() ,yesterday.getMonth(),yesterday.getFullYear(),dateFormatStartRange)+";"+constructDateUserFormat(yesterday.getDate(),yesterday.getMonth(),yesterday.getFullYear(),dateFormatEndRange);
  } else if (args.prevWeek) {
    var lastWeekStart = new Date()
    var dayOfWeek = lastWeekStart.getDay();
    var off = (dayOfWeek > 0) ? dayOfWeek - 1 : 6;
    lastWeekStart.setDate(lastWeekStart.getDate() - off - 7);
    var lastWeekStop = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate());
    lastWeekStop.setDate(lastWeekStop.getDate() + 6); 
    ctlToPlaceValue.value = constructDateUserFormat(lastWeekStart.getDate() ,lastWeekStart.getMonth(),lastWeekStart.getFullYear(),dateFormatStartRange)+" - "+constructDateUserFormat(lastWeekStop.getDate(),lastWeekStop.getMonth(),lastWeekStop.getFullYear(),dateFormatEndRange);
    if( ctlToPlaceValue2 != null )
      ctlToPlaceValue2.value = constructDateUserFormat(lastWeekStart.getDate() ,lastWeekStart.getMonth(),lastWeekStart.getFullYear(),dateFormatStartRange)+";"+constructDateUserFormat(lastWeekStop.getDate(),lastWeekStop.getMonth(),lastWeekStop.getFullYear(),dateFormatEndRange);
  } else if (args.prevMonth) {
    var today = new Date();
    var thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var yr = today.getFullYear();
    var mo = today.getMonth() + 1;
    mo--;
    if (mo == 0) {
      mo = 12;
      yr--;
    }
    var lastMonthStart = new Date(yr, mo - 1, 1)
    thisMonth.setDate(thisMonth.getDate() - 1); 
    ctlToPlaceValue.value = constructDateUserFormat(lastMonthStart.getDate() ,lastMonthStart.getMonth(),lastMonthStart.getFullYear(),dateFormatStartRange)+" - "+constructDateUserFormat(thisMonth.getDate(),thisMonth.getMonth(),thisMonth.getFullYear(),dateFormatEndRange);
    if( ctlToPlaceValue2 != null )
      ctlToPlaceValue2.value = constructDateUserFormat(lastMonthStart.getDate() ,lastMonthStart.getMonth(),lastMonthStart.getFullYear(),dateFormatStartRange)+";"+constructDateUserFormat(thisMonth.getDate(),thisMonth.getMonth(),thisMonth.getFullYear(),dateFormatEndRange);
  } else if (weekIsSelected == 1){

    firstDayOfWeek = new Date(yearSelected,monthSelected,firstDay+1);
    tmpDay = firstDayOfWeek.getDay();

    if((tmpDay==0)){
      firstDayOfWeek = new Date (yearSelected,monthSelected,firstDay-5);
      lastDayOfWeek = new Date (yearSelected,monthSelected,firstDay+1);
    }

    if ((tmpDay>=1)){
      firstDayOfWeek = new Date (yearSelected,monthSelected,firstDay+2-tmpDay);
      firstDay = firstDay-tmpDay+1;
      lastDay = firstDay+7;
      lastDayOfWeek = new Date(yearSelected,monthSelected,lastDay);
    }
    // ctlToPlaceValue.value = "Week " + currentweek+" ");
    ctlToPlaceValue.value = constructDateUserFormat(firstDayOfWeek.getDate(),firstDayOfWeek.getMonth(),firstDayOfWeek.getFullYear(),dateFormatStartRange)+" - "+constructDateUserFormat(lastDayOfWeek.getDate(),lastDayOfWeek.getMonth(),lastDayOfWeek.getFullYear(),dateFormatEndRange);
     if( ctlToPlaceValue2 != null )
      ctlToPlaceValue2.value = constructDateUserFormat(firstDayOfWeek.getDate(),firstDayOfWeek.getMonth(),firstDayOfWeek.getFullYear(),dateFormatParse)+ ";"+constructDateUserFormat(lastDayOfWeek.getDate(),lastDayOfWeek.getMonth(),lastDayOfWeek.getFullYear(),dateFormatParse);
    weekIsSelected = 0;
  } else if (yearIsSelected==1){
    ctlToPlaceValue.value = constructDateUserFormat(1,0,yearSelected,dateFormatStartRange)+" - "+constructDateUserFormat(31,11,yearSelected,dateFormatEndRange);
    if( ctlToPlaceValue2 != null )
      ctlToPlaceValue2.value =constructDateUserFormat(1,0,yearSelected,dateFormatParse)+";"+constructDateUserFormat(31,11,yearSelected,dateFormatParse);
    yearIsSelected = 0;
  } else if (quarterIsSelected==1){
    var startMonth = Math.floor(monthSelected / 3) * 3;
    var endDay = 30 + ((Math.floor(monthSelected / 3) + 1) % 3) % 2;
    ctlToPlaceValue.value = constructDateUserFormat(1, startMonth, yearSelected, dateFormatStartRange)+" - "+constructDateUserFormat(endDay, startMonth + 2, yearSelected, dateFormatEndRange);
    if( ctlToPlaceValue2 != null )
      ctlToPlaceValue2.value =constructDateUserFormat(1, startMonth, yearSelected, dateFormatParse)+";"+constructDateUserFormat(endDay, startMonth + 2, yearSelected, dateFormatParse);
    quarterIsSelected = 0;
  } else if (monthIsSelected==1){
      //ctlToPlaceValue.value = monthName[monthSelected]
      endDate  = new Date (yearSelected,monthSelected+1,1);
      endDate  = new Date (endDate.getTime() - 1000); // -1 seconds, switch one day back to the last day of previous month
      endDate.setHours(0, 0, 0, 0); // reinit to 00:00:00.00
    ctlToPlaceValue.value = constructDateUserFormat(1,monthSelected,yearSelected,dateFormatStartRange)+" - "+constructDateUserFormat(endDate.getDate(),endDate.getMonth(),endDate.getFullYear(),dateFormatEndRange);
      if( ctlToPlaceValue2 != null )
        ctlToPlaceValue2.value =constructDateUserFormat(1,monthSelected,yearSelected,dateFormatParse)+";"+constructDateUserFormat(endDate.getDate(),endDate.getMonth(),endDate.getFullYear(),dateFormatParse);
      monthIsSelected=0;
  } else {
      ctlToPlaceValue.value =  constructDate(dateSelected,monthSelected,yearSelected);
      // we postfix the resulting range with ;PC delimiter so that periodChooser knows the selection was done by popup-calendar, ugly workaround!
      if( ctlToPlaceValue2 != null )
        ctlToPlaceValue2.value =constructDateUserFormat(dateSelected,monthSelected,yearSelected,dateFormatParse)+";"+constructDateUserFormat(dateSelected,monthSelected,yearSelected,dateFormatParse)+";PC";
  }

  /* if input field contains time we need to store it*/
  /*if (typeof isTimeSpan != 'undefined' && isTimeSpan) {
    var from = ctlToPlaceValue.value.split(';')[0];
    if (from.indexOf(" ") > 0)
      var timePartOfDateFrom = from.split(" ")[1];
    else
      var timePartOfDateFrom = "00:00:00";
    if (ctlToPlaceValue.value.indexOf(';') > 0) {
      var to = ctlToPlaceValue.value.split(';')[1];
      if (to.indexOf(" ") > 0)
        var timePartOfDateTo = to.split(" ")[1];
      else
        var timePartOfDateTo = "23:59:59";
    }
  }*/

  //we postfix the resulting range with ;PC delimiter so that periodChooser knows the selection was done by popup-calendar
  if (typeof isTimeSpan != 'undefined' && isTimeSpan) {
    if (ctlToPlaceValue.value.indexOf(";") > 0)
      ctlToPlaceValue.value = ctlToPlaceValue.value.split(";")[0] + "T00:00:00"
        + ";"
        + ctlToPlaceValue.value.split(";")[1]
        + "T23:59:59;PC";
    else
      ctlToPlaceValue.value = ctlToPlaceValue.value + "T00:00:00";
  }
  hideCalendar();

  if (shouldFireChangeEventOnClose) {
    ctlToPlaceValue.onchange();
  }
}

/**
 * @ignore
 */
function StartDecMonth()
{
  intervalID1=setInterval("decMonth()",80);
}

/**
 * @ignore
 */
function StartIncMonth()
{
  intervalID1=setInterval("incMonth()",80);
}

/**
 * @ignore
 */
function incMonth () {
  monthSelected++;
  if (monthSelected>11) {
    monthSelected=0;
    yearSelected++;
  }
  bcdui.widget.periodChooser._constructCalendar();
}

/**
 * @ignore
 */
function decMonth () {
  monthSelected--;
  if (monthSelected<0) {
    monthSelected=11;
    yearSelected--;
  }
  bcdui.widget.periodChooser._constructCalendar();
}

/**
 * @ignore
 */
function constructMonth() {
  popDownYear();
  if (!monthConstructed) {
    sHTML =  "";
    for  (i=0; i<12;  i++) {
      sName =  monthName[i];
      if (i==monthSelected){
        sName =  "<font class=popupContraColor >" +  sName +  "</font>";
      }
      sHTML += "<tr><td class='popupSelectBox' id='m" + i + "' onmouseover='this.className=\"popupSelectBoxHover\"' onmouseout='this.className=\"popupSelectBox\"'>&nbsp;" + sName + "&nbsp;</td></tr>";
    }

    jQuery("#selectMonth table.popupSelectBox").off();
    jQuery("#selectMonth td.popupSelectBox").off();
    document.getElementById("selectMonth").innerHTML = "<table width=70 class='popupSelectBox' cellspacing=0>" +  sHTML +  "</table>";
    jQuery("#selectMonth table.popupSelectBox").on("mouseover", function() {clearTimeout(timeoutID1);});
    jQuery("#selectMonth table.popupSelectBox").on("mouseout", function() {
      clearTimeout(timeoutID1);
      timeoutID1=setTimeout(popDownMonth,100);
    });
    jQuery("#selectMonth td.popupSelectBox").on("click", function() {
      var i = jQuery(this).attr("id").substring(1);
      monthConstructed=false;
      monthSelected= parseInt(i, 10);
      bcdui.widget.periodChooser._constructCalendar();
      popDownMonth();
    });
    monthConstructed=true;
  }
}

/**
 * @ignore
 */
function popUpMonth() {
  constructMonth();
  crossMonthObj.left = document.getElementById("spanMonth").offsetLeft + 10 + "px";
  crossMonthObj.visibility = (dom||ie)? "visible"  : "show";

  hideElement( 'SELECT', document.getElementById("selectMonth") );
  hideElement( 'APPLET', document.getElementById("selectMonth") );
}

/**
 * @ignore
 */
function popDownMonth()  {
  crossMonthObj.visibility= "hidden";
}

/**
 * Year Pulldown
 * @ignore
 */
function incYear() {
  for  (i=0; i<7; i++){
    newYear  = (i+nStartingYear)+1;
    if (newYear==yearSelected)
    { txtYear =  "&nbsp;<font class=popupContraColor >" +  newYear +  "</font>&nbsp;" }
    else
    { txtYear =  "&nbsp;" + newYear + "&nbsp;" }
    document.getElementById("y"+i).innerHTML = txtYear;
  }
  nStartingYear ++;
  bShow=true
}

/**
 * @ignore
 */
function decYear() {
  for  (i=0; i<7; i++){
    newYear  = (i+nStartingYear)-1;
    if (newYear==yearSelected)
    { txtYear =  "&nbsp;<font class=popupContraColor >" +  newYear +  "</font>&nbsp;" }
    else
    { txtYear =  "&nbsp;" + newYear + "&nbsp;" }
    document.getElementById("y"+i).innerHTML = txtYear;
  }
  nStartingYear --;
  bShow=true
}

/**
 * @ignore
 */
function selectYear(nYear) {
  yearSelected=parseInt(nYear+nStartingYear);
  yearConstructed=false;
  bcdui.widget.periodChooser._constructCalendar();
  popDownYear();
}

/**
 * @ignore
 */
function constructYear() {
  popDownMonth();
  sHTML =  "";
  if (!yearConstructed) {

    sHTML =  "<tr><td class='popupSelectBox' id='yearDown' align='center'>-</td></tr>";

    j =  0;
    nStartingYear =  yearSelected-3;
    for  (i=(yearSelected-3); i<=(yearSelected+3); i++) {
      sName =  i;
      if (i==yearSelected){
        sName =  "<font class=popupContraColor >" +  sName +  "</font>"
      }

      sHTML += "<tr><td class='popupSelectBox' id='y" + j + "'>&nbsp;" + sName + "&nbsp;</td></tr>";
      j ++;
    }

    sHTML += "<tr><td class='popupSelectBox' id='yearUp' align='center'>+</td></tr>";

    jQuery("#yearUp").off();
    jQuery("#yearDown").off();
    jQuery("#selectYear td.popupSelectBox").off();
    jQuery("#selectYear table.popupSelectBox").off();
    document.getElementById("selectYear").innerHTML  = "<table width=44 class='popupSelectBox' cellspacing=0>"  + sHTML  + "</table>";
    jQuery("#selectYear table.popupSelectBox").on("mouseover", function() {clearTimeout(timeoutID2);});
    jQuery("#selectYear table.popupSelectBox").on("mouseout", function() {clearTimeout(timeoutID2);timeoutID2=setTimeout(popDownYear,100);});
    
    jQuery("#yearUp").on("mousedown", function() {clearInterval(intervalID2);intervalID2=setInterval(incYear ,30);});
    jQuery("#yearUp").on("mouseup", function() {clearInterval(intervalID2)});
    jQuery("#yearDown").on("mousedown", function() {clearInterval(intervalID1);intervalID1=setInterval(decYear ,30);});
    jQuery("#yearDown").on("mouseup", function() {clearInterval(intervalID1);});

    jQuery("#selectYear td.popupSelectBox").on("mouseover", function() {jQuery(this).attr("class", "popupSelectBoxHover");});
    jQuery("#selectYear td.popupSelectBox").on("mouseout", function() {
      var id = jQuery(this).attr("id");
      if (id == "yearDown")
        clearInterval(intervalID1);
      else if (id =="yearUp")
        clearInterval(intervalID2);
      jQuery(this).attr("class", "popupSelectBox");
    });
    jQuery("#selectYear td.popupSelectBox").on("click", function() {
      var id = jQuery(this).attr("id");
      if (id != "yearDown" && id !="yearUp") {
        var j = id.substring(1);
        selectYear(parseInt(j, 10));
      }
    });

    yearConstructed  = true
  }
}

/**
 * @ignore
 */
function popDownYear() {
  clearInterval(intervalID1);
  clearTimeout(timeoutID1);
  clearInterval(intervalID2);
  clearTimeout(timeoutID2);
  crossYearObj.visibility= "hidden"
}

/**
 * @ignore
 */
function popUpYear() {
  constructYear();
  crossYearObj.left = document.getElementById("spanYear").offsetLeft + 10 + "px";
  crossYearObj.visibility  = (dom||ie)? "visible" : "show";
}

/**
 * @ignore
 */
 function WeekNbr(n) {
    // Algorithm used:
    // From Klaus Tondering's Calendar document (The Authority/Guru)
    // hhtp://www.tondering.dk/claus/calendar.html
    // a = (14-month) / 12
    // y = year + 4800 - a
    // m = month + 12a - 3
    // J = day + (153m + 2) / 5 + 365y + y / 4 - y / 100 + y / 400 - 32045
    // d4 = (J + 31741 - (J mod 7)) mod 146097 mod 36524 mod 1461
    // L = d4 / 1460
    // d1 = ((d4 - L) mod 365) + L
    // WeekNumber = d1 / 7 + 1

    year = n.getFullYear();
    month = n.getMonth() + 1;
    if (startAt == 0) {
       day = n.getDate() + 1;
    }
    else {
       day = n.getDate();
    }

    a = Math.floor((14-month) / 12);
    y = year + 4800 - a;
    m = month + 12 * a - 3;
    b = Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400);
    J = day + Math.floor((153 * m + 2) / 5) + 365 * y + b - 32045;
    d4 = (((J + 31741 - (J % 7)) % 146097) % 36524) % 1461;
    L = Math.floor(d4 / 1460);
    d1 = ((d4 - L) % 365) + L;
    week = Math.floor(d1/7) + 1;

    return week;
 }

/**
 * @private
 */
bcdui.widget.periodChooser._constructCalendar = function(args) {

  if (args) {
    if (typeof args.monthSelected != "undefined")
      monthSelected = args.monthSelected;
    if (typeof args.yearSelected != "undefined")
      yearSelected = args.yearSelected;
  }

  var isMonthWithinSelectableRange = true;
  if (firstSelectableDay > 0) {
    var firstDateOfMonth = new Date(yearSelected, monthSelected, 1).getTime();
    var lastDateOfMonth = new Date(yearSelected, monthSelected + 1, 1).getTime() - 86400000;
    isMonthWithinSelectableRange =
      (
        firstSelectableDay <= firstDateOfMonth && firstDateOfMonth <= lastSelectableDay &&
        firstSelectableDay <= lastDateOfMonth && lastDateOfMonth <= lastSelectableDay
      );
  }

  var yearSelection = isYearSelectable ? ("<a class='calendarYearSelection' href='javascript:bcdui.widget.periodChooser._closeCalendar({yearIsSelected:1});'>" + yearSelected + "</a>") : "";
  var quarterSelection = isQuarterSelectable ? ("<a class='calendarQuarterSelection' href='javascript:bcdui.widget.periodChooser._closeCalendar({quarterIsSelected:1});'>Q" + (Math.floor(monthSelected / 3) + 1) + "</a>") : "";

  if (isMonthSelectable && isMonthWithinSelectableRange){
    selectCurrentMonth = "<a class='calendarMonthSelection' href='javascript:bcdui.widget.periodChooser._closeCalendar({monthIsSelected:1});'>"+ monthName[monthSelected].substring(0,3)+"</a>&nbsp;" + yearSelection + "&nbsp;" + quarterSelection + "&nbsp;"
  }else{
    selectCurrentMonth = monthName[monthSelected].substring(0,3) + "&nbsp;" + yearSelection + "&nbsp;" + quarterSelection + "&nbsp;"
  }

  if (showToday==1)
  {
    document.getElementById("lblToday").innerHTML =selectCurrentMonth+todayString + " <a onmousemove='window.status=\""+gotoString+"\"' onmouseout='window.status=\"\"' title='"+gotoString+ /*"' style='"+styleAnchor+*/"' href='javascript:bcdui.widget.periodChooser._constructCalendar({monthSelected : " + monthNow + ", yearSelected : " + yearNow+ "});'>"+dayName[(today.getDay()-startAt==-1)?6:(today.getDay()-startAt)]+", " + dateNow + " " + monthName[monthNow].substring(0,3)  + "  " +  yearNow  + " Week " +(WeekNbr(new Date(yearNow,monthNow,dateNow)))+"</a>";
  }


  var aNumDays = Array (31,0,31,30,31,30,31,31,30,31,30,31);

  var dateMessage;
  var startDate =  new  Date (yearSelected,monthSelected,1);
  var endDate;

  if (monthSelected==1)
  {
    endDate  = new Date (yearSelected,monthSelected+1,1);
    endDate  = new Date (endDate  - (24*60*60*1000));
    numDaysInMonth = endDate.getDate()
  }
  else
  {
    numDaysInMonth = aNumDays[monthSelected];
  }

  datePointer  = 0;
  dayPointer = startDate.getDay() - startAt;

  if (dayPointer<0)
  {
    dayPointer = 6
  }

  sHTML =  "<table class='popupContentTable' border=0 style='font-family:verdana;font-size:10px;'><tr>";

  if (showWeekNumber==1)
  {
    sHTML += "<td width=27><b>" + weekString + "</b></td><td width=1 rowspan=7 bgcolor='#d0d0d0' style='padding:0px'>" + (showPopCalendarImages ? "<img src='"+imgDir+"caldivider.gif' width=1></img>" :"") + "</td>"
  }

  for  (i=0; i<7; i++)  {
    sHTML += "<td width='27' align='right'><B>"+ dayName[i]+"</B></td>"
  }
  sHTML +="</tr><tr>";

  if (showWeekNumber==1)
  {
    //firstDayOfWeek = datePointer +1
    //lastDayOfWeek = datePointer +1+7
    //selectedWeek = 1
    //sHTML += "<td align=right onmouseover='this.style.backgroundColor=\"#FFCC99\"' onmouseout='this.style.backgroundColor=\"\"'>" + "<a href='javascript:currentWeek="+(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+";weekIsSelected = 1; firstDay = "+ datePointer+";bcdui.widget.periodChooser._closeCalendar();'>" +WeekNbr(startDate) + "</a>"+ "&nbsp;</td>"
    var isWeekWithinSelectableRange = true;
    if (firstSelectableDay > 0) {
        var firstDateOfWeek = new Date(yearSelected, monthSelected, datePointer).getTime();
        var lastDateOfWeek = firstDateOfWeek + 86400000 * 6;
        isWeekWithinSelectableRange =
          (
            firstSelectableDay <= firstDateOfWeek && firstDateOfWeek <= lastSelectableDay &&
            firstSelectableDay <= lastDateOfWeek && lastDateOfWeek <= lastSelectableDay
          );
    }
    if (isWeekSelectable && isWeekWithinSelectableRange){
      sHTML += "<td class='weekListSelection' align=right onmouseover='this.className=\"weekListSelectionHover\"' onmouseout='this.className=\"weekListSelection\"'>" + "<a href='javascript:bcdui.widget.periodChooser._closeCalendar({currentweek:"+(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+", weekIsSelected: 1, firstDay : "+ datePointer+"});'>" +(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+ "</a>"+ "&nbsp;</td>"
    }else{
      sHTML += "<td class='weekListSelection' align=right>" +(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+ "&nbsp;</td>"
    }
  }

  for  ( var i=1; i<=dayPointer;i++ )
  {
    sHTML += "<td>&nbsp;</td>"
  }

  for  ( datePointer=1; datePointer<=numDaysInMonth; datePointer++ )
  {
    dayPointer++;
    sHTML += "<td align=right>";
    sStyle=styleAnchor;
    if ((datePointer==odateSelected) &&  (monthSelected==omonthSelected)  && (yearSelected==oyearSelected))
    { sStyle+=styleLightBorder }

    sHint = "";
    for (k=0;k<HolidaysCounter;k++)
    {
      if ((parseInt(Holidays[k].d)==datePointer)&&(parseInt(Holidays[k].m)==(monthSelected+1)))
      {
        if ((parseInt(Holidays[k].y)==0)||((parseInt(Holidays[k].y)==yearSelected)&&(parseInt(Holidays[k].y)!=0)))
        {
          sStyle+="background-color:#FFDDDD;";
          sHint+=sHint==""?Holidays[k].desc:"\n"+Holidays[k].desc
        }
      }
    }

    var regexp= /\"/g;
    sHint=sHint.replace(regexp,"&quot;");

    dateMessage = "onmousemove='window.status=\""+selectDateMessage.replace("[date]",constructDate(datePointer,monthSelected,yearSelected))+"\"' onmouseout='window.status=\"\"' ";
    var noDateMessage = "onmousemove='window.status=\"Date selection not possible\"' onmouseout='window.status=\"\"' ";

    if (firstSelectableDay > 0 && (firstSelectableDay > (currentDate = new Date(yearSelected, monthSelected, datePointer).getTime()) || lastSelectableDay < currentDate)) {
      sHTML += "<span style='"+sStyle+";cursor: default'>&nbsp;<font style=\"font-style: italic; font-weight: bold; color: #C0C0C0\">" + datePointer + "</font>&nbsp;</span>"
    } else
    if ((datePointer==dateNow)&&(monthSelected==monthNow)&&(yearSelected==yearNow))
    { sHTML += "<b><a class='popupDay popupToday " + (isDaySelectable ? "" : "popupNoDay") + "' "+(isDaySelectable ? dateMessage : noDateMessage)+" title=\"" + sHint + "\" "+popUpCalendar_getDateHref(datePointer)+">&nbsp;" + datePointer + "&nbsp;</a></b>"}
    else if  (dayPointer % 7 == (startAt * -1)+1)
    { sHTML += "<a class='popupDay popupSunday " + (isDaySelectable ? "" : "popupNoDay") + "' "+(isDaySelectable ? dateMessage : noDateMessage)+" title=\"" + sHint + "\" "+popUpCalendar_getDateHref(datePointer)+">&nbsp;" + datePointer + "&nbsp;</a>" }
    else
    { sHTML += "<a class='popupDay " + (isDaySelectable ? "" : "popupNoDay") + "' "+(isDaySelectable ? dateMessage : noDateMessage)+" title=\"" + sHint + "\" "+popUpCalendar_getDateHref(datePointer)+">&nbsp;" + datePointer + "&nbsp;</a>" }

    sHTML += "";
    if ((dayPointer+startAt) % 7 == startAt) {
      sHTML += "</tr><tr>";
      if ((showWeekNumber==1)&&(datePointer<numDaysInMonth))
      {
        //firstDayOfWeek = datePointer +1
        //lastDayOfWeek = datePointer +1+7
        //selectedWeek = 1
        var isWeekWithinSelectableRange = true;
        if (firstSelectableDay > 0) {
            var firstDateOfWeek = currentDate + 86400000;
            var lastDateOfWeek = firstDateOfWeek + 86400000 * 6;
            isWeekWithinSelectableRange =
              (
                firstSelectableDay <= firstDateOfWeek && firstDateOfWeek <= lastSelectableDay &&
                firstSelectableDay <= lastDateOfWeek && lastDateOfWeek <= lastSelectableDay
              );
        }
        if (isWeekSelectable && isWeekWithinSelectableRange){
            sHTML += "<td class='weekListSelection' align=right onmouseover='this.className=\"weekListSelectionHover\"' onmouseout='this.className=\"weekListSelection\"'>" + "<a href='javascript:bcdui.widget.periodChooser._closeCalendar({currentweek: "+(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+", weekIsSelected : 1, firstDay : "+ datePointer+"});'>" +(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+ "</a>"+ "&nbsp;</td>"
          }else{
            sHTML += "<td class='weekListSelection' align=right>" +(WeekNbr(new Date(yearSelected,monthSelected,datePointer+1)))+ "&nbsp;</td>"
          }


      }
    }
  }

  document.getElementById("popCalContent").innerHTML   = sHTML;
  document.getElementById("spanMonth").innerHTML = "&nbsp;" +  monthName[monthSelected] + "&nbsp;" + (showPopCalendarImages ? "<IMG id='changeMonth' SRC='"+imgDir+imgsrc[0]+"' WIDTH='12' HEIGHT='10' BORDER=0></IMG>" : "") + "<SPAN  " + utf8CharStyle + " class='changeMonth'></SPAN>";
  document.getElementById("spanYear").innerHTML =  "&nbsp;" + yearSelected  + "&nbsp;" + (showPopCalendarImages ? "<IMG id='changeYear' SRC='"+imgDir+imgsrc[0]+"' WIDTH='12' HEIGHT='10' BORDER=0></IMG>" : "") + "<SPAN " + utf8CharStyle + " class='changeYear'></SPAN>"
}

/**
 * helper function used to retrieve href content for date anchor,
 * decides whether to make day selection available or not
 * @ignore
 */
function popUpCalendar_getDateHref(datePointer){
  return isDaySelectable?"href='javascript:bcdui.widget.periodChooser._closeCalendar({dateSelected :"+datePointer+"});'":"";
}

/**
 * @ignore
 */
bcdui.widget.periodChooser.popUpCalendar = function(ctl,ctl2,out2,format,startFormat, endFormat,parseFormat,isRange,_firstSelDate,_lastSelDate,_isDaySelectable, _isWeekSelectable, _isMonthSelectable, outputSpanId, _isYearSelectable, _isQuarterSelectable, _isTimeSpan ) {
  // Legende
  // ctl      - calendar  - point at which the calendar will be shown
  // ctl2      - visible field, result will be shown here as :
  //               single day : format
  //               week: 'Week <nr> '+startFormat+' '+endFormat
  //               month: '<monthname>'
  // out2      - parseable field, result will be shown here as parseFormat+';'+parseFormat+';PC' as identifier (ugly workaround) so that receiver knows the date was provided by calendar
  // format    - for ctl2 in case of no range
  // startFormat - for ctl2 in case of range
  // endFormat    - for ctl2 in case of range
  // parseFormat - for out2
  // isRange       - ability for range-select
  // _firstSelDate - The first date that can be selected. This is a string in the format "yyyy-MM-dd".
  // _lastSelDate - The last date to be selected

  //alert('new');
  var  leftpos=0;
  var  toppos=0;
  var timePartOfDateFrom = "";
  var timePartOfDateTo = "";

  // set default value of Calendar
  if( out2 != null && typeof ctl.value != "undefined") {
    out2.value = ctl.value + ';' + ctl.value;
  }
  if (typeof _isTimeSpan !== undefined && _isTimeSpan) {
    isTimeSpan = true;
  }
  if (typeof _isDaySelectable == "undefined" || _isDaySelectable == null || _isDaySelectable == true || _isDaySelectable == "true") {
    isDaySelectable = true;
  } else {
    isDaySelectable = false;
  }

  if(isRange == "false" || isRange == false) {
    isWeekSelectable = false;
    isMonthSelectable = false;
    isQuarterSelectable = false;
    isYearSelectable = false;
  } else {
    if (typeof _isWeekSelectable == "undefined" || _isWeekSelectable == null || _isWeekSelectable == true || _isWeekSelectable == "true") {
      isWeekSelectable = true;
    } else {
      isWeekSelectable = false;
    }

    if (typeof _isMonthSelectable == "undefined" || _isMonthSelectable == null || _isMonthSelectable == true || _isMonthSelectable == "true") {
      isMonthSelectable = true;
    } else {
      isMonthSelectable = false;
    }

    if (typeof _isYearSelectable == "undefined" || _isYearSelectable == null || _isYearSelectable == false || _isYearSelectable == "false") {
      isYearSelectable = false;
    } else {
      isYearSelectable = true;
    }

    if (typeof _isQuarterSelectable == "undefined" || _isQuarterSelectable == null || _isQuarterSelectable == false || _isQuarterSelectable == "false") {
      isQuarterSelectable = false;
    } else {
      isQuarterSelectable = true;
    }
  }

  if (typeof _firstSelDate == 'undefined' || typeof _lastSelDate == 'undefined' ||
      _firstSelDate == null || _lastSelDate == null || _firstSelDate == "" || _lastSelDate == "") {
    firstSelectableDay = 0;
    lastSelectableDay = 0;
  } else {
    firstSelectableDay = new Date(
        parseInt(_firstSelDate.substring(0, 4), 10),
        parseInt(_firstSelDate.substring(5, 7), 10) - 1,
        parseInt(_firstSelDate.substring(8, 10), 10));
    lastSelectableDay = new Date(
        parseInt(_lastSelDate.substring(0, 4), 10),
        parseInt(_lastSelDate.substring(5, 7), 10) - 1,
        parseInt(_lastSelDate.substring(8, 10), 10));
  }

  if (bPageLoaded)
  {

    // If there is already a calendar open hide it
    if ( crossobj.visibility !=  "hidden" ) {
      hideCalendar();
      // If calendar belongs to the same HTML element we just want to hide it. Otherwise
      // we should continue because we want the calendar to be shown under the new control.
      if (ctlNow == ctl) return;
    }

    if ( crossobj.visibility ==  "hidden" ) {
      _initPopupCalendar();
      ctlToPlaceValue  = ctl2;
      ctlToPlaceValue2= out2;
      if(bcdui.widget.periodChooser._bcdui_i18n_suported) {
        var dateFormatNode = i18n.dataDoc.selectSingleNode(BCDUI_DATE_PATTERN);
        if(dateFormatNode != null && dateFormatNode.text != "") {
          dateFormat =  dateFormatNode.text.toLowerCase();
          parseFormat =  dateFormatNode.text.toLowerCase();
          startFormat =  dateFormatNode.text.toLowerCase();
          endFormat = dateFormatNode.text.toLowerCase();
        }
        else {
          dateFormat=format;
        }
      }
      else {
        dateFormat=format;
      }
      dateFormatStartRange=startFormat;
      dateFormatEndRange=endFormat;
      dateFormatParse=parseFormat;

      formatChar = " ";
      aFormat  = dateFormat.split(formatChar);
      if (aFormat.length<3)
      {
        formatChar = "/";
        aFormat  = dateFormat.split(formatChar);
        if (aFormat.length<3)
        {
          formatChar = ".";
          aFormat  = dateFormat.split(formatChar);
          if (aFormat.length<3)
          {
            formatChar = "-";
            aFormat  = dateFormat.split(formatChar);
            if (aFormat.length<3)
            {
              formatChar = "\\";
                aFormat  = dateFormat.split(formatChar);
                if (aFormat.length<3)
                {
                  formatChar=""
                }
              // invalid date  format
            }
          }
        }
      }

      tokensChanged =  0;
      if ( formatChar  != "" )
      {
        // use user's date
        aData =  ctl2.value.split(formatChar);
        for  (i=0;i<3;i++)
        {
          if ((aFormat[i]=="d") || (aFormat[i]=="dd"))
          {
            dateSelected = parseInt(aData[i], 10);
            tokensChanged ++
          }
          else if  ((aFormat[i]=="m") || (aFormat[i]=="mm"))
          {
            monthSelected =  parseInt(aData[i], 10) - 1;
            tokensChanged ++
          }
          else if  (aFormat[i]=="yyyy")
          {
            yearSelected = parseInt(aData[i], 10);
            tokensChanged ++
          }
          else if  (aFormat[i]=="mmm")
          {
            for  (j=0; j<12;  j++)
            {
              if (aData[i]==monthName[j])
              {
                monthSelected=j;
                tokensChanged ++
              }
            }
          }
          else if  (aFormat[i]=="mmmm")
          {
            for  (j=0; j<12;  j++)
            {
              if (aData[i]==monthName2[j])
              {
                monthSelected=j;
                tokensChanged ++
              }
            }
          }
        }
      }

      if (
        (tokensChanged!=3)
        ||
        isNaN(dateSelected) || dateSelected <= 0
        ||
        isNaN(monthSelected) || monthSelected >= 12 || monthSelected < 0
        ||
        isNaN(yearSelected) || yearSelected >= 2100)
      {
        if((typeof firstSelectableDay) == "object"){
          dateSelected = firstSelectableDay.getDate();
          monthSelected =  firstSelectableDay.getMonth();
          yearSelected = firstSelectableDay.getFullYear();
        }
        else{
          dateSelected = dateNow;
          monthSelected =  monthNow;
          yearSelected = yearNow
        }
      }

      odateSelected=dateSelected;
      omonthSelected=monthSelected;
      oyearSelected=yearSelected;

      var p = jQuery(ctl).offset();
      var delta = {top: 0, left: 0}, parent = null;

      var calendar = document.getElementById('bcdCalendar');
      if (bcdui._migPjs._$(calendar).css('position') == 'absolute') {
        parent = bcdui._migPjs._$(calendar).offsetParent().get(0);
        delta = jQuery(parent).offset();
      }

      if (parent == document.body) {
        delta.left -= document.body.offsetLeft;
        delta.top -= document.body.offsetTop;
      }

      var leftPosEnd = fixedX == -1 ? p.left - delta.left : fixedX;
      var topPosEnd = fixedY == -1 ? p.top - delta.top + ctl.offsetHeight + 2 : fixedY;
      // avoid that calendar Div appears below available frame height
      var calendarHeight = getCalendarHeight();
      if ((topPosEnd + calendarHeight) > jQuery(window).innerHeight()) {
        topPosEnd -= calendarHeight + ctl.offsetHeight + 2;
      }
      // avoid that calendar Div appears righter available frame width
      var calWidth = getCalendarWidth();
      if ((leftPosEnd + calWidth + 20) > jQuery(window).innerWidth()) {
        leftPosEnd -= calWidth;
      }

      crossobj.left = leftPosEnd + "px";
      crossobj.top = topPosEnd + "px";
      bcdui.widget.periodChooser._constructCalendar (1, monthSelected, yearSelected,isWeekSelectable);
      crossobj.visibility=(dom||ie)? "visible" : "show";

      /*
      hideElement( 'SELECT', document.getElementById("bcdCalendar") );
      hideElement( 'APPLET', document.getElementById("bcdCalendar") );
      */
//      hideElement( 'SELECT', document.getElementById("bcdCalendar"), true );
//      hideElement( 'APPLET', document.getElementById("bcdCalendar"), true );

      bShow = true;
    }

    ctlNow = ctl
  }

  isFirstAppear = false;
  
  // ensure visibility of calendar (might got hidden, e.g. grid date cell edit ending)
  if( jQuery("#bcdCalendar").parent()[0].nodeName != "BODY" )
    jQuery("body").prepend(jQuery("#bcdCalendar")); // moves calendar div from head to body
  jQuery("#bcdCalendar").show();
}

document.onkeypress = function hidecal1 () {
  if (typeof window.event != "undefined" && event.keyCode==27)
  {
    hideCalendar()
  }
}
document.onclick = function hidecal2 () {
  if (!bShow)
  {
    hideCalendar()
  }
  bShow = false
}

//if(ie)
//{
//  init(true);
//}
//else
//{
//  window.onload=init(true);
//}

/**
 * @ignore
 */
function constructDateUserFormat(d,m,y,uf)
  {
//  alert("d:"  +d + " m:" + m + " y:" + y + " uf:" + uf);
    sTmp = uf;
    sTmp = sTmp.replace  ("dd","<e>");
    sTmp = sTmp.replace  ("d","<d>");
    sTmp = sTmp.replace  ("<e>",padZero(d));
    sTmp = sTmp.replace  ("<d>",d);
    sTmp = sTmp.replace  ("mmmm","<p>");
    sTmp = sTmp.replace  ("mmm","<o>");
    sTmp = sTmp.replace  ("mm","<n>");
    sTmp = sTmp.replace  ("m","<m>");
    sTmp = sTmp.replace  ("<m>",m+1);
    sTmp = sTmp.replace  ("<n>",padZero(m+1));
    sTmp = sTmp.replace  ("<o>",monthName[m]);
    sTmp = sTmp.replace  ("<p>",monthName2[m]);
    sTmp = sTmp.replace  ("yyyy",y);
    var resut_tmp = sTmp.replace ("yy",padZero(y%100));
//    alert("result_tmp:" + resut_tmp);
    return resut_tmp;
  }
//methods for date time chooser
//these functions are taken from the "tourReportParams.jsp"
/**
 * @ignore
 */
  function syncDateRangeFields(FromDateRangeHasChanged) {

    var fromDateRangeValue = document.getElementById("fromDateRange").value;
    var semicolon1 = fromDateRangeValue.indexOf(";");
    var fromDateStr1 = fromDateRangeValue.substring(0, semicolon1);
    var toDateStr1 = fromDateRangeValue.substring(semicolon1 + 1);

    var toDateRangeValue = document.getElementById("toDateRange").value;
    var semicolon2 = toDateRangeValue.indexOf(";");
    var fromDateStr2 = toDateRangeValue.substring(0, semicolon2);
    var toDateStr2 = toDateRangeValue.substring(semicolon2 + 1);

    var result = "";

    if (FromDateRangeHasChanged) {
      if (fromDateStr1 == toDateStr1) {
        // We have just selected a day so we need to get the "from" field from
        // "dateRange" and the "to" field from the "toDateRange"
        result = fromDateStr1 + ";" + toDateStr2;
      } else {
        // Both fields have changed so we just overwrite the "toDateRange"
        result = fromDateRangeValue;
      }
    } else {
      if (fromDateStr2 == toDateStr2) {
        // We have just selected a day so we need to get the "from" field from
        // "dateRange" and the "to" field from the "toDateRange"
        result = fromDateStr1 + ";" + toDateStr2;
      } else {
        // Both fields have changed so we just overwrite the "dateRange"
        result = toDateRangeValue;
      }
    }

    document.getElementById("fromDateRange").value = result;
    document.getElementById("toDateRange").value = result;
  }

  /**
   * @ignore
   */
    function computeDateButtonCaptions() {
        var fromDateRangeValue = document.getElementById("fromDateRange").value;
        var semicolon = fromDateRangeValue.indexOf(";");
        var fromDateStr = fromDateRangeValue.substring(0, semicolon);
        var toDateStr = fromDateRangeValue.substring(semicolon + 1);
        replaceButtonText(document.getElementById("fromDateButton"),getLabel(fromDateStr));
        replaceButtonText(document.getElementById("toDateButton"),getLabel(toDateStr));
  }

  // Constructs a label for a date button like "Sep 15" from a date string like "2004-09-15".
    /**
     * @ignore
     */
   function getLabel(dateStr) {
        var monthNames = new Array();
        monthNames["01"] = "Jan";
        monthNames["02"] = "Feb";
        monthNames["03"] = "Mar";
        monthNames["04"] = "Apr";
        monthNames["05"] = "May";
        monthNames["06"] = "Jun";
        monthNames["07"] = "Jul";
        monthNames["08"] = "Aug";
        monthNames["09"] = "Sep";
        monthNames["10"] = "Oct";
        monthNames["11"] = "Nov";
        monthNames["12"] = "Dec";
        return dateStr.substr(8,2) + " " + monthNames[dateStr.substr(5,2)];
    }

   /**
    * @ignore
    */
    function replaceButtonText(button, text){
     if (button) {
       if (button.childNodes[0]) {
         button.childNodes[0].nodeValue=text;
       } else if (button.value) {
         button.value=text;
       } else { //if (button.innerHTML)
         button.innerHTML=text;
       }
     }
  }


/**
 * @ignore
 */
function getCalendarHeight()
{
  // thus 1. calendar appear has always
  // about 36(IE) or 56(FireFox) px height
  if( isFirstAppear == true)
    return defCalendarHeight;

  if( crossobj.offsetHeight)
    return crossobj.offsetHeight;

  var calDiv = document.getElementById('bcdCalendar');
  return calDiv.offsetHeight;
}

/**
 * @ignore
 */
function getCalendarWidth()
{
  // thus 1. calendar appear has always
  // about 36(IE) or 56(FireFox) px height
  if( isFirstAppear == true)
    return defCalendarWidth;

  if( crossobj.offsetWidth)
    return crossobj.offsetWidth;

  var calDiv = document.getElementById('bcdCalendar');
  return calDiv.offsetWidth;
}


//popupcalendar init
_initPopupCalendar();

}());
