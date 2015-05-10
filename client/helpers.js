if (!_.has(Template,'registerHelpers')) {
  Template.registerHelpers = function(helpers) {
    _.map(helpers, function(func,name) {
      Template.registerHelper(name,func);
    });
  }
}
// General helpers
Template.registerHelpers({
  currentButton: function() {
    return OfferJar.UI.currentButton.get();
  },
  currentNegotiation: function() {
    return OfferJar.UI.currentNegotiation.get();
  },
  negotiationHistory: function(reverse) {
    if (OfferJar.UI.keepHistory) {
      var negotiation = OfferJar.UI.currentNegotiation.get();
      if (negotiation) {
        return negotiation.getHistory(reverse);
      } else {
        return null;
      }
    } else {
      return null; // This should not happen but if it does, we will be forgiving in this case
    }
  },
  negotiationMessages: function(sort) {
    if (!sort) { sort = {id: -1}; } // By default sort from latest message to the first one 
    return NegotiationsMessages.find({},sort);
  },
  negotiationInfoReady: function() {
    return negotiationInfoSubscriptionReady.get();
  },
  isOpenForNegotiation: function() {
    return _.isObject(this) ? this.isOpenForNegotiation: true;
  },
  negotiationAllowedTransitions: function() {
    return _.isObject(this) ? this.getAllowedTransitions(Meteor.userId()) : [];
  },
  negotiationCanTransition: function(transition) {
    return _.isObject(this) ? this.canTransition(Meteor.userId(),transition) : false;
  },
  negotiationCurrency: function() {
    var negotiation = OfferJar.UI.currentNegotiation.get();
    if (!negotiation || !negotiation.currency) {
      var button  = OfferJar.UI.currentButton.get();
      return OfferJar.UI.findOrAddCurrency(button.currency);
    }
    
    return OfferJar.UI.findOrAddCurrency(negotiation.currency);
  }
});

