// User the OfferJar controller for all OfferJar related actions

OfferJarController = RouteController.extend({
  waitOn: function() {
    return this.subscribe('offerjar.users_info');
  },
  onBeforeAction: function () {
    var self = this;
    var query = self.params.query;
    
    if (query.session_token) {
      self.state.set('sessionTokenLoginState','inProgress');
      Meteor.call('linkToOfferJarSessionToken',{
        session_token: session_token,
        allowSetUser: 'anonymous',
        transferAffinity: true
      }, function(error,result) {
        if (error) {
          self.state.set('sessionTokenLoginState','error');
          self.sessionTokenLoginError = error;
        } else {
          self.state.set('sessionTokenLoginState','ready');
        }
      });
    } else {
      self.state.set('sessionTokenLoginState','skipped');
    }
  }
});

