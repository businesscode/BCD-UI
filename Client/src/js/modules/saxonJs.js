export function loadSaxonJS() {
  return new Promise((resolve, reject) => {
    if (window.SaxonJS) return resolve(window.SaxonJS);
 
    const script = document.createElement('script');
    script.src = bcdui.contextPath + '/bcdui/js/3rdParty/SaxonJS2.js';
    script.onload = () => resolve(window.SaxonJS);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
