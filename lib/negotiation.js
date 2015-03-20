/*
 * Keep track of active negotiations
 *
 * Identification Fields (remain constant):
 *   uid: The uid of the negotiation (secret)
 *   buid: The button uid related to the negotiation, used to retrieve product (private)
 *   bidderId: The userId of the bidder (currently the buyer)
 *   
 * Negotiation fields (changes):
 *   state: The state of the negotiation (private)
 *   availableTransitions: The transitions available for the negotiation flow (private)
 *   bid: The offer the buyers made (available only when negotiation is "open for bids") (private)
 *   otherBid: The offer that returned from CAN (available only when negotiation is "open for bids") (private)
 *   finalPrice: The final price that CAN offered (private) - replaces otherBid when negotiation is "closed for bids"
 *   saving: The currenct amount of saving (with the otherBid or)
 *   lastMessage: A record holding the last message from CAN
 *
 * Referenced collection 
 *
 *   NegotiationsHistory: (can be turned off by setting OfferJar.UI.keepHistory to false)
 *    negotiationId: The negotiation id (secret)
 *    hid: The history id on the OfferJar/InKomerce server
 *    change: 'bid' or 'otherBid'
 *    value: The value of the bid
 *    time: The time of the bid
 *    
 *   NegotiationsMessages: (available only when OfferJar.UI.keepAllMessages is set to true)
 *    negotiationId: The negotiation id (secret)
 *    mid: The message id on the OfferJar/InKomerce server (secret)
 *    message: The message record
 *
 */

var convert_to_currencies = ['bid','otherBid','finalPrice','saving','retailPrice'];

// Add additional methods to the negotiation document
var transformNegotiationDoc;

if (Meteor.isClient) {
  transformNegotiationDoc = function (doc) {
    var basePrice = _.has(doc,'finalPrice') ? doc.finalPrice : _.has(doc,'otherBid') ? doc.otherBid : null;
    if (! _.isNull(basePrice)) {
      doc.retailPrice = basePrice + (_.has(doc,'saving') && _.isNumber(doc.saving) ? doc.saving : 0.00);
    }
    _.each(convert_to_currencies,function(field) {
      if (_.has(doc,field) ) {
        doc[field+'_mny'] = new Money(doc[field],doc.currencyCode);
      }
    });
    
    doc.isOpenForNegotiation = _.include(['anotherBid','initial_bid'],doc.state);
    return doc;
  }
}
  
if (Meteor.isServer) {
  transformNegotiationDoc = function (doc) {
    doc.conversationProxy = function() {
      if (_.has(this,'_conversationProxy')) {
        return this._conversationProxy;
      }
      return this._conversationProxy = ConversationProxy.findUserConversationProxy(bidderId,this.partnerUID);
    }
  }
};

var checkBid = function(bid_str,min,max) {
  var bid = Currency.Currency.parseStr(bid_str);
  if (_.isNull(bid)) {
    throw Meteor.Error('not a number',"Bid is not a number!");
  }
  if (_.isNumber(min) && bid<min) {
    throw Meteor.Error('too low',"Bid is lower than minimum value of " + min);
  }
  if (_.isNumber(max) && bid>max) {
    throw Meteor.Error('too high',"Bid is higher than maximum value of " + max);
  }
  return(true);
}

var transitions = {
  set_initial_bid: {
    permission: 'bidderId',
    check: {bid: Currency.LegalMoneyString},
    before: function(userId,transition,parameters) {
      return checkBid(parameters.bid,1.0,this.otherBid || this.retailPrice);
    }
  },
  go_bid: {
    permission: 'bidderId',
    check: {bid: Currency.LegalMoneyString},
    before: function(userId,transition,parameters) {
      return checkBid(parameters.bid,this.bid,this.otherBid || this.retailPrice);
    }
  },
  delay_bid: {
    permission: 'bidderId',
    check: {}
  },
  accept_otherBid: {
    permission: 'bidderId',
    check: {}
  },
  checkout: {
    permission: 'bidderId',
    check: {}
  },
  no_deal: {
    permission: 'bidderId',
    check: {}
  },
  close: {
    permission: 'bidderId',
    check: {}
  }
}

Negotiations = OfferJar.UI.Negotiations = StatefullCollection.create("offerjar.negotiations",{
  transitions: transitions,
  after: {server: function(userId,transition,parameters) {
    return Negotiations.remoteTransition.apply(this,[userId,transition,parameters]);
  }},
  transform: transformNegotiationDoc
});
 
if (OfferJar.UI.keepAllMessages) {
  OfferJar.UI.NegotiationsMessages = new Mongo.Collection("offerjar.negotiations.messages");
  NegotiationsMessages = OfferJar.UI.NegotiationsMessages;
}
  
if (OfferJar.UI.keepHistory) {
    OfferJar.UI.NegotiationsHistory = new Mongo.Collection("offerjar.negotiations.history");
    NegotiationsHistory = OfferJar.UI.NegotiationsHistory;
}

uidRe = /^[0-9a-z]{6,}$/i;

OfferJar.UI.uidCheck =  Match.Where(function (uid) {
  check(uid, String);
  return uidRe.test(uid);
});

