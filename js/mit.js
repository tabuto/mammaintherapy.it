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

// analytics

function gaSendEvent(category,action,label){
	if(checkCookies()){
		ga('send', {
		  hitType: 'event',
		  eventCategory: category,
		  eventAction: action,
		  eventLabel: label
		});
	}
}

function gaInit(){
	if(checkCookies()){
		(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

		ga('create', 'UA-219081934-1', 'auto');
		ga('send', 'pageview');
		console.log("ga - init");
	}
	
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



