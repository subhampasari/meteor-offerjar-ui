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
  onRun: function() {
    var self = this;
    var query = self.params.query;
    
    if (query.session_token ) {
      self.state.set('sessionLoginState','inProgress');
      Meteor.linkToOfferJarSessionToken(query.session_token,OfferJar.UI.loginSetup,
        function(error,result) {
          if (error) {
            self.state.set('sessionLoginState','error');
            self.state.set('sessionLoginError',error);
          } else {
            self.state.set('sessionLoginState','ready');
          }
        }
      );
    } else {
      self.state.set('sessionLoginState','ready');
    }
    this.next();
  }
});

