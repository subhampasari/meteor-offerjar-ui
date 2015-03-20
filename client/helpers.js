// General helpers
Template.registerHelper({
  currentButton: function() { return OfferJar.UI.currentButton.get(); },
  currentNegoitation: function() { return OfferJar.UI.currentNegoitation.get(); },
  negotiationHistory: function(sort) {
    if (!sort) {
      sort = {id: 1};
    }
    if (OfferJar.UI.keepHistory) {
      // Publish only publishes history for requested negotiation
      return NegotiationsHistory.find({},sort);
    } else {
      return null; // This should not happen but if it does, we will be forgiving in this case
    }
  },
  negotiationMessages: function(sort) {
    if (!sort) {
      sort = {id: 1};
    }
    if (OfferJar.UI.keepAllMessages) {
      // Publish only publishes history for requested negotiation
      return NegotiationsMessages.find({},sort);
    } else {
      return null; // This should not happen but if it does, we will be forgiving in this case
    }
  },
  buttonField: function(field) {
    var button = OfferJar.UI.currentButton.get();
    return _.isObject(button) ? button[field] : null
  },
  negotiationField: function(field) {
    var negotiation = OfferJar.UI.currentNegoitation.get();
    return _.isObject(negotiation) ? negotiation[field] : null
  },
  isOpenForNegotiation: function() {
    var negotiation = OfferJar.UI.currentNegoitation.get();
    return _.isObject(negotiation) ? negotiation.isOpenForNegotiation() : false
  },
  negotiationAllowedTransitions: function() {
    var negotiation = OfferJar.UI.currentNegoitation.get();
    return _.isObject(negotiation) ? negotiation.getAllowedTransitions(Meteor.userId()) : [];
  },
  negotiationCanTransition: function(transition) {
    var negotiation = OfferJar.UI.currentNegoitation.get();
    return _.isObject(negotiation) ? negotiation.canTransition(Meteor.userId(),transition) : false;
  }
});