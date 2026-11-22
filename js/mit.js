//GLOBAL VARIABILES
var cc_mit_tracking = "cc_mit_tracking";

// Get the modal
var modal;

// Get the <span> element that closes the modal
var span; 






//cookies

createCookie = function(cname, cvalue) {
var dt, expires;
dt = new Date();
dt.setTime(dt.getTime()+(180*24*60*60*1000));
expires = "; expires="+dt.toGMTString();
document.cookie = cname+"="+cvalue+expires+'; domain=mammaintherapy.it';
}



function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function deleteCookies(){
	
			createCookie(cc_mit_tracking,"no");
			location.reload();
	/*
	 if( getCookie( cc_mit_tracking ) ) {
		 
	document.cookie = cc_mit_tracking + "=no"  + ";" + "expires=Thu, 01 Jan 1970 00:00:01 GMT" + ";domain=mammaintherapy.it";
	}else{
		createCookie(cc_mit_tracking,"no");
			location.reload();
	}
	*/
}

function isShowBanner(){
	
	let user = getCookie(cc_mit_tracking);
	if (user != "") {
		
		if(user=="yes" || user=="no" )
			return false;
		}
	
	return true;
	
}

function checkCookies(){
	
	let user = getCookie(cc_mit_tracking);
	if (user != "") {
		
		if(user=="yes" )
			return true;
		}
	
	return false;
	
}

function acceptAll(){
	createCookie(cc_mit_tracking,"yes");
	location.reload();
}

function showBanner(){
	//Create the element using the createElement method.
var myDiv = document.createElement("div");

//Set its unique ID.
myDiv.id = 'banner_wrapper';



	htmlBanner=
	 '<div id="mdl-cookie" class="modal-content">'+
    '<div class="modal-header">'+
    '  <span class="close">&times;</span>'+
    '  <h2>Mamma in therapy - Informativa</h2>'+
   ' </div>'+
   ' <div class="modal-body">'+
   '  <p>Questo sito fa uso di cookie, anche di terze parti, per raccogliere informazioni statistiche sulla navigazione del sito </p>'+
   '   <p> Per maggiori informazioni sull&apos;uso dei cookie, visualizza l’informativa <a href="https://blog.mammaintherapy.it/p/privacy-policy-semplificata.html" title="Privacy Policy."> Privacy Policy.</a></p>'+
      ' <p> Chiudendo questa finestra, continuerai la navigazione senza l&apos;uso dei cookie ad esclusione di quelli strettamente necessari.</p>'+
   '   <button type="button"  class="button" onclick="acceptAll();">Accetta tutti</button>'+
   ' </div>'+
   ' <div class="modal-footer">'+
   ' </div>'+
  '</div>'+
'</div>';

//Add your content to the DIV
myDiv.innerHTML = htmlBanner;

//Finally, append the element to the HTML body
//document.body.appendChild(myDiv);

banner_container = document.getElementById("banner_container");

if(banner_container)
	banner_container.insertBefore(myDiv,banner_container.firstChild);
else
	document.body.insertBefore(myDiv,document.body.firstChild);

    modal = document.getElementById("mdl-cookie");
    // Get the <span> element that closes the modal
	span = document.getElementsByClassName("close")[0];
	
	//Chiusura modale
	span.onclick = function() {
		deleteCookies();
		modal.style.display = "none";
	}
	
	
// Get the <span> element that closes the modal
span = document.getElementsByClassName("close")[0];

	 modal.style.display = "block";
	 //modal.style.display = "flex";
}

// analytics - Google Analytics 4 (gtag.js)

// Measurement ID della proprieta GA4 di mammaintherapy.it
var GA4_MEASUREMENT_ID = "G-ZRSE0MBL8C";

// camelCase -> snake_case: GA4 accetta solo lettere, numeri e underscore
function ga4Snake(s){
	return String(s || "")
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/[^A-Za-z0-9_]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "")
		.toLowerCase();
}

// Nome evento GA4 a partire dalla vecchia coppia categoria/azione di UA.
// "game" + "gameOver" -> "game_over" (il prefisso non si raddoppia),
// "link" + "goToBlog" -> "link_go_to_blog".
function ga4EventName(category, action){
	var cat = ga4Snake(category);
	var name = ga4Snake(action);
	if(!name) name = cat;
	if(cat && name !== cat && name.indexOf(cat + "_") !== 0) name = cat + "_" + name;
	if(/^[0-9]/.test(name)) name = "e_" + name;
	return name.substring(0, 40);
}

function gaSendEvent(category, action, label){
	if(!checkCookies()) return;
	if(typeof window.gtag !== "function") return;

	var params = { event_category: category, event_action: action };
	if(label !== undefined && label !== null && label !== ""){
		params.event_label = String(label);
		if(!isNaN(parseFloat(label)) && isFinite(label)) params.value = Number(label);
	}

	window.gtag("event", ga4EventName(category, action), params);
}

function gaInit(){
	if(!checkCookies()) return;
	if(!GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID.indexOf("G-") !== 0 || GA4_MEASUREMENT_ID === "G-XXXXXXXXXX"){
		console.warn("ga4 - Measurement ID non configurato: nessun dato inviato");
		return;
	}

	window.dataLayer = window.dataLayer || [];
	window.gtag = function(){ window.dataLayer.push(arguments); };

	var s = document.createElement("script");
	s.async = true;
	s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_MEASUREMENT_ID);
	document.getElementsByTagName("script")[0].parentNode.appendChild(s);

	window.gtag("js", new Date());
	window.gtag("config", GA4_MEASUREMENT_ID);
	console.log("ga4 - init");
}


document.addEventListener("DOMContentLoaded", function(event) { 
    console.log("Page Ready!");

if(isShowBanner()){
	showBanner();
}else{
	gaInit();
}

    console.log("Go!");


});



