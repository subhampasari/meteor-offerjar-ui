// Server side Negotiation!

_.extend(Negotiations,{
  initiateBuyerNegotiation: function(buid,bid,partnerUID,callback) {
    if (_.isFunction(partnerUID)) {
      callback = partnerUID;
      partnerUID = undefined;
    }
    if (Meteor.userId===null) {
      throw Meteor.Error("not-allowed","You must be signed-up to perform a negotiation");
    }
    check(buid,OfferJar.UI.uidCheck);
    check(bid,Match.Optional(Match.OneOf(Number,Currency.LegalMoneyString)));
    check(partnerUID,Match.Optional(OfferJar.UI.uidCheck));
    Meteor.call('initiateBuyerNegotiation',buid,bid,partnerUID,callback);
  },
  subscribeNegotiationInfo: function(negotiationId,callbacks) {
    return Meteor.subscribe("offerjar.negotiations.info",negotiationId,callbacks);
  }
});

OfferJar.UI.currentNegotiation = new ReactiveVar(null,twoOfferJarRecordsEq('uid','bid','otherBid','finalPrice','state'));

negotiationInfoSubscriptionReady = new ReactiveVar(false);

Meteor.startup(function() {
  Tracker.autorun(function() {
    Meteor.subscribe("offerjar.negotiations");
  });

  var subscribedNegotiationId = null;
  Tracker.autorun(function () {
      negotiationInfoSubscriptionReady.set(false);
      var negotiation = OfferJar.UI.currentNegotiation.get();
      if (negotiation && (_.isNull(subscribedNegotiationId) || subscribedNegotiationId!==negotiation._id)) {
        subscribedNegotiationId = negotiation._id;
        Negotiations.subscribeNegotiationInfo(negotiation._id,{
          onReady: function() {
            negotiationInfoSubscriptionReady.set(true);
          },
          onStop: function() {
            subscribedNegotiationId = null;
            negotiationInfoSubscriptionReady.set(false);
          }
        });
      }
  });
});
