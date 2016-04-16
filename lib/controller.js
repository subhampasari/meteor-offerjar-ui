// User the OfferJar controller for all OfferJar related actions

OfferJarController = RouteController.extend({
  onBeforeAction: function () {
    var self = this;
    var ojRouting =  this.route.offerjarRouting;
    if (self.state.get('sessionLoginState')==='inProgress') {
      self.render(ojRouting.loadingTemplate);
    } else if (self.state.get('sessionLoginState')==='ready') {
      if (Meteor.userId()) {
        self.next();
      } else {
        self.render(ojRouting.loadingTemplate);
      }
    } else {
      self.render(ojRouting.errorTemplate);
    }
  },
  allowInternalLink: function() {
      return false;
  },
  linkSession: function(session_token) {
    var self = this;
    var callback = function(error,result) {
      if (error) {
        self.state.set('sessionLoginState','error');
        self.state.set('sessionLoginError',error);
      } else {
        self.state.set('sessionLoginState','ready');
      }
    }
    
    if (session_token) {
      Meteor.linkToOfferJarSessionToken(session_token,OfferJar.UI.loginSetup,callback);
    } else {
      Meteor.linkToOfferJarInternal(callback);
    }
  },
  onRun: function() {
    var self = this;
    var query = self.params.query;
    
    var session_token = self.params.query.session_token;
    
    if (session_token ) {
      self.state.set('sessionLoginState','inProgress');
      self.linkSession(session_token);
    } else if (self.allowInternalLink()) {
      self.state.set('sessionLoginState','inProgress');
      self.linkSession();
    } else {
      self.state.set('sessionLoginState','ready');
    }
    this.next();
  }
});

