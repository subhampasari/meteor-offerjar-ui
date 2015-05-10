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
 *
 * Referenced collection 
 *
 *   NegotiationsHistory: (can be turned off by setting OfferJar.UI.keepHistory to false)
 *    negotiationId: The negotiation id (secret)
 *    history: The history array of the negotiation
 *    
 *   NegotiationsMessages (include only latest message per negotiation if OfferJar.UI.keepAllMessages is false): 
 *    negotiationId: The negotiation id (secret)
 *    id: The message id on the OfferJar/InKomerce server (secret) 
 *    message: The message record
 *
 */

// Add additional methods to the negotiation document
var transformNegotiationDoc;

var lastMessage = function() {
  return NegotiationsMessages.findOne({negotiationId: this._id},{ sort: { id: -1 }});
}

var getHistory = function(reverse) {
  var historyRec = NegotiationsHistory.findOne({negotiationId: this._id}); // You should get only one negotiation record
  if (historyRec) {
    return reverse ? _.reverse(historyRec.history) : historyRec.history;
  } else {
    return null;
  }
}

var createNegotiationSchema;

if (Meteor.isClient) {
  transformNegotiationDoc = function (doc) {
    doc.isOpenForNegotiation = _.include(['another_bid','initial_bid','waiting_for_response'],doc.state);
    doc.lastMessage = lastMessage;
    doc.getHistory = getHistory;
    doc.createNegotiationSchema = createNegotiationSchema;
    return doc;
  }
}
  
if (Meteor.isServer) {
  var conversationProxy = function() {
    if (_.has(this,'_conversationProxy')) {
      return this._conversationProxy;
    }
    return this._conversationProxy = ConversationProxy.findUserConversationProxy(bidderId,this.partnerUID);
  }
  
  transformNegotiationDoc = function (doc) {
    doc.conversationProxy = conversationProxy;
    doc.createNegotiationSchema = createNegotiationSchema;
    doc.lastMessage = lastMessage;
    return doc;
  }
};

var negotiationSchema = new SimpleSchema({
  uid: {
    type: String,
    index: true,
    unique: true,
    denyUpdate: true
  },
  buid: {
    type: String,
    index: 1,
    denyUpdate: true
  },
  cuid: {
    type: String,
    denyUpdate: true
  },
  bidderId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true
  },
  partnerUID: {
    type: String,
  },
  state: {
    type: String
  },
  isWaiting: {
    type: Boolean,
    optional: true
  },
  availableTransitions: {
    type: [String]
  },
  bid: {
    type: Number,
    min: 0,
    optional: true,
    decimal: true
  },
  otherBid: {
    type: Number,
    optional: true,
    decimal: true
  },
  finalPrice: {
    type: Number,
    optional: true,
    decimal: true
  },
  saving: {
    type: Number,
    optional: true,
    decimal: true
  },
  kind: {
    type: String,
    optional: true
  },
  currency: {
    type: Object,
    optional: true,
    blackbox: true
  },
  title: {
    type: String,
    optional: true
  },
  successData: {
    type: [String],
    optional: true
  }
  
});

createNegotiationSchema = function() {
  var negotiation = this;
  var args = _.toArray(arguments);
  var required = true;
  if (_.isBoolean(args[0])) {
    required = args.shift;
  }
  args.unshift(negotiationSchema.schema());

  var newSchema = _.pick.apply(null, args);
  if (_.has(newSchema,'bid')) {
    newSchema.bid = _.clone(newSchema.bid);
    newSchema.bid.min = negotiation.bid ? negotiation.bid+0.01 : 1;
    newSchema.bid.max = _.isNumber(negotiation.otherBid) ? negotiation.otherBid : Number.MAX_VALUE;
    delete newSchema.bid.custom;
    newSchema.bid.optional = !required;
  }
  return new SimpleSchema(newSchema);
}

checkBiddingTransition = function(userId,transition,parameters) {
  var scheme = this.createNegotiationSchema('bid');
  return check(parameters,scheme);
}

//var checkBid = function(bid_str,min,max) {
//  var bid = Currency.Currency.parseStr(bid_str);
//  if (_.isNull(bid)) {
//    throw Meteor.Error('not a number',"Bid is not a number!");
//  }
//  if (_.isNumber(min) && bid<min) {
//    throw Meteor.Error('too low',"Bid is lower than minimum value of " + min);
//  }
//  if (_.isNumber(max) && bid>max) {
//    throw Meteor.Error('too high',"Bid is higher than maximum value of " + max);
//  }
//  return(true);
//}

var transitions = {
  set_initial_bid: {
    permission: 'bidderId',
    check: checkBiddingTransition
  },
  go_bid: {
    permission: 'bidderId',
    check: checkBiddingTransition
  },
  //delay_bid: {
  //  permission: 'bidderId',
  //  check: {}
  //},
  accept_other_bid: {
    permission: 'bidderId',
    check: {}
  },
  checkout: {
    permission: 'bidderId',
    check: {}
  },
  //no_deal: {
  //  permission: 'bidderId',
  //  check: {}
  //},
  //close: {
  //  permission: 'bidderId',
  //  check: {}
  //}
}

Negotiations = OfferJar.UI.Negotiations = StatefullCollection.create("offerjar.negotiations",{
  transitions: transitions,
  after: {server: function(userId,transition,parameters) {
    return Negotiations.remoteTransition.apply(this,[userId,transition,parameters]);
  }},
  transform: transformNegotiationDoc,
  nextStateSetMethod: function(userId,transition,parameters) {
    var newState;
    switch (transition) {
      case 'checkout':
        newState = 'checkout_submitted';
        break;
      case 'accept_other_bid':
        parameters.bid = parameters.otherBid;
      case 'set_initial_bid':
      case 'go_bid':
        newState =  'waiting_for_response';
        break;
      default:
        newState = 'error';
    }
    return _.extend({state: newState, isWaiting: true, availableTransitions: []},parameters);
  }
});
 
Negotiations.attachSchema(negotiationSchema);

NegotiationsMessages = OfferJar.UI.NegotiationsMessages = new Mongo.Collection("offerjar.negotiations.messages");
  
if (OfferJar.UI.keepHistory) {
    OfferJar.UI.NegotiationsHistory = new Mongo.Collection("offerjar.negotiations.history");
    NegotiationsHistory = OfferJar.UI.NegotiationsHistory;
}

uidRe = /^[0-9a-z]{6,}$/i;

OfferJar.UI.uidCheck =  Match.Where(function (uid) {
  check(uid, String);
  return uidRe.test(uid);
});

