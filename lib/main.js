var { setInterval, clearInterval } = require("sdk/timers");
var notifications = require("sdk/notifications");
var Request = require("sdk/request").Request;
var preferences = require("sdk/simple-prefs").prefs;
var self = require("sdk/self");
var tabs = require("sdk/tabs");
var hash = require("./md5.js");
var login = require("./login.js");
var OK = false;          
var sessionID = "";
var nowPlayingURL = "";
var submitURL = "";
var trackID = 0;
var scrobbler = null;
var iconURL = self.data.url("icon32.png");
 
function startHandshake() {
  var password = login.pwd(preferences.username);
  if (typeof password === 'undefined') { // evaluates to true without errors
    notifications.notify({
      title: "Store your password",
      text: "Enter to Libre.fm and save your credentials.",
      iconURL: iconURL,
      onClick: (function (data) {
        tabs.open("https://libre.fm");
      }).bind(this)
    });
    return;
  }
  var timestamp = Math.round((new Date()).getTime() / 1000);
  var token = hash.md5( hash.md5(password) + timestamp );  
  Request({
    url: "http://turtle.libre.fm/?hs=true&p=1.2.1&c=tst&v=0.5&u=" + preferences.username + "&t=" + timestamp + "&a=" + token,
    onComplete: function (response) {
      parseResponse(response.text);
    }
  }).get();
}

function getTrack() {
  var url = "http://www.radiognu.org/api/?no_cover";
  if(preferences.notifications)
    url = "http://www.radiognu.org/api/";
  Request({
    url: url,
    onComplete: function (response) {
      var track = JSON.parse(response.text)
      if (track.id != trackID && parseInt(track.id) > 0) {
        trackID = track.id;
        submitTrack(track);
        if(preferences.notifications)
          notifications.notify({
            title: "\u266b " + track.title + ' - ' + track.artist + " \u266a",
            text: "Album: " + track.album + "\nGenre: " + track.genre +  "\n" + track.country + " - " + track.year + " - " + track.license.shortname,
            iconURL: track.cover,
            onClick: (function (data) {
              tabs.open(track.url);
            }).bind(this)
          });
      }
    }
  }).get();
}

function submitTrack(track) {
  var aArtist = new Array();
  var aTracks = new Array();
  var aTimeStamps = new Array();
  var aFormats = new Array();
  var aLengths = new Array();
  var anAlbum = new Array();
  aArtist[0] = track.artist;
  aTracks[0] = track.title;
  aTimeStamps[0] = Math.round((new Date()).getTime() / 1000);
  aFormats[0] = 'P';
  aLengths[0] = track.duration;
  anAlbum[0] = track.album;
  Request({
    url: submitURL,
    content: { 
      s: sessionID,
      a: aArtist,
      t: aTracks,
      i: aTimeStamps,
      o: aFormats,
      l: aLengths, 
      b: anAlbum 
    },
    onComplete: function (response) {
      //console.log(response);
    }
  }).post(); 
}

function parseResponse( response ) {
  var lines = response.split( "\n" );
  if( lines[0] != "OK" ) {
    OK = false;
    notifications.notify({
      title: "Bad credentials",
      text: "Enter to Libre.fm and save your credentials.",
      iconURL: iconURL,
      onClick: (function (data) {
        tabs.open("https://libre.fm");
      }).bind(this)
    });
    preferences.username = "";
    login.remove();
    return;
  } else {
    OK = true;          
    sessionID = lines[1];
    nowPlayingURL = lines[2];
    submitURL = lines[3];
    scrobbler = setInterval(function() {
      if(OK)
        getTrack();
      else
        clearInterval(scrobbler);
    }, 1000);
  }
}

function onOpen(tab) {
  tab.on("pageshow", logShow);
  tab.on("close", logClose);
}

function logShow(tab) {
  if(tab.url.indexOf("radiognu.org") != -1 && !OK) {
    //console.log("Begin the broadcast!");
    startHandshake();
  }
}

function logClose(tab) {
  var out = true;
  for (let tab of tabs) {
    if(tab.url.indexOf("radiognu.org") != -1) {
      out = false;
    }
  }
  if(out && OK){
    //console.log("End of broadcast...");
    OK = false;
    clearInterval(scrobbler);
  }
}

tabs.on('open', onOpen);

function onPrefChange(prefName) {
  for (let tab of tabs)
    if(tab.url.indexOf("radiognu.org") != -1) {
      OK = false;
      startHandshake();
    }
}

require("sdk/simple-prefs").on("username", onPrefChange);

//ToDo nowPlaying
//$.post( nowPlayingURL, { s: token, a: trackinfo.artist, t: trackinfo.track, l: trackinfo.duration }, onNowPlayingResponse );

