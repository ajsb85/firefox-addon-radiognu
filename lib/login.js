const {Cc, Ci} = require("chrome");
var lm = Cc['@mozilla.org/login-manager;1'].getService(Ci.nsILoginManager); 
var hostname = 'https://libre.fm';
var formSubmitURL = '';
var httprealm = null;

function pwd(username){
  try {   
     var logins = lm.findLogins({}, hostname, formSubmitURL, httprealm);
     for (var i = 0; i < logins.length; i++) {
        if (!username) {
          require("sdk/simple-prefs").prefs.username = logins[i].username;
          return logins[i].password;
        } else
          if (logins[i].username == username)
            return logins[i].password;        
     }
  }
  catch(ex) {
  }
}

function remove(){
  lm.removeAllLogins();
}

exports.pwd = pwd;
exports.remove = remove;