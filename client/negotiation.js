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
    Match.check(buid,OfferJar.UI.uidCheck);
    Match.check(bid,Match.Optional(Match.OneOf(Number,Currency.LegalMoneyString)));
    Match.check(partnerUID,Match.Optional(OfferJar.UI.uidCheck));
    Meteor.call('initiateBuyerNegotiation',buid,bid,partnerUID,callback);
  },
  subscribeNegotiationInfo: function(negotiationId) {
    Meteor.subscribe("offerjar.negotiations.info",negotiationId);
  }
});


Meteor.subscribe("offerjar.negotiations");

OfferJar.UI.currentNegotiation = new ReactiveVar(null,twoOfferJarRecordsEq);

if (OfferJar.UI.keepAllMessages || OfferJar.UI.keepHistory) {
  Tracker.autorun(function () {
      var negotiation = OfferJar.UI.currentNegotiation.get();
      Negotiations.subscribeNegotiationInfo(negotiation._id);
  });
}
